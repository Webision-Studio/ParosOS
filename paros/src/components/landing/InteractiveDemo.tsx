'use client';

import { useState } from 'react';

const TABS = [
  { id: 'counter', label: '1. Counter POS (Tablet)', icon: 'tablet_mac' },
  { id: 'kds', label: '2. Barista KDS (Screen)', icon: 'monitor' },
  { id: 'qr', label: '3. Guest Table QR (Phone)', icon: 'smartphone' },
] as const;

type TabId = typeof TABS[number]['id'];

interface SimState {
  stationLabel: string;
  tableBadge: string;
  items: { qty: number; name: string; price: string }[];
  subtotal: string;
  gst: string;
  packaging: string;
  total: string;
  actionLabel: string;
}

const SIM_DATA: Record<TabId, SimState> = {
  counter: {
    stationLabel: 'Morning Brew Station #01',
    tableBadge: 'Table 04 (Dine-In)',
    items: [
      { qty: 1, name: 'Oat Flat White', price: '₹220.00' },
      { qty: 1, name: 'Specialty Pour Over (Ratnagiri)', price: '₹260.00' },
      { qty: 1, name: 'Almond Butter Croissant', price: '₹180.00' },
    ],
    subtotal: '₹660.00',
    gst: '₹33.00',
    packaging: '₹42.00',
    total: '₹735.00',
    actionLabel: 'Send WhatsApp GST Bill',
  },
  kds: {
    stationLabel: 'Kitchen Screen • Barista 1',
    tableBadge: 'Prep Time: 4m 20s',
    items: [
      { qty: 1, name: 'Oat Flat White', price: 'BREWING ☕' },
      { qty: 1, name: 'Pour Over (Ratnagiri)', price: 'GRINDING 🫘' },
      { qty: 1, name: 'Almond Croissant', price: 'WARMING 🔥' },
    ],
    subtotal: '3 items in prep',
    gst: 'Elapsed: 4m 20s',
    packaging: 'ETA: +5m',
    total: 'Table 04',
    actionLabel: 'Mark Ready & Dispatch ETA (+3m)',
  },
  qr: {
    stationLabel: 'Diner Mobile Self-Order',
    tableBadge: 'Scanned Table 04',
    items: [
      { qty: 1, name: 'Oat Flat White', price: '₹220.00' },
      { qty: 1, name: 'Specialty Pour Over (Ratnagiri)', price: '₹260.00' },
      { qty: 1, name: 'Almond Butter Croissant', price: '₹180.00' },
    ],
    subtotal: '₹660.00',
    gst: '₹33.00',
    packaging: '₹42.00',
    total: '₹735.00',
    actionLabel: 'Confirm & Pay via UPI (₹735)',
  },
};

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('counter');
  const [showBanner, setShowBanner] = useState(false);

  const sim = SIM_DATA[activeTab];

  function handleAction() {
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 2800);
  }

  return (
    <section className="w-full bg-paros-mint/30 border-b-2 border-espresso py-16" id="interactive-demo">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
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
                    : 'text-espresso hover:bg-paros-yellow/40 border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Simulator Screen */}
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border-2 border-espresso shadow-brutal-lg p-6 sm:p-8">
          {/* Station Header */}
          <div className="flex items-center justify-between bg-surface-container-low px-4 py-3 rounded-xl mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-paros-matcha animate-ping" />
              <span className="text-sm font-display font-bold text-espresso tracking-tight">
                {sim.stationLabel}
              </span>
            </div>
            <span className="text-xs font-display font-bold bg-primary-fixed text-primary px-3 py-1 rounded-lg">
              {sim.tableBadge}
            </span>
          </div>

          {/* Order Items */}
          <div className="flex flex-col gap-3 py-2">
            {sim.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-primary-fixed text-primary font-bold flex items-center justify-center text-xs">
                    {item.qty}x
                  </span>
                  <span className="font-body font-semibold text-espresso">
                    {item.name}
                  </span>
                </div>
                <span className="font-body font-bold text-espresso tabular-nums">
                  {item.price}
                </span>
              </div>
            ))}
          </div>

          {/* Bill Breakdown */}
          <div className="bg-surface-container p-4 rounded-xl flex flex-col gap-2 mt-4">
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Subtotal (3 items)</span>
              <span className="tabular-nums">{sim.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Restaurant GST (5%)</span>
              <span className="tabular-nums">{sim.gst}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Service Packaging</span>
              <span className="tabular-nums">{sim.packaging}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-espresso/20">
              <span className="font-display text-xl font-black text-espresso">
                Grand Total
              </span>
              <span className="font-display text-xl font-black text-paros-orange tabular-nums">
                {sim.total}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAction}
            className="brutal-btn mt-4 h-14 w-full rounded-xl bg-paros-matcha text-white font-display font-black text-base uppercase flex items-center justify-center gap-2 border-2 border-espresso shadow-brutal"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            {sim.actionLabel}
          </button>

          {/* Status Banner */}
          {showBanner && (
            <div className="mt-3 text-center text-sm font-bold text-paros-matcha bg-paros-mint py-2 rounded-xl border-2 border-espresso animate-pulse">
              ✓ WhatsApp Tax Bill dispatched in 0.8s!
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
