export function Hero() {
  return (
    <section className="relative w-full border-b-2 border-espresso bg-paros-cream pt-12 lg:pt-20 pb-16 overflow-hidden">
      {/* Grid Dots Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1C1917_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Sticker Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="sticker-badge bg-paros-yellow text-espresso border-2 border-espresso px-3.5 py-1 rounded-full font-display text-xs sm:text-sm font-black uppercase shadow-brutal-sm" style={{ '--rotation': '-2deg' } as React.CSSProperties}>
              ☕ MADE FOR INDIAN CAFE HUSTLERS
            </span>
            <span className="sticker-badge bg-paros-mint text-espresso border-2 border-espresso px-3.5 py-1 rounded-full font-display text-xs sm:text-sm font-black uppercase shadow-brutal-sm" style={{ '--rotation': '2deg' } as React.CSSProperties}>
              🔥 ZERO HARDWARE LOCK-IN
            </span>
            <span className="sticker-badge bg-paros-peach text-espresso border-2 border-espresso px-3.5 py-1 rounded-full font-display text-xs sm:text-sm font-black uppercase shadow-brutal-sm" style={{ '--rotation': '-1deg' } as React.CSSProperties}>
              🧾 100% PAPERLESS WHATSAPP BILLS
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black text-espresso tracking-tight leading-[1.08] text-balance">
            Stop paying ₹40,000/yr to bulky old-school POS.{" "}
            <br className="hidden sm:inline" />
            <span className="inline-block relative mt-2 bg-paros-orange text-white px-3 sm:px-6 py-1 border-2 border-espresso shadow-brutal transform -rotate-1">
              Run your entire cafe for ₹499/mo.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 font-body text-lg sm:text-xl font-medium text-espresso/80 max-w-2xl text-balance">
            Throw away clunky Windows desktop towers, loud thermal paper printers,
            and missing paper KOTs. Turn any phone, iPad, or laptop into a
            blisteringly fast billing counter, digital barista KDS, and table QR
            dine-in system.
          </p>

          {/* Dual CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center">
            <a
              href="#"
              className="brutal-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-paros-orange text-white font-display font-black text-base uppercase px-8 py-4 rounded-xl border-2 border-espresso shadow-brutal-lg"
            >
              <span>Launch Your Cafe in 3 Mins</span>
              <span className="material-symbols-outlined text-[22px]">bolt</span>
            </a>
            <a
              href="#interactive-demo"
              className="brutal-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-paros-yellow text-espresso font-display font-black text-base uppercase px-8 py-4 rounded-xl border-2 border-espresso shadow-brutal-lg"
            >
              <span className="material-symbols-outlined text-espresso text-[22px]">play_circle</span>
              <span>Test Live Simulator</span>
            </a>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 font-display font-bold text-xs sm:text-sm uppercase text-espresso">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-paros-matcha font-bold text-[20px]">check_circle</span>
              No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-paros-matcha font-bold text-[20px]">check_circle</span>
              14-day zero-risk trial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-paros-matcha font-bold text-[20px]">check_circle</span>
              Instant setup in 180s
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {[
              { value: "₹0", label: "Hardware Required", bg: "bg-white" },
              { value: "< 1s", label: "WhatsApp Bill Dispatch", bg: "bg-paros-mint" },
              { value: "0%", label: "UPI Surcharge / MDR", bg: "bg-paros-yellow" },
              { value: "100%", label: "Offline Local Support", bg: "bg-paros-peach" },
            ].map((m) => (
              <div
                key={m.label}
                className={`p-4 ${m.bg} rounded-2xl border-2 border-espresso shadow-brutal text-center transform hover:-translate-y-1 transition-transform`}
              >
                <p className="font-display text-4xl sm:text-5xl font-black text-paros-orange tabular-nums">
                  {m.value}
                </p>
                <p className="font-display font-bold text-xs uppercase tracking-wider text-espresso mt-1">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-14 pt-8 border-t-2 border-dashed border-espresso text-center">
          <p className="font-display text-xs font-black uppercase tracking-widest text-espresso/70 mb-4">
            Trusted by 150+ Indie Cafes, Artisan Bakeries & Micro-Roasters Across India
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 font-display font-black text-lg text-espresso">
            {[
              { icon: "local_cafe", name: "RoastCraft", loc: "Indiranagar", locBg: "bg-paros-yellow" },
              { icon: "bakery_dining", name: "Sourdough Co.", loc: "Bandra West", locBg: "bg-paros-mint" },
              { icon: "eco", name: "Blue Palm Brew", loc: "Anjuna, Goa", locBg: "bg-paros-peach" },
              { icon: "coffee_maker", name: "Third Wave Lab", loc: "Hauz Khas", locBg: "bg-paros-yellow" },
            ].map((c) => (
              <div
                key={c.name}
                className="px-4 py-2 bg-white rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-paros-orange">{c.icon}</span>
                {c.name}
                <span className={`text-xs ${c.locBg} px-2 py-0.5 rounded border border-espresso font-bold`}>
                  {c.loc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
