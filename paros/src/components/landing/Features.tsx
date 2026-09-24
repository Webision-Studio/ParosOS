const FEATURES = [
  {
    icon: 'qr_code_2',
    title: 'Universal Single Table QR',
    description:
      'Print exactly 1 single QR artwork for your entire cafe. Guests scan and pick table number or counter takeaway. Zero sticker-swapping fraud, zero table reprogramming hassles.',
    bg: 'bg-primary-fixed',
    iconColor: 'text-primary',
  },
  {
    icon: 'timer',
    title: '1-Tap Chef ETA Countdowns',
    description:
      'Barista running 8 minutes behind on pour-overs? Tap "+5m" directly on the KDS tablet. Diners instantly see live status timers on their phone, completely ending aggressive hand-waving.',
    bg: 'bg-paros-yellow',
    iconColor: 'text-espresso',
  },
  {
    icon: 'receipt_long',
    title: '100% Paperless WhatsApp Bills',
    description:
      'Official GST-compliant tax invoices pinged straight to the customer\'s WhatsApp chat. Eliminates ₹3,000/mo toxic thermal roll waste while automatically gathering opt-in repeat visit CRM data.',
    bg: 'bg-paros-mint',
    iconColor: 'text-paros-matcha',
  },
  {
    icon: 'payments',
    title: 'Shift Cash Lock & Petty Cash',
    description:
      'Conduct flawless blind cash audits at day end. Staff log emergency fresh milk and ice runs in 2 fast taps so your till balances penny-perfect every midnight.',
    bg: 'bg-paros-peach',
    iconColor: 'text-espresso',
  },
];

export function Features() {
  return (
    <section className="w-full bg-paros-cream border-b-2 border-espresso py-16" id="features">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span
            className="sticker-badge inline-block bg-paros-peach text-espresso border-2 border-espresso px-4 py-1 rounded-full font-display text-xs font-black uppercase tracking-wider mb-2 shadow-brutal-sm"
            style={{ '--rotation': '1.5deg' } as React.CSSProperties}
          >
            🔧 CHAOS-PROOF ENGINEERING
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-espresso tracking-tight">
            Engineered for Sunday Brunch Rushes
          </h2>
          <p className="mt-2 font-body text-base font-medium text-espresso/80">
            Designed inside real noisy kitchens, not in comfortable design studios.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal hover:-translate-y-1 transition-transform flex flex-col gap-3"
            >
              <div
                className={`w-12 h-12 rounded-xl ${f.bg} ${f.iconColor} border-2 border-espresso flex items-center justify-center shadow-brutal-sm`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {f.icon}
                </span>
              </div>
              <h3 className="font-display text-xl font-black text-espresso">
                {f.title}
              </h3>
              <p className="font-body text-sm text-espresso/75 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
