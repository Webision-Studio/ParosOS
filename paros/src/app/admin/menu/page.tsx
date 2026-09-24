'use client';

import { useState, useEffect } from 'react';
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
      category: 'Bakery & Hearth',
      price: 180,
      inStock: true,
      isVeg: true,
      desc: '27-layer laminated all-butter flaky pastry',
    },
    {
      id: '4',
      name: 'Wild Herb Sourdough Toast',
      category: 'Artisanal Toast',
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
      name: 'Avocado & Danish Feta Toast',
      category: 'Artisanal Toast',
      price: 280,
      inStock: true,
      isVeg: true,
      desc: 'Hass avocado mash, crumbled feta, chili flakes',
    },
  ]);

  // Load menu items from database
  useEffect(() => {
    fetch('/api/admin')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.menuItems?.length) {
          setItems(
            data.menuItems.map((m: { id: string; name: string; price: number; inStock: boolean; isVeg: boolean; description?: string; category?: { name: string } }) => ({
              id: m.id,
              name: m.name,
              category: m.category?.name || 'Specials',
              price: m.price,
              inStock: m.inStock,
              isVeg: m.isVeg,
              desc: m.description || 'Specialty creation',
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

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

    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle-stock',
        itemId: id,
      }),
    }).catch(() => {});
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

    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-menu-item',
        name: newItem.name,
        price: newItem.price,
        categoryName: newItem.category,
        isVeg: newItem.isVeg,
      }),
    }).catch(() => {});
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
            <Link href="/order" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso">
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
              <span>Table QR Menu</span>
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
          <span className="font-mono text-[10px] text-espresso/50">Live DB</span>
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
                      Instant AI Menu Digitizer
                    </h3>
                    <p className="font-body text-xs text-espresso/70">
                      Snap a photo of your paper menu or drop your Swiggy/Zomato PDF
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
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'scan', label: 'Photo / PDF OCR' },
                  { id: 'csv', label: 'CSV / Excel Upload' },
                  { id: 'url', label: 'Swiggy / Zomato URL' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveImportTab(t.id as 'scan' | 'csv' | 'url')}
                    className={`px-3 py-1.5 rounded-xl font-display text-xs font-bold border border-espresso transition-all ${
                      activeImportTab === t.id
                        ? 'bg-espresso text-white shadow-sm'
                        : 'bg-paros-cream hover:bg-paros-yellow text-espresso'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-espresso rounded-2xl p-8 bg-paros-cream/50 flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:bg-paros-yellow/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-white border border-espresso flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-paros-orange text-[26px]">upload_file</span>
                </div>
                <p className="font-display text-sm font-black text-espresso">
                  Drag & Drop Menu Image (JPG, PNG) or Click to Browse
                </p>
                <p className="font-body text-xs text-espresso/60 max-w-xs">
                  AI will parse names, prices, categories, and dietary tags in ~4 seconds
                </p>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border-2 border-espresso shadow-brutal flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="material-symbols-outlined text-espresso/60">search</span>
              <input
                type="text"
                placeholder="Search dish by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-paros-cream border border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['All', 'Hot Coffee', 'Iced Brews', 'Bakery & Hearth', 'Artisanal Toast'].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCat(c)}
                  className={`px-3 py-1.5 rounded-xl border border-espresso font-display text-xs font-bold uppercase transition-all whitespace-nowrap ${
                    selectedCat === c
                      ? 'bg-espresso text-white shadow-sm'
                      : 'bg-paros-cream hover:bg-paros-yellow'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Catalog Table */}
          <div className="bg-white rounded-2xl border-2 border-espresso shadow-brutal overflow-hidden">
            <div className="p-4 border-b-2 border-espresso flex justify-between items-center bg-paros-cream">
              <span className="font-display text-xs font-black uppercase text-espresso">
                Active Catalog ({filteredItems.length} items)
              </span>
              <span className="font-mono text-xs text-espresso/60 font-bold">
                100% Tax Compliant (5% GST Inclusive)
              </span>
            </div>

            <div className="divide-y divide-espresso/15">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                    !item.inStock ? 'bg-paros-cream/40 opacity-60' : 'hover:bg-paros-cream/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full border border-espresso ${
                        item.isVeg ? 'bg-paros-matcha' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-black text-espresso">{item.name}</p>
                        <span className="px-2 py-0.5 rounded bg-paros-cream border border-espresso font-mono text-[10px] font-bold">
                          {item.category}
                        </span>
                      </div>
                      <p className="font-body text-xs text-espresso/70 mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-display text-base font-black text-espresso tabular-nums">
                      ₹{item.price}
                    </span>

                    {/* 86 Sold-out Toggle Switch */}
                    <button
                      onClick={() => toggleStock(item.id)}
                      className={`px-3 py-1.5 rounded-xl border border-espresso font-display text-xs font-black uppercase shadow-sm transition-all ${
                        item.inStock
                          ? 'bg-paros-mint text-emerald-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.inStock ? 'In Stock' : '86 / Sold Out'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ── Quick Add Item Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-espresso/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <h3 className="font-display text-lg font-black text-espresso">Add Menu Item</h3>
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
                  Dish / Beverage Name:
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Cinnamon Roll, Tonic Cold Brew"
                  required
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-sm font-bold text-espresso outline-none"
                />
              </div>

              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Price (₹):
                </label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="240"
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
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                  >
                    <option value="Hot Coffee">Hot Coffee</option>
                    <option value="Iced Brews">Iced Brews</option>
                    <option value="Bakery & Hearth">Bakery & Hearth</option>
                    <option value="Artisanal Toast">Artisanal Toast</option>
                    <option value="Specials">Specials</option>
                  </select>
                </div>

                <div>
                  <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                    Dietary:
                  </label>
                  <select
                    value={newItemVeg ? 'veg' : 'nonveg'}
                    onChange={(e) => setNewItemVeg(e.target.value === 'veg')}
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                  >
                    <option value="veg">Vegetarian (🟢)</option>
                    <option value="nonveg">Non-Veg (🔴)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="brutal-btn w-full py-3.5 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal mt-2"
              >
                Add Item to Live Catalog ➔
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
