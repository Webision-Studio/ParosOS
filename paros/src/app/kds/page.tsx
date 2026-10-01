'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';

interface KdsItem {
  id: string;
  name: string;
  notes?: string;
  status: 'PENDING' | 'READY';
  category?: string;
}

interface KdsTicket {
  id: string;
  orderNumber: string;
  tableLabel: string;
  source: 'POS' | 'QR' | 'TAKEAWAY' | 'SWIGGY' | 'ZOMATO' | string;
  customerName?: string;
  elapsedSeconds: number;
  targetSeconds: number;
  status: 'PREPARING' | 'OVERDUE' | 'READY' | 'NEW';
  specialNote?: string;
  items: KdsItem[];
}

export default function KdsStudioPage() {
  const [stationFilter, setStationFilter] = useState<'all' | 'kitchen' | 'barista' | 'ready' | 'served'>('all');
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cafeName, setCafeName] = useState<string>('Kitchen KDS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Kitchen Staff PIN & Operator State
  const [operator, setOperator] = useState<{ name: string; role: string } | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Audio Context Ref for reliable mobile audio
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioContext(): AudioContext | null {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  // Auto-unlock audio context on first user touch anywhere
  useEffect(() => {
    const unlockAudio = () => {
      getAudioContext();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Listen for browser fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  function toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  // Load operator from session
  useEffect(() => {
    const cached = sessionStorage.getItem('paros_kds_operator');
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

  async function handleVerifyPin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (enteredPin.length !== 4) {
      setPinError('Enter a 4-digit PIN');
      return;
    }
    setPinLoading(true);
    setPinError('');
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin, target: 'KDS' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid PIN');

      sessionStorage.setItem('paros_kds_operator', JSON.stringify(data.operator));
      setOperator(data.operator);
      setPinModalOpen(false);
      setEnteredPin('');
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : 'Invalid PIN');
    } finally {
      setPinLoading(false);
    }
  }

  function handleLockTerminal() {
    sessionStorage.removeItem('paros_kds_operator');
    setOperator(null);
    setEnteredPin('');
    setPinModalOpen(true);
  }

  // Tickets State
  const [tickets, setTickets] = useState<KdsTicket[]>([]);
  const [servedTickets, setServedTickets] = useState<KdsTicket[]>([]);
  const hasLoadedOnce = useRef(false);

  // Audio Chime Synthesizer
  function playKitchenChime() {
    if (!chimeEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // AudioContext unavailable
    }
  }

  // Ticking Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => ({
          ...t,
          elapsedSeconds: t.elapsedSeconds + 1,
          status:
            t.status === 'READY'
              ? 'READY'
              : t.elapsedSeconds + 1 > t.targetSeconds
              ? 'OVERDUE'
              : t.status === 'NEW' && t.elapsedSeconds < 60
              ? 'NEW'
              : 'PREPARING',
        }))
      );
    }, 1000);

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        recallLastTicket();
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Live polling from DB for real kitchen orders
  function loadKdsOrders() {
    fetch('/api/kds')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.cafe?.name) setCafeName(data.cafe.name);
        if (data?.orders?.length) {
          const mapped: KdsTicket[] = data.orders.map((o: {
            id: string;
            orderNumber: string;
            source: string;
            customerName?: string;
            createdAt: string;
            dynamicPrepMinutes: number;
            status: string;
            specialNotes?: string;
            table?: { tableNumber: string };
            items?: Array<{ id: string; name: string; quantity: number; notes?: string; status?: string }>;
          }) => {
            const elapsed = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 1000);
            const target = (o.dynamicPrepMinutes || 10) * 60;
            let s: 'PREPARING' | 'OVERDUE' | 'READY' | 'NEW' = 'PREPARING';
            if (o.status === 'READY') s = 'READY';
            else if (elapsed > target) s = 'OVERDUE';
            else if (elapsed < 60) s = 'NEW';

            return {
              id: o.id,
              orderNumber: o.orderNumber,
              tableLabel:
                o.table?.tableNumber && o.table.tableNumber.toLowerCase() !== 'takeaway'
                  ? `TABLE ${o.table.tableNumber}`
                  : `TOKEN ${o.orderNumber}`,
              source: String(o.source || 'QR').toUpperCase(),
              customerName: o.customerName || 'Guest',
              elapsedSeconds: Math.max(0, elapsed),
              targetSeconds: target,
              status: s,
              specialNote: o.specialNotes,
              items: (o.items || []).map((it) => ({
                id: it.id,
                name: `${it.quantity}x ${it.name}`,
                notes: it.notes || '',
                status: (it.status as 'PENDING' | 'READY') || 'PENDING',
                category:
                  it.name.toLowerCase().includes('coffee') ||
                  it.name.toLowerCase().includes('latte') ||
                  it.name.toLowerCase().includes('brew')
                    ? 'barista'
                    : 'kitchen',
              })),
            };
          });

          setTickets((prev) => {
            if (hasLoadedOnce.current && mapped.length > prev.length) {
              playKitchenChime();
            }
            hasLoadedOnce.current = true;
            return mapped;
          });
        } else {
          hasLoadedOnce.current = true;
          setTickets([]);
        }

        if (data?.servedOrders?.length) {
          const mappedServed: KdsTicket[] = data.servedOrders.map((o: {
            id: string;
            orderNumber: string;
            source?: string;
            customerName?: string;
            createdAt: string;
            updatedAt?: string;
            dynamicPrepMinutes?: number;
            specialNotes?: string;
            table?: { tableNumber: string };
            items?: Array<{ id: string; name: string; quantity: number; notes?: string }>;
          }) => {
            const elapsed = Math.floor((Date.now() - new Date(o.updatedAt || o.createdAt).getTime()) / 1000);
            return {
              id: o.id,
              orderNumber: o.orderNumber,
              tableLabel: o.table?.tableNumber ? `TABLE ${o.table.tableNumber}` : 'TAKEAWAY',
              source: String(o.source || 'QR').toUpperCase(),
              customerName: o.customerName || 'Guest',
              elapsedSeconds: Math.max(0, elapsed),
              targetSeconds: (o.dynamicPrepMinutes || 10) * 60,
              status: 'READY' as const,
              specialNote: o.specialNotes,
              items: (o.items || []).map((it) => ({
                id: it.id,
                name: `${it.quantity}x ${it.name}`,
                notes: it.notes || '',
                status: 'READY' as const,
                category:
                  it.name.toLowerCase().includes('coffee') ||
                  it.name.toLowerCase().includes('latte') ||
                  it.name.toLowerCase().includes('brew')
                    ? 'barista'
                    : 'kitchen',
              })),
            };
          });
          setServedTickets(mappedServed);
        } else {
          setServedTickets([]);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadKdsOrders();
    const interval = setInterval(loadKdsOrders, 3500);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Toggle item status (tap to strike/complete)
  function toggleItem(ticketId: string, itemId: string) {
    let becameAllDone = false;
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updatedItems = t.items.map((i) =>
            i.id === itemId
              ? { ...i, status: (i.status === 'READY' ? 'PENDING' : 'READY') as 'PENDING' | 'READY' }
              : i
          );
          const allDone = updatedItems.every((i) => i.status === 'READY');
          if (allDone && t.status !== 'READY') {
            becameAllDone = true;
          }
          return {
            ...t,
            items: updatedItems,
            status: allDone ? 'READY' : t.status,
          };
        }
        return t;
      })
    );

    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle-item', itemId }),
    }).catch(() => {});

    if (becameAllDone) {
      playKitchenChime();
      showToast(`🛎️ All items ready! Order runner notified on POS.`);
      fetch('/api/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-ready', orderId: ticketId }),
      }).catch(() => {});
    }
  }

  // Push Chef ETA (+3m / +5m / +10m)
  function pushEta(ticketId: string, minutes: number) {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const newTarget = t.targetSeconds + minutes * 60;
          return {
            ...t,
            targetSeconds: newTarget,
            status: t.elapsedSeconds > newTarget ? 'OVERDUE' : 'PREPARING',
          };
        }
        return t;
      })
    );
    playKitchenChime();
    showToast(`⏱️ Added +${minutes}m to ${ticketId}. Customer live timer synced!`);

    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adjust-eta', orderId: ticketId, minutes }),
    }).catch(() => {});
  }

  // Mark Ticket Ready
  function markReady(ticketId: string) {
    playKitchenChime();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: 'READY',
            items: t.items.map((i) => ({ ...i, status: 'READY' })),
          };
        }
        return t;
      })
    );
    showToast(`🛎️ Ticket marked Ready! Order runner notified on POS.`);

    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-ready', orderId: ticketId }),
    }).catch(() => {});
  }

  // Bump / Serve Ticket
  function bumpTicket(ticketId: string) {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    showToast(`✓ Ticket bumped & handed to runner.`);

    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bump-order', orderId: ticketId }),
    }).catch(() => {});
  }

  // Bump All Completed Items
  function bumpAllCompleted() {
    const readyTickets = tickets.filter((t) => t.status === 'READY');
    if (readyTickets.length === 0) {
      showToast('⚠️ No tickets are currently marked Ready to bump.');
      return;
    }
    setTickets((prev) => prev.filter((t) => t.status !== 'READY'));
    showToast(`✓ Bumped all ${readyTickets.length} ready tickets to runner.`);

    readyTickets.forEach((t) => {
      fetch('/api/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bump-order', orderId: t.id }),
      }).catch(() => {});
    });
  }

  // Recall Last Bumped
  function recallLastTicket() {
    handleRecallTicket();
  }

  // Recall Specific Bumped Ticket
  function handleRecallTicket(ticketId?: string) {
    showToast('↩️ Ticket recalled back to active kitchen queue!');
    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recall-order', orderId: ticketId }),
    })
      .then(() => loadKdsOrders())
      .catch(() => {});
  }

  // Format Timer mm:ss
  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Print ESC-POS 80mm KOT Slip
  function printTicketKot(ticket: KdsTicket) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const itemsHtml = ticket.items
      .map(
        (it) => `
      <div style="display:flex; justify-content:space-between; margin-bottom: 6px; font-size: 15px; font-weight: bold;">
        <span>${it.name}</span>
        <span>${it.status === 'READY' ? '✓ DONE' : 'COOK'}</span>
      </div>
      ${it.notes ? `<div style="font-size: 12px; color: #555; margin-top: -3px; margin-bottom: 6px; padding-left: 8px;">↳ ${it.notes}</div>` : ''}
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOT — ${ticket.tableLabel} #${ticket.orderNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 2px solid #000; margin: 8px 0; }
          .large { font-size: 20px; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="center">
          <div style="font-size: 12px; letter-spacing: 2px;">*** KITCHEN ORDER TICKET ***</div>
          <div class="large" style="margin: 4px 0;">${ticket.tableLabel}</div>
          <div style="font-size: 14px; font-weight: bold;">ORDER #${ticket.orderNumber} • ${ticket.source}</div>
          <div style="font-size: 11px;">${dateStr} ${timeStr}</div>
          ${ticket.customerName ? `<div style="font-size: 12px; margin-top: 2px;">Guest: ${ticket.customerName}</div>` : ''}
        </div>
        <div class="double-divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        ${ticket.specialNote ? `<div style="font-size: 12px; font-weight: bold; background: #eee; padding: 4px;">NOTE: ${ticket.specialNote}</div>` : ''}
        <div class="center" style="font-size: 11px; margin-top: 8px;">Paros Kitchen Display System</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    }
  }

  // Summary counts
  const readyCount = useMemo(() => tickets.filter((t) => t.status === 'READY').length, [tickets]);
  const overdueCount = useMemo(() => tickets.filter((t) => t.status === 'OVERDUE').length, [tickets]);
  const baristaCount = useMemo(
    () => tickets.filter((t) => t.items.some((i) => i.category === 'barista')).length,
    [tickets]
  );
  const kitchenCount = useMemo(
    () => tickets.filter((t) => t.items.some((i) => i.category === 'kitchen')).length,
    [tickets]
  );

  // Filtered tickets based on station filter & search query
  const filteredTickets = useMemo(() => {
    let list: KdsTicket[] = [];
    if (stationFilter === 'served') {
      list = servedTickets;
    } else if (stationFilter === 'ready') {
      list = tickets.filter((t) => t.status === 'READY');
    } else {
      list = tickets.filter((t) => {
        if (stationFilter === 'all') return true;
        return t.items.some((i) => i.category === stationFilter);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.orderNumber.toLowerCase().includes(q) ||
          t.tableLabel.toLowerCase().includes(q) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          t.items.some((it) => it.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [stationFilter, tickets, servedTickets, searchQuery]);

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex flex-col select-none antialiased">
      {/* ── Sticky KDS Header Bar ── */}
      <header className="sticky top-0 left-0 right-0 bg-white z-40 border-b-2 border-espresso shadow-brutal-sm">
        {/* Top Operational Bar */}
        <div className="flex items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3 gap-2">
          {/* Brand & Cafe Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/pos" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border-2 border-espresso shadow-brutal-sm">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">skillet</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="font-display text-sm sm:text-lg font-black text-espresso tracking-tight truncate max-w-[110px] sm:max-w-[200px]">
                    {cafeName}
                  </span>
                  <span className="font-display text-[9px] sm:text-[10px] font-black uppercase bg-paros-yellow px-1 sm:px-1.5 py-0.2 rounded border border-espresso shrink-0">
                    KDS
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-display font-bold text-paros-matcha">
                  <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-paros-matcha animate-pulse shrink-0" />
                  <span className="truncate">
                    {tickets.length} Active {overdueCount > 0 ? `(${overdueCount} Late)` : ''}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Station Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-paros-cream rounded-xl border-2 border-espresso shadow-brutal-sm">
            <button
              onClick={() => setStationFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all ${
                stationFilter === 'all'
                  ? 'bg-espresso text-white shadow-brutal-sm'
                  : 'text-espresso hover:bg-paros-yellow/40'
              }`}
            >
              All ({tickets.length})
            </button>
            <button
              onClick={() => setStationFilter('barista')}
              className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1 ${
                stationFilter === 'barista'
                  ? 'bg-espresso text-white shadow-brutal-sm'
                  : 'text-espresso hover:bg-paros-yellow/40'
              }`}
            >
              <span>☕ Barista ({baristaCount})</span>
            </button>
            <button
              onClick={() => setStationFilter('kitchen')}
              className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1 ${
                stationFilter === 'kitchen'
                  ? 'bg-espresso text-white shadow-brutal-sm'
                  : 'text-espresso hover:bg-paros-yellow/40'
              }`}
            >
              <span>🍳 Kitchen ({kitchenCount})</span>
            </button>
            <button
              onClick={() => setStationFilter('ready')}
              className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1 ${
                stationFilter === 'ready'
                  ? 'bg-paros-matcha text-white shadow-brutal-sm'
                  : 'text-espresso hover:bg-paros-yellow/40'
              }`}
            >
              <span>🛎️ Ready Pass ({readyCount})</span>
            </button>
            <button
              onClick={() => setStationFilter('served')}
              className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                stationFilter === 'served'
                  ? 'bg-espresso text-white shadow-brutal-sm'
                  : 'text-espresso hover:bg-paros-yellow/40'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
              <span>Delivered ({servedTickets.length})</span>
            </button>
          </nav>

          {/* Top Control Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Quick Search on Desktop */}
            <div className="hidden sm:flex items-center relative">
              <input
                type="text"
                placeholder="Search token / table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 lg:w-44 px-2.5 py-1 sm:py-1.5 pr-6 bg-paros-cream border border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 text-xs text-espresso/60 hover:text-espresso"
                >
                  ✕
                </button>
              ) : (
                <span className="material-symbols-outlined absolute right-1.5 text-espresso/40 text-[16px]">
                  search
                </span>
              )}
            </div>

            {/* Chime Mute Toggle */}
            <button
              onClick={() => {
                setChimeEnabled(!chimeEnabled);
                showToast(chimeEnabled ? '🔇 Kitchen order chime muted' : '🔔 Kitchen order chime active');
              }}
              className={`p-1.5 sm:p-2 rounded-xl border border-espresso transition-all shadow-brutal-sm ${
                chimeEnabled ? 'bg-paros-mint text-emerald-950' : 'bg-red-100 text-red-700'
              }`}
              title={chimeEnabled ? 'Kitchen chime active (tap to mute)' : 'Chime muted (tap to enable)'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {chimeEnabled ? 'notifications_active' : 'notifications_off'}
              </span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-paros-cream text-espresso border border-espresso transition-all shadow-brutal-sm"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen mode'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            {/* Recall Last Bumped (Desktop) */}
            <button
              onClick={recallLastTicket}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-paros-cream hover:bg-paros-yellow text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
              title="Recall last bumped ticket"
            >
              <span className="material-symbols-outlined text-[16px]">undo</span>
              <span>Recall</span>
            </button>

            {/* Bump All Ready (Desktop) */}
            <button
              onClick={bumpAllCompleted}
              disabled={readyCount === 0}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-paros-cream text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Bump Ready ({readyCount})</span>
            </button>

            {/* Chef Operator Lock/Unlock Badge */}
            {operator ? (
              <button
                onClick={handleLockTerminal}
                title="Tap to lock KDS or switch chef"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-paros-mint hover:bg-paros-yellow rounded-xl border border-espresso font-display text-[11px] sm:text-xs font-black text-espresso transition-colors shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-paros-matcha">skillet</span>
                <span className="max-w-[50px] sm:max-w-none truncate">{operator.name.split(' ')[0]}</span>
                <span className="material-symbols-outlined text-[12px] text-espresso/60">lock</span>
              </button>
            ) : (
              <button
                onClick={() => setPinModalOpen(true)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-paros-yellow rounded-xl border border-espresso font-display text-[11px] sm:text-xs font-black text-espresso animate-pulse shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>PIN</span>
              </button>
            )}

            {/* Return to POS */}
            <Link
              href="/pos"
              className="brutal-btn px-2 sm:px-3 py-1.5 sm:py-2 bg-espresso text-white font-display text-[11px] sm:text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm flex items-center gap-1 shrink-0"
              title="Switch to Counter POS"
            >
              <span className="material-symbols-outlined text-[15px] sm:text-[16px]">point_of_sale</span>
              <span className="hidden md:inline">POS</span>
            </Link>
          </div>
        </div>

        {/* ── Mobile Station Navigation Tab Bar (Swipable with Counters) ── */}
        <div className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-paros-cream border-t border-espresso/20 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStationFilter('all')}
            className={`px-2.5 py-1.5 rounded-xl font-display text-[11px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
              stationFilter === 'all'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'bg-white text-espresso border border-espresso'
            }`}
          >
            <span>🔥 All</span>
            <span className="px-1 py-0.2 rounded-full font-mono text-[9px] bg-white/20">
              {tickets.length}
            </span>
          </button>

          <button
            onClick={() => setStationFilter('barista')}
            className={`px-2.5 py-1.5 rounded-xl font-display text-[11px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
              stationFilter === 'barista'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'bg-white text-espresso border border-espresso'
            }`}
          >
            <span>☕ Barista</span>
            {baristaCount > 0 && (
              <span className="px-1 py-0.2 rounded-full font-mono text-[9px] bg-white/20">
                {baristaCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStationFilter('kitchen')}
            className={`px-2.5 py-1.5 rounded-xl font-display text-[11px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
              stationFilter === 'kitchen'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'bg-white text-espresso border border-espresso'
            }`}
          >
            <span>🍳 Kitchen</span>
            {kitchenCount > 0 && (
              <span className="px-1 py-0.2 rounded-full font-mono text-[9px] bg-white/20">
                {kitchenCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStationFilter('ready')}
            className={`px-2.5 py-1.5 rounded-xl font-display text-[11px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
              stationFilter === 'ready'
                ? 'bg-paros-matcha text-white shadow-brutal-sm ring-1 ring-emerald-600'
                : readyCount > 0
                ? 'bg-paros-mint text-emerald-950 border border-emerald-600 animate-pulse'
                : 'bg-white text-espresso border border-espresso'
            }`}
          >
            <span>🛎️ Ready</span>
            <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] font-black bg-white/30">
              {readyCount}
            </span>
          </button>

          <button
            onClick={() => setStationFilter('served')}
            className={`px-2.5 py-1.5 rounded-xl font-display text-[11px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
              stationFilter === 'served'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'bg-white text-espresso border border-espresso'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">task_alt</span>
            <span>Delivered ({servedTickets.length})</span>
          </button>

          {/* Quick Mobile Search Input */}
          <div className="flex items-center relative shrink-0 ml-auto">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-24 px-2 py-1 pr-5 bg-white border border-espresso rounded-lg font-display text-[10px] font-bold text-espresso outline-none"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1 text-[10px] text-espresso/60"
              >
                ✕
              </button>
            ) : (
              <span className="material-symbols-outlined absolute right-1 text-espresso/40 text-[13px]">
                search
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Main KDS Kanban Board ── */}
      <main className="p-2.5 sm:p-4 lg:p-6 pb-28 md:pb-8 flex-1 flex flex-col">
        {filteredTickets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white rounded-3xl border-3 border-espresso shadow-brutal-lg max-w-xl mx-auto my-6 sm:my-8 w-full">
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-paros-mint flex items-center justify-center border-2 border-espresso shadow-brutal-sm mb-3 sm:mb-4">
              <span className="material-symbols-outlined text-emerald-800 text-[28px] sm:text-[32px]">
                {stationFilter === 'served' ? 'task_alt' : stationFilter === 'ready' ? 'check_circle' : 'done_all'}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-espresso">
              {stationFilter === 'served'
                ? 'No Delivered Tickets Yet'
                : stationFilter === 'ready'
                ? 'No Tickets Waiting at Pass'
                : 'Kitchen Pass is Clear!'}
            </h2>
            <p className="font-body text-xs sm:text-sm text-espresso/70 mt-1 max-w-md">
              {stationFilter === 'served'
                ? 'Orders bumped and handed over to the runner appear here. You can recall them anytime.'
                : stationFilter === 'ready'
                ? 'Orders with all items struck ready will appear here waiting for runner pickup.'
                : 'All orders have been prepared and served. New customer QR orders and POS tickets will automatically appear here with a chime.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-start">
            {filteredTickets.map((t) => {
              const isOverdue = t.status === 'OVERDUE';
              const isReady = t.status === 'READY';
              const isNew = t.status === 'NEW';
              const readyItemsCount = t.items.filter((i) => i.status === 'READY').length;
              const totalItemsCount = t.items.length;

              return (
                <div
                  key={t.id}
                  className={`rounded-2xl sm:rounded-3xl border-2 sm:border-3 border-espresso flex flex-col justify-between transition-all ${
                    t.source === 'SWIGGY'
                      ? 'border-t-6 sm:border-t-8 border-t-orange-500'
                      : t.source === 'ZOMATO'
                      ? 'border-t-6 sm:border-t-8 border-t-red-600'
                      : t.source === 'TAKEAWAY' || t.tableLabel.toLowerCase().includes('token') || t.tableLabel.toLowerCase().includes('takeaway')
                      ? 'border-t-6 sm:border-t-8 border-t-amber-500'
                      : 'border-t-6 sm:border-t-8 border-t-emerald-600'
                  } ${
                    isOverdue
                      ? 'bg-red-50/90 border-red-600 shadow-brutal-sm ring-2 ring-red-400'
                      : isReady
                      ? 'bg-paros-mint/90 border-emerald-600 shadow-brutal ring-2 ring-emerald-400'
                      : isNew
                      ? 'bg-paros-yellow/85 border-espresso shadow-brutal ring-2 ring-amber-400'
                      : 'bg-white border-espresso shadow-brutal'
                  }`}
                >
                  {/* Ticket Header */}
                  <div className="p-3 sm:p-4 border-b-2 border-espresso flex flex-col gap-1.5">
                    {/* Row 1: Table & Order Number & Print KOT */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-display text-base sm:text-lg font-black text-espresso tracking-tight truncate">
                          {t.tableLabel}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-white font-mono text-xs font-black border border-espresso shadow-xs shrink-0">
                          {t.orderNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* 1-Tap KOT Thermal Print Slip */}
                        <button
                          onClick={() => printTicketKot(t)}
                          className="p-1 rounded-lg bg-paros-cream hover:bg-paros-yellow text-espresso border border-espresso transition-colors shadow-xs"
                          title="Print 80mm ESC-POS Kitchen KOT Slip"
                        >
                          <span className="material-symbols-outlined text-[15px]">print</span>
                        </button>

                        {/* Timer Badge */}
                        <div
                          className={`px-2.5 py-1 rounded-xl border border-espresso font-mono font-black text-[11px] sm:text-xs tabular-nums flex items-center gap-1 shadow-xs ${
                            stationFilter === 'served'
                              ? 'bg-paros-mint text-emerald-950 border-emerald-600'
                              : isOverdue
                              ? 'bg-red-500 text-white animate-pulse'
                              : isReady
                              ? 'bg-emerald-600 text-white'
                              : isNew
                              ? 'bg-amber-400 text-espresso'
                              : 'bg-paros-cream text-espresso'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {stationFilter === 'served' ? 'task_alt' : isOverdue ? 'warning' : 'timer'}
                          </span>
                          <span>
                            {stationFilter === 'served'
                              ? `${Math.floor(t.elapsedSeconds / 60)}m ago`
                              : isOverdue
                              ? `+${Math.floor((t.elapsedSeconds - t.targetSeconds) / 60)}m LATE`
                              : formatTime(t.elapsedSeconds)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Customer Name, Channel Badge & Progress */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-body text-xs text-espresso/80 font-semibold truncate max-w-[120px]">
                          {t.customerName}
                        </span>
                        {/* Source Tag */}
                        {t.source === 'SWIGGY' ? (
                          <span className="px-1.5 py-0.2 rounded-md bg-orange-500 text-white font-display text-[9px] font-black uppercase shadow-xs">
                            SWIGGY
                          </span>
                        ) : t.source === 'ZOMATO' ? (
                          <span className="px-1.5 py-0.2 rounded-md bg-red-600 text-white font-display text-[9px] font-black uppercase shadow-xs">
                            ZOMATO
                          </span>
                        ) : t.source === 'TAKEAWAY' || t.tableLabel.toLowerCase().includes('token') || t.tableLabel.toLowerCase().includes('takeaway') ? (
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-espresso font-display text-[9px] font-black uppercase shadow-xs">
                            PARCEL
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-950 font-display text-[9px] font-black uppercase border border-emerald-400 shadow-xs">
                            DINE-IN
                          </span>
                        )}
                      </div>

                      {/* Items Done Progress Pill */}
                      <span
                        className={`font-display text-[10px] font-black px-1.5 py-0.5 rounded-lg border border-espresso ${
                          readyItemsCount === totalItemsCount
                            ? 'bg-paros-matcha text-white'
                            : readyItemsCount > 0
                            ? 'bg-paros-yellow text-espresso'
                            : 'bg-paros-cream text-espresso/70'
                        }`}
                      >
                        {readyItemsCount}/{totalItemsCount} Done
                      </span>
                    </div>
                  </div>

                  {/* Special Note / Payment Badge */}
                  {t.specialNote && (
                    <div
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 border-b-2 border-dashed border-espresso/20 flex items-center justify-between font-display text-[11px] sm:text-xs font-black ${
                        t.specialNote.includes('PAY LATER')
                          ? 'bg-amber-100 text-amber-950'
                          : t.specialNote.includes('PREPAID') || t.specialNote.includes('UPI')
                          ? 'bg-emerald-100 text-emerald-950'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="material-symbols-outlined text-[15px] shrink-0">
                          {t.specialNote.includes('PAY LATER')
                            ? 'payments'
                            : t.specialNote.includes('PREPAID') || t.specialNote.includes('UPI')
                            ? 'verified'
                            : 'campaign'}
                        </span>
                        <span className="truncate">{t.specialNote}</span>
                      </div>
                      <span
                        className={`text-[8.5px] uppercase px-1.5 py-0.2 rounded border border-espresso font-black shrink-0 ${
                          t.specialNote.includes('PAY LATER')
                            ? 'bg-amber-300 text-amber-950'
                            : 'bg-emerald-300 text-emerald-950'
                        }`}
                      >
                        {t.specialNote.includes('PAY LATER') ? 'DUE AT COUNTER' : 'PAID ONLINE'}
                      </span>
                    </div>
                  )}

                  {/* Items Checklist (Tap to Strike/Complete) */}
                  <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                    {t.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(t.id, item.id)}
                        className={`p-2.5 sm:p-3 rounded-xl border-2 border-espresso cursor-pointer active:scale-98 transition-all flex items-start justify-between gap-2 ${
                          item.status === 'READY'
                            ? 'bg-emerald-50/70 border-emerald-600 opacity-70 line-through'
                            : 'bg-paros-cream hover:bg-white shadow-brutal-sm'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-display text-xs sm:text-sm font-bold text-espresso leading-snug">
                            {item.name}
                          </p>
                          {item.notes && (
                            <p className="font-body text-[11px] text-espresso/70 mt-0.5 font-medium">
                              ↳ {item.notes}
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg border-2 border-espresso flex items-center justify-center shrink-0 transition-colors ${
                            item.status === 'READY' ? 'bg-paros-matcha text-white' : 'bg-white'
                          }`}
                        >
                          {item.status === 'READY' && (
                            <span className="material-symbols-outlined text-[16px] font-black">
                              check
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chef ETA Modifiers (+3m / +5m / +10m) - Active tickets only */}
                  {stationFilter !== 'served' && (
                    <div className="px-3 sm:px-4 py-1.5 bg-paros-cream/60 border-t-2 border-dashed border-espresso/20 flex items-center justify-between text-xs font-display">
                      <span className="font-bold text-espresso/60 uppercase text-[10px]">
                        Delay ETA:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => pushEta(t.id, 3)}
                          className="px-2 py-1 bg-white hover:bg-paros-yellow border border-espresso rounded-lg font-mono font-bold text-[11px] shadow-xs active:scale-95"
                          title="Add 3 minutes"
                        >
                          +3m
                        </button>
                        <button
                          onClick={() => pushEta(t.id, 5)}
                          className="px-2 py-1 bg-white hover:bg-paros-yellow border border-espresso rounded-lg font-mono font-bold text-[11px] shadow-xs active:scale-95"
                          title="Add 5 minutes"
                        >
                          +5m
                        </button>
                        <button
                          onClick={() => pushEta(t.id, 10)}
                          className="px-2 py-1 bg-white hover:bg-paros-yellow border border-espresso rounded-lg font-mono font-bold text-[11px] shadow-xs active:scale-95"
                          title="Add 10 minutes"
                        >
                          +10m
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Primary Ticket Action Footer */}
                  <div className="p-3 pt-1.5 sm:p-4 sm:pt-2 flex items-center gap-2">
                    {stationFilter === 'served' ? (
                      <button
                        onClick={() => handleRecallTicket(t.id)}
                        className="brutal-btn w-full py-2.5 sm:py-3.5 bg-white hover:bg-paros-yellow text-espresso font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <span className="material-symbols-outlined text-[17px]">undo</span>
                        <span>↩️ Recall to Pass</span>
                      </button>
                    ) : isReady ? (
                      <button
                        onClick={() => bumpTicket(t.id)}
                        className="brutal-btn w-full py-2.5 sm:py-3.5 bg-espresso text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <span className="material-symbols-outlined text-[17px]">check_circle</span>
                        <span>BUMP & DELIVER ➔</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => markReady(t.id)}
                        className="brutal-btn w-full py-2.5 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <span className="material-symbols-outlined text-[17px]">notifications_active</span>
                        <span>MARK ALL READY 🛎️</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Kitchen KDS PIN Unlock Modal ── */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-espresso/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl w-full max-w-sm p-5 sm:p-6 flex flex-col items-center max-h-[92vh] overflow-y-auto pb-safe">
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-paros-mint border-2 border-espresso shadow-brutal-sm flex items-center justify-center mb-2.5">
              <span className="material-symbols-outlined text-emerald-900 text-2xl sm:text-3xl">skillet</span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-black text-espresso text-center">
              Kitchen Display Access
            </h2>
            <p className="font-body text-xs text-espresso/70 text-center mt-0.5 mb-3">
              Enter 4-digit Kitchen PIN to access the Chef KDS station.
            </p>

            {/* PIN Display Dots */}
            <div className="flex items-center justify-center gap-2.5 my-1.5">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border-2 border-espresso transition-all ${
                    enteredPin.length > idx ? 'bg-paros-matcha scale-110' : 'bg-paros-cream'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="font-display text-xs font-bold text-red-600 bg-red-100 border border-red-300 px-3 py-1 rounded-lg my-1.5 text-center">
                {pinError}
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full mt-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    if (enteredPin.length < 4) {
                      const next = enteredPin + digit;
                      setEnteredPin(next);
                      setPinError('');
                    }
                  }}
                  className="py-3 sm:py-3.5 rounded-xl bg-paros-cream hover:bg-paros-yellow active:bg-paros-matcha active:text-white border-2 border-espresso font-mono text-lg sm:text-xl font-black text-espresso transition-all shadow-brutal-sm flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEnteredPin('')}
                className="py-3 sm:py-3.5 rounded-xl bg-red-100 hover:bg-red-200 border-2 border-espresso font-display text-xs font-black text-red-700 uppercase shadow-brutal-sm"
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
                  }
                }}
                className="py-3 sm:py-3.5 rounded-xl bg-paros-cream hover:bg-paros-yellow border-2 border-espresso font-mono text-lg sm:text-xl font-black text-espresso shadow-brutal-sm flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setEnteredPin((prev) => prev.slice(0, -1))}
                className="py-3 sm:py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 border-2 border-espresso font-mono text-sm font-black text-espresso shadow-brutal-sm flex items-center justify-center"
              >
                ⌫
              </button>
            </div>

            {/* Submit / Unlock Button */}
            <button
              type="button"
              disabled={enteredPin.length !== 4 || pinLoading}
              onClick={() => handleVerifyPin()}
              className="brutal-btn w-full mt-3 py-3 sm:py-3.5 bg-espresso text-white font-display font-black text-xs sm:text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal disabled:opacity-40"
            >
              {pinLoading ? 'Verifying PIN...' : 'Unlock KDS Screen ➔'}
            </button>

            <p className="font-body text-[10px] text-espresso/50 mt-2 text-center">
              💡 Default Kitchen PIN: <span className="font-mono font-bold text-espresso">7788</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Mobile Kitchen Operations Bottom Dock (Dedicated for Cook / Barista) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t-2 border-espresso shadow-brutal-lg p-2 pb-safe flex items-center justify-between gap-1.5">
        {/* Bump All Ready */}
        <button
          onClick={bumpAllCompleted}
          disabled={readyCount === 0}
          className={`flex-1 py-2 px-2 rounded-xl font-display text-[10px] font-black uppercase flex items-center justify-center gap-1 border-2 border-espresso transition-all shadow-brutal-sm ${
            readyCount > 0
              ? 'bg-paros-matcha text-white'
              : 'bg-gray-100 text-espresso/40 border-gray-300'
          }`}
          title="Bump all ready tickets to runner"
        >
          <span className="material-symbols-outlined text-[15px]">done_all</span>
          <span>Bump Ready ({readyCount})</span>
        </button>

        {/* Recall Last */}
        <button
          onClick={recallLastTicket}
          className="py-2 px-2.5 rounded-xl bg-paros-cream hover:bg-paros-yellow text-espresso font-display text-[10px] font-black uppercase border-2 border-espresso shadow-brutal-sm flex items-center gap-1"
          title="Recall last bumped ticket back to active"
        >
          <span className="material-symbols-outlined text-[15px]">undo</span>
          <span>Recall</span>
        </button>

        {/* Mute/Unmute Chime */}
        <button
          onClick={() => setChimeEnabled(!chimeEnabled)}
          className={`p-2 rounded-xl border-2 border-espresso shadow-brutal-sm transition-colors ${
            chimeEnabled ? 'bg-paros-mint text-emerald-950' : 'bg-red-100 text-red-700'
          }`}
          title={chimeEnabled ? 'Mute Chime' : 'Enable Chime'}
        >
          <span className="material-symbols-outlined text-[16px]">
            {chimeEnabled ? 'notifications_active' : 'notifications_off'}
          </span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-white text-espresso border-2 border-espresso shadow-brutal-sm"
          title="Fullscreen Mode"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>

        {/* POS Link */}
        <Link
          href="/pos"
          className="py-2 px-2.5 rounded-xl bg-espresso text-white font-display text-[10px] font-black uppercase border-2 border-espresso shadow-brutal-sm flex items-center gap-1"
          title="Switch to Counter POS"
        >
          <span className="material-symbols-outlined text-[15px]">point_of_sale</span>
          <span>POS</span>
        </Link>
      </nav>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 bg-espresso text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border-2 border-white shadow-brutal-lg flex items-center gap-2 font-display text-xs sm:text-sm font-bold animate-bounce">
          <span className="material-symbols-outlined text-paros-matcha">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
