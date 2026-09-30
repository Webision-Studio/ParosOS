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
  imageUrl?: string;
}

export default function MenuCatalogPage() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCat, setFormCat] = useState('Hot Coffee');
  const [formVeg, setFormVeg] = useState(true);
  const [formDesc, setFormDesc] = useState('Handcrafted in-house specialty');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Items State
  const [items, setItems] = useState<CatalogItem[]>([]);

  // Load menu items from database
  useEffect(() => {
    fetch('/api/admin')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.menuItems?.length) {
          setItems(
            data.menuItems.map((m: any) => ({
              id: m.id,
              name: m.name,
              category: m.category?.name || 'Specials',
              price: m.price,
              inStock: m.inStock,
              isVeg: m.isVeg,
              desc: m.description || 'Specialty creation',
              imageUrl: m.imageUrl,
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
      body: JSON.stringify({ action: 'toggle-stock', itemId: id }),
    }).catch(() => {});
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast(`Deleted ${name}`);
    
    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-menu-item', itemId: id }),
    }).catch(() => {});
  }

  function openAddModal() {
    setEditingItemId(null);
    setFormName('');
    setFormPrice('');
    setFormCat('Hot Coffee');
    setFormVeg(true);
    setFormDesc('Handcrafted in-house specialty');
    setFormImageUrl('');
    setIsModalOpen(true);
  }

  function openEditModal(item: CatalogItem) {
    setEditingItemId(item.id);
    setFormName(item.name);
    setFormPrice(item.price.toString());
    setFormCat(item.category);
    setFormVeg(item.isVeg);
    setFormDesc(item.desc);
    setFormImageUrl(item.imageUrl || '');
    setIsModalOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setFormImageUrl(data.url);
      } else {
        showToast('Upload failed');
      }
    } catch (err) {
      showToast('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!formName || !formPrice) return;

    const isEdit = !!editingItemId;

    const payload = {
      action: isEdit ? 'edit-menu-item' : 'add-menu-item',
      itemId: editingItemId,
      name: formName,
      price: Number(formPrice),
      categoryName: formCat,
      isVeg: formVeg,
      description: formDesc,
      imageUrl: formImageUrl || undefined,
    };

    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const m = isEdit ? data.item : data.menuItem;
          const newItem: CatalogItem = {
            id: m.id,
            name: m.name,
            price: m.price,
            category: m.category?.name || formCat,
            isVeg: m.isVeg,
            inStock: m.inStock,
            desc: m.description,
            imageUrl: m.imageUrl,
          };

          if (isEdit) {
            setItems(prev => prev.map(i => i.id === m.id ? newItem : i));
            showToast(`✓ Updated ${newItem.name}`);
          } else {
            setItems(prev => [newItem, ...prev]);
            showToast(`✓ Added ${newItem.name}`);
          }
          setIsModalOpen(false);
        }
      })
      .catch(() => showToast('Failed to save item'));
  }

  async function handleImportCSV() {
    if (!csvData.trim()) return;
    const lines = csvData.split('\n').filter(l => l.trim() !== '').slice(0, 100);
    let successCount = 0;
    
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        const [name, price, category, isVegStr] = parts;
        const cleanName = String(name || '').trim().slice(0, 100);
        const cleanPrice = Number(price);
        if (!cleanName || isNaN(cleanPrice) || cleanPrice < 0 || cleanPrice > 100000) continue;
        const isVeg = isVegStr ? isVegStr.toLowerCase() === 'true' : true;
        
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add-menu-item',
              name: cleanName,
              price: cleanPrice,
              categoryName: category,
              isVeg,
            }),
          });
          const data = await res.json();
          if (data.success) {
            successCount++;
            const m = data.menuItem;
            const newItem: CatalogItem = {
              id: m.id,
              name: m.name,
              price: m.price,
              category: m.category?.name || category,
              isVeg: m.isVeg,
              inStock: m.inStock,
              desc: m.description,
              imageUrl: m.imageUrl,
            };
            setItems(prev => [newItem, ...prev]);
          }
        } catch(e) {}
      }
    }
    showToast(`✓ Imported ${successCount} items`);
    setIsImportOpen(false);
    setCsvData('');
  }

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCat === 'All' || item.category === selectedCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex antialiased select-none">
      {/* ── Left Sidebar Navigation (Desktop) ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r-2 border-espresso z-50 flex-col justify-between py-6 px-4 shadow-brutal-sm">
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
            <Link href="/admin/qr" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso">
              <span className="material-symbols-outlined text-[20px]">print</span>
              <span>🖨️ QR Print Studio</span>
            </Link>
            <Link href="/admin/inventory" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso font-bold">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              <span>📦 Inventory & Recipes</span>
            </Link>
            <Link href="/admin/bills" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso font-bold">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              <span>🧾 Bill History</span>
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

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-espresso/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-white border-r-2 border-espresso flex flex-col justify-between py-6 px-4 shadow-brutal-xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-5 overflow-y-auto">
              <div className="flex items-center justify-between px-1">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-paros-orange text-white rounded-xl border-2 border-espresso flex items-center justify-center font-display font-black text-lg shadow-brutal-sm">
                    P
                  </div>
                  <div>
                    <p className="font-display text-lg font-black text-espresso tracking-tight leading-none">
                      PAROS<span className="text-paros-orange">.</span>
                    </p>
                    <p className="font-display text-[9px] font-black uppercase text-espresso/60 mt-0.5">
                      Hospitality OS
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs hover:bg-paros-yellow"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1 font-display text-xs font-bold">
                <Link
                  href="/pos"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                  <span>Register / POS</span>
                </Link>
                <Link
                  href="/kds"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[20px]">soup_kitchen</span>
                  <span>Kitchen KDS</span>
                </Link>
                <Link
                  href="/order"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                  <span>Table QR Menu</span>
                </Link>
                <Link
                  href="/admin/menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm font-black"
                >
                  <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
                  <span>Menu Catalog</span>
                </Link>
                <Link
                  href="/admin/qr"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[20px]">print</span>
                  <span>🖨️ QR Print Studio</span>
                </Link>
                <Link
                  href="/admin/inventory"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso font-bold"
                >
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                  <span>📦 Inventory & Recipes</span>
                </Link>
                <Link
                  href="/admin/bills"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso font-bold"
                >
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                  <span>🧾 Bill History</span>
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
                >
                  <span className="material-symbols-outlined text-[20px]">monitoring</span>
                  <span>Financial Analytics</span>
                </Link>
              </nav>
            </div>

            <div className="pt-4 border-t border-espresso/20 flex items-center justify-between text-xs font-display font-bold">
              <span className="text-paros-matcha flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
                Online
              </span>
              <span className="font-mono text-[10px] text-espresso/50">Live DB</span>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Catalog Workspace ── */}
      <div className="pl-0 lg:pl-64 flex-1 flex flex-col min-h-screen pb-20 lg:pb-0">
        <header className="sticky top-0 bg-white/95 backdrop-blur-md h-16 border-b-2 border-espresso z-40 px-3 sm:px-6 flex items-center justify-between shadow-brutal-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl bg-paros-cream border-2 border-espresso flex items-center justify-center font-bold text-espresso shadow-xs hover:bg-paros-yellow transition-colors"
              aria-label="Open Navigation Menu"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xs sm:text-sm font-black text-espresso truncate max-w-[140px] sm:max-w-none">
                  Menu Catalog
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-paros-yellow border border-espresso font-display text-[9px] sm:text-[10px] font-black uppercase">
                  {items.length} Items
                </span>
              </div>
              <p className="text-[10px] font-display font-bold text-espresso/60 hidden sm:block">Master Catalog & Stock</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsImportOpen(!isImportOpen)}
              className="brutal-btn px-2.5 sm:px-4 py-2 bg-white text-espresso font-display text-[11px] sm:text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-paros-orange">document_scanner</span>
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              onClick={openAddModal}
              className="brutal-btn px-2.5 sm:px-4 py-2 bg-paros-orange text-white font-display text-[11px] sm:text-xs font-black uppercase rounded-xl border-2 border-espresso shadow-brutal-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span className="hidden sm:inline">Add New Item</span>
              <span className="sm:hidden">+ Item</span>
            </button>
          </div>
        </header>

        <main className="p-3 sm:p-6 max-w-[1400px] w-full mx-auto flex flex-col gap-4 sm:gap-6">
          {/* CSV Import Drawer */}
          {isImportOpen && (
            <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl overflow-hidden p-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center pb-4 border-b-2 border-espresso mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-paros-yellow border-2 border-espresso flex items-center justify-center">
                    <span className="material-symbols-outlined text-espresso text-[22px]">table_chart</span>
                  </div>
                  <div>
                    <h3 className="font-display text-base font-black text-espresso">
                      Bulk Import Menu Items
                    </h3>
                    <p className="font-body text-xs text-espresso/70">
                      Paste CSV format: name, price, category, isVeg (true/false)
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
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Flat White, 260, Hot Coffee, true&#10;Butter Croissant, 180, Bakery & Hearth, false"
                className="w-full h-32 p-3 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-xs text-espresso outline-none resize-none mb-3"
              />
              <button
                onClick={handleImportCSV}
                className="brutal-btn w-full py-2 bg-espresso text-white font-display font-black text-xs uppercase rounded-xl"
              >
                Process & Import CSV
              </button>
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
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-espresso" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-paros-cream border border-espresso flex items-center justify-center text-xl">
                        🍽️
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full border border-espresso ${
                            item.isVeg ? 'bg-paros-matcha' : 'bg-red-500'
                          }`}
                        />
                        <p className="font-display text-sm font-black text-espresso">{item.name}</p>
                        <span className="px-2 py-0.5 rounded bg-paros-cream border border-espresso font-mono text-[10px] font-bold">
                          {item.category}
                        </span>
                      </div>
                      <p className="font-body text-xs text-espresso/70 mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-display text-base font-black text-espresso tabular-nums mr-2">
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
                    
                    <button
                      onClick={() => openEditModal(item)}
                      className="w-8 h-8 rounded-full bg-paros-yellow border border-espresso flex items-center justify-center text-espresso hover:bg-paros-orange hover:text-white transition-colors"
                      title="Edit Item"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="w-8 h-8 rounded-full bg-paros-cream border border-espresso flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                      title="Delete Item"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-espresso/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b-2 border-espresso mb-4">
              <h3 className="font-display text-lg font-black text-espresso">
                {editingItemId ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-paros-cream border border-espresso flex items-center justify-center font-black text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="flex flex-col gap-4">
              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Dish / Beverage Name:
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cinnamon Roll"
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
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="240"
                  required
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-mono text-xl font-black text-espresso outline-none"
                />
              </div>

              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Description:
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-body text-sm text-espresso outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                    Category:
                  </label>
                  <select
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value)}
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
                    value={formVeg ? 'veg' : 'nonveg'}
                    onChange={(e) => setFormVeg(e.target.value === 'veg')}
                    className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-display text-xs font-bold text-espresso outline-none"
                  >
                    <option value="veg">Vegetarian (🟢)</option>
                    <option value="nonveg">Non-Veg (🔴)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-display text-xs font-black uppercase text-espresso block mb-1">
                  Image Upload:
                </label>
                <div className="border-2 border-dashed border-espresso rounded-xl p-4 bg-paros-cream/50 flex flex-col items-center justify-center text-center gap-2 relative">
                  {formImageUrl ? (
                    <div className="relative w-full">
                      <img src={formImageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-espresso" />
                      <button 
                        type="button" 
                        onClick={() => setFormImageUrl('')} 
                        className="absolute top-1 right-1 w-6 h-6 bg-white border border-espresso rounded-full text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-paros-orange text-2xl">
                        {isUploading ? 'cloud_sync' : 'add_photo_alternate'}
                      </span>
                      <span className="font-display text-xs font-bold">
                        {isUploading ? 'Uploading...' : 'Click or Drag Image'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className={`brutal-btn w-full py-3.5 text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal mt-2 ${
                  isUploading ? 'bg-gray-400' : 'bg-paros-orange'
                }`}
              >
                {editingItemId ? 'Save Changes ➔' : 'Add Item to Catalog ➔'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile Quick Navigation Bottom Bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-espresso shadow-brutal flex items-center justify-around py-2 px-1 pb-safe">
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
          className="flex flex-col items-center gap-0.5 text-paros-orange font-display text-[10px] font-black py-1 px-2 rounded-lg bg-paros-orange/10"
        >
          <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
          <span>Menu</span>
        </Link>
        <Link
          href="/admin/bills"
          className="flex flex-col items-center gap-0.5 text-espresso/70 hover:text-paros-orange font-display text-[10px] font-bold py-1 px-2 rounded-lg"
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          <span>Bills</span>
        </Link>
        <Link
          href="/admin"
          className="flex flex-col items-center gap-0.5 text-espresso/70 hover:text-paros-orange font-display text-[10px] font-bold py-1 px-2 rounded-lg"
        >
          <span className="material-symbols-outlined text-[20px]">monitoring</span>
          <span>Analytics</span>
        </Link>
      </nav>

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
