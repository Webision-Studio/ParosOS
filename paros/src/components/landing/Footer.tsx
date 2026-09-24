export function Footer() {
  return (
    <footer className="w-full bg-espresso text-white border-t-2 border-espresso">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Final CTA */}
        <div className="bg-paros-orange text-white p-8 rounded-2xl border-2 border-white/20 shadow-brutal-lg text-center mb-12">
          <h3 className="font-display text-2xl sm:text-4xl font-black">
            Dump your bulky POS tower once and for all.
          </h3>
          <p className="mt-2 text-sm text-white/90 max-w-lg mx-auto">
            Join 150+ contemporary roasters who switched to zero-hardware
            operations. 3-minute setup today.
          </p>
          <a
            href="#"
            className="brutal-btn inline-flex items-center justify-center gap-2 mt-6 bg-white text-espresso font-display font-black text-base uppercase px-8 py-4 rounded-xl border-2 border-espresso shadow-brutal"
          >
            Start 14-Day Free Trial
            <span className="material-symbols-outlined text-[20px]">bolt</span>
          </a>
        </div>

        {/* Footer Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-paros-orange flex items-center justify-center font-display font-black text-white text-sm">
              P
            </div>
            <span className="font-display font-black text-xl tracking-tight">
              PAROS<span className="text-paros-orange">.</span>
            </span>
          </div>
          <p className="font-display font-bold text-sm text-white/70">
            Table se Kitchen tak. Bas Paros.
          </p>
          <p className="text-xs text-white/50">
            Made with ❤️ for Indian Independent Cafes & Coffee Hustlers.
          </p>
        </div>
      </div>
    </footer>
  );
}
