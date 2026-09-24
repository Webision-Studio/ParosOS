'use client';

import { useState } from 'react';

/* ── Menu Items for POS Grid ── */
const MENU_ITEMS = [
  { name: 'Flat White', desc: 'Double ristretto, velvety', price: 220, icon: 'coffee' },
  { name: 'Pour Over', desc: 'Washed Chikmagalur', price: 260, icon: 'local_cafe' },
  { name: 'Butter Croissant', desc: '27-layer laminations', price: 180, icon: 'bakery_dining' },
  { name: 'Sourdough Toast', desc: 'Herb whipped butter', price: 160, icon: 'breakfast_dining' },
  { name: 'Iced Oat Latte', desc: 'Minor Figures oat milk', price: 250, icon: 'icecream' },
  { name: 'Almond Tart', desc: 'Toasted flaked frangipane', price: 210, icon: 'cake' },
];

const CATEGORIES = ['All Items', 'Espresso Bar', 'Artisan Bakery', 'Breakfast Toasties'];

type TabId = 'counter' | 'kds' | 'qr';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'counter', label: '1. Counter POS (Tablet)', icon: 'tablet_mac' },
  { id: 'kds', label: '2. Kitchen KDS (Screen)', icon: 'soup_kitchen' },
  { id: 'qr', label: '3. Customer QR Menu (Phone)', icon: 'qr_code_scanner' },
];

interface CartItem {
  name: string;
  note: string;
  price: number;
}

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('counter');
  const [cart, setCart] = useState<CartItem[]>([
    { name: 'Flat White', note: 'Oat Milk Sub (+₹40)', price: 260 },
    { name: 'Pour Over', note: 'V60 Chikmagalur Washed', price: 260 },
    { name: 'Butter Croissant', note: 'Warm from oven', price: 180 },
  ]);
  const [showToast, setShowToast] = useState(false);
  const [activeTable, setActiveTable] = useState('T4');

  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const tax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + tax;

  function addItem(name: string, price: number) {
    setCart((prev) => [...prev, { name, note: '', price }]);
  }

  function triggerToast() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2800);
  }

  return (
    <section className="w-full bg-paros-mint/30 border-b-2 border-espresso py-16" id="interactive-demo">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span
            className="sticker-badge inline-block bg-paros-yellow text-espresso border-2 border-espresso px-4 py-1 rounded-full font-display text-xs font-black uppercase tracking-wider mb-2 shadow-brutal-sm"
            style={{ '--rotation': '-1deg' } as React.CSSProperties}
          >
            ⚡ LIVE INTERACTIVE SIMULATOR
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-espresso tracking-tight">
            One Operating System. Three Live Perspectives.
          </h2>
          <p className="mt-2 font-body text-base font-medium text-espresso/80">
            Click items below to see real-time sync across your counter register,
            barista KDS, and table QR dine-in.
          </p>

          {/* Tab Switcher */}
          <div className="mt-6 inline-flex flex-wrap justify-center p-1.5 bg-white border-2 border-espresso rounded-2xl shadow-brutal gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-display font-black text-xs sm:text-sm uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Device Shell */}
        <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl overflow-hidden min-h-[580px] flex flex-col">
          {/* Top Bar */}
          <div className="bg-espresso text-white px-6 py-3 flex items-center justify-between font-display text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 border border-espresso" />
              <span className="w-3 h-3 rounded-full bg-yellow-400 border border-espresso" />
              <span className="w-3 h-3 rounded-full bg-green-500 border border-espresso" />
              <span className="ml-2 font-mono text-paros-yellow">PAROS TERMINAL v3.2.0 • LIVE DEMO MODE</span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <span className="bg-paros-matcha text-white px-2 py-0.5 rounded text-[10px] font-black">
                CLOUD SYNCED (0ms LAG)
              </span>
            </div>
          </div>

          {/* ═══ TAB 1: Counter POS ═══ */}
          {activeTab === 'counter' && (
            <div className="flex-1 flex flex-col lg:flex-row">
              {/* Left: Menu Grid */}
              <div className="flex-1 p-6 bg-paros-cream border-r-0 lg:border-r-2 border-b-2 lg:border-b-0 border-espresso">
                {/* Station Header + Table Chips */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b-2 border-espresso gap-3">
                  <div>
                    <h3 className="font-display text-xl font-black text-espresso">Morning Brew Station #01</h3>
                    <p className="font-mono text-xs text-espresso/70">Register Operator: Chef Kabir • Shift Active</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display text-xs font-black text-espresso mr-1">TABLE:</span>
                    {['T1', 'T2', 'T3', 'T4'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTable(t)}
                        className={`px-3 py-1 text-xs font-display font-black rounded-lg border-2 border-espresso shadow-brutal-sm transition-all ${
                          activeTable === t
                            ? 'bg-paros-orange text-white'
                            : 'bg-white hover:bg-paros-yellow'
                        }`}
                      >
                        {t}{activeTable === t ? ' (Active)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-2 pb-4 overflow-x-auto no-scrollbar">
                  {CATEGORIES.map((cat, i) => (
                    <span
                      key={cat}
                      className={`px-3 py-1 rounded-xl border-2 border-espresso font-display text-xs font-black cursor-pointer whitespace-nowrap ${
                        i === 0 ? 'bg-espresso text-white' : 'bg-white text-espresso hover:bg-paros-yellow'
                      }`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Menu Item Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MENU_ITEMS.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => addItem(item.name, item.price)}
                      className="brutal-btn text-left p-3.5 bg-white rounded-2xl border-2 border-espresso shadow-brutal flex flex-col justify-between group"
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="material-symbols-outlined text-paros-orange text-[22px]">{item.icon}</span>
                        <span className="font-display text-[10px] font-black bg-paros-yellow text-espresso px-2 py-0.5 rounded border border-espresso">
                          + ADD
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="font-display font-bold text-espresso text-base leading-tight">{item.name}</p>
                        <p className="font-body text-xs text-espresso/70">{item.desc}</p>
                        <p className="font-display font-black text-espresso text-base mt-1 tabular-nums">₹{item.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Cart / Bill Terminal */}
              <div className="w-full lg:w-[400px] bg-paros-yellow/40 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-espresso">
                    <div>
                      <span className="font-display text-lg font-black text-espresso">Table 04 — Dine In</span>
                      <p className="font-mono text-xs text-espresso/70">KOT #1842 • Rahul S.</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-display font-black bg-paros-peach border border-espresso text-espresso uppercase">
                      UNBILLED
                    </span>
                  </div>
                  {/* Cart Items */}
                  <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                    {cart.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-espresso shadow-brutal-sm">
                        <div>
                          <p className="font-display font-bold text-espresso text-sm">1× {item.name}</p>
                          {item.note && <p className="font-body text-xs text-espresso/70">{item.note}</p>}
                        </div>
                        <span className="font-display font-black text-espresso text-base tabular-nums">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bill Calculation */}
                <div className="pt-4 border-t-2 border-espresso mt-4 bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal">
                  <div className="flex justify-between font-mono text-xs text-espresso/80 mb-1">
                    <span>Subtotal</span>
                    <span className="font-bold tabular-nums">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-mono text-xs text-espresso/80 mb-2">
                    <span>CGST (2.5%) + SGST (2.5%)</span>
                    <span className="tabular-nums">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-display text-xl font-black text-espresso pt-2 border-t-2 border-dashed border-espresso mb-3">
                    <span>Grand Total</span>
                    <span className="text-paros-orange tabular-nums">₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={triggerToast}
                    className="brutal-btn w-full py-3.5 px-4 rounded-xl bg-paros-matcha text-white font-display font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 border-2 border-espresso shadow-brutal"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    Send WhatsApp GST Bill
                  </button>
                  {showToast && (
                    <div className="mt-2 p-2.5 bg-paros-yellow text-espresso border-2 border-espresso rounded-xl font-display text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-brutal-sm">
                      <span className="material-symbols-outlined text-[18px] text-paros-orange font-black">mark_email_read</span>
                      Instant WhatsApp receipt dispatched to +91 98450 XXXXX!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 2: Kitchen KDS ═══ */}
          {activeTab === 'kds' && (
            <div className="flex-1 p-6 bg-paros-cream">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-6 border-b-2 border-espresso gap-3">
                <div>
                  <h3 className="font-display text-2xl font-black text-espresso">Barista & Kitchen Display System (KDS)</h3>
                  <p className="font-body text-xs text-espresso/80 font-medium">Live Kitchen queue • Zero lost paper tickets • Direct chef ETA sync</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-paros-yellow border-2 border-espresso rounded-full font-display text-xs font-black text-espresso shadow-brutal-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-paros-orange animate-ping" /> 3 ACTIVE KOTS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Ticket 1: In Progress */}
                <div className="bg-white rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-espresso">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl font-black text-espresso">Table 04</span>
                        <span className="font-display text-xs bg-paros-peach border border-espresso px-2 py-0.5 rounded font-black">KOT #142</span>
                      </div>
                      <span className="font-mono text-xs bg-paros-yellow border border-espresso px-2 py-1 rounded font-black text-espresso">4m 20s left</span>
                    </div>
                    <div className="space-y-2.5 my-3">
                      <div className="flex items-center justify-between font-display text-sm font-bold">
                        <span>1× Flat White (Oat Milk)</span>
                        <span className="material-symbols-outlined text-paros-matcha text-[20px]">check_box</span>
                      </div>
                      <div className="flex items-center justify-between font-display text-sm font-bold">
                        <span>1× Pour Over (Medium)</span>
                        <span className="text-xs font-mono font-black text-paros-orange bg-paros-orange/10 px-2 py-0.5 rounded border border-paros-orange">Brewing</span>
                      </div>
                      <div className="flex items-center justify-between font-display text-sm font-bold">
                        <span>1× Butter Croissant</span>
                        <span className="material-symbols-outlined text-paros-matcha text-[20px]">check_box</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t-2 border-espresso mt-3">
                    <p className="font-display text-[10px] uppercase font-black text-espresso/70 mb-2">Chef 1-Tap ETA Modifier:</p>
                    <div className="flex items-center gap-2">
                      <button className="px-2.5 py-1 text-xs font-display font-black bg-paros-cream hover:bg-paros-yellow border-2 border-espresso rounded-lg shadow-brutal-sm">+5m</button>
                      <button className="px-2.5 py-1 text-xs font-display font-black bg-paros-cream hover:bg-paros-yellow border-2 border-espresso rounded-lg shadow-brutal-sm">+10m</button>
                      <button className="brutal-btn flex-1 py-1.5 px-3 text-xs font-display font-black bg-paros-matcha text-white border-2 border-espresso rounded-lg shadow-brutal-sm">Mark Ready</button>
                    </div>
                  </div>
                </div>

                {/* Ticket 2: Ready */}
                <div className="bg-paros-mint/20 rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-espresso">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl font-black text-espresso">Takeaway</span>
                        <span className="font-display text-xs bg-paros-mint border border-espresso px-2 py-0.5 rounded font-black">KOT #141</span>
                      </div>
                      <span className="font-display text-xs bg-paros-mint border border-espresso px-2 py-1 rounded font-black text-espresso">READY</span>
                    </div>
                    <div className="space-y-2.5 my-3 text-espresso/50 line-through font-display text-sm font-bold">
                      <div className="flex items-center justify-between">
                        <span>1× Iced Oat Latte</span>
                        <span className="material-symbols-outlined text-paros-matcha text-[20px] no-underline">done_all</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>1× Almond Tart</span>
                        <span className="material-symbols-outlined text-paros-matcha text-[20px] no-underline">done_all</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t-2 border-espresso mt-3">
                    <button className="w-full py-2 px-3 text-xs font-display font-black bg-white border-2 border-espresso text-espresso/60 rounded-xl" disabled>
                      Served to Guest
                    </button>
                  </div>
                </div>

                {/* Ticket 3: New QR Order */}
                <div className="bg-paros-yellow/40 rounded-2xl p-5 border-2 border-espresso shadow-brutal flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-espresso">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl font-black text-espresso">Table 02</span>
                        <span className="font-display text-xs bg-white border border-espresso px-2 py-0.5 rounded font-black">Dine-In QR</span>
                      </div>
                      <span className="font-mono text-xs bg-paros-orange text-white px-2 py-1 rounded font-black animate-pulse border border-espresso">NEW 0:42s</span>
                    </div>
                    <div className="space-y-2.5 my-3 font-display text-sm font-bold">
                      <div className="flex items-center justify-between">
                        <span>2× Cold Brew with Tonic</span>
                        <span className="text-xs font-mono font-bold text-paros-orange">Pending</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>1× Sourdough Toast</span>
                        <span className="text-xs font-mono font-bold text-paros-orange">Pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t-2 border-espresso mt-3">
                    <button className="brutal-btn w-full py-2.5 px-3 text-xs font-display font-black bg-paros-orange text-white rounded-xl border-2 border-espresso shadow-brutal-sm">
                      Accept Order (ETA: 8m)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 3: Customer QR Menu (Phone) ═══ */}
          {activeTab === 'qr' && (
            <div className="flex-1 p-8 bg-paros-cream flex items-center justify-center">
              <div className="w-full max-w-sm bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl overflow-hidden p-6">
                {/* Phone Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-espresso">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border border-espresso">P</div>
                    <div>
                      <h4 className="font-display text-sm font-black text-espresso leading-tight">Artisan Roastery</h4>
                      <p className="font-mono text-[10px] text-paros-matcha font-bold">● Dine-In Active</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-paros-yellow border border-espresso rounded-lg font-display text-xs font-black text-espresso">Table 04</span>
                </div>

                {/* Universal QR Callout */}
                <div className="bg-paros-mint/40 border-2 border-espresso p-3 rounded-xl mb-4 text-espresso">
                  <p className="font-display text-xs font-bold leading-snug">
                    <span className="bg-paros-mint px-1.5 py-0.5 rounded border border-espresso mr-1">Universal QR</span>
                    Guest scanned 1 single cafe QR & picked Table 04. Zero app download!
                  </p>
                </div>

                {/* Item Card */}
                <div className="p-3.5 bg-paros-cream border-2 border-espresso rounded-2xl mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-sm text-espresso">Flat White</p>
                    <p className="font-body text-xs text-espresso/70">Velvety micro-foam espresso</p>
                    <p className="font-display font-black text-espresso text-sm mt-1">₹220</p>
                  </div>
                  <span className="px-3 py-1.5 bg-paros-orange text-white rounded-xl font-display text-xs font-black border-2 border-espresso shadow-brutal-sm">
                    + Customize
                  </span>
                </div>

                {/* Milk Customizer */}
                <div className="p-3.5 bg-paros-yellow/30 border-2 border-espresso rounded-2xl mb-4 space-y-2">
                  <span className="font-display text-xs font-black uppercase text-espresso">Choose Milk Base:</span>
                  <div className="flex items-center justify-between font-display text-xs font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="milk" defaultChecked className="accent-paros-orange" /> Whole Milk
                    </label>
                    <span>+₹0</span>
                  </div>
                  <div className="flex items-center justify-between font-display text-xs font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="milk" className="accent-paros-orange" /> Minor Figures Oat Milk
                    </label>
                    <span className="text-paros-orange font-black">+₹40</span>
                  </div>
                </div>

                {/* Pay Button */}
                <button className="brutal-btn w-full py-3.5 bg-espresso text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal">
                  Pay via UPI • Place Order (₹260)
                </button>
                <p className="text-center font-mono text-[10px] text-espresso/70 mt-2">
                  Direct to Merchant UPI VPA • 0% Transaction Fee
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
