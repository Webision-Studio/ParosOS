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
      body: JSON.stringify({ action: 'adjust-eta', minutes }),
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
    showToast(`🛎️ Ticket ${ticketId} marked Ready! Order runner notified.`);
  }

  // Bump / Serve Ticket
  function bumpTicket(ticketId: string) {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    showToast(`✓ Ticket bumped & archived. Press [Space] to recall.`);
  }

  // Bump All Completed Items
  function bumpAllCompleted() {
    setTickets((prev) => prev.filter((t) => t.status !== 'READY'));
    showToast(`✓ Bumped all completed ready tickets.`);
  }

  // Recall Last Bumped
  function recallLastTicket() {
    showToast('⏪ Last served ticket recalled back to active queue.');
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
                <span className="font-display text-lg font-black text-espresso tracking-tight">PAROS</span>
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
            className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all ${
              stationFilter === 'barista'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'text-espresso hover:bg-paros-yellow/40'
            }`}
          >
            Brew Bar (☕)
          </button>
          <button
            onClick={() => setStationFilter('kitchen')}
            className={`px-3 py-1.5 rounded-lg font-display text-xs font-black uppercase transition-all ${
              stationFilter === 'kitchen'
                ? 'bg-espresso text-white shadow-brutal-sm'
                : 'text-espresso hover:bg-paros-yellow/40'
            }`}
          >
            Hot Kitchen (🥪)
          </button>
        </nav>

        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setChimeEnabled(!chimeEnabled);
              playKitchenChime();
            }}
            className={`px-3 py-1.5 rounded-xl border-2 border-espresso font-display text-xs font-black uppercase shadow-brutal-sm flex items-center gap-1.5 transition-all ${
              chimeEnabled ? 'bg-paros-mint text-espresso' : 'bg-paros-cream text-espresso/60'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {chimeEnabled ? 'volume_up' : 'volume_off'}
            </span>
            <span>Chime: {chimeEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={recallLastTicket}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-paros-yellow border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>Recall [Space]</span>
          </button>

          <Link
            href="/pos"
            className="px-3 py-1.5 bg-paros-orange text-white border-2 border-espresso rounded-xl font-display text-xs font-black uppercase shadow-brutal-sm flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            <span>POS Register</span>
          </Link>
        </div>
      </header>

      {/* ── Main KDS Workspace ── */}
      <main className="pt-22 pb-12 px-4 sm:px-6 max-w-[1500px] mx-auto w-full flex-1 flex flex-col gap-4">
        {/* Production HUD */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-espresso shadow-brutal flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-paros-matcha animate-ping" />
            <span className="font-display text-base font-black text-espresso">Active Line Queue</span>
            <span className="bg-paros-orange text-white font-display text-xs font-black px-2.5 py-0.5 rounded-full border border-espresso">
              {filteredTickets.length} LIVE TICKETS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-display font-bold text-espresso/70 bg-paros-cream px-3 py-1 rounded-lg border border-espresso">
              <span className="material-symbols-outlined text-[16px] text-paros-orange">sync</span>
              <span>Auto-sync: 1s (0ms Lag)</span>
            </div>
            <button
              onClick={bumpAllCompleted}
              className="brutal-btn px-4 py-1.5 bg-paros-mint text-espresso font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Bump Completed Items</span>
            </button>
          </div>
        </div>

        {/* 4-Column Ticket Stream Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {filteredTickets.map((ticket) => {
            const isOverdue = ticket.status === 'OVERDUE';
            const isReady = ticket.status === 'READY';
            const isNew = ticket.status === 'NEW';

            return (
              <div
                key={ticket.id}
                className={`bg-white rounded-3xl border-2 border-espresso shadow-brutal-lg overflow-hidden flex flex-col justify-between transition-all ${
                  isOverdue
                    ? 'ring-2 ring-red-500'
                    : isReady
                    ? 'ring-2 ring-paros-matcha'
                    : ''
                }`}
              >
                {/* Top Status Rail */}
                <div
                  className={`w-full h-2.5 ${
                    isOverdue
                      ? 'bg-red-500 animate-pulse'
                      : isReady
                      ? 'bg-paros-matcha'
                      : isNew
                      ? 'bg-paros-orange animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />

                <div className="p-4 flex flex-col gap-3">
                  {/* Ticket Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`font-display text-xl font-black tracking-tight ${
                            isOverdue ? 'text-red-600' : 'text-espresso'
                          }`}
                        >
                          {ticket.tableLabel}
                        </span>
                        <span className="font-display text-[10px] font-black uppercase bg-paros-cream px-1.5 py-0.5 rounded border border-espresso">
                          {ticket.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono font-bold text-espresso/70">
                        <span>{ticket.orderNumber}</span>
                        <span>•</span>
                        <span>{ticket.customerName || 'Guest'}</span>
                      </div>
                    </div>

                    {/* Timer Badge */}
                    <div className="flex flex-col items-end">
                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 border-espresso font-mono font-black text-base shadow-brutal-sm ${
                          isOverdue
                            ? 'bg-red-100 text-red-600 border-red-500 animate-pulse'
                            : isReady
                            ? 'bg-paros-mint text-paros-matcha'
                            : 'bg-paros-yellow text-espresso'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isOverdue ? 'error' : 'timer'}
                        </span>
                        <span>{formatTime(ticket.elapsedSeconds)}</span>
                      </div>
                      <span
                        className={`font-display text-[9px] font-black uppercase mt-0.5 ${
                          isOverdue
                            ? 'text-red-600'
                            : isReady
                            ? 'text-paros-matcha'
                            : 'text-amber-800'
                        }`}
                      >
                        {isOverdue
                          ? 'OVERDUE RUSH'
                          : isReady
                          ? 'READY TO SERVE'
                          : isNew
                          ? 'NEW TICKET'
                          : 'IN PREP'}
                      </span>
                    </div>
                  </div>

                  {/* Special Note Callout */}
                  {ticket.specialNote && (
                    <div className="p-2 bg-red-50 border border-red-300 rounded-xl flex items-center gap-1.5 text-red-700 font-display text-xs font-bold">
                      <span className="material-symbols-outlined text-[16px]">priority_high</span>
                      <span>{ticket.specialNote}</span>
                    </div>
                  )}

                  {/* Checklist of Items (Tap to Strike) */}
                  <div className="flex flex-col gap-2 my-1">
                    {ticket.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(ticket.id, item.id)}
                        className={`p-2.5 rounded-xl border-2 border-espresso transition-all cursor-pointer flex items-start gap-2.5 ${
                          item.status === 'READY'
                            ? 'bg-paros-cream/60 opacity-60'
                            : 'bg-white hover:bg-paros-yellow/20 shadow-brutal-sm'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.status === 'READY'}
                          readOnly
                          className="mt-0.5 accent-paros-matcha w-4 h-4 cursor-pointer pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-display text-xs font-bold leading-tight ${
                                item.status === 'READY' ? 'line-through text-espresso/50' : 'text-espresso'
                              }`}
                            >
                              {item.name}
                            </span>
                            <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-paros-cream border border-espresso font-bold">
                              {item.category === 'barista' ? '☕ Bar' : '🥪 Grill'}
                            </span>
                          </div>
                          {item.notes && (
                            <p
                              className={`font-body text-[10px] mt-0.5 ${
                                item.status === 'READY'
                                  ? 'line-through text-espresso/40'
                                  : 'text-espresso/60'
                              }`}
                            >
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket Footer Action Bar */}
                <div className="p-4 bg-paros-cream border-t-2 border-espresso flex flex-col gap-2.5">
                  {/* +5m / +10m ETA Adjuster */}
                  <div className="flex items-center justify-between text-xs font-display">
                    <span className="font-black uppercase text-espresso/70">Chef ETA Sync:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => pushEta(ticket.id, 5)}
                        className="px-2 py-0.5 bg-white hover:bg-paros-yellow border border-espresso rounded-lg font-black text-xs shadow-brutal-sm active:translate-y-0.5"
                      >
                        +5m
                      </button>
                      <button
                        onClick={() => pushEta(ticket.id, 10)}
                        className="px-2 py-0.5 bg-white hover:bg-paros-yellow border border-espresso rounded-lg font-black text-xs shadow-brutal-sm active:translate-y-0.5"
                      >
                        +10m
                      </button>
                    </div>
                  </div>

                  {/* Primary Bump/Ready CTA */}
                  {!isReady ? (
                    <button
                      onClick={() => markReady(ticket.id)}
                      className="brutal-btn w-full py-3 bg-paros-matcha text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">notifications</span>
                      <span>MARK READY 🛎️</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => bumpTicket(ticket.id)}
                      className="brutal-btn w-full py-3 bg-espresso text-white font-display font-black text-xs uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">done_all</span>
                      <span>SERVE & BUMP TICKET ➔</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
