import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

// In-memory rate limiter for PIN brute-force protection
// Key: `${ip}_${cafeId}`, Value: { count, lockUntil }
const failedAttemptsMap = new Map<string, { count: number; lockUntil: number }>();

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { pin, target = 'POS', cafeId } = body;

    if (!pin || String(pin).trim().length !== 4) {
      return NextResponse.json({ error: 'Please enter a valid 4-digit PIN' }, { status: 400 });
    }

    // Determine target cafe
    let targetCafeId = session?.cafeId || cafeId;
    if (!targetCafeId) {
      const latest = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      targetCafeId = latest?.id;
    }

    if (!targetCafeId) {
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }

    // Rate limiter check
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimitKey = `${clientIp}_${targetCafeId}_${target}`;
    const now = Date.now();
    const rateData = failedAttemptsMap.get(rateLimitKey);

    if (rateData && rateData.lockUntil > now) {
      const waitMinutes = Math.ceil((rateData.lockUntil - now) / 60000);
      return NextResponse.json(
        { error: `Too many wrong PIN attempts. Terminal locked for ${waitMinutes} minute(s).` },
        { status: 429 }
      );
    }

    const cafe = await prisma.tenant.findUnique({
      where: { id: targetCafeId },
      include: { users: true },
    });

    if (!cafe) {
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }

    const cleanPin = String(pin).trim();

    // 1. Check custom user PINs for this cafe
    const matchedUser = cafe.users.find(
      (u) => u.pin === cleanPin && (target === 'POS' ? u.role === 'CASHIER' || u.role === 'OWNER' : u.role === 'KITCHEN' || u.role === 'OWNER')
    );

    // 2. Check tenant-level default PINs
    const expectedTenantPin = target === 'POS' ? (cafe.cashierPin || '1234') : (cafe.kitchenPin || '7788');
    const isTenantPinMatch = cleanPin === expectedTenantPin;

    if (matchedUser || isTenantPinMatch) {
      // Clear rate limiter on success
      failedAttemptsMap.delete(rateLimitKey);

      const operatorName = matchedUser?.name || (target === 'POS' ? 'Primary Cashier' : 'Kitchen Barista');
      const operatorRole = matchedUser?.role || (target === 'POS' ? 'CASHIER' : 'KITCHEN');

      return NextResponse.json({
        success: true,
        operator: {
          name: operatorName,
          role: operatorRole,
        },
      });
    }

    // Failed attempt: increment counter
    const currentCount = (rateData?.count || 0) + 1;
    if (currentCount >= 5) {
      failedAttemptsMap.set(rateLimitKey, { count: currentCount, lockUntil: now + 5 * 60 * 1000 }); // 5 min lockout
      return NextResponse.json(
        { error: 'Incorrect PIN. 5 failed attempts reached. Terminal locked for 5 minutes.' },
        { status: 429 }
      );
    } else {
      failedAttemptsMap.set(rateLimitKey, { count: currentCount, lockUntil: 0 });
      return NextResponse.json(
        { error: `Incorrect PIN. ${5 - currentCount} attempts remaining.` },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('PIN verify error:', error);
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 });
  }
}
