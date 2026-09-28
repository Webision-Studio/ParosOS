import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';
import { sendNightlySalesReportEmail, isValidEmail } from '@/lib/brevo';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const cafeId = searchParams.get('cafeId') || session?.cafeId;
    const dateStr = searchParams.get('date');
    const previewOnly = searchParams.get('preview') === 'true';

    // Cron Secret Protection (if triggered by external cron scheduler like Vercel Cron)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!session && !isCronAuthorized && !cafeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return await generateAndSendNightlyReport({
      targetCafeId: cafeId,
      dateStr,
      previewOnly,
    });
  } catch (error) {
    console.error('Nightly Report GET error:', error);
    return NextResponse.json({ error: 'Failed to process nightly report' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    const { cafeId, date, previewOnly } = body;

    const targetCafeId = cafeId || session?.cafeId;
    return await generateAndSendNightlyReport({
      targetCafeId,
      dateStr: date,
      previewOnly: Boolean(previewOnly),
    });
  } catch (error) {
    console.error('Nightly Report POST error:', error);
    return NextResponse.json({ error: 'Failed to generate nightly report' }, { status: 500 });
  }
}

interface ReportInput {
  targetCafeId?: string | null;
  dateStr?: string | null;
  previewOnly?: boolean;
}

async function generateAndSendNightlyReport({ targetCafeId, dateStr, previewOnly }: ReportInput) {
  // 1. Locate Target Cafe
  let cafe = null;
  if (targetCafeId) {
    cafe = await prisma.tenant.findUnique({ where: { id: targetCafeId } });
  }
  if (!cafe) {
    cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
  }

  if (!cafe) {
    return NextResponse.json({ error: 'No active cafe found' }, { status: 404 });
  }

  // 2. Compute Target Date Range (Default: Today in IST timezone)
  const targetDate = dateStr ? new Date(dateStr) : new Date();
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

  // 3. Query Today's Bills & Orders
  const bills = await prisma.bill.findMany({
    where: {
      cafeId: cafe.id,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      order: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 4. Query Today's Expenses
  const expenses = await prisma.expense.findMany({
    where: {
      cafeId: cafe.id,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 5. Query Today's Shift (latest closed or active)
  const latestShift = await prisma.cashShift.findFirst({
    where: {
      cafeId: cafe.id,
      openedAt: {
        gte: startOfDay,
      },
    },
    include: { user: true },
    orderBy: { openedAt: 'desc' },
  });

  // 6. Aggregate Financial Metrics
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

    // Aggregate items sold
    if (b.order?.items) {
      for (const it of b.order.items) {
        const existing = itemCounts.get(it.name) || { quantity: 0, revenue: 0 };
        existing.quantity += it.quantity;
        existing.revenue += it.price * it.quantity;
        itemCounts.set(it.name, existing);
      }
    }
  }

  const totalBills = bills.length;
  const avgTicket = totalBills > 0 ? Math.round((totalRevenue / totalBills) * 100) / 100 : 0;

  // Sort Top Selling Items
  const topItems = Array.from(itemCounts.entries())
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Shift & Discrepancy Breakdown
  const shiftSummary = latestShift
    ? {
        openingCash: latestShift.openingCash,
        cashSales: latestShift.cashSales,
        pettyExpenses: latestShift.pettyExpenses,
        expectedCash: latestShift.expectedCash,
        countedCash: latestShift.countedCash ?? latestShift.expectedCash,
        discrepancy: latestShift.discrepancy ?? (latestShift.countedCash !== null ? latestShift.countedCash - latestShift.expectedCash : 0),
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
    totalBills,
    avgTicket,
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

  // 7. If previewOnly requested, return JSON without sending email
  if (previewOnly) {
    return NextResponse.json({
      success: true,
      preview: true,
      report: reportData,
    });
  }

  // 8. Dispatch Email via Brevo
  const emailResult = await sendNightlySalesReportEmail(reportData);

  return NextResponse.json({
    success: true,
    emailResult,
    report: reportData,
  });
}
