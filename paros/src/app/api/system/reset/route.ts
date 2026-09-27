import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearSession } from '@/lib/auth-session';

export async function POST(req: NextRequest) {
  try {
    // Security check: Only allow reset in local development OR with valid ADMIN_RESET_SECRET header
    const resetSecret = process.env.ADMIN_RESET_SECRET || 'paros-dev-reset-key';
    const authHeader = req.headers.get('x-reset-secret');
    const isLocalDev = process.env.NODE_ENV !== 'production';

    if (!isLocalDev && authHeader !== resetSecret) {
      return NextResponse.json(
        { error: 'Forbidden. Database reset is disabled in production unless authorized with x-reset-secret header.' },
        { status: 403 }
      );
    }

    // 1. Delete all relational data in proper order
    await prisma.bill.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.cashShift.deleteMany();
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
      message: 'All local database records wiped clean and session cleared! Ready to register fresh cafe.',
    });
  } catch (error) {
    console.error('System reset error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'GET method not allowed on system reset. Send POST request with confirmation to reset.' },
    { status: 405 }
  );
}
