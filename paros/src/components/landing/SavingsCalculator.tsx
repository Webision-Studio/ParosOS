'use client';

import { useState } from 'react';
import { calculateLegacyCost, formatINR } from '@/lib/utils';

export function SavingsCalculator() {
  const [dailyOrders, setDailyOrders] = useState(80);
  const cost = calculateLegacyCost(dailyOrders);

  return (
    <section className="w-full bg-paros-cream border-b-2 border-espresso py-16" id="savings-calculator">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span
            className="sticker-badge inline-block bg-paros-peach text-espresso border-2 border-espresso px-4 py-1 rounded-full font-display text-xs font-black uppercase tracking-wider mb-2 shadow-brutal-sm"
            style={{ '--rotation': '1.5deg' } as React.CSSProperties}
          >
            💸 HARDWARE ELIMINATION MATH
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-espresso tracking-tight">
            The Legacy Windows POS Tax vs. Paros
          </h2>
          <p className="mt-2 font-body text-base font-medium text-espresso/80">
            Slide to your daily volume and see how much hard cash you lose to thermal
            paper rolls, bulky desktop towers, and hidden gateway fees.
          </p>

          {/* Slider */}
          <div className="mt-8 bg-white border-2 border-espresso p-6 rounded-3xl max-w-xl mx-auto shadow-brutal-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <label className="font-display text-sm font-black uppercase text-espresso">Daily Orders Volume:</label>
              <span className="font-display text-lg font-black bg-paros-yellow px-3 py-1 rounded-xl border-2 border-espresso text-espresso shadow-brutal-sm tabular-nums">
                {dailyOrders} orders / day ({cost.tablesEstimate} tables)
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={300}
              step={5}
              value={dailyOrders}
              onChange={(e) => setDailyOrders(Number(e.target.value))}
              className="w-full accent-paros-orange h-3 bg-paros-cream border-2 border-espresso rounded-lg cursor-pointer my-2"
            />
            <div className="flex justify-between font-mono text-xs text-espresso/70 mt-1 font-bold">
              <span>10 (Kiosk)</span>
              <span>150 (Cafe)</span>
              <span>300+ (High Volume)</span>
            </div>
          </div>
        </div>

        {/* VS Battle Grid */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* VS Stamp */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-paros-yellow border-2 border-espresso shadow-brutal items-center justify-center font-display font-black text-2xl text-espresso rotate-12">
            VS
          </div>

          {/* Card A: Legacy POS */}
          <div className="bg-red-50/70 border-2 border-espresso rounded-3xl p-6 sm:p-8 shadow-brutal-lg flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-36 h-36 bg-red-200/50 rounded-full border-2 border-espresso pointer-events-none" />
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-espresso">
                <div>
                  <span className="font-display text-xs font-black uppercase tracking-wider text-red-600">THE EXTORTIONIST WAY</span>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-espresso mt-1">Old-School Windows POS</h3>
                </div>
                <span className="px-3 py-1 bg-red-200 text-espresso border-2 border-espresso font-display text-xs font-black rounded-full uppercase shadow-brutal-sm">COST HEAVY</span>
              </div>
              <div className="space-y-3.5 font-display text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-espresso/30">
                  <span className="font-bold text-espresso/80">Annual Software Subscription</span>
                  <span className="font-black text-espresso tabular-nums">₹20,000 / yr</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-espresso/30">
                  <span className="font-bold text-espresso/80">Bulky Desktop Touchscreen Tower</span>
                  <span className="font-black text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-300 tabular-nums">₹35,000 upfront</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-espresso/30">
                  <span className="font-bold text-espresso/80">Thermal Paper Rolls (BPA Toxic)</span>
                  <span className="font-black text-espresso tabular-nums">{formatINR(cost.paperAnnual)} / yr</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-espresso/30">
                  <span className="font-bold text-espresso/80">QR Gateway Cut (1.5% to 2% MDR)</span>
                  <span className="font-black text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-300 tabular-nums">{formatINR(cost.mdrAnnual)} / yr</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="font-bold text-espresso/80">Mandatory Annual Hardware AMC</span>
                  <span className="font-black text-espresso tabular-nums">₹4,500 / yr</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t-2 border-espresso bg-white -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-[21px]">
              <p className="font-display text-xs uppercase tracking-wider font-black text-espresso/70">YEAR 1 TOTAL DRAIN</p>
              <p className="font-display text-4xl sm:text-5xl font-black text-red-600 tracking-tight tabular-nums">{formatINR(cost.totalLegacy)}</p>
              <p className="font-body text-xs text-espresso/70 mt-1 font-medium">Includes forced hardware lock-in, toxic thermal waste, and payment gateway cuts.</p>
            </div>
          </div>

          {/* Card B: Paros */}
          <div className="bg-paros-mint/30 border-2 border-espresso rounded-3xl p-6 sm:p-8 shadow-brutal-xl flex flex-col justify-between relative overflow-hidden">
            {/* Stamp */}
            <div className="absolute -top-3 right-6 bg-paros-yellow text-espresso border-2 border-espresso px-4 py-1.5 rounded-full font-display text-xs font-black uppercase tracking-wider shadow-brutal rotate-3">
              100% ZERO HARDWARE TAX
            </div>
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-espresso">
                <div>
                  <span className="font-display text-xs font-black uppercase tracking-wider text-paros-matcha">THE REVOLUTIONARY WAY</span>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-espresso mt-1">Paros Cafe OS</h3>
                </div>
                <span className="px-3 py-1 bg-paros-mint text-espresso border-2 border-espresso font-display text-xs font-black rounded-full uppercase shadow-brutal-sm">ZERO PAPER</span>
              </div>
              <div className="space-y-3.5 font-display text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-espresso/30">
                  <span className="font-bold text-espresso/80">Paros Unlimited Annual Cloud OS</span>
                  <span className="font-black text-espresso tabular-nums">₹4,999 / yr</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-espresso/30">
                  <span className="font-bold text-espresso/80">Hardware (Use your Phone / iPad)</span>
                  <span className="font-black text-paros-matcha bg-white px-2 py-0.5 rounded border border-espresso">₹0 (Existing screens)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-espresso/30">
                  <span className="font-bold text-espresso/80">Paper Rolls (WhatsApp GST Receipts)</span>
                  <span className="font-black text-paros-matcha bg-white px-2 py-0.5 rounded border border-espresso">₹0 (100% Digital)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-espresso/30">
                  <span className="font-bold text-espresso/80">UPI Merchant QR Surcharge</span>
                  <span className="font-black text-paros-matcha bg-white px-2 py-0.5 rounded border border-espresso">₹0 (Direct UPI VPA)</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="font-bold text-espresso/80">Maintenance & Instant PWA Updates</span>
                  <span className="font-black text-paros-matcha bg-white px-2 py-0.5 rounded border border-espresso">₹0 (Auto Cloud)</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t-2 border-espresso bg-paros-yellow -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-[21px]">
              <p className="font-display text-xs uppercase tracking-wider font-black text-espresso/70">PAROS YEAR 1 TOTAL</p>
              <p className="font-display text-4xl sm:text-5xl font-black text-espresso tracking-tight tabular-nums">₹4,999</p>
              <p className="font-body text-xs text-espresso/80 mt-1 font-medium">Unlimited KOTs, kitchen display, table QR ordering, and WhatsApp receipts.</p>
            </div>
          </div>
        </div>

        {/* Net Savings Banner */}
        <div className="mt-8 bg-paros-matcha text-white p-6 rounded-3xl border-2 border-espresso shadow-brutal-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs font-display font-semibold uppercase opacity-90">NET PROFIT RETAINED IN YOUR POCKET (YEAR 1)</p>
            <p className="font-display text-3xl sm:text-4xl font-black tabular-nums">
              Save {formatINR(cost.savings)} / yr
            </p>
          </div>
          <a
            href="#"
            className="brutal-btn bg-white text-espresso font-display font-black text-sm uppercase px-6 py-3 rounded-xl border-2 border-espresso shadow-brutal flex items-center gap-2"
          >
            Switch Now
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </a>
        </div>
      </div>
    </section>
  );
}
