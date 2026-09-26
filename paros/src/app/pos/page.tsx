'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  paymentMode?: 'UPI_PREPAID' | 'PAY_LATER' | null;
  specialNotes?: string;
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
  discount?: number;
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
  specialNotes?: string;
  paymentMode?: 'UPI_PREPAID' | 'PAY_LATER' | null;
}

export default function PosRegisterPage() {
  const router = useRouter();

  // POS View state: menu, floor, orders (expediter)
  const [activeView, setActiveView] = useState<'menu' | 'floor' | 'orders'>('menu');
  const [selectedTable, setSelectedTable] = useState<string>('1');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('14:32:15');
  const [cafeName, setCafeName] = useState<string>('Artisan Roastery');

  // Customer metadata per table (starts completely clean)
  const [tableCustomers, setTableCustomers] = useState<Record<string, { name: string; phone: string }>>({});

  // Isolated Carts per Table (starts 100% clean)
  const [tableCarts, setTableCarts] = useState<Record<string, CartItem[]>>({});

  // Settlement Bill Modal State
  const [settledBill, setSettledBill] = useState<SettlementBill | null>(null);
  const [whatsappSentStatus, setWhatsappSentStatus] = useState(false);

  // Table Discounts (tableNumber -> percentage, e.g. 10%)
  const [tableDiscounts, setTableDiscounts] = useState<Record<string, number>>({});

  // Split Bill Modal State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitCount, setSplitCount] = useState<number>(2);

  // Cash Drawer Till & Expense State
  const [drawerCash, setDrawerCash] = useState<number>(2000);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [posExpenseTitle, setPosExpenseTitle] = useState('');
  const [posExpenseAmount, setPosExpenseAmount] = useState('');
  const [posExpenseCategory, setPosExpenseCategory] = useState('INGREDIENTS');
  const [posExpensePaidVia, setPosExpensePaidVia] = useState<'DRAWER_CASH' | 'UPI'>('DRAWER_CASH');

  // System Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // KDS Ready Notification Banner (null by default; only shows when a real kitchen ticket is ready)
  const [readyNotification, setReadyNotification] = useState<{
    id?: string;
    table: string;
    orderNumber: string;
    items: string;
    count?: number;
  } | null>(null);
  const lastNotifiedReadyId = useRef<string | null>(null);

  // Web Audio Service Chime Synthesizer
  function playReadyChime() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      // First high ding (C6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, ctx.currentTime);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.35);

      // Second higher ding (E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch {
      // AudioContext unavailable
    }
  }

  // Tender / Cash State
  const [tenderAmount, setTenderAmount] = useState<number>(500);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live tables (loaded dynamically from database)
  const [tables, setTables] = useState<TableNode[]>([]);

  // Live Orders in Expediter Queue (starts clean, loaded from real orders)
  const [liveOrders, setLiveOrders] = useState<LiveOrderQueue[]>([]);
  const [servedOrders, setServedOrders] = useState<LiveOrderQueue[]>([]);
  const [expediterSubTab, setExpediterSubTab] = useState<'active' | 'served'>('active');

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

    // Live POS Data Fetcher & Synchronizer
    function loadPosData() {
      fetch('/api/pos')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.cafe?.name) setCafeName(data.cafe.name);
          if (data?.menuItems?.length) setMenuItems(data.menuItems);

          // 1. Sync Floor Tables & Carts
          if (data?.tables?.length) {
            const loadedTables: TableNode[] = data.tables.map((t: any) => {
              const tableOrders = t.currentStatus === 'AVAILABLE' ? [] : (t.orders || []);
              const allItems = tableOrders.flatMap((o: any) => o.items || []);
              const tableAmount = allItems.reduce(
                (sum: number, it: any) => sum + (it.price || 0) * (it.quantity || 1),
                0
              );
              const isOrderReady = tableOrders.some((o: any) => o.status === 'READY');
              const hasPayLater = tableOrders.some((o: any) => o.specialNotes?.includes('PAY LATER'));
              const allPrepaid =
                tableOrders.length > 0 &&
                tableOrders.every(
                  (o: any) =>
                    o.specialNotes?.includes('PREPAID') || o.specialNotes?.includes('UPI')
                );
              const pMode = allPrepaid ? 'UPI_PREPAID' : hasPayLater ? 'PAY_LATER' : null;
              const allOrderNums = tableOrders.map((o: any) => o.orderNumber).join(', ');

              return {
                id: t.id,
                tableNumber: t.tableNumber,
                capacity: t.capacity || 4,
                currentStatus: isOrderReady
                  ? 'READY_TO_SERVE'
                  : (t.currentStatus as 'AVAILABLE' | 'OCCUPIED' | 'READY_TO_SERVE') || 'AVAILABLE',
                orderNumber: allOrderNums || undefined,
                amount: tableAmount > 0 ? Math.round(tableAmount * 1.05) : undefined,
                paymentMode: pMode,
                specialNotes:
                  tableOrders
                    .map((o: any) => o.specialNotes)
                    .filter(Boolean)
                    .join(' • ') || undefined,
              };
            });

            setTables(loadedTables);

            // Synchronize Table Carts from live DB active orders (e.g. from Customer QR)
            setTableCarts((prevCarts) => {
              let changed = false;
              const nextCarts = { ...prevCarts };

              data.tables.forEach((t: any) => {
                const tableOrders = t.orders || [];
                const allItems = tableOrders.flatMap((o: any) => o.items || []);
                const localCart = prevCarts[t.tableNumber] || [];

                if (allItems.length > 0) {
                  // If local cart is empty, populate from DB orders
                  if (localCart.length === 0) {
                    nextCarts[t.tableNumber] = allItems.map((it: any) => ({
                      id: it.id,
                      name: it.name,
                      price: it.price,
                      quantity: it.quantity,
                      isVeg: true,
                      notes: it.notes,
                    }));
                    changed = true;
                  }
                } else if (t.currentStatus === 'AVAILABLE' && localCart.length > 0) {
                  // If table was freed in DB, clear local cart
                  nextCarts[t.tableNumber] = [];
                  changed = true;
                }
              });

              return changed ? nextCarts : prevCarts;
            });

            // Synchronize Table Customer details
            setTableCustomers((prevCusts) => {
              let changed = false;
              const nextCusts = { ...prevCusts };

              data.tables.forEach((t: any) => {
                const activeOrder = t.orders?.[0];
                if (activeOrder && (!prevCusts[t.tableNumber]?.name || !prevCusts[t.tableNumber]?.phone)) {
                  nextCusts[t.tableNumber] = {
                    name: activeOrder.customerName || `Guest Table ${t.tableNumber}`,
                    phone: activeOrder.customerPhone || '',
                  };
                  changed = true;
                } else if (t.currentStatus === 'AVAILABLE' && prevCusts[t.tableNumber]?.name) {
                  nextCusts[t.tableNumber] = { name: '', phone: '' };
                  changed = true;
                }
              });

              return changed ? nextCusts : prevCusts;
            });
          }

          // 2. Sync Expediter Queue & Kitchen Alerts
          if (data?.recentOrders) {
            const mappedOrders: LiveOrderQueue[] = data.recentOrders.map((o: any) => {
              const pMode = o.specialNotes?.includes('PREPAID') || o.specialNotes?.includes('UPI')
                ? 'UPI_PREPAID'
                : o.specialNotes?.includes('PAY LATER')
                ? 'PAY_LATER'
                : null;
              return {
                id: o.id,
                orderNumber: o.orderNumber,
                table: o.table?.tableNumber ? `Table ${o.table.tableNumber}` : 'Takeaway',
                customerName: o.customerName || 'Guest',
                status: o.status === 'READY' ? 'READY_AT_PASS' : 'IN_KITCHEN',
                itemsSummary: (o.items || []).map((it: any) => `${it.quantity}x ${it.name}`).join(', '),
                elapsedTime: `${Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)}m ago`,
                specialNotes: o.specialNotes,
                paymentMode: pMode,
              };
            });
            setLiveOrders(mappedOrders);
          } else {
            setLiveOrders([]);
          }

          if (data?.servedOrders) {
            const mappedServed: LiveOrderQueue[] = data.servedOrders.map((o: any) => {
              const pMode = o.specialNotes?.includes('PREPAID') || o.specialNotes?.includes('UPI')
                ? 'UPI_PREPAID'
                : o.specialNotes?.includes('PAY LATER')
                ? 'PAY_LATER'
                : null;
              return {
                id: o.id,
                orderNumber: o.orderNumber,
                table: o.table?.tableNumber ? `Table ${o.table.tableNumber}` : 'Takeaway',
                customerName: o.customerName || 'Guest',
                status: 'COMPLETED' as const,
                itemsSummary: (o.items || []).map((it: any) => `${it.quantity}x ${it.name}`).join(', '),
                elapsedTime: `Handed over ${Math.floor((Date.now() - new Date(o.updatedAt || o.createdAt).getTime()) / 60000)}m ago`,
                specialNotes: o.specialNotes,
                paymentMode: pMode,
              };
            });
            setServedOrders(mappedServed);
          } else {
            setServedOrders([]);
          }

            // 3. Detect Ready Orders for Audio Chime & Banner (supports multiple orders)
            const readyOrders = (data.recentOrders || []).filter((o: any) => o.status === 'READY');
            if (readyOrders.length > 0) {
              const topReady = readyOrders[0];
              setReadyNotification({
                id: topReady.id,
                table: topReady.table?.tableNumber || 'Takeaway',
                orderNumber: topReady.orderNumber,
                items: (topReady.items || []).map((it: any) => `${it.quantity}x ${it.name}`).join(' + '),
                count: readyOrders.length,
              });

              // Ring chime if this is a newly ready order
              if (lastNotifiedReadyId.current !== topReady.id) {
                lastNotifiedReadyId.current = topReady.id;
                playReadyChime();
              }
            } else {
              setReadyNotification(null);
            }

            // 4. Sync Active Shift & Cash Drawer Till Float
            if (data?.activeShift?.expectedCash !== undefined) {
              setDrawerCash(data.activeShift.expectedCash);
            }
        })
        .catch(() => {});
    }

    loadPosData();
    const pollInterval = setInterval(loadPosData, 1500);

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
      clearInterval(pollInterval);
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

  // Helper to compute total for any table
  const getTableAmount = (tableNum: string) => {
    const items = tableCarts[tableNum] || [];
    if (items.length === 0) return 0;
    const sub = items.reduce((s, it) => s + it.price * it.quantity, 0);
    return Math.round(sub * 1.05); // 5% GST
  };

  // Current Active Table Data
  const currentCart = tableCarts[selectedTable] || [];
  const currentCustomer = tableCustomers[selectedTable] || { name: '', phone: '' };

  const subtotal = useMemo(() => {
    return currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [currentCart]);

  const discountPercent = tableDiscounts[selectedTable] || 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const cgst = Math.round(taxableAmount * 0.025 * 100) / 100;
  const sgst = Math.round(taxableAmount * 0.025 * 100) / 100;
  const grandTotal = Math.round(taxableAmount + cgst + sgst);
  const changeDue = tenderAmount - grandTotal;

  // Add Item to Current Table Cart
  function addToCart(item: MenuItemData) {
    setTableCarts((prev) => {
      const existingCart = prev[selectedTable] || [];
      const existingItem = existingCart.find((i) => i.name === item.name);
      let updatedCart: CartItem[];

      if (existingItem) {
        updatedCart = existingCart.map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updatedCart = [
          ...existingCart,
          {
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name,
            price: item.price,
            quantity: 1,
            isVeg: item.isVeg,
            notes: item.category?.name || '',
          },
        ];
      }

      return {
        ...prev,
        [selectedTable]: updatedCart,
      };
    });

    // Mark current table occupied on floor
    setTables((prev) =>
      prev.map((t) => (t.tableNumber === selectedTable ? { ...t, currentStatus: 'OCCUPIED' } : t))
    );
  }

  // Update Quantity for Current Table Cart
  function updateQty(id: string, delta: number) {
    setTableCarts((prev) => {
      const existingCart = prev[selectedTable] || [];
      const updatedCart = existingCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];

      return {
        ...prev,
        [selectedTable]: updatedCart,
      };
    });
  }

  // Remove Item from Current Table Cart
  function removeItem(id: string) {
    setTableCarts((prev) => {
      const existingCart = prev[selectedTable] || [];
      const updatedCart = existingCart.filter((item) => item.id !== id);
      return {
        ...prev,
        [selectedTable]: updatedCart,
      };
    });
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }

  // ═══ SETTLE BILL (Opens Settlement Modal for Selected Table) ═══
  function handleSettle(method: 'CASH' | 'UPI') {
    if (currentCart.length === 0) {
      showToast(`⚠️ Table ${selectedTable} cart is empty. Add items first!`);
      return;
    }

    const billData: SettlementBill = {
      billNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      orderNumber: `#${Math.floor(1000 + Math.random() * 9000)}`,
      tableNumber: selectedTable,
      items: [...currentCart],
      subtotal,
      discount: discountAmount,
      cgst,
      sgst,
      total: grandTotal,
      paymentMethod: method,
      customerName: currentCustomer.name || `Guest Table ${selectedTable}`,
      customerPhone: currentCustomer.phone || '+91 98450 00000',
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
        items: currentCart,
        subtotal,
        discount: discountAmount,
        cgst,
        sgst,
        total: grandTotal,
        paymentMethod: method,
        customerName: currentCustomer.name || `Guest Table ${selectedTable}`,
        customerPhone: currentCustomer.phone || '+91 98450 00000',
      }),
    }).catch(() => {});
  }

  // Close Settlement Modal & Free ONLY this Table
  function handleCompleteAndFreeTable() {
    const tableToFree = settledBill?.tableNumber || selectedTable;

    // Free Table on Floor Grid
    setTables((prev) =>
      prev.map((t) =>
        t.tableNumber === tableToFree
          ? { ...t, currentStatus: 'AVAILABLE', orderNumber: undefined, amount: undefined }
          : t
      )
    );

    // Clear ONLY this table's cart
    setTableCarts((prev) => ({
      ...prev,
      [tableToFree]: [],
    }));

    // Reset customer metadata for this table
    setTableCustomers((prev) => ({
      ...prev,
      [tableToFree]: { name: '', phone: '' },
    }));

    // Reset discount for this table
    setTableDiscounts((prev) => {
      const next = { ...prev };
      delete next[tableToFree];
      return next;
    });

    setSettledBill(null);
    showToast(`✓ Table ${tableToFree} settled & freed for next guests!`);
  }

  // Toggle Flat 10% Discount for selected table
  function handleToggleDiscount() {
    if (currentCart.length === 0) {
      showToast('⚠️ Add items to cart before applying discount');
      return;
    }
    setTableDiscounts((prev) => {
      const current = prev[selectedTable] || 0;
      const next = current > 0 ? 0 : 10;
      showToast(next > 0 ? `✓ 10% Flat Discount applied to Table ${selectedTable}!` : `Discount removed from Table ${selectedTable}`);
      return { ...prev, [selectedTable]: next };
    });
  }

  // Handle Log POS Drawer Expense
  async function handleLogPosExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!posExpenseTitle || !posExpenseAmount) return;

    const amt = Number(posExpenseAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('⚠️ Please enter a valid expense amount');
      return;
    }

    if (posExpensePaidVia === 'DRAWER_CASH') {
      setDrawerCash((prev) => Math.max(0, prev - amt));
    }

    setIsExpenseModalOpen(false);
    showToast(`✓ Logged ₹${amt} (${posExpenseTitle}) to drawer expenses!`);

    fetch('/api/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-expense',
        title: posExpenseTitle,
        amount: amt,
        category: posExpenseCategory,
        paidVia: posExpensePaidVia,
      }),
    }).catch(() => {});

    setPosExpenseTitle('');
    setPosExpenseAmount('');
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
    showToast(`✓ Order served to ${tableNum}!`);

    // Persist to Supabase DB
    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bump-order', orderId }),
    }).catch(() => {});
  }

  // Park Order
  function handlePark() {
    if (currentCart.length === 0) {
      showToast('⚠️ Cart is empty. Nothing to park.');
      return;
    }
    showToast(`🅿️ Order for Table ${selectedTable} parked in Kitchen!`);
  }

  // System Wipe / Register New Cafe
  async function handleWipeDatabaseAndRegisterNew() {
    setResetLoading(true);
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset system');

      if (typeof window !== 'undefined') {
        localStorage.clear();
      }

      showToast('✓ Local database & cache wiped! Redirecting to setup...');
      setTimeout(() => {
        router.push('/onboarding');
      }, 1000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error resetting database');
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex flex-col">
      {/* ── Fixed Top Header ── */}
      <header className="sticky top-0 w-full z-40 bg-white/95 backdrop-blur-md border-b-2 border-espresso">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-paros-orange text-white flex items-center justify-center font-display font-black text-base border-2 border-espresso shadow-brutal-sm">
                P
              </div>
              <span className="font-display text-xl font-black text-espresso tracking-tight">
                PAROS<span className="text-paros-orange">.</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block w-px h-5 bg-espresso/20" />
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-paros-yellow border border-espresso font-display text-xs font-bold uppercase shadow-brutal-sm">
              <span className="w-2 h-2 rounded-full bg-paros-matcha animate-ping" />
              <span>{cafeName}</span>
            </div>
          </div>

          {/* Quick Route Switches */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <Link
              href="/pos"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl font-display text-[11px] sm:text-xs font-black uppercase bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-[15px]">point_of_sale</span>
              <span>POS</span>
            </Link>
            <Link
              href="/order"
              target="_blank"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl font-display text-[11px] sm:text-xs font-black uppercase bg-paros-mint hover:bg-paros-yellow text-espresso border-2 border-espresso shadow-brutal-sm flex items-center gap-1 shrink-0"
              title="Open Customer QR Dine-in View in new tab"
            >
              <span className="material-symbols-outlined text-[15px]">smartphone</span>
              <span>Customer QR ↗</span>
            </Link>
            <Link
              href="/kds"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl font-display text-[11px] sm:text-xs font-black uppercase bg-white hover:bg-paros-yellow text-espresso border-2 border-espresso shadow-brutal-sm flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-[15px]">soup_kitchen</span>
              <span className="hidden sm:inline">Kitchen</span> KDS
            </Link>
            <Link
              href="/admin"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl font-display text-[11px] sm:text-xs font-black uppercase bg-white hover:bg-paros-yellow text-espresso border-2 border-espresso shadow-brutal-sm flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-[15px]">analytics</span>
              <span className="hidden sm:inline">Z-Report</span>
            </Link>
          </div>

          {/* Till Float & Clock & Fresh Registration Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-paros-cream rounded-xl border border-espresso font-display text-xs font-bold shadow-brutal-sm">
              <span className="material-symbols-outlined text-[16px] text-paros-orange">point_of_sale</span>
              <span className="hidden md:inline text-espresso/60 uppercase text-[10px]">Till Cash:</span>
              <span className="font-mono font-black text-espresso">₹{drawerCash.toLocaleString('en-IN')}</span>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                title="Log quick petty cash expense from till drawer"
                className="ml-1 text-[10px] px-1.5 py-0.5 bg-paros-orange text-white rounded font-black hover:bg-orange-600 uppercase"
              >
                + Exp
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1 font-mono text-xs font-bold text-espresso bg-paros-cream px-2.5 py-1 rounded-lg border border-espresso">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              <span>{currentTime}</span>
            </div>

            {/* Wipe Cache & New Cafe Modal Trigger */}
            <button
              onClick={() => setShowResetModal(true)}
              className="brutal-btn px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-display text-xs font-black uppercase border-2 border-espresso shadow-brutal-sm flex items-center gap-1"
              title="Delete local DB & register a new cafe"
            >
              <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
              <span className="hidden sm:inline">Reset / New Cafe</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main POS Workspace ── */}
      <div className="max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6 flex-1 flex flex-col xl:flex-row gap-4">
        {/* ═══ LEFT PANEL (60%): Menu Catalog / Floor Grid ═══ */}
        <div className="w-full xl:w-[60%] flex flex-col gap-4">
          {/* ── HIGH PRIORITY KDS NOTIFICATION BANNER ── */}
          {readyNotification && (
            <div className="bg-paros-orange text-white p-3.5 rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-between gap-3 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white text-paros-orange flex items-center justify-center font-black text-lg border border-espresso shadow-sm animate-bounce">
                  🛎️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-sm uppercase tracking-wide">
                      KDS ALERT: Table {readyNotification.table} is READY for Service!
                    </span>
                    <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded font-bold">
                      {readyNotification.orderNumber}
                    </span>
                    {readyNotification.count && readyNotification.count > 1 && (
                      <span className="font-display text-[10px] bg-paros-yellow text-espresso px-2 py-0.5 rounded-full font-black uppercase border border-espresso animate-pulse">
                        +{readyNotification.count - 1} MORE READY
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-white/90 font-medium">
                    {readyNotification.items} • Handover to table runner now.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (readyNotification.id) {
                      fetch('/api/kds', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'bump-order', orderId: readyNotification.id }),
                      }).catch(() => {});
                    }
                    setReadyNotification(null);
                    showToast(`✓ Order for Table ${readyNotification.table} marked served!`);
                  }}
                  className="brutal-btn px-3 py-1.5 bg-paros-matcha text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
                >
                  ✓ Mark Served
                </button>
                <button
                  onClick={() => setActiveView('orders')}
                  className="brutal-btn px-3 py-1.5 bg-white text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
                >
                  Queue
                </button>
              </div>
            </div>
          )}

          {/* Top Operational Strip */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-espresso shadow-brutal flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border-2 border-espresso shadow-brutal-sm">
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-black text-espresso">{cafeName} Counter</span>
                  <span className="font-mono text-[10px] bg-paros-cream px-1.5 py-0.5 rounded border border-espresso font-bold">
                    ACTIVE REGISTER
                  </span>
                </div>
                <div className="flex items-center gap-2 font-display text-xs text-espresso/60 font-medium">
                  <span>Shift: Open</span>
                  <span>•</span>
                  <span className="text-paros-matcha font-bold">Supabase Cloud DB Synced</span>
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

          {/* ═══ FLOOR GRID STATUS NODES STRIP (Every Table Has Separate Bill Amount) ═══ */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-espresso shadow-brutal">
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-dashed border-espresso/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-orange text-[18px]">table_restaurant</span>
                <span className="font-display text-xs font-black uppercase text-espresso">
                  Seating Floor Grid ({tables.length} Tables) — Click Table to Switch Tab
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
                const tableAmt = getTableAmount(t.tableNumber);
                const hasItems = (tableCarts[t.tableNumber]?.length || 0) > 0;
                const isReady = t.currentStatus === 'READY_TO_SERVE';
                const isOccupied = hasItems || t.currentStatus === 'OCCUPIED';
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
                      className={`font-display text-[9px] uppercase font-bold mt-1 tabular-nums ${
                        isSelected
                          ? 'text-white'
                          : isReady
                          ? 'text-emerald-800 font-black'
                          : isOccupied
                          ? 'text-amber-800 font-bold'
                          : 'text-paros-matcha'
                      }`}
                    >
                      {isReady
                        ? `🛎️ ₹${tableAmt}`
                        : isOccupied
                        ? `₹${tableAmt}`
                        : 'Free'}
                    </span>
                    {t.paymentMode === 'UPI_PREPAID' && (
                      <span className="text-[7.5px] font-black uppercase text-emerald-800 bg-white/90 rounded px-1 mt-0.5 border border-emerald-400">
                        PAID UPI
                      </span>
                    )}
                    {t.paymentMode === 'PAY_LATER' && (
                      <span className="text-[7.5px] font-black uppercase text-amber-900 bg-amber-200/90 rounded px-1 mt-0.5 border border-amber-400">
                        DUE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ VIEW MODE: EXPEDITER QUEUE ═══ */}
          {activeView === 'orders' ? (
            <div className="bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal flex-1 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-espresso">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-paros-orange text-[22px]">soup_kitchen</span>
                  <div>
                    <h2 className="font-display text-lg font-black text-espresso">
                      Live Kitchen Expediter & Delivery Pass
                    </h2>
                    <p className="font-body text-xs text-espresso/60">
                      Live tracking of in-prep tickets and runner handovers
                    </p>
                  </div>
                </div>

                {/* Sub-tab Switcher: Active vs Handed Over to Runner */}
                <div className="flex items-center gap-1 bg-paros-cream p-1 rounded-xl border-2 border-espresso shadow-brutal-sm">
                  <button
                    onClick={() => setExpediterSubTab('active')}
                    className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                      expediterSubTab === 'active'
                        ? 'bg-paros-orange text-white shadow-brutal-sm'
                        : 'text-espresso hover:bg-paros-yellow/40'
                    }`}
                  >
                    <span>⚡ Active Pass</span>
                    <span className="bg-white/20 px-1.5 py-0.2 rounded font-mono text-[10px]">
                      {liveOrders.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setExpediterSubTab('served')}
                    className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                      expediterSubTab === 'served'
                        ? 'bg-paros-matcha text-white shadow-brutal-sm'
                        : 'text-espresso hover:bg-paros-yellow/40'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">task_alt</span>
                    <span>Handed to Runner</span>
                    <span className="bg-white/20 px-1.5 py-0.2 rounded font-mono text-[10px]">
                      {servedOrders.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* TAB 1: ACTIVE PASS / IN KITCHEN */}
              {expediterSubTab === 'active' && (
                <>
                  {liveOrders.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center my-6">
                      <div className="w-14 h-14 rounded-2xl bg-paros-mint flex items-center justify-center border-2 border-espresso shadow-brutal-sm mb-3">
                        <span className="material-symbols-outlined text-emerald-800 text-[28px]">done_all</span>
                      </div>
                      <p className="font-display font-black text-base text-espresso">Pass is Clear</p>
                      <p className="font-body text-xs text-espresso/60 max-w-xs mt-1">
                        No orders are currently cooking in the kitchen or waiting at the pass.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {liveOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className={`p-4 rounded-2xl border-2 border-espresso flex flex-col justify-between ${
                            ord.status === 'READY_AT_PASS'
                              ? 'bg-paros-mint border-emerald-600 shadow-brutal ring-2 ring-emerald-400'
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
                                    : 'bg-paros-yellow text-espresso'
                                }`}
                              >
                                {ord.status === 'READY_AT_PASS' ? 'Ready at Pass 🛎️' : 'Cooking in KDS'}
                              </span>
                            </div>

                            {/* Payment Badge */}
                            {ord.paymentMode && (
                              <div className="mb-2">
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border border-espresso ${
                                    ord.paymentMode === 'UPI_PREPAID'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                      : 'bg-amber-100 text-amber-900 border-amber-400'
                                  }`}
                                >
                                  {ord.paymentMode === 'UPI_PREPAID' ? '● PAID ONLINE (UPI)' : '● UNPAID TAB: COLLECT DUE'}
                                </span>
                              </div>
                            )}

                            <p className="font-body text-xs text-espresso font-semibold">{ord.customerName}</p>
                            <p className="font-body text-xs text-espresso/70 mt-1">{ord.itemsSummary}</p>
                            <p className="font-mono text-[10px] text-espresso/50 mt-2">{ord.elapsedTime}</p>
                          </div>

                          {ord.status === 'READY_AT_PASS' && (
                            <button
                              onClick={() => handleMarkOrderServed(ord.id, ord.table.replace('Table ', ''))}
                              className="brutal-btn mt-3 w-full py-2 bg-espresso text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              <span>Handover to Runner & Clear ➔</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: HANDED OVER TO RUNNER (RECENTLY SERVED HISTORY) */}
              {expediterSubTab === 'served' && (
                <>
                  {servedOrders.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center my-6">
                      <div className="w-14 h-14 rounded-2xl bg-paros-cream flex items-center justify-center border-2 border-espresso shadow-brutal-sm mb-3">
                        <span className="material-symbols-outlined text-espresso/60 text-[28px]">history</span>
                      </div>
                      <p className="font-display font-black text-base text-espresso">No Handed Over Orders Yet</p>
                      <p className="font-body text-xs text-espresso/60 max-w-xs mt-1">
                        When orders are marked served and given to runners, they will appear here for audit and settlement.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {servedOrders.map((ord) => {
                        const tableNumOnly = ord.table.replace('Table ', '').trim();
                        return (
                          <div
                            key={ord.id}
                            className="p-4 rounded-2xl border-2 border-espresso bg-surface-container-low shadow-brutal-sm flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-dashed border-espresso/20">
                                <div className="flex items-center gap-2">
                                  <span className="font-display font-black text-base text-espresso">{ord.table}</span>
                                  <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-espresso">
                                    {ord.orderNumber}
                                  </span>
                                </div>
                                <span className="bg-paros-matcha text-white font-display text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">task_alt</span>
                                  <span>Handed to Runner</span>
                                </span>
                              </div>

                              {/* Payment Badge */}
                              <div className="mb-2">
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border border-espresso ${
                                    ord.paymentMode === 'UPI_PREPAID'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                      : 'bg-amber-100 text-amber-900 border-amber-400'
                                  }`}
                                >
                                  {ord.paymentMode === 'UPI_PREPAID' ? '● PAID ONLINE (UPI)' : '● UNPAID TAB: COLLECT DUE'}
                                </span>
                              </div>

                              <p className="font-body text-xs text-espresso font-semibold">{ord.customerName}</p>
                              <p className="font-body text-xs text-espresso/80 mt-1">{ord.itemsSummary}</p>
                              <p className="font-mono text-[10px] text-espresso/60 mt-2 font-bold">{ord.elapsedTime}</p>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedTable(tableNumOnly);
                                setActiveView('menu');
                              }}
                              className="brutal-btn mt-3 w-full py-2 bg-white hover:bg-paros-yellow text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm flex items-center justify-center gap-1"
                            >
                              <span>Open Table {tableNumOnly} Tab ➔</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
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
                        Add to Table {selectedTable}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT PANEL (40%): Active Table Ticket & Settle ═══ */}
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
                      Table {selectedTable} Tab
                    </span>
                    <span className="px-2 py-0.5 rounded bg-paros-peach border border-espresso font-display text-[10px] font-black uppercase">
                      {currentCart.length > 0 ? `${currentCart.length} Items` : 'Empty'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Guest Name (optional)"
                      value={currentCustomer.name}
                      onChange={(e) =>
                        setTableCustomers((prev) => ({
                          ...prev,
                          [selectedTable]: { ...currentCustomer, name: e.target.value },
                        }))
                      }
                      className="px-2 py-0.5 bg-paros-cream border border-espresso rounded font-body text-xs font-semibold text-espresso outline-none w-36"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (WhatsApp)"
                      value={currentCustomer.phone}
                      onChange={(e) =>
                        setTableCustomers((prev) => ({
                          ...prev,
                          [selectedTable]: { ...currentCustomer, phone: e.target.value },
                        }))
                      }
                      className="px-2 py-0.5 bg-paros-cream border border-espresso rounded font-mono text-xs font-semibold text-espresso outline-none w-36"
                    />
                  </div>
                  {/* Quick Customer Simulator Link for This Table */}
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={`/order?table=${selectedTable}`}
                      target="_blank"
                      rel="noreferrer"
                      className="brutal-btn inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-paros-mint hover:bg-paros-yellow text-espresso border border-espresso font-display text-[10px] font-black uppercase shadow-sm transition-all"
                      title={`Open Customer Self-Order page for Table ${selectedTable} in new tab`}
                    >
                      <span className="material-symbols-outlined text-[13px]">smartphone</span>
                      <span>Test Guest QR (T-{selectedTable}) ↗</span>
                    </a>
                  </div>

                  {/* Payment Status Badge for Current Table */}
                  {(() => {
                    const currentTableNode = tables.find((t) => t.tableNumber === selectedTable);
                    if (currentTableNode?.paymentMode === 'UPI_PREPAID') {
                      return (
                        <div className="mt-2 bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-1 rounded-xl font-display text-[11px] font-black flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-emerald-700">verified</span>
                            <span>PAID ONLINE VIA UPI</span>
                          </div>
                          <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                            NO PAYMENT NEEDED
                          </span>
                        </div>
                      );
                    }
                    if (currentTableNode?.paymentMode === 'PAY_LATER') {
                      return (
                        <div className="mt-2 bg-amber-100 text-amber-950 border border-amber-400 px-2.5 py-1 rounded-xl font-display text-[11px] font-black flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-amber-700">pending</span>
                            <span>PAY LATER TAB: COLLECT AT COUNTER</span>
                          </div>
                          <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                            COLLECT DUE
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-espresso">{currentTime}</span>
                  <div className="font-display text-[10px] font-black text-paros-matcha uppercase flex items-center justify-end gap-1 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        currentCart.length > 0 ? 'bg-amber-500' : 'bg-paros-matcha'
                      }`}
                    />
                    {currentCart.length > 0 ? 'Dine-In Occupied' : 'Table Available'}
                  </div>
                </div>
              </div>

              {/* Cart List */}
              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {currentCart.length === 0 ? (
                  <div className="py-10 px-4 text-center bg-paros-cream/50 rounded-2xl border-2 border-dashed border-espresso/30 flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-espresso/40 text-[32px]">
                      shopping_bag
                    </span>
                    <p className="font-display text-sm font-black text-espresso/70">
                      Table {selectedTable} Cart is Empty
                    </p>
                    <p className="font-body text-xs text-espresso/50 max-w-xs">
                      Tap any beverage or dish from the menu on the left to add items to this table.
                    </p>
                  </div>
                ) : (
                  currentCart.map((item) => (
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
                  onClick={() => {
                    if (currentCart.length === 0) {
                      showToast('⚠️ Add items to cart before splitting bill');
                      return;
                    }
                    setIsSplitModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">call_split</span>
                  <span>Split</span>
                </button>
                <button
                  onClick={handleToggleDiscount}
                  className={`p-1.5 rounded-lg border font-display text-[10px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5 transition-colors ${
                    discountPercent > 0
                      ? 'bg-paros-orange text-white border-espresso ring-1 ring-espresso'
                      : 'bg-paros-cream hover:bg-paros-yellow border-espresso text-espresso'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">percent</span>
                  <span>{discountPercent > 0 ? '10% Applied' : 'Discount'}</span>
                </button>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="p-1.5 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt</span>
                  <span>Expense</span>
                </button>
              </div>

              {/* Receipt Breakdown for Selected Table */}
              <div className="bg-paros-cream p-3 rounded-xl border border-espresso font-mono text-xs flex flex-col gap-1">
                <div className="flex justify-between text-espresso/70">
                  <span>Table {selectedTable} Subtotal ({currentCart.length} items)</span>
                  <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount (10% OFF)</span>
                    <span className="tabular-nums">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
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
              {grandTotal > 0 && (
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
                    {[grandTotal, Math.ceil(grandTotal / 100) * 100, 500, 1000].map((amt, i) => (
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
              )}

              {/* PRIMARY SETTLEMENT BUTTONS (Triggers Modal) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSettle('CASH')}
                  className="brutal-btn py-3.5 font-display font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 bg-espresso text-white hover:bg-espresso/90 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span>SETTLE CASH {grandTotal > 0 ? `₹${grandTotal}` : ''}</span>
                </button>
                <button
                  onClick={() => handleSettle('UPI')}
                  className="brutal-btn py-3.5 font-display font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 bg-paros-matcha text-white hover:bg-emerald-700 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                  <span>CONFIRM UPI PAID</span>
                </button>
              </div>

              {/* Secondary Peripheral Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const phoneClean = currentCustomer.phone.replace(/[^0-9]/g, '');
                    if (!phoneClean) {
                      showToast('⚠️ Enter guest phone number in tab header first!');
                      return;
                    }
                    window.open(
                      `https://wa.me/${phoneClean}?text=Hello%20${currentCustomer.name || 'Guest'}!%20Here%20is%20your%20bill%20for%20Table%20${selectedTable}%20(₹${grandTotal})%20at%20${cafeName}.%20Thank%20you%20for%20visiting!`,
                      '_blank'
                    );
                    showToast(`📲 WhatsApp bill dispatched to ${currentCustomer.phone}!`);
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
                {settledBill.discount !== undefined && settledBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount (10% OFF)</span>
                    <span>-₹{settledBill.discount.toFixed(2)}</span>
                  </div>
                )}
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
                  value={settledBill.customerPhone}
                  onChange={(e) =>
                    setSettledBill((prev) => (prev ? { ...prev, customerPhone: e.target.value } : null))
                  }
                  placeholder="+91 98450 XXXXX"
                  className="flex-1 px-3 py-2 bg-white border-2 border-espresso rounded-xl font-mono text-xs font-bold text-espresso outline-none"
                />
                <button
                  onClick={() => {
                    setWhatsappSentStatus(true);
                    const clean = settledBill.customerPhone.replace(/[^0-9]/g, '');
                    window.open(
                      `https://wa.me/${clean}?text=Hello%20${settledBill.customerName}!%20Here%20is%20your%20tax%20invoice%20${settledBill.billNumber}%20for%20₹${settledBill.total}%20at%20${cafeName}.%20Thank%20you%20for%20visiting!`,
                      '_blank'
                    );
                    showToast(`✓ Official GST receipt dispatched to ${settledBill.customerPhone}!`);
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: WIPE SYSTEM & REGISTER NEW CAFE OVERLAY ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {showResetModal && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-6 sm:p-8 w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-espresso">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black text-xl border-2 border-espresso shadow-brutal-sm">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-display text-lg font-black text-espresso">
                  Reset Local DB & Register New Cafe?
                </h3>
                <p className="font-body text-xs text-espresso/70">
                  Clean slate setup wizard
                </p>
              </div>
            </div>

            <p className="font-body text-sm text-espresso/80 leading-relaxed">
              Ye action local SQLite database se saare test orders, previous tables, bills aur session cookies ko completely <strong>wipe clean</strong> kar dega, taaki aap apna <strong>naya cafe name, custom tables aur details</strong> Onboarding me fresh register kar sakein.
            </p>

            <div className="bg-paros-yellow/40 p-3 rounded-xl border border-espresso font-display text-xs font-bold text-espresso">
              ⚡ Action hone ke baad aap seedha Onboarding Wizard step 1 par redirect ho jayenge!
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetLoading}
                className="flex-1 py-3 bg-white hover:bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeDatabaseAndRegisterNew}
                disabled={resetLoading}
                className="brutal-btn flex-1 py-3 bg-red-600 text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {resetLoading ? 'sync' : 'delete'}
                </span>
                <span>{resetLoading ? 'Wiping DB...' : 'Wipe & Register New'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Split Bill Calculator ── */}
      {isSplitModalOpen && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-6 sm:p-7 w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-orange text-[24px]">call_split</span>
                <h3 className="font-display text-lg font-black text-espresso">
                  Split Table {selectedTable} Bill
                </h3>
              </div>
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs hover:bg-paros-orange hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-paros-cream rounded-2xl border-2 border-espresso mb-4 text-center">
              <span className="font-display text-xs uppercase font-bold text-espresso/60 block">
                Total Amount Payable
              </span>
              <span className="font-display text-3xl font-black text-paros-orange tabular-nums">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            <div className="mb-4">
              <label className="font-display text-xs font-black uppercase text-espresso block mb-2">
                Number of Guests Sharing:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSplitCount(cnt)}
                    className={`py-2 rounded-xl font-display text-sm font-black border transition-all ${
                      splitCount === cnt
                        ? 'bg-paros-orange text-white border-espresso shadow-brutal-sm'
                        : 'bg-paros-cream text-espresso border-espresso hover:bg-paros-yellow/40'
                    }`}
                  >
                    {cnt} Way
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-paros-mint/40 rounded-2xl border-2 border-espresso mb-4">
              <div className="flex justify-between items-center">
                <span className="font-display text-xs font-black uppercase text-espresso">
                  Each Guest Pays:
                </span>
                <span className="font-display text-2xl font-black text-espresso tabular-nums">
                  ₹{Math.ceil(grandTotal / splitCount)}
                </span>
              </div>
              <p className="font-body text-xs text-espresso/70 mt-1">
                Even split among {splitCount} guests ({splitCount} × ₹{Math.ceil(grandTotal / splitCount)})
              </p>
            </div>

            <button
              onClick={() => {
                const perPerson = Math.ceil(grandTotal / splitCount);
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(
                    `Table ${selectedTable} Split Bill (${splitCount} guests): Total ₹${grandTotal} = ₹${perPerson} each. Pay via UPI: paros.demo@okhdfcbank`
                  );
                }
                showToast(`✓ Copied ₹${perPerson} split bill summary to clipboard!`);
                setIsSplitModalOpen(false);
              }}
              className="brutal-btn w-full py-3 bg-paros-matcha text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              <span>Copy Split UPI Text ➔</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: POS Drawer Expense Modal ── */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-6 w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-paros-orange text-[22px]">payments</span>
                <div>
                  <h3 className="font-display text-lg font-black text-espresso">
                    Log Drawer Cash Expense
                  </h3>
                  <p className="font-body text-xs text-espresso/60">
                    Till Float: ₹{drawerCash.toLocaleString('en-IN')} available
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs hover:bg-paros-orange hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick 1-tap presets */}
            <div className="mb-4">
              <label className="font-display text-[10px] font-black uppercase tracking-wider text-espresso/70 block mb-1.5">
                ⚡ Quick Presets (1-Tap):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '🥛 Fresh Milk (10L)', title: 'Fresh Milk (10L)', amount: 340, category: 'INGREDIENTS' },
                  { label: '🧊 Ice Bags (50kg)', title: 'Ice Bags (50kg)', amount: 120, category: 'INGREDIENTS' },
                  { label: '💧 RO Water Jars', title: 'RO Water 20L Jars', amount: 80, category: 'UTILITIES' },
                  { label: '📦 Takeaway Cups', title: 'Paper Cups & Lids', amount: 450, category: 'PACKAGING' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setPosExpenseTitle(preset.title);
                      setPosExpenseAmount(String(preset.amount));
                      setPosExpenseCategory(preset.category);
                      setPosExpensePaidVia('DRAWER_CASH');
                    }}
                    className="p-2 bg-paros-cream rounded-xl border border-espresso text-left hover:bg-paros-yellow/40 transition-colors shadow-xs"
                  >
                    <span className="font-display text-xs font-bold text-espresso block">{preset.label}</span>
                    <span className="font-mono text-[11px] font-bold text-espresso/70">₹{preset.amount}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLogPosExpense} className="flex flex-col gap-3.5">
              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Expense Description:
                </label>
                <input
                  type="text"
                  value={posExpenseTitle}
                  onChange={(e) => setPosExpenseTitle(e.target.value)}
                  placeholder="e.g. Milk, Mint leaves, Lemons"
                  required
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-sm font-bold text-espresso outline-none"
                />
              </div>

              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Amount (₹):
                </label>
                <input
                  type="number"
                  value={posExpenseAmount}
                  onChange={(e) => setPosExpenseAmount(e.target.value)}
                  placeholder="340"
                  required
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-xl font-black text-espresso outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                    Category:
                  </label>
                  <select
                    value={posExpenseCategory}
                    onChange={(e) => setPosExpenseCategory(e.target.value)}
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                  >
                    <option value="INGREDIENTS">Ingredients</option>
                    <option value="PACKAGING">Packaging</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="MISC">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                    Paid Via:
                  </label>
                  <select
                    value={posExpensePaidVia}
                    onChange={(e) => setPosExpensePaidVia(e.target.value as 'DRAWER_CASH' | 'UPI')}
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                  >
                    <option value="DRAWER_CASH">Drawer Float Cash</option>
                    <option value="UPI">Direct UPI</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="brutal-btn w-full py-3.5 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal mt-1"
              >
                Log Expense & Deduct Float ➔
              </button>
            </form>
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
