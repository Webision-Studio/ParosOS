'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  isVeg: boolean;
  desc: string;
}

export default function MenuCatalogPage() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeImportTab, setActiveImportTab] = useState<'scan' | 'csv' | 'url'>('scan');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCat, setNewItemCat] = useState('Hot Coffee');
  const [newItemVeg, setNewItemVeg] = useState(true);

  // Items State
  const [items, setItems] = useState<CatalogItem[]>([
    {
      id: '1',
      name: 'Flat White (Oat Milk)',
      category: 'Hot Coffee',
      price: 260,
      inStock: true,
      isVeg: true,
      desc: 'Double ristretto espresso, velvety textured oat milk',
    },
    {
      id: '2',
      name: 'Specialty Pour Over (Ratnagiri)',
      category: 'Hot Coffee',
      price: 260,
      inStock: true,
      isVeg: true,
      desc: 'Single-origin light roast brewed on Hario V60',
    },
    {
      id: '3',
      name: 'French Butter Croissant',
      category: 'Artisan Bakery',
      price: 180,
      inStock: true,
      isVeg: true,
      desc: '27-layer laminated all-butter flaky pastry',
    },
    {
      id: '4',
      name: 'Wild Herb Sourdough Toast',
      category: 'Toasties',
      price: 160,
      inStock: true,
      isVeg: true,
      desc: 'Artisanal sourdough with hand-churned salted herb butter',
    },
    {
      id: '5',
      name: 'Cold Brew Tonic',
      category: 'Iced Brews',
      price: 220,
      inStock: true,
      isVeg: true,
      desc: '18-hour cold steep with botanical tonic and charred orange',
    },
    {
      id: '6',
      name: 'Basque Burnt Cheesecake',
      category: 'Artisan Bakery',
      price: 280,
      inStock: true,
      isVeg: true,
      desc: 'Creamy caramelised Spanish cheesecake slice',
    },
  ]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function toggleStock(id: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const updated = !i.inStock;
          showToast(`${i.name} marked ${updated ? 'IN STOCK' : '86 / SOLD OUT'}`);
          return { ...i, inStock: updated };
        }
        return i;
      })
    );
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const newItem: CatalogItem = {
      id: `m-${Date.now()}`,
      name: newItemName,
      price: Number(newItemPrice),
      category: newItemCat,
      isVeg: newItemVeg,
      inStock: true,
      desc: 'Handcrafted in-house specialty',
    };

    setItems([newItem, ...items]);
    setIsAddModalOpen(false);
    showToast(`✓ Added ${newItemName} (₹${newItemPrice}) to Live Menu`);

    setNewItemName('');
    setNewItemPrice('');
  }

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCat === 'All' || item.category === selectedCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex antialiased select-none">
      {/* ── Left Sidebar Navigation ── */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r-2 border-espresso z-50 flex flex-col justify-between py-6 px-4 shadow-brutal-sm">
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <div className="w-10 h-10 bg-paros-orange text-white rounded-xl border-2 border-espresso flex items-center justify-center font-display font-black text-xl shadow-brutal-sm">
              P
            </div>
            <div>
              <p className="font-display text-xl font-black text-espresso tracking-tight leading-none">
                PAROS<span className="text-paros-orange">.</span>
              </p>
              <p className="font-display text-[10px] font-black uppercase tracking-wider text-espresso/60 mt-0.5">
                Hospitality OS
              </p>
            </div>
          </Link>

          <nav className="flex flex-col gap-1 font-display text-xs font-bold">
            <Link href="/pos" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso">
              <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
              <span>Register / POS</span>
            </Link>
            <Link href="/kds" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso">
              <span className="material-symbols-outlined text-[20px]">soup_kitchen</span>
              <span>Kitchen KDS</span>
            </Link>
            <Link href="/admin/menu" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm font-black">
              <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
              <span>Menu Catalog</span>
            </Link>
            <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso">
              <span className="material-symbols-outlined text-[20px]">monitoring</span>
              <span>Financial Analytics</span>
            </Link>
          </nav>
        </div>

        <div className="pt-4 border-t-2 border-dashed border-espresso/20 flex items-center justify-between text-xs font-display font-bold">
          <div className="flex items-center gap-1.5 text-paros-matcha">
            <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
            <span>Menu Sync Active</span>
          </div>
          <span className="font-mono text-[10px] text-espresso/50">0ms</span>
        </div>
      </aside>

      {/* ── Main Catalog Workspace (offset 64) ── */}
      <div className="pl-64 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 bg-white/95 backdrop-blur-md h-16 border-b-2 border-espresso z-40 px-6 flex items-center justify-between shadow-brutal-sm">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-black text-espresso">Menu & Catalog Manager</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-paros-yellow border border-espresso font-display text-[10px] font-black uppercase">
              {items.length} Live Items
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportOpen(!isImportOpen)}
              className="brutal-btn px-4 py-2 bg-white text-espresso font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-paros-orange">document_scanner</span>
              <span>AI Menu Digitizer</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="brutal-btn px-4 py-2 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Quick Add Item</span>
            </button>
          </div>
        </header>

        <main className="p-6 max-w-[1400px] w-full mx-auto flex flex-col gap-6">
          {/* ══ AI DIGITIZER & IMPORT DRAWER ══ */}
          {isImportOpen && (
            <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl overflow-hidden p-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center pb-4 border-b-2 border-espresso mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-paros-yellow border-2 border-espresso flex items-center justify-center">
                    <span className="material-symbols-outlined text-espresso text-[22px]">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="font-display text-base font-black text-espresso">
                      Import Menu in 10 Seconds
                    </h3>
                    <p className="font-body text-xs text-espresso/70">
                      Upload physical menu photos, PDFs, or Excel spreadsheets with instant OCR recognition.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportOpen(false)}
                  className="w-8 h-8 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 mb-4 border-b border-espresso/20 pb-2">
                {[
                  { id: 'scan', label: 'Scan Menu Photo / PDF', icon: 'photo_camera' },
                  { id: 'csv', label: 'Excel / POS CSV', icon: 'table_chart' },
                  { id: 'url', label: 'Zomato / Swiggy URL Sync', icon: 'link' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveImportTab(t.id as 'scan' | 'csv' | 'url')}
                    className={`px-3 py-1.5 rounded-xl font-display text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
                      activeImportTab === t.id
                        ? 'bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm'
                        : 'text-espresso hover:bg-paros-yellow/40'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeImportTab === 'scan' && (
                <div className="border-2 border-dashed border-espresso rounded-2xl p-8 bg-paros-cream/50 flex flex-col items-center text-center cursor-pointer hover:bg-paros-yellow/20 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-paros-yellow border border-espresso flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-espresso text-[24px]">cloud_upload</span>
                  </div>
                  <p className="font-display text-sm font-black text-espresso">
                    Drop physical menu photo or PDF here
                  </p>
                  <p className="font-body text-xs text-espresso/60 max-w-sm mt-1">
                    Paros OCR automatically creates categories, items, prices, and veg/non-veg tags in 10 seconds.
                  </p>
                  <button
                    onClick={() => showToast('📷 Camera scanner opened! Processing menu card...')}
                    className="brutal-btn mt-4 px-5 py-2.5 bg-espresso text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
                  >
                    Choose Photo from Device
                  </button>
                </div>
              )}

              {activeImportTab === 'csv' && (
                <div className="border-2 border-dashed border-espresso rounded-2xl p-8 bg-paros-cream/50 flex flex-col items-center text-center">
                  <span className="material-symbols-outlined text-espresso text-[32px] mb-2">csv</span>
                  <p className="font-display text-sm font-black text-espresso">Bulk Spreadsheet CSV Upload</p>
                  <p className="font-body text-xs text-espresso/60 mt-1 mb-3">
                    Supports Petpooja, POSist, Square, and Excel standard menu exports.
                  </p>
                  <button
                    onClick={() => showToast('📂 CSV file selected! Imported 24 items.')}
                    className="brutal-btn px-5 py-2.5 bg-paros-matcha text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
                  >
                    Select CSV File
                  </button>
                </div>
              )}

              {activeImportTab === 'url' && (
                <div className="p-4 bg-paros-cream rounded-2xl border border-espresso flex flex-col gap-2">
                  <label className="font-display text-xs font-black uppercase text-espresso">
                    Paste Zomato or Swiggy Restaurant URL:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://www.zomato.com/bengaluru/artisan-roastery-indiranagar/order"
                      className="flex-1 p-2.5 bg-white border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                    />
                    <button
                      onClick={() => showToast('⚡ Deep-crawling Zomato menu... 42 dishes auto-synced!')}
                      className="brutal-btn px-5 py-2.5 bg-paros-orange text-white font-display text-xs font-black uppercase rounded-xl border border-espresso shadow-brutal-sm"
                    >
                      Fetch Menu
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ FILTER & CATALOG ROSTER ═══ */}
          <div className="bg-white p-5 rounded-3xl border-2 border-espresso shadow-brutal flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['All', 'Hot Coffee', 'Iced Brews', 'Artisan Bakery', 'Toasties'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCat(cat)}
                    className={`px-3 py-1.5 rounded-xl border border-espresso font-display text-xs font-black uppercase transition-all whitespace-nowrap ${
                      selectedCat === cat
                        ? 'bg-espresso text-white shadow-brutal-sm'
                        : 'bg-paros-cream hover:bg-paros-yellow text-espresso'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-espresso/60 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter items..."
                  className="pl-9 pr-3 py-1.5 bg-paros-cream border border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="border-2 border-espresso rounded-2xl overflow-hidden">
              <table className="w-full text-left font-display text-xs">
                <thead className="bg-paros-cream border-b-2 border-espresso font-black uppercase text-[10px] text-espresso/70">
                  <tr>
                    <th className="p-3">Dish / Drink</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Dine-In Price</th>
                    <th className="p-3">Availability (86)</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-espresso/20">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-paros-yellow/10 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              item.isVeg ? 'bg-paros-matcha' : 'bg-red-500'
                            }`}
                          />
                          <div>
                            <p className="font-bold text-sm text-espresso">{item.name}</p>
                            <p className="font-body text-[11px] text-espresso/60">{item.desc}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-espresso/80">{item.category}</td>
                      <td className="p-3 font-mono font-black text-sm text-espresso tabular-nums">
                        ₹{item.price}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleStock(item.id)}
                          className={`px-2.5 py-1 rounded-full border border-espresso font-bold text-[10px] uppercase shadow-sm ${
                            item.inStock
                              ? 'bg-paros-mint text-paros-matcha'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {item.inStock ? '● In Stock' : '✕ Sold Out (86)'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => showToast(`✏️ Editing item: ${item.name}`)}
                          className="px-2.5 py-1 bg-paros-cream hover:bg-paros-yellow border border-espresso rounded-lg font-bold text-[11px]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modal: Quick Add Item ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-espresso/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <h3 className="font-display text-lg font-black text-espresso">Quick Add Menu Item</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="flex flex-col gap-4">
              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Item Name:
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Avocado Toast, Cold Brew Float"
                  required
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-sm font-bold text-espresso outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                    Price (₹):
                  </label>
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="260"
                    required
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-lg font-black text-espresso outline-none"
                  />
                </div>

                <div>
                  <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                    Category:
                  </label>
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                  >
                    <option value="Hot Coffee">Hot Coffee</option>
                    <option value="Iced Brews">Iced Brews</option>
                    <option value="Artisan Bakery">Artisan Bakery</option>
                    <option value="Toasties">Toasties</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-display font-bold text-espresso cursor-pointer">
                <input
                  type="checkbox"
                  checked={newItemVeg}
                  onChange={(e) => setNewItemVeg(e.target.checked)}
                  className="accent-paros-matcha w-4 h-4"
                />
                <span>Pure Vegetarian Item (Green Marker)</span>
              </label>

              <button
                type="submit"
                className="brutal-btn w-full py-3.5 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal mt-2"
              >
                Add Item to Live POS & QR Menu ➔
              </button>
            </form>
          </div>
        </div>
      )}

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
