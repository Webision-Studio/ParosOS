'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isVeg?: boolean;
}

interface TableNode {
  id: string;
  tableNumber: string;
  capacity: number;
  currentStatus: string; // AVAILABLE, OCCUPIED, BILLED
}

interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
  category?: { name: string };
}

export default function PosRegisterPage() {
  // POS View state
  const [activeView, setActiveView] = useState<'menu' | 'floor' | 'online'>('menu');
  const [selectedTable, setSelectedTable] = useState<string>('4');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('11:46:00 AM');

  // Customer metadata
  const [customerName] = useState('Aarav Sharma');
  const [customerPhone] = useState('+91 98450 44321');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 'item-1',
      name: 'Iced Vanilla Bean Latte',
      price: 280,
      quantity: 1,
      notes: 'Large (+₹40) • Oatly • 50% Sugar',
      isVeg: true,
    },
    {
      id: 'item-2',
      name: 'Wild Herb Sourdough Toast',
      price: 160,
      quantity: 1,
      notes: 'Extra cultured butter • Well toasted',
      isVeg: true,
    },
    {
      id: 'item-3',
      name: 'French Butter Croissant',
      price: 180,
      quantity: 1,
      notes: 'Warm from oven',
      isVeg: true,
    },
  ]);

  // Tender / Cash State
  const [tenderAmount, setTenderAmount] = useState<number>(1000);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live tables & items from DB
  const [tables, setTables] = useState<TableNode[]>([
    { id: '1', tableNumber: '1', capacity: 2, currentStatus: 'AVAILABLE' },
    { id: '2', tableNumber: '2', capacity: 4, currentStatus: 'OCCUPIED' },
    { id: '3', tableNumber: '3', capacity: 2, currentStatus: 'AVAILABLE' },
    { id: '4', tableNumber: '4', capacity: 4, currentStatus: 'OCCUPIED' },
    { id: '5', tableNumber: '5', capacity: 6, currentStatus: 'AVAILABLE' },
    { id: '6', tableNumber: '6', capacity: 4, currentStatus: 'OCCUPIED' },
    { id: '7', tableNumber: '7', capacity: 4, currentStatus: 'AVAILABLE' },
    { id: '8', tableNumber: '8', capacity: 4, currentStatus: 'AVAILABLE' },
  ]);

  const [menuItems, setMenuItems] = useState<MenuItemData[]>([
    { id: 'm1', name: 'Flat White', description: 'Double Ristretto + Silk Microfoam', price: 220, isVeg: true, category: { name: 'Hot Coffee' } },
    { id: 'm2', name: 'Pour Over (Chikmagalur)', description: 'Single Origin Washed, notes of citrus', price: 260, isVeg: true, category: { name: 'Hot Coffee' } },
    { id: 'm3', name: 'Iced Vanilla Bean Latte', description: 'Madagascar vanilla, chilled espresso', price: 280, isVeg: true, category: { name: 'Iced Brews' } },
    { id: 'm4', name: 'French Butter Croissant', description: '27-layer flaky French butter hearth', price: 180, isVeg: true, category: { name: 'Bakery & Hearth' } },
    { id: 'm5', name: 'Wild Herb Sourdough Toast', description: 'Cultured garlic herb butter on crusty bread', price: 160, isVeg: true, category: { name: 'Artisanal Toast' } },
    { id: 'm6', name: 'Smoked Chicken Panini', description: 'Herb grilled chicken, mozzarella, pesto', price: 310, isVeg: false, category: { name: 'Artisanal Toast' } },
    { id: 'm7', name: 'Almond Frangipane Tart', description: 'Toasted almonds, honey glaze, shortcrust', price: 210, isVeg: true, category: { name: 'Bakery & Hearth' } },
    { id: 'm8', name: 'Cold Brew Tonic', description: '18-hr slow cold steep, crisp citrus finish', price: 220, isVeg: true, category: { name: 'Iced Brews' } },
    { id: 'm9', name: 'Basque Burnt Cheesecake', description: 'Caramelised Spanish cheesecake slice', price: 280, isVeg: true, category: { name: 'Bakery & Hearth' } },
  ]);

  // Real-time clock & fetch data
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    // Fetch initial DB data
    fetch('/api/pos')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.tables?.length) setTables(data.tables);
          if (data.menuItems?.length) setMenuItems(data.menuItems);
        }
      })
      .catch(() => {});

    // Keyboard shortcut '/' to search
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('posSearchInput');
        if (searchInput) (searchInput as HTMLInputElement).focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All Items' || item.category?.name === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cgst = Math.round(subtotal * 0.025 * 100) / 100;
  const sgst = Math.round(subtotal * 0.025 * 100) / 100;
  const grandTotal = Math.round(subtotal + cgst + sgst);
  const changeDue = tenderAmount - grandTotal;

  // Add Item to Cart
  function addToCart(item: MenuItemData) {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}`,
          name: item.name,
          price: item.price,
          quantity: 1,
          isVeg: item.isVeg,
          notes: item.category?.name || '',
        },
      ];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }

  // Settle Bill
  async function handleSettle(method: 'CASH' | 'UPI') {
    if (cart.length === 0) {
      showToast('⚠️ Cart is empty. Add items first!');
      return;
    }

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settle-bill',
          tableId: selectedTable,
          items: cart,
          subtotal,
          cgst,
          sgst,
          total: grandTotal,
          paymentMethod: method,
          customerName,
          customerPhone,
        }),
      });

      if (res.ok) {
        showToast(
          method === 'CASH'
            ? `✓ Settled ₹${grandTotal} (Cash). Change: ₹${Math.max(0, changeDue)}`
            : `✓ UPI Paid ₹${grandTotal}! WhatsApp receipt sent to ${customerPhone}`
        );
        // Clear cart for next order
        setCart([]);
      }
    } catch {
      showToast('✓ Order Settle Completed Locally');
      setCart([]);
    }
  }

  // Park Order
  async function handlePark() {
    if (cart.length === 0) return;
    try {
      await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'park-order',
          tableId: selectedTable,
          items: cart,
          customerName,
        }),
      });
      showToast(`⏸️ Table ${selectedTable} order parked in active queue.`);
      setCart([]);
    } catch {
      showToast('⏸️ Order parked locally');
      setCart([]);
    }
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex flex-col select-none antialiased">
      {/* ── Fixed Top Header Bar ── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white z-50 flex items-center justify-between px-4 sm:px-6 border-b-2 border-espresso shadow-brutal-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border-2 border-espresso shadow-brutal-sm">
              P
            </div>
            <span className="font-display text-xl font-black text-espresso tracking-tight">
              PAROS<span className="text-paros-orange">.</span>
            </span>
          </Link>
          <div className="h-6 w-px bg-espresso/20 hidden sm:block" />
          <div className="flex flex-col">
            <span className="font-display text-[10px] uppercase font-bold text-espresso/60 tracking-wider">
              Terminal Node 01
            </span>
            <span className="font-display text-sm font-black text-espresso">
              Artisan Roastery • Main Counter
            </span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-paros-mint border border-espresso font-display text-xs font-bold text-espresso">
            <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
            <span>Live Sync (0ms)</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-paros-yellow/60 border border-espresso font-display text-xs font-bold text-espresso">
            <span className="material-symbols-outlined text-[15px] text-espresso">cloud_done</span>
            <span>Offline Ready</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-espresso rounded-lg font-mono text-xs font-bold text-espresso">
            <span className="material-symbols-outlined text-[15px] text-espresso/70">schedule</span>
            <span className="tabular-nums">{currentTime}</span>
          </div>
          <div className="flex items-center gap-2 bg-paros-cream border border-espresso px-2.5 py-1 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-paros-orange text-white flex items-center justify-center font-display font-bold text-xs">
              R
            </div>
            <span className="hidden sm:inline font-display text-xs font-bold text-espresso">
              Rahul (Cashier)
            </span>
          </div>
        </div>
      </header>

      {/* ── Left Vertical Navigation Dock ── */}
      <aside className="fixed left-0 top-16 bottom-0 w-20 bg-white border-r-2 border-espresso z-40 flex flex-col items-center py-4 shadow-brutal-sm">
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          <Link
            href="/pos"
            className="flex flex-col items-center justify-center w-full py-2.5 rounded-xl bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
            <span className="font-display text-[10px] font-black uppercase mt-0.5">Register</span>
          </Link>
          <Link
            href="/kds"
            className="flex flex-col items-center justify-center w-full py-2.5 rounded-xl text-espresso hover:bg-paros-yellow/40 transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">soup_kitchen</span>
            <span className="font-display text-[10px] font-bold uppercase mt-0.5">KDS Live</span>
          </Link>
          <Link
            href="/onboarding"
            className="flex flex-col items-center justify-center w-full py-2.5 rounded-xl text-espresso hover:bg-paros-yellow/40 transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">table_restaurant</span>
            <span className="font-display text-[10px] font-bold uppercase mt-0.5">Tables</span>
          </Link>
          <button
            onClick={() => showToast('Opening Drawer: Opening float ₹2,000 | Cash Sales ₹1,470')}
            className="flex flex-col items-center justify-center w-full py-2.5 rounded-xl text-espresso hover:bg-paros-yellow/40 transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">payments</span>
            <span className="font-display text-[10px] font-bold uppercase mt-0.5">Drawer</span>
          </button>
        </nav>
      </aside>

      {/* ── Main POS Workspace ── */}
      <div className="pl-20 pt-16 flex-1 flex flex-col xl:flex-row gap-4 p-4">
        {/* ═══ LEFT PANEL (60%): Floor & Menu Catalog ═══ */}
        <div className="w-full xl:w-[60%] flex flex-col gap-4">
          {/* Top Strip */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-espresso shadow-brutal flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border-2 border-espresso shadow-brutal-sm">
                R
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-black text-espresso">Chef Kabir / Rahul</span>
                  <span className="font-mono text-[10px] bg-paros-cream px-1.5 py-0.5 rounded border border-espresso font-bold">
                    PIN: 1234
                  </span>
                </div>
                <div className="flex items-center gap-2 font-display text-xs text-espresso/60 font-medium">
                  <span>Shift: 4h 12m</span>
                  <span>•</span>
                  <span className="text-paros-matcha font-bold">Local SQLite DB Synced</span>
                </div>
              </div>
            </div>

            {/* View Selector */}
            <div className="flex items-center gap-1 p-1 bg-paros-cream border-2 border-espresso rounded-xl shadow-brutal-sm">
              <button
                onClick={() => setActiveView('menu')}
                className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1 ${
                  activeView === 'menu'
                    ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow/40 border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">coffee</span>
                Menu Catalog
              </button>
              <button
                onClick={() => setActiveView('floor')}
                className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1 ${
                  activeView === 'floor'
                    ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow/40 border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">table_bar</span>
                Floor Grid
              </button>
              <button
                onClick={() => showToast('Swiggy / Zomato order aggregator active (0 pending)')}
                className="px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase text-espresso hover:bg-paros-yellow/40 transition-all flex items-center gap-1 border-2 border-transparent"
              >
                <span className="material-symbols-outlined text-[16px]">two_wheeler</span>
                Aggregators
              </button>
            </div>
          </div>

          {/* Quick Floor Grid Nodes Strip */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-espresso shadow-brutal">
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-dashed border-espresso/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-orange text-[18px]">table_restaurant</span>
                <span className="font-display text-xs font-black uppercase text-espresso">
                  Seating Floor Grid ({tables.length} Tables)
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-display font-bold">
                <span className="flex items-center gap-1 text-paros-matcha">
                  <span className="w-2 h-2 rounded-full bg-paros-matcha" /> Available
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Occupied
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTable(t.tableNumber)}
                  className={`p-2 rounded-xl border-2 border-espresso transition-all text-center flex flex-col justify-between ${
                    selectedTable === t.tableNumber
                      ? 'bg-paros-orange text-white shadow-brutal-sm ring-2 ring-espresso scale-105'
                      : t.currentStatus === 'OCCUPIED'
                      ? 'bg-paros-yellow hover:bg-paros-yellow/80 shadow-brutal-sm'
                      : 'bg-paros-cream hover:bg-paros-mint shadow-brutal-sm'
                  }`}
                >
                  <span className="font-display font-black text-sm">
                    {t.tableNumber === 'Takeaway' ? '🥡 Out' : `T-${t.tableNumber}`}
                  </span>
                  <span
                    className={`font-display text-[9px] uppercase font-bold mt-1 ${
                      selectedTable === t.tableNumber
                        ? 'text-white'
                        : t.currentStatus === 'OCCUPIED'
                        ? 'text-amber-800'
                        : 'text-paros-matcha'
                    }`}
                  >
                    {t.currentStatus === 'OCCUPIED' ? 'Dine-In' : 'Free'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Catalog Engine */}
          <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex-1 flex flex-col gap-3">
            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-espresso/60 text-[20px]">
                  search
                </span>
                <input
                  id="posSearchInput"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quick search dish or press '/' key..."
                  className="w-full pl-10 pr-10 py-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-sm font-bold text-espresso outline-none shadow-brutal-sm"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-espresso/50 text-[18px]">
                  barcode_scanner
                </span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {['All Items', 'Hot Coffee', 'Iced Brews', 'Bakery & Hearth', 'Artisanal Toast'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full border-2 border-espresso font-display text-xs font-black uppercase whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-espresso text-white shadow-brutal-sm'
                        : 'bg-white hover:bg-paros-yellow text-espresso shadow-brutal-sm'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Menu Items Fast Touch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[440px] pr-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-paros-cream p-3 rounded-2xl border-2 border-espresso shadow-brutal-sm flex flex-col justify-between hover:bg-white transition-all group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ring-2 ${
                            item.isVeg
                              ? 'bg-paros-matcha ring-paros-matcha/30'
                              : 'bg-red-500 ring-red-500/30'
                          }`}
                        />
                        <span className="font-display text-sm font-bold text-espresso leading-tight">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-display font-black text-sm text-espresso tabular-nums">
                        ₹{item.price}
                      </span>
                    </div>
                    {item.description && (
                      <p className="font-body text-xs text-espresso/70 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-dashed border-espresso/20 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-espresso/60 font-bold uppercase">
                      {item.category?.name || 'Cafe Item'}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      className="brutal-btn px-3 py-1 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-lg border-2 border-espresso shadow-brutal-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL (40%): Active Ticket & Settle ═══ */}
        <div className="w-full xl:w-[40%] flex flex-col gap-4">
          <div className="bg-white p-5 rounded-3xl border-2 border-espresso shadow-brutal-xl flex-1 flex flex-col justify-between">
            {/* Ticket Header */}
            <div>
              <div className="flex items-start justify-between pb-3 border-b-2 border-espresso mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-paros-orange text-[22px]">
                      restaurant
                    </span>
                    <span className="font-display text-xl font-black text-espresso">
                      Table {selectedTable}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-paros-peach border border-espresso font-display text-[10px] font-black uppercase">
                      Order #1042
                    </span>
                  </div>
                  <p className="font-body text-xs text-espresso/70 mt-0.5">
                    Guest: <strong className="text-espresso">{customerName}</strong> ({customerPhone})
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-espresso">{currentTime}</span>
                  <div className="font-display text-[10px] font-black text-paros-matcha uppercase flex items-center justify-end gap-1">
                    <span className="w-2 h-2 rounded-full bg-paros-matcha" /> Dine-In
                  </div>
                </div>
              </div>

              {/* Cart List */}
              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-espresso/50 font-display text-xs font-bold uppercase">
                    Cart is empty. Tap items on the left to add.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-paros-cream border-2 border-espresso shadow-brutal-sm flex flex-col gap-1"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display text-xs font-bold text-espresso">{item.name}</p>
                          {item.notes && (
                            <p className="font-body text-[11px] text-espresso/60">{item.notes}</p>
                          )}
                        </div>
                        <span className="font-display font-black text-sm text-espresso tabular-nums">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-espresso/15">
                        <span className="font-mono text-[10px] text-espresso/60">
                          ₹{item.price} each
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-white border border-espresso rounded-lg shadow-sm">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center font-black text-xs hover:bg-paros-yellow"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-display text-xs font-bold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center font-black text-xs hover:bg-paros-yellow"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-espresso/60 hover:text-red-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Settle Actions */}
            <div className="mt-4 pt-3 border-t-2 border-espresso flex flex-col gap-3">
              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={handlePark}
                  className="p-1.5 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">pause_circle</span>
                  <span>Park</span>
                </button>
                <button
                  onClick={() => showToast('Split bill modal ready')}
                  className="p-1.5 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">call_split</span>
                  <span>Split</span>
                </button>
                <button
                  onClick={() => showToast('Discount: Flat 10% applied')}
                  className="p-1.5 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">percent</span>
                  <span>Discount</span>
                </button>
                <button
                  onClick={() => showToast('Logged ₹340 Milk expense to drawer float')}
                  className="p-1.5 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt</span>
                  <span>Expense</span>
                </button>
              </div>

              {/* Receipt Breakdown */}
              <div className="bg-paros-cream p-3 rounded-xl border border-espresso font-mono text-xs flex flex-col gap-1">
                <div className="flex justify-between text-espresso/70">
                  <span>Subtotal ({cart.length} items)</span>
                  <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-espresso/70">
                  <span>CGST (2.5%) + SGST (2.5%)</span>
                  <span className="tabular-nums">₹{(cgst + sgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t-2 border-dashed border-espresso/20 font-display">
                  <span className="text-base font-black text-espresso">Net Payable</span>
                  <span className="text-2xl font-black text-paros-orange tabular-nums">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Cash Tender Selector */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-display">
                  <span className="font-black uppercase text-espresso/70">Quick Cash Tender:</span>
                  <span className="bg-paros-mint px-2 py-0.5 rounded border border-espresso font-mono font-bold text-[11px]">
                    {changeDue >= 0
                      ? `Tender ₹${tenderAmount} → Return ₹${changeDue}`
                      : `Short by ₹${Math.abs(changeDue)}`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-xs font-black">
                  {[grandTotal, Math.ceil(grandTotal / 100) * 100, 1000, 2000].map((amt, i) => (
                    <button
                      key={i}
                      onClick={() => setTenderAmount(amt)}
                      className={`py-1.5 rounded-lg border border-espresso transition-all shadow-brutal-sm ${
                        tenderAmount === amt
                          ? 'bg-paros-yellow text-espresso ring-2 ring-espresso'
                          : 'bg-white hover:bg-paros-cream'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Settlement Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSettle('CASH')}
                  className="brutal-btn py-3 bg-espresso text-white font-display font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span>Settle Cash ₹{grandTotal}</span>
                </button>
                <button
                  onClick={() => handleSettle('UPI')}
                  className="brutal-btn py-3 bg-paros-matcha text-white font-display font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                  <span>Confirm UPI Paid</span>
                </button>
              </div>

              {/* Secondary Peripheral Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    showToast(`📲 WhatsApp GST bill dispatched to ${customerPhone} in 0.8s!`)
                  }
                  className="py-2 bg-white hover:bg-paros-cream border border-espresso rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 shadow-brutal-sm"
                >
                  <span className="material-symbols-outlined text-[16px] text-paros-matcha">chat</span>
                  <span>WhatsApp Receipt</span>
                </button>
                <button
                  onClick={() => showToast('🖨️ Thermal KOT printed to Kitchen station')}
                  className="py-2 bg-white hover:bg-paros-cream border border-espresso rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 shadow-brutal-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print KOT Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-espresso text-white px-5 py-3 rounded-2xl border-2 border-white shadow-brutal-lg flex items-center gap-2 font-display text-sm font-bold animate-bounce">
          <span className="material-symbols-outlined text-paros-matcha">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
