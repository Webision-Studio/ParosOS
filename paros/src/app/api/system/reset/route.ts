import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { clearSession, getSession } from '@/lib/auth-session';

/**
 * Constant-time comparison for reset authorization token
 */
function timingSafeCheck(input: string | null | undefined, secret: string): boolean {
  if (!input || !secret) return false;
  const bufInput = Buffer.from(input);
  const bufSecret = Buffer.from(secret);
  if (bufInput.length !== bufSecret.length) return false;
  return crypto.timingSafeEqual(bufInput, bufSecret);
}

export async function POST(req: NextRequest) {
  try {
    const isLocalDev = process.env.NODE_ENV !== 'production';
    const configuredSecret = process.env.ADMIN_RESET_SECRET?.trim();
    const authHeader = req.headers.get('x-reset-secret')?.trim() || '';

    // In production, ADMIN_RESET_SECRET MUST be explicitly set and be at least 16 chars
    if (!isLocalDev) {
      if (!configuredSecret || configuredSecret.length < 16) {
        console.error('[Security Alert] Blocked system reset: ADMIN_RESET_SECRET unconfigured or too weak in production.');
        return NextResponse.json(
          { error: 'Forbidden. Database reset is disabled in production unless a strong ADMIN_RESET_SECRET is configured.' },
          { status: 403 }
        );
      }

      if (!timingSafeCheck(authHeader, configuredSecret)) {
        console.warn('[Security Alert] Unauthorized production database reset attempt rejected.');
        return NextResponse.json(
          { error: 'Forbidden. Invalid or missing x-reset-secret header.' },
          { status: 403 }
        );
      }
    } else {
      // In local dev, require either x-reset-secret or an active OWNER session to avoid accidental wipes
      const session = await getSession();
      const devSecret = configuredSecret || 'paros-dev-reset-key';
      const isDevKeyMatch = timingSafeCheck(authHeader, devSecret);
      const isOwnerSession = session?.role === 'OWNER';

      if (!isDevKeyMatch && !isOwnerSession) {
        return NextResponse.json(
          { error: 'Forbidden. Provide x-reset-secret header or be logged in as OWNER to reset database in dev mode.' },
          { status: 403 }
        );
      }
    }

    // 1. Delete all relational data in proper cascade order
    await prisma.bill.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.cashShift.deleteMany();
    await prisma.pushSubscription.deleteMany().catch(() => {});
    await prisma.customer.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.category.deleteMany();
    await prisma.table.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // 2. Clear session cookies
    await clearSession();

    return NextResponse.json({
      success: true,
      message: 'All database records wiped clean and session cleared! Ready to register fresh cafe.',
    });
  } catch (error) {
    console.error('System reset error:', error);
    return NextResponse.json({ error: 'System reset failed due to internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'GET method not allowed on system reset. Send POST request with confirmation to reset.' },
    { status: 405 }
  );
}
