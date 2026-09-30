'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

interface TableItem {
  id: string;
  tableNumber: string;
}

export default function QrStudioPage() {
  const [cafeName, setCafeName] = useState('My Cafe');
  const [cafeSlug, setCafeSlug] = useState('artisan-cafe');
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Studio Display Options
  const [selectedFormat, setSelectedFormat] = useState<'tent' | 'sticker'>('tent');
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('ALL');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/pos')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (data?.cafe) {
          setCafeName(data.cafe.name);
          setCafeSlug(data.cafe.slug);
          setWifiName(data.cafe.wifiName || '');
          setWifiPassword(data.cafe.wifiPassword || '');
        }

        const rawTables: TableItem[] = data?.tables || [];
        // Ensure Takeaway station is included
        const tableList = rawTables.length > 0
          ? rawTables
          : [
              { id: '1', tableNumber: '1' },
              { id: '2', tableNumber: '2' },
              { id: '3', tableNumber: '3' },
              { id: '4', tableNumber: '4' },
              { id: 'takeaway', tableNumber: 'Takeaway' },
            ];
        setTables(tableList);

        // Generate QR codes for all tables
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://paros.cafe';
        const urlMap: Record<string, string> = {};

        for (const t of tableList) {
          const targetUrl = `${origin}/order?cafeSlug=${data?.cafe?.slug || 'artisan-cafe'}&table=${t.tableNumber}`;
          try {
            const qrData = await QRCode.toDataURL(targetUrl, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 400,
              color: {
                dark: '#1C1917',
                light: '#FFFFFF',
              },
            });
            urlMap[t.tableNumber] = qrData;
          } catch (e) {
            console.error('QR gen error:', e);
          }
        }

        setQrCodeUrls(urlMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const displayTables = selectedTableFilter === 'ALL'
    ? tables
    : tables.filter((t) => t.tableNumber === selectedTableFilter);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex flex-col select-none">
      {/* ── Fixed Studio Controls Header (Hidden on Print) ── */}
      <header className="print:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-espresso px-3 sm:px-8 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-brutal-sm">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-espresso bg-paros-cream hover:bg-paros-yellow text-xs font-display font-black uppercase transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-paros-orange text-xl sm:text-2xl">qr_code_2</span>
            <div>
              <h1 className="font-display text-sm sm:text-base font-black text-espresso leading-tight">
                Table QR Studio
              </h1>
              <p className="text-[10px] sm:text-[11px] font-body text-espresso/60">
                {cafeName} • {tables.length} Table Cards
              </p>
            </div>
          </div>
        </div>

        {/* Format Selector & Print Action */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center p-1 bg-paros-cream border border-espresso rounded-xl shadow-xs">
            <button
              onClick={() => setSelectedFormat('tent')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-display text-[11px] sm:text-xs font-black uppercase transition-all ${
                selectedFormat === 'tent'
                  ? 'bg-paros-orange text-white shadow-xs'
                  : 'text-espresso/70 hover:text-espresso'
              }`}
            >
              Tent Cards<span className="hidden md:inline"> (A4 Fold)</span>
            </button>
            <button
              onClick={() => setSelectedFormat('sticker')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-display text-[11px] sm:text-xs font-black uppercase transition-all ${
                selectedFormat === 'sticker'
                  ? 'bg-paros-orange text-white shadow-xs'
                  : 'text-espresso/70 hover:text-espresso'
              }`}
            >
              Stickers<span className="hidden md:inline"> Sheet (Grid)</span>
            </button>
          </div>

          <select
            value={selectedTableFilter}
            onChange={(e) => setSelectedTableFilter(e.target.value)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border-2 border-espresso rounded-xl font-display text-[11px] sm:text-xs font-black uppercase text-espresso outline-none shadow-xs"
          >
            <option value="ALL">All Tables ({tables.length})</option>
            {tables.map((t) => (
              <option key={t.id} value={t.tableNumber}>
                {t.tableNumber.toLowerCase() === 'takeaway' ? 'Takeaway' : `Table ${t.tableNumber}`}
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="brutal-btn px-3 sm:px-4 py-1.5 sm:py-2 bg-espresso text-white font-display text-[11px] sm:text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print<span className="hidden sm:inline"> / Save PDF</span></span>
          </button>
        </div>
      </header>

      {/* ── Main Preview Workspace ── */}
      <main className="flex-1 p-4 sm:p-8 max-w-[1200px] w-full mx-auto print:p-0 print:max-w-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-10 h-10 border-4 border-paros-orange border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-display font-bold text-sm text-espresso">Rendering high-res vector QR cards...</p>
          </div>
        ) : (
          <div>
            {/* ══ FORMAT 1: A4 FOLDABLE TENT CARDS ══ */}
            {selectedFormat === 'tent' && (
              <div className="flex flex-col gap-10 print:gap-0">
                {displayTables.map((t) => {
                  const qr = qrCodeUrls[t.tableNumber];
                  const isTakeaway = t.tableNumber.toLowerCase() === 'takeaway';

                  return (
                    <div
                      key={t.id}
                      className="bg-white border-3 border-espresso rounded-3xl p-4 sm:p-12 shadow-brutal-lg max-w-[620px] mx-auto print:max-w-none print:shadow-none print:border-none print:p-0 print:m-0 print:break-after-page"
                      style={{ pageBreakAfter: 'always' }}
                    >
                      {/* Top Half: Inverted / Folded Back */}
                      <div className="border-2 border-dashed border-espresso/30 rounded-2xl p-4 sm:p-6 text-center bg-paros-cream/50 mb-6 sm:mb-8 transform rotate-180 print:transform print:rotate-180">
                        <p className="font-display text-xs font-black uppercase tracking-wider text-espresso/60">
                          {cafeName}
                        </p>
                        <h3 className="font-display text-lg sm:text-xl font-black text-espresso mt-0.5">
                          {isTakeaway ? '⚡ EXPRESS COUNTER' : `TABLE ${t.tableNumber}`}
                        </h3>
                        <p className="font-body text-[11px] text-espresso/60 mt-1">
                          Scan the front QR code to order & pay directly from your phone.
                        </p>
                      </div>

                      {/* Cut / Fold Guideline */}
                      <div className="flex items-center gap-3 my-4 sm:my-6 text-espresso/40">
                        <div className="flex-1 border-t-2 border-dashed border-espresso/30" />
                        <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                          ✂️ FOLD HERE FOR TABLE STAND
                        </span>
                        <div className="flex-1 border-t-2 border-dashed border-espresso/30" />
                      </div>

                      {/* Bottom Half: Front Facing Tent Card */}
                      <div className="border-3 border-espresso rounded-3xl p-4 sm:p-8 bg-paros-cream text-center shadow-brutal-sm flex flex-col items-center">
                        {/* Cafe Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paros-yellow border-2 border-espresso text-[11px] font-display font-black uppercase shadow-xs mb-3">
                          <span>☕</span>
                          <span>{cafeName}</span>
                        </div>

                        {/* Table Number Display */}
                        <h2 className="font-display text-2xl sm:text-4xl font-black text-espresso tracking-tight">
                          {isTakeaway ? 'EXPRESS PICKUP' : `TABLE ${t.tableNumber}`}
                        </h2>

                        <p className="font-body text-xs font-bold text-espresso/70 mt-1 mb-4">
                          Scan to browse menu, customize & pay via UPI
                        </p>

                        {/* High-Res QR Code Card */}
                        <div className="p-3 bg-white border-3 border-espresso rounded-2xl shadow-brutal my-2">
                          {qr ? (
                            <img
                              src={qr}
                              alt={`QR Table ${t.tableNumber}`}
                              className="w-40 h-40 sm:w-56 sm:h-56 object-contain"
                            />
                          ) : (
                            <div className="w-40 h-40 bg-gray-100 flex items-center justify-center font-mono text-xs">
                              Generating...
                            </div>
                          )}
                        </div>

                        {/* Order Instructions Pill */}
                        <div className="mt-4 flex items-center gap-2 bg-white px-3 sm:px-4 py-1.5 rounded-xl border border-espresso text-[11px] sm:text-xs font-display font-black uppercase text-espresso">
                          <span className="material-symbols-outlined text-paros-orange text-[16px] sm:text-[18px]">smartphone</span>
                          <span>Open Camera ➔ Scan ➔ Pay</span>
                        </div>

                        {/* Optional Wi-Fi Badge */}
                        {wifiName && (
                          <div className="mt-4 pt-3 border-t border-espresso/15 w-full flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-display">
                            <span className="text-espresso/60 uppercase text-[10px] font-bold">Free Guest Wi-Fi:</span>
                            <span className="font-bold text-espresso">SSID: {wifiName}</span>
                            {wifiPassword && (
                              <span className="font-mono bg-white px-2 py-0.5 rounded border border-espresso/30 text-[11px]">
                                Key: {wifiPassword}
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-[10px] font-mono text-espresso/40 mt-4">
                          Powered by Paros POS • Zero Hardware
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ══ FORMAT 2: TABLE STICKERS SHEET (GRID) ══ */}
            {selectedFormat === 'sticker' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 print:grid-cols-2 print:gap-4">
                {displayTables.map((t) => {
                  const qr = qrCodeUrls[t.tableNumber];
                  const isTakeaway = t.tableNumber.toLowerCase() === 'takeaway';

                  return (
                    <div
                      key={t.id}
                      className="bg-white border-3 border-espresso rounded-2xl p-4 sm:p-5 shadow-brutal text-center flex flex-col items-center justify-between print:shadow-none print:break-inside-avoid"
                    >
                      <div className="w-full pb-2 border-b border-espresso/20 flex items-center justify-between">
                        <span className="font-display text-[10px] font-black uppercase text-espresso truncate max-w-[120px]">
                          {cafeName}
                        </span>
                        <span className="font-display text-xs font-black text-paros-orange bg-paros-yellow px-2 py-0.5 rounded border border-espresso">
                          {isTakeaway ? 'Takeaway' : `Table ${t.tableNumber}`}
                        </span>
                      </div>

                      <div className="my-3 p-1.5 bg-paros-cream border-2 border-espresso rounded-xl">
                        {qr ? (
                          <img
                            src={qr}
                            alt={`QR ${t.tableNumber}`}
                            className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-gray-100 flex items-center justify-center font-mono text-xs">
                            Generating...
                          </div>
                        )}
                      </div>

                      <div className="w-full pt-2 border-t border-espresso/20 flex items-center justify-center gap-1 text-[10px] font-display font-black uppercase text-espresso">
                        <span>Scan & Pay via UPI</span>
                        <span className="material-symbols-outlined text-[14px] text-paros-matcha">verified</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Mobile Quick Navigation Bottom Bar ── */}
      <nav className="print:hidden lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-espresso shadow-brutal flex items-center justify-around py-2 px-1 pb-safe">
        <Link
          href="/pos"
          className="flex flex-col items-center gap-0.5 text-espresso/70 hover:text-paros-orange font-display text-[10px] font-bold py-1 px-2 rounded-lg"
        >
          <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
          <span>Register</span>
        </Link>
        <Link
          href="/kds"
          className="flex flex-col items-center gap-0.5 text-espresso/70 hover:text-paros-orange font-display text-[10px] font-bold py-1 px-2 rounded-lg"
        >
          <span className="material-symbols-outlined text-[20px]">soup_kitchen</span>
          <span>KDS</span>
        </Link>
        <Link
          href="/admin/menu"
          className="flex flex-col items-center gap-0.5 text-espresso/70 hover:text-paros-orange font-display text-[10px] font-bold py-1 px-2 rounded-lg"
        >
          <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
          <span>Menu</span>
        </Link>
        <Link
          href="/admin/qr"
          className="flex flex-col items-center gap-0.5 text-paros-orange font-display text-[10px] font-black py-1 px-2 rounded-lg bg-paros-orange/10"
        >
          <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
          <span>QR Studio</span>
        </Link>
        <Link
          href="/admin"
          className="flex flex-col items-center gap-0.5 text-espresso/70 hover:text-paros-orange font-display text-[10px] font-bold py-1 px-2 rounded-lg"
        >
          <span className="material-symbols-outlined text-[20px]">monitoring</span>
          <span>Analytics</span>
        </Link>
      </nav>

      {/* ── Print Stylesheet ── */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          header, nav, button, select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
