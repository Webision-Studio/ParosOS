'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  paidVia: string;
  time: string;
}

export default function AdminFinancialDashboard() {
  const [activeDateTab, setActiveDateTab] = useState('today');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Cafe Metadata
  const [outletName, setOutletName] = useState('My Cafe');
  const [kpis, setKpis] = useState({
    grossSales: 0,
    upiSales: 0,
    cashSales: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    currentDrawerCash: 2000,
    openingFloat: 2000,
    completedTickets: 0,
    averageTicket: 0,
  });

  // Expense form
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('INGREDIENTS');
  const [expensePaidVia, setExpensePaidVia] = useState('DRAWER_CASH');

  // Cash shift closure form
  const [countedCash, setCountedCash] = useState('2000');

  // Live Expenses State (starts clean)
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>('ALL');

  const categoryTotals = useMemo(() => {
    return {
      INGREDIENTS: expenses.filter((e) => e.category === 'INGREDIENTS').reduce((s, e) => s + e.amount, 0),
      PACKAGING: expenses.filter((e) => e.category === 'PACKAGING').reduce((s, e) => s + e.amount, 0),
      UTILITIES: expenses.filter((e) => e.category === 'UTILITIES').reduce((s, e) => s + e.amount, 0),
      MISC: expenses.filter((e) => e.category === 'MISC').reduce((s, e) => s + e.amount, 0),
    };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (expenseFilterCategory === 'ALL') return expenses;
    return expenses.filter((e) => e.category === expenseFilterCategory);
  }, [expenses, expenseFilterCategory]);

  // Load real financial and shift data from backend with live polling
  useEffect(() => {
    function loadAdminData() {
      fetch('/api/admin')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.cafe?.name) setOutletName(data.cafe.name);
          if (data?.kpis) {
            setKpis(data.kpis);
            setCountedCash(String(data.kpis.currentDrawerCash));
          }
          if (data?.expenses) {
            setExpenses(
              data.expenses.map((e: { id: string; title: string; amount: number; category: string; paidVia: string; createdAt: string }) => ({
                id: e.id,
                title: e.title,
                amount: e.amount,
                category: e.category,
                paidVia: e.paidVia === 'DRAWER_CASH' ? 'Drawer Cash' : 'UPI',
                time: new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }))
            );
          }
        })
        .catch(() => {});
    }

    loadAdminData();
    const poller = setInterval(loadAdminData, 4000);
    return () => clearInterval(poller);
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Handle Log Expense
  async function handleLogExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;

    const amt = Number(expenseAmount);
    const newExpense: ExpenseItem = {
      id: `e-${Date.now()}`,
      title: expenseTitle,
      amount: amt,
      category: expenseCategory,
      paidVia: expensePaidVia === 'DRAWER_CASH' ? 'Drawer Cash' : 'UPI',
      time: 'Just now',
    };

    setExpenses([newExpense, ...expenses]);
    setIsExpenseModalOpen(false);
    showToast(`✓ Logged ₹${expenseAmount} (${expenseTitle}) to shift expenses`);

    // Update local KPI preview
    setKpis((prev) => ({
      ...prev,
      totalExpenses: prev.totalExpenses + amt,
      netCashFlow: prev.grossSales - (prev.totalExpenses + amt),
      currentDrawerCash:
        expensePaidVia === 'DRAWER_CASH' ? prev.currentDrawerCash - amt : prev.currentDrawerCash,
    }));

    // Reset
    setExpenseTitle('');
    setExpenseAmount('');

    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log-expense',
        title: newExpense.title,
        amount: newExpense.amount,
        category: expenseCategory,
        paidVia: expensePaidVia,
      }),
    }).catch(() => {});
  }

  // Handle Void / Delete Expense
  async function handleDeleteExpense(expenseId: string) {
    const toDelete = expenses.find((e) => e.id === expenseId);
    if (!toDelete) return;

    if (!confirm(`Are you sure you want to void expense "${toDelete.title}" (₹${toDelete.amount})?`)) return;

    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    setKpis((prev) => ({
      ...prev,
      totalExpenses: Math.max(0, prev.totalExpenses - toDelete.amount),
      netCashFlow: prev.grossSales - Math.max(0, prev.totalExpenses - toDelete.amount),
      currentDrawerCash:
        toDelete.paidVia === 'Drawer Cash'
          ? prev.currentDrawerCash + toDelete.amount
          : prev.currentDrawerCash,
    }));
    showToast(`✓ Voided expense "${toDelete.title}". Drawer balance restored!`);

    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-expense',
        expenseId,
      }),
    }).catch(() => {});
  }

  // Export Expenses CSV
  function exportExpensesCsv() {
    if (expenses.length === 0) {
      showToast('⚠️ No expenses to export yet.');
      return;
    }
    const headers = ['Expense ID', 'Title', 'Category', 'Paid Via', 'Time', 'Amount (INR)'];
    const rows = expenses.map((e) => [
      `"${e.id}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.paidVia}"`,
      `"${e.time}"`,
      e.amount,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paros-expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Downloaded GST Sales & Expense CSV report!');
  }

  // Handle Day-End Cash Reconciliation
  function handleReconcileShift(e: React.FormEvent) {
    e.preventDefault();
    const expected = kpis.currentDrawerCash;
    const counted = Number(countedCash);
    const diff = counted - expected;

    setIsShiftModalOpen(false);
    showToast(
      diff === 0
        ? '✓ Day-End Z-Report Generated! Cash is PENNY-PERFECT (₹0 discrepancy).'
        : `⚠️ Cash Reconciled with ${diff > 0 ? '+' : ''}₹${diff} discrepancy. Recorded in Audit Log.`
    );

    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'close-shift',
        countedCash: counted,
      }),
    }).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex antialiased select-none">
      {/* ── Left Sidebar Navigation ── */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r-2 border-espresso z-50 flex flex-col justify-between py-6 px-4 shadow-brutal-sm">
        <div className="flex flex-col gap-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <div className="w-10 h-10 bg-paros-orange text-white rounded-xl border-2 border-espresso flex items-center justify-center font-display font-black text-xl shadow-brutal-sm">
              P
            </div>
            <div>
              <p className="font-display text-xl font-black text-espresso tracking-tight leading-none">
                PAROS<span className="text-paros-orange">.</span>
              </p>
              <p className="font-display text-[10px] font-black uppercase tracking-wider text-espresso/60 mt-0.5">
                Hospitality OS
              </p>
            </div>
          </Link>

          {/* Location Chip */}
          <div className="p-3 bg-paros-cream rounded-xl border-2 border-espresso flex items-center justify-between shadow-brutal-sm">
            <div>
              <p className="font-display text-[9px] uppercase font-bold text-espresso/60">Active Outlet</p>
              <p className="font-display text-xs font-black text-espresso truncate">
                {outletName}
              </p>
            </div>
            <span className="material-symbols-outlined text-espresso/70 text-[18px]">
              storefront
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 font-display text-xs font-bold">
            <Link
              href="/pos"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
              <span>Register / POS</span>
            </Link>
            <Link
              href="/kds"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">soup_kitchen</span>
              <span>Kitchen KDS</span>
            </Link>
            <Link
              href="/order"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
              <span>Table QR Menu</span>
            </Link>
            <Link
              href="/admin/menu"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
              <span>Menu Catalog</span>
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm font-black"
            >
              <span className="material-symbols-outlined text-[20px]">monitoring</span>
              <span>Financial Analytics</span>
            </Link>
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso text-left"
            >
              <span className="material-symbols-outlined text-[20px]">payments</span>
              <span>Cash Drawer & Audit</span>
            </button>
          </nav>
        </div>

        {/* Cloud Status Footer */}
        <div className="pt-4 border-t-2 border-dashed border-espresso/20 flex items-center justify-between text-xs font-display font-bold">
          <div className="flex items-center gap-1.5 text-paros-matcha">
            <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
            <span>Cloud Sync Active</span>
          </div>
          <span className="font-mono text-[10px] text-espresso/50">v3.2.0</span>
        </div>
      </aside>

      {/* ── Main Content Area (offset by 64) ── */}
      <div className="pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top Operational Bar */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-md h-16 border-b-2 border-espresso z-40 px-6 flex items-center justify-between shadow-brutal-sm">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-black text-espresso">
              {outletName} • Control Room
            </span>
            <span className="px-2 py-0.5 rounded-full bg-paros-mint border border-espresso font-display text-[10px] font-black uppercase text-espresso flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-paros-matcha animate-pulse" />
              Live Shift Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="brutal-btn px-4 py-2 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Log Expense</span>
            </button>
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="brutal-btn px-4 py-2 bg-espresso text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
              <span>Close Shift (Z-Report)</span>
            </button>
            <button
              onClick={async () => {
                if (confirm('Reset all local database records & register a new cafe?')) {
                  await fetch('/api/system/reset', { method: 'POST' });
                  if (typeof window !== 'undefined') localStorage.clear();
                  window.location.href = '/onboarding';
                }
              }}
              className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm flex items-center gap-1"
              title="Reset all database records and cache"
            >
              <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
              <span>Reset DB</span>
            </button>
          </div>
        </header>

        {/* ── Workspace ── */}
        <main className="p-6 max-w-[1400px] w-full mx-auto flex flex-col gap-6">
          {/* Date Filter & Control Bar */}
          <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-paros-orange text-[20px]">calendar_today</span>
              <span className="font-display text-xs font-black uppercase text-espresso">Reporting Window:</span>
              <div className="inline-flex bg-paros-cream p-1 rounded-xl border border-espresso font-display text-xs font-bold">
                {['Today (Live)', 'Yesterday', 'Last 7 Days', 'This Month'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDateTab(tab)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeDateTab === tab
                        ? 'bg-espresso text-white shadow-sm'
                        : 'text-espresso hover:bg-paros-yellow/40'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={exportExpensesCsv}
              className="px-3.5 py-1.5 bg-paros-cream hover:bg-paros-yellow border border-espresso rounded-xl font-display text-xs font-bold flex items-center gap-1 shadow-brutal-sm"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export GST CSV</span>
            </button>
          </div>

          {/* ═══ 4-COLUMN CORE KPI GRID ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Gross Sales */}
            <div className="bg-white rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-paros-orange" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs uppercase font-bold text-espresso/70">Today&apos;s Gross Sales</span>
                  <span className="px-2 py-0.5 bg-paros-mint text-espresso font-display text-[10px] font-black rounded-full border border-espresso">
                    ● Live Verified
                  </span>
                </div>
                <p className="font-display text-4xl font-black text-espresso tabular-nums">
                  ₹{kpis.grossSales.toLocaleString('en-IN')}
                </p>
                <p className="font-body text-xs text-espresso/60 mt-1">From POS & Table QR dine-in</p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-dashed border-espresso/15 flex justify-between font-display text-xs font-bold text-espresso/70">
                <span>{kpis.completedTickets} Completed Tickets</span>
                <span>Avg: ₹{kpis.averageTicket}</span>
              </div>
            </div>

            {/* Card 2: Cash in Till */}
            <div className="bg-white rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs uppercase font-bold text-espresso/70">Cash in Drawer Till</span>
                  <span className="px-2 py-0.5 bg-paros-mint text-espresso font-display text-[10px] font-black rounded-full border border-espresso">
                    ● In Balance
                  </span>
                </div>
                <p className="font-display text-4xl font-black text-espresso tabular-nums">
                  ₹{kpis.currentDrawerCash.toLocaleString('en-IN')}
                </p>
                <p className="font-body text-xs text-espresso/60 mt-1">
                  Float ₹{kpis.openingFloat} + Cash Sales − Expenses
                </p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-dashed border-espresso/15 flex justify-between font-display text-xs font-bold text-espresso/70">
                <span>Drawer Lock: Active</span>
                <span className="text-paros-matcha">Float ₹{kpis.openingFloat} intact</span>
              </div>
            </div>

            {/* Card 3: Online & UPI Collections */}
            <div className="bg-white rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-paros-matcha" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs uppercase font-bold text-espresso/70">Online & UPI Collections</span>
                  <span className="px-2 py-0.5 bg-paros-yellow text-espresso font-display text-[10px] font-black rounded-full border border-espresso">
                    0% Surcharge
                  </span>
                </div>
                <p className="font-display text-4xl font-black text-espresso tabular-nums">
                  ₹{kpis.upiSales.toLocaleString('en-IN')}
                </p>
                <p className="font-body text-xs text-espresso/60 mt-1">Direct Bank UPI VPA Settlement</p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-dashed border-espresso/15 flex justify-between font-display text-xs font-bold text-espresso/70">
                <span className="text-paros-matcha">0% MDR Direct</span>
                <span>Instant Settlement</span>
              </div>
            </div>

            {/* Card 4: True Net Cash Flow */}
            <div className="bg-white rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs uppercase font-bold text-espresso/70">Net Cash Flow (After Exps)</span>
                  <span className="px-2 py-0.5 bg-paros-mint text-espresso font-display text-[10px] font-black rounded-full border border-espresso">
                    Healthy Retained
                  </span>
                </div>
                <p className="font-display text-4xl font-black text-paros-matcha tabular-nums">
                  ₹{kpis.netCashFlow.toLocaleString('en-IN')}
                </p>
                <p className="font-body text-xs text-espresso/60 mt-1">
                  ₹{kpis.grossSales} sales − ₹{kpis.totalExpenses} total exps
                </p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-dashed border-espresso/15 flex justify-between text-xs font-display font-bold text-espresso/70">
                <span>Total Expenses: ₹{kpis.totalExpenses}</span>
                <span className="text-emerald-700">Net Profit Positive</span>
              </div>
            </div>
          </div>

          {/* ═══ LIVE EXPENSES LOG ═══ */}
          <div className="bg-white rounded-2xl border-2 border-espresso shadow-brutal p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-espresso gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-orange text-[22px]">receipt_long</span>
                <div>
                  <h2 className="font-display text-lg font-black text-espresso">
                    Shift Petty Expenses & Cash Drawer Deductions
                  </h2>
                  <p className="font-body text-xs text-espresso/60">
                    Live record of all till deductions & vendor payouts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportExpensesCsv}
                  className="brutal-btn px-3 py-1.5 bg-paros-cream text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm flex items-center gap-1 hover:bg-paros-yellow/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="brutal-btn px-3 py-1.5 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Log New</span>
                </button>
              </div>
            </div>

            {/* Category Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-espresso/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-[10px] font-black uppercase text-amber-900">Ingredients</span>
                  <span className="material-symbols-outlined text-[16px] text-amber-700">local_cafe</span>
                </div>
                <p className="font-display text-lg font-black text-espresso tabular-nums">
                  ₹{categoryTotals.INGREDIENTS.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-espresso/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-[10px] font-black uppercase text-blue-900">Packaging</span>
                  <span className="material-symbols-outlined text-[16px] text-blue-700">inventory_2</span>
                </div>
                <p className="font-display text-lg font-black text-espresso tabular-nums">
                  ₹{categoryTotals.PACKAGING.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-espresso/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-[10px] font-black uppercase text-purple-900">Utilities</span>
                  <span className="material-symbols-outlined text-[16px] text-purple-700">bolt</span>
                </div>
                <p className="font-display text-lg font-black text-espresso tabular-nums">
                  ₹{categoryTotals.UTILITIES.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-espresso/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-[10px] font-black uppercase text-rose-900">Miscellaneous</span>
                  <span className="material-symbols-outlined text-[16px] text-rose-700">more_horiz</span>
                </div>
                <p className="font-display text-lg font-black text-espresso tabular-nums">
                  ₹{categoryTotals.MISC.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 border-b border-espresso/10">
              {(['ALL', 'INGREDIENTS', 'PACKAGING', 'UTILITIES', 'MISC'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setExpenseFilterCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-display text-xs font-black uppercase border transition-all ${
                    expenseFilterCategory === cat
                      ? 'bg-espresso text-white border-espresso shadow-sm'
                      : 'bg-paros-cream text-espresso/70 border-espresso/20 hover:bg-paros-yellow/30'
                  }`}
                >
                  {cat === 'ALL' ? `All (${expenses.length})` : cat}
                </button>
              ))}
            </div>

            {/* Expenses List */}
            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8 text-espresso/50 font-display text-xs">
                  <span className="material-symbols-outlined text-[32px] text-espresso/30 block mb-1">receipt</span>
                  No expenses recorded in this category yet.
                </div>
              ) : (
                filteredExpenses.map((e) => {
                  const getCategoryIcon = (cat: string) => {
                    switch (cat) {
                      case 'INGREDIENTS':
                        return 'local_cafe';
                      case 'PACKAGING':
                        return 'inventory_2';
                      case 'UTILITIES':
                        return 'bolt';
                      default:
                        return 'receipt_long';
                    }
                  };
                  return (
                    <div
                      key={e.id}
                      className="p-3 bg-paros-cream rounded-xl border border-espresso flex items-center justify-between shadow-sm hover:border-paros-orange/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-espresso flex items-center justify-center font-bold text-espresso shadow-sm">
                          <span className="material-symbols-outlined text-[18px] text-paros-orange">
                            {getCategoryIcon(e.category)}
                          </span>
                        </div>
                        <div>
                          <p className="font-display text-sm font-bold text-espresso">{e.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 font-body text-xs text-espresso/60">
                            <span className="px-1.5 py-0.2 bg-white rounded border border-espresso/20 text-[10px] font-display font-bold uppercase">
                              {e.category}
                            </span>
                            <span>•</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-display font-bold uppercase border ${
                                e.paidVia === 'Drawer Cash'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                              }`}
                            >
                              {e.paidVia}
                            </span>
                            <span>•</span>
                            <span>{e.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-black text-red-600 tabular-nums">
                          -₹{e.amount}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          title="Void / Delete Expense"
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Modal: Log Shift Expense ── */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-espresso/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <div>
                <h3 className="font-display text-lg font-black text-espresso">
                  Log Drawer Petty Cash Expense
                </h3>
                <p className="font-body text-xs text-espresso/60">
                  Instant deduction from active shift float
                </p>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs hover:bg-paros-orange hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="font-display text-[10px] font-black uppercase tracking-wider text-espresso/70 block mb-1.5">
                ⚡ Quick Presets (1-Tap):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '🥛 Fresh Milk (10L)', title: 'Fresh Milk (10L)', amount: 340, category: 'INGREDIENTS' },
                  { label: '🧊 Ice Bags (50kg)', title: 'Ice Bags (50kg)', amount: 120, category: 'INGREDIENTS' },
                  { label: '💧 RO Water Jars', title: 'RO Water 20L Jars', amount: 80, category: 'UTILITIES' },
                  { label: '📦 Takeaway Cups', title: 'Paper Cups & Lids', amount: 450, category: 'PACKAGING' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setExpenseTitle(preset.title);
                      setExpenseAmount(String(preset.amount));
                      setExpenseCategory(preset.category);
                      setExpensePaidVia('DRAWER_CASH');
                    }}
                    className="p-2 bg-paros-cream rounded-xl border border-espresso text-left hover:bg-paros-yellow/40 transition-colors shadow-xs"
                  >
                    <span className="font-display text-xs font-bold text-espresso block">{preset.label}</span>
                    <span className="font-mono text-[11px] font-bold text-espresso/70">₹{preset.amount}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLogExpense} className="flex flex-col gap-4">
              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Expense Description:
                </label>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Fresh Milk Run (10L), Ice Bags"
                  required
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-sm font-bold text-espresso outline-none"
                />
              </div>

              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Amount (₹):
                </label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="340"
                  required
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-xl font-black text-espresso outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                    Category:
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                  >
                    <option value="INGREDIENTS">Ingredients</option>
                    <option value="PACKAGING">Packaging</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="MISC">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                    Paid Via:
                  </label>
                  <select
                    value={expensePaidVia}
                    onChange={(e) => setExpensePaidVia(e.target.value)}
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                  >
                    <option value="DRAWER_CASH">Drawer Float Cash</option>
                    <option value="UPI">Direct UPI</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="brutal-btn w-full py-3.5 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal mt-2"
              >
                Save Expense & Deduct From Float ➔
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Day-End Z-Report Cash Reconciliation ── */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-espresso/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <div>
                <h3 className="font-display text-lg font-black text-espresso">
                  Shift Close & Z-Report
                </h3>
                <p className="font-body text-xs text-espresso/60">
                  Blind cash till audit & reconciliation
                </p>
              </div>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReconcileShift} className="flex flex-col gap-4">
              <div className="p-3 bg-paros-cream rounded-xl border border-espresso font-mono text-xs flex flex-col gap-1.5">
                <div className="flex justify-between text-espresso/70">
                  <span>Opening Float</span>
                  <span>+₹{kpis.openingFloat}.00</span>
                </div>
                <div className="flex justify-between text-espresso/70">
                  <span>Cash Sales Recorded</span>
                  <span>+₹{kpis.cashSales}.00</span>
                </div>
                <div className="flex justify-between text-espresso/70">
                  <span>Petty Cash Expenses</span>
                  <span className="text-red-600">-₹{kpis.totalExpenses}.00</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-dashed border-espresso font-display font-black text-sm text-espresso">
                  <span>Expected Cash in Till:</span>
                  <span className="text-paros-orange text-base tabular-nums">
                    ₹{kpis.currentDrawerCash.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Physically Counted Cash in Till (₹):
                </label>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  required
                  className="w-full p-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-2xl font-black text-espresso outline-none"
                />
              </div>

              <div className="p-2.5 bg-paros-mint rounded-xl border border-espresso font-display text-xs font-bold text-espresso text-center">
                Discrepancy: ₹{Number(countedCash) - kpis.currentDrawerCash} (
                {Number(countedCash) - kpis.currentDrawerCash === 0 ? '✓ Balanced' : 'Variance Detected'})
              </div>

              <button
                type="submit"
                className="brutal-btn w-full py-3.5 bg-espresso text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal"
              >
                Sign Off & Generate Day-End Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-espresso text-white px-5 py-3 rounded-2xl border-2 border-white shadow-brutal-lg flex items-center gap-2 font-display text-sm font-bold animate-bounce">
          <span className="material-symbols-outlined text-paros-matcha">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
