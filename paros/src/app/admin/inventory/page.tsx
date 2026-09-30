'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RecipeUsage {
  id: string;
  quantityNeeded: number;
  menuItem: {
    id: string;
    name: string;
    price: number;
    inStock: boolean;
  };
}

interface InventoryItemData {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  currentStock: number;
  minStockAlert: number;
  costPerUnit?: number | null;
  isLowStock: boolean;
  isDepleted: boolean;
  totalItemValue: number;
  recipeUsage?: RecipeUsage[];
}

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

interface CouponData {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  isActive: boolean;
  usageCount: number;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'coupons'>('inventory');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [outletName, setOutletName] = useState('Artisan Roastery');

  // Inventory Items State
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    lowStockCount: 0,
    totalInventoryValue: 0,
  });

  // Coupons State
  const [coupons, setCoupons] = useState<CouponData[]>([]);

  // Restock Modal
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<InventoryItemData | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [restockReason, setRestockReason] = useState('Supplier Delivery');

  // Add Material Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newUnit, setNewUnit] = useState('g');
  const [newStock, setNewStock] = useState('1000');
  const [newMinAlert, setNewMinAlert] = useState('200');
  const [newCost, setNewCost] = useState('1.0');

  // Recipe Link Modal
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeInvItem, setRecipeInvItem] = useState<InventoryItemData | null>(null);
  const [recipeSelectedMenuItem, setRecipeSelectedMenuItem] = useState('');
  const [recipePortionQty, setRecipePortionQty] = useState('');

  // Add Coupon Modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinOrder, setCouponMinOrder] = useState('200');
  const [couponMaxCap, setCouponMaxCap] = useState('100');

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Load Inventory Data
  function loadInventory() {
    fetch('/api/inventory')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.cafe?.name) setOutletName(data.cafe.name);
          if (data.items) setItems(data.items);
          if (data.allMenuItems) setMenuItems(data.allMenuItems);
          if (data.summary) setSummary(data.summary);
        }
      })
      .catch(() => {});
  }

  // Load Coupons Data
  function loadCoupons() {
    fetch('/api/coupons')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.coupons) setCoupons(data.coupons);
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadInventory();
    loadCoupons();
  }, []);

  // Quick Restock Submit
  async function handleRestockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restockItem || !restockAmount) return;

    const num = Number(restockAmount);
    if (isNaN(num) || num === 0) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust-stock',
          itemId: restockItem.id,
          adjustmentQuantity: num,
          reason: restockReason,
        }),
      });

      if (res.ok) {
        showToast(`✓ Stock updated for ${restockItem.name}: +${num} ${restockItem.unit}`);
        setIsRestockModalOpen(false);
        setRestockAmount('');
        loadInventory();
      }
    } catch {
      showToast('⚠️ Failed to adjust stock');
    }
  }

  // Add Raw Material Submit
  async function handleAddMaterialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-item',
          name: newName,
          sku: newSku,
          unit: newUnit,
          currentStock: Number(newStock) || 0,
          minStockAlert: Number(newMinAlert) || 10,
          costPerUnit: Number(newCost) || 0,
        }),
      });

      if (res.ok) {
        showToast(`✓ Added raw material: ${newName}`);
        setIsAddModalOpen(false);
        setNewName('');
        setNewSku('');
        loadInventory();
      }
    } catch {
      showToast('⚠️ Failed to create raw material');
    }
  }

  // Recipe Link Submit
  async function handleRecipeLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeInvItem || !recipeSelectedMenuItem || !recipePortionQty) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link-recipe',
          menuItemId: recipeSelectedMenuItem,
          inventoryItemId: recipeInvItem.id,
          quantityNeeded: Number(recipePortionQty),
        }),
      });

      if (res.ok) {
        showToast(`✓ Recipe linked: ${recipePortionQty} ${recipeInvItem.unit} per order`);
        setIsRecipeModalOpen(false);
        setRecipePortionQty('');
        loadInventory();
      }
    } catch {
      showToast('⚠️ Failed to link recipe');
    }
  }

  // Delete Material
  async function handleDeleteMaterial(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete raw material "${name}"?`)) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-item', itemId: id }),
      });

      if (res.ok) {
        showToast(`Deleted ${name}`);
        loadInventory();
      }
    } catch {
      showToast('⚠️ Failed to delete material');
    }
  }

  // Add Coupon Submit
  async function handleAddCouponSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode) return;

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          code: couponCode,
          discountType: couponType,
          discountValue: Number(couponValue) || 10,
          minOrderValue: Number(couponMinOrder) || 0,
          maxDiscount: couponType === 'PERCENTAGE' ? Number(couponMaxCap) || null : null,
        }),
      });

      if (res.ok) {
        showToast(`✓ Promo code ${couponCode.toUpperCase()} created!`);
        setIsCouponModalOpen(false);
        setCouponCode('');
        loadCoupons();
      }
    } catch {
      showToast('⚠️ Failed to create coupon');
    }
  }

  // Toggle Coupon Active
  async function toggleCouponActive(couponId: string) {
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-active', couponId }),
      });
      if (res.ok) {
        loadCoupons();
      }
    } catch {
      showToast('⚠️ Failed to update coupon');
    }
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex antialiased select-none">
      {/* ── Left Sidebar Navigation ── */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r-2 border-espresso z-50 flex flex-col justify-between py-6 px-4 shadow-brutal-sm">
        <div className="flex flex-col gap-6">
          {/* Brand */}
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

          {/* Location Chip */}
          <div className="p-3 bg-paros-cream rounded-xl border-2 border-espresso flex items-center justify-between shadow-brutal-sm">
            <div>
              <p className="font-display text-[9px] uppercase font-bold text-espresso/60">Active Outlet</p>
              <p className="font-display text-xs font-black text-espresso truncate">{outletName}</p>
            </div>
            <span className="material-symbols-outlined text-espresso/70 text-[18px]">storefront</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 font-display text-xs font-bold">
            <Link
              href="/pos"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
              <span>Register / POS</span>
            </Link>
            <Link
              href="/kds"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">soup_kitchen</span>
              <span>Kitchen KDS</span>
            </Link>
            <Link
              href="/order"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
              <span>Table QR Menu</span>
            </Link>
            <Link
              href="/admin/menu"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
              <span>Menu Catalog</span>
            </Link>
            <Link
              href="/admin/qr"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso"
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
              <span>🖨️ QR Print Studio</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-paros-orange text-white border-2 border-espresso shadow-brutal-sm font-black"
            >
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              <span>📦 Inventory & Recipes</span>
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-paros-yellow/40 transition-colors text-espresso font-bold"
            >
              <span className="material-symbols-outlined text-[20px]">monitoring</span>
              <span>Financial Analytics</span>
            </Link>
          </nav>
        </div>

        {/* System Footnote */}
        <div className="pt-4 border-t-2 border-dashed border-espresso/20 flex flex-col gap-1 text-[11px] font-display">
          <p className="font-black text-espresso/70">Paros Cafe Engine v2.4</p>
          <p className="text-espresso/50">Auto-Deduction & Stock Control</p>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="ml-64 flex-1 flex flex-col min-w-0 p-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-espresso">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-black tracking-tight text-espresso">
                Inventory & Recipe Portioning
              </h1>
              <span className="px-3 py-1 bg-paros-mint text-espresso border-2 border-espresso rounded-full text-xs font-black uppercase shadow-brutal-sm">
                Phase 3 Engine
              </span>
            </div>
            <p className="text-sm text-espresso/70 mt-1">
              Raw materials, automated portion deduction, low-stock alerts, and loyalty coupons.
            </p>
          </div>

          {/* Action Tabs & Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="inline-flex p-1 bg-white border-2 border-espresso rounded-xl shadow-brutal-sm">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 rounded-lg font-display font-black text-xs uppercase transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-paros-orange text-white border border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow/40'
                }`}
              >
                📦 Raw Materials
              </button>
              <button
                onClick={() => setActiveTab('coupons')}
                className={`px-4 py-2 rounded-lg font-display font-black text-xs uppercase transition-all ${
                  activeTab === 'coupons'
                    ? 'bg-paros-orange text-white border border-espresso shadow-brutal-sm'
                    : 'text-espresso hover:bg-paros-yellow/40'
                }`}
              >
                🎟️ Loyalty & Coupons
              </button>
            </div>

            {activeTab === 'inventory' ? (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-espresso bg-paros-yellow font-display font-black text-xs uppercase shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Add Material</span>
              </button>
            ) : (
              <button
                onClick={() => setIsCouponModalOpen(true)}
                className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-espresso bg-paros-mint font-display font-black text-xs uppercase shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Create Coupon</span>
              </button>
            )}
          </div>
        </header>

        {/* Low Stock Urgent Alert Banner */}
        {summary.lowStockCount > 0 && activeTab === 'inventory' && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-100 border-2 border-espresso shadow-brutal flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-espresso flex items-center justify-center text-espresso font-black">
                ⚠️
              </span>
              <div>
                <p className="font-display font-black text-sm text-espresso">
                  Stock Alert: {summary.lowStockCount} raw material(s) reached low stock threshold!
                </p>
                <p className="text-xs text-espresso/70 mt-0.5">
                  Orders will automatically deplete stock. Tap &ldquo;Restock&rdquo; on any item to log fresh supply.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white border border-espresso rounded-lg text-xs font-black uppercase text-amber-700">
              Action Required
            </span>
          </div>
        )}

        {/* Top KPI Metrics Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border-2 border-espresso shadow-brutal">
            <p className="font-display text-xs font-black uppercase text-espresso/60">Total Raw Materials</p>
            <p className="font-display text-3xl font-black text-espresso mt-1 tabular-nums">
              {summary.totalItems}
            </p>
            <p className="text-xs text-espresso/60 mt-1 font-medium">Ingredients & goods monitored</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border-2 border-espresso shadow-brutal">
            <p className="font-display text-xs font-black uppercase text-espresso/60">Low Stock Warnings</p>
            <p className={`font-display text-3xl font-black mt-1 tabular-nums ${summary.lowStockCount > 0 ? 'text-amber-600' : 'text-paros-matcha'}`}>
              {summary.lowStockCount}
            </p>
            <p className="text-xs text-espresso/60 mt-1 font-medium">
              {summary.lowStockCount > 0 ? 'Urgent restock advised' : 'All raw materials healthy'}
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border-2 border-espresso shadow-brutal">
            <p className="font-display text-xs font-black uppercase text-espresso/60">Estimated Stock Value</p>
            <p className="font-display text-3xl font-black text-paros-orange mt-1 tabular-nums">
              ₹{summary.totalInventoryValue.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-espresso/60 mt-1 font-medium">Based on cost per portion unit</p>
          </div>
        </div>

        {/* ── TAB 1: RAW MATERIALS INVENTORY ── */}
        {activeTab === 'inventory' && (
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black text-espresso uppercase tracking-wider">
                Raw Material Supplies & Recipes
              </h2>
              <span className="text-xs font-bold text-espresso/60">
                Auto-deducted on counter settlement & table QR orders
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((it) => {
                const percent = Math.min(100, Math.round((it.currentStock / (it.minStockAlert * 3)) * 100));
                return (
                  <div
                    key={it.id}
                    className={`bg-white rounded-2xl border-2 border-espresso p-5 flex flex-col justify-between shadow-brutal transition-transform hover:-translate-y-0.5 ${
                      it.isDepleted ? 'bg-red-50/50' : it.isLowStock ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-black text-base text-espresso leading-snug">
                            {it.name}
                          </h3>
                          {it.sku && (
                            <span className="text-[10px] font-mono font-bold text-espresso/50">
                              {it.sku}
                            </span>
                          )}
                        </div>

                        {it.isDepleted ? (
                          <span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-400 rounded-md text-[10px] font-black uppercase shrink-0">
                            Depleted (0)
                          </span>
                        ) : it.isLowStock ? (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-400 rounded-md text-[10px] font-black uppercase shrink-0">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-paros-mint text-green-800 border border-green-400 rounded-md text-[10px] font-black uppercase shrink-0">
                            Optimal
                          </span>
                        )}
                      </div>

                      {/* Stock Level Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between items-baseline text-xs mb-1">
                          <span className="font-display font-bold text-espresso/60">Current Stock</span>
                          <span className="font-display font-black text-base text-espresso tabular-nums">
                            {it.currentStock.toLocaleString('en-IN')} <span className="text-xs font-normal text-espresso/70">{it.unit}</span>
                          </span>
                        </div>
                        <div className="w-full h-3 bg-surface-container rounded-full border border-espresso overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              it.isDepleted
                                ? 'bg-red-500'
                                : it.isLowStock
                                ? 'bg-amber-400'
                                : 'bg-paros-matcha'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-espresso/50 font-bold mt-1">
                          <span>Alert at &le; {it.minStockAlert} {it.unit}</span>
                          <span>Cost: ₹{it.costPerUnit || 0}/{it.unit}</span>
                        </div>
                      </div>

                      {/* Linked Recipes */}
                      <div className="mt-4 pt-3 border-t border-dashed border-espresso/20">
                        <p className="text-[10px] font-display font-black uppercase tracking-wider text-espresso/50 mb-1.5">
                          Linked Menu Recipes ({it.recipeUsage?.length || 0})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {it.recipeUsage && it.recipeUsage.length > 0 ? (
                            it.recipeUsage.map((r) => (
                              <span
                                key={r.id}
                                className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-lg border border-espresso/40 text-[11px] font-bold text-espresso"
                              >
                                <span>{r.menuItem.name}</span>
                                <span className="text-[10px] font-mono text-paros-orange">
                                  ({r.quantityNeeded}{it.unit})
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-espresso/40 italic">
                              No recipes mapped yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 pt-3 border-t-2 border-espresso/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setRestockItem(it);
                          setIsRestockModalOpen(true);
                        }}
                        className="brutal-btn flex-1 py-2 px-3 rounded-xl bg-paros-yellow text-espresso font-display font-black text-xs uppercase border-2 border-espresso shadow-brutal-sm flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>Restock</span>
                      </button>

                      <button
                        onClick={() => {
                          setRecipeInvItem(it);
                          setIsRecipeModalOpen(true);
                        }}
                        className="p-2 rounded-xl border-2 border-espresso hover:bg-paros-cream transition-colors text-espresso"
                        title="Link recipe portions"
                      >
                        <span className="material-symbols-outlined text-[18px]">hub</span>
                      </button>

                      <button
                        onClick={() => handleDeleteMaterial(it.id, it.name)}
                        className="p-2 rounded-xl border-2 border-espresso hover:bg-red-50 text-red-600 transition-colors"
                        title="Delete material"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2: PROMO COUPONS & LOYALTY ── */}
        {activeTab === 'coupons' && (
          <div className="mt-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-black text-espresso uppercase tracking-wider">
                  Discount Coupons & Customer Loyalty
                </h2>
                <p className="text-xs text-espresso/70 mt-0.5">
                  Live promo codes valid during counter settlement and guest table QR self-checkout.
                </p>
              </div>

              <button
                onClick={() => setIsCouponModalOpen(true)}
                className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-espresso bg-paros-orange text-white font-display font-black text-xs uppercase shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Create New Promo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className={`bg-white rounded-2xl border-2 border-espresso p-5 flex flex-col justify-between shadow-brutal ${
                    !c.isActive ? 'opacity-60 bg-gray-50' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-paros-orange text-[22px]">
                          confirmation_number
                        </span>
                        <span className="font-mono text-xl font-black tracking-wider text-espresso bg-paros-yellow/40 px-2 py-0.5 rounded-lg border border-espresso">
                          {c.code}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleCouponActive(c.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border border-espresso transition-all ${
                          c.isActive ? 'bg-paros-mint text-green-900' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Paused'}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-col gap-1.5">
                      <p className="font-display text-2xl font-black text-espresso">
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
                      </p>
                      <p className="text-xs text-espresso/70 font-medium">
                        Min. Order: ₹{c.minOrderValue}
                        {c.maxDiscount ? ` • Max Cap: ₹${c.maxDiscount}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t-2 border-dashed border-espresso/20 flex items-center justify-between text-xs">
                    <span className="font-display font-bold text-espresso/60">
                      Redeemed {c.usageCount} time(s)
                    </span>
                    <button
                      onClick={() => toggleCouponActive(c.id)}
                      className="font-display font-bold text-paros-orange hover:underline text-xs"
                    >
                      {c.isActive ? 'Pause Code' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: QUICK RESTOCK ── */}
      {isRestockModalOpen && restockItem && (
        <div className="fixed inset-0 z-50 bg-espresso/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b-2 border-espresso">
              <div>
                <h3 className="font-display text-xl font-black text-espresso">Quick Restock</h3>
                <p className="text-xs text-espresso/60 mt-0.5">{restockItem.name}</p>
              </div>
              <button
                onClick={() => setIsRestockModalOpen(false)}
                className="w-8 h-8 rounded-lg border-2 border-espresso flex items-center justify-center hover:bg-paros-yellow"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1.5">
                  Restock Quantity ({restockItem.unit})
                </label>
                <div className="flex gap-2 mb-2">
                  {[
                    restockItem.unit === 'g' ? 1000 : restockItem.unit === 'ml' ? 5000 : 10,
                    restockItem.unit === 'g' ? 2500 : restockItem.unit === 'ml' ? 10000 : 25,
                    restockItem.unit === 'g' ? 5000 : restockItem.unit === 'ml' ? 20000 : 50,
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRestockAmount(String(preset))}
                      className="flex-1 py-1.5 bg-surface-container border border-espresso rounded-lg font-display text-xs font-bold hover:bg-paros-yellow"
                    >
                      +{preset} {restockItem.unit}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  placeholder={`e.g. 1000`}
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-espresso font-display font-black text-lg focus:ring-2 focus:ring-paros-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1.5">
                  Reason / Source
                </label>
                <select
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                >
                  <option value="Supplier Delivery">Supplier Delivery</option>
                  <option value="Emergency Store Purchase">Emergency Store Purchase</option>
                  <option value="Stock Audit Correction">Stock Audit Correction</option>
                </select>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-espresso font-display font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="brutal-btn flex-1 py-3 rounded-xl bg-paros-orange text-white border-2 border-espresso font-display font-black text-xs uppercase shadow-brutal"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD RAW MATERIAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-espresso/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b-2 border-espresso">
              <h3 className="font-display text-xl font-black text-espresso">Add Raw Material</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg border-2 border-espresso flex items-center justify-center hover:bg-paros-yellow"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMaterialSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vanilla Bean Syrup"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="L">Liters (L)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                    SKU Code (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-SYRUP-01"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-black uppercase text-espresso/70 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-black uppercase text-espresso/70 mb-1">
                    Min Alert Level
                  </label>
                  <input
                    type="number"
                    value={newMinAlert}
                    onChange={(e) => setNewMinAlert(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-black uppercase text-espresso/70 mb-1">
                    Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-espresso font-display font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="brutal-btn flex-1 py-3 rounded-xl bg-paros-orange text-white border-2 border-espresso font-display font-black text-xs uppercase shadow-brutal"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LINK RECIPE TO MENU ITEM ── */}
      {isRecipeModalOpen && recipeInvItem && (
        <div className="fixed inset-0 z-50 bg-espresso/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b-2 border-espresso">
              <div>
                <h3 className="font-display text-xl font-black text-espresso">Link Recipe Portion</h3>
                <p className="text-xs text-espresso/60 mt-0.5">{recipeInvItem.name}</p>
              </div>
              <button
                onClick={() => setIsRecipeModalOpen(false)}
                className="w-8 h-8 rounded-lg border-2 border-espresso flex items-center justify-center hover:bg-paros-yellow"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecipeLinkSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                  Select Menu Item *
                </label>
                <select
                  required
                  value={recipeSelectedMenuItem}
                  onChange={(e) => setRecipeSelectedMenuItem(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                >
                  <option value="">-- Choose Menu Item --</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (₹{m.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                  Deduction Portion per Order ({recipeInvItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder={`e.g. ${recipeInvItem.unit === 'g' ? '18' : recipeInvItem.unit === 'ml' ? '200' : '1'}`}
                  value={recipePortionQty}
                  onChange={(e) => setRecipePortionQty(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-espresso font-display font-black text-lg outline-none"
                />
                <p className="text-[11px] text-espresso/50 mt-1">
                  Every time this item is ordered, this exact portion is subtracted from inventory.
                </p>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-espresso font-display font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="brutal-btn flex-1 py-3 rounded-xl bg-paros-orange text-white border-2 border-espresso font-display font-black text-xs uppercase shadow-brutal"
                >
                  Save Recipe Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE COUPON ── */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-espresso/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b-2 border-espresso">
              <h3 className="font-display text-xl font-black text-espresso">Create Promo Coupon</h3>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="w-8 h-8 rounded-lg border-2 border-espresso flex items-center justify-center hover:bg-paros-yellow"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCouponSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-espresso font-mono font-black text-lg outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as 'PERCENTAGE' | 'FLAT')}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Cash (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-espresso font-display font-black text-base outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    value={couponMinOrder}
                    onChange={(e) => setCouponMinOrder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                  />
                </div>
                {couponType === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-xs font-display font-black uppercase text-espresso/70 mb-1">
                      Max Discount Cap (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={couponMaxCap}
                      onChange={(e) => setCouponMaxCap(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-espresso font-body text-sm outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-espresso font-display font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="brutal-btn flex-1 py-3 rounded-xl bg-paros-orange text-white border-2 border-espresso font-display font-black text-xs uppercase shadow-brutal"
                >
                  Save Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-espresso text-white px-5 py-3 rounded-2xl border-2 border-espresso shadow-brutal font-display font-black text-sm animate-in fade-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
