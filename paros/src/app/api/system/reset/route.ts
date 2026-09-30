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

    const session = await getSession();

    // In production, NEVER wipe the entire database globally across all tenants!
    // Restrict reset strictly to the authenticated cafe OWNER for their OWN cafe.
    if (!isLocalDev) {
      if (!session?.cafeId || session.role !== 'OWNER') {
        console.warn('[Security Alert] Blocked unauthorized production reset attempt.');
        return NextResponse.json(
          { error: 'Forbidden. In production, reset can only be executed by an authenticated cafe OWNER on their own outlet.' },
          { status: 403 }
        );
      }

      const targetCafeId = session.cafeId;

      // 1. Wipe ONLY the authenticated tenant's records (Strict Multi-Tenant Isolation)
      await prisma.bill.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.orderItem.deleteMany({ where: { order: { cafeId: targetCafeId } } });
      await prisma.order.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.expense.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.cashShift.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.pushSubscription.deleteMany({ where: { cafeId: targetCafeId } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.menuItem.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.category.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.table.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.zone.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.user.deleteMany({ where: { cafeId: targetCafeId } });
      await prisma.tenant.delete({ where: { id: targetCafeId } }).catch(() => {});

      await clearSession();

      return NextResponse.json({
        success: true,
        message: 'Your cafe records wiped clean and session cleared! Ready to onboard fresh.',
      });
    }

    // In local development, verify x-reset-secret or owner session
    const devSecret = configuredSecret || 'paros-dev-reset-key';
    const isDevKeyMatch = timingSafeCheck(authHeader, devSecret);
    const isOwnerSession = session?.role === 'OWNER';

    if (!isDevKeyMatch && !isOwnerSession) {
      return NextResponse.json(
        { error: 'Forbidden. Provide x-reset-secret header or be logged in as OWNER to reset database in dev mode.' },
        { status: 403 }
      );
    }

    // Local dev: wipe all relational data for clean dev testing
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

    // Clear session cookies
    await clearSession();

    return NextResponse.json({
      success: true,
      message: 'All local development database records wiped clean and session cleared! Ready to register fresh cafe.',
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
