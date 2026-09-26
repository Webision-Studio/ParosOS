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
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }

    // Fetch active shift, expenses, bills, and customers
    const [activeShift, expenses, bills, customers, menuItems] = await Promise.all([
      prisma.cashShift.findFirst({
        where: { cafeId: cafe.id, status: 'OPEN' },
        include: { expenses: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.expense.findMany({
        where: { cafeId: cafe.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.bill.findMany({
        where: { cafeId: cafe.id, paymentStatus: 'PAID' },
        orderBy: { createdAt: 'desc' },
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
    ]);

    // Financial totals
    const grossSales = bills.reduce((sum, b) => sum + b.total, 0);
    const upiSales = bills.filter((b) => b.paymentMethod === 'UPI').reduce((sum, b) => sum + b.total, 0);
    const cashSales = bills.filter((b) => b.paymentMethod === 'CASH').reduce((sum, b) => sum + b.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netCashFlow = grossSales - totalExpenses;

    const openingFloat = activeShift?.openingCash || 2000;
    const currentDrawerCash = openingFloat + (activeShift?.cashSales || 0) - (activeShift?.pettyExpenses || 0);

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
        completedTickets: bills.length,
        averageTicket: bills.length > 0 ? Math.round(grossSales / bills.length) : 0,
      },
      activeShift,
      expenses,
      customers,
      menuItems,
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

    let targetCafeId = session?.cafeId || cafeId;
    if (!targetCafeId) {
      const latestCafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      targetCafeId = latestCafe?.id;
    }

    if (!targetCafeId) {
      return NextResponse.json({ error: 'Cafe ID required' }, { status: 400 });
    }

    // 1. Log Expense
    if (action === 'log-expense') {
      const { title, amount, category, paidVia, receiptNote } = body;
      const activeShift = await prisma.cashShift.findFirst({
        where: { cafeId: targetCafeId, status: 'OPEN' },
      });

      const expense = await prisma.expense.create({
        data: {
          cafeId: targetCafeId,
          shiftId: activeShift?.id || null,
          title: title || 'Store Expense',
          amount: Number(amount),
          category: category || 'INGREDIENTS',
          paidVia: paidVia || 'DRAWER_CASH',
          receiptNote: receiptNote || null,
        },
      });

      if (activeShift && paidVia === 'DRAWER_CASH') {
        const updatedExpenses = activeShift.pettyExpenses + Number(amount);
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
      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
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

      await prisma.expense.delete({ where: { id: expenseId } });

      return NextResponse.json({ success: true, deletedId: expenseId });
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

      const counted = Number(countedCash);
      const discrepancy = counted - activeShift.expectedCash;

      const closed = await prisma.cashShift.update({
        where: { id: activeShift.id },
        data: {
          status: 'CLOSED',
          countedCash: counted,
          discrepancy,
          closedAt: new Date(),
          notes: notes || `Shift closed by owner. Discrepancy: ₹${discrepancy}`,
        },
      });

      return NextResponse.json({ success: true, shift: closed });
    }

    // 3. Add Menu Item
    if (action === 'add-menu-item') {
      const { name, price, categoryName, isVeg, description } = body;
      let category = await prisma.category.findFirst({
        where: { cafeId: targetCafeId, name: categoryName || 'Specials' },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            cafeId: targetCafeId,
            name: categoryName || 'Specials',
            sortOrder: 10,
          },
        });
      }

      const menuItem = await prisma.menuItem.create({
        data: {
          cafeId: targetCafeId,
          categoryId: category.id,
          name,
          price: Number(price),
          isVeg: isVeg !== false,
          description: description || 'Specialty creation',
          inStock: true,
          prepTimeMinutes: 5,
        },
        include: { category: true },
      });

      return NextResponse.json({ success: true, menuItem });
    }

    // 4. Toggle Stock Status (86 Item)
    if (action === 'toggle-stock') {
      const { itemId } = body;
      const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

      const updated = await prisma.menuItem.update({
        where: { id: itemId },
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
