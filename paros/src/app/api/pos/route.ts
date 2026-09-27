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

    // 2. Fetch Tables (with active orders for live sync), Categories, Menu Items, Active Shift, and Recent Expenses
    const [tables, categories, menuItems, activeShift, recentOrders, servedOrders, expenses] = await Promise.all([
      prisma.table.findMany({
        where: { cafeId: cafe.id },
        include: {
          orders: {
            where: {
              status: { in: ['PLACED', 'PREPARING', 'READY', 'SERVED'] },
              bills: { none: {} },
            },
            include: { items: true },
            orderBy: { createdAt: 'asc' },
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
      prisma.expense.findMany({
        where: { cafeId: cafe.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
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
      expenses,
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

    let targetCafeId = session?.cafeId || cafeId;
    if (!targetCafeId) {
      const defaultCafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      targetCafeId = defaultCafe?.id;
    }

    if (!targetCafeId) {
      return NextResponse.json({ error: 'Cafe ID is required' }, { status: 400 });
    }

    // 1. Settle Order & Create Bill
    if (action === 'settle-bill') {
      const {
        tableId,
        items,
        subtotal,
        discount,
        cgst,
        sgst,
        total,
        paymentMethod,
        customerPhone,
        customerName,
        customerEmail,
        processedBy,
      } = body;

      // Find table by id or tableNumber (case-insensitive & handles 'T4' vs '4')
      const cleanTableId = String(tableId).replace(/^T/i, '').trim();
      const table = await prisma.table.findFirst({
        where: {
          cafeId: targetCafeId,
          OR: [
            { id: String(tableId) },
            { tableNumber: { equals: String(tableId), mode: 'insensitive' } },
            { tableNumber: { equals: cleanTableId, mode: 'insensitive' } },
            { tableNumber: { equals: `T${cleanTableId}`, mode: 'insensitive' } },
          ],
        },
      });

      // Find any active unbilled orders for this table
      const activeOrders = table
        ? await prisma.order.findMany({
            where: {
              tableId: table.id,
              status: { not: 'CANCELLED' },
              bills: { none: {} },
            },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
          })
        : [];

      const isTakeawayStation = table && (table.tableNumber.toLowerCase() === 'takeaway' || table.tableNumber.toLowerCase() === 'counter');

      let primaryOrder: (typeof activeOrders)[number] | null = null;
      if (body.orderId) {
        primaryOrder = await prisma.order.findUnique({
          where: { id: body.orderId },
          include: { items: true },
        });
      } else if (!isTakeawayStation) {
        primaryOrder = activeOrders[0] || null;
        if (!primaryOrder && table?.activeOrderId) {
          primaryOrder = await prisma.order.findUnique({
            where: { id: table.activeOrderId },
            include: { items: true },
          });
        }
      }

      if (primaryOrder) {
        // Mark primary order and any unbilled orders for this table as SERVED
        await prisma.order.updateMany({
          where: {
            OR: [
              { id: primaryOrder.id },
              ...(table ? [{ tableId: table.id, bills: { none: {} } }] : []),
            ],
          },
          data: {
            status: 'SERVED',
            customerName: customerName || primaryOrder.customerName,
            customerPhone: customerPhone || primaryOrder.customerPhone,
          },
        });
      } else {
        const orderNumber = body.tokenNumber || `#${Math.floor(1000 + Math.random() * 9000)}`;
        const shouldSendToKitchen = body.sendToKitchen !== undefined ? body.sendToKitchen : true;
        const initialStatus = shouldSendToKitchen ? 'PLACED' : 'SERVED';
        const itemStatus = shouldSendToKitchen ? 'PENDING' : 'READY';

        primaryOrder = await prisma.order.create({
          data: {
            cafeId: targetCafeId,
            tableId: table?.id || null,
            orderNumber,
            source: 'POS',
            status: initialStatus,
            customerName: customerName || (table?.tableNumber === 'Takeaway' ? 'Express Takeaway' : 'Walk-in Guest'),
            customerPhone: customerPhone || '+91 98450 XXXXX',
            specialNotes: body.specialNotes || (table?.tableNumber === 'Takeaway' ? 'EXPRESS TOKEN • PREPAID' : 'COUNTER POS ORDER'),
            items: {
              create: (items || []).map((i: { menuItemId?: string; name: string; price: number; quantity: number; notes?: string }) => ({
                menuItemId: i.menuItemId || null,
                name: i.name,
                price: Number(i.price),
                quantity: Number(i.quantity || 1),
                status: itemStatus,
                notes: i.notes || '',
              })),
            },
          },
          include: { items: true },
        });
      }

      // Normalize customer phone number for consistent CRM profiles
      let normalizedPhone: string | null = null;
      if (customerPhone) {
        const digits = String(customerPhone).replace(/[^0-9]/g, '');
        if (digits.length >= 10) {
          normalizedPhone = `+91 ${digits.slice(-10)}`;
        }
      }

      // Create Bill attached to primaryOrder.id
      const bill = await prisma.bill.create({
        data: {
          cafeId: targetCafeId,
          orderId: primaryOrder.id,
          billNumber: `INV-${primaryOrder.orderNumber.replace('#', '')}-${Math.floor(100 + Math.random() * 900)}`,
          subtotal: Number(subtotal),
          discount: Number(discount || 0),
          cgst: Number(cgst),
          sgst: Number(sgst),
          total: Number(total),
          paymentMethod: paymentMethod || 'UPI',
          paymentStatus: 'PAID',
          customerPhone: normalizedPhone || customerPhone || null,
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          processedBy: processedBy || 'Primary Cashier',
          whatsappSent: false,
          emailSent: false,
        },
      });

      if (normalizedPhone) {
        await prisma.customer.upsert({
          where: { cafeId_phone: { cafeId: targetCafeId, phone: normalizedPhone } },
          update: {
            name: customerName || undefined,
            email: customerEmail || undefined,
            visitCount: { increment: 1 },
            totalSpend: { increment: Number(total) },
            lastVisitAt: new Date(),
          },
          create: {
            cafeId: targetCafeId,
            phone: normalizedPhone,
            name: customerName || null,
            email: customerEmail || null,
            totalSpend: Number(total),
          },
        });
      }

      // If there are other unbilled orders for this table, close them with bills as part of this table tab
      const otherUnbilled = activeOrders.filter((o) => o.id !== primaryOrder.id);
      for (const other of otherUnbilled) {
        const otherSubtotal = other.items.reduce((s, it) => s + it.price * it.quantity, 0);
        await prisma.bill.create({
          data: {
            cafeId: targetCafeId,
            orderId: other.id,
            billNumber: `INV-${other.orderNumber.replace('#', '')}-${Math.floor(100 + Math.random() * 900)}`,
            subtotal: otherSubtotal,
            cgst: Math.round(otherSubtotal * 0.025 * 100) / 100,
            sgst: Math.round(otherSubtotal * 0.025 * 100) / 100,
            total: Math.round(otherSubtotal * 1.05),
            paymentMethod: paymentMethod || 'UPI',
            paymentStatus: 'PAID',
            customerPhone: customerPhone || null,
            whatsappSent: false,
          },
        }).catch(() => {});
      }

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

      return NextResponse.json({ success: true, order: primaryOrder, bill });
    }

    // 2. Park / Hold Order
    if (action === 'park-order') {
      const { tableId, items, customerName } = body;
      const cleanTableId = String(tableId).replace(/^T/i, '').trim();
      const table = await prisma.table.findFirst({
        where: {
          cafeId: targetCafeId,
          OR: [
            { id: String(tableId) },
            { tableNumber: { equals: String(tableId), mode: 'insensitive' } },
            { tableNumber: { equals: cleanTableId, mode: 'insensitive' } },
            { tableNumber: { equals: `T${cleanTableId}`, mode: 'insensitive' } },
          ],
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
      const { title, amount, category, paidVia, receiptNote } = body;
      const activeShift = await prisma.cashShift.findFirst({
        where: { cafeId: targetCafeId, status: 'OPEN' },
      });

      const mode = paidVia || 'DRAWER_CASH';
      const expense = await prisma.expense.create({
        data: {
          cafeId: targetCafeId,
          shiftId: activeShift?.id || null,
          title: title || 'Miscellaneous Expense',
          amount: Number(amount),
          category: category || 'INGREDIENTS',
          paidVia: mode,
          receiptNote: receiptNote || null,
        },
      });

      if (activeShift && mode === 'DRAWER_CASH') {
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
