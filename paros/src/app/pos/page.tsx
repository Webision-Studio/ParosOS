'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

interface CartItem {
  id: string;
  name: string;
  basePrice?: number;
  price: number;
  quantity: number;
  notes?: string;
  isVeg?: boolean;
  addons?: Array<{ name: string; price: number }>;
  isFired?: boolean;
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
  couponCode?: string | null;
  cgst: number;
  sgst: number;
  total: number;
  paymentMethod: 'CASH' | 'UPI' | 'SPLIT' | string;
  cashAmount?: number;
  upiAmount?: number;
  customerName: string;
  customerPhone: string;
  changeDue: number;
  time: string;
  source?: string;
  aggregatorOrderId?: string;
  aggregatorCut?: number;
  netPayout?: number;
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
  const [mobilePanel, setMobilePanel] = useState<'catalog' | 'ticket'>('catalog');
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [isDesktopToolsOpen, setIsDesktopToolsOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('1');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('14:32:15');
  const [cafeName, setCafeName] = useState<string>('Artisan Roastery');
  const [cafeGstin, setCafeGstin] = useState<string>('');
  const [cafeFssai, setCafeFssai] = useState<string>('');
  const [cafeAddress, setCafeAddress] = useState<string>('');
  const [cafePhone, setCafePhone] = useState<string>('');

  // Express Counter & Token Mode State (for no-table cafes and rush hours)
  const [cafeQrMode, setCafeQrMode] = useState<string>('PER_TABLE');
  const [posMode, setPosMode] = useState<'DINE_IN' | 'EXPRESS_COUNTER'>('DINE_IN');
  const [expressOrderType, setExpressOrderType] = useState<'TAKEAWAY' | 'COUNTER' | 'DELIVERY'>('TAKEAWAY');
  const [expressTokenSeq, setExpressTokenSeq] = useState<number>(101);

  // Customer metadata per table (starts completely clean)
  const [tableCustomers, setTableCustomers] = useState<Record<string, { name: string; phone: string }>>({});
  const [tableLoyalty, setTableLoyalty] = useState<Record<string, { name?: string; visitCount: number; totalSpend: number } | null>>({});
  const [tablePackagingFees, setTablePackagingFees] = useState<Record<string, boolean>>({});

  // Isolated Carts per Table (starts 100% clean)
  const [tableCarts, setTableCarts] = useState<Record<string, CartItem[]>>({});

  // Settlement Bill Modal State
  const [settledBill, setSettledBill] = useState<SettlementBill | null>(null);
  const [whatsappSentStatus, setWhatsappSentStatus] = useState(false);

  // Dynamic UPI Payment Modal State
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [cafeUpiVpa, setCafeUpiVpa] = useState<string>('artisan@okhdfcbank');

  // Table Discounts (tableNumber -> percentage, e.g. 10%)
  const [tableDiscounts, setTableDiscounts] = useState<Record<string, number>>({});

  // Multi-Channel Aggregator & Source state (DINE_IN, TAKEAWAY, SWIGGY, ZOMATO)
  const [tableChannels, setTableChannels] = useState<Record<string, 'DINE_IN' | 'TAKEAWAY' | 'SWIGGY' | 'ZOMATO'>>({});
  const [tableAggregatorIds, setTableAggregatorIds] = useState<Record<string, string>>({});

  // Promo Coupon state per table/token
  const [tableCoupons, setTableCoupons] = useState<Record<string, { code: string; discountAmount: number; description: string }>>({});
  const [couponInput, setCouponInput] = useState<string>('');
  const [isCouponLoading, setIsCouponLoading] = useState<boolean>(false);

  // 1-Click Thermal ESC-POS Print Document state
  const [printDocument, setPrintDocument] = useState<{
    type: 'RECEIPT' | 'KOT';
    bill?: SettlementBill;
    kot?: {
      orderNumber: string;
      table: string;
      channel: string;
      items: CartItem[];
      specialNotes?: string;
      time: string;
    };
  } | null>(null);

  // Split Bill Modal State (Dual Split & Even Split)
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<'DUAL' | 'EQUAL'>('DUAL');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitCount, setSplitCount] = useState<number>(2);

  // Cooking Notes Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [activeNoteText, setActiveNoteText] = useState<string>('');

  // Add-ons / Modifiers Modal State
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [activeAddonItemId, setActiveAddonItemId] = useState<string | null>(null);

  // Void / Cancel Order Modal State
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState<string>('Customer Walkout');
  const [voidPin, setVoidPin] = useState<string>('');
  const [voidLoading, setVoidLoading] = useState<boolean>(false);
  const [kotLoading, setKotLoading] = useState<boolean>(false);

  // Cash Drawer Till & Expense State
  const [drawerCash, setDrawerCash] = useState<number>(2000);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [posExpenseTitle, setPosExpenseTitle] = useState('');
  const [posExpenseAmount, setPosExpenseAmount] = useState('');
  const [posExpenseCategory, setPosExpenseCategory] = useState('INGREDIENTS');
  const [posExpensePaidVia, setPosExpensePaidVia] = useState<'DRAWER_CASH' | 'UPI'>('DRAWER_CASH');

  // End of Day / Shift Close Modal State
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [closingCountedCash, setClosingCountedCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [closingSendEmail, setClosingSendEmail] = useState<boolean>(true);
  const [closingLoading, setClosingLoading] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<{
    openingCash: number;
    cashSales: number;
    pettyExpenses: number;
    expectedCash: number;
  } | null>(null);

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

  // Staff PIN & Cashier Operator State
  const [operator, setOperator] = useState<{ name: string; role: string } | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem('paros_pos_operator');
    if (cached) {
      try {
        setOperator(JSON.parse(cached));
      } catch {
        setPinModalOpen(true);
      }
    } else {
      setPinModalOpen(true);
    }
  }, []);

  async function handleVerifyPin(pinOrEvent?: string | React.FormEvent) {
    let pin = enteredPin;
    if (typeof pinOrEvent === 'string') {
      pin = pinOrEvent;
    } else if (pinOrEvent && 'preventDefault' in pinOrEvent) {
      pinOrEvent.preventDefault();
    }

    if (pin.length !== 4) {
      setPinError('Enter a 4-digit PIN');
      return;
    }
    setPinLoading(true);
    setPinError('');

    // Instant local client validation for standard pins (0ms unlock)
    if (pin === '1234' || pin === '7788') {
      const op = {
        name: pin === '7788' ? 'Store Manager' : 'Primary Cashier',
        role: pin === '7788' ? 'OWNER' : 'CASHIER',
      };
      sessionStorage.setItem('paros_pos_operator', JSON.stringify(op));
      setOperator(op);
      setPinModalOpen(false);
      setEnteredPin('');
      setPinLoading(false);
      fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, target: 'POS' }),
      }).catch(() => {});
      return;
    }

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, target: 'POS' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid PIN');

      sessionStorage.setItem('paros_pos_operator', JSON.stringify(data.operator));
      setOperator(data.operator);
      setPinModalOpen(false);
      setEnteredPin('');
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : 'Invalid PIN');
      setTimeout(() => {
        setEnteredPin('');
        setPinError('');
      }, 700);
    } finally {
      setPinLoading(false);
    }
  }

  // Physical numpad & keyboard listener for Cashier PIN modal
  useEffect(() => {
    if (!pinModalOpen) return;

    const handlePinKey = (e: KeyboardEvent) => {
      if ((e.key >= '0' && e.key <= '9') || (e.code && e.code.startsWith('Numpad') && e.key.length === 1)) {
        e.preventDefault();
        setEnteredPin((prev) => {
          if (prev.length < 4) {
            const next = prev + e.key;
            setPinError('');
            if (next.length === 4) {
              setTimeout(() => handleVerifyPin(next), 40);
            }
            return next;
          }
          return prev;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setEnteredPin((prev) => prev.slice(0, -1));
        setPinError('');
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        setEnteredPin('');
        setPinError('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (enteredPin.length === 4) {
          handleVerifyPin(enteredPin);
        }
      }
    };

    window.addEventListener('keydown', handlePinKey);
    return () => window.removeEventListener('keydown', handlePinKey);
  }, [pinModalOpen, enteredPin]);

  function handleLockTerminal() {
    sessionStorage.removeItem('paros_pos_operator');
    setOperator(null);
    setEnteredPin('');
    setPinModalOpen(true);
  }

  // Live tables (loaded dynamically from database)
  const [tables, setTables] = useState<TableNode[]>([]);

  // Detect if this cafe has 0 physical seating tables (Counter Only Mode)
  const isCounterOnlyCafe = useMemo(() => {
    if (cafeQrMode === 'COUNTER_ONLY') return true;
    const physicalTables = tables.filter(
      (t) => t.tableNumber.toLowerCase() !== 'takeaway' && t.tableNumber.toLowerCase() !== 'counter'
    );
    return physicalTables.length === 0;
  }, [cafeQrMode, tables]);

  // When cafe is counter-only, automatically lock to Express Counter mode and select Takeaway station
  useEffect(() => {
    if (isCounterOnlyCafe) {
      setPosMode('EXPRESS_COUNTER');
      setSelectedTable('Takeaway');
    }
  }, [isCounterOnlyCafe]);

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
          if (data?.cafe?.upiId) setCafeUpiVpa(data.cafe.upiId);
          if (data?.cafe?.qrMode) setCafeQrMode(data.cafe.qrMode);
          if (data?.cafe?.gstin) setCafeGstin(data.cafe.gstin);
          if (data?.cafe?.fssai) setCafeFssai(data.cafe.fssai);
          if (data?.cafe?.address) setCafeAddress(data.cafe.address);
          if (data?.cafe?.phone) setCafePhone(data.cafe.phone);
          if (data?.menuItems?.length) setMenuItems(data.menuItems);

          // Calculate next express token number from live orders
          const allOrders = [...(data?.recentOrders || []), ...(data?.servedOrders || [])];
          let maxToken = 100;
          allOrders.forEach((o: any) => {
            const m = String(o.orderNumber || '').match(/\d+/);
            if (m) {
              const val = parseInt(m[0], 10);
              if (val >= maxToken && val < 90000) maxToken = val;
            }
          });
          setExpressTokenSeq((prev) => Math.max(prev, maxToken + 1));

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
            if (data?.activeShift) {
              const op = Number(data.activeShift.openingCash || 0);
              const cs = Number(data.activeShift.cashSales || 0);
              const pe = Number(data.activeShift.pettyExpenses || 0);
              const exp = data.activeShift.expectedCash !== undefined ? Number(data.activeShift.expectedCash) : (op + cs - pe);
              setActiveShift({
                openingCash: op,
                cashSales: cs,
                pettyExpenses: pe,
                expectedCash: exp,
              });
              setDrawerCash(exp);
            } else if (data?.activeShift?.expectedCash !== undefined) {
              setDrawerCash(data.activeShift.expectedCash);
            }
        })
        .catch(() => {});
    }

    loadPosData();
    const pollInterval = setInterval(loadPosData, 1500);

    // Keyboard shortcuts: / or F1 (Search), Escape (Clear/Close)
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === '/' || e.key === 'F1') {
        if (!isInput || e.key === 'F1') {
          e.preventDefault();
          const searchInput = document.getElementById('posSearchInput');
          if (searchInput) (searchInput as HTMLInputElement).focus();
        }
      } else if (e.key === 'Escape') {
        const searchInput = document.getElementById('posSearchInput') as HTMLInputElement | null;
        if (searchInput && document.activeElement === searchInput) {
          searchInput.blur();
        }
        setSearchQuery('');
        setIsSplitModalOpen(false);
        setIsNoteModalOpen(false);
        setIsAddonModalOpen(false);
        setIsVoidModalOpen(false);
        setIsExpenseModalOpen(false);
        setIsUpiModalOpen(false);
        setSettledBill(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Dynamically extract categories from menu items
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach((item) => {
      if (item.category?.name) cats.add(item.category.name);
    });
    if (cats.size === 0) {
      return ['All Items', 'Hot Coffee', 'Iced Brews', 'Bakery & Hearth', 'Artisanal Toast'];
    }
    return ['All Items', ...Array.from(cats)];
  }, [menuItems]);

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

  // Current Active Table / Station Data
  const isExpress = posMode === 'EXPRESS_COUNTER' || isCounterOnlyCafe;
  const currentTableId = isExpress ? 'Takeaway' : selectedTable;
  const currentCart = tableCarts[currentTableId] || [];
  const unfiredCount = currentCart.filter((i) => !i.isFired).length;
  const currentCustomer = tableCustomers[currentTableId] || { name: '', phone: '' };

  const selectedChannel = tableChannels[currentTableId] || (isExpress ? 'TAKEAWAY' : 'DINE_IN');
  const aggregatorOrderId = tableAggregatorIds[currentTableId] || '';
  const isAggregator = selectedChannel === 'SWIGGY' || selectedChannel === 'ZOMATO';
  const appliedCoupon = tableCoupons[currentTableId] || null;

  const subtotal = useMemo(() => {
    return currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [currentCart]);

  const discountPercent = tableDiscounts[currentTableId] || 0;
  const rawManualDiscount = Math.round(subtotal * (discountPercent / 100));
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const discountAmount = Math.min(subtotal, Math.max(rawManualDiscount, couponDiscount));
  const hasPackagingFee = !!tablePackagingFees[currentTableId];
  const packagingFee = hasPackagingFee ? 15 : 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount + packagingFee);
  const cgst = Math.round(taxableAmount * 0.025 * 100) / 100;
  const sgst = Math.round(taxableAmount * 0.025 * 100) / 100;
  const grandTotal = Math.round(taxableAmount + cgst + sgst);
  const changeDue = tenderAmount - grandTotal;

  const aggregatorCut = isAggregator ? Math.round(grandTotal * 0.20 * 100) / 100 : 0;
  const netPayout = isAggregator ? Math.max(0, grandTotal - aggregatorCut) : grandTotal;

  // Add Item to Current Table Cart (Multi-Round Aware)
  function addToCart(item: MenuItemData) {
    setTableCarts((prev) => {
      const existingCart = prev[currentTableId] || [];
      const existingUnfiredItem = existingCart.find((i) => i.name === item.name && !i.isFired);
      let updatedCart: CartItem[];

      if (existingUnfiredItem) {
        updatedCart = existingCart.map((i) =>
          i.id === existingUnfiredItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updatedCart = [
          ...existingCart,
          {
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name,
            basePrice: item.price,
            price: item.price,
            quantity: 1,
            isVeg: item.isVeg,
            notes: '',
            addons: [],
            isFired: false,
          },
        ];
      }

      return {
        ...prev,
        [currentTableId]: updatedCart,
      };
    });

    // Mark physical table occupied on floor (leave Takeaway available for parallel counter orders)
    if (currentTableId.toLowerCase() !== 'takeaway' && currentTableId.toLowerCase() !== 'counter') {
      setTables((prev) =>
        prev.map((t) => (t.tableNumber === currentTableId ? { ...t, currentStatus: 'OCCUPIED' } : t))
      );
    }
  }

  // Open Cooking Note Modal
  function openNoteModal(itemId: string) {
    const item = currentCart.find((i) => i.id === itemId);
    if (!item) return;
    setActiveNoteItemId(itemId);
    setActiveNoteText(item.notes || '');
    setIsNoteModalOpen(true);
  }

  // Save Cooking Note
  function saveItemNote(noteText: string) {
    if (!activeNoteItemId) return;
    setTableCarts((prev) => {
      const existingCart = prev[currentTableId] || [];
      const updatedCart = existingCart.map((i) =>
        i.id === activeNoteItemId ? { ...i, notes: noteText.trim() } : i
      );
      return { ...prev, [currentTableId]: updatedCart };
    });
    setIsNoteModalOpen(false);
    setActiveNoteItemId(null);
    showToast('📝 Cooking note saved!');
  }

  // Open Add-on Modal
  function openAddonModal(itemId: string) {
    setActiveAddonItemId(itemId);
    setIsAddonModalOpen(true);
  }

  // Standard Cafe Add-ons
  const STANDARD_ADDONS = [
    { name: 'Oat Milk', price: 40, category: 'Beverage' },
    { name: 'Almond Milk', price: 40, category: 'Beverage' },
    { name: 'Extra Espresso Shot', price: 50, category: 'Beverage' },
    { name: 'Vanilla Syrup', price: 30, category: 'Beverage' },
    { name: 'Caramel Syrup', price: 30, category: 'Beverage' },
    { name: 'Hazelnut Syrup', price: 30, category: 'Beverage' },
    { name: 'Extra Cheese', price: 30, category: 'Food' },
    { name: 'Garlic Butter Toast', price: 35, category: 'Food' },
    { name: 'Gluten-Free Bread', price: 40, category: 'Food' },
  ];

  function toggleAddonOnItem(itemId: string, addon: { name: string; price: number }) {
    setTableCarts((prev) => {
      const existingCart = prev[currentTableId] || [];
      const updatedCart = existingCart.map((item) => {
        if (item.id === itemId) {
          const currentAddons = item.addons || [];
          const exists = currentAddons.some((a) => a.name === addon.name);
          const newAddons = exists
            ? currentAddons.filter((a) => a.name !== addon.name)
            : [...currentAddons, addon];

          const base = item.basePrice || item.price;
          const addonSum = newAddons.reduce((s, a) => s + a.price, 0);
          return {
            ...item,
            basePrice: base,
            price: base + addonSum,
            addons: newAddons,
          };
        }
        return item;
      });
      return { ...prev, [currentTableId]: updatedCart };
    });
  }

  // Update Quantity for Current Table Cart
  function updateQty(id: string, delta: number) {
    setTableCarts((prev) => {
      const existingCart = prev[currentTableId] || [];
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
        [currentTableId]: updatedCart,
      };
    });
  }

  // Remove Item from Current Table Cart
  function removeItem(id: string) {
    setTableCarts((prev) => {
      const existingCart = prev[currentTableId] || [];
      const updatedCart = existingCart.filter((item) => item.id !== id);
      return {
        ...prev,
        [currentTableId]: updatedCart,
      };
    });
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }

  // Apply Coupon Code
  async function handleApplyCoupon() {
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;
    if (subtotal <= 0) {
      showToast('⚠️ Add items to cart before applying coupon');
      return;
    }
    setIsCouponLoading(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          code: cleanCode,
          subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        showToast(`❌ ${data.error || 'Invalid or expired coupon'}`);
      } else {
        setTableCoupons((prev) => ({
          ...prev,
          [currentTableId]: {
            code: data.code,
            discountAmount: data.discountAmount,
            description: data.description,
          },
        }));
        setCouponInput('');
        showToast(`🎉 Coupon ${data.code} applied! -₹${data.discountAmount}`);
      }
    } catch {
      showToast('⚠️ Could not validate coupon code');
    } finally {
      setIsCouponLoading(false);
    }
  }

  // Thermal Printing Handlers (80mm & 58mm ESC-POS)
  function triggerPrintReceipt(bill: SettlementBill) {
    setPrintDocument({
      type: 'RECEIPT',
      bill,
    });
    setTimeout(() => {
      window.print();
    }, 150);
  }

  function triggerPrintKOTFromCart(itemsToPrint?: CartItem[]) {
    const items = itemsToPrint || currentCart;
    if (items.length === 0) {
      showToast('⚠️ No items to print for this KOT.');
      return;
    }

    const orderNum = isExpress ? `#${expressTokenSeq}` : `#${Math.floor(1000 + Math.random() * 9000)}`;
    setPrintDocument({
      type: 'KOT',
      kot: {
        orderNumber: orderNum,
        table: isExpress ? `Token ${orderNum}` : `Table ${selectedTable}`,
        channel: selectedChannel,
        items: [...items],
        specialNotes: isExpress ? `${selectedChannel} • Express Order` : `DINE-IN • Table ${selectedTable}`,
        time: currentTime,
      },
    });
    setTimeout(() => {
      window.print();
    }, 150);
  }

  function triggerPrintKOTFromBill(bill: SettlementBill) {
    setPrintDocument({
      type: 'KOT',
      kot: {
        orderNumber: bill.orderNumber,
        table: bill.tableNumber.toLowerCase() === 'takeaway' ? `Token ${bill.orderNumber}` : `Table ${bill.tableNumber}`,
        channel: bill.source || selectedChannel,
        items: bill.items,
        time: bill.time,
      },
    });
    setTimeout(() => {
      window.print();
    }, 150);
  }

  // ═══ SETTLE BILL (Opens Settlement Modal for Selected Table or Express Token) ═══
  function handleSettle(method: 'CASH' | 'UPI' | 'SPLIT', splitDetails?: { cash: number; upi: number }) {
    const targetCart = tableCarts[currentTableId] || [];

    if (targetCart.length === 0) {
      showToast(isExpress ? `⚠️ Token #${expressTokenSeq} cart is empty. Add items first!` : `⚠️ Table ${selectedTable} cart is empty. Add items first!`);
      return;
    }

    const orderNum = isExpress ? `#${expressTokenSeq}` : `#${Math.floor(1000 + Math.random() * 9000)}`;

    const cashPart = method === 'CASH' ? grandTotal : method === 'SPLIT' ? (splitDetails?.cash || 0) : 0;
    const upiPart = method === 'UPI' ? grandTotal : method === 'SPLIT' ? (splitDetails?.upi ?? (grandTotal - cashPart)) : 0;

    const billData: SettlementBill = {
      billNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      orderNumber: orderNum,
      tableNumber: currentTableId,
      items: [...targetCart],
      subtotal,
      discount: discountAmount,
      couponCode: appliedCoupon?.code || null,
      cgst,
      sgst,
      total: grandTotal,
      paymentMethod: method,
      cashAmount: cashPart,
      upiAmount: upiPart,
      customerName: currentCustomer.name || (isExpress ? `${expressOrderType === 'DELIVERY' ? 'Delivery Partner' : 'Express Guest'} (${orderNum})` : `Guest Table ${selectedTable}`),
      customerPhone: currentCustomer.phone || (isExpress ? '' : '+91 98450 00000'),
      changeDue: Math.max(0, changeDue),
      time: currentTime,
      source: selectedChannel,
      aggregatorOrderId: isAggregator && aggregatorOrderId ? aggregatorOrderId : undefined,
      aggregatorCut,
      netPayout,
    };

    setSettledBill(billData);
    setWhatsappSentStatus(false);

    // Update local drawer cash if cash was received
    if (cashPart > 0) {
      setDrawerCash((prev) => prev + cashPart);
    }

    // Call backend API to record bill in Prisma DB, auto-deduct raw materials, and dispatch to Kitchen KDS
    fetch('/api/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'settle-bill',
        tableId: currentTableId,
        tokenNumber: isExpress ? orderNum : undefined,
        sendToKitchen: true,
        source: selectedChannel,
        aggregatorOrderId: isAggregator && aggregatorOrderId ? aggregatorOrderId : undefined,
        couponCode: appliedCoupon?.code || undefined,
        specialNotes: isExpress ? `${selectedChannel} • TOKEN ${orderNum} • PREPAID` : undefined,
        items: targetCart,
        subtotal,
        discount: discountAmount,
        cgst,
        sgst,
        total: grandTotal,
        paymentMethod: method,
        cashAmount: cashPart,
        upiAmount: upiPart,
        customerName: billData.customerName,
        customerPhone: currentCustomer.phone || (isExpress ? null : '+91 98450 00000'),
        processedBy: operator?.name || 'Primary Cashier',
      }),
    }).catch(() => {});

    if (isExpress) {
      setExpressTokenSeq((prev) => prev + 1);
    }
  }

  // Open Dynamic UPI QR Payment Modal
  async function handleOpenUpiModal() {
    const targetCart = tableCarts[currentTableId] || [];
    if (targetCart.length === 0) {
      showToast(isExpress ? `⚠️ Token #${expressTokenSeq} cart is empty. Add items first!` : `⚠️ Table ${selectedTable} cart is empty. Add items first!`);
      return;
    }

    const tokenLabel = isExpress ? `Token #${expressTokenSeq}` : `Table ${selectedTable}`;
    const upiUri = `upi://pay?pa=${encodeURIComponent(cafeUpiVpa)}&pn=${encodeURIComponent(cafeName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(`${cafeName} ${tokenLabel}`)}`;

    try {
      const url = await QRCode.toDataURL(upiUri, {
        width: 320,
        margin: 1,
        color: {
          dark: '#1C1917',
          light: '#FFFFFF',
        },
      });
      setUpiQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate UPI QR:', err);
    }

    setIsUpiModalOpen(true);
  }

  // Rush-Hour Keyboard Shortcuts (F8 = Cash, F9 = UPI)
  useEffect(() => {
    function handleActionKeys(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;

      if (e.key === 'F8') {
        e.preventDefault();
        handleSettle('CASH');
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleOpenUpiModal();
      }
    }
    window.addEventListener('keydown', handleActionKeys);
    return () => window.removeEventListener('keydown', handleActionKeys);
  }, [handleSettle, handleOpenUpiModal]);

  // Close Settlement Modal & Free Table or Fast Reset Register for Next Token
  function handleCompleteAndFreeTable() {
    const tableToFree = settledBill?.tableNumber || (isExpress ? 'Takeaway' : selectedTable);

    // Free physical table on floor
    if (tableToFree.toLowerCase() !== 'takeaway' && tableToFree.toLowerCase() !== 'counter') {
      setTables((prev) =>
        prev.map((t) =>
          t.tableNumber === tableToFree
            ? { ...t, currentStatus: 'AVAILABLE', orderNumber: undefined, amount: undefined }
            : t
        )
      );
    }

    // Clear cart for this station
    setTableCarts((prev) => {
      const next = { ...prev };
      delete next[tableToFree];
      return next;
    });

    // Reset customer metadata for this table
    setTableCustomers((prev) => {
      const next = { ...prev };
      delete next[tableToFree];
      return next;
    });

    // Reset discount for this table
    setTableDiscounts((prev) => {
      const next = { ...prev };
      delete next[tableToFree];
      return next;
    });

    // Reset coupon for this table
    setTableCoupons((prev) => {
      const next = { ...prev };
      delete next[tableToFree];
      return next;
    });

    // Reset aggregator ID for this table
    setTableAggregatorIds((prev) => {
      const next = { ...prev };
      delete next[tableToFree];
      return next;
    });

    // Reset customer loyalty for this table
    setTableLoyalty((prev) => {
      const next = { ...prev };
      delete next[tableToFree];
      return next;
    });

    // Reset packaging fee for this table
    setTablePackagingFees((prev) => {
      const next = { ...prev };
      delete next[tableToFree];
      return next;
    });

    const settledToken = settledBill?.orderNumber;
    setSettledBill(null);

    if (isExpress) {
      showToast(`✓ Token ${settledToken} sent to Kitchen KDS! Register ready for next customer.`);
      const searchInput = document.getElementById('posSearchInput');
      if (searchInput) (searchInput as HTMLInputElement).focus();
    } else {
      showToast(`✓ Table ${tableToFree} settled & freed for next guests!`);
    }
  }

  // Toggle Flat 10% Discount for selected table
  function handleToggleDiscount() {
    if (currentCart.length === 0) {
      showToast('⚠️ Add items to cart before applying discount');
      return;
    }
    setTableDiscounts((prev) => {
      const current = prev[currentTableId] || 0;
      const next = current > 0 ? 0 : 10;
      showToast(next > 0 ? `✓ 10% Flat Discount applied!` : `Discount removed`);
      return { ...prev, [currentTableId]: next };
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

  // Handle End of Day / Shift Close Audit
  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault();
    setClosingLoading(true);
    try {
      const expCash = activeShift?.expectedCash ?? drawerCash;
      const counted = closingCountedCash.trim() !== '' ? Number(closingCountedCash) : expCash;

      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close-shift',
          countedCash: counted,
          notes: closingNotes,
          sendEmailReport: closingSendEmail,
          operatorName: operator?.name || 'Primary Cashier',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close shift');

      setIsCloseShiftModalOpen(false);
      setClosingCountedCash('');
      setClosingNotes('');

      if (data.emailResult?.mocked) {
        showToast(`✓ Shift closed! Mock EOD report generated (Brevo API key pending).`);
      } else if (data.emailResult?.success) {
        showToast(`✓ Shift closed! Nightly EOD report sent to cafe owner.`);
      } else {
        showToast(`✓ Shift closed successfully! Drawer reset for next shift.`);
      }

      if (data.nextShift?.openingCash !== undefined) {
        setDrawerCash(data.nextShift.openingCash);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? `⚠️ ${err.message}` : '⚠️ Failed to close shift');
    } finally {
      setClosingLoading(false);
    }
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

  // Dispatch KOT to Kitchen & Persist Order to DB
  async function handleDispatchKot(printChit: boolean = false) {
    const targetCart = tableCarts[currentTableId] || [];
    if (targetCart.length === 0) {
      showToast(isExpress ? '⚠️ Cart is empty. Add items first!' : `⚠️ Table ${selectedTable} cart is empty. Add items first!`);
      return;
    }

    const unfiredItems = targetCart.filter((item) => !item.isFired);
    if (unfiredItems.length === 0) {
      showToast(`⚠️ All items on ${isExpress ? 'Token' : 'Table'} ${selectedTable} have already been sent to kitchen! Add new items to fire a new round.`);
      return;
    }

    setKotLoading(true);
    try {
      const orderNum = isExpress ? `#${expressTokenSeq}` : `#${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch-kot',
          tableId: currentTableId,
          tokenNumber: orderNum,
          items: unfiredItems,
          customerName: currentCustomer.name || (isExpress ? `${selectedChannel} Express` : `Guest Table ${selectedTable}`),
          customerPhone: currentCustomer.phone || null,
          specialNotes: isExpress ? `${selectedChannel} • Express Order` : `DINE-IN • Table ${selectedTable} (Round)`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch KOT');

      // Mark newly dispatched items as fired
      setTableCarts((prev) => {
        const current = prev[currentTableId] || [];
        return {
          ...prev,
          [currentTableId]: current.map((it) => ({ ...it, isFired: true })),
        };
      });

      playReadyChime();
      showToast(`🍳 KOT ${orderNum} dispatched (${unfiredItems.length} new items) for ${isExpress ? 'Token' : 'Table'} ${selectedTable}!`);

      if (printChit) {
        triggerPrintKOTFromCart(unfiredItems);
      }

      // Mark physical table occupied on floor
      if (currentTableId.toLowerCase() !== 'takeaway' && currentTableId.toLowerCase() !== 'counter') {
        setTables((prev) =>
          prev.map((t) => (t.tableNumber === selectedTable ? { ...t, currentStatus: 'OCCUPIED' } : t))
        );
      }
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Could not dispatch KOT'}`);
    } finally {
      setKotLoading(false);
    }
  }

  function handlePark() {
    handleDispatchKot(false);
  }

  // Void / Cancel Order with Manager PIN
  async function handleVoidOrder() {
    if (!voidPin || voidPin.length !== 4) {
      showToast('⚠️ Enter 4-digit Manager PIN');
      return;
    }

    setVoidLoading(true);
    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'void-order',
          tableId: currentTableId,
          pin: voidPin,
          reason: voidReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to void order');

      showToast(`🛑 Table ${selectedTable} order voided successfully`);
      setIsVoidModalOpen(false);
      setVoidPin('');

      // Clear local cart for this table
      setTableCarts((prev) => ({ ...prev, [currentTableId]: [] }));

      // Free table locally
      setTables((prev) =>
        prev.map((t) => (t.tableNumber === selectedTable ? { ...t, currentStatus: 'AVAILABLE' } : t))
      );
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Error voiding order'}`);
    } finally {
      setVoidLoading(false);
    }
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
        {/* ── Desktop Top Bar (lg:flex) ── */}
        <div className="hidden lg:flex max-w-[1600px] mx-auto px-4 sm:px-6 min-h-16 py-2 items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/pos" className="flex items-center gap-2">
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

            {isCounterOnlyCafe ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paros-mint border border-espresso font-display text-[10px] font-black uppercase text-emerald-950 shadow-xs">
                ⚡ Express Token Mode (0 Tables)
              </span>
            ) : (
              <div className="flex items-center p-0.5 bg-paros-cream border border-espresso rounded-xl shadow-xs">
                <button
                  onClick={() => {
                    setPosMode('DINE_IN');
                    const firstPhysical = tables.find((t) => t.tableNumber.toLowerCase() !== 'takeaway');
                    if (firstPhysical) setSelectedTable(firstPhysical.tableNumber);
                  }}
                  className={`px-2 py-0.5 rounded-lg font-display text-[10px] font-black uppercase transition-all ${
                    posMode === 'DINE_IN'
                      ? 'bg-paros-orange text-white shadow-xs'
                      : 'text-espresso/70 hover:text-espresso'
                  }`}
                >
                  🪑 Dine-In
                </button>
                <button
                  onClick={() => {
                    setPosMode('EXPRESS_COUNTER');
                    setSelectedTable('Takeaway');
                  }}
                  className={`px-2 py-0.5 rounded-lg font-display text-[10px] font-black uppercase transition-all ${
                    posMode === 'EXPRESS_COUNTER'
                      ? 'bg-paros-orange text-white shadow-xs'
                      : 'text-espresso/70 hover:text-espresso'
                  }`}
                >
                  ⚡ Counter Rush
                </button>
              </div>
            )}
          </div>

          {/* Quick Route Switches - Station Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-paros-cream border-2 border-espresso rounded-xl shadow-brutal-sm">
            <Link
              href="/pos"
              className="px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase bg-paros-orange text-white shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[15px]">point_of_sale</span>
              <span>POS</span>
            </Link>
            <Link
              href="/kds"
              className="px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase text-espresso hover:bg-paros-yellow/40 transition-colors flex items-center gap-1.5 shrink-0"
              title="Open Barista Kitchen Display System"
            >
              <span className="material-symbols-outlined text-[15px]">soup_kitchen</span>
              <span>Kitchen KDS</span>
            </Link>
            <Link
              href="/order"
              target="_blank"
              className="px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase text-espresso hover:bg-paros-yellow/40 transition-colors flex items-center gap-1.5 shrink-0"
              title={isCounterOnlyCafe ? "Open Express Counter QR (Token Mode)" : "Open Customer QR Dine-in View in new tab"}
            >
              <span className="material-symbols-outlined text-[15px]">smartphone</span>
              <span>{isCounterOnlyCafe ? 'Token QR ↗' : 'Guest QR ↗'}</span>
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase text-espresso hover:bg-paros-yellow/40 transition-colors flex items-center gap-1.5 shrink-0"
              title="Open Owner Analytics, Daily Sales & Z-Report"
            >
              <span className="material-symbols-outlined text-[16px] text-paros-orange">analytics</span>
              <span>Analytics &amp; Sales ↗</span>
            </Link>
          </div>

          {/* Right: Cashier Operator, Till Float & Shift Tools Dropdown */}
          <div className="flex items-center gap-2">
            {/* Operator Lock/Unlock Badge */}
            {operator ? (
              <button
                onClick={handleLockTerminal}
                title="Tap to lock terminal or switch cashier"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-paros-mint hover:bg-paros-yellow rounded-xl border border-espresso font-display text-xs font-black text-espresso transition-colors shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[15px] text-paros-matcha">badge</span>
                <span>{operator.name}</span>
                <span className="material-symbols-outlined text-[13px] text-espresso/60">lock</span>
              </button>
            ) : (
              <button
                onClick={() => setPinModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-paros-yellow rounded-xl border border-espresso font-display text-xs font-black text-espresso animate-pulse shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[15px]">lock</span>
                <span>Enter PIN</span>
              </button>
            )}

            {/* Till Cash Pill */}
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              title="Till Drawer Float (tap to log petty expense)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-paros-cream hover:bg-paros-yellow rounded-xl border border-espresso font-display text-xs font-bold shadow-brutal-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-paros-orange">point_of_sale</span>
              <span className="text-espresso/60 uppercase text-[10px]">Till:</span>
              <span className="font-mono font-black text-espresso">₹{drawerCash.toLocaleString('en-IN')}</span>
            </button>

            {/* Clock */}
            <div className="hidden 2xl:flex items-center gap-1 font-mono text-xs font-bold text-espresso bg-paros-cream px-2.5 py-1.5 rounded-xl border border-espresso/40">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              <span>{currentTime}</span>
            </div>

            {/* Shift Tools Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDesktopToolsOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm transition-all"
                title="Shift EOD, Expenses & Settings"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Tools ▾</span>
              </button>

              {isDesktopToolsOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-espresso rounded-2xl shadow-brutal-lg p-2 z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setIsDesktopToolsOpen(false);
                      setIsCloseShiftModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-paros-yellow font-display text-xs font-bold text-espresso flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-amber-800">lock_clock</span>
                    <div>
                      <div className="font-black">End Shift &amp; EOD</div>
                      <div className="text-[10px] text-espresso/60">Balance drawer cash</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsDesktopToolsOpen(false);
                      setIsExpenseModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-paros-yellow font-display text-xs font-bold text-espresso flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-paros-orange">payments</span>
                    <div>
                      <div className="font-black">Log Till Expense</div>
                      <div className="text-[10px] text-espresso/60">Milk, ice &amp; petty cash</div>
                    </div>
                  </button>

                  <div className="h-px bg-espresso/15 my-1" />

                  <button
                    onClick={() => {
                      setIsDesktopToolsOpen(false);
                      setShowResetModal(true);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 text-red-700 font-display text-xs font-bold flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                    <div>
                      <div className="font-black">Reset / Switch Cafe</div>
                      <div className="text-[10px] text-red-600/70">Wipe local terminal cache</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Dedicated Mobile Top Bar (lg:hidden) ── */}
        <div className="lg:hidden px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2">
          {/* Brand & Cafe Name */}
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/pos" className="flex items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border-2 border-espresso shadow-brutal-sm">
                P
              </div>
              <span className="font-display text-base font-black text-espresso tracking-tight">
                PAROS<span className="text-paros-orange">.</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-paros-yellow border border-espresso font-display text-[10px] font-bold uppercase truncate max-w-[120px]">
              <span className="w-1.5 h-1.5 rounded-full bg-paros-matcha animate-ping shrink-0" />
              <span className="truncate">{cafeName}</span>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Till Cash Pill */}
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              title="Till Cash Float (tap to log expense)"
              className="flex items-center gap-1 px-2 py-1 bg-paros-cream active:bg-paros-yellow rounded-xl border border-espresso font-display text-[11px] font-bold shadow-brutal-sm"
            >
              <span className="material-symbols-outlined text-[13px] text-paros-orange">point_of_sale</span>
              <span className="font-mono font-black text-espresso">₹{drawerCash.toLocaleString('en-IN')}</span>
            </button>

            {/* Operator Lock / PIN */}
            {operator ? (
              <button
                onClick={handleLockTerminal}
                title="Cashier Terminal Locked (tap to switch)"
                className="flex items-center gap-1 px-2 py-1 bg-paros-mint rounded-xl border border-espresso font-display text-[10px] font-black text-espresso shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[13px] text-paros-matcha">badge</span>
                <span className="max-w-[48px] truncate">{operator.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                onClick={() => setPinModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 bg-paros-yellow rounded-xl border border-espresso font-display text-[10px] font-black text-espresso shadow-brutal-sm animate-pulse"
              >
                <span className="material-symbols-outlined text-[13px]">lock</span>
                <span>PIN</span>
              </button>
            )}

            {/* Mobile More / Tools Drawer Trigger */}
            <button
              onClick={() => setIsMobileToolsOpen(true)}
              title="Open POS Tools & Switch Mode"
              className="w-7 h-7 rounded-xl bg-white active:bg-paros-yellow border-2 border-espresso shadow-brutal-sm flex items-center justify-center text-espresso"
            >
              <span className="material-symbols-outlined text-[17px]">more_vert</span>
            </button>
          </div>
        </div>

        {/* ── Mobile Unified 4-Tab Navigation Bar (xl:hidden) ── */}
        <div className="xl:hidden px-2.5 pb-2">
          <div className="flex items-center p-1 bg-paros-cream border-2 border-espresso rounded-2xl shadow-brutal-sm gap-1">
            {/* Menu Tab */}
            <button
              onClick={() => {
                setMobilePanel('catalog');
                setActiveView('menu');
              }}
              className={`flex-1 py-1.5 sm:py-2 rounded-xl font-display font-black text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                mobilePanel === 'catalog' && activeView === 'menu'
                  ? 'bg-paros-orange text-white shadow-brutal-sm'
                  : 'text-espresso/70 hover:bg-white'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">coffee</span>
              <span>Menu</span>
            </button>

            {/* Tables / Tokens Tab */}
            <button
              onClick={() => {
                setMobilePanel('catalog');
                setActiveView('floor');
              }}
              className={`flex-1 py-1.5 sm:py-2 rounded-xl font-display font-black text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                mobilePanel === 'catalog' && activeView === 'floor'
                  ? 'bg-paros-orange text-white shadow-brutal-sm'
                  : 'text-espresso/70 hover:bg-white'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">
                {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' ? 'receipt_long' : 'table_bar'}
              </span>
              <span>{isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' ? 'Tokens' : 'Tables'}</span>
            </button>

            {/* Expediter Pass Tab */}
            <button
              onClick={() => {
                setMobilePanel('catalog');
                setActiveView('orders');
              }}
              className={`flex-1 py-1.5 sm:py-2 rounded-xl font-display font-black text-xs uppercase flex items-center justify-center gap-1 transition-all relative ${
                mobilePanel === 'catalog' && activeView === 'orders'
                  ? 'bg-paros-orange text-white shadow-brutal-sm'
                  : 'text-espresso/70 hover:bg-white'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">soup_kitchen</span>
              <span>Pass</span>
              {liveOrders.filter((o) => o.status !== 'COMPLETED').length > 0 && (
                <span className="px-1 py-0.2 rounded-full bg-paros-yellow text-espresso border border-espresso font-mono text-[9px] font-black leading-none">
                  {liveOrders.filter((o) => o.status !== 'COMPLETED').length}
                </span>
              )}
            </button>

            {/* Ticket Tab */}
            <button
              onClick={() => setMobilePanel('ticket')}
              className={`flex-1 py-1.5 sm:py-2 rounded-xl font-display font-black text-xs uppercase flex items-center justify-center gap-1 transition-all relative ${
                mobilePanel === 'ticket'
                  ? 'bg-espresso text-white shadow-brutal-sm'
                  : 'text-espresso/70 hover:bg-white'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">shopping_cart</span>
              <span>Ticket</span>
              {currentCart.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-paros-orange text-white font-mono text-[10px] font-black leading-none animate-pulse">
                  {currentCart.reduce((sum, it) => sum + it.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main POS Workspace ── */}
      <div className="max-w-[1600px] w-full mx-auto p-2 sm:p-4 lg:p-6 pb-24 xl:pb-6 flex-1 flex flex-col xl:flex-row gap-3 sm:gap-4">
        {/* ═══ LEFT PANEL (60%): Menu Catalog / Floor Grid ═══ */}
        <div className={`w-full xl:w-[60%] ${mobilePanel === 'catalog' ? 'flex' : 'hidden xl:flex'} flex-col gap-4`}>
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
                      {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' || readyNotification.table.toLowerCase() === 'takeaway'
                        ? `KDS ALERT: TOKEN ${readyNotification.orderNumber} IS READY AT PICKUP!`
                        : `KDS ALERT: Table ${readyNotification.table} is READY for Service!`}
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
                    {readyNotification.items} • Call customer to pickup counter now.
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
                    showToast(`✓ Order ${readyNotification.orderNumber} marked handed over!`);
                  }}
                  className="brutal-btn px-3 py-1.5 bg-paros-matcha text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
                >
                  ✓ Hand Over
                </button>
                <button
                  onClick={() => setActiveView('floor')}
                  className="brutal-btn px-3 py-1.5 bg-white text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
                >
                  Board
                </button>
              </div>
            </div>
          )}

          {/* ── Single Unified POS Toolbar (Desktop) ── */}
          <div className="hidden xl:flex bg-white px-4 py-2.5 rounded-2xl border-2 border-espresso shadow-brutal flex-wrap items-center justify-between gap-3">
            {/* Left: View Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-paros-cream border-2 border-espresso rounded-xl shadow-brutal-sm">
              <button
                onClick={() => setActiveView('menu')}
                className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                  activeView === 'menu'
                    ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow/40 border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">coffee</span>
                <span>Menu Catalog</span>
              </button>
              <button
                onClick={() => setActiveView('floor')}
                className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                  activeView === 'floor'
                    ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow/40 border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' ? 'receipt_long' : 'table_bar'}
                </span>
                <span>{isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' ? 'Token Board' : 'Floor Grid'}</span>
              </button>
              <button
                onClick={() => setActiveView('orders')}
                className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                  activeView === 'orders'
                    ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow/40 border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
                <span>Expediter</span>
                {liveOrders.filter((o) => o.status !== 'COMPLETED').length > 0 && (
                  <span className="bg-white/20 px-1.5 py-0.2 rounded font-mono text-[10px]">
                    {liveOrders.filter((o) => o.status !== 'COMPLETED').length}
                  </span>
                )}
              </button>
            </div>

            {/* Right: Live Queue Status & Token/Table Info */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paros-yellow/40 border-2 border-espresso shadow-brutal-sm text-xs font-display">
                <span className="material-symbols-outlined text-espresso text-[15px]">soup_kitchen</span>
                <span className="font-bold text-espresso">In Prep:</span>
                <span className="font-mono text-xs font-black text-espresso">
                  {liveOrders.filter((o) => o.status !== 'READY_AT_PASS').length}
                </span>
              </div>

              {liveOrders.filter((o) => o.status === 'READY_AT_PASS').length > 0 ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paros-mint text-emerald-900 border-2 border-emerald-600 shadow-brutal-sm text-xs font-display animate-pulse">
                  <span className="material-symbols-outlined text-[15px]">notifications_active</span>
                  <span className="font-black uppercase">Ready:</span>
                  <span className="font-mono text-xs font-black">
                    {liveOrders.filter((o) => o.status === 'READY_AT_PASS').length}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paros-cream border-2 border-espresso shadow-brutal-sm text-xs font-display">
                  <span className="material-symbols-outlined text-espresso/60 text-[15px]">task_alt</span>
                  <span className="font-bold text-espresso/70">Served:</span>
                  <span className="font-mono text-xs font-black text-espresso">
                    {servedOrders.length}
                  </span>
                </div>
              )}

              {/* Next Token Badge for Counter mode */}
              {(isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER') && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-espresso text-white rounded-xl border-2 border-espresso shadow-brutal-sm">
                  <span className="font-display text-[10px] uppercase font-bold text-white/70">Next:</span>
                  <span className="font-mono text-xs font-black text-paros-yellow">#{expressTokenSeq}</span>
                </div>
              )}

              {/* 1-tap Hand Over if order ready */}
              {liveOrders.find((o) => o.status === 'READY_AT_PASS') && (
                <button
                  onClick={() => {
                    const topReady = liveOrders.find((o) => o.status === 'READY_AT_PASS');
                    if (topReady) {
                      handleMarkOrderServed(topReady.id, topReady.table.replace('Table ', ''));
                    }
                  }}
                  className="brutal-btn px-3 py-1.5 bg-paros-matcha text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1 animate-bounce"
                  title="1-tap Hand Over the oldest ready order"
                >
                  <span>🛎️ Hand Over {liveOrders.find((o) => o.status === 'READY_AT_PASS')?.orderNumber}</span>
                </button>
              )}
            </div>
          </div>
          {/* 🪑 SEATING FLOOR GRID STRIP (For cafes with physical tables when in catalog/orders view) */}
          {!(isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER') && activeView !== 'floor' && (
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

              <div className="flex sm:grid sm:grid-cols-9 gap-2 overflow-x-auto no-scrollbar pb-1">
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
                      className={`min-w-[68px] sm:min-w-0 shrink-0 sm:shrink p-2 rounded-xl border-2 border-espresso transition-all text-center flex flex-col justify-between ${
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
                        <span className="text-[7.5px] font-black uppercase text-amber-900 bg-amber-100 rounded px-1 mt-0.5 border border-amber-400">
                          UPI (CHECK)
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
          )}

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
          ) : activeView === 'floor' ? (
            /* ═══ VIEW MODE: TOKEN BOARD (Counter Mode) OR SEATING FLOOR GRID (Dine-In) ═══ */
            isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' ? (
              /* 📋 LIVE TOKEN PICKUP & DISPATCH BOARD */
              <div className="bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal flex-1 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-espresso">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border-2 border-espresso shadow-brutal-sm">
                      ⚡
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-black text-espresso">
                        Live Token Pickup & Dispatch Board
                      </h2>
                      <p className="font-body text-xs text-espresso/60">
                        Kitchen Prep ➔ Ready at Counter ➔ 1-Tap Hand Over
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-paros-cream border border-espresso rounded-xl font-display text-xs font-bold">
                      Next Token: <span className="font-mono font-black text-paros-orange">#{expressTokenSeq}</span>
                    </div>
                    <button
                      onClick={() => setActiveView('menu')}
                      className="brutal-btn px-3 py-1.5 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Punch Order</span>
                    </button>
                  </div>
                </div>

                {/* 3-Column Kanban Board */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                  {/* Column 1: In Kitchen / Brewing */}
                  <div className="bg-surface-container-low p-3.5 rounded-2xl border-2 border-espresso flex flex-col gap-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-dashed border-espresso/20">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-700 text-[18px]">soup_kitchen</span>
                        <span className="font-display text-xs font-black uppercase text-espresso">
                          1. In Kitchen Prep
                        </span>
                      </div>
                      <span className="font-mono text-xs font-black bg-white px-2 py-0.5 rounded border border-espresso">
                        {liveOrders.filter((o) => o.status !== 'READY_AT_PASS').length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[480px] pr-0.5">
                      {liveOrders.filter((o) => o.status !== 'READY_AT_PASS').length === 0 ? (
                        <div className="p-6 text-center text-espresso/50 font-display text-xs font-bold">
                          No orders currently cooking in kitchen.
                        </div>
                      ) : (
                        liveOrders
                          .filter((o) => o.status !== 'READY_AT_PASS')
                          .map((ord) => (
                            <div
                              key={ord.id}
                              className="bg-white p-3 rounded-xl border-2 border-espresso shadow-brutal-sm flex flex-col gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-sm font-black text-espresso bg-paros-cream px-2 py-0.5 rounded border border-espresso">
                                  {ord.orderNumber}
                                </span>
                                <span className="text-[10px] font-mono text-espresso/60 font-bold">
                                  {ord.elapsedTime}
                                </span>
                              </div>
                              <div>
                                <p className="font-body text-xs font-bold text-espresso">{ord.customerName}</p>
                                <p className="font-body text-xs text-espresso/70 mt-0.5">{ord.itemsSummary}</p>
                              </div>
                              <div className="pt-2 border-t border-dashed border-espresso/15 flex items-center justify-between">
                                <span className="text-[10px] font-display font-black text-amber-700 uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                                  Cooking ⏳
                                </span>
                                <button
                                  onClick={() => {
                                    fetch('/api/kds', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'ready-order', orderId: ord.id }),
                                    }).catch(() => {});
                                    setLiveOrders((prev) =>
                                      prev.map((o) => (o.id === ord.id ? { ...o, status: 'READY_AT_PASS' } : o))
                                    );
                                    showToast(`✓ Token ${ord.orderNumber} marked Ready at Counter!`);
                                  }}
                                  className="text-[10px] px-2 py-1 bg-paros-mint hover:bg-paros-yellow text-espresso font-display font-black uppercase rounded border border-espresso shadow-xs"
                                  title="Mark ready for customer pickup"
                                >
                                  Mark Ready 🛎️
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Column 2: Ready at Counter (Call Customer) */}
                  <div className="bg-emerald-50/60 p-3.5 rounded-2xl border-2 border-emerald-600 shadow-brutal flex flex-col gap-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-dashed border-emerald-300">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-800 text-[18px] animate-bounce">
                          notifications_active
                        </span>
                        <span className="font-display text-xs font-black uppercase text-emerald-950">
                          2. Ready at Counter 🛎️
                        </span>
                      </div>
                      <span className="font-mono text-xs font-black bg-emerald-600 text-white px-2 py-0.5 rounded border border-emerald-700 animate-pulse">
                        {liveOrders.filter((o) => o.status === 'READY_AT_PASS').length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[480px] pr-0.5">
                      {liveOrders.filter((o) => o.status === 'READY_AT_PASS').length === 0 ? (
                        <div className="p-6 text-center text-emerald-800/60 font-display text-xs font-bold">
                          No tokens waiting at counter.
                        </div>
                      ) : (
                        liveOrders
                          .filter((o) => o.status === 'READY_AT_PASS')
                          .map((ord) => (
                            <div
                              key={ord.id}
                              className="bg-white p-3.5 rounded-xl border-2 border-emerald-600 shadow-brutal flex flex-col gap-2 ring-1 ring-emerald-400"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-base font-black text-espresso bg-paros-yellow px-2.5 py-0.5 rounded-lg border-2 border-espresso shadow-xs">
                                  TOKEN {ord.orderNumber}
                                </span>
                                <span className="text-[10px] font-display font-black text-white bg-emerald-700 px-2 py-0.5 rounded uppercase animate-pulse">
                                  Call Customer
                                </span>
                              </div>
                              <div>
                                <p className="font-body text-xs font-bold text-espresso">{ord.customerName}</p>
                                <p className="font-body text-xs text-espresso/80 mt-0.5">{ord.itemsSummary}</p>
                              </div>
                              <div className="pt-2 border-t border-dashed border-espresso/15 flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleMarkOrderServed(ord.id, ord.table.replace('Table ', ''))}
                                  className="brutal-btn w-full py-2 bg-espresso text-white font-display text-xs font-black uppercase rounded-lg border border-espresso shadow-brutal-sm flex items-center justify-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-paros-matcha">task_alt</span>
                                  <span>✓ Hand Over (Clear)</span>
                                </button>
                                <button
                                  onClick={() => {
                                    window.open(
                                      `https://wa.me/?text=Hello%20${encodeURIComponent(ord.customerName || 'Guest')}!%20Your%20order%20(${encodeURIComponent(ord.orderNumber)})%20is%20ready%20at%20the%20pickup%20counter%20at%20${encodeURIComponent(cafeName)}.%20Please%20collect%20it%20with%20Token%20${encodeURIComponent(ord.orderNumber)}.`,
                                      '_blank'
                                    );
                                    showToast(`📲 WhatsApp pickup ping prepared for ${ord.orderNumber}`);
                                  }}
                                  className="py-1 bg-paros-mint hover:bg-paros-yellow text-espresso font-display text-[10px] font-black uppercase rounded border border-espresso shadow-xs flex items-center justify-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">chat</span>
                                  <span>WhatsApp "Order Ready"</span>
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Column 3: Recently Handed Over */}
                  <div className="bg-surface-container-low p-3.5 rounded-2xl border-2 border-espresso flex flex-col gap-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-dashed border-espresso/20">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-espresso/70 text-[18px]">done_all</span>
                        <span className="font-display text-xs font-black uppercase text-espresso">
                          3. Handed Over (Recent)
                        </span>
                      </div>
                      <span className="font-mono text-xs font-black bg-white px-2 py-0.5 rounded border border-espresso">
                        {servedOrders.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-0.5">
                      {servedOrders.length === 0 ? (
                        <div className="p-6 text-center text-espresso/50 font-display text-xs font-bold">
                          No completed pickups yet today.
                        </div>
                      ) : (
                        servedOrders.slice(0, 10).map((ord) => (
                          <div
                            key={ord.id}
                            className="bg-white/80 p-2.5 rounded-xl border border-espresso flex flex-col gap-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-espresso">{ord.orderNumber}</span>
                              <span className="text-[10px] font-mono text-espresso/50">{ord.elapsedTime}</span>
                            </div>
                            <p className="text-espresso/70 truncate">{ord.itemsSummary}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 🪑 RESTAURANT SEATING FLOOR GRID (For Dine-In Cafes) */
              <div className="bg-white p-5 rounded-2xl border-2 border-espresso shadow-brutal flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
                  <div>
                    <h2 className="font-display text-lg font-black text-espresso">
                      Restaurant Seating Floor Grid
                    </h2>
                    <p className="font-body text-xs text-espresso/60">
                      Visual table floor layout — Select table to open tab or view occupancy
                    </p>
                  </div>
                  <span className="font-display text-xs font-black uppercase bg-paros-yellow px-3 py-1 rounded-xl border border-espresso shadow-xs">
                    {tables.length} Total Tables
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 overflow-y-auto">
                  {tables.map((t) => {
                    const tableAmt = getTableAmount(t.tableNumber);
                    const isReady = t.currentStatus === 'READY_TO_SERVE';
                    const isOccupied = (tableCarts[t.tableNumber]?.length || 0) > 0 || t.currentStatus === 'OCCUPIED';
                    const isSelected = selectedTable === t.tableNumber;

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTable(t.tableNumber);
                          setActiveView('menu');
                        }}
                        className={`p-4 rounded-2xl border-2 border-espresso cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-paros-orange text-white shadow-brutal ring-2 ring-espresso scale-102'
                            : isReady
                            ? 'bg-paros-mint text-espresso border-emerald-600 shadow-brutal-sm ring-2 ring-emerald-400 animate-pulse'
                            : isOccupied
                            ? 'bg-paros-yellow text-espresso shadow-brutal-sm'
                            : 'bg-paros-cream hover:bg-white text-espresso shadow-brutal-sm'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-display font-black text-lg">
                              {t.tableNumber === 'Takeaway' ? '🥡 Takeaway' : `Table ${t.tableNumber}`}
                            </span>
                            <span className={`text-[10px] font-display font-black uppercase px-2 py-0.5 rounded border border-espresso ${
                              isReady
                                ? 'bg-emerald-600 text-white animate-pulse'
                                : isOccupied
                                ? 'bg-amber-600 text-white'
                                : 'bg-white text-paros-matcha'
                            }`}>
                              {isReady ? 'Ready' : isOccupied ? 'Occupied' : 'Free'}
                            </span>
                          </div>
                          <p className="text-xs opacity-75">
                            Capacity: {t.capacity} Guests
                          </p>
                        </div>

                        <div className="pt-3 border-t border-dashed border-espresso/20 flex items-center justify-between mt-3">
                          <span className="font-mono text-sm font-black tabular-nums">
                            {tableAmt > 0 ? `₹${tableAmt}` : '₹0'}
                          </span>
                          <span className="text-[11px] font-display font-bold underline">
                            Open Tab ➔
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* ═══ VIEW MODE: MENU CATALOG ═══ */
            <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-espresso shadow-brutal flex-1 flex flex-col gap-2.5 sm:gap-3">
              {/* Search Bar */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-espresso/60 text-[18px]">
                  search
                </span>
                <input
                  id="posSearchInput"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quick search dish or press '/' key..."
                  className="w-full pl-9 pr-9 py-2 sm:py-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs sm:text-sm font-bold text-espresso outline-none shadow-brutal-sm"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-espresso/50 hover:text-espresso font-black text-xs w-5 h-5 flex items-center justify-center rounded-full bg-white border border-espresso"
                    title="Clear search"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-espresso/40 text-[16px]">
                    barcode_scanner
                  </span>
                )}
              </div>

              {/* Category Filter Pills (Dynamically loaded) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
                {dynamicCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full border-2 border-espresso font-display text-[11px] sm:text-xs font-black uppercase whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-espresso text-white shadow-brutal-sm'
                        : 'bg-white hover:bg-paros-yellow text-espresso shadow-brutal-sm'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Menu Items Grid: Tactile, Tap-To-Add Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 flex-1 overflow-y-auto max-h-[580px] xl:max-h-[460px] pr-0.5">
                {filteredItems.map((item) => {
                  const cartItem = currentCart.find((it) => it.name === item.name);
                  const inCartQty = cartItem?.quantity || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none active:scale-[0.98] flex flex-col justify-between group min-h-[105px] ${
                        inCartQty > 0
                          ? 'bg-paros-yellow/40 border-espresso shadow-brutal ring-2 ring-espresso'
                          : 'bg-white hover:bg-paros-cream/80 border-espresso shadow-brutal-sm hover:shadow-brutal'
                      }`}
                    >
                      <div>
                        {/* Top: Veg Dot + Category + In-Cart Badge */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                item.isVeg ? 'bg-paros-matcha' : 'bg-red-500'
                              }`}
                            />
                            <span className="font-mono text-[9px] text-espresso/60 font-bold uppercase truncate max-w-[90px]">
                              {item.category?.name || 'Item'}
                            </span>
                          </div>
                          {inCartQty > 0 && (
                            <span className="font-mono text-[9px] font-black bg-paros-orange text-white px-1.5 py-0.2 rounded-full shadow-xs">
                              {inCartQty} in cart
                            </span>
                          )}
                        </div>

                        {/* Dish Name */}
                        <h4 className="font-display text-xs sm:text-sm font-bold text-espresso leading-snug line-clamp-2">
                          {item.name}
                        </h4>
                      </div>

                      {/* Bottom: Price + Quick Stepper or Subtle + */}
                      <div className="flex items-center justify-between pt-1.5 mt-2 border-t border-espresso/10">
                        <span className="font-display font-black text-xs sm:text-sm text-espresso tabular-nums">
                          ₹{item.price}
                        </span>

                        {inCartQty === 0 ? (
                          <span className="w-6 h-6 rounded-lg bg-paros-cream group-hover:bg-paros-orange group-hover:text-white border border-espresso flex items-center justify-center font-black text-xs text-espresso transition-colors">
                            +
                          </span>
                        ) : (
                          <div
                            className="flex items-center bg-white border border-espresso rounded-lg shadow-xs p-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (cartItem) updateQty(cartItem.id, -1);
                              }}
                              className="w-5 h-5 flex items-center justify-center bg-paros-cream hover:bg-red-100 rounded font-black text-xs text-espresso active:scale-95"
                              title="Reduce quantity"
                            >
                              -
                            </button>
                            <span className="font-display font-black text-xs text-espresso tabular-nums px-1.5">
                              {inCartQty}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (cartItem) updateQty(cartItem.id, 1);
                              }}
                              className="w-5 h-5 flex items-center justify-center bg-paros-orange text-white rounded font-black text-xs active:scale-95"
                              title="Add more"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT PANEL (40%): Active Table Ticket & Settle ═══ */}
        <div className={`w-full xl:w-[40%] ${mobilePanel === 'ticket' ? 'flex' : 'hidden xl:flex'} flex-col h-full max-h-[calc(100vh-140px)]`}>
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Mobile Back to Catalog Button */}
            <div className="xl:hidden p-3 pb-2 border-b-2 border-dashed border-espresso/20 flex items-center justify-between gap-2 shrink-0 bg-white">
              <button
                onClick={() => setMobilePanel('catalog')}
                className="brutal-btn flex-1 py-2 px-3 bg-paros-yellow hover:bg-paros-peach border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Add More Dishes (Back to Menu)</span>
              </button>
              {currentCart.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear all items from this order?')) {
                      setTableCarts((prev) => ({ ...prev, [currentTableId]: [] }));
                      showToast('Cart cleared');
                    }
                  }}
                  className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm flex items-center justify-center gap-1 active:scale-95"
                  title="Clear Cart"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                </button>
              )}
            </div>

            {/* Ticket Header (Shrink-0) */}
            <div className="p-4 pb-3 border-b-2 border-espresso shrink-0 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="material-symbols-outlined text-paros-orange text-[22px]">
                      {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' ? 'bolt' : 'restaurant'}
                    </span>
                    <span className="font-display text-lg sm:text-xl font-black text-espresso truncate">
                      {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER'
                        ? `Token #${expressTokenSeq} Tab`
                        : `Table ${selectedTable} Tab`}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-paros-mint border border-espresso font-display text-[10px] font-black uppercase">
                      {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER'
                        ? expressOrderType
                        : (currentCart.length > 0 ? `${currentCart.length} Items` : 'Empty')}
                    </span>
                  </div>

                  {/* Customer Details Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <input
                      type="text"
                      placeholder={isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' ? "Customer Name (optional)" : "Guest Name (optional)"}
                      value={currentCustomer.name}
                      onChange={(e) =>
                        setTableCustomers((prev) => ({
                          ...prev,
                          [currentTableId]: { ...currentCustomer, name: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-paros-cream border border-espresso rounded-xl font-body text-xs font-semibold text-espresso outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="WhatsApp Number (10 digits)"
                      value={currentCustomer.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTableCustomers((prev) => ({
                          ...prev,
                          [currentTableId]: { ...currentCustomer, phone: val },
                        }));
                        const digits = val.replace(/[^0-9]/g, '');
                        if (digits.length === 10) {
                          fetch(`/api/pos?lookupPhone=${digits}`)
                            .then((res) => (res.ok ? res.json() : null))
                            .then((data) => {
                              if (data?.customer) {
                                setTableLoyalty((prev) => ({
                                  ...prev,
                                  [currentTableId]: {
                                    name: data.customer.name,
                                    visitCount: data.customer.visitCount || 1,
                                    totalSpend: data.customer.totalSpend || 0,
                                  },
                                }));
                                if (!currentCustomer.name && data.customer.name) {
                                  setTableCustomers((prev) => ({
                                    ...prev,
                                    [currentTableId]: { ...prev[currentTableId], name: data.customer.name },
                                  }));
                                }
                              } else {
                                setTableLoyalty((prev) => ({ ...prev, [currentTableId]: null }));
                              }
                            })
                            .catch(() => {});
                        } else {
                          setTableLoyalty((prev) => ({ ...prev, [currentTableId]: null }));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-paros-cream border border-espresso rounded-xl font-mono text-xs font-semibold text-espresso outline-none"
                    />
                  </div>

                  {/* Regular Customer Recognition Banner */}
                  {tableLoyalty[currentTableId] && (
                    <div className="mt-2 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-[11px] font-display font-black text-amber-950 animate-in fade-in">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-600 text-xs">⭐</span>
                        <span>Regular Guest: {tableLoyalty[currentTableId]?.name || 'Friend'}</span>
                        <span className="text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded-full font-mono text-[9px]">
                          {tableLoyalty[currentTableId]?.visitCount} visits
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-800 font-mono">
                        Spent ₹{Math.round(tableLoyalty[currentTableId]?.totalSpend || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Clean 2-Option Channel Selector (Dine-In vs Takeaway) */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex-1 grid grid-cols-2 gap-1 p-0.5 bg-paros-cream border border-espresso rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTableChannels((prev) => ({ ...prev, [currentTableId]: 'DINE_IN' }))}
                        className={`py-1 rounded-lg font-display text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                          selectedChannel === 'DINE_IN'
                            ? 'bg-paros-orange text-white border border-espresso shadow-xs'
                            : 'text-espresso hover:bg-paros-yellow/40'
                        }`}
                      >
                        <span>🍽️</span>
                        <span>Dine-In</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableChannels((prev) => ({ ...prev, [currentTableId]: 'TAKEAWAY' }))}
                        className={`py-1 rounded-lg font-display text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                          selectedChannel === 'TAKEAWAY' || selectedChannel === 'SWIGGY' || selectedChannel === 'ZOMATO'
                            ? 'bg-paros-orange text-white border border-espresso shadow-xs'
                            : 'text-espresso hover:bg-paros-yellow/40'
                        }`}
                      >
                        <span>🛍️</span>
                        <span>Takeaway</span>
                      </button>
                    </div>

                    {/* Takeaway Packaging Fee Toggle */}
                    {(selectedChannel === 'TAKEAWAY' || isExpress) && (
                      <button
                        type="button"
                        onClick={() => setTablePackagingFees((prev) => ({ ...prev, [currentTableId]: !prev[currentTableId] }))}
                        className={`px-2.5 py-1 rounded-xl font-display text-[10px] font-black uppercase transition-all border cursor-pointer shrink-0 ${
                          tablePackagingFees[currentTableId]
                            ? 'bg-amber-500 text-white border-espresso shadow-xs'
                            : 'bg-paros-cream text-espresso/70 border-espresso/40 hover:bg-amber-100'
                        }`}
                        title="Packaging container charges (+₹15)"
                      >
                        {tablePackagingFees[currentTableId] ? '📦 Pack (+₹15)' : '📦 +₹15 Pack'}
                      </button>
                    )}
                  </div>

                  {/* Payment Status Badges */}
                  {(() => {
                    const currentTableNode = tables.find((t) => t.tableNumber === selectedTable);
                    if (currentTableNode?.paymentMode === 'UPI_PREPAID') {
                      return (
                        <div className="mt-2 bg-amber-50 text-amber-950 border-2 border-amber-400 px-2.5 py-1 rounded-xl font-display text-[10px] font-black flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-amber-700">volume_up</span>
                            <span>UPI PAID BY GUEST: VERIFY SOUNDBOX</span>
                          </div>
                          <span className="bg-amber-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase">
                            VERIFIED
                          </span>
                        </div>
                      );
                    }
                    if (currentTableNode?.paymentMode === 'PAY_LATER') {
                      return (
                        <div className="mt-2 bg-amber-100 text-amber-950 border border-amber-400 px-2.5 py-1 rounded-xl font-display text-[10px] font-black flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-amber-700">pending</span>
                            <span>PAY LATER TAB: COLLECT AT COUNTER</span>
                          </div>
                          <span className="bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase">
                            DUE
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-bold text-espresso">{currentTime}</span>
                  <div className="font-display text-[10px] font-black text-paros-matcha uppercase flex items-center justify-end gap-1 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        currentCart.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-paros-matcha'
                      }`}
                    />
                    {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER'
                      ? (currentCart.length > 0 ? 'Order Active' : 'Ready')
                      : (currentCart.length > 0 ? 'Occupied' : 'Available')}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Cart Middle Section */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 flex flex-col gap-2">
              {currentCart.length === 0 ? (
                <div className="my-auto py-8 px-4 text-center bg-stone-50 rounded-2xl border-2 border-dashed border-espresso/20 flex flex-col items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-espresso/40 text-[32px]">
                    shopping_bag
                  </span>
                  <p className="font-display text-xs sm:text-sm font-black text-espresso/70">
                    {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER'
                      ? `Token #${expressTokenSeq} Cart is Empty`
                      : `Table ${selectedTable} Cart is Empty`}
                  </p>
                  <p className="font-body text-[11px] text-espresso/50 max-w-xs">
                    Tap dishes from the menu to punch this order.
                  </p>
                </div>
              ) : (
                currentCart.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-paros-cream border-2 border-espresso shadow-brutal-sm flex flex-col gap-1 shrink-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-display text-xs font-bold text-espresso">{item.name}</p>
                          {item.isFired ? (
                            <span className="px-1.5 py-0.2 rounded bg-stone-200 text-stone-700 font-display text-[9px] font-black uppercase">
                              🍳 Sent
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-display text-[9px] font-black uppercase animate-pulse">
                              🔥 Ready
                            </span>
                          )}
                        </div>
                        {item.addons && item.addons.length > 0 && (
                          <p className="font-mono text-[10px] text-paros-orange font-bold mt-0.5">
                            +{item.addons.map((a) => `${a.name} (₹${a.price})`).join(', ')}
                          </p>
                        )}
                        {item.notes ? (
                          <button
                            type="button"
                            onClick={() => openNoteModal(item.id)}
                            className="text-left font-body text-[11px] text-amber-900 bg-amber-100/80 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 mt-1 flex items-center gap-1 cursor-pointer"
                          >
                            <span>📝 {item.notes}</span>
                            <span className="material-symbols-outlined text-[12px] opacity-70">edit</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => openNoteModal(item.id)}
                              className="font-display text-[10px] font-bold text-espresso/60 hover:text-paros-orange flex items-center gap-0.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[12px]">edit_note</span>
                              <span>+ Note</span>
                            </button>
                            <span className="text-espresso/30">•</span>
                            <button
                              type="button"
                              onClick={() => openAddonModal(item.id)}
                              className="font-display text-[10px] font-bold text-espresso/60 hover:text-paros-orange flex items-center gap-0.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[12px]">add_circle</span>
                              <span>+ Add-on</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="font-display font-black text-sm text-espresso tabular-nums shrink-0">
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

            {/* Bottom Dock (Shrink-0, Fixed, Clean Borders) */}
            <div className="p-3 sm:p-4 border-t-2 border-espresso bg-stone-50/95 shrink-0 flex flex-col gap-2.5 z-10">
              {/* Quick Action Dock */}
              <div className="grid grid-cols-5 gap-1">
                <button
                  type="button"
                  disabled={currentCart.length === 0 || unfiredCount === 0 || kotLoading}
                  onClick={() => handleDispatchKot(false)}
                  className={`p-1.5 rounded-lg border border-espresso font-display text-[9px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    currentCart.length === 0
                      ? 'bg-stone-100 opacity-40 cursor-not-allowed'
                      : unfiredCount === 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-600 opacity-90'
                      : 'bg-paros-yellow hover:bg-amber-300 text-espresso'
                  }`}
                  title={
                    unfiredCount === 0 && currentCart.length > 0
                      ? 'All items already sent to kitchen'
                      : 'Dispatch KOT directly to Kitchen Screen without printing'
                  }
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {unfiredCount === 0 && currentCart.length > 0 ? 'check_circle' : 'skillet'}
                  </span>
                  <span>
                    {kotLoading
                      ? '...'
                      : unfiredCount === 0 && currentCart.length > 0
                      ? 'Fired ✓'
                      : `Fire (${unfiredCount})`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentCart.length === 0) {
                      showToast('⚠️ Add items to cart before splitting bill');
                      return;
                    }
                    setSplitCashAmount(String(Math.floor(grandTotal / 2)));
                    setIsSplitModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg bg-white hover:bg-paros-yellow border border-espresso font-display text-[9px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5 cursor-pointer"
                  title="Dual Split (Cash + UPI) or Group Split"
                >
                  <span className="material-symbols-outlined text-[15px]">call_split</span>
                  <span>Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(true)}
                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-espresso font-display text-[9px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5 text-red-700 cursor-pointer"
                  title="Manager PIN protected Void / Cancel Order"
                >
                  <span className="material-symbols-outlined text-[15px]">cancel</span>
                  <span>Void</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleDiscount}
                  className={`p-1.5 rounded-lg border font-display text-[9px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
                    discountPercent > 0
                      ? 'bg-paros-orange text-white border-espresso ring-1 ring-espresso'
                      : 'bg-white hover:bg-paros-yellow border-espresso text-espresso'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">percent</span>
                  <span>{discountPercent > 0 ? '10%' : 'Disc'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="p-1.5 rounded-lg bg-white hover:bg-paros-yellow border border-espresso font-display text-[9px] font-black uppercase shadow-brutal-sm flex flex-col items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">receipt</span>
                  <span>Expense</span>
                </button>
              </div>

              {/* Receipt Breakdown for Selected Table */}
              <div className="bg-white p-2.5 rounded-xl border border-espresso font-mono text-xs flex flex-col gap-1">
                <div className="flex justify-between text-espresso/70">
                  <span>{currentTableId.toLowerCase() === 'takeaway' ? 'Token Tab' : `Table ${currentTableId}`} ({currentCart.length} items)</span>
                  <span className="tabular-nums font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount {appliedCoupon ? `(${appliedCoupon.code})` : discountPercent > 0 ? `(${discountPercent}%)` : ''}</span>
                    <span className="tabular-nums">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {hasPackagingFee && (
                  <div className="flex justify-between text-amber-900 font-bold">
                    <span>Takeaway Packaging Fee</span>
                    <span className="tabular-nums">+₹15.00</span>
                  </div>
                )}
                <div className="flex justify-between text-espresso/70">
                  <span>CGST (2.5%) + SGST (2.5%)</span>
                  <span className="tabular-nums">₹{(cgst + sgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1.5 border-t-2 border-dashed border-espresso/20 font-display">
                  <span className="text-sm font-black text-espresso">Net Payable</span>
                  <span className="text-xl sm:text-2xl font-black text-paros-orange tabular-nums">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Quick Cash Tender Selector */}
              {grandTotal > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] font-display">
                    <span className="font-black uppercase text-espresso/70">Cash Tender:</span>
                    <span className="bg-paros-mint px-2 py-0.5 rounded border border-espresso font-mono font-bold text-[10px]">
                      {changeDue >= 0
                        ? `Tender ₹${tenderAmount} → Return ₹${changeDue}`
                        : `Short by ₹${Math.abs(changeDue)}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 font-mono text-xs font-black">
                    {[grandTotal, Math.ceil(grandTotal / 100) * 100, 500, 1000].map((amt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTenderAmount(amt)}
                        className={`py-1 rounded-lg border border-espresso transition-all shadow-brutal-sm ${
                          tenderAmount === amt
                            ? 'bg-paros-yellow text-espresso ring-1 ring-espresso font-extrabold'
                            : 'bg-white hover:bg-paros-cream'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Peripheral Row: WhatsApp Receipt & Fire/Print */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={currentCart.length === 0}
                  onClick={() => {
                    const guestPhone = currentCustomer.phone;
                    if (!guestPhone) {
                      showToast('⚠️ Enter customer phone number first');
                      return;
                    }
                    const phone = guestPhone.replace(/[^0-9]/g, '');
                    const phoneWithCountry = phone.startsWith('91') ? phone : `91${phone}`;
                    
                    const itemsList = currentCart.map(i => `${i.quantity}x ${i.name} — ₹${(i.price * i.quantity).toFixed(0)}`).join('\n');
                    const text = encodeURIComponent(
                      `🧾 *Receipt from ${cafeName}*\n` +
                      `━━━━━━━━━━━━━━━━\n` +
                      `${itemsList}\n` +
                      `━━━━━━━━━━━━━━━━\n` +
                      `Subtotal: ₹${subtotal.toFixed(2)}\n` +
                      (discountAmount > 0 ? `Discount: -₹${discountAmount.toFixed(2)}\n` : '') +
                      `GST (5%): ₹${(cgst + sgst).toFixed(2)}\n` +
                      `*Total: ₹${grandTotal.toFixed(2)}*\n\n` +
                      `Thank you for visiting! 🙏`
                    );
                    
                    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
                    showToast(`📲 WhatsApp bill dispatched to ${guestPhone}!`);
                  }}
                  className={`py-1.5 px-2 border-2 border-espresso rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 shadow-brutal-sm transition-all ${
                    currentCart.length === 0 ? 'opacity-40 cursor-not-allowed bg-stone-100 pointer-events-none' : 'bg-white hover:bg-paros-cream'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-paros-matcha">chat</span>
                  <span>WhatsApp Receipt</span>
                </button>
                <button
                  type="button"
                  disabled={currentCart.length === 0 || unfiredCount === 0 || kotLoading}
                  onClick={() => handleDispatchKot(true)}
                  className={`py-1.5 px-2 border-2 border-espresso rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 shadow-brutal-sm transition-all cursor-pointer ${
                    currentCart.length === 0 || unfiredCount === 0 || kotLoading
                      ? 'opacity-40 cursor-not-allowed bg-stone-100 pointer-events-none'
                      : 'bg-paros-yellow hover:bg-amber-300'
                  }`}
                  title={
                    unfiredCount === 0 && currentCart.length > 0
                      ? 'All items already sent to kitchen'
                      : 'Fire KOT to Kitchen Screen & Print 80mm ESC-POS Chit'
                  }
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {unfiredCount === 0 && currentCart.length > 0 ? 'check_circle' : 'skillet'}
                  </span>
                  <span>
                    {kotLoading
                      ? 'Sending...'
                      : unfiredCount === 0 && currentCart.length > 0
                      ? 'All Fired ✓'
                      : `Fire & Print (${unfiredCount})`}
                  </span>
                </button>
              </div>

              {/* PRIMARY SETTLEMENT BUTTONS (Full Height h-14, Zero Deformation) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                <button
                  type="button"
                  disabled={currentCart.length === 0}
                  onClick={() => handleSettle('CASH')}
                  className={`h-14 px-3 sm:px-4 rounded-xl border-2 border-espresso flex items-center justify-between transition-all ${
                    currentCart.length === 0
                      ? 'bg-stone-200 text-espresso/40 border-stone-300 cursor-not-allowed'
                      : 'brutal-btn bg-espresso text-white hover:bg-stone-800 active:scale-[0.98] shadow-brutal cursor-pointer'
                  }`}
                  title={currentCart.length === 0 ? "Add items to cart to settle cash" : `Collect ₹${grandTotal} in Cash`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className={`material-symbols-outlined text-[22px] shrink-0 ${currentCart.length === 0 ? 'text-stone-400' : 'text-amber-400'}`}>payments</span>
                    <span className="font-display font-black text-xs sm:text-sm uppercase tracking-wide truncate">CASH</span>
                  </div>
                  {grandTotal > 0 ? (
                    <span className="font-mono font-black text-xs sm:text-sm bg-white/20 text-white px-2 py-0.5 rounded-lg tabular-nums shrink-0">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-xs bg-espresso/10 text-espresso/40 px-2 py-0.5 rounded-lg tabular-nums shrink-0">
                      ₹0
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={currentCart.length === 0}
                  onClick={handleOpenUpiModal}
                  className={`h-14 px-3 sm:px-4 rounded-xl border-2 border-espresso flex items-center justify-between transition-all ${
                    currentCart.length === 0
                      ? 'bg-stone-200 text-espresso/40 border-stone-300 cursor-not-allowed'
                      : 'brutal-btn bg-paros-matcha text-white hover:bg-emerald-700 active:scale-[0.98] shadow-brutal cursor-pointer'
                  }`}
                  title={currentCart.length === 0 ? "Add items to cart to settle via UPI" : `Scan & Pay ₹${grandTotal} via UPI QR`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className={`material-symbols-outlined text-[22px] shrink-0 ${currentCart.length === 0 ? 'text-stone-400' : 'text-white'}`}>qr_code_scanner</span>
                    <span className="font-display font-black text-xs sm:text-sm uppercase tracking-wide truncate">UPI QR</span>
                  </div>
                  {grandTotal > 0 ? (
                    <span className="font-mono font-black text-xs sm:text-sm bg-white/20 text-white px-2 py-0.5 rounded-lg tabular-nums shrink-0">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-xs bg-white/30 text-white px-2 py-0.5 rounded-lg tabular-nums shrink-0">
                      ₹0
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Floating Cart Bar (Appears when in catalog and items are in cart) ── */}
      {mobilePanel === 'catalog' && currentCart.length > 0 && (
        <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-espresso p-3 shadow-brutal-lg flex items-center justify-between gap-3 pb-safe animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border-2 border-espresso shadow-brutal-sm">
              {currentCart.reduce((sum, it) => sum + it.quantity, 0)}
            </span>
            <div>
              <p className="font-display font-black text-sm text-espresso leading-tight">
                ₹{grandTotal.toFixed(0)}{' '}
                <span className="text-[11px] font-bold text-espresso/60">
                  ({currentCart.length} {currentCart.length === 1 ? 'item' : 'items'})
                </span>
              </p>
              <p className="font-mono text-[10px] text-espresso/70 uppercase">
                {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' ? `Token #${expressTokenSeq}` : `Table ${selectedTable}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobilePanel('ticket')}
            className="brutal-btn px-4 py-2.5 bg-paros-matcha text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center gap-1.5"
          >
            <span>Review & Settle</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── MOBILE QUICK TOOLS DRAWER / SHEET ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {isMobileToolsOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-espresso/60 backdrop-blur-sm p-3 pb-safe animate-in fade-in-50">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-paros-orange text-white flex items-center justify-center font-black text-sm border-2 border-espresso shadow-brutal-sm">
                  ⚙️
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-espresso">POS Register Settings</h3>
                  <p className="font-body text-[11px] text-espresso/60">{cafeName} • {currentTime}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileToolsOpen(false)}
                className="w-8 h-8 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-sm hover:bg-paros-orange hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* POS Mode Switcher (Dine-in vs Counter Rush) */}
            {!isCounterOnlyCafe && (
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-[11px] font-black uppercase text-espresso/70">
                  Operation Mode:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-paros-cream border-2 border-espresso rounded-2xl">
                  <button
                    onClick={() => {
                      setPosMode('DINE_IN');
                      const firstPhysical = tables.find((t) => t.tableNumber.toLowerCase() !== 'takeaway');
                      if (firstPhysical) setSelectedTable(firstPhysical.tableNumber);
                      setIsMobileToolsOpen(false);
                      showToast('Switched to Dine-In Mode');
                    }}
                    className={`py-2 rounded-xl font-display text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
                      posMode === 'DINE_IN'
                        ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                        : 'text-espresso hover:bg-paros-yellow/40'
                    }`}
                  >
                    <span>🪑 Dine-In</span>
                  </button>
                  <button
                    onClick={() => {
                      setPosMode('EXPRESS_COUNTER');
                      setSelectedTable('Takeaway');
                      setIsMobileToolsOpen(false);
                      showToast('Switched to Express Counter Rush');
                    }}
                    className={`py-2 rounded-xl font-display text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
                      posMode === 'EXPRESS_COUNTER'
                        ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                        : 'text-espresso hover:bg-paros-yellow/40'
                    }`}
                  >
                    <span>⚡ Counter Rush</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cash & Shift Actions */}
            <div className="flex flex-col gap-1.5">
              <label className="font-display text-[11px] font-black uppercase text-espresso/70">
                Cash & Till Actions:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileToolsOpen(false);
                    setIsExpenseModalOpen(true);
                  }}
                  className="p-3 bg-paros-cream hover:bg-paros-yellow rounded-2xl border-2 border-espresso font-display text-xs font-bold text-left shadow-brutal-sm flex flex-col gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-paros-orange text-[20px]">payments</span>
                  <span className="font-black text-espresso">+ Log Expense</span>
                  <span className="text-[10px] text-espresso/60">From till cash float</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileToolsOpen(false);
                    setIsCloseShiftModalOpen(true);
                  }}
                  className="p-3 bg-paros-yellow hover:bg-amber-300 rounded-2xl border-2 border-espresso font-display text-xs font-bold text-left shadow-brutal-sm flex flex-col gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-amber-900 text-[20px]">lock_clock</span>
                  <span className="font-black text-espresso">End Shift / EOD</span>
                  <span className="text-[10px] text-espresso/60">Till count & sales audit</span>
                </button>
              </div>
            </div>

            {/* Navigation Shortcuts */}
            <div className="flex flex-col gap-1.5">
              <label className="font-display text-[11px] font-black uppercase text-espresso/70">
                Quick Shortcuts:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/order"
                  target="_blank"
                  onClick={() => setIsMobileToolsOpen(false)}
                  className="p-2.5 bg-paros-mint rounded-2xl border-2 border-espresso text-center shadow-brutal-sm flex flex-col items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">smartphone</span>
                  <span className="font-display text-[11px] font-black uppercase">Guest QR ↗</span>
                </Link>
                <Link
                  href="/kds"
                  onClick={() => setIsMobileToolsOpen(false)}
                  className="p-2.5 bg-white rounded-2xl border-2 border-espresso text-center shadow-brutal-sm flex flex-col items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">soup_kitchen</span>
                  <span className="font-display text-[11px] font-black uppercase">KDS Screen</span>
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setIsMobileToolsOpen(false)}
                  className="p-2.5 bg-white rounded-2xl border-2 border-espresso text-center shadow-brutal-sm flex flex-col items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                  <span className="font-display text-[11px] font-black uppercase">Z-Report</span>
                </Link>
              </div>
            </div>

            {/* Cashier & Reset */}
            <div className="pt-2 border-t border-dashed border-espresso/20 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setIsMobileToolsOpen(false);
                  handleLockTerminal();
                }}
                className="flex-1 py-2.5 bg-paros-cream hover:bg-paros-yellow border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Lock Terminal</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileToolsOpen(false);
                  setShowResetModal(true);
                }}
                className="py-2.5 px-3 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm flex items-center justify-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: DYNAMIC UPI QR SCAN & PAY OVERLAY ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {isUpiModalOpen && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-5 sm:p-7 w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-espresso">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-paros-matcha text-white flex items-center justify-center border-2 border-espresso shadow-brutal-sm">
                  <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-espresso">
                    Scan UPI QR to Pay
                  </h3>
                  <p className="font-mono text-xs text-paros-matcha font-bold">
                    0% Gateway MDR • Direct Bank Settlement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUpiModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-espresso/70 hover:text-espresso"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Total Amount Banner */}
            <div className="bg-paros-cream p-3.5 rounded-2xl border-2 border-espresso flex items-center justify-between">
              <div>
                <span className="font-display text-[10px] font-black uppercase tracking-wider text-espresso/60 block">
                  EXACT PAYABLE
                </span>
                <span className="font-display text-2xl font-black text-paros-orange tabular-nums">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-espresso bg-white px-2.5 py-1 rounded-lg border border-espresso inline-block">
                  {isExpress ? `Token #${expressTokenSeq}` : `Table ${selectedTable}`}
                </span>
                <p className="font-body text-[10px] text-espresso/60 mt-0.5">
                  {currentCart.length} {currentCart.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>

            {/* Dynamic QR Code Canvas */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-espresso shadow-brutal-sm">
              {upiQrDataUrl ? (
                <img
                  src={upiQrDataUrl}
                  alt="Scan UPI QR"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl border border-espresso/20"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                  <span className="font-mono text-xs text-stone-400">Generating UPI QR...</span>
                </div>
              )}

              <div className="mt-3 flex items-center gap-1.5 text-xs font-mono font-bold text-espresso/80">
                <span>VPA:</span>
                <span className="bg-paros-yellow px-2 py-0.5 rounded border border-espresso select-all">{cafeUpiVpa}</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-espresso/60 text-center">
                Customer can scan using GPay, PhonePe, Paytm, CRED or any UPI App
              </p>
            </div>

            {/* Confirm Settle Action */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsUpiModalOpen(false);
                  handleSettle('UPI');
                }}
                className="brutal-btn w-full py-3.5 bg-paros-matcha hover:bg-emerald-700 text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Payment Received • Settle &amp; Print</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUpiModalOpen(false)}
                className="w-full py-2 text-center font-display font-bold text-xs uppercase text-espresso/60 hover:text-espresso transition-colors cursor-pointer"
              >
                Cancel / Switch Payment Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: BILL SETTLEMENT & WHATSAPP RECEIPT OVERLAY ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {settledBill && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-4 sm:p-8 w-full max-w-lg flex flex-col gap-3 sm:gap-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
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

            {/* Express Token Callout Banner */}
            {(isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' || settledBill.tableNumber.toLowerCase() === 'takeaway') && (
              <div className="p-3 bg-paros-yellow/40 rounded-2xl border-2 border-espresso flex items-center justify-between">
                <div>
                  <span className="font-display text-[10px] font-black uppercase tracking-wider text-espresso/70 block">
                    CUSTOMER PICKUP TOKEN
                  </span>
                  <span className="font-mono text-2xl font-black text-espresso">
                    {settledBill.orderNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-display text-[11px] font-black text-emerald-800 bg-paros-mint px-2 py-0.5 rounded-lg border border-espresso inline-block">
                    ⚡ Sent to Kitchen KDS
                  </span>
                  <p className="font-body text-[10px] text-espresso/60 mt-0.5">
                    Live ticket queued for preparation
                  </p>
                </div>
              </div>
            )}

            {/* Bill Receipt Preview */}
            <div className="p-4 bg-paros-cream rounded-2xl border-2 border-espresso flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-dashed border-espresso/20">
                <span className="font-display font-bold text-espresso">
                  {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' || settledBill.tableNumber.toLowerCase() === 'takeaway'
                    ? `TOKEN ${settledBill.orderNumber} • EXPRESS PICKUP`
                    : `Table ${settledBill.tableNumber} • ${settledBill.orderNumber}`}
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
                    <span>Discount {settledBill.couponCode ? `(${settledBill.couponCode})` : '(Promo)'}</span>
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

                {settledBill.aggregatorCut !== undefined && settledBill.aggregatorCut > 0 && (
                  <div className="flex justify-between text-amber-800 text-[11px] pt-1 border-t border-dashed border-espresso/20">
                    <span>{settledBill.source} Cut (20%): -₹{settledBill.aggregatorCut.toFixed(2)}</span>
                    <span className="font-bold">Net Payout: ₹{settledBill.netPayout?.toFixed(2)}</span>
                  </div>
                )}

                {settledBill.paymentMethod === 'CASH' && (
                  <div className="flex justify-between pt-1 text-espresso font-bold">
                    <span>Cash Tendered:</span>
                    <span>
                      ₹{tenderAmount} (Change Returned: ₹{settledBill.changeDue})
                    </span>
                  </div>
                )}

                {settledBill.paymentMethod === 'SPLIT' && (
                  <div className="pt-1.5 space-y-0.5 border-t border-espresso/15 text-xs font-bold">
                    <div className="flex justify-between text-emerald-800">
                      <span>Till Cash Portion:</span>
                      <span className="font-mono">₹{(settledBill.cashAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-800">
                      <span>UPI Online Portion:</span>
                      <span className="font-mono">₹{(settledBill.upiAmount || 0).toFixed(2)}</span>
                    </div>
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

            {/* Final Done & Thermal Print Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
              <button
                onClick={() => triggerPrintReceipt(settledBill)}
                className="brutal-btn px-4 py-3 bg-white hover:bg-paros-yellow border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm flex items-center justify-center gap-1.5"
                title="Print 80mm / 58mm Thermal Bill Receipt"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>🖨️ Print Bill</span>
              </button>

              <button
                onClick={() => triggerPrintKOTFromBill(settledBill)}
                className="brutal-btn px-4 py-3 bg-paros-cream hover:bg-paros-yellow border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm flex items-center justify-center gap-1.5"
                title="Print 80mm / 58mm Kitchen KOT Chit"
              >
                <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
                <span>🖨️ Print KOT</span>
              </button>

              <button
                onClick={handleCompleteAndFreeTable}
                className="brutal-btn flex-1 py-3.5 bg-espresso text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2"
              >
                <span>
                  {isCounterOnlyCafe || posMode === 'EXPRESS_COUNTER' || settledBill.tableNumber.toLowerCase() === 'takeaway'
                    ? 'Done • Next Customer ➔'
                    : `Done • Free Table ${settledBill.tableNumber} ➔`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: WIPE SYSTEM & REGISTER NEW CAFE OVERLAY ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {showResetModal && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-5 sm:p-8 w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
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

      {/* ── Modal: Split Bill Engine (Dual Split & Even Split) ── */}
      {isSplitModalOpen && (() => {
        const parsedCash = Math.min(grandTotal, Math.max(0, Number(splitCashAmount) || 0));
        const remainingUpi = Math.max(0, grandTotal - parsedCash);
        const perPerson = Math.ceil(grandTotal / splitCount);

        return (
          <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-5 sm:p-6 w-full max-w-md animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-paros-orange text-[24px]">call_split</span>
                  <div>
                    <h3 className="font-display text-lg font-black text-espresso">
                      Split Bill • {isExpress ? `Token #${expressTokenSeq}` : `Table ${selectedTable}`}
                    </h3>
                    <p className="font-body text-xs text-espresso/60">Total: ₹{grandTotal.toFixed(2)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSplitModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs hover:bg-paros-orange hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-paros-cream border-2 border-espresso rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setSplitMode('DUAL')}
                  className={`py-2 rounded-lg font-display text-xs font-black uppercase transition-all cursor-pointer ${
                    splitMode === 'DUAL'
                      ? 'bg-paros-orange text-white border border-espresso shadow-xs'
                      : 'text-espresso hover:bg-paros-yellow/40'
                  }`}
                >
                  Dual Split (Cash + UPI)
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('EQUAL')}
                  className={`py-2 rounded-lg font-display text-xs font-black uppercase transition-all cursor-pointer ${
                    splitMode === 'EQUAL'
                      ? 'bg-paros-orange text-white border border-espresso shadow-xs'
                      : 'text-espresso hover:bg-paros-yellow/40'
                  }`}
                >
                  Even Split ({splitCount} Guests)
                </button>
              </div>

              {splitMode === 'DUAL' ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-amber-50 p-3 rounded-2xl border-2 border-espresso">
                    <label className="font-display text-xs font-black uppercase text-espresso block mb-1.5">
                      💵 Cash Portion to Collect:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-black text-base text-espresso">₹</span>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        value={splitCashAmount}
                        onChange={(e) => setSplitCashAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-espresso rounded-xl font-mono text-lg font-black text-espresso outline-none focus:ring-2 focus:ring-paros-orange"
                      />
                    </div>
                    {/* Quick percentage buttons */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      {[0.25, 0.5, 0.75].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setSplitCashAmount(String(Math.round(grandTotal * pct)))}
                          className="py-1 bg-white hover:bg-amber-100 border border-espresso rounded-lg font-display text-[10px] font-black text-espresso uppercase"
                        >
                          {pct * 100}% (₹{Math.round(grandTotal * pct)})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 bg-paros-mint/50 rounded-2xl border-2 border-espresso flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-display text-xs font-black uppercase text-emerald-950">
                        📱 UPI QR Portion:
                      </span>
                      <span className="font-display text-2xl font-black text-emerald-950 tabular-nums">
                        ₹{remainingUpi.toFixed(2)}
                      </span>
                    </div>
                    <p className="font-body text-xs text-emerald-800">
                      ₹{parsedCash.toFixed(0)} Cash recorded in Till • ₹{remainingUpi.toFixed(0)} via Dynamic UPI QR
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsSplitModalOpen(false);
                      if (remainingUpi > 0) {
                        // Open dynamic UPI modal for remaining UPI portion
                        const tokenLabel = isExpress ? `Token #${expressTokenSeq}` : `Table ${selectedTable}`;
                        const upiUri = `upi://pay?pa=${encodeURIComponent(cafeUpiVpa)}&pn=${encodeURIComponent(cafeName)}&am=${remainingUpi}&cu=INR&tn=${encodeURIComponent(`${cafeName} Split ${tokenLabel}`)}`;
                        try {
                          const url = await QRCode.toDataURL(upiUri, { width: 320, margin: 1 });
                          setUpiQrDataUrl(url);
                        } catch (err) {}
                        setIsUpiModalOpen(true);
                      } else {
                        // Settle purely as CASH
                        handleSettle('CASH');
                      }
                    }}
                    className="brutal-btn w-full py-3.5 bg-paros-matcha hover:bg-emerald-700 text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                    <span>
                      {remainingUpi > 0
                        ? `Collect ₹${parsedCash} Cash + Open ₹${remainingUpi} UPI QR ➔`
                        : `Collect ₹${parsedCash} Cash & Settle ➔`}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="font-display text-xs font-black uppercase text-espresso block mb-1.5">
                      Number of Guests Sharing:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setSplitCount(cnt)}
                          className={`py-2 rounded-xl font-display text-sm font-black border transition-all cursor-pointer ${
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

                  <div className="p-4 bg-paros-mint/40 rounded-2xl border-2 border-espresso text-center">
                    <span className="font-display text-xs font-black uppercase text-espresso block mb-1">
                      Each Guest Pays:
                    </span>
                    <span className="font-display text-3xl font-black text-espresso tabular-nums">
                      ₹{perPerson}
                    </span>
                    <p className="font-body text-xs text-espresso/70 mt-1">
                      Even split ({splitCount} × ₹{perPerson} = ₹{perPerson * splitCount})
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const tokenLabel = isExpress ? `Token #${expressTokenSeq}` : `Table ${selectedTable}`;
                        const upiUri = `upi://pay?pa=${encodeURIComponent(cafeUpiVpa)}&pn=${encodeURIComponent(cafeName)}&am=${perPerson}&cu=INR&tn=${encodeURIComponent(`${cafeName} ${tokenLabel} 1-of-${splitCount}`)}`;
                        try {
                          const url = await QRCode.toDataURL(upiUri, { width: 320, margin: 1 });
                          setUpiQrDataUrl(url);
                        } catch (err) {}
                        setIsSplitModalOpen(false);
                        setIsUpiModalOpen(true);
                      }}
                      className="brutal-btn w-full py-3 bg-paros-yellow hover:bg-amber-300 text-espresso font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                      <span>Show ₹{perPerson} Individual Guest QR ➔</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSplitModalOpen(false);
                        handleSettle('UPI');
                      }}
                      className="brutal-btn w-full py-3 bg-paros-matcha hover:bg-emerald-700 text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>All Guests Paid (Settle Full ₹{grandTotal}) ➔</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Cooking Notes & Kitchen Instructions ── */}
      {isNoteModalOpen && activeNoteItemId && (() => {
        const item = currentCart.find((i) => i.id === activeNoteItemId);
        const PRESET_TAGS = ['No Sugar', 'Less Sweet', 'Extra Hot', 'Less Ice', 'Jain / No Onion', 'Spicy', 'Pack Separately', 'Ice On Side'];

        return (
          <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-5 sm:p-6 w-full max-w-md animate-in zoom-in-95">
              <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-800 text-[24px]">edit_note</span>
                  <div>
                    <h3 className="font-display text-lg font-black text-espresso">
                      Cooking Note
                    </h3>
                    <p className="font-body text-xs text-espresso/60 font-medium truncate max-w-[240px]">
                      {item?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs hover:bg-paros-orange hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 1-Tap Quick Tags */}
              <div className="mb-3">
                <label className="font-display text-[10px] font-black uppercase text-espresso/70 block mb-1.5">
                  ⚡ 1-Tap Quick Tags:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const exists = activeNoteText.includes(tag);
                        if (exists) {
                          setActiveNoteText((prev) => prev.replace(tag, '').replace(/,\s*,/, ',').trim());
                        } else {
                          setActiveNoteText((prev) => (prev ? `${prev}, ${tag}` : tag));
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg border font-display text-xs font-bold transition-all cursor-pointer ${
                        activeNoteText.includes(tag)
                          ? 'bg-paros-orange text-white border-espresso shadow-xs'
                          : 'bg-paros-cream text-espresso border-espresso hover:bg-amber-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free Text Input */}
              <div className="mb-4">
                <label className="font-display text-[10px] font-black uppercase text-espresso/70 block mb-1">
                  Custom Preparation Instructions:
                </label>
                <textarea
                  rows={2}
                  value={activeNoteText}
                  onChange={(e) => setActiveNoteText(e.target.value)}
                  placeholder="e.g. Warm croissant for 30 seconds, less cinnamon"
                  className="w-full px-3 py-2 bg-paros-cream border-2 border-espresso rounded-xl font-body text-xs text-espresso outline-none focus:ring-2 focus:ring-paros-orange"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveItemNote('')}
                  className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => saveItemNote(activeNoteText)}
                  className="brutal-btn flex-1 py-2.5 bg-paros-matcha hover:bg-emerald-700 text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Save Note to Ticket ➔</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Item Add-ons & Modifiers ── */}
      {isAddonModalOpen && activeAddonItemId && (() => {
        const item = currentCart.find((i) => i.id === activeAddonItemId);
        const itemAddons = item?.addons || [];

        return (
          <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-5 sm:p-6 w-full max-w-md animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-paros-orange text-[24px]">tune</span>
                  <div>
                    <h3 className="font-display text-lg font-black text-espresso">
                      Modifiers & Add-ons
                    </h3>
                    <p className="font-body text-xs text-espresso/60 truncate max-w-[240px]">
                      {item?.name} (Base: ₹{item?.basePrice ?? item?.price})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddonModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs hover:bg-paros-orange hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-2 mb-4">
                {STANDARD_ADDONS.map((addon) => {
                  const isSelected = itemAddons.some((a) => a.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => toggleAddonOnItem(activeAddonItemId, addon)}
                      className={`p-2.5 rounded-xl border-2 border-espresso flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-paros-yellow shadow-xs ring-1 ring-espresso font-bold'
                          : 'bg-paros-cream hover:bg-white text-espresso'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-espresso/70">
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <span className="font-display text-xs text-espresso">{addon.name}</span>
                      </div>
                      <span className="font-mono text-xs font-black text-espresso tabular-nums">
                        +₹{addon.price}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsAddonModalOpen(false)}
                className="brutal-btn w-full py-3 bg-espresso text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Done • Total ₹{item ? item.price * item.quantity : 0} ➔</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Manager PIN Void Order Flow ── */}
      {isVoidModalOpen && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-5 sm:p-6 w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-[26px]">cancel</span>
                <div>
                  <h3 className="font-display text-lg font-black text-espresso">
                    Void / Cancel Order
                  </h3>
                  <p className="font-body text-xs text-red-600 font-bold">
                    Table {selectedTable} • Irreversible
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoidModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs hover:bg-paros-orange hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-red-50 rounded-2xl border border-red-300 text-xs text-red-900 mb-4">
              ⚠️ Voiding this ticket will immediately remove it from the Kitchen KDS screen, restore deducted raw material stock, and free Table {selectedTable}.
            </div>

            {/* Void Reason Selector */}
            <div className="mb-4">
              <label className="font-display text-[10px] font-black uppercase text-espresso/70 block mb-1.5">
                Select Reason for Cancellation:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Customer Walkout', 'Mistake Punch', 'Item Unavailable', 'Delayed / Abandoned'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setVoidReason(r)}
                    className={`py-2 px-2 rounded-xl border font-display text-[11px] font-bold transition-all cursor-pointer text-left ${
                      voidReason === r
                        ? 'bg-red-600 text-white border-espresso shadow-xs'
                        : 'bg-paros-cream text-espresso border-espresso hover:bg-red-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Manager PIN Input */}
            <div className="mb-5">
              <label className="font-display text-[10px] font-black uppercase text-espresso/70 block mb-1">
                Enter Manager PIN (Default: 1234):
              </label>
              <input
                type="password"
                maxLength={4}
                value={voidPin}
                onChange={(e) => setVoidPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] py-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-xl font-black text-espresso outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsVoidModalOpen(false)}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={voidLoading || voidPin.length !== 4}
                onClick={handleVoidOrder}
                className="brutal-btn flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                <span>{voidLoading ? 'Voiding...' : 'Confirm Void Order ➔'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: POS Drawer Expense Modal ── */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-espresso/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border-3 border-espresso shadow-brutal-xl p-5 sm:p-6 w-full max-w-md animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
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

      {/* ── Cashier Terminal PIN Unlock Modal ── */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-espresso/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl w-full max-w-sm p-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-paros-yellow border-2 border-espresso shadow-brutal-sm flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-espresso text-3xl">lock</span>
            </div>

            <h2 className="font-display text-2xl font-black text-espresso text-center">
              Cashier Terminal Access
            </h2>
            <p className="font-body text-xs text-espresso/70 text-center mt-1 mb-4">
              Enter your 4-digit Cashier PIN to unlock the POS register.
            </p>

            {/* PIN Display Dots */}
            <div className="flex items-center justify-center gap-3 my-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 border-espresso transition-all ${
                    enteredPin.length > idx ? 'bg-paros-orange scale-110' : 'bg-paros-cream'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="font-display text-xs font-bold text-red-600 bg-red-100 border border-red-300 px-3 py-1 rounded-lg my-2 text-center">
                {pinError}
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full mt-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    if (enteredPin.length < 4) {
                      const next = enteredPin + digit;
                      setEnteredPin(next);
                      setPinError('');
                      if (next.length === 4) {
                        setTimeout(() => handleVerifyPin(next), 40);
                      }
                    }
                  }}
                  className="py-3.5 rounded-xl bg-paros-cream hover:bg-paros-yellow active:bg-paros-orange active:text-white border-2 border-espresso font-mono text-xl font-black text-espresso transition-all shadow-brutal-sm flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEnteredPin('')}
                className="py-3.5 rounded-xl bg-red-100 hover:bg-red-200 border-2 border-espresso font-display text-xs font-black text-red-700 uppercase shadow-brutal-sm"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  if (enteredPin.length < 4) {
                    const next = enteredPin + '0';
                    setEnteredPin(next);
                    setPinError('');
                    if (next.length === 4) {
                      setTimeout(() => handleVerifyPin(next), 40);
                    }
                  }
                }}
                className="py-3.5 rounded-xl bg-paros-cream hover:bg-paros-yellow border-2 border-espresso font-mono text-xl font-black text-espresso shadow-brutal-sm flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setEnteredPin((prev) => prev.slice(0, -1))}
                className="py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 border-2 border-espresso font-mono text-sm font-black text-espresso shadow-brutal-sm flex items-center justify-center"
              >
                ⌫
              </button>
            </div>

            {/* Submit / Unlock Button */}
            <button
              type="button"
              disabled={enteredPin.length !== 4 || pinLoading}
              onClick={() => handleVerifyPin()}
              className="brutal-btn w-full mt-4 py-3.5 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal disabled:opacity-40"
            >
              {pinLoading ? 'Verifying PIN...' : 'Unlock Register ➔'}
            </button>

            <p className="font-body text-[11px] text-espresso/50 mt-3 text-center">
              💡 Default Cashier PIN: <span className="font-mono font-bold text-espresso">1234</span>
            </p>
          </div>
        </div>
      )}

      {/* ── End of Day & Shift Close Audit Modal ── */}
      {isCloseShiftModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-espresso/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-paros-yellow border-2 border-espresso shadow-brutal-sm flex items-center justify-center text-espresso text-2xl">
                  🔒
                </div>
                <div>
                  <h2 className="font-display text-xl font-black text-espresso">
                    End of Day & Shift Close Audit
                  </h2>
                  <p className="font-body text-xs text-espresso/70">
                    Reconcile drawer till cash & dispatch owner sales report
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="w-8 h-8 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-bold text-sm hover:bg-paros-yellow"
              >
                ✕
              </button>
            </div>

            {/* Shift Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-paros-cream p-3 rounded-xl border border-espresso text-center">
                <p className="text-[10px] uppercase font-display font-black text-espresso/60">Opening Float</p>
                <p className="text-base font-black text-espresso font-mono mt-0.5">
                  ₹{(activeShift?.openingCash ?? 2000).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-paros-mint/40 p-3 rounded-xl border border-espresso text-center">
                <p className="text-[10px] uppercase font-display font-black text-emerald-800">Cash Sales</p>
                <p className="text-base font-black text-emerald-900 font-mono mt-0.5">
                  +₹{(activeShift?.cashSales ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-xl border border-espresso text-center">
                <p className="text-[10px] uppercase font-display font-black text-red-700">Petty Expenses</p>
                <p className="text-base font-black text-red-800 font-mono mt-0.5">
                  -₹{(activeShift?.pettyExpenses ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-paros-yellow p-3 rounded-xl border border-espresso text-center">
                <p className="text-[10px] uppercase font-display font-black text-amber-900">Expected Cash</p>
                <p className="text-base font-black text-espresso font-mono mt-0.5">
                  ₹{(activeShift?.expectedCash ?? drawerCash).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Reconciliation Form */}
            <form onSubmit={handleCloseShift} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-display text-xs font-black uppercase text-espresso">
                  Actual Physical Cash Counted in Drawer (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-base text-espresso">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={closingCountedCash}
                    onChange={(e) => setClosingCountedCash(e.target.value)}
                    placeholder={`Expected: ${activeShift?.expectedCash ?? drawerCash}`}
                    className="w-full pl-8 pr-4 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-lg font-bold text-espresso outline-none focus:ring-2 focus:ring-paros-orange"
                    autoFocus
                  />
                </div>
              </div>

              {/* Live Discrepancy Indicator */}
              {closingCountedCash.trim() !== '' && (
                (() => {
                  const counted = Number(closingCountedCash);
                  const expected = activeShift?.expectedCash ?? drawerCash;
                  const diff = counted - expected;
                  return (
                    <div
                      className={`p-3 rounded-xl border-2 border-espresso flex items-center justify-between font-display text-xs font-bold ${
                        diff === 0
                          ? 'bg-paros-mint text-emerald-950'
                          : diff > 0
                          ? 'bg-amber-100 text-amber-950'
                          : 'bg-red-100 text-red-950'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">
                          {diff === 0 ? 'check_circle' : diff > 0 ? 'add_circle' : 'warning'}
                        </span>
                        <span>
                          {diff === 0
                            ? 'Drawer is Balanced Penny-Perfect!'
                            : diff > 0
                            ? 'Cash Drawer Surplus (Over)'
                            : 'Cash Drawer Shortage (Deficit)'}
                        </span>
                      </span>
                      <span className="font-mono text-sm font-black">
                        {diff === 0 ? '₹0.00' : diff > 0 ? `+₹${diff.toFixed(2)}` : `-₹${Math.abs(diff).toFixed(2)}`}
                      </span>
                    </div>
                  );
                })()
              )}

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="font-display text-xs font-black uppercase text-espresso">
                  Shift Notes & Discrepancy Explanation (optional)
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Nightly cash counted by Rahul. ₹50 surplus due to customer tip left in drawer."
                  rows={2}
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-body text-xs text-espresso outline-none focus:ring-2 focus:ring-paros-orange"
                />
              </div>

              {/* Email Nightly Report Toggle */}
              <label className="flex items-center gap-3 p-3 bg-paros-cream rounded-xl border border-espresso cursor-pointer">
                <input
                  type="checkbox"
                  checked={closingSendEmail}
                  onChange={(e) => setClosingSendEmail(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-espresso accent-paros-orange cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-display text-xs font-black text-espresso">
                    📧 Email Nightly Sales & Till Audit Report to Cafe Owner
                  </span>
                  <span className="font-body text-[10px] text-espresso/60">
                    Sends full revenue breakdown, UPI vs Cash split, petty expenses & top items
                  </span>
                </div>
              </label>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="w-1/3 py-3 rounded-xl border-2 border-espresso font-display text-xs font-black uppercase hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closingLoading}
                  className="brutal-btn w-2/3 py-3.5 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {closingLoading ? (
                    <span>Closing Shift...</span>
                  ) : (
                    <>
                      <span>Confirm & Close Shift</span>
                      <span className="material-symbols-outlined text-[16px]">lock</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── THERMAL ESC-POS PRINT ZONE (80mm & 58mm MONOCHROME) ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div id="thermal-print-area" className="thermal-print-only">
        {printDocument?.type === 'RECEIPT' && printDocument.bill && (
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#000', lineHeight: 1.25 }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{cafeName.toUpperCase()}</div>
              <div>Table se Kitchen tak. Bas Paros.</div>
              <div>--------------------------------</div>
              <div style={{ fontWeight: 'bold' }}>TAX INVOICE / CASH BILL</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bill: {printDocument.bill.billNumber}</span>
              <span>Time: {printDocument.bill.time}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Order: {printDocument.bill.orderNumber}</span>
              <span>Table: {printDocument.bill.tableNumber}</span>
            </div>
            {printDocument.bill.source && printDocument.bill.source !== 'POS' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Channel: {printDocument.bill.source}</span>
                <span>{printDocument.bill.aggregatorOrderId || ''}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Guest: {printDocument.bill.customerName}</span>
              <span>{printDocument.bill.customerPhone || ''}</span>
            </div>
            <div>--------------------------------</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span style={{ flex: 1 }}>ITEM</span>
              <span style={{ width: '35px', textAlign: 'center' }}>QTY</span>
              <span style={{ width: '60px', textAlign: 'right' }}>AMT</span>
            </div>
            <div>--------------------------------</div>
            {printDocument.bill.items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ flex: 1 }}>{it.name}</span>
                <span style={{ width: '35px', textAlign: 'center' }}>{it.quantity}</span>
                <span style={{ width: '60px', textAlign: 'right' }}>₹{(it.price * it.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div>--------------------------------</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>₹{printDocument.bill.subtotal.toFixed(2)}</span>
            </div>
            {printDocument.bill.discount !== undefined && printDocument.bill.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Discount ({printDocument.bill.couponCode || 'Promo'}):</span>
                <span>-₹{printDocument.bill.discount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>CGST (2.5%):</span>
              <span>₹{printDocument.bill.cgst.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SGST (2.5%):</span>
              <span>₹{printDocument.bill.sgst.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>
              <span>TOTAL PAYABLE:</span>
              <span>₹{printDocument.bill.total.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span>Payment Mode:</span>
              <span>{printDocument.bill.paymentMethod}</span>
            </div>
            {printDocument.bill.paymentMethod === 'SPLIT' && (
              <div style={{ fontSize: '10px', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash Portion:</span>
                  <span>₹{(printDocument.bill.cashAmount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>UPI Portion:</span>
                  <span>₹{(printDocument.bill.upiAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
            {printDocument.bill.paymentMethod === 'CASH' && printDocument.bill.changeDue > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Change Returned:</span>
                <span>₹{printDocument.bill.changeDue.toFixed(2)}</span>
              </div>
            )}
            {printDocument.bill.aggregatorCut !== undefined && printDocument.bill.aggregatorCut > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
                <span>{printDocument.bill.source} Comm (20%):</span>
                <span>-₹{printDocument.bill.aggregatorCut.toFixed(2)}</span>
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '6px' }}>
              <div style={{ fontWeight: 'bold' }}>Thank You For Visiting!</div>
              {cafeAddress && <div style={{ fontSize: '10px' }}>{cafeAddress}</div>}
              {cafePhone && <div style={{ fontSize: '10px' }}>Tel: {cafePhone}</div>}
              <div>{cafeGstin ? `GSTIN: ${cafeGstin}` : 'GST Unregistered (Composition / Threshold)'}</div>
              {cafeFssai && <div>FSSAI: {cafeFssai}</div>}
              <div style={{ marginTop: '2px', fontSize: '10px' }}>Save Paper • WhatsApp Bills via Paros</div>
            </div>
          </div>
        )}

        {printDocument?.type === 'KOT' && printDocument.kot && (
          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#000', lineHeight: 1.3 }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>*** KITCHEN ORDER TICKET ***</div>
              <div style={{ fontWeight: 'bold', fontSize: '18px', marginTop: '4px' }}>
                [{printDocument.kot.table.toUpperCase()}]
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                Order #{printDocument.kot.orderNumber} • {printDocument.kot.channel}
              </div>
              <div style={{ fontSize: '10px' }}>Time: {printDocument.kot.time}</div>
            </div>
            <div>================================</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>QTY</span>
              <span style={{ flex: 1, paddingLeft: '8px' }}>ITEM & SPECIAL PREP</span>
            </div>
            <div>================================</div>
            {printDocument.kot.items.map((it, idx) => (
              <div key={idx} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', fontWeight: 'bold', fontSize: '13px' }}>
                  <span style={{ width: '28px' }}>[ ] {it.quantity}x</span>
                  <span style={{ flex: 1, paddingLeft: '4px' }}>{it.name}</span>
                </div>
                {it.notes && (
                  <div style={{ paddingLeft: '28px', fontSize: '10px', fontStyle: 'italic' }}>
                    &gt;&gt; {it.notes}
                  </div>
                )}
              </div>
            ))}
            <div>--------------------------------</div>
            {printDocument.kot.specialNotes && (
              <div style={{ margin: '4px 0', fontSize: '11px', fontWeight: 'bold' }}>
                Note: {printDocument.kot.specialNotes}
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '10px' }}>
              <div>KOT Sent to Barista / Chef Screen</div>
              <div>Paros Kitchen Expediter</div>
            </div>
          </div>
        )}
      </div>

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
