import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const cafeSlug = searchParams.get('cafeSlug');
    const cafeId = searchParams.get('cafeId');

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe && cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: String(cafeId) } });
    }
    if (!cafe && cafeSlug) {
      cafe = await prisma.tenant.findFirst({ where: { slug: String(cafeSlug) } });
    }
    if (!cafe && process.env.NODE_ENV !== 'production') {
      cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    if (!cafe) {
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }

    // Seed default starter coupons if none exist
    const count = await prisma.coupon.count({ where: { cafeId: cafe.id } });
    if (count === 0) {
      await Promise.all([
        prisma.coupon.create({
          data: {
            cafeId: cafe.id,
            code: 'WELCOME10',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minOrderValue: 200,
            maxDiscount: 100,
            isActive: true,
          },
        }),
        prisma.coupon.create({
          data: {
            cafeId: cafe.id,
            code: 'FLAT50',
            discountType: 'FLAT',
            discountValue: 50,
            minOrderValue: 300,
            isActive: true,
          },
        }),
        prisma.coupon.create({
          data: {
            cafeId: cafe.id,
            code: 'CHEFVIP',
            discountType: 'PERCENTAGE',
            discountValue: 20,
            minOrderValue: 400,
            maxDiscount: 250,
            isActive: true,
          },
        }),
      ]);
    }

    const coupons = await prisma.coupon.findMany({
      where: { cafeId: cafe.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, coupons, cafe });
  } catch (error) {
    console.error('Coupons GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { action, cafeId } = body;

    let targetCafeId = session?.cafeId;
    if (!targetCafeId && cafeId) {
      const c = await prisma.tenant.findUnique({ where: { id: String(cafeId).slice(0, 60) } });
      targetCafeId = c?.id;
    }
    if (!targetCafeId && process.env.NODE_ENV !== 'production') {
      const def = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      targetCafeId = def?.id;
    }

    if (!targetCafeId) {
      return NextResponse.json({ error: 'Cafe context required' }, { status: 400 });
    }

    // 1. Validate Coupon Code for Checkout (Public & POS accessible)
    if (action === 'validate') {
      const { code, subtotal } = body;
      const cleanCode = String(code || '').trim().toUpperCase();
      const numSubtotal = Math.max(0, Number(subtotal) || 0);

      if (!cleanCode) {
        return NextResponse.json({ error: 'Enter a promo code' }, { status: 400 });
      }

      const coupon = await prisma.coupon.findFirst({
        where: {
          cafeId: targetCafeId,
          code: cleanCode,
          isActive: true,
        },
      });

      if (!coupon) {
        return NextResponse.json({ error: `Invalid or inactive coupon code "${cleanCode}"` }, { status: 404 });
      }

      if (numSubtotal < coupon.minOrderValue) {
        return NextResponse.json(
          { error: `Minimum order of ₹${coupon.minOrderValue} required for coupon ${cleanCode} (Current: ₹${numSubtotal})` },
          { status: 400 }
        );
      }

      let discountAmount = 0;
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = Math.round((numSubtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscount && coupon.maxDiscount > 0) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else {
        discountAmount = coupon.discountValue;
      }

      discountAmount = Math.min(discountAmount, numSubtotal);

      return NextResponse.json({
        valid: true,
        code: coupon.code,
        discountAmount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description:
          coupon.discountType === 'PERCENTAGE'
            ? `${coupon.discountValue}% OFF (Max ₹${coupon.maxDiscount || 'Unlimited'})`
            : `₹${coupon.discountValue} FLAT OFF`,
      });
    }

    // 2. Create New Coupon (Owner Admin action)
    if (action === 'create') {
      const { code, discountType, discountValue, minOrderValue, maxDiscount } = body;
      const cleanCode = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20);

      if (!cleanCode) {
        return NextResponse.json({ error: 'Valid promo code is required' }, { status: 400 });
      }

      const val = Number(discountValue);
      if (isNaN(val) || val <= 0) {
        return NextResponse.json({ error: 'Valid positive discount value required' }, { status: 400 });
      }

      const type = discountType === 'FLAT' ? 'FLAT' : 'PERCENTAGE';
      if (type === 'PERCENTAGE' && val > 100) {
        return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
      }

      const coupon = await prisma.coupon.upsert({
        where: { cafeId_code: { cafeId: targetCafeId, code: cleanCode } },
        update: {
          discountType: type,
          discountValue: val,
          minOrderValue: Math.max(0, Number(minOrderValue) || 0),
          maxDiscount: maxDiscount ? Math.max(0, Number(maxDiscount)) : null,
          isActive: true,
        },
        create: {
          cafeId: targetCafeId,
          code: cleanCode,
          discountType: type,
          discountValue: val,
          minOrderValue: Math.max(0, Number(minOrderValue) || 0),
          maxDiscount: maxDiscount ? Math.max(0, Number(maxDiscount)) : null,
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, coupon });
    }

    // 3. Toggle Coupon Active State
    if (action === 'toggle-active') {
      const { couponId } = body;
      const coupon = await prisma.coupon.findUnique({ where: { id: String(couponId).slice(0, 60) } });
      if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
      if (coupon.cafeId !== targetCafeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

      const updated = await prisma.coupon.update({
        where: { id: coupon.id },
        data: { isActive: !coupon.isActive },
      });

      return NextResponse.json({ success: true, coupon: updated });
    }

    // 4. Delete Coupon
    if (action === 'delete') {
      const { couponId } = body;
      const coupon = await prisma.coupon.findUnique({ where: { id: String(couponId).slice(0, 60) } });
      if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
      if (coupon.cafeId !== targetCafeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

      await prisma.coupon.delete({ where: { id: coupon.id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Coupons POST error:', error);
    return NextResponse.json({ error: 'Failed to process coupon action' }, { status: 500 });
  }
}
