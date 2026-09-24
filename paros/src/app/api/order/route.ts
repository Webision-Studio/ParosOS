import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const cafeSlug = searchParams.get('cafeSlug');

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe && cafeSlug) {
      cafe = await prisma.tenant.findUnique({ where: { slug: cafeSlug } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    if (!cafe) {
      return NextResponse.json({ error: 'No active cafe found' }, { status: 404 });
    }

    const [tables, categories, menuItems] = await Promise.all([
      prisma.table.findMany({ where: { cafeId: cafe.id }, orderBy: { tableNumber: 'asc' } }),
      prisma.category.findMany({ where: { cafeId: cafe.id, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.menuItem.findMany({ where: { cafeId: cafe.id, inStock: true }, include: { category: true } }),
    ]);

    return NextResponse.json({
      cafe,
      tables,
      categories,
      menuItems,
    });
  } catch (error) {
    console.error('Order GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch QR order menu' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { tableNumber, items, total, customerName, customerPhone, specialNotes, cafeId } = body;

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe && cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: cafeId } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    if (!cafe) {
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }

    // Find table
    const table = await prisma.table.findFirst({
      where: { cafeId: cafe.id, tableNumber: String(tableNumber) },
    });

    const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await prisma.order.create({
      data: {
        cafeId: cafe.id,
        tableId: table?.id || null,
        orderNumber,
        source: 'QR',
        status: 'PLACED',
        dynamicPrepMinutes: 10,
        customerName: customerName || `Table ${tableNumber} Guest`,
        customerPhone: customerPhone || '+91 98450 XXXXX',
        specialNotes: specialNotes || '',
        items: {
          create: (items || []).map((i: { name: string; price: number; quantity: number; notes?: string; milk?: string }) => ({
            name: i.name,
            price: Number(i.price),
            quantity: Number(i.quantity || 1),
            status: 'PENDING',
            notes: [i.notes, i.milk].filter(Boolean).join(' • '),
          })),
        },
      },
      include: { items: true },
    });

    // Update table status to OCCUPIED
    if (table) {
      await prisma.table.update({
        where: { id: table.id },
        data: { currentStatus: 'OCCUPIED', activeOrderId: order.id },
      });
    }

    return NextResponse.json({
      success: true,
      order,
      orderNumber,
      prepTimeMinutes: 10,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create QR order' }, { status: 500 });
  }
}
