const TESTIMONIALS = [
  {
    quote: '"We threw our Windows thermal terminal in the recycling bin on day 4."',
    body: '"We were burning over ₹3,000 every single month on toxic paper rolls alone. Paros WhatsApp digital bills paid for the entire yearly software subscription within the very first 7 days of running morning crowds."',
    name: 'Arjun Kulkarni',
    role: 'Founder & Head Roaster, RoastCraft (Indiranagar)',
    initials: 'AK',
  },
  {
    quote: '"Our kitchen literally stopped losing tickets overnight."',
    body: '"Before Paros, we lost 3-4 paper KOTs every busy Sunday. Now the barista KDS screen shows live countdowns and nothing gets missed. Customers stopped asking \"where is my order?\" completely."',
    name: 'Priya Menon',
    role: 'Co-founder, Sourdough Co. (Bandra West)',
    initials: 'PM',
  },
];

export function Testimonials() {
  return (
    <section className="w-full bg-paros-cream border-b-2 border-espresso py-16" id="testimonials">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span
            className="sticker-badge inline-block bg-paros-yellow text-espresso border-2 border-espresso px-4 py-1 rounded-full font-display text-xs font-black uppercase tracking-wider mb-2 shadow-brutal-sm"
            style={{ '--rotation': '2deg' } as React.CSSProperties}
          >
            ❤️ WALL OF LOVE
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-espresso tracking-tight">
            Real Cafe Owners. Real Results.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-3"
            >
              {/* Stars */}
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                ))}
              </div>
              <blockquote className="font-display text-xl font-black text-espresso leading-snug">
                {t.quote}
              </blockquote>
              <p className="font-body text-sm text-espresso/75 leading-relaxed">
                {t.body}
              </p>
              <div className="flex items-center gap-3 pt-3 border-t-2 border-dashed border-espresso/15">
                <div className="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-display font-black text-sm border-2 border-espresso">
                  {t.initials}
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-espresso">{t.name}</p>
                  <p className="text-xs text-espresso/60">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
