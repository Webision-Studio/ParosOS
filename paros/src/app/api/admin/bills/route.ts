import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const cafeSlug = searchParams.get('cafeSlug') || 'artisan-roastery';

    // 1. Resolve Cafe Tenant
    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst({ where: { slug: cafeSlug } });
    }
    if (!cafe && process.env.NODE_ENV !== 'production') {
      cafe = await prisma.tenant.findFirst();
    }

    if (!cafe) {
      return NextResponse.json({ error: 'No cafe found' }, { status: 404 });
    }

    // 2. Parse Filters
    const q = (searchParams.get('q') || '').trim();
    const dateFilter = searchParams.get('dateFilter') || 'all';
    const paymentMethod = (searchParams.get('paymentMethod') || 'ALL').toUpperCase();
    const source = (searchParams.get('source') || 'ALL').toUpperCase();

    // 3. Build Prisma Where Clause
    const where: any = {
      cafeId: cafe.id,
    };

    // Date Filtering
    const now = new Date();
    if (dateFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.createdAt = { gte: startOfDay };
    } else if (dateFilter === 'yesterday') {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.createdAt = { gte: startOfYesterday, lt: endOfYesterday };
    } else if (dateFilter === 'week') {
      const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: past7Days };
    } else if (dateFilter === 'month') {
      const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: past30Days };
    }

    // Payment Method Filtering
    if (paymentMethod !== 'ALL') {
      where.paymentMethod = paymentMethod;
    }

    // Order Source Filtering
    if (source !== 'ALL') {
      where.order = {
        source: source,
      };
    }

    // Search Query (Bill #, Customer Phone, Customer Name, or Order #)
    if (q) {
      where.OR = [
        { billNumber: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // 4. Query Bills with Order & Items
    const bills = await prisma.bill.findMany({
      where,
      include: {
        order: {
          include: {
            items: true,
            table: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });

    // 5. Aggregate KPIs from filtered set
    let totalGross = 0;
    let cashCollected = 0;
    let upiCollected = 0;
    let totalDiscounts = 0;

    for (const b of bills) {
      totalGross += b.total;
      totalDiscounts += b.discount || 0;
      if (b.paymentMethod === 'CASH') {
        cashCollected += b.total;
      } else if (b.paymentMethod === 'UPI') {
        upiCollected += b.total;
      }
    }

    return NextResponse.json({
      cafe: {
        id: cafe.id,
        name: cafe.name,
        address: cafe.address,
        city: cafe.city,
        phone: cafe.phone,
        gstin: cafe.gstin,
        upiId: cafe.upiId,
      },
      bills,
      kpis: {
        totalBills: bills.length,
        totalGross: Math.round(totalGross),
        cashCollected: Math.round(cashCollected),
        upiCollected: Math.round(upiCollected),
        totalDiscounts: Math.round(totalDiscounts),
      },
    });
  } catch (error) {
    console.error('Admin bills API error:', error);
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}
