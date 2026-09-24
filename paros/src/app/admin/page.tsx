'use client';

import { useState } from 'react';
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

  // Expense form
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('INGREDIENTS');
  const [expensePaidVia, setExpensePaidVia] = useState('DRAWER_CASH');

  // Cash shift closure form
  const [countedCash, setCountedCash] = useState('3130');

  // Live Expenses State
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: 'e1',
      title: 'Emergency Fresh Full-Cream Milk (10L)',
      amount: 340,
      category: 'Ingredients',
      paidVia: 'Drawer Cash',
      time: '09:42 AM',
    },
    {
      id: 'e2',
      title: 'Clear Ice Bags for Cold Brew (20kg)',
      amount: 220,
      category: 'Ingredients',
      paidVia: 'Drawer Cash',
      time: '11:15 AM',
    },
    {
      id: 'e3',
      title: 'Biodegradable Takeaway Coffee Cups (200 pcs)',
      amount: 850,
      category: 'Packaging',
      paidVia: 'UPI VPA',
      time: '01:30 PM',
    },
  ]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Handle Log Expense
  async function handleLogExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;

    const newExpense: ExpenseItem = {
      id: `e-${Date.now()}`,
      title: expenseTitle,
      amount: Number(expenseAmount),
      category: expenseCategory,
      paidVia: expensePaidVia === 'DRAWER_CASH' ? 'Drawer Cash' : 'UPI',
      time: 'Just now',
    };

    setExpenses([newExpense, ...expenses]);
    setIsExpenseModalOpen(false);
    showToast(`✓ Logged ₹${expenseAmount} (${expenseTitle}) to shift expenses`);

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

  // Handle Day-End Cash Reconciliation
  function handleReconcileShift(e: React.FormEvent) {
    e.preventDefault();
    const expected = 3130;
    const counted = Number(countedCash);
    const diff = counted - expected;

    setIsShiftModalOpen(false);
    showToast(
      diff === 0
        ? '✓ Day-End Z-Report Generated! Cash is PENNY-PERFECT (₹0 discrepancy).'
        : `⚠️ Cash Reconciled with ${diff > 0 ? '+' : ''}₹${diff} discrepancy. Recorded in Audit Log.`
    );
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
                Artisan Roastery, Indiranagar
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
            <button
              onClick={() => showToast('VIP CRM: 154 loyalty guests loaded')}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso text-left"
            >
              <span className="material-symbols-outlined text-[20px]">group</span>
              <span>Guests & Retention CRM</span>
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
              Executive Financial Control Room
            </span>
            <span className="px-2 py-0.5 rounded-full bg-paros-mint border border-espresso font-display text-[10px] font-black uppercase text-espresso flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-paros-matcha animate-pulse" />
              Live Shift 2 Active
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
              onClick={() => showToast('📊 Exporting GST Sales & Expense CSV report...')}
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
                    +14.2% vs Yest
                  </span>
                </div>
                <p className="font-display text-4xl font-black text-espresso tabular-nums">₹34,850</p>
                <p className="font-body text-xs text-espresso/60 mt-1">vs ₹30,510 yesterday</p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-dashed border-espresso/15 flex justify-between font-display text-xs font-bold text-espresso/70">
                <span>78 Completed Tickets</span>
                <span>Avg: ₹446.80</span>
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
                <p className="font-display text-4xl font-black text-espresso tabular-nums">₹5,400</p>
                <p className="font-body text-xs text-espresso/60 mt-1">₹6,200 cash − ₹800 petty expenses</p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-dashed border-espresso/15 flex justify-between font-display text-xs font-bold text-espresso/70">
                <span>Drawer Lock: Active</span>
                <span className="text-paros-matcha">Float ₹2,000 intact</span>
              </div>
            </div>

            {/* Card 3: Online & UPI Collections */}
            <div className="bg-white rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-paros-matcha" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs uppercase font-bold text-espresso/70">Online & UPI Collections</span>
                  <span className="px-2 py-0.5 bg-paros-yellow text-espresso font-display text-[10px] font-black rounded-full border border-espresso">
                    82% Share
                  </span>
                </div>
                <p className="font-display text-4xl font-black text-espresso tabular-nums">₹28,650</p>
                <p className="font-body text-xs text-espresso/60 mt-1">UPI: ₹24,150 • Cards: ₹4,500</p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-dashed border-espresso/15 flex justify-between font-display text-xs font-bold text-espresso/70">
                <span className="text-paros-matcha">0% Surcharge Direct UPI</span>
                <span>0 pending</span>
              </div>
            </div>

            {/* Card 4: True Net Cash Flow */}
            <div className="bg-white rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs uppercase font-bold text-espresso/70">Net Cash Flow (After Exps)</span>
                  <span className="px-2 py-0.5 bg-paros-mint text-espresso font-display text-[10px] font-black rounded-full border border-espresso">
                    86.8% Margin
                  </span>
                </div>
                <p className="font-display text-4xl font-black text-paros-matcha tabular-nums">₹30,250</p>
                <p className="font-body text-xs text-espresso/60 mt-1">₹34,850 sales − ₹4,600 total exps</p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-dashed border-espresso/15">
                <div className="w-full bg-paros-cream h-2 rounded-full border border-espresso overflow-hidden flex">
                  <div className="bg-paros-matcha h-full" style={{ width: '86.8%' }} />
                  <div className="bg-red-400 h-full" style={{ width: '13.2%' }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] font-display font-bold text-espresso/60">
                  <span>₹30,250 Retained</span>
                  <span className="text-red-600">₹4,600 Burn</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ TWO-COLUMN CHARTS & EXPENSES SECTION ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Sales Velocity & Top Items */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Hourly Velocity Chart */}
              <div className="bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal">
                <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-dashed border-espresso/15">
                  <div>
                    <h3 className="font-display text-base font-black text-espresso">
                      Hourly Sales Velocity & Table Turns
                    </h3>
                    <p className="font-body text-xs text-espresso/60">
                      Peak morning crowd 08:00 AM – 11:30 AM
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-paros-yellow rounded-lg border border-espresso font-display text-xs font-black">
                    Peak: ₹6,420 @ 10:00 AM
                  </span>
                </div>

                {/* Simulated Bar Graph */}
                <div className="h-44 flex items-end gap-2 sm:gap-4 pt-6 px-2 justify-between">
                  {[
                    { hour: '08 AM', val: 40, amt: '₹2.8k' },
                    { hour: '09 AM', val: 75, amt: '₹5.2k' },
                    { hour: '10 AM', val: 95, amt: '₹6.4k', peak: true },
                    { hour: '11 AM', val: 80, amt: '₹5.6k' },
                    { hour: '12 PM', val: 60, amt: '₹4.1k' },
                    { hour: '01 PM', val: 50, amt: '₹3.5k' },
                    { hour: '02 PM', val: 35, amt: '₹2.4k' },
                    { hour: '03 PM', val: 45, amt: '₹3.1k' },
                    { hour: '04 PM', val: 70, amt: '₹4.8k' },
                  ].map((b) => (
                    <div key={b.hour} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] font-mono font-bold text-espresso/70 opacity-0 group-hover:opacity-100 transition-opacity">
                        {b.amt}
                      </span>
                      <div
                        className={`w-full rounded-t-lg border-2 border-espresso transition-all duration-300 ${
                          b.peak
                            ? 'bg-paros-orange shadow-brutal-sm'
                            : 'bg-paros-yellow hover:bg-paros-orange/70'
                        }`}
                        style={{ height: `${b.val}%` }}
                      />
                      <span className="font-mono text-[10px] font-bold text-espresso/70 mt-1">
                        {b.hour}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Selling Leaderboard */}
              <div className="bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal">
                <h3 className="font-display text-base font-black text-espresso mb-3">
                  Top Performing Menu Items (By Revenue Contribution)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'Flat White (Oat)', sold: '42 cups', rev: '₹10,920', icon: '☕', pct: '31% of coffee' },
                    { name: 'French Butter Croissant', sold: '38 baked', rev: '₹6,840', icon: '🥐', pct: '48% of bakery' },
                    { name: 'Specialty Pour Over', sold: '24 brews', rev: '₹6,240', icon: '🫘', pct: '18% of coffee' },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="p-3.5 rounded-xl bg-paros-cream border-2 border-espresso shadow-brutal-sm flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-xs font-mono font-black text-paros-orange">{item.rev}</span>
                      </div>
                      <div>
                        <p className="font-display font-bold text-xs text-espresso">{item.name}</p>
                        <p className="font-mono text-[10px] text-espresso/60">{item.sold} • {item.pct}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Live Expense Manager */}
            <div className="flex flex-col gap-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-dashed border-espresso/15">
                  <div>
                    <h3 className="font-display text-base font-black text-espresso">
                      Petty Expenses Log
                    </h3>
                    <p className="font-body text-xs text-espresso/60">Shift drawer cash deductions</p>
                  </div>
                  <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="p-1.5 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>

                {/* Expense List */}
                <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[380px] pr-1 flex-1">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 rounded-xl bg-paros-cream border border-espresso flex items-start justify-between gap-2 shadow-sm"
                    >
                      <div>
                        <p className="font-display font-bold text-xs text-espresso leading-snug">
                          {exp.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-espresso/60">
                          <span className="px-1.5 py-0.2 rounded bg-white border border-espresso font-bold">
                            {exp.category}
                          </span>
                          <span>•</span>
                          <span>{exp.paidVia}</span>
                          <span>•</span>
                          <span>{exp.time}</span>
                        </div>
                      </div>
                      <span className="font-display font-black text-sm text-red-600 tabular-nums">
                        -₹{exp.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t-2 border-espresso flex justify-between items-center font-display">
                  <span className="text-xs font-bold text-espresso/70">Total Shift Expenses:</span>
                  <span className="text-lg font-black text-red-600 tabular-nums">
                    -₹{expenses.reduce((s, e) => s + e.amount, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modal: Log Expense ── */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-espresso/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <h3 className="font-display text-lg font-black text-espresso">Log Petty Expense</h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs"
              >
                ✕
              </button>
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
                  <span>+₹2,000.00</span>
                </div>
                <div className="flex justify-between text-espresso/70">
                  <span>Cash Sales Today</span>
                  <span>+₹1,470.00</span>
                </div>
                <div className="flex justify-between text-espresso/70">
                  <span>Petty Cash Expenses</span>
                  <span className="text-red-600">-₹340.00</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-dashed border-espresso font-display font-black text-sm text-espresso">
                  <span>Expected Cash in Till:</span>
                  <span className="text-paros-orange text-base tabular-nums">₹3,130.00</span>
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
                Discrepancy: ₹{Number(countedCash) - 3130} (
                {Number(countedCash) - 3130 === 0 ? '✓ Balanced' : 'Variance Detected'})
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
