export function Ticker() {
  const items = [
    "⚡ ZERO HARDWARE MANDATE",
    "🔥 WHATSAPP GST BILLING IN < 1 SEC",
    "☕ 0% UPI TRANSACTION TAX",
    "💸 PETPOOJA KILLER: RUN FOR ₹499/MO",
    "📦 WORKS ON ANY PHONE, TABLET OR LAPTOP",
    "⚡ 100% OFFLINE CACHED PWA",
    "🚀 3-MINUTE ONBOARDING",
  ];

  return (
    <div className="w-full bg-paros-yellow border-b-2 border-espresso overflow-hidden py-2 font-display text-xs sm:text-sm font-bold tracking-wider uppercase text-espresso select-none">
      <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
        <div className="flex items-center gap-8">
          {items.map((item, i) => (
            <span key={i}>
              {i > 0 && <span className="mr-8">•</span>}
              {item}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-8">
          {items.map((item, i) => (
            <span key={`dup-${i}`}>
              {i > 0 && <span className="mr-8">•</span>}
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
