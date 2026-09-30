import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    // Strict Tenant Isolation: Financial analytics, drawer cash, and customer spend require authenticated session
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized: Operator session login required to view financial analytics' },
        { status: 401 }
      );
    }

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe && process.env.NODE_ENV !== 'production') {
      const { searchParams } = new URL(req.url);
      const cafeSlug = searchParams.get('cafeSlug');
      if (cafeSlug) {
        cafe = await prisma.tenant.findUnique({ where: { slug: cafeSlug } });
      }
      if (!cafe) {
        cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      }
    }

    if (!cafe) {
      return NextResponse.json({ error: 'Cafe not found or unauthorized' }, { status: 401 });
    }

    // Fetch active shift, expenses, customers, menu items, and aggregate financial totals
    const [activeShift, expenses, customers, menuItems, totalSalesAgg, upiSalesAgg, cashSalesAgg] = await Promise.all([
      prisma.cashShift.findFirst({
        where: { cafeId: cafe.id, status: 'OPEN' },
        include: { expenses: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.expense.findMany({
        where: { cafeId: cafe.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.customer.findMany({
        where: { cafeId: cafe.id },
        orderBy: { visitCount: 'desc' },
        take: 10,
      }),
      prisma.menuItem.findMany({
        where: { cafeId: cafe.id },
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
      prisma.bill.aggregate({
        where: { cafeId: cafe.id, paymentStatus: 'PAID' },
        _sum: { total: true },
        _count: true,
      }),
      prisma.bill.aggregate({
        where: { cafeId: cafe.id, paymentStatus: 'PAID', paymentMethod: 'UPI' },
        _sum: { total: true },
      }),
      prisma.bill.aggregate({
        where: { cafeId: cafe.id, paymentStatus: 'PAID', paymentMethod: 'CASH' },
        _sum: { total: true },
      }),
    ]);

    // Financial totals
    const grossSales = totalSalesAgg._sum.total || 0;
    const upiSales = upiSalesAgg._sum.total || 0;
    const cashSales = cashSalesAgg._sum.total || 0;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netCashFlow = grossSales - totalExpenses;
    const completedTickets = totalSalesAgg._count || 0;

    const openingFloat = activeShift?.openingCash || 2000;
    const currentDrawerCash = openingFloat + (activeShift?.cashSales || 0) - (activeShift?.pettyExpenses || 0);

    // Calculate Top 5 Bestselling Menu Items
    const completedOrders = await prisma.order.findMany({
      where: {
        cafeId: cafe.id,
        status: { in: ['COMPLETED', 'READY', 'SERVED', 'IN_PREP'] },
      },
      include: {
        items: true,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const itemStatsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    let grandTotalItemSales = 0;

    for (const ord of completedOrders) {
      for (const it of ord.items) {
        grandTotalItemSales += it.price * it.quantity;
        const existing = itemStatsMap.get(it.name) || { name: it.name, quantity: 0, revenue: 0 };
        existing.quantity += it.quantity;
        existing.revenue += it.price * it.quantity;
        itemStatsMap.set(it.name, existing);
      }
    }

    const bestsellers = Array.from(itemStatsMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((item, index) => ({
        rank: index + 1,
        name: item.name,
        quantity: item.quantity,
        revenue: item.revenue,
        percentOfTotal: grandTotalItemSales > 0 ? Math.round((item.revenue / grandTotalItemSales) * 100) : 0,
      }));

    return NextResponse.json({
      cafe,
      kpis: {
        grossSales,
        upiSales,
        cashSales,
        totalExpenses,
        netCashFlow,
        currentDrawerCash,
        openingFloat,
        completedTickets,
        averageTicket: completedTickets > 0 ? Math.round(grossSales / completedTickets) : 0,
      },
      activeShift,
      expenses,
      customers,
      menuItems,
      bestsellers,
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Failed to load financial data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { action, cafeId } = body;

    let targetCafeId = session?.cafeId;
    if (!targetCafeId && cafeId) {
      if (process.env.NODE_ENV !== 'production') {
        targetCafeId = cafeId;
      } else {
        return NextResponse.json({ error: 'Unauthorized: Session login required for admin operations' }, { status: 401 });
      }
    }
    if (!targetCafeId && process.env.NODE_ENV !== 'production') {
      const latestCafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      targetCafeId = latestCafe?.id;
    }

    if (!targetCafeId) {
      return NextResponse.json({ error: 'Unauthorized: No active admin session found' }, { status: 401 });
    }

    // 1. Log Expense
    if (action === 'log-expense') {
      const { title, amount, category, paidVia, receiptNote } = body;
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
        return NextResponse.json({ error: 'Valid positive expense amount required (₹1 to ₹10,00,000)' }, { status: 400 });
      }

      const activeShift = await prisma.cashShift.findFirst({
        where: { cafeId: targetCafeId, status: 'OPEN' },
      });

      const expense = await prisma.expense.create({
        data: {
          cafeId: targetCafeId,
          shiftId: activeShift?.id || null,
          title: String(title || 'Store Expense').slice(0, 100).trim(),
          amount: numAmount,
          category: String(category || 'INGREDIENTS').slice(0, 30).trim(),
          paidVia: paidVia === 'UPI' || paidVia === 'OWNER_PERSONAL' ? paidVia : 'DRAWER_CASH',
          receiptNote: receiptNote ? String(receiptNote).slice(0, 300).trim() : null,
        },
      });

      if (activeShift && paidVia === 'DRAWER_CASH') {
        const updatedExpenses = activeShift.pettyExpenses + numAmount;
        const updatedExpected = activeShift.openingCash + activeShift.cashSales - updatedExpenses;
        await prisma.cashShift.update({
          where: { id: activeShift.id },
          data: { pettyExpenses: updatedExpenses, expectedCash: updatedExpected },
        });
      }

      return NextResponse.json({ success: true, expense });
    }

    // Delete / Void Expense
    if (action === 'delete-expense') {
      const { expenseId } = body;
      const expense = await prisma.expense.findUnique({ where: { id: String(expenseId).slice(0, 60) } });
      if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }

      if (expense.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Unauthorized to delete this expense' }, { status: 403 });
      }

      // If it was paid from drawer cash, restore active shift float
      if (expense.paidVia === 'DRAWER_CASH' && expense.shiftId) {
        const shift = await prisma.cashShift.findUnique({ where: { id: expense.shiftId } });
        if (shift && shift.status === 'OPEN') {
          const restoredExpenses = Math.max(0, shift.pettyExpenses - expense.amount);
          const restoredExpected = shift.openingCash + shift.cashSales - restoredExpenses;
          await prisma.cashShift.update({
            where: { id: shift.id },
            data: { pettyExpenses: restoredExpenses, expectedCash: restoredExpected },
          });
        }
      }

      await prisma.expense.delete({ where: { id: expense.id } });

      return NextResponse.json({ success: true, deletedId: expense.id });
    }

    // 2. Close Shift (Day-End Z-Report)
    if (action === 'close-shift') {
      const { countedCash, notes } = body;
      const activeShift = await prisma.cashShift.findFirst({
        where: { cafeId: targetCafeId, status: 'OPEN' },
      });

      if (!activeShift) {
        return NextResponse.json({ error: 'No active shift found' }, { status: 404 });
      }

      const counted = Number(countedCash !== undefined ? countedCash : activeShift.expectedCash);
      if (isNaN(counted) || counted < 0 || counted > 100000000) {
        return NextResponse.json({ error: 'Valid positive counted cash amount required' }, { status: 400 });
      }

      const discrepancy = counted - activeShift.expectedCash;

      const closed = await prisma.cashShift.update({
        where: { id: activeShift.id },
        data: {
          status: 'CLOSED',
          countedCash: counted,
          discrepancy,
          closedAt: new Date(),
          notes: notes ? String(notes).slice(0, 500).trim() : `Shift closed by owner. Discrepancy: ₹${discrepancy}`,
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

      return NextResponse.json({ success: true, shift: closed, nextShift });
    }

    // 3. Add Menu Item
    if (action === 'add-menu-item') {
      const { name, price, categoryName, isVeg, description } = body;

      const cleanName = String(name || '').slice(0, 100).trim();
      if (!cleanName) {
        return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
      }

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0 || numPrice > 100000) {
        return NextResponse.json({ error: 'Valid item price required (₹0 to ₹1,00,000)' }, { status: 400 });
      }

      const cleanCategoryName = String(categoryName || 'Specials').slice(0, 50).trim();
      let category = await prisma.category.findFirst({
        where: { cafeId: targetCafeId, name: cleanCategoryName },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            cafeId: targetCafeId,
            name: cleanCategoryName,
            sortOrder: 10,
          },
        });
      }

      const menuItem = await prisma.menuItem.create({
        data: {
          cafeId: targetCafeId,
          categoryId: category.id,
          name: cleanName,
          price: numPrice,
          isVeg: isVeg !== false,
          description: description ? String(description).slice(0, 300).trim() : 'Specialty creation',
          inStock: true,
          prepTimeMinutes: 5,
          imageUrl: body.imageUrl ? String(body.imageUrl).slice(0, 500).trim() : null,
        },
        include: { category: true },
      });

      return NextResponse.json({ success: true, menuItem });
    }

    // Edit Menu Item
    if (action === 'edit-menu-item') {
      const { itemId, name, price, categoryName, isVeg, description, imageUrl } = body;
      const existingItem = await prisma.menuItem.findUnique({ where: { id: String(itemId).slice(0, 60) } });
      if (!existingItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      if (existingItem.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Unauthorized to edit this item' }, { status: 403 });
      }

      let validPrice = existingItem.price;
      if (price !== undefined) {
        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice < 0 || numPrice > 100000) {
          return NextResponse.json({ error: 'Valid item price required (₹0 to ₹1,00,000)' }, { status: 400 });
        }
        validPrice = numPrice;
      }

      let categoryId = existingItem.categoryId;
      if (categoryName) {
        const cleanCatName = String(categoryName).slice(0, 50).trim();
        let category = await prisma.category.findFirst({
          where: { cafeId: targetCafeId, name: cleanCatName },
        });
        if (!category) {
          category = await prisma.category.create({
            data: { cafeId: targetCafeId, name: cleanCatName, sortOrder: 10 },
          });
        }
        categoryId = category.id;
      }

      const updated = await prisma.menuItem.update({
        where: { id: existingItem.id },
        data: {
          name: name !== undefined ? String(name).slice(0, 100).trim() : existingItem.name,
          price: validPrice,
          categoryId,
          isVeg: isVeg !== undefined ? isVeg : existingItem.isVeg,
          description: description !== undefined ? String(description).slice(0, 300).trim() : existingItem.description,
          imageUrl: imageUrl !== undefined ? String(imageUrl).slice(0, 500).trim() : existingItem.imageUrl,
        },
        include: { category: true },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    // Delete Menu Item
    if (action === 'delete-menu-item') {
      const { itemId } = body;
      const item = await prisma.menuItem.findUnique({ where: { id: String(itemId).slice(0, 60) } });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      if (item.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Unauthorized to delete this item' }, { status: 403 });
      }

      // Detach from past order items to prevent Foreign Key constraint crash (P2003)
      await prisma.orderItem.updateMany({
        where: { menuItemId: item.id },
        data: { menuItemId: null },
      });

      await prisma.menuItem.delete({ where: { id: item.id } });
      return NextResponse.json({ success: true });
    }

    // 4. Toggle Stock Status (86 Item)
    if (action === 'toggle-stock') {
      const { itemId } = body;
      const item = await prisma.menuItem.findUnique({ where: { id: String(itemId).slice(0, 60) } });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

      if (item.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Unauthorized to modify this item' }, { status: 403 });
      }

      const updated = await prisma.menuItem.update({
        where: { id: item.id },
        data: { inStock: !item.inStock },
      });

      return NextResponse.json({ success: true, item: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: 'Failed to process admin action' }, { status: 500 });
  }
}
