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
      return NextResponse.json({ error: 'Cafe not found or unauthorized' }, { status: 404 });
    }

    // Fetch active kitchen orders and recently served/bumped orders
    const [orders, servedOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          cafeId: cafe.id,
          status: { in: ['PLACED', 'PREPARING', 'READY'] },
        },
        include: {
          items: true,
          table: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.findMany({
        where: {
          cafeId: cafe.id,
          status: 'SERVED',
        },
        include: {
          items: true,
          table: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({ cafe, orders, servedOrders });
  } catch (error) {
    console.error('KDS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch KDS tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { action, orderId, itemId, minutes, cafeId, cafeSlug } = body;

    let targetCafeId = session?.cafeId || cafeId;
    if (!targetCafeId && cafeSlug) {
      const c = await prisma.tenant.findFirst({ where: { slug: String(cafeSlug) } });
      targetCafeId = c?.id;
    }
    if (!targetCafeId && process.env.NODE_ENV !== 'production') {
      const def = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      targetCafeId = def?.id;
    }

    if (!targetCafeId) {
      return NextResponse.json({ error: 'Cafe context or operator session required' }, { status: 400 });
    }

    // 1. Toggle Item Ready
    if (action === 'toggle-item') {
      if (!itemId) {
        return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
      }

      const item = await prisma.orderItem.findUnique({
        where: { id: String(itemId) },
        include: { order: true },
      });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

      if (item.order?.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Unauthorized: Item does not belong to this cafe' }, { status: 403 });
      }

      const updated = await prisma.orderItem.update({
        where: { id: item.id },
        data: { status: item.status === 'READY' ? 'PENDING' : 'READY' },
      });

      return NextResponse.json({ success: true, item: updated });
    }

    // 2. Adjust Chef ETA (+5m / +10m)
    if (action === 'adjust-eta') {
      if (!orderId) {
        return NextResponse.json({ success: true, note: 'Mock ETA updated' });
      }

      const order = await prisma.order.findFirst({
        where: {
          OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }],
        },
      });
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

      if (order.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Unauthorized: Order does not belong to this cafe' }, { status: 403 });
      }

      // Strictly clamp minutes: 1 to 60 minutes per tap, max prep ceiling of 180 min
      const validMinutes = Math.min(60, Math.max(1, Math.round(Number(minutes) || 5)));
      const newPrepMinutes = Math.min(180, (order.dynamicPrepMinutes || 10) + validMinutes);

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { dynamicPrepMinutes: newPrepMinutes },
      });

      return NextResponse.json({ success: true, order: updated });
    }

    // 3. Mark Ticket Ready (support both mark-ready and ready-order)
    if (action === 'mark-ready' || action === 'ready-order') {
      if (!orderId) {
        return NextResponse.json({ success: true, note: 'Mock ticket ready' });
      }

      const order = await prisma.order.findFirst({
        where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
      });
      if (!order) {
        return NextResponse.json({ success: true, note: 'Order not found in DB, client state updated' });
      }

      if (order.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Unauthorized: Order does not belong to this cafe' }, { status: 403 });
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'READY',
          readyAt: new Date(),
        },
      });

      // Mark all items ready
      await prisma.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: 'READY' },
      });

      // Update physical table to READY_TO_SERVE on Floor Grid (leave Takeaway available)
      if (order.tableId) {
        const tbl = await prisma.table.findUnique({ where: { id: order.tableId } });
        if (tbl && tbl.tableNumber.toLowerCase() !== 'takeaway' && tbl.tableNumber.toLowerCase() !== 'counter') {
          await prisma.table.update({
            where: { id: order.tableId },
            data: { currentStatus: 'READY_TO_SERVE' },
          }).catch(() => {});
        }
      }

      return NextResponse.json({ success: true, order: updated });
    }

    // 4. Bump / Serve Ticket
    if (action === 'bump-order') {
      if (!orderId) {
        return NextResponse.json({ success: true });
      }

      const order = await prisma.order.findFirst({
        where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
      });
      if (order) {
        if (order.cafeId !== targetCafeId) {
          return NextResponse.json({ error: 'Unauthorized: Order does not belong to this cafe' }, { status: 403 });
        }

        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'SERVED' },
        });

        // Set table back to OCCUPIED (awaiting bill payment)
        if (order.tableId) {
          await prisma.table.update({
            where: { id: order.tableId },
            data: { currentStatus: 'OCCUPIED' },
          }).catch(() => {});
        }
      }

      return NextResponse.json({ success: true });
    }

    // 5. Recall Ticket (Last or Specific by orderId)
    if (action === 'recall-last' || action === 'recall-order') {
      let orderToRecall = null;
      if (orderId) {
        orderToRecall = await prisma.order.findFirst({
          where: {
            OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }],
            cafeId: targetCafeId,
          },
        });
      } else {
        orderToRecall = await prisma.order.findFirst({
          where: {
            status: 'SERVED',
            cafeId: targetCafeId,
          },
          orderBy: { updatedAt: 'desc' },
        });
      }

      if (orderToRecall) {
        if (orderToRecall.cafeId !== targetCafeId) {
          return NextResponse.json({ error: 'Unauthorized: Order does not belong to this cafe' }, { status: 403 });
        }

        const recalled = await prisma.order.update({
          where: { id: orderToRecall.id },
          data: { status: 'PREPARING' },
        });

        // Reset items to PENDING for the kitchen station
        await prisma.orderItem.updateMany({
          where: { orderId: orderToRecall.id },
          data: { status: 'PENDING' },
        });

        // Set table status to OCCUPIED and point to this order
        if (orderToRecall.tableId) {
          await prisma.table.update({
            where: { id: orderToRecall.tableId },
            data: { currentStatus: 'OCCUPIED', activeOrderId: orderToRecall.id },
          }).catch(() => {});
        }

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
