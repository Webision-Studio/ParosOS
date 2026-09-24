import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableNumber, items, total, customerName, customerPhone, specialNotes } = body;

    const cafe = await prisma.tenant.findFirst({
      where: { slug: 'artisan-roastery' },
    }) || await prisma.tenant.findFirst();

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
        customerName: customerName || 'Table Guest',
        customerPhone: customerPhone || '+91 98450 XXXXX',
        specialNotes: specialNotes || '',
        items: {
          create: items.map((i: { name: string; price: number; quantity: number; notes?: string }) => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity || 1,
            status: 'PENDING',
            notes: i.notes || '',
          })),
        },
      },
      include: { items: true },
    });

    // Update table status
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
