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
  currentStatus: 'AVAILABLE' | 'OCCUPIED' | 'READY_TO_SERVE';
  orderNumber?: string;
  amount?: number;
}

interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
  category?: { name: string };
}

interface SettlementBill {
  billNumber: string;
  orderNumber: string;
  tableNumber: string;
  items: CartItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  paymentMethod: 'CASH' | 'UPI';
  customerName: string;
  customerPhone: string;
  changeDue: number;
  time: string;
}

interface LiveOrderQueue {
  id: string;
  orderNumber: string;
  table: string;
  customerName: string;
  status: 'IN_KITCHEN' | 'READY_AT_PASS' | 'COMPLETED';
  itemsSummary: string;
  elapsedTime: string;
}

export default function PosRegisterPage() {
  // POS View state: menu, floor, orders (expediter)
  const [activeView, setActiveView] = useState<'menu' | 'floor' | 'orders'>('menu');
  const [selectedTable, setSelectedTable] = useState<string>('4');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('14:32:15');

  // Customer metadata
  const [customerName, setCustomerName] = useState('Aarav Sharma');
  const [customerPhone, setCustomerPhone] = useState('+91 98450 44321');

  // Settlement Bill Modal State
  const [settledBill, setSettledBill] = useState<SettlementBill | null>(null);
  const [whatsappSentStatus, setWhatsappSentStatus] = useState(false);

  // KDS Ready Notification Banner
  const [readyNotification, setReadyNotification] = useState<{
    table: string;
    orderNumber: string;
    items: string;
  } | null>({
    table: '4',
    orderNumber: '#1042',
    items: 'Flat White (Oat) + Butter Croissant',
  });

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

  // Live tables
  const [tables, setTables] = useState<TableNode[]>([
    { id: '1', tableNumber: '1', capacity: 2, currentStatus: 'AVAILABLE' },
    { id: '2', tableNumber: '2', capacity: 4, currentStatus: 'OCCUPIED', orderNumber: '#1039', amount: 540 },
    { id: '3', tableNumber: '3', capacity: 2, currentStatus: 'AVAILABLE' },
    { id: '4', tableNumber: '4', capacity: 4, currentStatus: 'READY_TO_SERVE', orderNumber: '#1042', amount: 651 },
    { id: '5', tableNumber: '5', capacity: 6, currentStatus: 'AVAILABLE' },
    { id: '6', tableNumber: '6', capacity: 4, currentStatus: 'OCCUPIED', orderNumber: '#1043', amount: 720 },
    { id: '7', tableNumber: '7', capacity: 4, currentStatus: 'AVAILABLE' },
    { id: '8', tableNumber: '8', capacity: 4, currentStatus: 'AVAILABLE' },
    { id: 'takeaway', tableNumber: 'Takeaway', capacity: 0, currentStatus: 'AVAILABLE' },
  ]);

  // Live Orders in Expediter Queue
  const [liveOrders, setLiveOrders] = useState<LiveOrderQueue[]>([
    {
      id: 'ord-1',
      orderNumber: '#1042',
      table: 'Table 4',
      customerName: 'Aarav Sharma',
      status: 'READY_AT_PASS',
      itemsSummary: '1x Flat White (Oat), 1x Sourdough Toast, 1x Croissant',
      elapsedTime: '7m ago',
    },
    {
      id: 'ord-2',
      orderNumber: '#1040',
      table: 'Takeaway #108',
      customerName: 'Priya M.',
      status: 'IN_KITCHEN',
      itemsSummary: '2x Iced Vanilla Latte, 1x Butter Croissant',
      elapsedTime: '10m ago (Overdue)',
    },
    {
      id: 'ord-3',
      orderNumber: '#1043',
      table: 'Table 6',
      customerName: 'Sneha Patel',
      status: 'IN_KITCHEN',
      itemsSummary: '2x Cold Brew Reserve, 1x Herb Toast',
      elapsedTime: '2m ago',
    },
  ]);

  const [menuItems, setMenuItems] = useState<MenuItemData[]>([
    { id: 'm1', name: 'Specialty Pour Over (Ratnagiri)', description: 'Single-origin light roast brewed on Hario V60', price: 260, isVeg: true, category: { name: 'Hot Coffee' } },
    { id: 'm2', name: 'Flat White', description: 'Double ristretto espresso, velvety textured micro-foam milk', price: 220, isVeg: true, category: { name: 'Hot Coffee' } },
    { id: 'm3', name: 'Iced Oat Latte', description: 'Espresso poured over Minor Figures oat milk and clear ice', price: 250, isVeg: true, category: { name: 'Iced Brews' } },
    { id: 'm4', name: 'Cold Brew with Tonic & Orange', description: '18-hour cold steeped coffee with botanical tonic', price: 210, isVeg: true, category: { name: 'Iced Brews' } },
    { id: 'm5', name: 'French Butter Croissant', description: '27 laminated butter layers, baked fresh every morning', price: 180, isVeg: true, category: { name: 'Bakery & Hearth' } },
    { id: 'm6', name: 'Almond Frangipane Tart', description: 'Sweet pastry shell with toasted almond cream and roasted flakes', price: 210, isVeg: true, category: { name: 'Bakery & Hearth' } },
    { id: 'm7', name: 'Wild Herb Sourdough Toast', description: 'Artisanal sourdough with hand-churned salted herb butter', price: 160, isVeg: true, category: { name: 'Artisanal Toast' } },
    { id: 'm8', name: 'Avocado & Danish Feta Toast', description: 'Hass avocado mash, crumbled feta, chili flakes', price: 280, isVeg: true, category: { name: 'Artisanal Toast' } },
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
        if (data?.menuItems?.length) setMenuItems(data.menuItems);
      })
      .catch(() => {});

    // Keyboard shortcut '/'
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

    // Mark current selected table as occupied
    setTables((prev) =>
      prev.map((t) => (t.tableNumber === selectedTable ? { ...t, currentStatus: 'OCCUPIED' } : t))
    );
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

  // ═══ SETTLE BILL (Opens Settlement Modal) ═══
  function handleSettle(method: 'CASH' | 'UPI') {
    if (cart.length === 0) {
      showToast('⚠️ Cart is empty. Add items first!');
      return;
    }

    const billData: SettlementBill = {
      billNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      orderNumber: `#1042`,
      tableNumber: selectedTable,
      items: [...cart],
      subtotal,
      cgst,
      sgst,
      total: grandTotal,
      paymentMethod: method,
      customerName,
      customerPhone,
      changeDue: Math.max(0, changeDue),
      time: currentTime,
    };

    setSettledBill(billData);
    setWhatsappSentStatus(false);

    // Call backend API to record bill in Prisma DB
    fetch('/api/pos', {
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
    }).catch(() => {});
  }

  // Close Settlement Modal & Free Table
  function handleCompleteAndFreeTable() {
    // Free Table on Floor Grid
    setTables((prev) =>
      prev.map((t) =>
        t.tableNumber === settledBill?.tableNumber
          ? { ...t, currentStatus: 'AVAILABLE', orderNumber: undefined, amount: undefined }
          : t
      )
    );

    // Clear cart and modal
    setCart([]);
    setSettledBill(null);
    showToast(`✓ Table ${selectedTable} settled & cleared for next guest!`);
  }

  // Mark Order as Handed Over to Guest
  function handleMarkOrderServed(orderId: string, tableNum: string) {
    setLiveOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'COMPLETED' } : o))
    );
    setTables((prev) =>
      prev.map((t) =>
        t.tableNumber === tableNum ? { ...t, currentStatus: 'OCCUPIED' } : t
      )
    );
    setReadyNotification(null);
    showToast(`✓ Order ${orderId} served to ${tableNum}!`);
  }

  // Park Order
  async function handlePark() {
    if (cart.length === 0) return;
    showToast(`⏸️ Table ${selectedTable} order parked in active queue.`);
    setCart([]);
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
          <button
            onClick={() => setActiveView('menu')}
            className={`flex flex-col items-center justify-center w-full py-2.5 rounded-xl border-2 transition-all ${
              activeView === 'menu'
                ? 'bg-paros-orange text-white border-espresso shadow-brutal-sm'
                : 'text-espresso border-transparent hover:bg-paros-yellow/40'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
            <span className="font-display text-[10px] font-black uppercase mt-0.5">Register</span>
          </button>

          <button
            onClick={() => setActiveView('orders')}
            className={`relative flex flex-col items-center justify-center w-full py-2.5 rounded-xl border-2 transition-all ${
              activeView === 'orders'
                ? 'bg-paros-orange text-white border-espresso shadow-brutal-sm'
                : 'text-espresso border-transparent hover:bg-paros-yellow/40'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <span className="font-display text-[10px] font-bold uppercase mt-0.5">Orders</span>
            {readyNotification && (
              <span className="absolute top-1 right-2 w-2.5 h-2.5 rounded-full bg-paros-matcha ring-2 ring-white animate-ping" />
            )}
          </button>

          <Link
            href="/kds"
            className="flex flex-col items-center justify-center w-full py-2.5 rounded-xl text-espresso hover:bg-paros-yellow/40 transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">soup_kitchen</span>
            <span className="font-display text-[10px] font-bold uppercase mt-0.5">KDS Live</span>
          </Link>

          <button
            onClick={() => setActiveView('floor')}
            className={`flex flex-col items-center justify-center w-full py-2.5 rounded-xl border-2 transition-all ${
              activeView === 'floor'
                ? 'bg-paros-orange text-white border-espresso shadow-brutal-sm'
                : 'text-espresso border-transparent hover:bg-paros-yellow/40'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">table_restaurant</span>
            <span className="font-display text-[10px] font-bold uppercase mt-0.5">Tables</span>
          </button>

          <button
            onClick={() => showToast('Opening Drawer: Float ₹2,000 intact | Current Till ₹5,400')}
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
          {/* 🛎️ KDS REAL-TIME READY NOTIFICATION ALERT 🛎️ */}
          {readyNotification && (
            <div className="bg-paros-mint border-2 border-espresso p-3.5 rounded-2xl shadow-brutal flex items-center justify-between animate-bounce">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-paros-matcha text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  🛎️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-black text-espresso">
                      KDS ALERT: Table {readyNotification.table} is READY for Service!
                    </span>
                    <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-espresso font-bold">
                      {readyNotification.orderNumber}
                    </span>
                  </div>
                  <p className="font-body text-xs text-espresso/70 mt-0.5">
                    {readyNotification.items} • Runner pickup required at kitchen pass.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleMarkOrderServed('ord-1', readyNotification.table)}
                className="brutal-btn px-4 py-2 bg-espresso text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
              >
                Mark Served ➔
              </button>
            </div>
          )}

          {/* Top Operational Strip */}
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
                onClick={() => setActiveView('orders')}
                className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1 ${
                  activeView === 'orders'
                    ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow/40 border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
                Expediter ({liveOrders.filter((o) => o.status !== 'COMPLETED').length})
              </button>
            </div>
          </div>

          {/* ═══ FLOOR GRID STATUS NODES STRIP ═══ */}
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
                  <span className="w-2 h-2 rounded-full bg-paros-matcha" /> Free
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Dine-In
                </span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ready at Pass 🛎️
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-9 gap-2">
              {tables.map((t) => {
                const isReady = t.currentStatus === 'READY_TO_SERVE';
                const isOccupied = t.currentStatus === 'OCCUPIED';
                const isSelected = selectedTable === t.tableNumber;

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t.tableNumber)}
                    className={`p-2 rounded-xl border-2 border-espresso transition-all text-center flex flex-col justify-between ${
                      isSelected
                        ? 'bg-paros-orange text-white shadow-brutal ring-2 ring-espresso scale-105'
                        : isReady
                        ? 'bg-paros-mint text-espresso border-2 border-emerald-600 shadow-brutal-sm ring-2 ring-emerald-400 animate-pulse'
                        : isOccupied
                        ? 'bg-paros-yellow text-espresso shadow-brutal-sm'
                        : 'bg-paros-cream hover:bg-paros-mint text-espresso shadow-brutal-sm'
                    }`}
                  >
                    <span className="font-display font-black text-sm">
                      {t.tableNumber === 'Takeaway' ? '🥡 Out' : `T-${t.tableNumber}`}
                    </span>
                    <span
                      className={`font-display text-[9px] uppercase font-bold mt-1 ${
                        isSelected
                          ? 'text-white'
                          : isReady
                          ? 'text-emerald-800 font-black'
                          : isOccupied
                          ? 'text-amber-800'
                          : 'text-paros-matcha'
                      }`}
                    >
                      {isReady ? '🛎️ Ready' : isOccupied ? 'Dine-In' : 'Free'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ VIEW MODE: EXPEDITER QUEUE ═══ */}
          {activeView === 'orders' ? (
            <div className="bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-paros-orange text-[22px]">soup_kitchen</span>
                  <h2 className="font-display text-lg font-black text-espresso">
                    Live Kitchen Expediter & Delivery Pass
                  </h2>
                </div>
                <span className="font-display text-xs font-bold text-espresso/70">
                  Auto-sync with Kitchen KDS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`p-4 rounded-2xl border-2 border-espresso flex flex-col justify-between ${
                      ord.status === 'READY_AT_PASS'
                        ? 'bg-paros-mint border-emerald-600 shadow-brutal ring-2 ring-emerald-400'
                        : ord.status === 'COMPLETED'
                        ? 'bg-paros-cream/50 opacity-60'
                        : 'bg-white shadow-brutal-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-dashed border-espresso/20">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-base text-espresso">{ord.table}</span>
                          <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-espresso">
                            {ord.orderNumber}
                          </span>
                        </div>
                        <span
                          className={`font-display text-xs font-black uppercase px-2 py-0.5 rounded ${
                            ord.status === 'READY_AT_PASS'
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : ord.status === 'COMPLETED'
                              ? 'bg-espresso text-white'
                              : 'bg-paros-yellow text-espresso'
                          }`}
                        >
                          {ord.status === 'READY_AT_PASS'
                            ? 'Ready at Pass 🛎️'
                            : ord.status === 'COMPLETED'
                            ? 'Served'
                            : 'Cooking in KDS'}
                        </span>
                      </div>
                      <p className="font-body text-xs text-espresso font-semibold">{ord.customerName}</p>
                      <p className="font-body text-xs text-espresso/70 mt-1">{ord.itemsSummary}</p>
                      <p className="font-mono text-[10px] text-espresso/50 mt-2">{ord.elapsedTime}</p>
                    </div>

                    {ord.status === 'READY_AT_PASS' && (
                      <button
                        onClick={() => handleMarkOrderServed(ord.id, ord.table.replace('Table ', ''))}
                        className="brutal-btn mt-3 w-full py-2 bg-espresso text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
                      >
                        Handover to Runner & Clear ➔
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ═══ VIEW MODE: MENU CATALOG ═══ */
            <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex-1 flex flex-col gap-3">
              {/* Search Bar */}
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

              {/* Menu Items Grid */}
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
          )}
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
              {/* Quick Action Dock */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={handlePark}
                  className="p-1.5 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">pause_circle</span>
                  <span>Park</span>
                </button>
                <button
                  onClick={() => showToast('Split bill: Even 50/50 split generated')}
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

              {/* PRIMARY SETTLEMENT BUTTONS (Triggers Modal) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSettle('CASH')}
                  className="brutal-btn py-3.5 bg-espresso text-white font-display font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span>SETTLE CASH ₹{grandTotal}</span>
                </button>
                <button
                  onClick={() => handleSettle('UPI')}
                  className="brutal-btn py-3.5 bg-paros-matcha text-white font-display font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                  <span>CONFIRM UPI PAID</span>
                </button>
              </div>

              {/* Secondary Peripheral Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const phoneClean = customerPhone.replace(/[^0-9]/g, '');
                    window.open(
                      `https://wa.me/${phoneClean}?text=Hello%20${customerName}!%20Here%20is%20your%20tax%20invoice%20for%20₹${grandTotal}%20at%20Artisan%20Roastery.%20Thank%20you%20for%20visiting!`,
                      '_blank'
                    );
                    showToast(`📲 WhatsApp bill dispatched to ${customerPhone}!`);
                  }}
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: BILL SETTLEMENT & WHATSAPP RECEIPT OVERLAY ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {settledBill && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-6 sm:p-8 w-full max-w-lg flex flex-col gap-4 animate-in zoom-in-95">
            {/* Success Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-paros-matcha text-white flex items-center justify-center font-black text-xl border-2 border-espresso shadow-brutal-sm">
                  ✓
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-espresso">
                    Payment Settled: ₹{settledBill.total.toFixed(2)}
                  </h3>
                  <p className="font-mono text-xs text-paros-matcha font-bold">
                    via {settledBill.paymentMethod === 'UPI' ? '0% Surcharge UPI VPA' : 'Drawer Cash Float'}
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-espresso/60 bg-paros-cream px-2 py-1 rounded border border-espresso">
                {settledBill.billNumber}
              </span>
            </div>

            {/* Bill Receipt Preview */}
            <div className="p-4 bg-paros-cream rounded-2xl border-2 border-espresso flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-dashed border-espresso/20">
                <span className="font-display font-bold text-espresso">
                  Table {settledBill.tableNumber} • {settledBill.orderNumber}
                </span>
                <span className="text-espresso/60">{settledBill.time}</span>
              </div>

              {/* Item Lines */}
              <div className="flex flex-col gap-1.5 py-1">
                {settledBill.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <span className="text-espresso">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-bold tabular-nums">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="pt-2 border-t border-dashed border-espresso/20 flex flex-col gap-1">
                <div className="flex justify-between text-espresso/70">
                  <span>Subtotal</span>
                  <span>₹{settledBill.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-espresso/70">
                  <span>CGST (2.5%) + SGST (2.5%)</span>
                  <span>₹{(settledBill.cgst + settledBill.sgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t-2 border-espresso font-display font-black text-base text-espresso">
                  <span>Grand Total</span>
                  <span className="text-paros-orange text-lg">₹{settledBill.total.toFixed(2)}</span>
                </div>

                {settledBill.paymentMethod === 'CASH' && (
                  <div className="flex justify-between pt-1 text-espresso font-bold">
                    <span>Cash Tendered:</span>
                    <span>
                      ₹{tenderAmount} (Change Returned: ₹{settledBill.changeDue})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* WhatsApp Invoice Dispatch Card */}
            <div className="p-3.5 bg-paros-mint/40 rounded-2xl border-2 border-espresso flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-matcha text-[20px]">send</span>
                <span className="font-display text-xs font-black uppercase text-espresso">
                  Send GST e-Invoice to Guest WhatsApp:
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98450 XXXXX"
                  className="flex-1 px-3 py-2 bg-white border-2 border-espresso rounded-xl font-mono text-xs font-bold text-espresso outline-none"
                />
                <button
                  onClick={() => {
                    setWhatsappSentStatus(true);
                    const clean = customerPhone.replace(/[^0-9]/g, '');
                    window.open(
                      `https://wa.me/${clean}?text=Hello%20${customerName}!%20Here%20is%20your%20tax%20invoice%20${settledBill.billNumber}%20for%20₹${settledBill.total}%20at%20Artisan%20Roastery.%20Thank%20you%20for%20visiting!`,
                      '_blank'
                    );
                    showToast(`✓ Official GST receipt dispatched to ${customerPhone}!`);
                  }}
                  className="brutal-btn px-4 py-2 bg-paros-matcha text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm"
                >
                  {whatsappSentStatus ? 'Sent ✓' : 'Send WhatsApp'}
                </button>
              </div>
            </div>

            {/* Final Done & Free Table Button */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => showToast('🖨️ Printing thermal guest receipt slip...')}
                className="px-4 py-3 bg-white hover:bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Bill</span>
              </button>

              <button
                onClick={handleCompleteAndFreeTable}
                className="brutal-btn flex-1 py-3.5 bg-espresso text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2"
              >
                <span>Done • Free Table {settledBill.tableNumber} ➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-espresso text-white px-5 py-3 rounded-2xl border-2 border-white shadow-brutal-lg flex items-center gap-2 font-display text-sm font-bold animate-bounce">
          <span className="material-symbols-outlined text-paros-matcha">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
