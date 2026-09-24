'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  milk?: string;
  notes?: string;
}

export default function TableQrOrderPage() {
  // 4 Steps: 1 = Table Picker, 2 = Menu, 3 = Cart & UPI, 4 = Live ETA Tracker
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Table selection
  const [selectedTable, setSelectedTable] = useState<string>('4');
  const [isTakeaway, setIsTakeaway] = useState(false);

  // Customizer modal
  const [customizingItem, setCustomizingItem] = useState<{
    name: string;
    price: number;
    desc: string;
  } | null>(null);
  const [selectedMilk, setSelectedMilk] = useState<'whole' | 'oat'>('oat');

  // Cart
  const [cart, setCart] = useState<OrderItem[]>([
    {
      id: 'c1',
      name: 'Flat White',
      price: 260,
      quantity: 1,
      milk: 'Minor Figures Oat Milk (+₹40)',
    },
    {
      id: 'c2',
      name: 'French Butter Croissant',
      price: 180,
      quantity: 1,
      notes: 'Warm from oven',
    },
  ]);

  // Order Result
  const [placedOrderNumber, setPlacedOrderNumber] = useState('#1042');
  const [countdownSeconds, setCountdownSeconds] = useState(480); // 8 minutes
  const [orderStatus, setOrderStatus] = useState<'BREWING' | 'PLATING' | 'READY'>('BREWING');

  // Menu items list
  const menu = [
    { name: 'Flat White', price: 220, desc: 'Double ristretto espresso, velvety textured milk', icon: '☕', cat: 'Brews' },
    { name: 'Specialty Pour Over', price: 260, desc: 'Single origin washed Ratnagiri, floral citrus', icon: '🫘', cat: 'Brews' },
    { name: 'Iced Oat Latte', price: 250, desc: 'Chilled espresso, Minor Figures oat milk, clear ice', icon: '🧊', cat: 'Cold' },
    { name: 'French Butter Croissant', price: 180, desc: '27-layer flaky laminated French butter pastry', icon: '🥐', cat: 'Bakery' },
    { name: 'Wild Herb Sourdough Toast', price: 160, desc: 'Cultured garlic herb butter on toasted bread', icon: '🥪', cat: 'Toasties' },
    { name: 'Almond Frangipane Tart', price: 210, desc: 'Toasted almonds, honey glaze, shortcrust', icon: '🥧', cat: 'Bakery' },
  ];

  // Cart Totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

  // Countdown timer in Step 4
  useEffect(() => {
    if (step !== 4) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          setOrderStatus('READY');
          return 0;
        }
        if (prev < 180) setOrderStatus('PLATING');
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

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

  async function handlePlaceOrder() {
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: isTakeaway ? 'Takeaway' : selectedTable,
          items: cart,
          total,
          customerName: 'Aarav S.',
        }),
      });
      const data = await res.json();
      if (data.orderNumber) {
        setPlacedOrderNumber(data.orderNumber);
      }
    } catch {
      // Offline fallback
    }
    setStep(4);
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex flex-col items-center select-none antialiased">
      {/* ── Mobile-Optimized Container Shell ── */}
      <div className="w-full max-w-[440px] flex flex-col min-h-screen bg-paros-cream border-x-2 border-espresso shadow-brutal-xl">
        {/* ── Top Brand Bar ── */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-md px-4 py-3 border-b-2 border-espresso z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-paros-orange text-white flex items-center justify-center font-display font-black text-xs border-2 border-espresso shadow-brutal-sm">
              P
            </div>
            <div>
              <p className="font-display font-black text-sm text-espresso leading-none">
                Artisan Roastery
              </p>
              <p className="font-mono text-[9px] text-paros-matcha font-bold">
                ● Dine-In Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isTakeaway ? (
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
              className="text-[10px] font-display font-bold uppercase underline text-espresso/60"
            >
              Staff
            </Link>
          </div>
        </header>

        {/* ══ STEP 1: WHERE ARE YOU SITTING? ══ */}
        {step === 1 && (
          <div className="p-4 flex flex-col gap-4 flex-1">
            {/* Callout */}
            <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-2">
              <span className="sticker-badge inline-block bg-paros-yellow text-espresso border border-espresso px-2.5 py-0.5 rounded-full font-display text-[10px] font-black uppercase w-fit">
                ⚡ Powered by Paros Mode A
              </span>
              <h1 className="font-display text-2xl font-black text-espresso tracking-tight">
                Where are you sitting today?
              </h1>
              <p className="font-body text-xs text-espresso/70">
                Check the wooden cube stand on your table and tap your number below.
              </p>
            </div>

            {/* Table Number Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((tbl) => (
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
          </div>
        )}

        {/* ══ STEP 2: MENU CATALOG & CUSTOMIZER ══ */}
        {step === 2 && (
          <div className="p-4 flex flex-col gap-4 flex-1">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-black text-espresso">Artisanal Menu</h2>
                <p className="font-body text-xs text-espresso/70">Freshly roasted & baked in-house</p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs font-display font-bold underline text-espresso/60"
              >
                Change Table
              </button>
            </div>

            {/* Items List */}
            <div className="flex flex-col gap-3">
              {menu.map((item) => (
                <div
                  key={item.name}
                  className="bg-white p-3.5 rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{item.icon}</span>
                    <div>
                      <p className="font-display font-bold text-sm text-espresso">{item.name}</p>
                      <p className="font-body text-xs text-espresso/70 line-clamp-1">{item.desc}</p>
                      <p className="font-display font-black text-sm text-espresso mt-1">₹{item.price}</p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setCustomizingItem({ name: item.name, price: item.price, desc: item.desc })
                    }
                    className="brutal-btn px-3 py-1.5 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm shrink-0"
                  >
                    + ADD
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom Floating Cart Bar */}
            {cart.length > 0 && (
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
            )}
          </div>
        )}

        {/* ══ STEP 3: CART CHECKOUT & UPI PAY ══ */}
        {step === 3 && (
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
                  </div>
                  <span className="font-display font-black text-sm text-espresso tabular-nums">
                    ₹{item.price}
                  </span>
                </div>
              ))}

              {/* Bill Math */}
              <div className="pt-2 font-mono text-xs flex flex-col gap-1 text-espresso/70">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cafe GST (5%)</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t-2 border-dashed border-espresso text-espresso font-display">
                  <span className="text-base font-black">Grand Total</span>
                  <span className="text-2xl font-black text-paros-orange">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* UPI Direct Payment Box */}
            <div className="bg-paros-mint/40 p-4 rounded-2xl border-2 border-espresso shadow-brutal flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-matcha text-[20px]">verified</span>
                <span className="font-display text-xs font-black uppercase text-espresso">
                  0% Surcharge Direct UPI
                </span>
              </div>
              <p className="font-body text-xs text-espresso/80">
                Pay directly to <strong>artisanroastery@okaxis</strong> via GPay, PhonePe, or Paytm.
              </p>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePlaceOrder}
              className="brutal-btn mt-auto w-full py-4 bg-paros-matcha text-white font-display font-black text-base uppercase rounded-2xl border-2 border-espresso shadow-brutal-lg flex items-center justify-center gap-2"
            >
              <span>Pay ₹{total} via UPI • Place Order</span>
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </button>
          </div>
        )}

        {/* ══ STEP 4: LIVE ORDER ETA STATUS TRACKER ══ */}
        {step === 4 && (
          <div className="p-4 flex flex-col items-center text-center gap-4 flex-1 justify-center">
            {/* Order Confirmed Badge */}
            <span className="sticker-badge bg-paros-mint text-espresso border-2 border-espresso px-3.5 py-1 rounded-full font-display text-xs font-black uppercase shadow-brutal-sm">
              ✓ ORDER {placedOrderNumber} FIRED TO KITCHEN!
            </span>

            {/* Big Countdown Clock */}
            <div className="w-48 h-48 rounded-full bg-white border-3 border-espresso shadow-brutal-xl flex flex-col items-center justify-center my-2 relative">
              <span className="font-display text-xs uppercase font-bold text-espresso/60">
                Estimated Prep Time
              </span>
              <span className="font-mono text-4xl font-black text-paros-orange tabular-nums my-1">
                {formatTime(countdownSeconds)}
              </span>
              <span className="font-display text-[10px] font-black uppercase px-2 py-0.5 rounded bg-paros-yellow border border-espresso">
                {orderStatus === 'BREWING' ? '☕ Barista Brewing' : orderStatus === 'PLATING' ? '🥐 Plating Dish' : '🔔 Ready for Pickup'}
              </span>
            </div>

            {/* Sync Reassurance */}
            <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal text-left w-full flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-display font-black text-espresso">
                <span className="w-2.5 h-2.5 rounded-full bg-paros-matcha animate-ping" />
                <span>Live Barista KDS Synchronized</span>
              </div>
              <p className="font-body text-xs text-espresso/70">
                If the chef adjusts the prep schedule, your phone timer updates automatically in real-time.
              </p>
            </div>

            {/* WhatsApp Bill Alert */}
            <div className="bg-paros-yellow/40 p-3 rounded-2xl border border-espresso text-xs font-display font-bold text-espresso flex items-center gap-2">
              <span className="material-symbols-outlined text-paros-matcha">mark_email_read</span>
              <span>Official GST Bill sent to your WhatsApp!</span>
            </div>

            {/* Order Another */}
            <button
              onClick={() => {
                setCart([]);
                setStep(1);
              }}
              className="brutal-btn mt-4 px-6 py-2.5 bg-white text-espresso font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal"
            >
              Order Something Else
            </button>
          </div>
        )}
      </div>

      {/* ── Item Customizer Modal ── */}
      {customizingItem && (
        <div className="fixed inset-0 bg-espresso/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 w-full max-w-sm flex flex-col gap-4 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-lg font-black text-espresso">
                  {customizingItem.name}
                </h3>
                <p className="font-body text-xs text-espresso/70">{customizingItem.desc}</p>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs"
              >
                ✕
              </button>
            </div>

            {/* Milk Option */}
            <div className="flex flex-col gap-2">
              <span className="font-display text-xs font-black uppercase text-espresso">
                Choose Milk Base:
              </span>
              <label
                onClick={() => setSelectedMilk('whole')}
                className={`p-3 rounded-xl border-2 border-espresso flex items-center justify-between cursor-pointer transition-all ${
                  selectedMilk === 'whole' ? 'bg-paros-yellow shadow-brutal-sm' : 'bg-paros-cream'
                }`}
              >
                <div className="flex items-center gap-2 font-display text-xs font-bold">
                  <input
                    type="radio"
                    checked={selectedMilk === 'whole'}
                    onChange={() => setSelectedMilk('whole')}
                    className="accent-paros-orange"
                  />
                  <span>Whole Farm Milk</span>
                </div>
                <span className="font-mono text-xs font-bold">+₹0</span>
              </label>

              <label
                onClick={() => setSelectedMilk('oat')}
                className={`p-3 rounded-xl border-2 border-espresso flex items-center justify-between cursor-pointer transition-all ${
                  selectedMilk === 'oat' ? 'bg-paros-yellow shadow-brutal-sm' : 'bg-paros-cream'
                }`}
              >
                <div className="flex items-center gap-2 font-display text-xs font-bold">
                  <input
                    type="radio"
                    checked={selectedMilk === 'oat'}
                    onChange={() => setSelectedMilk('oat')}
                    className="accent-paros-orange"
                  />
                  <span>Minor Figures Oat Milk</span>
                </div>
                <span className="font-mono text-xs font-bold text-paros-orange">+₹40</span>
              </label>
            </div>

            <button
              onClick={addToCartWithCustomization}
              className="brutal-btn w-full py-3.5 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal"
            >
              Add to Cart • ₹{customizingItem.price + (selectedMilk === 'oat' ? 40 : 0)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
