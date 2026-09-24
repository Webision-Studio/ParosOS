'use client';

import { useState } from 'react';
import { calculateLegacyCost, formatINR } from '@/lib/utils';

export function SavingsCalculator() {
  const [dailyOrders, setDailyOrders] = useState(80);
  const cost = calculateLegacyCost(dailyOrders);

  return (
    <section className="w-full bg-paros-cream border-b-2 border-espresso py-16" id="savings-calculator">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span
            className="sticker-badge inline-block bg-red-100 text-red-700 border-2 border-espresso px-4 py-1 rounded-full font-display text-xs font-black uppercase tracking-wider mb-2 shadow-brutal-sm"
            style={{ '--rotation': '1deg' } as React.CSSProperties}
          >
            💸 UNFILTERED COST REALITY
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-espresso tracking-tight">
            The Legacy Windows POS Tax vs. Paros
          </h2>
          <p className="mt-2 font-body text-base font-medium text-espresso/80">
            Calculate real annual cash bleed on thermal paper, gateway commissions,
            and AMC renewals.
          </p>
        </div>

        {/* Slider */}
        <div className="max-w-xl mx-auto bg-white rounded-2xl border-2 border-espresso shadow-brutal p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display font-bold text-sm text-espresso">
              Simulated Volume:
            </span>
            <span className="font-display font-extrabold text-sm text-paros-orange bg-primary-fixed px-3 py-1 rounded-lg border border-espresso tabular-nums">
              {dailyOrders} orders / day (~{cost.tablesEstimate} tables)
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={250}
            step={10}
            value={dailyOrders}
            onChange={(e) => setDailyOrders(Number(e.target.value))}
            className="w-full accent-paros-orange h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-xs text-espresso/60 font-display font-bold mt-2">
            <span>30 / day (Cozy)</span>
            <span>120 / day (Busy)</span>
            <span>250+ / day (Rush)</span>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Legacy Card */}
          <div className="bg-white rounded-2xl border-2 border-espresso shadow-brutal p-6 opacity-90">
            <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-espresso/20 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-[22px]">desktop_access_disabled</span>
                <span className="font-display font-bold text-base text-espresso">Old-School Windows POS</span>
              </div>
              <span className="text-[10px] font-display font-extrabold text-red-600 bg-red-100 px-2.5 py-1 rounded-full uppercase border border-red-300">
                Capital Trap
              </span>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-espresso/70">Annual Software Lock-in</span><span className="font-semibold text-espresso tabular-nums">₹20,000</span></div>
              <div className="flex justify-between"><span className="text-espresso/70">Desktop Tower + Touch Screen</span><span className="font-semibold text-espresso tabular-nums">₹35,000</span></div>
              <div className="flex justify-between"><span className="text-espresso/70">Thermal Paper Rolls (BPA Toxic)</span><span className="font-semibold text-red-500 tabular-nums">{formatINR(cost.paperAnnual)}</span></div>
              <div className="flex justify-between"><span className="text-espresso/70">Aggregator Cut (1.6% MDR)</span><span className="font-semibold text-red-500 tabular-nums">{formatINR(cost.mdrAnnual)}</span></div>
              <div className="flex justify-between"><span className="text-espresso/70">Mandatory Local Technician AMC</span><span className="font-semibold text-espresso tabular-nums">₹4,500</span></div>
            </div>
            <div className="mt-4 bg-red-50 p-3 rounded-xl flex items-center justify-between border border-red-200">
              <span className="font-display font-bold text-sm text-espresso">Total Year 1 Bleed:</span>
              <span className="font-display text-2xl font-black text-red-500 tabular-nums">{formatINR(cost.totalLegacy)}</span>
            </div>
          </div>

          {/* Paros Card */}
          <div className="bg-white rounded-2xl border-2 border-espresso shadow-brutal-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-espresso/20 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-matcha text-[22px]">verified</span>
                <span className="font-display font-extrabold text-lg text-espresso">Paros Cafe OS</span>
              </div>
              <span className="text-[10px] font-display font-extrabold text-green-700 bg-paros-mint px-2.5 py-1 rounded-full uppercase border border-green-300">
                Pure Delight
              </span>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-espresso/70">Unlimited Cloud OS (Annual)</span><span className="font-semibold text-espresso tabular-nums">₹4,999</span></div>
              <div className="flex justify-between"><span className="text-espresso/70">Hardware Terminal</span><span className="font-bold text-paros-matcha">₹0 (Use phone/tablet)</span></div>
              <div className="flex justify-between"><span className="text-espresso/70">Thermal Paper Rolls</span><span className="font-bold text-paros-matcha">₹0 (WhatsApp Direct)</span></div>
              <div className="flex justify-between"><span className="text-espresso/70">Direct UPI QR Processing</span><span className="font-bold text-paros-matcha">₹0 (0% MDR direct)</span></div>
              <div className="flex justify-between"><span className="text-espresso/70">Maintenance & Upgrades</span><span className="font-bold text-paros-matcha">₹0 Included Lifetime</span></div>
            </div>
            <div className="mt-4 bg-paros-mint/40 p-3 rounded-xl flex items-center justify-between border border-green-300">
              <span className="font-display font-bold text-sm text-espresso">Total Year 1 Cost:</span>
              <span className="font-display text-2xl font-black text-paros-matcha tabular-nums">₹4,999</span>
            </div>
          </div>
        </div>

        {/* Savings Banner */}
        <div className="max-w-4xl mx-auto mt-6 bg-paros-matcha text-white p-5 rounded-2xl border-2 border-espresso shadow-brutal-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs font-display font-semibold uppercase opacity-90">First Year ROI</p>
            <p className="font-display text-3xl font-black tabular-nums">
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
