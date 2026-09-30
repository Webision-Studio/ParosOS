import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';
import { isValidEmail, sendCustomerReceiptEmail, sendNightlySalesReportEmail } from '@/lib/brevo';

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
    if (!cafe && process.env.NODE_ENV !== 'production') {
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

    let targetCafeId = session?.cafeId;

    // Strict Tenant Isolation: Block cross-tenant mutation if body.cafeId differs from session
    if (session?.cafeId && cafeId && String(cafeId) !== session.cafeId) {
      return NextResponse.json({ error: 'Forbidden: Cannot perform POS operations on another cafe' }, { status: 403 });
    }

    if (!targetCafeId && cafeId) {
      if (process.env.NODE_ENV !== 'production') {
        const cafeRecord = await prisma.tenant.findUnique({ where: { id: String(cafeId).slice(0, 60) } });
        if (!cafeRecord) {
          return NextResponse.json({ error: 'Specified cafe not found' }, { status: 404 });
        }
        targetCafeId = cafeRecord.id;
      } else {
        return NextResponse.json({ error: 'Unauthorized: Active session required for POS operations' }, { status: 401 });
      }
    }

    if (!targetCafeId && process.env.NODE_ENV !== 'production') {
      const defaultCafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      targetCafeId = defaultCafe?.id;
    }

    if (!targetCafeId) {
      return NextResponse.json({ error: 'Unauthorized: Valid cafe session is required' }, { status: 401 });
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
          where: { id: String(body.orderId) },
          include: { items: true },
        });
        if (primaryOrder && primaryOrder.cafeId !== targetCafeId) {
          return NextResponse.json({ error: 'Unauthorized: Order does not belong to this cafe' }, { status: 403 });
        }
        if (primaryOrder && primaryOrder.status === 'CANCELLED') {
          return NextResponse.json({ error: 'Cannot settle a cancelled order' }, { status: 400 });
        }
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

      // Race condition defense: Check if this order has already been billed
      const existingPaidBill = await prisma.bill.findFirst({
        where: { orderId: primaryOrder.id, paymentStatus: 'PAID' },
      });
      if (existingPaidBill) {
        return NextResponse.json({
          success: true,
          bill: existingPaidBill,
          alreadySettled: true,
          message: 'Order has already been settled and paid.',
        });
      }

      // Server-side financial verification: compute subtotal from actual items in primaryOrder
      const verifiedItemsSubtotal = (primaryOrder.items || []).reduce(
        (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
        0
      );
      const finalSubtotal = verifiedItemsSubtotal > 0 ? verifiedItemsSubtotal : Math.max(0, Number(subtotal) || 0);

      // Server-side Coupon validation & application
      let verifiedCouponDiscount = 0;
      let appliedCouponCode: string | null = null;
      if (body.couponCode) {
        const cleanCode = String(body.couponCode).trim().toUpperCase();
        const coupon = await prisma.coupon.findFirst({
          where: { cafeId: targetCafeId, code: cleanCode, isActive: true },
        });
        if (coupon && finalSubtotal >= coupon.minOrderValue) {
          if (coupon.discountType === 'PERCENTAGE') {
            verifiedCouponDiscount = Math.round((finalSubtotal * coupon.discountValue) / 100);
            if (coupon.maxDiscount && coupon.maxDiscount > 0) {
              verifiedCouponDiscount = Math.min(verifiedCouponDiscount, coupon.maxDiscount);
            }
          } else {
            verifiedCouponDiscount = coupon.discountValue;
          }
          appliedCouponCode = coupon.code;
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usageCount: { increment: 1 } },
          }).catch(() => {});
        }
      }

      const rawDiscount = Math.max(0, Number(discount) || 0);
      const effectiveDiscount = Math.max(rawDiscount, verifiedCouponDiscount);
      const finalDiscount = Math.min(finalSubtotal, effectiveDiscount);
      const taxableAmount = Math.max(0, finalSubtotal - finalDiscount);
      const finalCgst = Math.round(taxableAmount * 0.025 * 100) / 100;
      const finalSgst = Math.round(taxableAmount * 0.025 * 100) / 100;
      const finalTotal = Math.round(taxableAmount + finalCgst + finalSgst);

      // Multi-channel Aggregator Calculation (Swiggy / Zomato / POS / Takeaway)
      const orderSource = String(body.source || primaryOrder.source || 'POS').toUpperCase();
      const isAggregator = orderSource === 'SWIGGY' || orderSource === 'ZOMATO';
      const aggregatorCut = isAggregator ? Math.round(finalTotal * 0.20 * 100) / 100 : 0;
      const netPayout = isAggregator ? Math.max(0, finalTotal - aggregatorCut) : finalTotal;

      await prisma.order.update({
        where: { id: primaryOrder.id },
        data: {
          source: orderSource,
          aggregatorOrderId: body.aggregatorOrderId ? String(body.aggregatorOrderId).slice(0, 50).trim() : null,
          aggregatorCut,
          netPayout,
        },
      }).catch(() => {});

      // Auto-deduct inventory raw materials based on recipe ingredients
      try {
        for (const item of primaryOrder.items || []) {
          if (item.menuItemId) {
            const recipes = await prisma.menuItemIngredient.findMany({
              where: { menuItemId: item.menuItemId },
            });
            for (const r of recipes) {
              const qtyToDeduct = r.quantityNeeded * (item.quantity || 1);
              await prisma.inventoryItem.update({
                where: { id: r.inventoryItemId },
                data: { currentStock: { decrement: qtyToDeduct } },
              }).catch(() => {});
            }
          }
        }
      } catch (invErr) {
        console.warn('Inventory auto-deduction error:', invErr);
      }

      const safeCustomerName = customerName ? String(customerName).slice(0, 80).trim() : null;
      const safeCustomerEmail = customerEmail && isValidEmail(customerEmail) ? String(customerEmail).trim().slice(0, 100) : null;
      const safeProcessedBy = processedBy ? String(processedBy).slice(0, 60).trim() : 'Primary Cashier';

      // Create Bill attached to primaryOrder.id with strictly verified financial totals
      const safePrimaryOrderNum = String(primaryOrder.orderNumber || '0000').replace('#', '');
      const bill = await prisma.bill.create({
        data: {
          cafeId: targetCafeId,
          orderId: primaryOrder.id,
          billNumber: `INV-${safePrimaryOrderNum}-${Math.floor(100 + Math.random() * 900)}`,
          subtotal: finalSubtotal,
          discount: finalDiscount,
          couponCode: appliedCouponCode,
          cgst: finalCgst,
          sgst: finalSgst,
          total: finalTotal,
          paymentMethod: String(paymentMethod || 'UPI').slice(0, 20),
          paymentStatus: 'PAID',
          customerPhone: normalizedPhone || null,
          customerName: safeCustomerName,
          customerEmail: safeCustomerEmail,
          processedBy: safeProcessedBy,
          whatsappSent: false,
          emailSent: false,
        },
      });

      if (normalizedPhone) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { cafeId_phone: { cafeId: targetCafeId, phone: normalizedPhone } },
        });

        if (existingCustomer) {
          await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name: safeCustomerName || existingCustomer.name,
              // Only update email if the customer record previously had no email (anti-poisoning)
              email: existingCustomer.email || safeCustomerEmail || undefined,
              visitCount: { increment: 1 },
              totalSpend: { increment: finalTotal },
              lastVisitAt: new Date(),
            },
          });
        } else {
          await prisma.customer.create({
            data: {
              cafeId: targetCafeId,
              phone: normalizedPhone,
              name: safeCustomerName,
              email: safeCustomerEmail,
              totalSpend: finalTotal,
            },
          });
        }
      }

      // Dispatch Brevo digital receipt email if customer provided a valid email
      if (customerEmail && isValidEmail(customerEmail)) {
        const cafeInfo = await prisma.tenant.findUnique({ where: { id: targetCafeId } });
        if (cafeInfo) {
          sendCustomerReceiptEmail({
            cafe: cafeInfo,
            bill: {
              billNumber: bill.billNumber,
              subtotal: bill.subtotal,
              discount: bill.discount,
              cgst: bill.cgst,
              sgst: bill.sgst,
              total: bill.total,
              paymentMethod: bill.paymentMethod,
              createdAt: bill.createdAt,
              tableNumber: table?.tableNumber || 'Takeaway',
            },
            items: (primaryOrder.items || []).map((it) => ({
              name: it.name,
              quantity: it.quantity,
              price: it.price,
              notes: it.notes,
            })),
            customer: {
              email: customerEmail,
              name: customerName,
              phone: normalizedPhone,
            },
          })
            .then((res) => {
              if (res.success) {
                prisma.bill.update({ where: { id: bill.id }, data: { emailSent: true } }).catch(() => {});
              }
            })
            .catch((err) => console.error('Error dispatching customer receipt email:', err));
        }
      }


      // If there are other unbilled orders for this table, close them with bills as part of this table tab
      const otherUnbilled = activeOrders.filter((o) => o.id !== primaryOrder.id);
      for (const other of otherUnbilled) {
        const otherSubtotal = (other.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
        const otherSafeOrderNum = String(other.orderNumber || '0000').replace('#', '');
        await prisma.bill.create({
          data: {
            cafeId: targetCafeId,
            orderId: other.id,
            billNumber: `INV-${otherSafeOrderNum}-${Math.floor(100 + Math.random() * 900)}`,
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
          const updatedCashSales = activeShift.cashSales + finalTotal;
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

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'Parked order must contain items' }, { status: 400 });
      }

      const safeItems = items.slice(0, 50).map((i: { name: string; price: number; quantity: number; notes?: string }) => ({
        name: String(i.name || 'Custom Item').slice(0, 100),
        price: Math.min(100000, Math.max(0, Number(i.price) || 0)),
        quantity: Math.min(50, Math.max(1, Math.floor(Number(i.quantity) || 1))),
        status: 'PENDING' as const,
        notes: i.notes ? String(i.notes).slice(0, 150) : '',
      }));

      const order = await prisma.order.create({
        data: {
          cafeId: targetCafeId,
          tableId: table?.id || null,
          orderNumber: `#${Math.floor(1000 + Math.random() * 9000)}`,
          source: 'POS',
          status: 'PLACED',
          customerName: customerName ? String(customerName).slice(0, 80).trim() : 'Parked Ticket',
          items: {
            create: safeItems,
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
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
        return NextResponse.json(
          { error: 'Valid positive expense amount required (₹1 to ₹10,00,000)' },
          { status: 400 }
        );
      }

      const safeTitle = String(title || 'Miscellaneous Expense').slice(0, 100).trim();
      const safeCategory = String(category || 'INGREDIENTS').slice(0, 30).trim();
      const safeReceiptNote = receiptNote ? String(receiptNote).slice(0, 300).trim() : null;
      const mode = paidVia === 'UPI' || paidVia === 'OWNER_PERSONAL' ? paidVia : 'DRAWER_CASH';

      const activeShift = await prisma.cashShift.findFirst({
        where: { cafeId: targetCafeId, status: 'OPEN' },
      });

      const expense = await prisma.expense.create({
        data: {
          cafeId: targetCafeId,
          shiftId: activeShift?.id || null,
          title: safeTitle,
          amount: numAmount,
          category: safeCategory,
          paidVia: mode,
          receiptNote: safeReceiptNote,
        },
      });

      if (activeShift && mode === 'DRAWER_CASH') {
        const updatedExpenses = activeShift.pettyExpenses + numAmount;
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

    // 4. Close Shift & Reconcile Drawer & Trigger Nightly Report
    if (action === 'close-shift') {
      const { countedCash, notes, sendEmailReport, operatorName } = body;
      const activeShift = await prisma.cashShift.findFirst({
        where: { cafeId: targetCafeId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      });

      if (!activeShift) {
        return NextResponse.json({ error: 'No active open shift found to close' }, { status: 400 });
      }

      const openingCash = activeShift.openingCash || 0;
      const cashSales = activeShift.cashSales || 0;
      const pettyExpenses = activeShift.pettyExpenses || 0;
      const expectedCash = openingCash + cashSales - pettyExpenses;

      const counted = Number(countedCash !== undefined ? countedCash : expectedCash);
      if (isNaN(counted) || counted < 0 || counted > 100000000) {
        return NextResponse.json({ error: 'Valid positive counted cash amount required' }, { status: 400 });
      }

      const discrepancy = counted - expectedCash;
      const safeNotes = notes ? String(notes).slice(0, 500).trim() : null;
      const safeOperatorName = String(operatorName || 'Primary Cashier').slice(0, 60).trim();

      const closedShift = await prisma.cashShift.update({
        where: { id: activeShift.id },
        data: {
          status: 'CLOSED',
          countedCash: counted,
          discrepancy,
          notes: safeNotes,
          closedAt: new Date(),
        },
      });

      // Automatically open next shift with the closing float cash
      const nextShift = await prisma.cashShift.create({
        data: {
          cafeId: targetCafeId,
          status: 'OPEN',
          openingCash: counted,
          openedAt: new Date(),
        },
      });

      // Optionally dispatch nightly email report via Brevo
      let emailResult = null;
      if (sendEmailReport !== false) {
        try {
          const cafe = await prisma.tenant.findUnique({ where: { id: targetCafeId } });
          if (cafe?.email) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const [bills, expenses] = await Promise.all([
              prisma.bill.findMany({
                where: { cafeId: targetCafeId, createdAt: { gte: startOfDay, lte: endOfDay } },
                include: { order: { include: { items: true } } },
              }),
              prisma.expense.findMany({
                where: { cafeId: targetCafeId, createdAt: { gte: startOfDay, lte: endOfDay } },
              }),
            ]);

            let totalRevenue = 0;
            let totalGst = 0;
            let upiTotal = 0;
            let cashTotal = 0;
            let cardTotal = 0;
            let otherTotal = 0;
            const itemCounts = new Map<string, { quantity: number; revenue: number }>();

            for (const b of bills) {
              totalRevenue += b.total;
              totalGst += (b.cgst || 0) + (b.sgst || 0);
              const mode = (b.paymentMethod || 'UPI').toUpperCase();
              if (mode === 'UPI') upiTotal += b.total;
              else if (mode === 'CASH') cashTotal += b.total;
              else if (mode === 'CARD') cardTotal += b.total;
              else otherTotal += b.total;

              if (b.order?.items) {
                for (const it of b.order.items) {
                  const cur = itemCounts.get(it.name) || { quantity: 0, revenue: 0 };
                  cur.quantity += it.quantity;
                  cur.revenue += it.price * it.quantity;
                  itemCounts.set(it.name, cur);
                }
              }
            }

            const topItems = Array.from(itemCounts.entries())
              .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
              .sort((a, b) => b.quantity - a.quantity)
              .slice(0, 5);

            emailResult = await sendNightlySalesReportEmail({
              cafe,
              date: new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }),
              totalRevenue,
              totalBills: bills.length,
              avgTicket: bills.length > 0 ? Math.round((totalRevenue / bills.length) * 100) / 100 : 0,
              totalGst,
              paymentBreakdown: { upi: upiTotal, cash: cashTotal, card: cardTotal, other: otherTotal },
              shiftSummary: {
                openingCash,
                cashSales,
                pettyExpenses,
                expectedCash,
                countedCash: counted,
                discrepancy,
                notes: notes || null,
                operatorName: operatorName || 'Primary Cashier',
              },
              expenses: expenses.map((e) => ({
                title: e.title,
                amount: e.amount,
                category: e.category,
                paidVia: e.paidVia,
              })),
              topItems,
            });
          }
        } catch (emailErr) {
          console.error('Failed to trigger nightly sales report email on shift close:', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        closedShift,
        nextShift,
        emailResult,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('POS action error:', error);
    return NextResponse.json({ error: 'Failed to process POS action' }, { status: 500 });
  }
}
