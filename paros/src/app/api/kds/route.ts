import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const cafeSlug = searchParams.get('cafeSlug') || 'artisan-roastery';

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst({ where: { slug: cafeSlug } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst();
    }

    if (!cafe) {
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }

    // Fetch active kitchen orders
    const orders = await prisma.order.findMany({
      where: {
        cafeId: cafe.id,
        status: { in: ['PLACED', 'PREPARING', 'READY'] },
      },
      include: {
        items: true,
        table: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ cafe, orders });
  } catch (error) {
    console.error('KDS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch KDS tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, itemId, minutes } = body;

    // 1. Toggle Item Ready
    if (action === 'toggle-item') {
      const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

      const updated = await prisma.orderItem.update({
        where: { id: itemId },
        data: { status: item.status === 'READY' ? 'PENDING' : 'READY' },
      });

      return NextResponse.json({ success: true, item: updated });
    }

    // 2. Adjust Chef ETA (+5m / +10m)
    if (action === 'adjust-eta') {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { dynamicPrepMinutes: order.dynamicPrepMinutes + Number(minutes || 5) },
      });

      return NextResponse.json({ success: true, order: updated });
    }

    // 3. Mark Ticket Ready
    if (action === 'mark-ready') {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'READY',
          readyAt: new Date(),
        },
      });

      // Mark all items ready
      await prisma.orderItem.updateMany({
        where: { orderId },
        data: { status: 'READY' },
      });

      return NextResponse.json({ success: true, order: updated });
    }

    // 4. Bump / Serve Ticket
    if (action === 'bump-order') {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'SERVED' },
      });

      return NextResponse.json({ success: true, order: updated });
    }

    // 5. Recall Last Bumped Ticket
    if (action === 'recall-last') {
      const lastServed = await prisma.order.findFirst({
        where: { status: 'SERVED' },
        orderBy: { updatedAt: 'desc' },
      });

      if (lastServed) {
        const recalled = await prisma.order.update({
          where: { id: lastServed.id },
          data: { status: 'PREPARING' },
        });
        return NextResponse.json({ success: true, order: recalled });
      }

      return NextResponse.json({ error: 'No tickets to recall' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('KDS action error:', error);
    return NextResponse.json({ error: 'Failed to process KDS action' }, { status: 500 });
  }
}
