'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string | null;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  source: string;
  status: string;
  aggregatorOrderId?: string | null;
  aggregatorCut?: number;
  netPayout?: number | null;
  table?: { tableNumber: string } | null;
  items: OrderItem[];
}

interface BillRecord {
  id: string;
  billNumber: string;
  subtotal: number;
  discount: number;
  couponCode?: string | null;
  cgst: number;
  sgst: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  processedBy?: string | null;
  createdAt: string;
  order?: OrderRecord | null;
}

interface CafeMeta {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  gstin?: string | null;
  upiId?: string | null;
}

interface KpiSummary {
  totalBills: number;
  totalGross: number;
  cashCollected: number;
  upiCollected: number;
  totalDiscounts: number;
}

export default function AdminBillsPage() {
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [cafe, setCafe] = useState<CafeMeta | null>(null);
  const [kpis, setKpis] = useState<KpiSummary>({
    totalBills: 0,
    totalGross: 0,
    cashCollected: 0,
    upiCollected: 0,
    totalDiscounts: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'UPI'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'POS' | 'QR' | 'TAKEAWAY' | 'SWIGGY' | 'ZOMATO'>('ALL');

  // Modals & Active Receipts
  const [printingBill, setPrintingBill] = useState<BillRecord | null>(null);
  const [whatsAppModalBill, setWhatsAppModalBill] = useState<BillRecord | null>(null);
  const [customPhoneInput, setCustomPhoneInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Fetch Bills from API
  const fetchBills = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (dateFilter) params.set('dateFilter', dateFilter);
    if (paymentFilter !== 'ALL') params.set('paymentMethod', paymentFilter);
    if (sourceFilter !== 'ALL') params.set('source', sourceFilter);

    fetch(`/api/admin/bills?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.cafe) setCafe(data.cafe);
          if (data.bills) setBills(data.bills);
          if (data.kpis) setKpis(data.kpis);
        }
      })
      .catch((err) => console.error('Error fetching bills:', err))
      .finally(() => setLoading(false));
  }, [debouncedQuery, dateFilter, paymentFilter, sourceFilter]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Export CSV with Formula Injection Defense (CWE-1236)
  function exportBillsCsv() {
    if (bills.length === 0) {
      showToast('⚠️ No bills to export.');
      return;
    }

    const sanitizeCsvCell = (val: any) => {
      const trimmed = String(val ?? '');
      if (/^[=+\-@\t\r]/.test(trimmed)) {
        return `'${trimmed}`.replace(/"/g, '""');
      }
      return trimmed.replace(/"/g, '""');
    };

    const headers = [
      'Bill Number',
      'Order Number',
      'Date & Time',
      'Channel',
      'Customer Name',
      'Customer Phone',
      'Items Count',
      'Subtotal',
      'Discount',
      'Coupon Code',
      'CGST (2.5%)',
      'SGST (2.5%)',
      'Grand Total',
      'Payment Method',
      'Cashier',
    ];

    const rows = bills.map((b) => [
      `"${sanitizeCsvCell(b.billNumber)}"`,
      `"${sanitizeCsvCell(b.order?.orderNumber || 'N/A')}"`,
      `"${sanitizeCsvCell(new Date(b.createdAt).toLocaleString('en-IN'))}"`,
      `"${sanitizeCsvCell(b.order?.source || 'POS')}"`,
      `"${sanitizeCsvCell(b.customerName || 'Walk-in Guest')}"`,
      `"${sanitizeCsvCell(b.customerPhone || 'N/A')}"`,
      b.order?.items?.reduce((acc, i) => acc + i.quantity, 0) || 0,
      b.subtotal,
      b.discount,
      `"${sanitizeCsvCell(b.couponCode || '')}"`,
      b.cgst,
      b.sgst,
      b.total,
      `"${sanitizeCsvCell(b.paymentMethod)}"`,
      `"${sanitizeCsvCell(b.processedBy || 'Staff')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paros-bills-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported bills & tax invoices to CSV!');
  }

  // Construct WhatsApp Receipt message and launch wa.me
  function handleSendWhatsApp(bill: BillRecord, targetPhone?: string) {
    const rawPhone = targetPhone || bill.customerPhone;
    if (!rawPhone) {
      setWhatsAppModalBill(bill);
      setCustomPhoneInput('');
      return;
    }

    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const normalizedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const cafeName = cafe?.name || 'Artisan Cafe';
    const itemsList =
      bill.order?.items?.map((i) => `• ${i.quantity}x ${i.name} — ₹${(i.price * i.quantity).toFixed(0)}`).join('\n') ||
      '• Order Items';

    const discountText = bill.discount > 0 ? `\nDiscount${bill.couponCode ? ` (${bill.couponCode})` : ''}: -₹${bill.discount.toFixed(2)}` : '';

    const text = encodeURIComponent(
      `🧾 *TAX INVOICE — ${cafeName}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*Bill No:* ${bill.billNumber}\n` +
      `*Date:* ${new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n` +
      `*Channel:* ${bill.order?.source || 'POS'}${bill.order?.table?.tableNumber ? ` (Table ${bill.order.table.tableNumber})` : ''}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${itemsList}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Subtotal: ₹${bill.subtotal.toFixed(2)}` +
      `${discountText}\n` +
      `CGST (2.5%): ₹${bill.cgst.toFixed(2)}\n` +
      `SGST (2.5%): ₹${bill.sgst.toFixed(2)}\n` +
      `*Grand Total: ₹${bill.total.toFixed(2)}*\n` +
      `*Payment:* ${bill.paymentMethod} (PAID)\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for dining with us! 🙏✨`
    );

    window.open(`https://wa.me/${normalizedPhone}?text=${text}`, '_blank');
    showToast(`📲 Opening WhatsApp receipt for ${normalizedPhone}`);
    setWhatsAppModalBill(null);
  }

  // Trigger Print Slip
  function handlePrintReceipt(bill: BillRecord) {
    setPrintingBill(bill);
    setTimeout(() => {
      window.print();
    }, 250);
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex antialiased select-none">
      {/* ── Thermal Receipt Dedicated Print Area (80mm) ── */}
      {printingBill && (
        <div id="thermal-receipt-print-area" className="hidden print:block font-mono text-[12px] leading-tight text-black p-2 max-w-[80mm] mx-auto bg-white">
          <div className="text-center pb-2 border-b border-dashed border-black">
            <h1 className="font-bold text-base uppercase tracking-tight">{cafe?.name || 'PAROS CAFE'}</h1>
            {cafe?.address && <p className="text-[10px] mt-0.5">{cafe.address}, {cafe.city || ''}</p>}
            {cafe?.phone && <p className="text-[10px]">Tel: {cafe.phone}</p>}
            {cafe?.gstin && <p className="text-[10px] font-bold">GSTIN: {cafe.gstin}</p>}
          </div>

          <div className="py-2 border-b border-dashed border-black text-[11px] flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span>Bill No: {printingBill.billNumber}</span>
              <span>{printingBill.order?.orderNumber || ''}</span>
            </div>
            <div className="flex justify-between">
              <span>Date: {new Date(printingBill.createdAt).toLocaleDateString('en-IN')}</span>
              <span>{new Date(printingBill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode: {printingBill.order?.source || 'POS'}</span>
              <span>{printingBill.order?.table?.tableNumber ? `Table: ${printingBill.order.table.tableNumber}` : 'Counter'}</span>
            </div>
            {printingBill.customerName && (
              <div className="flex justify-between text-[10px]">
                <span>Cust: {printingBill.customerName}</span>
                <span>{printingBill.customerPhone || ''}</span>
              </div>
            )}
            <div className="text-[10px]">Cashier: {printingBill.processedBy || 'Staff'}</div>
          </div>

          <div className="py-2 border-b border-dashed border-black text-[11px]">
            <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[10px] uppercase">
              <span className="w-1/2">Item</span>
              <span className="w-1/6 text-center">Qty</span>
              <span className="w-1/3 text-right">Amt (₹)</span>
            </div>
            {printingBill.order?.items?.map((item) => (
              <div key={item.id} className="flex justify-between py-0.5">
                <span className="w-1/2 truncate">{item.name}</span>
                <span className="w-1/6 text-center">{item.quantity}</span>
                <span className="w-1/3 text-right">{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="py-2 border-b border-dashed border-black text-[11px] flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{printingBill.subtotal.toFixed(2)}</span>
            </div>
            {printingBill.discount > 0 && (
              <div className="flex justify-between font-bold">
                <span>Discount {printingBill.couponCode ? `(${printingBill.couponCode})` : ''}:</span>
                <span>-₹{printingBill.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span>CGST (2.5%):</span>
              <span>₹{printingBill.cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>SGST (2.5%):</span>
              <span>₹{printingBill.sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-black mt-1">
              <span>GRAND TOTAL:</span>
              <span>₹{printingBill.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] pt-0.5">
              <span>Paid via: {printingBill.paymentMethod}</span>
              <span>STATUS: PAID</span>
            </div>
          </div>

          <div className="pt-3 text-center text-[10px] flex flex-col gap-0.5">
            <p className="font-bold">Thank You! Please Visit Again.</p>
            <p className="text-[9px] text-gray-600">Powered by Paros POS OS</p>
          </div>
        </div>
      )}

      {/* ── Left Sidebar Navigation (Hidden on Print) ── */}
      <aside className="print:hidden fixed left-0 top-0 h-full w-64 bg-white border-r-2 border-espresso z-50 flex flex-col justify-between py-6 px-4 shadow-brutal-sm">
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
                {cafe?.name || 'Artisan Roastery'}
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
              href="/admin/qr"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
              <span>🖨️ QR Print Studio</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso font-bold"
            >
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              <span>📦 Inventory & Recipes</span>
            </Link>
            <Link
              href="/admin/bills"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm font-black"
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              <span>🧾 Bill History</span>
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso font-bold"
            >
              <span className="material-symbols-outlined text-[20px]">monitoring</span>
              <span>Financial Analytics</span>
            </Link>
          </nav>
        </div>

        {/* Cloud Status Footer */}
        <div className="pt-4 border-t-2 border-dashed border-espresso/20 flex items-center justify-between text-xs font-display font-bold">
          <div className="flex items-center gap-1.5 text-paros-matcha">
            <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
            <span>Billing Engine Sync</span>
          </div>
          <span className="font-mono text-[10px] text-espresso/50">v3.2.0</span>
        </div>
      </aside>

      {/* ── Main Content Area (Hidden on Print) ── */}
      <div className="print:hidden pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-md h-16 border-b-2 border-espresso z-40 px-6 flex items-center justify-between shadow-brutal-sm">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-black text-espresso flex items-center gap-2">
              <span className="material-symbols-outlined text-paros-orange">receipt_long</span>
              <span>Customer Bills & Tax Invoice Archive</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase text-espresso">
              {kpis.totalBills} Verified Records
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportBillsCsv}
              className="brutal-btn px-4 py-2 bg-paros-cream hover:bg-paros-yellow text-espresso font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export GST CSV</span>
            </button>
            <Link
              href="/pos"
              className="brutal-btn px-4 py-2 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
              <span>Punch New Order</span>
            </Link>
          </div>
        </header>

        {/* ── Main Workspace ── */}
        <main className="p-6 max-w-[1400px] w-full mx-auto flex flex-col gap-6">
          {/* ═══ 5-KPI METRIC STRIP ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl p-4 border-2 border-espresso shadow-brutal flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] font-black uppercase text-espresso/60">Total Invoices</span>
                <span className="material-symbols-outlined text-[18px] text-espresso/40">description</span>
              </div>
              <p className="font-display text-2xl font-black text-espresso tabular-nums">{kpis.totalBills}</p>
              <p className="text-[10px] font-display text-espresso/60 mt-1">Filtered bills</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border-2 border-espresso shadow-brutal flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] font-black uppercase text-espresso/60">Gross Billed</span>
                <span className="material-symbols-outlined text-[18px] text-paros-orange">payments</span>
              </div>
              <p className="font-display text-2xl font-black text-paros-orange tabular-nums">
                ₹{kpis.totalGross.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] font-display text-espresso/60 mt-1">Total revenue billed</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border-2 border-espresso shadow-brutal flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] font-black uppercase text-espresso/60">Cash Collected</span>
                <span className="material-symbols-outlined text-[18px] text-amber-600">point_of_sale</span>
              </div>
              <p className="font-display text-2xl font-black text-amber-800 tabular-nums">
                ₹{kpis.cashCollected.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] font-display text-espresso/60 mt-1">Paid in cash till</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border-2 border-espresso shadow-brutal flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] font-black uppercase text-espresso/60">UPI Collections</span>
                <span className="material-symbols-outlined text-[18px] text-emerald-600">qr_code_2</span>
              </div>
              <p className="font-display text-2xl font-black text-emerald-700 tabular-nums">
                ₹{kpis.upiCollected.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] font-display text-espresso/60 mt-1">0% MDR Bank UPI</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border-2 border-espresso shadow-brutal flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] font-black uppercase text-espresso/60">Discounts Given</span>
                <span className="material-symbols-outlined text-[18px] text-purple-600">local_activity</span>
              </div>
              <p className="font-display text-2xl font-black text-purple-800 tabular-nums">
                ₹{kpis.totalDiscounts.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] font-display text-espresso/60 mt-1">Coupons & promo off</p>
            </div>
          </div>

          {/* ═══ FILTER & SEARCH TOOLBAR ═══ */}
          <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-3">
            {/* Search Input Bar */}
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-espresso/40 text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Bill # (INV-...), Customer Phone, Name, or Order #..."
                className="w-full pl-10 pr-10 py-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-sm font-bold text-espresso outline-none focus:ring-2 focus:ring-paros-orange"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-espresso/40 hover:text-espresso font-bold text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-espresso/10">
              {/* Date Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="font-display text-[10px] font-black uppercase text-espresso/60 mr-1">Period:</span>
                {(
                  [
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'week', label: 'Last 7 Days' },
                    { id: 'month', label: 'This Month' },
                    { id: 'all', label: 'All Time' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDateFilter(tab.id)}
                    className={`px-3 py-1 rounded-lg font-display text-xs font-black uppercase border transition-all ${
                      dateFilter === tab.id
                        ? 'bg-espresso text-white border-espresso shadow-xs'
                        : 'bg-paros-cream text-espresso/70 border-espresso/20 hover:bg-paros-yellow/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Payment Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[10px] font-black uppercase text-espresso/60 mr-1">Payment:</span>
                {(['ALL', 'UPI', 'CASH'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentFilter(method)}
                    className={`px-2.5 py-1 rounded-lg font-display text-xs font-black uppercase border transition-all ${
                      paymentFilter === method
                        ? 'bg-paros-orange text-white border-espresso shadow-xs'
                        : 'bg-paros-cream text-espresso/70 border-espresso/20 hover:bg-paros-yellow/40'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Source Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[10px] font-black uppercase text-espresso/60 mr-1">Channel:</span>
                {(['ALL', 'POS', 'QR', 'TAKEAWAY', 'SWIGGY', 'ZOMATO'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    className={`px-2.5 py-1 rounded-lg font-display text-[11px] font-black uppercase border transition-all ${
                      sourceFilter === src
                        ? 'bg-paros-mint text-espresso border-espresso shadow-xs'
                        : 'bg-paros-cream text-espresso/70 border-espresso/20 hover:bg-paros-yellow/40'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ BILLS ARCHIVE TABLE / LIST ═══ */}
          <div className="bg-white rounded-2xl border-2 border-espresso shadow-brutal p-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-espresso mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-orange text-[22px]">history</span>
                <h2 className="font-display text-lg font-black text-espresso">Order History & Receipts</h2>
              </div>
              <span className="text-xs font-display font-bold text-espresso/60">
                Showing {bills.length} invoices
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-espresso/50 font-display text-sm">
                <div className="w-8 h-8 border-4 border-paros-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading verified bills...
              </div>
            ) : bills.length === 0 ? (
              <div className="py-16 text-center text-espresso/50 font-display text-sm">
                <span className="material-symbols-outlined text-[48px] text-espresso/20 block mb-2">
                  receipt_long
                </span>
                <p className="font-black text-base text-espresso">No bills found for the selected filter.</p>
                <p className="text-xs text-espresso/60 mt-1">
                  Try clearing the search query or changing date/channel filters.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bills.map((bill) => {
                  const source = String(bill.order?.source || 'POS').toUpperCase();
                  const isSwiggy = source === 'SWIGGY';
                  const isZomato = source === 'ZOMATO';
                  const isTakeaway = source === 'TAKEAWAY';
                  const isQr = source === 'QR';

                  return (
                    <div
                      key={bill.id}
                      className="p-4 bg-paros-cream rounded-2xl border-2 border-espresso shadow-xs hover:border-paros-orange/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left: Invoice & Table Info */}
                      <div className="flex items-start gap-3.5 min-w-[280px]">
                        <div className="w-11 h-11 rounded-xl bg-white border-2 border-espresso flex items-center justify-center font-bold text-espresso shadow-xs shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[20px] text-paros-orange">
                            {isSwiggy ? 'two_wheeler' : isZomato ? 'moped' : isTakeaway ? 'shopping_bag' : 'table_restaurant'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-espresso tracking-tight">
                              {bill.billNumber}
                            </span>
                            {/* Channel Badge */}
                            {isSwiggy ? (
                              <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white font-display text-[10px] font-black uppercase border border-espresso">
                                🛵 Swiggy
                              </span>
                            ) : isZomato ? (
                              <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-display text-[10px] font-black uppercase border border-espresso">
                                🔴 Zomato
                              </span>
                            ) : isTakeaway ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-espresso font-display text-[10px] font-black uppercase border border-espresso">
                                🛍️ Takeaway
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 font-display text-[10px] font-black uppercase border border-emerald-400">
                                🍽️ {bill.order?.table?.tableNumber ? `Table ${bill.order.table.tableNumber}` : 'Dine-In'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-espresso/60 font-body">
                            <span>{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            <span>•</span>
                            <span>{new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span className="font-bold text-espresso/80">
                              {bill.customerName || 'Walk-in Guest'}
                            </span>
                            {bill.customerPhone && (
                              <span className="font-mono text-xs text-espresso/80">({bill.customerPhone})</span>
                            )}
                          </div>

                          {/* Cashier Badge */}
                          <p className="text-[10px] font-display font-semibold text-espresso/50 mt-0.5">
                            Cashier: {bill.processedBy || 'Staff'} {bill.order?.orderNumber ? `• Order ${bill.order.orderNumber}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Items Summary */}
                      <div className="flex-1 lg:px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {bill.order?.items && bill.order.items.length > 0 ? (
                            bill.order.items.map((item) => (
                              <span
                                key={item.id}
                                className="px-2 py-0.5 bg-white border border-espresso/20 rounded-md text-xs font-body font-semibold text-espresso"
                              >
                                <span className="font-bold text-paros-orange">{item.quantity}x</span> {item.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-espresso/40 italic">Items summary recorded in order</span>
                          )}
                        </div>

                        {bill.discount > 0 && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-display font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            <span className="material-symbols-outlined text-[13px]">local_activity</span>
                            <span>Discount: -₹{bill.discount} {bill.couponCode ? `(${bill.couponCode})` : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Financials & Action Buttons */}
                      <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-espresso/10">
                        <div className="text-right">
                          <p className="font-mono text-xl font-black text-espresso tabular-nums">
                            ₹{bill.total.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1.5 justify-end mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-display font-black uppercase border ${
                                bill.paymentMethod === 'CASH'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}
                            >
                              {bill.paymentMethod}
                            </span>
                            <span className="text-[10px] font-display font-bold text-paros-matcha">● PAID</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePrintReceipt(bill)}
                            title="Print 80mm Thermal Receipt"
                            className="brutal-btn px-3 py-2 bg-white hover:bg-paros-yellow text-espresso font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">print</span>
                            <span className="hidden sm:inline">Re-Print</span>
                          </button>

                          <button
                            onClick={() => handleSendWhatsApp(bill)}
                            title="Send WhatsApp Bill"
                            className="brutal-btn px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">chat</span>
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Modal: Custom Phone for WhatsApp Receipt ── */}
      {whatsAppModalBill && (
        <div className="fixed inset-0 bg-espresso/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 w-full max-w-sm animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <div>
                <h3 className="font-display text-base font-black text-espresso">Send WhatsApp Receipt</h3>
                <p className="font-body text-xs text-espresso/60">{whatsAppModalBill.billNumber}</p>
              </div>
              <button
                onClick={() => setWhatsAppModalBill(null)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-display text-xs font-black uppercase text-espresso">
                Customer Phone Number:
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-paros-cream border-2 border-r-0 border-espresso rounded-l-xl font-mono text-sm font-bold">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={customPhoneInput}
                  onChange={(e) => setCustomPhoneInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="9876543210"
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-r-xl font-mono text-base font-bold text-espresso outline-none"
                  autoFocus
                />
              </div>

              <button
                onClick={() => {
                  if (customPhoneInput.length < 10) {
                    showToast('⚠️ Please enter a valid 10-digit number');
                    return;
                  }
                  handleSendWhatsApp(whatsAppModalBill, customPhoneInput);
                }}
                className="brutal-btn w-full py-3 bg-emerald-600 text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal mt-2 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Send WhatsApp Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-espresso text-white px-5 py-3 rounded-2xl border-2 border-white shadow-brutal-lg flex items-center gap-2 font-display text-sm font-bold animate-bounce">
          <span className="material-symbols-outlined text-paros-matcha">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Print Styles for Clean 80mm Thermal Receipt ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-print-area,
          #thermal-receipt-print-area * {
            visibility: visible;
          }
          #thermal-receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 8px;
            background: white !important;
            color: black !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      `}</style>
    </div>
  );
}
