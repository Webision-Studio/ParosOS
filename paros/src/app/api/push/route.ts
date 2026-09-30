import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';
import webpush from 'web-push';

// Configure VAPID
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(
      'mailto:hello@paros.cafe',
      VAPID_PUBLIC,
      VAPID_PRIVATE
    );
  } catch (err) {
    console.warn('VAPID initialization error:', err);
  }
}

// POST: Subscribe to push notifications OR send a push notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Subscribe — save browser push subscription
    if (action === 'subscribe') {
      const { subscription, cafeId } = body;

      if (!subscription?.endpoint || typeof subscription.endpoint !== 'string') {
        return NextResponse.json({ error: 'Invalid subscription: endpoint is required' }, { status: 400 });
      }

      // Endpoint must be a valid https URL and under 1024 chars
      try {
        const parsedUrl = new URL(subscription.endpoint);
        if (parsedUrl.protocol !== 'https:') {
          return NextResponse.json({ error: 'Push endpoint must use HTTPS' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Malformed push endpoint URL' }, { status: 400 });
      }

      if (subscription.endpoint.length > 1024) {
        return NextResponse.json({ error: 'Push endpoint exceeds max length (1024 chars)' }, { status: 400 });
      }

      const p256dh = subscription.keys?.p256dh;
      const auth = subscription.keys?.auth;
      if (!p256dh || !auth || typeof p256dh !== 'string' || typeof auth !== 'string') {
        return NextResponse.json({ error: 'Invalid subscription cryptographic keys' }, { status: 400 });
      }

      if (p256dh.length > 256 || auth.length > 256) {
        return NextResponse.json({ error: 'Subscription keys exceed maximum allowable size' }, { status: 400 });
      }

      let targetCafeId = cafeId;
      if (!targetCafeId) {
        const session = await getSession();
        targetCafeId = session?.cafeId;
      }
      if (!targetCafeId && process.env.NODE_ENV !== 'production') {
        const latestCafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
        targetCafeId = latestCafe?.id;
      }
      if (!targetCafeId) {
        return NextResponse.json({ error: 'Valid cafeId is required to subscribe' }, { status: 400 });
      }

      const cafeExists = await prisma.tenant.findUnique({ where: { id: targetCafeId } });
      if (!cafeExists) {
        return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
      }

      // Upsert by endpoint (same browser = same endpoint)
      const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint },
      });

      if (existing) {
        await prisma.pushSubscription.update({
          where: { endpoint: subscription.endpoint },
          data: {
            cafeId: targetCafeId,
            p256dh: p256dh.slice(0, 256),
            auth: auth.slice(0, 256),
          },
        });
      } else {
        await prisma.pushSubscription.create({
          data: {
            cafeId: targetCafeId,
            endpoint: subscription.endpoint.slice(0, 1024),
            p256dh: p256dh.slice(0, 256),
            auth: auth.slice(0, 256),
          },
        });
      }

      return NextResponse.json({ success: true, message: 'Subscribed to notifications' });
    }

    // 2. Send notification to all subscribers of a cafe (MUST be authenticated)
    if (action === 'send-notification') {
      const session = await getSession();
      if (!session?.cafeId) {
        return NextResponse.json(
          { error: 'Unauthorized. Only logged-in cafe owners can broadcast push notifications.' },
          { status: 401 }
        );
      }

      if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        return NextResponse.json({
          success: false,
          sent: 0,
          message: 'Web Push VAPID keys not configured in environment. Notification skipped gracefully.',
        });
      }

      const targetCafeId = session.cafeId;
      const { title, body: messageBody, url } = body;

      const subscriptions = await prisma.pushSubscription.findMany({
        where: { cafeId: targetCafeId },
      });

      if (subscriptions.length === 0) {
        return NextResponse.json({ success: true, sent: 0, message: 'No subscribers found' });
      }

      const safeTitle = String(title || '☕ Paros Cafe').slice(0, 100).trim();
      const safeBody = String(messageBody || 'You have a new notification!').slice(0, 500).trim();

      // Anti-Open Redirect & Malicious Protocol Defense (prevent javascript:, data:, and protocol-relative links)
      let safeUrl = '/order';
      if (url && typeof url === 'string') {
        const trimmedUrl = url.trim().slice(0, 500);
        if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//') && !trimmedUrl.includes('\\')) {
          safeUrl = trimmedUrl;
        } else if (/^https:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+$/i.test(trimmedUrl)) {
          safeUrl = trimmedUrl;
        }
      }

      const payload = JSON.stringify({
        title: safeTitle,
        body: safeBody,
        url: safeUrl,
      });

      if (Buffer.byteLength(payload, 'utf8') > 3900) {
        return NextResponse.json({ error: 'Payload exceeds maximum allowable push notification size' }, { status: 400 });
      }

      let sent = 0;
      let failed = 0;
      const failedEndpoints: string[] = [];

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            sent++;
          } catch (err: any) {
            failed++;
            // If subscription expired/invalid, queue for removal
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              failedEndpoints.push(sub.endpoint);
            }
          }
        })
      );

      // Cleanup expired subscriptions
      if (failedEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: { in: failedEndpoints } },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        sent,
        failed,
        cleaned: failedEndpoints.length,
        totalSubscribers: subscriptions.length,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Push API error:', error);
    return NextResponse.json({ error: 'Failed to process push action' }, { status: 500 });
  }
}
