import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';
import { sendNightlySalesReportEmail, isValidEmail } from '@/lib/brevo';

function timingSafeCheck(input: string | null | undefined, secret: string): boolean {
  if (!input || !secret) return false;
  const bufInput = Buffer.from(input);
  const bufSecret = Buffer.from(secret);
  if (bufInput.length !== bufSecret.length) return false;
  return crypto.timingSafeEqual(bufInput, bufSecret);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const previewOnly = searchParams.get('preview') === 'true';

    // Strict Authorization Check: Either active operator session or valid CRON_SECRET
    const authHeader = req.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET?.trim();
    const isCronAuthorized = Boolean(cronSecret && timingSafeCheck(authHeader, `Bearer ${cronSecret}`));

    if (!session && !isCronAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Session login or Cron Secret required to access financial audit reports' },
        { status: 401 }
      );
    }

    // Tenant Isolation: Logged-in sessions can only view their own cafe's report
    const targetCafeId = session?.cafeId || (isCronAuthorized ? searchParams.get('cafeId') : null);

    return await generateAndSendNightlyReport({
      targetCafeId,
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
    const authHeader = req.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET?.trim();
    const isCronAuthorized = Boolean(cronSecret && timingSafeCheck(authHeader, `Bearer ${cronSecret}`));

    if (!session && !isCronAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Session login or Cron Secret required to trigger nightly report' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { cafeId, date, previewOnly } = body;

    const targetCafeId = session?.cafeId || (isCronAuthorized ? cafeId : null);

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
  // 1. Locate Target Cafe with Tenant Isolation
  let cafe = null;
  if (targetCafeId) {
    cafe = await prisma.tenant.findUnique({ where: { id: String(targetCafeId).slice(0, 60) } });
  }
  if (!cafe) {
    cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
  }

  if (!cafe) {
    return NextResponse.json({ error: 'No active cafe found' }, { status: 404 });
  }

  // 2. Compute Target Date Range with safe date validation
  const parsedDate = dateStr && !isNaN(new Date(dateStr).getTime()) ? new Date(dateStr) : new Date();
  const startOfDay = new Date(parsedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(parsedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const formattedDate = parsedDate.toLocaleDateString('en-IN', {
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
    totalRevenue += Number(b.total || 0);
    totalGst += Number(b.cgst || 0) + Number(b.sgst || 0);

    const mode = (b.paymentMethod || 'UPI').toUpperCase();
    if (mode === 'UPI') upiTotal += Number(b.total || 0);
    else if (mode === 'CASH') cashTotal += Number(b.total || 0);
    else if (mode === 'CARD') cardTotal += Number(b.total || 0);
    else otherTotal += Number(b.total || 0);

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

  const avgTicket = bills.length > 0 ? Math.round((totalRevenue / bills.length) * 100) / 100 : 0;

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

  // 7. Preview Mode
  if (previewOnly) {
    return NextResponse.json({
      preview: true,
      report: reportData,
      recipient: cafe.email,
      status: 'ready_to_send',
    });
  }

  // 8. Dispatch Email via Brevo
  if (!cafe.email || !isValidEmail(cafe.email)) {
    return NextResponse.json(
      { error: `Cafe "${cafe.name}" has no valid owner email address configured for nightly reports` },
      { status: 400 }
    );
  }

  const emailResult = await sendNightlySalesReportEmail(reportData);

  return NextResponse.json({
    success: emailResult.success,
    messageId: emailResult.messageId,
    mocked: emailResult.mocked,
    recipient: cafe.email,
    metrics: {
      totalRevenue,
      totalBills: bills.length,
      avgTicket,
      discrepancy: shiftSummary?.discrepancy ?? 0,
    },
  });
}
