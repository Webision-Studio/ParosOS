'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface PosCartItem {
  id: string;
  name: string;
  price: number;
}

const REVIEWS_DATA = [
  {
    quote:
      'We were burning over ₹3,000 every single month on rolls of thermal receipt paper that customers threw in the dustbin 2 seconds later. Paros WhatsApp billing paid for itself in week one, and our brew bar looks pristine with just an iPad.',
    name: 'Arjun Kulkarni',
    role: 'Founder, RoastCraft • Indiranagar, BLR',
    initials: 'AK',
  },
  {
    quote:
      "Our previous POS would crash and lose tickets whenever Bandra Wi-Fi flickered during heavy monsoon showers. Paros handles local offline sync seamlessly. When Sunday morning rushes happen, our baristas don't drop a single order.",
    name: 'Sanya Merchant',
    role: 'Head Baker, Sourdough Co. • Bandra West, BOM',
    initials: 'SM',
  },
  {
    quote:
      'The 1-tap chef ETA countdown genuinely saved our floor staff from nervous breakdowns. Diners can see a live timer on their phone, so they never wave arms angrily asking "kahan hai meri coffee?". Absolute calm in our kitchen.',
    name: 'Vikram Rao',
    role: 'Partner, Third Wave Lab • Hauz Khas, DEL',
    initials: 'VR',
  },
];

export function MobileLandingPage() {
  // ── Toast System ──
  const [toast, setToast] = useState<{ message: string; icon: string; visible: boolean }>({
    message: '',
    icon: 'check_circle',
    visible: false,
  });
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string, icon = 'check_circle') {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: msg, icon, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2800);
  }

  // ── Bottom Nav Active Tab ──
  const [activeNav, setActiveNav] = useState<'home' | 'os-demo' | 'calculator' | 'plans'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  function handleNavClick(path: 'home' | 'os-demo' | 'calculator' | 'plans', targetId: string | null) {
    setActiveNav(path);
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── 1. OS Perspectives Simulator State ──
  const [osTab, setOsTab] = useState<1 | 2 | 3>(1);

  // Tab 1: Counter POS State
  const [posSubtotal, setPosSubtotal] = useState(620);
  const [posItems, setPosItems] = useState<PosCartItem[]>([
    { id: '1', name: '2x Flat White (Oat Milk)', price: 440 },
    { id: '2', name: '1x Butter Croissant', price: 180 },
  ]);
  const [posTotalPop, setPosTotalPop] = useState(false);
  const [posBtnSent, setPosBtnSent] = useState(false);

  const posGst = Math.round(posSubtotal * 0.05);
  const posTotal = posSubtotal + posGst;

  function addPosItem(name: string, price: number) {
    const newItem: PosCartItem = {
      id: Math.random().toString(),
      name: `1x ${name}`,
      price,
    };
    setPosItems((prev) => [...prev, newItem]);
    setPosSubtotal((prev) => prev + price);
    setPosTotalPop(true);
    setTimeout(() => setPosTotalPop(false), 400);
    showToast(`Added ${name} (+₹${price}) to Station 1 Ticket`);
  }

  function triggerWhatsappSent() {
    setPosBtnSent(true);
    showToast('✓ WhatsApp GST Invoice pinged in 0.6s to +91 98201 44321', 'send');
    setTimeout(() => {
      setPosBtnSent(false);
    }, 2500);
  }

  // Tab 2: KDS State
  const [kdsSecondsLeft, setKdsSecondsLeft] = useState(222); // 03m 42s
  const [kdsItem1Checked, setKdsItem1Checked] = useState(true);
  const [kdsItem2Checked, setKdsItem2Checked] = useState(false);
  const [kdsDelayActive, setKdsDelayActive] = useState(false);
  const [kdsBumpActive, setKdsBumpActive] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setKdsSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const kdsMinutes = Math.floor(kdsSecondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const kdsSeconds = (kdsSecondsLeft % 60).toString().padStart(2, '0');

  function addKdsDelay() {
    setKdsSecondsLeft((prev) => prev + 120);
    setKdsDelayActive(true);
    showToast('⏱ +2m Delay alert sent to diner mobile on Table 04');
    setTimeout(() => {
      setKdsDelayActive(false);
    }, 2000);
  }

  function toggleKdsCroissant() {
    const nextVal = !kdsItem2Checked;
    setKdsItem2Checked(nextVal);
    if (nextVal) {
      showToast('Croissant toasted & ready for pickup');
    }
  }

  function bumpKdsOrder() {
    setKdsItem1Checked(true);
    setKdsItem2Checked(true);
    setKdsBumpActive(true);
    showToast('🎉 Order #104 bumped to dispatch counter!');
    setTimeout(() => {
      setKdsBumpActive(false);
    }, 2200);
  }

  // Tab 3: Diner QR Menu State
  const [dinerItems, setDinerItems] = useState({
    pourOver: { count: 1, price: 260 },
    chocolat: { count: 1, price: 240 },
    extraOat: { count: 1, price: 235 }, // initial 3 items sum to 735
  });
  const [pourOverPop, setPourOverPop] = useState(false);
  const [chocolatPop, setChocolatPop] = useState(false);

  function updateDinerItem(key: 'pourOver' | 'chocolat', delta: number) {
    setDinerItems((prev) => {
      const current = prev[key];
      const newCount = Math.max(0, current.count + delta);
      return {
        ...prev,
        [key]: { ...current, count: newCount },
      };
    });

    if (key === 'pourOver') {
      setPourOverPop(true);
      setTimeout(() => setPourOverPop(false), 200);
    } else {
      setChocolatPop(true);
      setTimeout(() => setChocolatPop(false), 200);
    }
  }

  const dinerTotalItems =
    dinerItems.pourOver.count + dinerItems.chocolat.count + dinerItems.extraOat.count;
  const dinerSum =
    dinerItems.pourOver.count * dinerItems.pourOver.price +
    dinerItems.chocolat.count * dinerItems.chocolat.price +
    dinerItems.extraOat.count * dinerItems.extraOat.price;

  // ── 2. Hardware Elimination Audit Calculator State ──
  const [auditOrders, setAuditOrders] = useState(80);
  const [savingsCardPop, setSavingsCardPop] = useState(false);

  const auditPaper = Math.round(auditOrders * 365 * 1.12);
  const auditMdr = Math.round(auditOrders * 365 * 280 * 0.015);
  const auditTotalLegacy = 20000 + 35000 + auditPaper + auditMdr + 4500;
  const auditParosCost = 4999;
  const auditSavings = auditTotalLegacy - auditParosCost;

  let auditLabelText = `${auditOrders} Orders / Day`;
  if (auditOrders <= 40) auditLabelText += ' (Espresso Bar)';
  else if (auditOrders <= 100) auditLabelText += ' (12 Tables)';
  else auditLabelText += ' (High Rush Bistro)';

  function handleAuditChange(val: number) {
    setAuditOrders(val);
    setSavingsCardPop(true);
    setTimeout(() => setSavingsCardPop(false), 400);
  }

  function setAuditVolume(orders: number) {
    handleAuditChange(orders);
    showToast(`Recalculated savings for ${orders} orders/day`);
  }

  // ── 3. Pricing Toggle State ──
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlanTab, setSelectedPlanTab] = useState<'silver' | 'gold'>('gold');
  const [pricePop, setPricePop] = useState(false);

  function toggleBilling(period: 'monthly' | 'annual') {
    setBillingPeriod(period);
    setPricePop(true);
    if (period === 'annual') {
      showToast('Switched to Annual Billing (2 Months Free Applied)');
    } else {
      showToast('Switched to Monthly Flexible Billing');
    }
    setTimeout(() => setPricePop(false), 400);
  }

  // ── 4. Reviews State ──
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [reviewFade, setReviewFade] = useState(true);

  function switchReview(idx: number) {
    setReviewFade(false);
    setTimeout(() => {
      setCurrentReviewIdx(idx);
      setReviewFade(true);
    }, 150);
  }

  function nextReview() {
    switchReview((currentReviewIdx + 1) % REVIEWS_DATA.length);
  }

  function prevReview() {
    switchReview((currentReviewIdx - 1 + REVIEWS_DATA.length) % REVIEWS_DATA.length);
  }

  // ── 5. FAQ Accordion State ──
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function toggleFaq(num: number) {
    setOpenFaq((prev) => (prev === num ? null : num));
  }

  return (
    <div className="bg-surface font-body-md text-on-surface flex flex-col min-h-screen relative selection:bg-paros-yellow selection:text-espresso">
      {/* ── Fixed Mobile Header (Desktop Paros Style with 3-Line Fork Icon) ── */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-paros-cream/95 backdrop-blur-md border-b-2 border-espresso">
        <div className="h-16 px-4 flex items-center justify-between gap-2">
          {/* Brand - Exactly like Desktop Navbar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-paros-orange border-2 border-espresso shadow-brutal-sm flex items-center justify-center font-display font-black text-lg text-white">
              P
            </div>
            <Link
              href="/"
              className="font-display text-xl font-black text-espresso tracking-tight flex items-center gap-0.5"
            >
              PAROS
              <span className="text-paros-orange font-mono text-base font-extrabold">
                .
              </span>
            </Link>
            <span className="inline-flex items-center gap-1 bg-paros-mint text-espresso border-2 border-espresso px-2 py-0.5 rounded-full text-[10px] font-black uppercase shadow-brutal-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-paros-matcha animate-pulse" />
              INDIE OS
            </span>
          </div>

          {/* Right Actions: Try Free Button & 3-Line Fork Design */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/onboarding"
              onClick={() => showToast('⚡ Instant 180s setup trial initialized!')}
              className="brutal-btn inline-flex items-center justify-center font-display font-extrabold text-xs uppercase tracking-wide bg-paros-orange text-white px-3 py-2 rounded-xl border-2 border-espresso shadow-brutal-sm active:scale-95"
            >
              Try Free →
            </Link>

            {/* Horizontal 3-Line Fork Shaped Icon (Toggles Menu) */}
            <button
              className="w-9 h-9 rounded-xl bg-espresso border-2 border-espresso shadow-brutal-sm flex items-center justify-center flex-shrink-0 cursor-pointer neo-press active:scale-95"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Menu Navigation"
              aria-label="Navigation Menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* 3 horizontal lines (fork tines acting as hamburger lines) */}
                <line x1="3.5" y1="6.5" x2="14" y2="6.5" />
                <line x1="3.5" y1="12" x2="14" y2="12" />
                <line x1="3.5" y1="17.5" x2="14" y2="17.5" />
                {/* Fork curved base */}
                <path d="M14 6.5c2.6 0 4 2.2 4 5.5s-1.4 5.5-4 5.5" />
                {/* Fork handle extending horizontally */}
                <line x1="18" y1="12" x2="21.5" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu when Fork Icon is clicked */}
        {mobileMenuOpen && (
          <div className="w-full bg-paros-cream border-t-2 border-espresso shadow-brutal-lg p-4 flex flex-col gap-2.5 font-display font-black text-xs uppercase z-50">
            <a
              href="#os-interactive-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-white rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center justify-between"
            >
              <span>⚡ LIVE SIMULATOR</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
            <a
              href="#calculator-section"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-white rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center justify-between"
            >
              <span>💸 SAVINGS MATH</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
            <a
              href="#pricing-section"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-white rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center justify-between"
            >
              <span>💳 PRICING</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
            <Link
              href="/onboarding"
              onClick={() => {
                setMobileMenuOpen(false);
                showToast('⚡ Instant 180s setup trial initialized!');
              }}
              className="brutal-btn w-full text-center py-3 bg-paros-orange text-white rounded-xl border-2 border-espresso shadow-brutal mt-1"
            >
              Launch Cafe in 2 Mins 🚀
            </Link>
          </div>
        )}
      </header>

      {/* ── Main Container ── */}
      <main className="flex flex-col relative w-full pt-16 pb-24 bg-surface min-h-screen">
        <div className="flex flex-col w-full text-on-surface">
          {/* ══ 1. TOP TICKER / MARQUEE BANNER ══ */}
          <div className="w-full bg-[#1c1917] text-white py-2 overflow-hidden border-b-2 border-black flex items-center select-none shadow-sm">
            <div className="flex items-center gap-6 whitespace-nowrap animate-marquee font-label-md tracking-wider text-xs font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" /> ZERO HARDWARE MANDATE
              </span>
              <span className="text-[#f97316]">•</span>
              <span>📱 WHATSAPP GST BILLING IN &lt; 1 SEC</span>
              <span className="text-[#22c55e]">•</span>
              <span>0% UPI TRANSACTION TAX</span>
              <span className="text-[#f97316]">•</span>
              <span>🚀 PETPOOJA KILLER: RUN FOR ₹499/MO</span>
              <span className="text-[#22c55e]">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" /> ZERO HARDWARE MANDATE
              </span>
              <span className="text-[#f97316]">•</span>
              <span>📱 WHATSAPP GST BILLING IN &lt; 1 SEC</span>
              <span className="text-[#22c55e]">•</span>
              <span>0% UPI TRANSACTION TAX</span>
              <span className="text-[#f97316]">•</span>
              <span>🚀 PETPOOJA KILLER: RUN FOR ₹499/MO</span>
              <span className="text-[#22c55e]">•</span>
              <span>⚡ ZERO HARDWARE MANDATE</span>
              <span className="text-[#f97316]">•</span>
              <span>📱 WHATSAPP GST BILLING IN &lt; 1 SEC</span>
            </div>
          </div>

          {/* ══ 2. HERO SECTION ══ */}
          <section className="px-margin-mobile pt-6 pb-8 flex flex-col gap-5">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border-2 border-black text-on-surface font-label-sm uppercase tracking-wider retro-shadow-sm font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Made for Indian Cafe Hustlers
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container border-2 border-black text-on-secondary-container font-label-sm uppercase tracking-wider retro-shadow-sm font-bold">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                ⚡ Zero Hardware Lock-in
              </span>
            </div>

            {/* Main Headline */}
            <div className="flex flex-col gap-2">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile tracking-tight text-on-surface font-black leading-tight">
                Stop paying{' '}
                <span className="line-through decoration-primary decoration-4 text-outline">₹40,000/yr</span> to bulky POS.
                <span className="block mt-2 p-2.5 rounded-xl bg-primary text-white border-2 border-black retro-shadow-sm text-center font-headline-sm text-lg font-black">
                  ☕ Run your entire cafe for ₹499/mo.
                </span>
              </h1>
            </div>

            {/* Subhead */}
            <p className="font-body-md text-on-surface-variant leading-relaxed text-sm">
              Throw away clunky Windows desktop towers, loud paper printers, and missing KOTs. Turn any phone,
              iPad, or laptop into a blisteringly fast billing counter, digital barista KDS, and table QR dine-in system.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                href="/onboarding"
                className="w-full py-3.5 px-6 rounded-xl bg-primary text-on-primary border-2 border-black retro-shadow font-label-md text-base font-extrabold flex items-center justify-center gap-2 neo-press"
              >
                <span>Launch Cafe in 2 Mins</span>
                <span className="text-lg">🚀</span>
              </Link>
              <button
                className="w-full py-2.5 px-5 rounded-xl bg-surface-container-lowest text-on-surface border-2 border-black retro-shadow-sm font-label-md text-xs font-bold flex items-center justify-center gap-1.5 neo-press"
                onClick={() => {
                  const el = document.getElementById('os-interactive-demo');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="material-symbols-outlined text-primary text-lg">play_circle</span>
                <span>⚡ Test Live Simulator</span>
              </button>
            </div>

            {/* Trust Micro-Bar */}
            <div className="flex items-center justify-center gap-2 text-center text-on-surface-variant font-label-sm text-[11px] py-0.5">
              <span>No Credit Card</span>
              <span>•</span>
              <span>14-Day Free Trial</span>
              <span>•</span>
              <span>180s Setup</span>
            </div>

            {/* 4-Metric Grid (Compact & High-Density) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div
                className="p-2.5 rounded-xl bg-surface-container-lowest border-2 border-black retro-shadow-xs flex flex-col neo-press cursor-pointer"
                onClick={() => showToast('Zero hardware mandate: runs on Android, iOS, Windows, Mac & Web')}
              >
                <span className="font-headline-md text-xl font-black text-primary leading-none">₹0</span>
                <span className="font-label-sm text-on-surface-variant mt-1 text-[11px] uppercase font-bold tracking-tight">
                  Hardware Required
                </span>
              </div>
              <div
                className="p-2.5 rounded-xl bg-surface-container-lowest border-2 border-black retro-shadow-xs flex flex-col neo-press cursor-pointer"
                onClick={() => showToast('⚡ Instant WhatsApp API sends PDF invoices in <1 second')}
              >
                <span className="font-headline-md text-xl font-black text-secondary leading-none">&lt; 1s</span>
                <span className="font-label-sm text-on-surface-variant mt-1 text-[11px] uppercase font-bold tracking-tight">
                  WhatsApp Bill Dispatch
                </span>
              </div>
              <div
                className="p-2.5 rounded-xl bg-surface-container-lowest border-2 border-black retro-shadow-xs flex flex-col neo-press cursor-pointer"
                onClick={() => showToast('Direct merchant bank QR integration with 0% intermediary commission')}
              >
                <span className="font-headline-md text-xl font-black text-on-surface leading-none">0%</span>
                <span className="font-label-sm text-on-surface-variant mt-1 text-[11px] uppercase font-bold tracking-tight">
                  Direct UPI MDR / Tax
                </span>
              </div>
              <div
                className="p-2.5 rounded-xl bg-surface-container-lowest border-2 border-black retro-shadow-xs flex flex-col neo-press cursor-pointer"
                onClick={() => showToast('Offline cache stores last 10,000 orders even during Wi-Fi dropouts')}
              >
                <span className="font-headline-md text-xl font-black text-tertiary leading-none">100%</span>
                <span className="font-label-sm text-on-surface-variant mt-1 text-[11px] uppercase font-bold tracking-tight">
                  Offline PWA Engine
                </span>
              </div>
            </div>

            {/* Trusted Roasters Strip */}
            <div className="mt-2 pt-4 border-t-2 border-dashed border-outline-variant flex flex-col gap-2.5">
              <span className="font-label-sm uppercase tracking-widest text-on-surface-variant text-center font-bold text-[10px]">
                Trusted daily by specialty coffee pioneers:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-md bg-surface-container border border-black/20 font-label-sm text-xs font-semibold cursor-pointer hover:border-black transition-colors"
                  onClick={() => showToast('☕ RoastCraft Indiranagar processed 14,200 orders with Paros')}
                >
                  ☕ RoastCraft Indiranagar
                </span>
                <span
                  className="px-2.5 py-1 rounded-md bg-surface-container border border-black/20 font-label-sm text-xs font-semibold cursor-pointer hover:border-black transition-colors"
                  onClick={() => showToast('🥐 Sourdough Co. saved ₹38k on thermal paper rolls')}
                >
                  🥐 Sourdough Co. Bandra
                </span>
                <span
                  className="px-2.5 py-1 rounded-md bg-surface-container border border-black/20 font-label-sm text-xs font-semibold cursor-pointer hover:border-black transition-colors"
                  onClick={() => showToast('🌿 Blue Palm runs 3 counter iPads on Silver Plan')}
                >
                  🌿 Blue Palm Jaipur
                </span>
                <span
                  className="px-2.5 py-1 rounded-md bg-surface-container border border-black/20 font-label-sm text-xs font-semibold cursor-pointer hover:border-black transition-colors"
                  onClick={() => showToast('⚡ Third Wave Lab reduced customer ticket delay by 65%')}
                >
                  ⚡ Third Wave Lab Hauz Khas
                </span>
              </div>
            </div>
          </section>

          {/* ══ 3. INTERACTIVE OS DEMO (THREE PERSPECTIVES) ══ */}
          <section
            className="px-margin-mobile py-8 bg-surface-container-low border-y-2 border-black flex flex-col gap-5"
            id="os-interactive-demo"
          >
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-md bg-tertiary-fixed text-on-tertiary-fixed border border-black font-label-sm uppercase font-bold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping inline-block" />
                Live Hardware Simulator
              </div>
              <h2 className="font-headline-md text-headline-sm font-black text-on-surface">
                One Operating System. Three Live Perspectives.
              </h2>
              <p className="font-body-sm text-on-surface-variant">
                Tap tabs to observe instant real-time sync across your billing register, barista KDS, and table QR ordering.
              </p>
            </div>

            {/* Interactive Tab Pill Switcher */}
            <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-container-highest border-2 border-black retro-shadow-sm gap-1">
              <button
                className={`py-2 px-1 rounded-lg font-label-sm text-[11px] font-bold tracking-tight text-center transition-all flex flex-col items-center neo-press ${
                  osTab === 1 ? 'bg-black text-white' : 'bg-transparent text-on-surface'
                }`}
                onClick={() => {
                  setOsTab(1);
                  showToast('Switched to Counter POS Register');
                }}
              >
                <span>1. Counter POS</span>
                <span className="text-[9px] opacity-75 font-normal">Register</span>
              </button>
              <button
                className={`py-2 px-1 rounded-lg font-label-sm text-[11px] font-bold tracking-tight text-center transition-all flex flex-col items-center neo-press ${
                  osTab === 2 ? 'bg-black text-white' : 'bg-transparent text-on-surface'
                }`}
                onClick={() => {
                  setOsTab(2);
                  showToast('Switched to Barista KDS Screen');
                }}
              >
                <span>2. Barista KDS</span>
                <span className="text-[9px] opacity-75 font-normal">Kitchen</span>
              </button>
              <button
                className={`py-2 px-1 rounded-lg font-label-sm text-[11px] font-bold tracking-tight text-center transition-all flex flex-col items-center neo-press ${
                  osTab === 3 ? 'bg-black text-white' : 'bg-transparent text-on-surface'
                }`}
                onClick={() => {
                  setOsTab(3);
                  showToast('Switched to Diner Table #04 QR View');
                }}
              >
                <span>3. Diner QR</span>
                <span className="text-[9px] opacity-75 font-normal">Customer</span>
              </button>
            </div>

            {/* Frame Container for Perspectives */}
            <div className="rounded-2xl border-2 border-black bg-surface-container-lowest p-3.5 retro-shadow flex flex-col gap-3 min-h-[410px] relative overflow-hidden transition-all duration-300">
              {/* ================= VIEW 1: COUNTER POS ================= */}
              {osTab === 1 && (
                <div className="flex flex-col gap-3 transition-opacity duration-200">
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-outline-variant">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
                      </span>
                      <span className="font-label-sm font-bold text-xs uppercase text-on-surface">
                        Station #01 • Espresso Bar
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm text-[10px] border border-black/10 font-bold">
                      Cashier: Rohan
                    </span>
                  </div>

                  {/* Quick Item Tap Chips */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
                        Fast Taps (1-Click Add):
                      </span>
                      <span className="text-[10px] text-primary font-bold">Tap to add</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="p-2 rounded-lg bg-surface-container-low border border-black text-left flex justify-between items-center neo-press active:scale-95 transition-all"
                        onClick={() => addPosItem('Flat White', 220)}
                      >
                        <span className="font-label-md text-xs font-bold text-on-surface">Flat White</span>
                        <span className="font-label-sm text-xs font-extrabold text-primary">₹220</span>
                      </button>
                      <button
                        className="p-2 rounded-lg bg-surface-container-low border border-black text-left flex justify-between items-center neo-press active:scale-95 transition-all"
                        onClick={() => addPosItem('Pour Over', 260)}
                      >
                        <span className="font-label-md text-xs font-bold text-on-surface">Pour Over</span>
                        <span className="font-label-sm text-xs font-extrabold text-primary">₹260</span>
                      </button>
                      <button
                        className="p-2 rounded-lg bg-surface-container-low border border-black text-left flex justify-between items-center neo-press active:scale-95 transition-all"
                        onClick={() => addPosItem('Butter Croissant', 180)}
                      >
                        <span className="font-label-md text-xs font-bold text-on-surface">Butter Croissant</span>
                        <span className="font-label-sm text-xs font-extrabold text-primary">₹180</span>
                      </button>
                      <button
                        className="p-2 rounded-lg bg-surface-container-low border border-black text-left flex justify-between items-center neo-press active:scale-95 transition-all"
                        onClick={() => addPosItem('Iced Oat Latte', 250)}
                      >
                        <span className="font-label-md text-xs font-bold text-on-surface">Iced Oat Latte</span>
                        <span className="font-label-sm text-xs font-extrabold text-primary">₹250</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Bill Ticket / Cart Preview */}
                  <div className="p-3 rounded-xl bg-surface-container border-2 border-black flex flex-col gap-2">
                    <div className="flex justify-between items-center font-label-sm font-bold text-xs pb-1.5 border-b border-black/10">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-primary">table_restaurant</span>
                        Table 04 • Dine-In
                      </span>
                      <span className="text-secondary font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse inline-block" />● Active Ticket
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-xs max-h-28 overflow-y-auto">
                      {posItems.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between text-on-surface py-0.5 item-flash">
                          <span>{item.name}</span>
                          <span className="font-semibold">₹{item.price}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-dashed border-black/20 flex flex-col gap-0.5 text-xs">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>Subtotal</span>
                        <span>₹{posSubtotal}</span>
                      </div>
                      <div className="flex justify-between text-on-surface-variant">
                        <span>GST (5%)</span>
                        <span>₹{posGst}</span>
                      </div>
                      <div className="flex justify-between font-black text-sm text-on-surface pt-1">
                        <span>Total Payable</span>
                        <span className={`text-primary font-black transition-all ${posTotalPop ? 'scale-pop' : ''}`}>
                          ₹{posTotal}
                        </span>
                      </div>
                    </div>

                    <button
                      className={`mt-1 w-full py-2.5 px-3 rounded-lg text-white font-label-md text-xs font-bold flex items-center justify-center gap-1.5 border border-black retro-shadow-sm neo-press ${
                        posBtnSent ? 'bg-black' : 'bg-secondary'
                      }`}
                      onClick={triggerWhatsappSent}
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>
                        {posBtnSent
                          ? '⚡ Bill Dispatched via WhatsApp (0.4s)'
                          : 'Send Instant WhatsApp GST Bill'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* ================= VIEW 2: KITCHEN KDS ================= */}
              {osTab === 2 && (
                <div className="flex flex-col gap-3 bg-[#18181b] -m-3.5 p-3.5 rounded-2xl text-white transition-opacity duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary text-white font-label-sm text-[10px] font-black uppercase tracking-wider">
                        KDS Station 1
                      </span>
                      <span className="font-label-sm text-xs font-bold text-zinc-300">Rush Load: 45%</span>
                    </div>
                    <span className="text-secondary font-mono text-xs font-bold flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                      </span>
                      0s Sync Latency
                    </span>
                  </div>

                  {/* Ticket Card 1 */}
                  <div className="p-3 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col gap-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-headline-sm text-sm font-black text-amber-400">ORDER #104</span>
                        <div className="font-label-sm text-xs text-zinc-400">Table 04 • 2 Guests (Dine-in)</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-950/90 text-red-400 border border-red-800 font-mono text-xs font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs animate-spin" style={{ animationDuration: '3s' }}>
                          timer
                        </span>
                        <span>
                          {kdsMinutes}m {kdsSeconds}s
                        </span>
                      </span>
                    </div>

                    {/* Items Checklist */}
                    <div className="flex flex-col gap-2 py-1">
                      <label className="flex items-center gap-2 cursor-pointer bg-zinc-800/80 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <input
                          checked={kdsItem1Checked}
                          onChange={(e) => setKdsItem1Checked(e.target.checked)}
                          className="w-4 h-4 accent-secondary rounded"
                          type="checkbox"
                        />
                        <span
                          className={`text-xs font-medium ${
                            kdsItem1Checked ? 'line-through text-zinc-500' : 'text-zinc-200'
                          }`}
                        >
                          2x Flat White (Oat Milk)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer bg-zinc-800/80 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <input
                          checked={kdsItem2Checked}
                          onChange={toggleKdsCroissant}
                          className="w-4 h-4 accent-secondary rounded"
                          type="checkbox"
                        />
                        <span
                          className={`text-xs font-medium transition-all ${
                            kdsItem2Checked ? 'line-through text-zinc-500' : 'text-zinc-200'
                          }`}
                        >
                          1x Butter Croissant (Warm)
                        </span>
                      </label>
                    </div>

                    {/* KDS Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        className={`py-2 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 font-label-sm text-xs font-bold flex items-center justify-center gap-1 neo-press active:scale-95 ${
                          kdsDelayActive ? 'text-green-400' : 'text-amber-300'
                        }`}
                        onClick={addKdsDelay}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {kdsDelayActive ? 'alarm_on' : 'schedule'}
                        </span>
                        <span>{kdsDelayActive ? 'Diner Notified (+2m)' : '+2m Rush Alert'}</span>
                      </button>

                      <button
                        className={`py-2 px-2 rounded-lg font-label-sm text-xs font-bold flex items-center justify-center gap-1 neo-press active:scale-95 text-white ${
                          kdsBumpActive ? 'bg-emerald-600' : 'bg-secondary hover:bg-secondary/90'
                        }`}
                        onClick={bumpKdsOrder}
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>{kdsBumpActive ? '✓ Order #104 Cleared!' : 'Bump / Mark Ready'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1">
                    <span>Kitchen screen updates in real-time</span>
                    <span className="text-secondary font-bold">● Synchronized</span>
                  </div>
                </div>
              )}

              {/* ================= VIEW 3: DINER QR MENU ================= */}
              {osTab === 3 && (
                <div className="flex flex-col gap-3 transition-opacity duration-200">
                  {/* Customer Mobile View Top Header */}
                  <div className="p-2.5 rounded-xl bg-surface-container border border-black flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs border border-black">
                        P
                      </div>
                      <div>
                        <div className="font-label-md text-xs font-black">Roast &amp; Co. Bar</div>
                        <div className="font-label-sm text-[10px] text-on-surface-variant font-semibold">
                          Table #04 (Dine In)
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold border border-black/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse inline-block" />
                      Direct Menu
                    </span>
                  </div>

                  {/* Filter Pill Chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="px-3 py-1 rounded-full bg-black text-white font-bold text-[11px] shrink-0 cursor-pointer">
                      ☕ Brew Bar
                    </span>
                    <span
                      className="px-3 py-1 rounded-full bg-surface-container border border-black/20 text-on-surface font-semibold text-[11px] shrink-0 cursor-pointer"
                      onClick={() => showToast('Browsing Bakery selection...')}
                    >
                      🥐 Bakery
                    </span>
                    <span
                      className="px-3 py-1 rounded-full bg-surface-container border border-black/20 text-on-surface font-semibold text-[11px] shrink-0 cursor-pointer"
                      onClick={() => showToast('Browsing Sandwiches selection...')}
                    >
                      🥪 Sandwiches
                    </span>
                  </div>

                  {/* Menu items row with dynamic steppers */}
                  <div className="flex flex-col gap-2">
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-black flex justify-between items-center">
                      <div>
                        <span className="font-label-md text-xs font-bold text-on-surface">Single Origin Pour Over</span>
                        <div className="font-label-sm text-[10px] text-on-surface-variant">
                          Kerehaklu Estate • Floral, Citrus
                        </div>
                        <span className="font-label-md text-xs font-extrabold text-primary">₹260</span>
                      </div>
                      {/* Stepper Controls */}
                      <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-black rounded-lg p-1">
                        <button
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-bold text-xs neo-press active:scale-90"
                          onClick={() => updateDinerItem('pourOver', -1)}
                        >
                          -
                        </button>
                        <span
                          className={`w-5 text-center font-bold text-xs ${pourOverPop ? 'scale-pop' : ''}`}
                        >
                          {dinerItems.pourOver.count}
                        </span>
                        <button
                          className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center font-bold text-xs neo-press active:scale-90"
                          onClick={() => updateDinerItem('pourOver', 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-black flex justify-between items-center">
                      <div>
                        <span className="font-label-md text-xs font-bold text-on-surface">Almond Pain Au Chocolat</span>
                        <div className="font-label-sm text-[10px] text-on-surface-variant">
                          Flaky double baked with Belgian cocoa
                        </div>
                        <span className="font-label-md text-xs font-extrabold text-primary">₹240</span>
                      </div>
                      {/* Stepper Controls */}
                      <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-black rounded-lg p-1">
                        <button
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-bold text-xs neo-press active:scale-90"
                          onClick={() => updateDinerItem('chocolat', -1)}
                        >
                          -
                        </button>
                        <span
                          className={`w-5 text-center font-bold text-xs ${chocolatPop ? 'scale-pop' : ''}`}
                        >
                          {dinerItems.chocolat.count}
                        </span>
                        <button
                          className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center font-bold text-xs neo-press active:scale-90"
                          onClick={() => updateDinerItem('chocolat', 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Floating UPI Checkout Summary */}
                  <div className="p-3 rounded-xl bg-surface-container-highest border-2 border-black flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant">
                        Diner Tab Total
                      </span>
                      <span className="font-headline-sm text-sm font-black text-on-surface">
                        ₹{dinerSum} ({dinerTotalItems} Items)
                      </span>
                    </div>
                    <button
                      className="py-2 px-3 rounded-lg bg-secondary text-white font-label-md text-xs font-black border border-black retro-shadow-sm flex items-center gap-1 neo-press active:scale-95"
                      onClick={() =>
                        showToast('⚡ Launching UPI intent (GPay/PhonePe). Direct 0% fee settlement!')
                      }
                    >
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      <span>Pay ₹{dinerSum} via Direct UPI</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ══ 4. THE LEGACY WINDOWS POS TAX VS PAROS (SAVINGS & FORENSIC AUDIT) ══ */}
          <section className="px-margin-mobile py-8 flex flex-col gap-5" id="calculator-section">
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-md bg-error-container text-on-error-container border border-black font-label-sm uppercase font-bold text-[10px]">
                Hardware Elimination Audit
              </span>
              <h2 className="font-headline-md text-headline-sm font-black text-on-surface">
                The Brutal Cost of Legacy Windows POS vs. Paros
              </h2>
              <p className="font-body-sm text-on-surface-variant">
                See how much money legacy billing hardware leeches from your cafe every 12 months.
              </p>
            </div>

            {/* Interactive Orders Volume Selector & Slider */}
            <div className="p-4 rounded-xl bg-surface-container-low border-2 border-black retro-shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-label-md text-xs font-bold text-on-surface">Daily Order Volume:</span>
                <span className="font-label-sm text-xs font-black text-primary px-2.5 py-1 rounded-md bg-primary-fixed border border-primary/30 transition-all">
                  {auditLabelText}
                </span>
              </div>

              {/* Draggable Range Slider with Smooth Haptic Feedback */}
              <div className="flex flex-col gap-1">
                <input
                  className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary border border-black"
                  id="audit-range-slider"
                  max="300"
                  min="20"
                  onChange={(e) => handleAuditChange(parseInt(e.target.value))}
                  step="5"
                  type="range"
                  value={auditOrders}
                />
                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant px-0.5">
                  <span>20 (Takeaway Cart)</span>
                  <span>150</span>
                  <span>300+ (High Rush Bistro)</span>
                </div>
              </div>

              {/* Quick Preset Pills */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  className={`audit-pill py-1.5 px-2 rounded-lg border border-black font-label-sm text-xs font-bold text-center neo-press active:scale-95 ${
                    auditOrders === 30 ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface'
                  }`}
                  onClick={() => setAuditVolume(30)}
                >
                  30 / Day
                </button>
                <button
                  className={`audit-pill py-1.5 px-2 rounded-lg border border-black font-label-sm text-xs font-bold text-center neo-press active:scale-95 ${
                    auditOrders === 80 ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface'
                  }`}
                  onClick={() => setAuditVolume(80)}
                >
                  80 / Day
                </button>
                <button
                  className={`audit-pill py-1.5 px-2 rounded-lg border border-black font-label-sm text-xs font-bold text-center neo-press active:scale-95 ${
                    auditOrders === 200 ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface'
                  }`}
                  onClick={() => setAuditVolume(200)}
                >
                  200+ / Day
                </button>
              </div>
            </div>

            {/* Unified Forensic Cost Comparison Card */}
            <div className="p-3.5 rounded-2xl bg-surface-container-lowest border-2 border-black retro-shadow flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-black/20">
                <span className="font-label-sm text-xs font-black uppercase text-on-surface">Annual Cost Breakdown</span>
                <span className="font-label-sm text-[10px] font-bold text-on-surface-variant">Year 1 Drain</span>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                {/* Row 1: Software */}
                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-on-surface font-medium">Software License</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-red-600 line-through text-[11px]">₹20,000</span>
                    <span className="text-secondary font-black bg-green-100 px-1.5 py-0.2 rounded border border-green-300 text-[11px]">₹4,999</span>
                  </div>
                </div>

                {/* Row 2: Hardware */}
                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-on-surface font-medium">Hardware Terminal</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-red-600 line-through text-[11px]">₹35,000</span>
                    <span className="text-secondary font-black bg-green-100 px-1.5 py-0.2 rounded border border-green-300 text-[11px]">₹0 (Any Phone/Tab)</span>
                  </div>
                </div>

                {/* Row 3: Thermal Paper */}
                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-on-surface font-medium">Thermal Paper Rolls</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-red-600 line-through text-[11px]">₹{auditPaper.toLocaleString('en-IN')}</span>
                    <span className="text-secondary font-black bg-green-100 px-1.5 py-0.2 rounded border border-green-300 text-[11px]">₹0 (WhatsApp)</span>
                  </div>
                </div>

                {/* Row 4: Gateway MDR */}
                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-on-surface font-medium">Payment Gateway MDR (1.5%)</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-red-600 line-through text-[11px]">₹{auditMdr.toLocaleString('en-IN')}</span>
                    <span className="text-secondary font-black bg-green-100 px-1.5 py-0.2 rounded border border-green-300 text-[11px]">₹0 (Direct UPI)</span>
                  </div>
                </div>

                {/* Row 5: AMC */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-on-surface font-medium">Technician AMC &amp; Cabling</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-red-600 line-through text-[11px]">₹4,500</span>
                    <span className="text-secondary font-black bg-green-100 px-1.5 py-0.2 rounded border border-green-300 text-[11px]">₹0 (Free Lifetime)</span>
                  </div>
                </div>
              </div>

              {/* Totals Comparison Summary Bar */}
              <div className="pt-2 border-t-2 border-black flex items-center justify-between bg-surface-container p-2.5 rounded-xl border">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[9px] uppercase font-bold text-red-700">Old Windows POS</span>
                  <span className="font-headline-sm text-sm font-black text-red-600 line-through">
                    ₹{auditTotalLegacy.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-base font-black text-on-surface">➔</span>
                <div className="flex flex-col text-right">
                  <span className="font-label-sm text-[9px] uppercase font-bold text-green-700">Paros Cafe OS</span>
                  <span className="font-headline-sm text-base font-black text-secondary">
                    ₹4,999 / yr
                  </span>
                </div>
              </div>
            </div>

            {/* BOLD HIGHLIGHT SAVINGS BANNER */}
            <div
              className={`p-4 rounded-2xl bg-[#fef08a] border-2 border-black retro-shadow-lg flex flex-col gap-2 text-black transition-all ${
                savingsCardPop ? 'scale-pop' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce" style={{ animationDuration: '2s' }}>
                  🎉
                </span>
                <h3 className="font-headline-sm text-base font-black">
                  You Save ₹{auditSavings.toLocaleString('en-IN')} in Year 1 with Paros!
                </h3>
              </div>
              <p className="font-body-sm text-xs leading-relaxed text-stone-800">
                Reinvest your hard-earned money into high-grade single origin beans, barista salary incentives, or opening
                your second coffee outpost.
              </p>
              <button
                className="mt-2 py-3 px-4 rounded-xl bg-black text-white font-label-md text-xs font-black flex items-center justify-center gap-2 neo-press"
                onClick={() => {
                  const el = document.getElementById('pricing-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Switch to Paros &amp; Save Today</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </section>

          {/* ══ 5. ENGINEERED FOR SUNDAY BRUNCH RUSHES (FEATURE MATRIX) ══ */}
          <section className="px-margin-mobile py-8 bg-surface border-t-2 border-black flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-md bg-secondary-container text-on-secondary-container border border-black font-label-sm uppercase font-bold text-[10px]">
                Speed Without Chaos
              </span>
              <h2 className="font-headline-md text-headline-sm font-black text-on-surface">
                Engineered for Sunday Brunch Rushes
              </h2>
              <p className="font-body-sm text-on-surface-variant">
                Built by former hospitality operators who know what happens when 40 tickets arrive at once.
              </p>
            </div>

            {/* 4 Modular Cards - Mobile-optimized horizontal layout */}
            <div className="flex flex-col gap-3">
              {/* Feature 1 */}
              <div
                className="p-3.5 rounded-xl bg-surface-container-lowest border-2 border-black retro-shadow flex gap-3 items-start neo-press cursor-pointer"
                onClick={() =>
                  showToast('Universal QR: 1 QR print handles dining, takeaways, & room service')
                }
              >
                <div className="w-10 h-10 rounded-lg bg-tertiary-fixed border border-black flex items-center justify-center text-on-tertiary-fixed shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <h3 className="font-headline-sm text-sm font-black text-on-surface">Universal Single Table QR</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    Print 1 QR artwork for your entire cafe. Eliminates rogue table stickers, card damages, and order confusion.
                  </p>
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">verified</span> Zero hardware reprint costs
                  </span>
                </div>
              </div>

              {/* Feature 2 */}
              <div
                className="p-3.5 rounded-xl bg-surface-container-lowest border-2 border-black retro-shadow flex gap-3 items-start neo-press cursor-pointer"
                onClick={() =>
                  showToast('ETA updates ping customer phones silently without loud kitchen shouting')
                }
              >
                <div className="w-10 h-10 rounded-lg bg-secondary-container border border-black flex items-center justify-center text-on-secondary-container shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl">hourglass_top</span>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <h3 className="font-headline-sm text-sm font-black text-on-surface">1-Tap Chef ETA Countdowns</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    Barista slammed with manual pour-overs? Tap +5m on the KDS tablet. Diner phones update live with brew times.
                  </p>
                  <span className="text-[10px] font-bold text-secondary flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">sentiment_very_satisfied</span> Cuts customer inquiries by 90%
                  </span>
                </div>
              </div>

              {/* Feature 3 */}
              <div
                className="p-3.5 rounded-xl bg-surface-container-lowest border-2 border-black retro-shadow flex gap-3 items-start neo-press cursor-pointer"
                onClick={() => showToast('Official WhatsApp Business API with zero paper waste')}
              >
                <div className="w-10 h-10 rounded-lg bg-primary-fixed border border-black flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl">receipt_long</span>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <h3 className="font-headline-sm text-sm font-black text-on-surface">100% Paperless WhatsApp Bills</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    GST-compliant PDF tax invoices pinged via WhatsApp in &lt;1 second. Automatically captures customer phone for CRM.
                  </p>
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">forest</span> Zero chemical BPA thermal receipt pollution
                  </span>
                </div>
              </div>

              {/* Feature 4 */}
              <div
                className="p-3.5 rounded-xl bg-surface-container-lowest border-2 border-black retro-shadow flex gap-3 items-start neo-press cursor-pointer"
                onClick={() =>
                  showToast('Register lock prevents drawer opening without manager 4-digit PIN')
                }
              >
                <div className="w-10 h-10 rounded-lg bg-surface-container-highest border border-black flex items-center justify-center text-on-surface shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl">lock_clock</span>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <h3 className="font-headline-sm text-sm font-black text-on-surface">Shift Cash Lock &amp; Spot Petty Audit</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    Opening float check, mid-day dairy runs, and end-of-day register drawer reconciliation. Instant mismatch alerts.
                  </p>
                  <span className="text-[10px] font-bold text-on-surface flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">shield</span> Eliminates till pilferage on night shifts
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ══ 6. HONEST, INDIE-FRIENDLY PRICING ══ */}
          <section
            className="px-margin-mobile py-8 bg-surface-container-low border-t-2 border-black flex flex-col gap-5"
            id="pricing-section"
          >
            <div className="flex flex-col gap-1.5 text-center items-center">
              <span className="px-3 py-0.5 rounded-full bg-surface-container-highest border border-black font-label-sm uppercase font-bold text-[10px]">
                Transparent Pricing
              </span>
              <h2 className="font-headline-md text-headline-sm font-black text-on-surface">
                Honest, Indie-Friendly Pricing
              </h2>
              <p className="font-body-sm text-on-surface-variant">
                No upfront capital expenditure. Cancel whenever you want in 1 click.
              </p>

              {/* Billing Toggle: Monthly vs Annual with pill slide */}
              <div className="mt-3 inline-flex p-1 rounded-xl bg-surface-container-highest border-2 border-black retro-shadow-sm items-center relative">
                <button
                  className={`py-1.5 px-4 rounded-lg font-label-sm text-xs font-bold transition-all z-10 neo-press ${
                    billingPeriod === 'monthly' ? 'bg-black text-white' : 'bg-transparent text-on-surface'
                  }`}
                  onClick={() => toggleBilling('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`py-1.5 px-3 rounded-lg font-label-sm text-xs font-bold transition-all z-10 flex items-center gap-1 neo-press ${
                    billingPeriod === 'annual' ? 'bg-black text-white' : 'bg-transparent text-on-surface'
                  }`}
                  onClick={() => toggleBilling('annual')}
                >
                  <span>Annual</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-300 text-stone-900 text-[10px] font-black border border-black/30">
                    2 Mo Free ★
                  </span>
                </button>
              </div>

              {/* Plan Switcher Tabs (Silver vs Gold) to eliminate ~500px vertical stack */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container-highest border-2 border-black retro-shadow-sm gap-1 w-full max-w-xs mx-auto mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanTab('silver')}
                  className={`py-2 px-2.5 rounded-lg font-label-sm text-xs font-black transition-all flex flex-col items-center justify-center neo-press ${
                    selectedPlanTab === 'silver'
                      ? 'bg-black text-white retro-shadow-xs'
                      : 'bg-transparent text-on-surface hover:bg-black/5'
                  }`}
                >
                  <span>Silver Plan</span>
                  <span className="text-[10px] font-normal opacity-85">
                    {billingPeriod === 'annual' ? '₹4,999/yr' : '₹499/mo'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlanTab('gold')}
                  className={`py-2 px-2.5 rounded-lg font-label-sm text-xs font-black transition-all flex flex-col items-center justify-center neo-press ${
                    selectedPlanTab === 'gold'
                      ? 'bg-primary text-white retro-shadow-xs'
                      : 'bg-transparent text-on-surface hover:bg-black/5'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>Gold Plan</span>
                    <span className="text-amber-300">★</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90">
                    {billingPeriod === 'annual' ? '₹8,499/yr' : '₹799/mo'}
                  </span>
                </button>
              </div>
            </div>

            {/* Selected Pricing Card */}
            <div className="pt-1">
              {selectedPlanTab === 'silver' ? (
                /* PLAN 1: Silver Plan */
                <div className="p-5 rounded-2xl bg-surface-container-lowest border-2 border-black retro-shadow flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-label-sm text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Quick Counter &amp; Bakery
                      </span>
                      <h3 className="font-headline-sm text-xl font-black text-on-surface">Silver Plan</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container border border-black text-on-surface font-label-sm text-[10px] font-bold">
                      Takeaway
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-headline-md text-3xl font-black text-on-surface transition-all duration-200 ${
                        pricePop ? 'scale-pop' : ''
                      }`}
                    >
                      {billingPeriod === 'annual' ? '₹4,999' : '₹499'}
                    </span>
                    <span className="font-body-sm text-xs text-on-surface-variant font-semibold">
                      {billingPeriod === 'annual' ? '/ year' : '/ month'}
                    </span>
                  </div>

                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    Ideal for takeaway espresso bars, bakeries, food trucks, and cloud kitchens.
                  </p>

                  {/* Feature Checklist */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-outline-variant text-xs text-on-surface">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>Unlimited orders &amp; menu items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>WhatsApp GST billing included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>1 Kitchen KDS screen terminal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>Offline-first Progressive Web App (PWA)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>Shift cash lock &amp; spot petty cash audits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>1 Counter Register login</span>
                    </div>
                  </div>

                  <Link
                    href="/onboarding"
                    onClick={() =>
                      showToast('⚡ Silver 14-day free trial activated! Ready in under 180s.')
                    }
                    className="w-full py-3 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-2 border-black retro-shadow-sm font-label-md text-xs font-black flex items-center justify-center gap-1 neo-press"
                  >
                    <span>Start 14-Day Free Trial</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanTab('gold');
                      showToast('Switched to Gold Plan details');
                    }}
                    className="text-center text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1 pt-1"
                  >
                    <span>Need Table QR &amp; Dine-In? View Gold Plan ({billingPeriod === 'annual' ? '₹8,499/yr' : '₹799/mo'})</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              ) : (
                /* PLAN 2: Gold Plan (Highlight) */
                <div className="p-5 rounded-2xl bg-[#fff8ee] border-2 border-black retro-shadow-lg flex flex-col gap-4 relative overflow-hidden">
                  {/* Most Loved Ribbon */}
                  <div className="absolute -right-12 top-6 bg-primary text-white text-[10px] font-black uppercase tracking-widest py-1 px-12 rotate-45 border-y border-black">
                    Top Pick
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider">
                        Full Dine-In &amp; Brewpub
                      </span>
                      <h3 className="font-headline-sm text-xl font-black text-on-surface">Gold Plan</h3>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-headline-md text-3xl font-black text-primary transition-all duration-200 ${
                        pricePop ? 'scale-pop' : ''
                      }`}
                    >
                      {billingPeriod === 'annual' ? '₹8,499' : '₹799'}
                    </span>
                    <span className="font-body-sm text-xs text-on-surface-variant font-semibold">
                      {billingPeriod === 'annual' ? '/ year' : '/ month'}
                    </span>
                  </div>

                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    For seated specialty cafes, bistros, roasteries, and multi-floor craft spaces.
                  </p>

                  {/* Feature Checklist */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-primary/30 text-xs text-on-surface">
                    <div className="font-label-sm text-[11px] font-black text-primary uppercase tracking-wider pb-1">
                      EVERYTHING IN SILVER, PLUS:
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span className="font-bold">Universal Single Table QR ordering</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>Interactive floor plan &amp; occupancy map</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>Dynamic Chef ETA countdown on diner mobile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>Multi-device sync (Counter + Barista + Runner)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>Automated Google Review Collector via WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                      <span>Priority WhatsApp VIP Founder Support (24/7)</span>
                    </div>
                  </div>

                  <Link
                    href="/onboarding"
                    onClick={() =>
                      showToast('⚡ Gold Plan VIP concierge trial started! Support ping sent.')
                    }
                    className="w-full py-3.5 px-4 rounded-xl bg-primary text-white border-2 border-black retro-shadow font-label-md text-xs font-black flex items-center justify-center gap-2 neo-press"
                  >
                    <span>Start 14-Day Free Trial</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanTab('silver');
                      showToast('Switched to Silver Plan details');
                    }}
                    className="text-center text-xs font-bold text-on-surface-variant hover:underline flex items-center justify-center gap-1 pt-1"
                  >
                    <span>Running Takeaway Counter only? View Silver Plan ({billingPeriod === 'annual' ? '₹4,999/yr' : '₹499/mo'})</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>

            {/* Guarantees Footer Strip */}
            <div className="p-3 rounded-xl bg-surface-container-highest border border-black flex flex-wrap items-center justify-around gap-2 text-center text-[11px] font-bold text-on-surface-variant">
              <span>Zero Hardware Lock-In</span>
              <span>•</span>
              <span>Zero Setup Fees</span>
              <span>•</span>
              <span>0% UPI Commission</span>
              <span>•</span>
              <span>1-Click Cancel</span>
            </div>
          </section>

          {/* ══ 7. VOICES FROM THE COFFEE BAR (INTERACTIVE REVIEWS) ══ */}
          <section className="px-margin-mobile py-8 bg-surface border-t-2 border-black flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-md bg-tertiary-fixed text-on-tertiary-fixed border border-black font-label-sm uppercase font-bold text-[10px]">
                Real Cafe Stories
              </span>
              <h2 className="font-headline-md text-headline-sm font-black text-on-surface">
                “We Threw Out Our Windows Terminal.”
              </h2>
              <p className="font-body-sm text-on-surface-variant">
                How indie cafe owners dumped legacy hardware and never looked back.
              </p>
            </div>

            {/* Review Operator Avatar Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {REVIEWS_DATA.map((rev, idx) => (
                <button
                  key={rev.name}
                  className={`rev-tab px-3 py-2 rounded-xl border border-black font-label-sm text-xs font-bold shrink-0 flex items-center gap-2 transition-all neo-press ${
                    currentReviewIdx === idx
                      ? 'bg-black text-white'
                      : 'bg-surface-container text-on-surface'
                  }`}
                  onClick={() => switchReview(idx)}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold ${
                      idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-secondary' : 'bg-tertiary'
                    }`}
                  >
                    {rev.initials}
                  </span>
                  <span>{rev.name.split(' ')[0]} • {rev.role.split('• ')[1]?.split(',')[0] || 'Indie'}</span>
                </button>
              ))}
            </div>

            {/* Review Card Display Box with Smooth Transition */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border-2 border-black retro-shadow flex flex-col gap-3 min-h-[220px] justify-between transition-all duration-300">
              <div className="flex flex-col gap-2.5">
                {/* 5 Star Rating */}
                <div className="flex text-amber-500 gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className="material-symbols-outlined text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>

                <p
                  className={`font-body-md text-xs sm:text-sm text-on-surface italic leading-relaxed transition-opacity duration-200 ${
                    reviewFade ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  “{REVIEWS_DATA[currentReviewIdx].quote}”
                </p>
              </div>

              <div className="pt-3 border-t border-black/10 flex items-center justify-between">
                <div>
                  <div className="font-label-md text-xs font-black text-on-surface">
                    {REVIEWS_DATA[currentReviewIdx].name}
                  </div>
                  <div className="font-label-sm text-[11px] text-on-surface-variant">
                    {REVIEWS_DATA[currentReviewIdx].role}
                  </div>
                </div>

                {/* Next / Prev Controls & Dots */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {REVIEWS_DATA.map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full inline-block transition-all ${
                          currentReviewIdx === i ? 'bg-black' : 'bg-black/20'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1.5 ml-1">
                    <button
                      aria-label="Previous review"
                      className="w-8 h-8 rounded-lg bg-surface-container border border-black flex items-center justify-center neo-press active:scale-95"
                      onClick={prevReview}
                    >
                      <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>
                    <button
                      aria-label="Next review"
                      className="w-8 h-8 rounded-lg bg-surface-container border border-black flex items-center justify-center neo-press active:scale-95"
                      onClick={nextReview}
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══ 8. HIGH-IMPACT READY TO DUMP CALLOUT ══ */}
          <section className="px-margin-mobile py-8 bg-surface-container">
            <div className="p-6 rounded-2xl bg-primary text-white border-2 border-black retro-shadow-lg flex flex-col gap-4">
              <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-black text-white font-label-sm uppercase font-bold text-[10px] tracking-wider border border-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse inline-block" />
                ⚡ READY IN UNDER 180 SECONDS
              </div>
              <h2 className="font-headline-lg-mobile text-2xl font-black leading-tight">
                Ready to dump your bulky POS terminal once and for all?
              </h2>
              <p className="font-body-md text-xs text-white/90 leading-relaxed">
                Join 150+ forward-thinking cafe owners. No hardware purchases, zero setup fees, and your tablet or phone
                is all you need.
              </p>
              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href="/onboarding"
                  onClick={() =>
                    showToast('🎉 Free trial starting! Launching fast setup wizard...')
                  }
                  className="w-full py-4 px-5 rounded-xl bg-white text-stone-900 border-2 border-black retro-shadow font-label-md text-sm font-black flex items-center justify-center gap-2 neo-press"
                >
                  <span>Start 14-Day Free Trial</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <button
                  className="w-full py-3 px-5 rounded-xl bg-black/20 hover:bg-black/30 text-white border-2 border-white/40 font-label-md text-xs font-bold flex items-center justify-center gap-2 neo-press"
                  onClick={() => showToast('📅 Live screen tour booked for today at 4:30 PM')}
                >
                  <span>📅 Book 5-Min Live Screen Tour</span>
                </button>
              </div>
              <div className="text-center font-label-sm text-[10px] text-white/75 font-semibold">
                Setup takes under 3 minutes • Instant WhatsApp onboarding assistance
              </div>
            </div>
          </section>

          {/* ══ 9. FREQUENTLY ASKED QUESTIONS (EXPANDABLE ACCORDIONS) ══ */}
          <section className="px-margin-mobile py-8 bg-surface border-t-2 border-black flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm uppercase tracking-wider text-primary font-bold text-[11px]">No Secrets</span>
              <h2 className="font-headline-md text-headline-sm font-black text-on-surface">Frequently Asked Questions</h2>
            </div>

            <div className="flex flex-col gap-3">
              {/* FAQ 1 */}
              <div className="rounded-xl border-2 border-black bg-surface-container-lowest overflow-hidden retro-shadow-sm transition-all">
                <button
                  className="w-full p-3.5 text-left flex justify-between items-center gap-2 font-label-md text-xs font-bold text-on-surface neo-press"
                  onClick={() => toggleFaq(1)}
                >
                  <span>Do UPI payments go directly to my own bank account?</span>
                  <span
                    className={`material-symbols-outlined text-primary text-xl transition-transform duration-200 ${
                      openFaq === 1 ? 'rotate-90' : 'rotate-0'
                    }`}
                  >
                    {openFaq === 1 ? 'close' : 'add'}
                  </span>
                </button>
                {openFaq === 1 && (
                  <div className="px-3.5 pb-3.5 pt-1 text-xs text-on-surface-variant border-t border-dashed border-outline-variant leading-relaxed">
                    Yes, 100%! We connect directly to your merchant VPA (BHIM, Pine Labs, Razorpay, or ICICI/HDFC bank
                    QR). Payments never sit in an intermediary wallet. Money hits your current account in real time with
                    0% gateway commission.
                  </div>
                )}
              </div>

              {/* FAQ 2 */}
              <div className="rounded-xl border-2 border-black bg-surface-container-lowest overflow-hidden retro-shadow-sm transition-all">
                <button
                  className="w-full p-3.5 text-left flex justify-between items-center gap-2 font-label-md text-xs font-bold text-on-surface neo-press"
                  onClick={() => toggleFaq(2)}
                >
                  <span>What happens if our cafe Wi-Fi goes down during a rush?</span>
                  <span
                    className={`material-symbols-outlined text-primary text-xl transition-transform duration-200 ${
                      openFaq === 2 ? 'rotate-90' : 'rotate-0'
                    }`}
                  >
                    {openFaq === 2 ? 'close' : 'add'}
                  </span>
                </button>
                {openFaq === 2 && (
                  <div className="px-3.5 pb-3.5 pt-1 text-xs text-on-surface-variant border-t border-dashed border-outline-variant leading-relaxed">
                    Paros operates as a local Progressive Web App (PWA). You can continue punching orders, sending kitchen
                    tickets to your KDS or Bluetooth printers, and managing tables offline. As soon as connectivity
                    returns, orders auto-sync seamlessly.
                  </div>
                )}
              </div>

              {/* FAQ 3 */}
              <div className="rounded-xl border-2 border-black bg-surface-container-lowest overflow-hidden retro-shadow-sm transition-all">
                <button
                  className="w-full p-3.5 text-left flex justify-between items-center gap-2 font-label-md text-xs font-bold text-on-surface neo-press"
                  onClick={() => toggleFaq(3)}
                >
                  <span>Can I still print paper receipts if an older customer insists?</span>
                  <span
                    className={`material-symbols-outlined text-primary text-xl transition-transform duration-200 ${
                      openFaq === 3 ? 'rotate-90' : 'rotate-0'
                    }`}
                  >
                    {openFaq === 3 ? 'close' : 'add'}
                  </span>
                </button>
                {openFaq === 3 && (
                  <div className="px-3.5 pb-3.5 pt-1 text-xs text-on-surface-variant border-t border-dashed border-outline-variant leading-relaxed">
                    Absolutely. You can pair any standard Bluetooth, USB, or LAN thermal receipt printer in 1 tap. Paros
                    supports ESC/POS protocol without needing any proprietary Windows print drivers.
                  </div>
                )}
              </div>

              {/* FAQ 4 */}
              <div className="rounded-xl border-2 border-black bg-surface-container-lowest overflow-hidden retro-shadow-sm transition-all">
                <button
                  className="w-full p-3.5 text-left flex justify-between items-center gap-2 font-label-md text-xs font-bold text-on-surface neo-press"
                  onClick={() => toggleFaq(4)}
                >
                  <span>How long does cafe menu setup take?</span>
                  <span
                    className={`material-symbols-outlined text-primary text-xl transition-transform duration-200 ${
                      openFaq === 4 ? 'rotate-90' : 'rotate-0'
                    }`}
                  >
                    {openFaq === 4 ? 'close' : 'add'}
                  </span>
                </button>
                {openFaq === 4 && (
                  <div className="px-3.5 pb-3.5 pt-1 text-xs text-on-surface-variant border-t border-dashed border-outline-variant leading-relaxed">
                    Under 3 minutes! You can upload an Excel sheet, take a photo of your printed chalkboard menu for our
                    team to digitize, or pick from our curated specialty cafe preset templates.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══ 10. PREMIUM FOOTER ══ */}
          <footer className="px-margin-mobile pt-8 pb-12 bg-[#1c1917] text-white border-t-2 border-black flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white border border-white/20">
                  <span className="material-symbols-outlined text-xl">restaurant</span>
                </div>
                <span className="font-headline-sm text-xl font-black tracking-tight text-white">Paros</span>
              </div>
              <p className="font-body-sm text-xs text-stone-400 font-medium">
                Table se Kitchen tak. Bas Paros. The modern cloud POS built for passionate Indian coffee roasters and
                culinary creators.
              </p>
              <div className="inline-flex items-center gap-2 text-[11px] font-mono text-[#22c55e] mt-1">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span>99.99% Cloud SLA • Built for Indie Food Hustlers</span>
              </div>
            </div>

            {/* Categorized Links Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-stone-800">
              <div className="flex flex-col gap-2">
                <span className="font-label-sm font-bold uppercase text-[10px] tracking-wider text-[#e05d38]">
                  Product
                </span>
                <a className="text-stone-400 hover:text-white transition-colors" href="#os-interactive-demo">
                  Counter Billing
                </a>
                <a className="text-stone-400 hover:text-white transition-colors" href="#os-interactive-demo">
                  Barista KDS
                </a>
                <a className="text-stone-400 hover:text-white transition-colors" href="#os-interactive-demo">
                  Single Table QR
                </a>
                <a className="text-stone-400 hover:text-white transition-colors" href="#pricing-section">
                  Pricing Plans
                </a>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-label-sm font-bold uppercase text-[10px] tracking-wider text-[#e05d38]">
                  Operations
                </span>
                <a className="text-stone-400 hover:text-white transition-colors" href="#calculator-section">
                  Petpooja Migration
                </a>
                <a className="text-stone-400 hover:text-white transition-colors" href="#calculator-section">
                  Thermal Printer Setup
                </a>
                <a className="text-stone-400 hover:text-white transition-colors" href="#os-interactive-demo">
                  Offline PWA Engine
                </a>
                <a className="text-stone-400 hover:text-white transition-colors" href="#pricing-section">
                  GST WhatsApp Invoicing
                </a>
              </div>
            </div>

            {/* Copyright & Disclaimer */}
            <div className="pt-4 border-t border-stone-800 flex flex-col gap-2 text-[10px] text-stone-500">
              <div>© 2025 Paros Technologies Pvt. Ltd. Crafted with ❤️ for Indian Independent Cafes.</div>
              <div className="font-semibold text-stone-400">
                Zero Hardware Guarantee. All trademarks referenced belong to their respective owners.
              </div>
            </div>
          </footer>
        </div>

        {/* ══ FLOATING TACTILE TOAST NOTIFICATION CONTAINER ══ */}
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm pointer-events-none transition-all duration-300 ${
            toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-[10px]'
          }`}
        >
          <div className="p-3 rounded-xl bg-black text-white border-2 border-white/20 retro-shadow-sm flex items-center gap-2.5 text-xs font-bold shadow-xl">
            <span className="material-symbols-outlined text-secondary text-lg">{toast.icon}</span>
            <span className="leading-tight">{toast.message}</span>
          </div>
        </div>
      </main>

      {/* ══ FIXED BOTTOM NAVIGATION BAR ══ */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.05)] border-t border-black/10">
        <div className="flex items-center justify-around h-16 px-space-xs">
          <button
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors neo-press ${
              activeNav === 'home' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => handleNavClick('home', null)}
          >
            <span className="material-symbols-outlined text-[22px]">storefront</span>
            <span className="font-label-sm text-[11px] mt-0.5">Home</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors neo-press ${
              activeNav === 'os-demo' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => handleNavClick('os-demo', 'os-interactive-demo')}
          >
            <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
            <span className="font-label-sm text-[11px] mt-0.5">OS Demo</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors neo-press ${
              activeNav === 'calculator' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => handleNavClick('calculator', 'calculator-section')}
          >
            <span className="material-symbols-outlined text-[22px]">calculate</span>
            <span className="font-label-sm text-[11px] mt-0.5">Calculator</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors neo-press ${
              activeNav === 'plans' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => handleNavClick('plans', 'pricing-section')}
          >
            <span className="material-symbols-outlined text-[22px]">local_offer</span>
            <span className="font-label-sm text-[11px] mt-0.5">Plans</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
