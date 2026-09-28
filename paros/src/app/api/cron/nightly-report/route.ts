import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNightlySalesReportEmail } from '@/lib/brevo';

/**
 * Automated Cron Endpoint for Nightly Sales Reports
 * Triggered nightly (e.g. by Vercel Cron, GitHub Actions, or local scheduler).
 * Protected by CRON_SECRET authorization header.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify Authorization if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(req.url);
      const queryKey = url.searchParams.get('key');
      if (queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
      }
    }

    // Find all active cafes
    const cafes = await prisma.tenant.findMany({
      where: {
        email: { not: null },
      },
    });

    const targetDate = new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const formattedDate = targetDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const results: Array<{ cafeId: string; cafeName: string; email: string | null; success: boolean }> = [];

    for (const cafe of cafes) {
      if (!cafe.email) continue;

      const [bills, expenses, latestShift] = await Promise.all([
        prisma.bill.findMany({
          where: { cafeId: cafe.id, createdAt: { gte: startOfDay, lte: endOfDay } },
          include: { order: { include: { items: true } } },
        }),
        prisma.expense.findMany({
          where: { cafeId: cafe.id, createdAt: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.cashShift.findFirst({
          where: { cafeId: cafe.id, openedAt: { gte: startOfDay } },
          include: { user: true },
          orderBy: { openedAt: 'desc' },
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

      const shiftSummary = latestShift
        ? {
            openingCash: latestShift.openingCash,
            cashSales: latestShift.cashSales,
            pettyExpenses: latestShift.pettyExpenses,
            expectedCash: latestShift.expectedCash,
            countedCash: latestShift.countedCash ?? latestShift.expectedCash,
            discrepancy: latestShift.discrepancy ?? 0,
            notes: latestShift.notes,
            operatorName: latestShift.user?.name || 'Primary Cashier',
          }
        : null;

      const reportData = {
        cafe: {
          id: cafe.id,
          name: cafe.name,
          email: cafe.email,
          phone: cafe.phone,
          address: cafe.address,
        },
        date: formattedDate,
        totalRevenue,
        totalBills: bills.length,
        avgTicket: bills.length > 0 ? Math.round((totalRevenue / bills.length) * 100) / 100 : 0,
        totalGst,
        paymentBreakdown: {
          upi: upiTotal,
          cash: cashTotal,
          card: cardTotal,
          other: otherTotal,
        },
        shiftSummary,
        expenses: expenses.map((e) => ({
          title: e.title,
          amount: e.amount,
          category: e.category,
          paidVia: e.paidVia,
        })),
        topItems,
      };

      const dispatchRes = await sendNightlySalesReportEmail(reportData);
      results.push({
        cafeId: cafe.id,
        cafeName: cafe.name,
        email: cafe.email,
        success: dispatchRes.success,
      });
    }

    return NextResponse.json({
      success: true,
      processedCafes: results.length,
      results,
    });
  } catch (error) {
    console.error('Automated Cron Nightly Report Error:', error);
    return NextResponse.json({ error: 'Failed to process automated cron nightly report' }, { status: 500 });
  }
}
