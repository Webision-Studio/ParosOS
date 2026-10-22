'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

interface CafeSettings {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  upiId: string | null;
  gstin: string | null;
  fssai: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  closingTime: string;
  googleReviewUrl: string | null;
  cashierPin: string;
  kitchenPin: string;
  qrMode: 'PER_TABLE' | 'COUNTER_ONLY';
}

export default function AdminSettingsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'banking' | 'compliance' | 'operations' | 'wifi'>('banking');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [gstin, setGstin] = useState('');
  const [fssai, setFssai] = useState('');
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [closingTime, setClosingTime] = useState('23:00');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [cashierPin, setCashierPin] = useState('1234');
  const [kitchenPin, setKitchenPin] = useState('7788');
  const [qrMode, setQrMode] = useState<'PER_TABLE' | 'COUNTER_ONLY'>('PER_TABLE');

  // Test UPI QR state
  const [testUpiQr, setTestUpiQr] = useState<string>('');
  const [testingEmail, setTestingEmail] = useState(false);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Load existing cafe settings
  useEffect(() => {
    fetch('/api/admin')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.cafe) {
          const c: CafeSettings = data.cafe;
          setName(c.name || '');
          setCity(c.city || '');
          setAddress(c.address || '');
          setPhone(c.phone || '');
          setEmail(c.email || '');
          setUpiId(c.upiId || 'artisan@okhdfcbank');
          setGstin(c.gstin || '');
          setFssai(c.fssai || '');
          setWifiName(c.wifiName || '');
          setWifiPassword(c.wifiPassword || '');
          setClosingTime(c.closingTime || '23:00');
          setGoogleReviewUrl(c.googleReviewUrl || '');
          setCashierPin(c.cashierPin || '1234');
          setKitchenPin(c.kitchenPin || '7788');
          setQrMode(c.qrMode || 'PER_TABLE');
        }
      })
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false));
  }, []);

  // Generate Live QR Preview whenever upiId or name changes
  useEffect(() => {
    if (!upiId) {
      setTestUpiQr('');
      return;
    }
    const safeName = encodeURIComponent(name || 'Cafe');
    const safeVpa = encodeURIComponent(upiId.trim());
    const upiUri = `upi://pay?pa=${safeVpa}&pn=${safeName}&am=1&cu=INR&tn=Paros%20Live%20Test%20Payment`;

    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1,
      color: { dark: '#1C1917', light: '#FFFFFF' },
    })
      .then((url) => setTestUpiQr(url))
      .catch(() => setTestUpiQr(''));
  }, [upiId, name]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-cafe-settings',
          name,
          city,
          address,
          phone,
          email,
          upiId,
          gstin,
          fssai,
          wifiName,
          wifiPassword,
          closingTime,
          googleReviewUrl,
          cashierPin,
          kitchenPin,
          qrMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      showToast('✓ Cafe settings and UPI routing successfully updated!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? `❌ ${err.message}` : '❌ Error updating settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestNightlyReport() {
    setTestingEmail(true);
    try {
      const res = await fetch('/api/reports/nightly?preview=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview report');
      showToast(`✓ Nightly Closing Report verified! Ready for: ${data.recipient || email || 'Owner Email'}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? `⚠️ ${err.message}` : '⚠️ Could not generate preview');
    } finally {
      setTestingEmail(false);
    }
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex antialiased select-none">
      {/* ── Left Sidebar Navigation (Desktop) ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r-2 border-espresso z-50 flex-col justify-between py-6 px-4 shadow-brutal-sm">
        <div className="flex flex-col gap-6">
          {/* Brand */}
          <Link href="/admin" className="flex items-center gap-2.5 px-2">
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
                {name || 'My Cafe'}
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
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso font-bold"
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
            <Link
              href="/admin/settings"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm font-black"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span>⚙️ Outlet Settings</span>
            </Link>
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

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-espresso/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-white border-r-2 border-espresso flex flex-col justify-between py-6 px-4 shadow-brutal-xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-5 overflow-y-auto">
              <div className="flex items-center justify-between px-1">
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-paros-orange text-white rounded-xl border-2 border-espresso flex items-center justify-center font-display font-black text-lg shadow-brutal-sm">
                    P
                  </div>
                  <div>
                    <p className="font-display text-lg font-black text-espresso leading-none">
                      PAROS<span className="text-paros-orange">.</span>
                    </p>
                    <p className="font-display text-[9px] font-black uppercase text-espresso/60">
                      Settings
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-xl bg-paros-cream border border-espresso flex items-center justify-center text-espresso"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <nav className="flex flex-col gap-1 font-display text-xs font-bold">
                <Link
                  href="/pos"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                  <span>Register / POS</span>
                </Link>
                <Link
                  href="/kds"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[18px]">soup_kitchen</span>
                  <span>Kitchen KDS</span>
                </Link>
                <Link
                  href="/order"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                  <span>Table QR Menu</span>
                </Link>
                <Link
                  href="/admin/menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
                  <span>Menu Catalog</span>
                </Link>
                <Link
                  href="/admin/bills"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span>Receipts &amp; Bills</span>
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[18px]">monitoring</span>
                  <span>Analytics</span>
                </Link>
                <Link
                  href="/admin/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm font-black"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  <span>Settings</span>
                </Link>
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b-2 border-espresso px-4 sm:px-6 lg:px-8 py-3.5 z-40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-paros-cream border-2 border-espresso flex items-center justify-center text-espresso shadow-brutal-sm"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-espresso tracking-tight flex items-center gap-2">
                <span>⚙️ Outlet Settings &amp; Banking</span>
              </h1>
              <p className="font-body text-xs text-espresso/60 hidden sm:block">
                Direct UPI routing (0% MDR), Brevo nightly closing reports, tax compliance &amp; operations
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="brutal-btn px-4 sm:px-6 py-2 bg-paros-orange text-white font-display text-xs sm:text-sm font-black uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </header>

        {/* Content Container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveTab('banking')}
              className={`px-4 py-2.5 rounded-xl font-display text-xs font-black uppercase flex items-center gap-2 border-2 border-espresso transition-all whitespace-nowrap ${
                activeTab === 'banking'
                  ? 'bg-paros-orange text-white shadow-brutal'
                  : 'bg-white hover:bg-paros-yellow text-espresso shadow-brutal-sm'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
              <span>1. Direct UPI &amp; Bank Settlement</span>
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={`px-4 py-2.5 rounded-xl font-display text-xs font-black uppercase flex items-center gap-2 border-2 border-espresso transition-all whitespace-nowrap ${
                activeTab === 'compliance'
                  ? 'bg-paros-orange text-white shadow-brutal'
                  : 'bg-white hover:bg-paros-yellow text-espresso shadow-brutal-sm'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>2. GST &amp; FSSAI Tax Compliance</span>
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-4 py-2.5 rounded-xl font-display text-xs font-black uppercase flex items-center gap-2 border-2 border-espresso transition-all whitespace-nowrap ${
                activeTab === 'operations'
                  ? 'bg-paros-orange text-white shadow-brutal'
                  : 'bg-white hover:bg-paros-yellow text-espresso shadow-brutal-sm'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
              <span>3. Nightly Reports &amp; Staff PINs</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 rounded-xl font-display text-xs font-black uppercase flex items-center gap-2 border-2 border-espresso transition-all whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-paros-orange text-white shadow-brutal'
                  : 'bg-white hover:bg-paros-yellow text-espresso shadow-brutal-sm'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">store</span>
              <span>4. Cafe Profile &amp; QR Mode</span>
            </button>
            <button
              onClick={() => setActiveTab('wifi')}
              className={`px-4 py-2.5 rounded-xl font-display text-xs font-black uppercase flex items-center gap-2 border-2 border-espresso transition-all whitespace-nowrap ${
                activeTab === 'wifi'
                  ? 'bg-paros-orange text-white shadow-brutal'
                  : 'bg-white hover:bg-paros-yellow text-espresso shadow-brutal-sm'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">wifi</span>
              <span>5. Wi-Fi &amp; Google Reviews</span>
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
            {/* ════ TAB 1: DIRECT UPI & BANK SETTLEMENT ════ */}
            {activeTab === 'banking' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-5">
                  <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
                    <div>
                      <h2 className="font-display text-lg font-black text-espresso flex items-center gap-2">
                        <span>🇮🇳 Direct UPI VPA Configuration</span>
                      </h2>
                      <p className="font-body text-xs text-espresso/70 mt-0.5">
                        Money flows straight from customer to your bank account with 0% platform fee
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-paros-mint text-emerald-950 rounded-full font-display text-[10px] font-black uppercase border border-espresso">
                      0% MDR
                    </span>
                  </div>

                  {/* Architecture Note */}
                  <div className="bg-emerald-50 border-2 border-emerald-600 rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-700 text-[24px] shrink-0 mt-0.5">
                      security
                    </span>
                    <div className="text-xs">
                      <p className="font-display font-black text-emerald-950 uppercase">
                        How Paros Connects Your Bank (NPCI Direct Routing)
                      </p>
                      <p className="font-body text-emerald-900 mt-1 leading-relaxed">
                        Unlike traditional aggregator POS that hold your money for 2-3 days and charge 1.6% to 2% MDR fees, Paros generates deep links and dynamic QR codes using the National Payments Corporation of India (NPCI) protocol. Any UPI app (GPay, PhonePe, Paytm, CRED, BHIM) settles funds <strong>immediately</strong> into your primary bank account.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso flex items-center justify-between">
                      <span>Cafe UPI VPA Address *</span>
                      <span className="text-[10px] text-espresso/60 font-mono">e.g. yourname@okhdfcbank or 9845011223@paytm</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="cafe@okhdfcbank"
                        className="w-full px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none focus:ring-2 focus:ring-paros-orange"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-espresso/40">
                        @upi
                      </span>
                    </div>
                    <p className="font-body text-[11px] text-espresso/60">
                      Used on Counter POS dynamic QR displays (F9) and customer table self-ordering screens (/order).
                    </p>
                  </div>

                  <div className="p-4 bg-paros-cream rounded-xl border border-espresso flex flex-col gap-2 text-xs">
                    <p className="font-display font-black uppercase text-espresso">Supported Merchant UPI Handles:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] text-espresso/80">
                      <span>• @okhdfcbank</span>
                      <span>• @okicici</span>
                      <span>• @okaxis</span>
                      <span>• @paytm</span>
                      <span>• @ybl / @ibl</span>
                      <span>• @bharatpe</span>
                    </div>
                  </div>
                </div>

                {/* Right: Live Dynamic UPI QR Preview */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col items-center justify-between text-center gap-4">
                  <div className="w-full">
                    <span className="px-3 py-1 bg-paros-yellow text-espresso font-display text-[11px] font-black uppercase rounded-full border border-espresso shadow-xs inline-block mb-2">
                      Live Dynamic QR Preview
                    </span>
                    <h3 className="font-display text-base font-black text-espresso">
                      Scan to Test with Any UPI App
                    </h3>
                    <p className="font-body text-xs text-espresso/60 mt-1">
                      Target VPA: <span className="font-mono font-bold text-espresso">{upiId || 'Not Configured'}</span>
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border-2 border-espresso shadow-brutal-sm flex flex-col items-center gap-2">
                    {testUpiQr ? (
                      <img src={testUpiQr} alt="Test UPI QR Code" className="w-48 h-48 rounded-lg" />
                    ) : (
                      <div className="w-48 h-48 bg-stone-100 border-2 border-dashed border-espresso/30 flex items-center justify-center font-display text-xs text-espresso/40">
                        Enter UPI ID to generate QR
                      </div>
                    )}
                    <span className="font-mono text-xs font-black text-espresso">
                      Test Amount: ₹1.00
                    </span>
                  </div>

                  <p className="text-[11px] font-body text-espresso/70">
                    Scan with PhonePe, Google Pay, or Paytm on your smartphone to confirm the recipient name matches your cafe.
                  </p>
                </div>
              </div>
            )}

            {/* ════ TAB 2: TAX COMPLIANCE & LEGAL ════ */}
            {activeTab === 'compliance' && (
              <div className="bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
                  <div>
                    <h2 className="font-display text-lg font-black text-espresso">
                      Legal Compliance &amp; Official Receipts
                    </h2>
                    <p className="font-body text-xs text-espresso/70 mt-0.5">
                      Information printed on customer tax invoices, WhatsApp digital receipts, and GST Z-reports
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-paros-orange text-[26px]">
                    verified
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      GSTIN (Goods &amp; Services Tax Number)
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="27AADCB2230M1ZT"
                      maxLength={15}
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none uppercase"
                    />
                    <p className="font-body text-[11px] text-espresso/60">
                      Standard 15-character alphanumeric GST registration number.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      FSSAI Food License Number (14 Digits)
                    </label>
                    <input
                      type="text"
                      value={fssai}
                      onChange={(e) => setFssai(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="11521018000452"
                      maxLength={14}
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none"
                    />
                    <p className="font-body text-[11px] text-espresso/60">
                      Mandatory under Food Safety and Standards Authority of India (FSSAI) norms.
                    </p>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Full Registered Address (Printed on Bills)
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Shop 4, Ground Floor, Chimbai Road, Bandra West, Mumbai, MH 400050"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-body text-sm font-bold text-espresso outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Official Outlet Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98450 11223"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ════ TAB 3: NIGHTLY REPORTS & STAFF PINS ════ */}
            {activeTab === 'operations' && (
              <div className="bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
                  <div>
                    <h2 className="font-display text-lg font-black text-espresso">
                      Nightly Sales Closing Reports &amp; Shift Security
                    </h2>
                    <p className="font-body text-xs text-espresso/70 mt-0.5">
                      Automatic midnight emails with cash reconciliation, GST summary &amp; bestselling dishes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestNightlyReport}
                    disabled={testingEmail}
                    className="px-3 py-1.5 bg-paros-cream hover:bg-paros-yellow text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    <span>{testingEmail ? 'Testing...' : 'Test Report Dispatch'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Owner Email Address (For Nightly Closing Reports) *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@myartisancafe.com"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none"
                    />
                    <p className="font-body text-[11px] text-espresso/60">
                      Dispatched every midnight by Brevo transactional mailer with complete daily financial audits.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Cafe Closing Time (EOD Cutoff)
                    </label>
                    <input
                      type="time"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none"
                    />
                    <p className="font-body text-[11px] text-espresso/60">
                      Shift Z-Reports are audited against transactions up to this closing hour.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Cashier / Manager PIN (4 Digits)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cashierPin}
                      onChange={(e) => setCashierPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="1234"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none tracking-widest"
                    />
                    <p className="font-body text-[11px] text-espresso/60">
                      Required for order voiding, register unlocking, and drawer cash reconciliation.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Kitchen KDS PIN (4 Digits)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={kitchenPin}
                      onChange={(e) => setKitchenPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="7788"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none tracking-widest"
                    />
                    <p className="font-body text-[11px] text-espresso/60">
                      Protects single-screen kitchen pass controls and station views.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ════ TAB 4: CAFE PROFILE & QR MODE ════ */}
            {activeTab === 'profile' && (
              <div className="bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
                  <div>
                    <h2 className="font-display text-lg font-black text-espresso">
                      Cafe Profile &amp; QR Ordering Mode
                    </h2>
                    <p className="font-body text-xs text-espresso/70 mt-0.5">
                      Brand identity and dine-in vs counter ordering configuration
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-paros-orange text-[26px]">
                    badge
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Outlet Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Artisan Roastery & Bakehouse"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-display text-sm font-bold text-espresso outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      City &amp; Locality *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Bandra West, Mumbai"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-display text-sm font-bold text-espresso outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      QR Ordering Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setQrMode('PER_TABLE')}
                        className={`p-4 rounded-xl border-2 border-espresso text-left transition-all ${
                          qrMode === 'PER_TABLE'
                            ? 'bg-paros-orange text-white shadow-brutal ring-2 ring-espresso'
                            : 'bg-white hover:bg-paros-cream text-espresso'
                        }`}
                      >
                        <p className="font-display font-black text-sm">🪑 Per-Table Dine-In Mode</p>
                        <p className={`text-xs mt-1 ${qrMode === 'PER_TABLE' ? 'text-white/90' : 'text-espresso/60'}`}>
                          Guests scan table QR codes (T-1, T-2...) to place orders directly from their seats.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQrMode('COUNTER_ONLY')}
                        className={`p-4 rounded-xl border-2 border-espresso text-left transition-all ${
                          qrMode === 'COUNTER_ONLY'
                            ? 'bg-paros-orange text-white shadow-brutal ring-2 ring-espresso'
                            : 'bg-white hover:bg-paros-cream text-espresso'
                        }`}
                      >
                        <p className="font-display font-black text-sm">⚡ Express Counter &amp; Token Mode</p>
                        <p className={`text-xs mt-1 ${qrMode === 'COUNTER_ONLY' ? 'text-white/90' : 'text-espresso/60'}`}>
                          Single counter QR for bakeries and takeaway coffee bars. Issues pickup tokens (#101, #102).
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════ TAB 5: WI-FI & GOOGLE REVIEWS ════ */}
            {activeTab === 'wifi' && (
              <div className="bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
                  <div>
                    <h2 className="font-display text-lg font-black text-espresso">
                      Guest Wi-Fi &amp; Google Reviews Booster
                    </h2>
                    <p className="font-body text-xs text-espresso/70 mt-0.5">
                      Surfaced on customer order status screens to delight remote workers and drive 5-star ratings
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-paros-orange text-[26px]">
                    star
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Guest Wi-Fi Network Name (SSID)
                    </label>
                    <input
                      type="text"
                      value={wifiName}
                      onChange={(e) => setWifiName(e.target.value)}
                      placeholder="Artisan_Guest_WiFi_5G"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Guest Wi-Fi Password
                    </label>
                    <input
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="pour-over-2024"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="font-display text-xs font-black uppercase text-espresso">
                      Google Maps Review Direct URL
                    </label>
                    <input
                      type="url"
                      value={googleReviewUrl}
                      onChange={(e) => setGoogleReviewUrl(e.target.value)}
                      placeholder="https://g.page/r/CbXx-YourCafe/review"
                      className="px-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-sm font-bold text-espresso outline-none"
                    />
                    <p className="font-body text-[11px] text-espresso/60">
                      When a guest rates their order 4 or 5 stars on Paros, they are automatically nudged to leave a public review on this Google Maps link!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save Button */}
            <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-espresso/20">
              <span className="text-xs font-display font-bold text-espresso/60">
                All settings synchronize immediately across Register POS, KDS Kitchen Display &amp; QR Menu
              </span>
              <button
                type="submit"
                disabled={saving || loading}
                className="brutal-btn px-8 py-3.5 bg-paros-orange text-white font-display text-sm font-black uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>{saving ? 'Updating...' : 'Save All Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-espresso text-white px-5 py-3 rounded-2xl border-2 border-espresso shadow-brutal-lg font-display text-sm font-black animate-in slide-in-from-bottom-3 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
