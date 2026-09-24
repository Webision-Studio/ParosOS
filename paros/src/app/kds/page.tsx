'use client';

import { useState, useEffect } from 'react';
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
  source: 'POS' | 'QR' | 'TAKEAWAY';
  customerName?: string;
  elapsedSeconds: number;
  targetSeconds: number;
  status: 'PREPARING' | 'OVERDUE' | 'READY' | 'NEW';
  specialNote?: string;
  items: KdsItem[];
}

export default function KdsStudioPage() {
  const [stationFilter, setStationFilter] = useState<'all' | 'kitchen' | 'barista'>('all');
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cafeName, setCafeName] = useState<string>('Kitchen KDS');

  // Tickets State
  const [tickets, setTickets] = useState<KdsTicket[]>([
    {
      id: 'ticket-1',
      orderNumber: '#1042',
      tableLabel: 'TABLE 4',
      source: 'QR',
      customerName: 'Aarav Sharma',
      elapsedSeconds: 405,
      targetSeconds: 480, // 8 mins
      status: 'PREPARING',
      specialNote: 'Extra crispy toast, no chili flakes',
      items: [
        {
          id: 'i1',
          name: '1x Double Flat White (Oat Milk)',
          notes: 'Signature House Blend • Double Ristretto',
          status: 'READY',
          category: 'barista',
        },
        {
          id: 'i2',
          name: '1x Avocado Sourdough Toast',
          notes: 'Special Note: Extra crispy, no chili flakes',
          status: 'PENDING',
          category: 'kitchen',
        },
        {
          id: 'i3',
          name: '1x Cold Brew Tonic',
          notes: 'Citrus slice, dehydrated orange wheel',
          status: 'PENDING',
          category: 'barista',
        },
      ],
    },
    {
      id: 'ticket-2',
      orderNumber: '#1040',
      tableLabel: 'TAKEAWAY #108',
      source: 'TAKEAWAY',
      customerName: 'Priya M.',
      elapsedSeconds: 615,
      targetSeconds: 480, // 8 mins -> Overdue!
      status: 'OVERDUE',
      items: [
        {
          id: 'i4',
          name: '2x Iced Vanilla Bean Latte',
          notes: 'Large, Minor Figures Oatly',
          status: 'PENDING',
          category: 'barista',
        },
        {
          id: 'i5',
          name: '1x Butter Croissant',
          notes: 'Warmed 30s in salamander',
          status: 'READY',
          category: 'kitchen',
        },
      ],
    },
    {
      id: 'ticket-3',
      orderNumber: '#1039',
      tableLabel: 'TABLE 2',
      source: 'POS',
      customerName: 'Vikram Seth',
      elapsedSeconds: 510,
      targetSeconds: 600,
      status: 'READY',
      items: [
        {
          id: 'i6',
          name: '1x Pour Over (Ratnagiri V60)',
          notes: 'Medium Grind, washed',
          status: 'READY',
          category: 'barista',
        },
        {
          id: 'i7',
          name: '1x Almond Frangipane Tart',
          notes: 'Room temperature display',
          status: 'READY',
          category: 'kitchen',
        },
      ],
    },
    {
      id: 'ticket-4',
      orderNumber: '#1043',
      tableLabel: 'TABLE 6',
      source: 'QR',
      customerName: 'Sneha Patel',
      elapsedSeconds: 42,
      targetSeconds: 600,
      status: 'NEW',
      items: [
        {
          id: 'i8',
          name: '2x Cold Brew Reserve',
          notes: '18-hr slow cold steep on tap',
          status: 'PENDING',
          category: 'barista',
        },
        {
          id: 'i9',
          name: '1x Wild Herb Sourdough Toast',
          notes: 'Extra salted herb butter',
          status: 'PENDING',
          category: 'kitchen',
        },
      ],
    },
  ]);

  // Audio Chime Synthesizer
  function playKitchenChime() {
    if (!chimeEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
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
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Live polling from DB for real kitchen orders
  useEffect(() => {
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
                tableLabel: o.table?.tableNumber ? `TABLE ${o.table.tableNumber}` : 'TAKEAWAY',
                source: (o.source as 'POS' | 'QR' | 'TAKEAWAY') || 'QR',
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
              if (mapped.length > prev.length) {
                playKitchenChime();
              }
              return mapped;
            });
          }
        })
        .catch(() => {});
    }

    loadKdsOrders();
    const interval = setInterval(loadKdsOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Toggle item status (tap to strike/complete)
  function toggleItem(ticketId: string, itemId: string) {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updatedItems = t.items.map((i) =>
            i.id === itemId
              ? { ...i, status: (i.status === 'READY' ? 'PENDING' : 'READY') as 'PENDING' | 'READY' }
              : i
          );
          const allDone = updatedItems.every((i) => i.status === 'READY');
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
  }

  // Push Chef ETA (+5m / +10m)
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
    showToast(`⏱️ Chef added +${minutes}m to ${ticketId}. Customer phone live timer synced!`);

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
    showToast(`🛎️ Ticket ${ticketId} marked Ready! Order runner notified on POS.`);

    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-ready', orderId: ticketId }),
    }).catch(() => {});
  }

  // Bump / Serve Ticket
  function bumpTicket(ticketId: string) {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    showToast(`✓ Ticket bumped & archived. Press [Space] to recall.`);

    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bump-order', orderId: ticketId }),
    }).catch(() => {});
  }

  // Bump All Completed Items
  function bumpAllCompleted() {
    setTickets((prev) => prev.filter((t) => t.status !== 'READY'));
    showToast(`✓ Bumped all completed ready tickets.`);
  }

  // Recall Last Bumped
  function recallLastTicket() {
    showToast('⏪ Last served ticket recalled back to active queue.');
    fetch('/api/kds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recall-last' }),
    }).catch(() => {});
  }

  // Format Timer mm:ss
  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (stationFilter === 'all') return true;
    return t.items.some((i) => i.category === stationFilter);
  });

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex flex-col select-none antialiased">
      {/* ── Fixed KDS Header Bar ── */}
      <header className="fixed top-0 left-0 right-0 h-18 bg-white z-50 flex items-center justify-between px-4 sm:px-6 border-b-2 border-espresso shadow-brutal-sm">
        <div className="flex items-center gap-4">
          <Link href="/pos" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-paros-orange text-white flex items-center justify-center font-display font-black text-sm border-2 border-espresso shadow-brutal-sm">
              <span className="material-symbols-outlined text-[20px]">skillet</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-lg font-black text-espresso tracking-tight">{cafeName}</span>
                <span className="font-display text-[10px] font-black uppercase bg-paros-yellow px-1.5 py-0.5 rounded border border-espresso">
                  KDS STUDIO
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-display font-bold text-paros-matcha">
                <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
                <span>Online • {tickets.length} Active Tickets</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Station Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-paros-cream rounded-xl border-2 border-espresso shadow-brutal-sm">
          <button
            onClick={() => setStationFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all ${
              stationFilter === 'all'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'text-espresso hover:bg-paros-yellow/40'
            }`}
          >
            All Stations ({tickets.length})
          </button>
          <button
            onClick={() => setStationFilter('barista')}
            className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1 ${
              stationFilter === 'barista'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'text-espresso hover:bg-paros-yellow/40'
            }`}
          >
            <span>☕ Barista / Brews</span>
          </button>
          <button
            onClick={() => setStationFilter('kitchen')}
            className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all flex items-center gap-1 ${
              stationFilter === 'kitchen'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'text-espresso hover:bg-paros-yellow/40'
            }`}
          >
            <span>🍳 Kitchen & Hearth</span>
          </button>
        </nav>

        {/* Top Control Actions */}
        <div className="flex items-center gap-2">
          {/* Chime Mute Toggle */}
          <button
            onClick={() => setChimeEnabled(!chimeEnabled)}
            className={`p-2 rounded-xl border border-espresso transition-all shadow-brutal-sm ${
              chimeEnabled ? 'bg-paros-mint text-emerald-800' : 'bg-red-100 text-red-700'
            }`}
            title={chimeEnabled ? 'Kitchen chime active' : 'Chime muted'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {chimeEnabled ? 'notifications_active' : 'notifications_off'}
            </span>
          </button>

          {/* Recall Last Bumped */}
          <button
            onClick={recallLastTicket}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-2 bg-paros-cream hover:bg-paros-yellow text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
          >
            <span className="material-symbols-outlined text-[16px]">undo</span>
            <span>Recall</span>
          </button>

          {/* Bump All Completed */}
          <button
            onClick={bumpAllCompleted}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-paros-cream text-espresso font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            <span>Bump Ready</span>
          </button>

          {/* Return to POS */}
          <Link
            href="/pos"
            className="brutal-btn px-3 py-2 bg-espresso text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            <span className="hidden md:inline">Open POS</span>
          </Link>
        </div>
      </header>

      {/* ── Main KDS Kanban Board ── */}
      <main className="pt-22 pb-6 px-4 sm:px-6 flex-1 flex flex-col">
        {filteredTickets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border-3 border-espresso shadow-brutal-lg max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-paros-mint flex items-center justify-center border-2 border-espresso shadow-brutal-sm mb-4">
              <span className="material-symbols-outlined text-emerald-800 text-[32px]">check_circle</span>
            </div>
            <h2 className="font-display text-2xl font-black text-espresso">Kitchen Pass is Clear!</h2>
            <p className="font-body text-sm text-espresso/70 mt-1 max-w-md">
              All tickets have been fulfilled and served. New customer QR orders and POS tickets will automatically appear here with a live chime.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {filteredTickets.map((t) => {
              const isOverdue = t.status === 'OVERDUE';
              const isReady = t.status === 'READY';
              const isNew = t.status === 'NEW';

              return (
                <div
                  key={t.id}
                  className={`rounded-3xl border-3 border-espresso flex flex-col justify-between transition-all ${
                    isOverdue
                      ? 'bg-red-50 border-red-600 shadow-brutal-lg ring-2 ring-red-400'
                      : isReady
                      ? 'bg-paros-mint border-emerald-600 shadow-brutal ring-2 ring-emerald-400'
                      : isNew
                      ? 'bg-paros-yellow shadow-brutal-lg ring-2 ring-amber-400'
                      : 'bg-white shadow-brutal'
                  }`}
                >
                  {/* Ticket Header */}
                  <div className="p-4 border-b-2 border-espresso flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-black text-espresso tracking-tight">
                          {t.tableLabel}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white font-mono text-xs font-black border border-espresso shadow-sm">
                          {t.orderNumber}
                        </span>
                      </div>
                      <p className="font-body text-xs text-espresso/80 font-semibold mt-0.5">
                        {t.customerName} •{' '}
                        <span className="font-mono text-[10px] uppercase font-bold text-espresso/60">
                          {t.source}
                        </span>
                      </p>
                    </div>

                    {/* Timer Badge */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border-2 border-espresso font-mono font-black text-sm tabular-nums flex items-center gap-1 shadow-brutal-sm ${
                        isOverdue
                          ? 'bg-red-500 text-white animate-pulse'
                          : isReady
                          ? 'bg-emerald-600 text-white'
                          : isNew
                          ? 'bg-amber-400 text-espresso'
                          : 'bg-paros-cream text-espresso'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      <span>{formatTime(t.elapsedSeconds)}</span>
                    </div>
                  </div>

                  {/* Special Note */}
                  {t.specialNote && (
                    <div className="bg-amber-100 px-4 py-2 border-b-2 border-dashed border-espresso/20 flex items-center gap-1.5 font-body text-xs font-bold text-amber-900">
                      <span className="material-symbols-outlined text-[16px]">campaign</span>
                      <span>{t.specialNote}</span>
                    </div>
                  )}

                  {/* Items Checklist */}
                  <div className="p-4 flex flex-col gap-2.5 flex-1">
                    {t.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(t.id, item.id)}
                        className={`p-3 rounded-2xl border-2 border-espresso cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          item.status === 'READY'
                            ? 'bg-white/60 opacity-60 line-through'
                            : 'bg-paros-cream hover:bg-white shadow-brutal-sm'
                        }`}
                      >
                        <div>
                          <p className="font-display text-sm font-bold text-espresso">
                            {item.name}
                          </p>
                          {item.notes && (
                            <p className="font-body text-xs text-espresso/60 mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg border-2 border-espresso flex items-center justify-center shrink-0 ${
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

                  {/* Chef Modifier Dock (+5m / +10m) */}
                  <div className="px-4 py-2 bg-paros-cream/60 border-t-2 border-dashed border-espresso/20 flex items-center justify-between text-xs font-display">
                    <span className="font-bold text-espresso/60 uppercase text-[10px]">
                      Delay ETA:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => pushEta(t.id, 5)}
                        className="px-2 py-1 bg-white hover:bg-paros-yellow border border-espresso rounded-lg font-mono font-bold text-[11px] shadow-sm"
                      >
                        +5m
                      </button>
                      <button
                        onClick={() => pushEta(t.id, 10)}
                        className="px-2 py-1 bg-white hover:bg-paros-yellow border border-espresso rounded-lg font-mono font-bold text-[11px] shadow-sm"
                      >
                        +10m
                      </button>
                    </div>
                  </div>

                  {/* Primary Ticket Action Footer */}
                  <div className="p-4 pt-2 flex items-center gap-2">
                    {isReady ? (
                      <button
                        onClick={() => bumpTicket(t.id)}
                        className="brutal-btn w-full py-3.5 bg-espresso text-white font-display font-black text-xs uppercase rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>Bump Ticket (Delivered)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => markReady(t.id)}
                        className="brutal-btn w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-display font-black text-xs uppercase rounded-2xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">notifications</span>
                        <span>MARK READY 🛎️</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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
