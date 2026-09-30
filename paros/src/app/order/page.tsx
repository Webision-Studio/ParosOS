'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { subscribeToPush } from '@/lib/push-subscribe';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  milk?: string;
  notes?: string;
}

interface MenuItemData {
  id: string;
  name: string;
  price: number;
  description?: string;
  isVeg?: boolean;
  category?: { name: string };
}

export default function TableQrOrderPage() {
  // 5 Steps: 1 = Table Picker, 2 = Menu, 3 = Customer Details, 4 = Cart & UPI, 5 = Live ETA Tracker
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);

  // Table selection
  const [selectedTable, setSelectedTable] = useState<string>('1');
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [isCounterOnlyCafe, setIsCounterOnlyCafe] = useState(false);
  const [availableTables, setAvailableTables] = useState<string[]>(['1', '2', '3', '4', '5', '6', '7', '8']);
  const [cafeName, setCafeName] = useState<string>('Artisan Roastery');
  const [cafeInfo, setCafeInfo] = useState<{
    id?: string;
    name?: string;
    googleReviewUrl?: string | null;
    wifiName?: string | null;
    wifiPassword?: string | null;
  } | null>(null);

  // Google Review Nudge & Wi-Fi States
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [privateFeedback, setPrivateFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [wifiCopied, setWifiCopied] = useState(false);

  // Customizer modal
  const [customizingItem, setCustomizingItem] = useState<{
    name: string;
    price: number;
    desc: string;
  } | null>(null);
  const [selectedMilk, setSelectedMilk] = useState<'whole' | 'oat'>('oat');

  // Cart starts empty for a genuine customer experience
  const [cart, setCart] = useState<OrderItem[]>([]);

  // Promo Coupon State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Live Menu Items
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([
    { id: '1', name: 'Flat White', price: 220, description: 'Double ristretto espresso, velvety textured milk', isVeg: true, category: { name: 'Hot Coffee' } },
    { id: '2', name: 'Specialty Pour Over (Ratnagiri)', price: 260, description: 'Single origin washed Ratnagiri, floral citrus notes', isVeg: true, category: { name: 'Hot Coffee' } },
    { id: '3', name: 'Iced Oat Latte', price: 250, description: 'Chilled espresso, Minor Figures oat milk, clear ice', isVeg: true, category: { name: 'Iced Brews' } },
    { id: '4', name: 'Cold Brew with Tonic & Orange', price: 210, description: '18-hour cold steep with botanical tonic', isVeg: true, category: { name: 'Iced Brews' } },
    { id: '5', name: 'French Butter Croissant', price: 180, description: '27-layer flaky laminated French butter pastry', isVeg: true, category: { name: 'Bakery & Hearth' } },
    { id: '6', name: 'Wild Herb Sourdough Toast', price: 160, description: 'Cultured garlic herb butter on toasted sourdough', isVeg: true, category: { name: 'Artisanal Toast' } },
    { id: '7', name: 'Avocado & Danish Feta Toast', price: 280, description: 'Hass avocado mash, crumbled feta, chili flakes', isVeg: true, category: { name: 'Artisanal Toast' } },
  ]);

  // Order Result
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [placedOrderNumber, setPlacedOrderNumber] = useState('#1042');
  const [countdownSeconds, setCountdownSeconds] = useState(480); // 8 minutes
  const [orderStatus, setOrderStatus] = useState<'BREWING' | 'PLATING' | 'READY' | 'SERVED'>('BREWING');
  const [chefAddedEtaMessage, setChefAddedEtaMessage] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'UPI_NOW' | 'PAY_LATER'>('UPI_NOW');

  // Fetch live menu and tables from backend
  useEffect(() => {
    // Check if ?table=X was provided in URL (e.g. /order?table=3)
    let urlTable: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      urlTable = params.get('table');
      if (urlTable) {
        setSelectedTable(urlTable);
        setStep(2); // Jump straight to Menu for this table!
      }
    }

    fetch('/api/order')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.cafe?.name) setCafeName(data.cafe.name);
        if (data?.cafe) setCafeInfo(data.cafe);
        if (data?.menuItems?.length) setMenuItems(data.menuItems);

        const isCounterMode = data?.cafe?.qrMode === 'COUNTER_ONLY';
        let numbers: string[] = [];
        if (data?.tables?.length) {
          numbers = data.tables
            .map((t: { tableNumber: string }) => t.tableNumber)
            .filter((n: string) => n.toLowerCase() !== 'takeaway' && n.toLowerCase() !== 'counter');
        }

        if (isCounterMode || numbers.length === 0) {
          setIsCounterOnlyCafe(true);
          setIsTakeaway(true);
          setSelectedTable('Takeaway');
          setAvailableTables([]);
          setStep(2); // Jump straight to Menu for counter pickup!
        } else {
          setAvailableTables(numbers);
          if (!urlTable && numbers.length > 0) {
            setSelectedTable(numbers[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Cart Totals with Promo Discount
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedPromo ? Math.min(subtotal, appliedPromo.discountAmount) : 0;
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const gst = Math.round(taxableSubtotal * 0.05);
  const total = taxableSubtotal + gst;

  async function handleApplyPromo(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          code: promoCodeInput.trim().toUpperCase(),
          subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || 'Invalid promo code');
        setAppliedPromo(null);
      } else {
        setAppliedPromo(data);
        setPromoError(null);
      }
    } catch {
      setPromoError('Failed to validate coupon');
    } finally {
      setPromoLoading(false);
    }
  }

  // Live ETA & Kitchen Status Synchronization in Step 5
  useEffect(() => {
    if (step !== 5) return;

    // Local 1-second ticker for smooth visual countdown
    const localTicker = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        if (prev < 180) setOrderStatus('PLATING');
        return prev - 1;
      });
    }, 1000);

    // Live poller to sync ETA updates & Ready state from KDS
    let lastKnownPrepMinutes = 10;
    function pollLiveOrderStatus() {
      if (!placedOrderId && !placedOrderNumber) return;
      const query = placedOrderId
        ? `orderId=${placedOrderId}`
        : `orderNumber=${encodeURIComponent(placedOrderNumber)}`;
      fetch(`/api/order?${query}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.order) {
            const ord = data.order;
            if (ord.status === 'READY') {
              setOrderStatus('READY');
              setCountdownSeconds(0);
            } else if (ord.status === 'SERVED') {
              setOrderStatus('SERVED');
              setCountdownSeconds(0);
            } else {
              // Check if Chef pushed dynamic ETA (+5m / +10m)
              const dynamicMins = ord.dynamicPrepMinutes || 10;
              if (dynamicMins > lastKnownPrepMinutes) {
                const diff = dynamicMins - lastKnownPrepMinutes;
                setChefAddedEtaMessage(`⏱️ Kitchen rush update: Chef added +${diff}m to guarantee artisanal quality.`);
                lastKnownPrepMinutes = dynamicMins;
                setTimeout(() => setChefAddedEtaMessage(null), 6000);
              }
              const createdAtMs = new Date(ord.createdAt).getTime();
              const elapsedSecs = Math.floor((Date.now() - createdAtMs) / 1000);
              const remaining = Math.max(0, dynamicMins * 60 - elapsedSecs);
              setCountdownSeconds(remaining);
              if (remaining < 180) {
                setOrderStatus('PLATING');
              } else {
                setOrderStatus('BREWING');
              }
            }
          }
        })
        .catch(() => {});
    }

    pollLiveOrderStatus();
    const pollerInterval = setInterval(pollLiveOrderStatus, 2000);

    return () => {
      clearInterval(localTicker);
      clearInterval(pollerInterval);
    };
  }, [step, placedOrderId, placedOrderNumber]);

  function addToCartWithCustomization() {
    if (!customizingItem) return;
    const milkExtra = selectedMilk === 'oat' ? 40 : 0;
    const finalPrice = customizingItem.price + milkExtra;

    setCart((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        name: customizingItem.name,
        price: finalPrice,
        quantity: 1,
        milk: selectedMilk === 'oat' ? 'Minor Figures Oat Milk (+₹40)' : 'Whole Milk',
      },
    ]);
    setCustomizingItem(null);
  }

  function addQuickItem(item: MenuItemData) {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === item.name && !i.milk);
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: `c-${Date.now()}`,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes: item.category?.name || '',
        },
      ];
    });
  }

  async function handlePlaceOrder() {
    if (cart.length === 0) return;

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: isTakeaway ? 'Takeaway' : selectedTable,
          items: cart,
          total,
          paymentMode,
          customerName: customerName || `Guest Table ${selectedTable}`,
          customerPhone: customerPhone ? `+91 ${customerPhone}` : null,
          customerEmail: customerEmail || null,
          whatsappOptIn,
          couponCode: appliedPromo?.code || undefined,
          specialNotes: paymentMode === 'PAY_LATER' ? 'PAY LATER TO WAITER / COUNTER' : 'ONLINE PREPAID (UPI)',
        }),
      });
      const data = await res.json();
      if (data?.orderId || data?.order?.id) {
        setPlacedOrderId(data.orderId || data?.order?.id);
      }
      if (data?.orderNumber || data?.order?.orderNumber) {
        setPlacedOrderNumber(data.orderNumber || data?.order?.orderNumber);
      }
      if (data?.prepTimeMinutes || data?.order?.dynamicPrepMinutes) {
        setCountdownSeconds((data.prepTimeMinutes || data?.order?.dynamicPrepMinutes) * 60);
      }
    } catch {
      // Offline fallback
    }
    setStep(5);

    // Request push notification permission after order is placed
    // This triggers the browser "Allow Notifications?" prompt
    subscribeToPush().catch(() => {});
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Google Review Nudge & Private Feedback Submitter
  async function handleSelectRating(rating: number) {
    setSelectedRating(rating);
    try {
      await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-feedback',
          orderId: placedOrderId,
          rating,
          customerPhone: customerPhone ? `+91 ${customerPhone}` : null,
          cafeId: cafeInfo?.id,
        }),
      });
    } catch {
      // offline/silent fallback
    }

    if (rating >= 4) {
      if (cafeInfo?.googleReviewUrl) {
        window.open(cafeInfo.googleReviewUrl, '_blank');
      }
    }
  }

  async function handleSubmitPrivateFeedback() {
    if (!privateFeedback.trim() || !selectedRating) return;
    try {
      await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-feedback',
          orderId: placedOrderId,
          rating: selectedRating,
          feedbackText: privateFeedback.trim(),
          customerPhone: customerPhone ? `+91 ${customerPhone}` : null,
          cafeId: cafeInfo?.id,
        }),
      });
      setFeedbackSubmitted(true);
    } catch {
      setFeedbackSubmitted(true);
    }
  }

  const isEmailValid = !customerEmail.trim() || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(customerEmail.trim());

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex flex-col items-center select-none antialiased">
      {/* ── Mobile-Optimized Container Shell ── */}
      <div className="w-full max-w-[460px] flex flex-col min-h-screen bg-paros-cream border-x-2 border-espresso shadow-brutal-xl">
        {/* ── Top Brand Bar ── */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-md px-4 py-3 border-b-2 border-espresso z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-paros-orange text-white flex items-center justify-center font-display font-black text-xs border-2 border-espresso shadow-brutal-sm">
              P
            </div>
            <div>
              <p className="font-display font-black text-sm text-espresso leading-none">
                {cafeName}
              </p>
              <p className="font-mono text-[9px] text-paros-matcha font-bold">
                {isCounterOnlyCafe ? '● Express Counter' : isTakeaway ? '● Takeaway Order' : '● Dine-In Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCounterOnlyCafe ? (
              <span className="px-2.5 py-1 bg-paros-mint border-2 border-espresso rounded-lg font-display text-xs font-black shadow-brutal-sm">
                ⚡ Token Order
              </span>
            ) : !isTakeaway ? (
              <span className="px-2.5 py-1 bg-paros-yellow border-2 border-espresso rounded-lg font-display text-xs font-black shadow-brutal-sm">
                Table {selectedTable}
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-paros-mint border-2 border-espresso rounded-lg font-display text-xs font-black shadow-brutal-sm">
                🛍️ Takeaway
              </span>
            )}
            <Link
              href="/pos"
              className="text-[10px] font-display font-bold uppercase underline text-espresso/60 hover:text-espresso"
            >
              POS Staff
            </Link>
          </div>
        </header>

        {/* ══ STEP 1: WHERE ARE YOU SITTING? ══ */}
        {step === 1 && (
          <div className="p-4 flex flex-col gap-4 flex-1">
            {isCounterOnlyCafe ? (
              <div className="bg-white p-6 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-3 text-center my-auto">
                <div className="w-14 h-14 rounded-2xl bg-paros-mint mx-auto flex items-center justify-center border-2 border-espresso shadow-brutal-sm text-3xl">
                  ⚡
                </div>
                <h1 className="font-display text-2xl font-black text-espresso tracking-tight">
                  Welcome to {cafeName}!
                </h1>
                <p className="font-body text-xs text-espresso/70">
                  We are an express counter service cafe. Order from your phone, pay via UPI, and pick up fresh with your live Token Number!
                </p>
                <button
                  onClick={() => setStep(2)}
                  className="brutal-btn mt-4 w-full py-4 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2"
                >
                  <span>Start Express Order ➔</span>
                </button>
              </div>
            ) : (
              <>
                {/* Callout */}
                <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-2">
                  <span className="sticker-badge inline-block bg-paros-yellow text-espresso border border-espresso px-2.5 py-0.5 rounded-full font-display text-[10px] font-black uppercase w-fit">
                    ⚡ Powered by Paros Mode A
                  </span>
                  <h1 className="font-display text-2xl font-black text-espresso tracking-tight">
                    Where are you sitting today?
                  </h1>
                  <p className="font-body text-xs text-espresso/70">
                    Check the stand on your table and select your number below.
                  </p>
                </div>

                {/* Table Number Grid */}
                <div className="grid grid-cols-4 gap-2.5">
                  {availableTables.map((tbl) => (
                    <button
                      key={tbl}
                      onClick={() => {
                        setSelectedTable(tbl);
                        setIsTakeaway(false);
                      }}
                      className={`py-3.5 rounded-2xl border-2 border-espresso flex flex-col items-center justify-center transition-all ${
                        selectedTable === tbl && !isTakeaway
                          ? 'bg-paros-orange text-white shadow-brutal scale-105'
                          : 'bg-white hover:bg-paros-yellow text-espresso shadow-brutal-sm'
                      }`}
                    >
                      <span className="font-display text-[10px] uppercase font-bold opacity-80">Table</span>
                      <span className="font-display text-2xl font-black">{tbl}</span>
                      <span className="text-[10px] opacity-70">🪑 4p</span>
                    </button>
                  ))}
                </div>

                {/* Takeaway Option */}
                <button
                  onClick={() => {
                    setIsTakeaway(true);
                    setSelectedTable('Takeaway');
                  }}
                  className={`p-3.5 rounded-2xl border-2 border-espresso flex items-center justify-between transition-all ${
                    isTakeaway
                      ? 'bg-paros-yellow shadow-brutal'
                      : 'bg-white hover:bg-paros-cream shadow-brutal-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛍️</span>
                    <div className="text-left">
                      <p className="font-display text-sm font-black text-espresso">Takeaway / Counter Pickup</p>
                      <p className="font-body text-[11px] text-espresso/70">Grab & go directly from barista</p>
                    </div>
                  </div>
                  <span className="text-xs font-display font-black bg-paros-mint px-2 py-0.5 rounded border border-espresso">
                    SKIP LINE
                  </span>
                </button>

                {/* Trust Pill */}
                <div className="mt-auto bg-white p-3 rounded-2xl border border-dashed border-espresso flex items-center justify-around text-center text-xs font-display font-bold">
                  <span>✓ No App Download</span>
                  <span>•</span>
                  <span>✓ WhatsApp Bill</span>
                  <span>•</span>
                  <span>✓ 0% Surcharge</span>
                </div>

                {/* Next CTA */}
                <button
                  onClick={() => setStep(2)}
                  className="brutal-btn w-full py-4 bg-espresso text-white font-display font-black text-sm uppercase rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2"
                >
                  <span>View Menu for Table {selectedTable} ➔</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* ══ STEP 2: MENU CATALOG & CUSTOMIZER ══ */}
        {step === 2 && (
          <div className="p-4 flex flex-col gap-4 flex-1">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-black text-espresso">
                  {isCounterOnlyCafe ? 'Express Counter Menu' : 'Artisanal Menu'}
                </h2>
                <p className="font-body text-xs text-espresso/70">
                  {isCounterOnlyCafe ? 'Freshly prepared for counter pickup' : 'Freshly roasted & baked in-house'}
                </p>
              </div>
              {!isCounterOnlyCafe ? (
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-display font-bold underline text-espresso/60"
                >
                  Change Table
                </button>
              ) : (
                <span className="text-[10px] font-display font-black uppercase px-2 py-0.5 rounded bg-paros-yellow border border-espresso">
                  Token Pickup
                </span>
              )}
            </div>

            {/* Items List */}
            <div className="flex flex-col gap-3">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">
                      {item.category?.name?.includes('Coffee')
                        ? '☕'
                        : item.category?.name?.includes('Iced')
                        ? '🧊'
                        : item.category?.name?.includes('Bakery')
                        ? '🥐'
                        : '🥪'}
                    </span>
                    <div>
                      <p className="font-display font-bold text-sm text-espresso">{item.name}</p>
                      {item.description && (
                        <p className="font-body text-xs text-espresso/70 line-clamp-1">{item.description}</p>
                      )}
                      <p className="font-display font-black text-sm text-espresso mt-1">₹{item.price}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        setCustomizingItem({
                          name: item.name,
                          price: item.price,
                          desc: item.description || '',
                        })
                      }
                      className="px-2 py-1.5 bg-paros-cream hover:bg-paros-yellow text-espresso font-display text-[11px] font-bold uppercase rounded-xl border border-espresso"
                      title="Customize milk / notes"
                    >
                      Custom
                    </button>
                    <button
                      onClick={() => addQuickItem(item)}
                      className="brutal-btn px-3 py-1.5 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm"
                    >
                      + ADD
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Floating Cart Bar */}
            {cart.length > 0 ? (
              <div className="sticky bottom-4 mt-auto bg-espresso text-white p-4 rounded-2xl border-2 border-espresso shadow-brutal-lg flex items-center justify-between">
                <div>
                  <p className="font-display font-black text-sm">{cart.length} Items in Cart</p>
                  <p className="font-mono text-xs text-white/70">₹{total} (Incl. GST)</p>
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="brutal-btn px-5 py-2.5 bg-paros-yellow text-espresso font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center gap-1"
                >
                  <span>Review Cart</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            ) : (
              <div className="mt-auto p-3 text-center bg-white rounded-2xl border border-dashed border-espresso font-display text-xs font-bold text-espresso/60">
                Your cart is empty. Tap &quot;+ ADD&quot; on any item to order!
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 3: CUSTOMER DETAILS ══ */}
        {step === 3 && (
          <div className="p-4 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-black text-espresso">Your Details</h2>
              <button
                onClick={() => setStep(2)}
                className="text-xs font-display font-bold underline text-espresso/60"
              >
                Back to Menu
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-display font-black text-lg text-espresso flex items-center gap-2">
                  <span>📋</span> Almost Done!
                </h3>
                <p className="font-body text-xs text-espresso/70">Help us serve you better</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-display font-bold text-sm text-espresso">Your Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Arjun"
                  className="w-full px-4 py-3 rounded-xl border-2 border-espresso bg-white font-body text-base focus:ring-2 focus:ring-paros-orange focus:border-paros-orange outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-display font-bold text-sm text-espresso">WhatsApp Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border-2 border-r-0 border-espresso bg-paros-cream text-espresso font-body text-base">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full px-4 py-3 rounded-r-xl border-2 border-espresso bg-white font-body text-base focus:ring-2 focus:ring-paros-orange focus:border-paros-orange outline-none"
                  />
                </div>
                <p className="font-body text-[10px] text-espresso/60 mt-1">Required for WhatsApp bill receipt</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-display font-bold text-sm text-espresso">Email (optional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="arjun@example.com"
                  className={`w-full px-4 py-3 rounded-xl border-2 font-body text-base outline-none transition-all ${
                    customerEmail.trim().length > 0
                      ? isEmailValid
                        ? 'border-emerald-600 bg-white focus:ring-2 focus:ring-emerald-500'
                        : 'border-red-500 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                      : 'border-espresso bg-white focus:ring-2 focus:ring-paros-orange'
                  }`}
                />
                {customerEmail.trim().length > 0 && (
                  <p
                    className={`font-body text-[11px] mt-1 flex items-center gap-1 ${
                      isEmailValid ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'
                    }`}
                  >
                    <span>{isEmailValid ? '✓' : '⚠️'}</span>
                    <span>
                      {isEmailValid
                        ? 'Digital tax receipt will be emailed automatically'
                        : 'Please enter a valid email address (e.g. name@domain.com)'}
                    </span>
                  </p>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={whatsappOptIn}
                    onChange={(e) => setWhatsappOptIn(e.target.checked)}
                    className="appearance-none w-5 h-5 border-2 border-espresso rounded bg-white checked:bg-paros-orange checked:border-paros-orange focus:outline-none"
                  />
                  {whatsappOptIn && (
                    <span className="absolute text-white pointer-events-none text-xs font-black">✓</span>
                  )}
                </div>
                <span className="font-body text-sm text-espresso font-medium">Send me offers on WhatsApp</span>
              </label>
            </div>

            <button
              onClick={() => {
                if (customerName.trim().length > 0 && isEmailValid) {
                  setStep(4);
                }
              }}
              disabled={!customerName.trim() || !isEmailValid}
              className={`brutal-btn mt-auto w-full py-4 font-display font-black text-sm uppercase rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2 ${
                !customerName.trim() || !isEmailValid
                  ? 'bg-espresso/40 text-white/60 cursor-not-allowed'
                  : 'bg-paros-orange text-white hover:bg-[#c84c28]'
              }`}
            >
              <span>Continue to Payment ➔</span>
            </button>
          </div>
        )}

        {/* ══ STEP 4: CART CHECKOUT & UPI PAY ══ */}
        {step === 4 && (
          <div className="p-4 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-black text-espresso">Order Summary</h2>
              <button
                onClick={() => setStep(2)}
                className="text-xs font-display font-bold underline text-espresso/60"
              >
                + Add More Items
              </button>
            </div>

            {/* Cart Items */}
            <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-3">
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between items-start pb-2 border-b border-dashed border-espresso/15">
                  <div>
                    <p className="font-display font-bold text-sm text-espresso">{item.name}</p>
                    {item.milk && <p className="font-body text-xs text-espresso/60">{item.milk}</p>}
                    {item.notes && <p className="font-body text-[11px] text-espresso/50">{item.notes}</p>}
                  </div>
                  <span className="font-display font-black text-sm text-espresso tabular-nums">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}

              {/* Promo Code Box */}
              <div className="pt-2 border-t border-dashed border-espresso/15">
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-300 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">confirmation_number</span>
                      <div>
                        <span className="font-mono font-black text-emerald-800">{appliedPromo.code}</span>
                        <span className="text-emerald-700 ml-1.5 font-bold">(-₹{appliedPromo.discountAmount})</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAppliedPromo(null); setPromoCodeInput(''); }}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Promo Code (e.g. WELCOME10)"
                        value={promoCodeInput}
                        onChange={(e) => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(null); }}
                        className="flex-1 px-3 py-2 bg-surface-container rounded-xl border border-espresso font-mono text-xs uppercase font-bold outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCodeInput.trim()}
                        className="px-4 py-2 bg-espresso text-white rounded-xl font-display font-black text-xs uppercase disabled:opacity-50"
                      >
                        {promoLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[11px] font-bold text-red-600">{promoError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Bill Math */}
              <div className="pt-2 font-mono text-xs flex flex-col gap-1 text-espresso/70">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Promo Discount ({appliedPromo?.code})</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Cafe GST (5%)</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t-2 border-dashed border-espresso/20 font-display font-black text-base text-espresso">
                  <span>Total Payable</span>
                  <span className="text-paros-orange text-xl">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* ── Payment Mode Selector (UPI Now vs Pay Later) ── */}
            <div className="flex flex-col gap-2.5">
              <p className="font-display text-xs font-black uppercase text-espresso tracking-wide">
                Choose Payment Option:
              </p>

              {/* Option 1: Pay via UPI Now */}
              <button
                type="button"
                onClick={() => setPaymentMode('UPI_NOW')}
                className={`p-3.5 rounded-2xl border-2 border-espresso text-left transition-all flex items-center justify-between ${
                  paymentMode === 'UPI_NOW'
                    ? 'bg-paros-mint shadow-brutal ring-2 ring-espresso scale-[1.01]'
                    : 'bg-white hover:bg-paros-cream shadow-brutal-sm opacity-85'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white border-2 border-espresso flex items-center justify-center font-black text-lg text-emerald-800 shadow-sm shrink-0">
                    📱
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-sm text-espresso">
                        Pay via UPI Now
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-white text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-400">
                        0% Surcharge
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-espresso/70 mt-0.5">
                      GPay • PhonePe • Paytm • CRED
                    </p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 border-espresso flex items-center justify-center shrink-0 ${
                    paymentMode === 'UPI_NOW' ? 'bg-emerald-600 text-white' : 'bg-white'
                  }`}
                >
                  {paymentMode === 'UPI_NOW' && <span className="text-[12px] font-black">✓</span>}
                </div>
              </button>

              {/* UPI Quick App Link / ID (shown when UPI selected) */}
              {paymentMode === 'UPI_NOW' && (
                <div className="bg-white p-3 rounded-xl border-2 border-dashed border-emerald-600 flex items-center justify-between text-xs animate-in slide-in-from-top-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-mono text-espresso font-semibold">
                      UPI ID: <span className="font-bold text-emerald-850">artisan@okhdfcbank</span>
                    </span>
                  </div>
                  <a
                    href={`upi://pay?pa=artisan@okhdfcbank&pn=ArtisanRoastery&am=${total}&cu=INR`}
                    className="px-2.5 py-1 bg-emerald-600 text-white font-display text-[10px] font-black uppercase rounded-lg border border-espresso hover:bg-emerald-700"
                  >
                    Open UPI App ↗
                  </a>
                </div>
              )}

              {/* Option 2: Order Now & Pay Later */}
              <button
                type="button"
                onClick={() => setPaymentMode('PAY_LATER')}
                className={`p-3.5 rounded-2xl border-2 border-espresso text-left transition-all flex items-center justify-between ${
                  paymentMode === 'PAY_LATER'
                    ? 'bg-paros-yellow shadow-brutal ring-2 ring-espresso scale-[1.01]'
                    : 'bg-white hover:bg-paros-cream shadow-brutal-sm opacity-85'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white border-2 border-espresso flex items-center justify-center font-black text-lg text-amber-900 shadow-sm shrink-0">
                    🍽️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-sm text-espresso">
                        {isCounterOnlyCafe ? 'Pay Cash / UPI at Counter' : 'Order Now & Pay Later'}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-white text-amber-900 px-1.5 py-0.5 rounded border border-amber-400">
                        {isCounterOnlyCafe ? 'Counter Tab' : 'Dine-In Tab'}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-espresso/70 mt-0.5">
                      {isCounterOnlyCafe ? 'Pay cashier when collecting your token parcel' : 'Pay waiter at table or cashier before leaving'}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 border-espresso flex items-center justify-center shrink-0 ${
                    paymentMode === 'PAY_LATER' ? 'bg-amber-600 text-white' : 'bg-white'
                  }`}
                >
                  {paymentMode === 'PAY_LATER' && <span className="text-[12px] font-black">✓</span>}
                </div>
              </button>
            </div>

            {/* Confirm & Place Order */}
            <button
              onClick={handlePlaceOrder}
              disabled={cart.length === 0}
              className={`brutal-btn mt-auto w-full py-4 font-display font-black text-sm uppercase rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2 ${
                cart.length === 0
                  ? 'bg-espresso/40 text-white/60 cursor-not-allowed'
                  : paymentMode === 'UPI_NOW'
                  ? 'bg-paros-matcha text-white hover:bg-emerald-700'
                  : 'bg-paros-orange text-white hover:bg-[#c84c28]'
              }`}
            >
              {paymentMode === 'UPI_NOW' ? (
                <>
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                  <span>Pay ₹{total} via UPI & Fire to Kitchen ➔</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">restaurant</span>
                  <span>Fire to Kitchen (Pay Later ₹{total}) ➔</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ══ STEP 5: LIVE ETA TRACKER & COUNTDOWN ══ */}
        {step === 5 && (
          <div className="p-4 flex flex-col gap-4 flex-1 items-center text-center justify-center">
            {/* Prominent Pickup Token Card for Counter / Takeaway */}
            {(isCounterOnlyCafe || isTakeaway) && (
              <div className="w-full bg-paros-yellow p-4 rounded-3xl border-3 border-espresso shadow-brutal flex flex-col items-center animate-in zoom-in-95">
                <span className="font-display text-[10px] font-black uppercase tracking-widest text-espresso/70">
                  YOUR PICKUP TOKEN
                </span>
                <span className="font-display text-5xl font-black text-espresso my-1 tracking-tight">
                  {placedOrderNumber}
                </span>
                <span className="font-display text-xs font-bold text-espresso/80">
                  ⚡ Collect at Express Counter when called
                </span>
              </div>
            )}

            {/* Status Icon */}
            <div
              className={`w-20 h-20 rounded-full border-3 border-espresso flex items-center justify-center shadow-brutal-lg ${
                orderStatus === 'SERVED'
                  ? 'bg-paros-mint text-emerald-800'
                  : orderStatus === 'READY'
                  ? 'bg-paros-matcha text-white animate-bounce'
                  : 'bg-paros-cream text-espresso animate-pulse'
              }`}
            >
              <span className="text-3xl">
                {orderStatus === 'SERVED' ? '🍽️' : orderStatus === 'READY' ? '🛎️' : orderStatus === 'PLATING' ? '🥗' : '☕'}
              </span>
            </div>

            {/* Order Number & Table Badge */}
            <div>
              {!isCounterOnlyCafe && !isTakeaway && (
                <span className="px-3 py-1 bg-espresso text-white rounded-full font-mono text-xs font-bold">
                  Order {placedOrderNumber}
                </span>
              )}
              <h2 className="font-display text-2xl font-black text-espresso mt-2">
                {orderStatus === 'SERVED'
                  ? (isCounterOnlyCafe || isTakeaway ? 'Order Collected! Enjoy ☕' : 'Order Served! Enjoy your food ☕')
                  : orderStatus === 'READY'
                  ? (isCounterOnlyCafe || isTakeaway ? `🎉 TOKEN ${placedOrderNumber} IS READY!` : 'Your Order is Ready!')
                  : orderStatus === 'PLATING'
                  ? 'Packing & Garnishing'
                  : 'Brewing & Preparing'}
              </h2>
              <p className="font-body text-xs text-espresso/70 mt-1 max-w-xs">
                {orderStatus === 'SERVED'
                  ? (isCounterOnlyCafe || isTakeaway
                    ? 'Thank you for visiting! Tap below to start another order.'
                    : `Your order was delivered to Table ${selectedTable}. Need anything else? Just tap Add More Items below!`)
                  : orderStatus === 'READY'
                  ? (isCounterOnlyCafe || isTakeaway
                    ? 'Please collect your fresh parcel from the counter now!'
                    : `Server is bringing your fresh order to Table ${selectedTable} now.`)
                  : `Barista is crafting your order. Average wait time remaining:`}
              </p>
            </div>

            {/* Chef Dynamic ETA Alert Banner */}
            {chefAddedEtaMessage && (
              <div className="w-full bg-paros-yellow text-espresso p-3 rounded-2xl border-2 border-espresso shadow-brutal-sm font-display text-xs font-bold animate-in slide-in-from-top-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-orange text-[20px]">timer</span>
                <span>{chefAddedEtaMessage}</span>
              </div>
            )}

            {/* Live Countdown Display */}
            {orderStatus !== 'READY' && orderStatus !== 'SERVED' && (
              <div className="bg-white px-8 py-5 rounded-3xl border-3 border-espresso shadow-brutal-lg">
                <span className="font-mono text-5xl font-black text-paros-orange tabular-nums">
                  {formatTime(countdownSeconds)}
                </span>
                <p className="font-display text-[10px] uppercase font-bold text-espresso/60 tracking-wider mt-1">
                  Live Barista KDS Countdown
                </p>
              </div>
            )}

            {/* Order Items Preview */}
            <div className="w-full bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal text-left text-xs font-mono">
              <p className="font-display font-bold text-espresso mb-2">Order Items:</p>
              {cart.map((it, idx) => (
                <div key={idx} className="flex justify-between py-0.5 text-espresso/80">
                  <span>{it.quantity}x {it.name}</span>
                  <span className="font-bold">₹{it.price * it.quantity}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-dashed border-espresso/20 flex justify-between font-bold text-espresso">
                <span>{paymentMode === 'UPI_NOW' ? 'Paid via UPI:' : 'Due to Waiter / Counter:'}</span>
                <span className={paymentMode === 'UPI_NOW' ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>
                  ₹{total}
                </span>
              </div>
            </div>

            {/* Payment Mode Status Pill */}
            {paymentMode === 'PAY_LATER' ? (
              <div className="w-full bg-amber-100 text-amber-950 p-3 rounded-2xl border-2 border-espresso shadow-brutal-sm font-display text-xs font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-amber-700 text-[18px]">payments</span>
                <span>
                  {isCounterOnlyCafe || isTakeaway
                    ? `Counter Tab Active • Pay ₹${total} to cashier when collecting!`
                    : `Dine-In Tab Active • Pay ₹${total} to your waiter or at the counter!`}
                </span>
              </div>
            ) : (
              <div className="w-full bg-paros-mint text-emerald-950 p-3 rounded-2xl border-2 border-espresso shadow-brutal-sm font-display text-xs font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-[18px]">verified</span>
                <span>UPI Payment Received (₹{total}) • 0% Surcharge Applied!</span>
              </div>
            )}

            {/* Cafe Wi-Fi Access Card */}
            {cafeInfo?.wifiName && (
              <div className="w-full bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-paros-yellow border-2 border-espresso flex items-center justify-center text-espresso text-xl">
                    📶
                  </div>
                  <div className="text-left">
                    <p className="font-display font-black text-xs uppercase tracking-wider text-espresso">
                      Cafe High-Speed Wi-Fi
                    </p>
                    <p className="font-body text-xs text-espresso/80 font-bold">
                      SSID: <span className="font-mono text-espresso">{cafeInfo.wifiName}</span>
                    </p>
                    <p className="font-body text-[11px] text-espresso/60">
                      Pass: <span className="font-mono font-bold text-espresso">{cafeInfo.wifiPassword || 'None'}</span>
                    </p>
                  </div>
                </div>
                {cafeInfo.wifiPassword && (
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(cafeInfo.wifiPassword || '');
                        setWifiCopied(true);
                        setTimeout(() => setWifiCopied(false), 2000);
                      }
                    }}
                    className="px-3 py-2 bg-paros-cream hover:bg-paros-yellow text-espresso font-display text-xs font-bold uppercase rounded-xl border border-espresso transition-all"
                  >
                    {wifiCopied ? '✓ Copied' : 'Copy Key'}
                  </button>
                )}
              </div>
            )}

            {/* Google Review & Manager Feedback Card */}
            <div className="w-full bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal text-center flex flex-col gap-3">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">☕ ⭐</span>
                <h3 className="font-display font-black text-base text-espresso">
                  How was your experience today?
                </h3>
                <p className="font-body text-xs text-espresso/70">
                  Tap stars to rate your visit at {cafeName}
                </p>
              </div>

              {/* Star Rating Buttons */}
              <div className="flex justify-center gap-2 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleSelectRating(star)}
                    className={`w-10 h-10 rounded-xl border-2 border-espresso flex items-center justify-center text-xl transition-all ${
                      selectedRating && selectedRating >= star
                        ? 'bg-amber-400 text-espresso shadow-brutal-sm scale-105'
                        : 'bg-white hover:bg-amber-50 text-espresso/30'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              {/* 4 or 5 Stars: Google Review Call to Action */}
              {selectedRating && selectedRating >= 4 && (
                <div className="bg-paros-mint/40 border-2 border-espresso p-4 rounded-xl flex flex-col items-center gap-2 animate-in fade-in">
                  <span className="text-sm font-display font-black text-emerald-950">
                    🎉 Thank you for the love!
                  </span>
                  <p className="text-xs text-espresso/80">
                    Could you take 10 seconds to share your kind review on Google Maps? It helps our small cafe immensely!
                  </p>
                  {cafeInfo?.googleReviewUrl ? (
                    <a
                      href={cafeInfo.googleReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brutal-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-paros-orange text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal-sm mt-1"
                    >
                      <span>Post Review on Google Maps</span>
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-emerald-800">
                      ✓ Your 5-star rating has been recorded. Thank you!
                    </span>
                  )}
                </div>
              )}

              {/* 1 to 3 Stars: Private Manager Feedback Intercept */}
              {selectedRating && selectedRating <= 3 && (
                <div className="bg-red-50 border-2 border-espresso p-4 rounded-xl flex flex-col gap-2.5 text-left animate-in fade-in">
                  <p className="font-display font-bold text-xs text-red-950">
                    We are deeply sorry things were not 100% perfect.
                  </p>
                  <p className="font-body text-xs text-espresso/75">
                    Please tell our manager what went wrong so we can fix it for you right now:
                  </p>
                  {feedbackSubmitted ? (
                    <div className="p-3 bg-white rounded-lg border border-espresso text-center">
                      <p className="font-display font-black text-xs text-emerald-800">
                        ✓ Feedback delivered directly to the manager. Thank you for helping us improve!
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={privateFeedback}
                        onChange={(e) => setPrivateFeedback(e.target.value)}
                        placeholder="Tell us about the issue (e.g. food temperature, wait time, staff service)..."
                        rows={3}
                        className="w-full p-2.5 text-xs bg-white rounded-lg border-2 border-espresso outline-none focus:ring-2 focus:ring-paros-orange font-body"
                      />
                      <button
                        onClick={handleSubmitPrivateFeedback}
                        disabled={!privateFeedback.trim()}
                        className="brutal-btn py-2 bg-espresso text-white font-display font-bold text-xs uppercase rounded-xl border border-espresso flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <span>Send to Management</span>
                        <span className="material-symbols-outlined text-[14px]">send</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Start New Order / Add Items */}
            <button
              onClick={() => {
                setCart([]);
                setStep(2); // Jump straight to Menu!
                setOrderStatus('BREWING');
                setCountdownSeconds(480);
              }}
              className="mt-auto w-full py-3.5 bg-paros-orange text-white hover:bg-paros-orange/90 font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
            >
              <span>{isCounterOnlyCafe || isTakeaway ? '+ Place Another Order' : `+ Add More Items to Table ${selectedTable}`}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}

        {/* ══ CUSTOMIZATION MODAL OVERLAY ══ */}
        {customizingItem && (
          <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl border-t-3 sm:border-3 border-espresso shadow-brutal-xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-black text-espresso">
                    {customizingItem.name}
                  </h3>
                  <p className="font-body text-xs text-espresso/70">{customizingItem.desc}</p>
                </div>
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="w-8 h-8 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Milk Option */}
              <div className="flex flex-col gap-2">
                <span className="font-display text-xs font-black uppercase text-espresso">
                  Select Milk Option:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedMilk('whole')}
                    className={`p-3 rounded-xl border-2 border-espresso text-left transition-all ${
                      selectedMilk === 'whole'
                        ? 'bg-paros-yellow shadow-brutal-sm ring-2 ring-espresso'
                        : 'bg-white hover:bg-paros-cream'
                    }`}
                  >
                    <p className="font-display font-bold text-xs text-espresso">Whole Milk</p>
                    <p className="font-mono text-[10px] text-espresso/60">Included (+₹0)</p>
                  </button>
                  <button
                    onClick={() => setSelectedMilk('oat')}
                    className={`p-3 rounded-xl border-2 border-espresso text-left transition-all ${
                      selectedMilk === 'oat'
                        ? 'bg-paros-orange text-white shadow-brutal-sm ring-2 ring-espresso'
                        : 'bg-white hover:bg-paros-cream'
                    }`}
                  >
                    <p className="font-display font-bold text-xs">Minor Figures Oat</p>
                    <p className="font-mono text-[10px] opacity-80">+₹40</p>
                  </button>
                </div>
              </div>

              {/* Add CTA */}
              <button
                onClick={addToCartWithCustomization}
                className="brutal-btn w-full py-3.5 bg-espresso text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
              >
                <span>
                  Add to Cart • ₹{customizingItem.price + (selectedMilk === 'oat' ? 40 : 0)}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
