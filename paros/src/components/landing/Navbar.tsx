import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 w-full z-50 bg-paros-cream/95 backdrop-blur-md border-b-2 border-espresso">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-paros-orange border-2 border-espresso shadow-brutal-sm flex items-center justify-center font-display font-black text-xl text-white">
            P
          </div>
          <Link
            href="/"
            className="font-display text-2xl font-black text-espresso tracking-tight flex items-center gap-1.5"
          >
            PAROS
            <span className="text-paros-orange font-mono text-base font-extrabold">
              .
            </span>
          </Link>
          <span className="hidden md:inline-flex items-center gap-1 bg-paros-mint text-espresso border-2 border-espresso px-2.5 py-0.5 rounded-full text-xs font-black uppercase shadow-brutal-sm">
            <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
            INDIE OS
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 font-display font-bold text-sm">
          <a href="#features" className="hover:text-paros-orange hover:underline decoration-2 underline-offset-4 transition-all">FEATURES</a>
          <a href="#interactive-demo" className="hover:text-paros-orange hover:underline decoration-2 underline-offset-4 transition-all">LIVE SIMULATOR</a>
          <a href="#savings-calculator" className="hover:text-paros-orange hover:underline decoration-2 underline-offset-4 transition-all">SAVINGS MATH</a>
          <a href="#pricing" className="hover:text-paros-orange hover:underline decoration-2 underline-offset-4 transition-all">PRICING</a>
          <a href="#testimonials" className="hover:text-paros-orange hover:underline decoration-2 underline-offset-4 transition-all">WALL OF LOVE</a>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            className="hidden sm:inline-flex items-center justify-center font-display font-bold text-xs uppercase px-4 py-2.5 rounded-xl border-2 border-espresso bg-surface-container hover:bg-paros-yellow transition-all shadow-brutal-sm"
          >
            Book 5-Min Tour
          </a>
          <a
            href="#"
            className="brutal-btn inline-flex items-center justify-center font-display font-extrabold text-xs sm:text-sm uppercase tracking-wide bg-paros-orange text-white px-5 py-2.5 rounded-xl border-2 border-espresso shadow-brutal"
          >
            Start Free Trial →
          </a>
        </div>
      </div>
    </header>
  );
}
