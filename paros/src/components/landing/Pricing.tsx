'use client';

import { useState } from 'react';

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section className="w-full bg-paros-yellow/30 border-b-2 border-espresso py-16" id="pricing">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="sticker-badge inline-block bg-paros-mint text-espresso border-2 border-espresso px-4 py-1 rounded-full font-display text-xs font-black uppercase tracking-wider mb-2 shadow-brutal-sm" style={{ '--rotation': '-1deg' } as React.CSSProperties}>
            💳 TRANSPARENT FAIR PRICING
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-espresso tracking-tight">
            Simple, Honest Cafe Plans
          </h2>
          <p className="mt-2 font-body text-base font-medium text-espresso/80">
            Never pay per-terminal license fees again.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-1 p-1.5 bg-white border-2 border-espresso rounded-2xl shadow-brutal-sm mx-auto w-fit mb-10">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-5 py-2.5 rounded-xl font-display font-black text-sm uppercase transition-all ${
              !isAnnual
                ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                : 'text-espresso border-2 border-transparent hover:bg-paros-yellow/40'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-5 py-2.5 rounded-xl font-display font-black text-sm uppercase transition-all flex items-center gap-1.5 ${
              isAnnual
                ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                : 'text-espresso border-2 border-transparent hover:bg-paros-yellow/40'
            }`}
          >
            Annual (2 Mo Free) ★
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Silver */}
          <div className="bg-white rounded-2xl border-2 border-espresso shadow-brutal p-6 flex flex-col">
            <span className="inline-block w-fit text-[10px] font-display font-black uppercase tracking-wider text-espresso bg-surface-container px-2.5 py-1 rounded-full border border-espresso mb-3">
              Counter Essentials
            </span>
            <h3 className="font-display text-xl font-black text-espresso">Silver Plan</h3>
            <p className="text-sm text-espresso/70 mb-4">For counter cafes, bakeries & cloud kitchens</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="font-display text-5xl font-black text-espresso tabular-nums">
                {isAnnual ? '₹4,999' : '₹499'}
              </span>
              <span className="text-sm font-display text-espresso/60 font-bold">
                {isAnnual ? '/ year' : '/ month'}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 text-sm flex-1">
              {['Unlimited Counter POS Orders', 'Kitchen KDS with ETA Timers', 'WhatsApp GST Receipts', 'Expense Manager & Cash Drawer', 'Offline PWA (Works without WiFi)', 'Menu Manager (CSV/Photo Upload)'].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-paros-matcha text-[18px]">check_circle</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <a href="#" className="brutal-btn mt-6 h-14 w-full rounded-xl bg-espresso text-white font-display font-black text-base uppercase flex items-center justify-center gap-2 border-2 border-espresso shadow-brutal">
              Start 14-Day Free Trial
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </a>
          </div>

          {/* Gold */}
          <div className="bg-white rounded-2xl border-2 border-espresso shadow-brutal-lg p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-paros-orange" />
            <span className="inline-block w-fit text-[10px] font-display font-black uppercase tracking-wider text-white bg-paros-orange px-2.5 py-1 rounded-full border border-espresso mb-3">
              ⭐ BARISTA FAVORITE
            </span>
            <h3 className="font-display text-xl font-black text-espresso">Gold Plan</h3>
            <p className="text-sm text-espresso/70 mb-4">For dine-in cafes, bistros & brew bars</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="font-display text-5xl font-black text-paros-orange tabular-nums">
                {isAnnual ? '₹8,499' : '₹899'}
              </span>
              <span className="text-sm font-display text-espresso/60 font-bold">
                {isAnnual ? '/ year (Effective ₹708/mo)' : '/ month'}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 text-sm flex-1">
              {['Everything in Silver Plan', 'Universal Table QR Dine-In Ordering', 'Live Table Floor Grid', 'Barista KDS with Dynamic ETA', 'Google Reviews Booster', 'Free Web Push Broadcast Marketing', 'Swiggy / Zomato Channel Tracking', 'Priority WhatsApp VIP Support'].map((f, i) => (
                <div key={f} className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[18px] ${i === 0 ? 'text-paros-orange' : 'text-paros-matcha'}`}>check_circle</span>
                  <span className={i === 0 ? 'font-bold text-paros-orange' : ''}>{f}</span>
                </div>
              ))}
            </div>
            <a href="#" className="brutal-btn mt-6 h-14 w-full rounded-xl bg-paros-orange text-white font-display font-black text-base uppercase flex items-center justify-center gap-2 border-2 border-espresso shadow-brutal-lg">
              Start 14-Day Free Trial
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </a>
          </div>
        </div>

        {/* Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 font-display font-bold text-xs sm:text-sm uppercase text-espresso mt-8">
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-paros-matcha text-[18px]">verified</span>
            No Setup Fees
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-paros-matcha text-[18px]">verified</span>
            0% Per-Transaction Commission
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-paros-matcha text-[18px]">verified</span>
            No Hardware Lock-in
          </span>
        </div>
      </div>
    </section>
  );
}
