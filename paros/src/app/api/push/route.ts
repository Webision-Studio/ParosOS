import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';
import webpush from 'web-push';

// Configure VAPID
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    'mailto:hello@paros.cafe',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

// POST: Subscribe to push notifications OR send a push notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Subscribe — save browser push subscription
    if (action === 'subscribe') {
      const { subscription, cafeId } = body;
      if (!subscription?.endpoint) {
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
      }

      let targetCafeId = cafeId;
      if (!targetCafeId) {
        const latestCafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
        targetCafeId = latestCafe?.id;
      }
      if (!targetCafeId) {
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
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        });
      } else {
        await prisma.pushSubscription.create({
          data: {
            cafeId: targetCafeId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        });
      }

      return NextResponse.json({ success: true, message: 'Subscribed to notifications' });
    }

    // 2. Send notification to all subscribers of a cafe
    if (action === 'send-notification') {
      const session = await getSession();
      const { cafeId, title, body: messageBody, url } = body;
      const targetCafeId = session?.cafeId || cafeId;

      if (!targetCafeId) {
        return NextResponse.json({ error: 'Cafe ID required' }, { status: 400 });
      }

      const subscriptions = await prisma.pushSubscription.findMany({
        where: { cafeId: targetCafeId },
      });

      if (subscriptions.length === 0) {
        return NextResponse.json({ success: true, sent: 0, message: 'No subscribers found' });
      }

      const payload = JSON.stringify({
        title: title || '☕ Paros Cafe',
        body: messageBody || 'You have a new notification!',
        url: url || '/order',
      });

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
            // If subscription expired/invalid, remove it
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
        });
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
