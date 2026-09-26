import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const cafeSlug = searchParams.get('cafeSlug') || 'artisan-roastery';

    // 1. Fetch Cafe
    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst({
        where: { slug: cafeSlug },
      });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst();
    }

    if (!cafe) {
      return NextResponse.json({ error: 'No cafe found' }, { status: 404 });
    }

    // 2. Fetch Tables (with active orders for live sync), Categories, Menu Items, Active Shift
    const [tables, categories, menuItems, activeShift, recentOrders, servedOrders] = await Promise.all([
      prisma.table.findMany({
        where: { cafeId: cafe.id },
        include: {
          orders: {
            where: { status: { in: ['PLACED', 'PREPARING', 'READY'] } },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { tableNumber: 'asc' },
      }),
      prisma.category.findMany({
        where: { cafeId: cafe.id, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: { cafeId: cafe.id, inStock: true },
        include: { category: true },
      }),
      prisma.cashShift.findFirst({
        where: { cafeId: cafe.id, status: 'OPEN' },
      }),
      prisma.order.findMany({
        where: { cafeId: cafe.id, status: { in: ['PLACED', 'PREPARING', 'READY'] } },
        include: { items: true, table: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.order.findMany({
        where: { cafeId: cafe.id, status: 'SERVED' },
        include: { items: true, table: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      cafe,
      tables,
      categories,
      menuItems,
      activeShift,
      recentOrders,
      servedOrders,
    });
  } catch (error) {
    console.error('POS fetch error:', error);
    return NextResponse.json({ error: 'Failed to load POS data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { action, cafeId } = body;

    const targetCafeId = session?.cafeId || cafeId;
    if (!targetCafeId) {
      return NextResponse.json({ error: 'Cafe ID is required' }, { status: 400 });
    }

    // 1. Settle Order & Create Bill
    if (action === 'settle-bill') {
      const {
        tableId,
        items,
        subtotal,
        cgst,
        sgst,
        total,
        paymentMethod,
        customerPhone,
        customerName,
      } = body;

      // Find table by id or tableNumber
      const table = await prisma.table.findFirst({
        where: {
          cafeId: targetCafeId,
          OR: [{ id: String(tableId) }, { tableNumber: String(tableId) }],
        },
      });

      let order = null;
      if (table?.activeOrderId) {
        order = await prisma.order.findUnique({
          where: { id: table.activeOrderId },
        });
      }

      if (order) {
        order = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'SERVED',
            customerName: customerName || order.customerName,
            customerPhone: customerPhone || order.customerPhone,
          },
        });
      } else {
        const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;
        order = await prisma.order.create({
          data: {
            cafeId: targetCafeId,
            tableId: table?.id || null,
            orderNumber,
            source: 'POS',
            status: 'SERVED',
            customerName: customerName || 'Walk-in Guest',
            customerPhone: customerPhone || '+91 98450 XXXXX',
            items: {
              create: (items || []).map((i: { menuItemId?: string; name: string; price: number; quantity: number; notes?: string }) => ({
                menuItemId: i.menuItemId || null,
                name: i.name,
                price: Number(i.price),
                quantity: Number(i.quantity || 1),
                status: 'READY',
                notes: i.notes || '',
              })),
            },
          },
        });
      }

      // Create Bill
      const bill = await prisma.bill.create({
        data: {
          cafeId: targetCafeId,
          orderId: order.id,
          billNumber: `INV-${order.orderNumber.replace('#', '')}`,
          subtotal: Number(subtotal),
          cgst: Number(cgst),
          sgst: Number(sgst),
          total: Number(total),
          paymentMethod: paymentMethod || 'UPI',
          paymentStatus: 'PAID',
          customerPhone: customerPhone || null,
          whatsappSent: true,
        },
      });

      // If Cash, update active Shift cash sales
      if (paymentMethod === 'CASH') {
        const activeShift = await prisma.cashShift.findFirst({
          where: { cafeId: targetCafeId, status: 'OPEN' },
        });

        if (activeShift) {
          const updatedCashSales = activeShift.cashSales + Number(total);
          const updatedExpected = activeShift.openingCash + updatedCashSales - activeShift.pettyExpenses;
          await prisma.cashShift.update({
            where: { id: activeShift.id },
            data: {
              cashSales: updatedCashSales,
              expectedCash: updatedExpected,
            },
          });
        }
      }

      // Reset Table status if dine-in
      if (table) {
        await prisma.table.update({
          where: { id: table.id },
          data: { currentStatus: 'AVAILABLE', activeOrderId: null },
        });
      }

      return NextResponse.json({ success: true, order, bill });
    }

    // 2. Park / Hold Order
    if (action === 'park-order') {
      const { tableId, items, customerName } = body;
      const table = await prisma.table.findFirst({
        where: {
          cafeId: targetCafeId,
          OR: [{ id: String(tableId) }, { tableNumber: String(tableId) }],
        },
      });

      const order = await prisma.order.create({
        data: {
          cafeId: targetCafeId,
          tableId: table?.id || null,
          orderNumber: `#${Math.floor(1000 + Math.random() * 9000)}`,
          source: 'POS',
          status: 'PLACED',
          customerName: customerName || 'Parked Ticket',
          items: {
            create: (items || []).map((i: { name: string; price: number; quantity: number; notes?: string }) => ({
              name: i.name,
              price: Number(i.price),
              quantity: Number(i.quantity || 1),
              status: 'PENDING',
              notes: i.notes || '',
            })),
          },
        },
      });

      if (table) {
        await prisma.table.update({
          where: { id: table.id },
          data: { currentStatus: 'OCCUPIED', activeOrderId: order.id },
        });
      }

      return NextResponse.json({ success: true, order });
    }

    // 3. Add Petty Expense from Drawer
    if (action === 'add-expense') {
      const { title, amount, category, receiptNote } = body;
      const activeShift = await prisma.cashShift.findFirst({
        where: { cafeId: targetCafeId, status: 'OPEN' },
      });

      const expense = await prisma.expense.create({
        data: {
          cafeId: targetCafeId,
          shiftId: activeShift?.id || null,
          title: title || 'Miscellaneous Expense',
          amount: Number(amount),
          category: category || 'INGREDIENTS',
          paidVia: 'DRAWER_CASH',
          receiptNote: receiptNote || null,
        },
      });

      if (activeShift) {
        const updatedExpenses = activeShift.pettyExpenses + Number(amount);
        const updatedExpected = activeShift.openingCash + activeShift.cashSales - updatedExpenses;
        await prisma.cashShift.update({
          where: { id: activeShift.id },
          data: {
            pettyExpenses: updatedExpenses,
            expectedCash: updatedExpected,
          },
        });
      }

      return NextResponse.json({ success: true, expense });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('POS action error:', error);
    return NextResponse.json({ error: 'Failed to process POS action' }, { status: 500 });
  }
}
