'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function DemoDock() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    {
      href: '/pos',
      label: 'Counter POS',
      short: 'POS',
      icon: 'point_of_sale',
      color: 'bg-paros-orange text-white',
      badge: 'Cashier / Barista',
    },
    {
      href: '/order',
      label: 'Guest Table QR',
      short: 'Customer',
      icon: 'smartphone',
      color: 'bg-paros-mint text-espresso',
      badge: 'Diner Phone',
    },
    {
      href: '/kds',
      label: 'Kitchen KDS',
      short: 'Kitchen',
      icon: 'soup_kitchen',
      color: 'bg-paros-yellow text-espresso',
      badge: 'Chef Display',
    },
    {
      href: '/admin',
      label: 'Manager Admin',
      short: 'Admin',
      icon: 'analytics',
      color: 'bg-paros-peach text-espresso',
      badge: 'Z-Report / Ledger',
    },
  ];

  const currentRole = roles.find((r) => pathname.startsWith(r.href));

  // Hide on POS workstation to avoid overlapping primary cashier settlement buttons
  if (pathname.startsWith('/pos')) {
    return null;
  }

  return (
    <div className="hidden md:flex fixed bottom-4 right-4 z-50 flex-col items-end gap-2 font-display select-none">
      {/* Expanded Switcher Card */}
      {isOpen && (
        <div className="bg-white border-2 border-espresso rounded-2xl p-3 shadow-brutal-xl w-72 sm:w-80 flex flex-col gap-2.5 animate-in slide-in-from-bottom-3 duration-150">
          <div className="flex items-center justify-between pb-2 border-b-2 border-espresso">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-paros-matcha animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-espresso">
                Demo Role Switcher
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-lg bg-surface-container hover:bg-paros-peach border border-espresso flex items-center justify-center text-xs font-bold text-espresso transition-colors"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] font-medium text-espresso/70 font-body">
            Ek click me alag-alag role test karein (Cashier, Customer, Chef, ya Owner):
          </p>

          {/* Role Buttons */}
          <div className="flex flex-col gap-1.5">
            {roles.map((r) => {
              const isActive = pathname.startsWith(r.href);
              return (
                <div key={r.href} className="flex items-center gap-1.5">
                  <Link
                    href={r.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border-2 border-espresso font-display text-xs font-black uppercase transition-all ${
                      isActive
                        ? `${r.color} shadow-brutal-sm scale-[1.02]`
                        : 'bg-white hover:bg-paros-yellow/40 text-espresso shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        {r.icon}
                      </span>
                      <span>{r.label}</span>
                    </div>
                    {isActive ? (
                      <span className="text-[9px] bg-white text-espresso px-1.5 py-0.5 rounded font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] text-espresso/60 font-medium">
                        {r.badge}
                      </span>
                    )}
                  </Link>

                  {/* Open in new tab button for Customer/KDS for split-screen testing */}
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open ${r.label} in new tab (for side-by-side split screen)`}
                    className="w-8 h-8 rounded-xl bg-surface-container hover:bg-paros-yellow border-2 border-espresso flex items-center justify-center text-espresso shadow-sm hover:shadow-brutal-sm transition-all shrink-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      open_in_new
                    </span>
                  </a>
                </div>
              );
            })}
          </div>

          {/* Quick Dual-Screen Tip */}
          <div className="bg-paros-cream p-2 rounded-xl border border-espresso text-[11px] font-body text-espresso/80 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-paros-orange text-[16px] shrink-0">
              splitscreen
            </span>
            <span>
              <strong>Tip:</strong> <code>[↗]</code> dabakar Customer QR alag tab me kholiye aur side-by-side live sync test kijiye!
            </span>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="brutal-btn px-3.5 py-2 rounded-2xl bg-paros-yellow hover:bg-paros-peach text-espresso border-2 border-espresso shadow-brutal flex items-center gap-2 text-xs font-black uppercase tracking-wide group"
      >
        <span className="material-symbols-outlined text-[18px] group-hover:rotate-45 transition-transform">
          tune
        </span>
        <span>
          {currentRole ? currentRole.short : 'Role Switcher'}
        </span>
        <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
      </button>
    </div>
  );
}
