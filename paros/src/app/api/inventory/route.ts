import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const cafeSlug = searchParams.get('cafeSlug');
    const cafeId = searchParams.get('cafeId');

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe && cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: String(cafeId) } });
    }
    if (!cafe && cafeSlug) {
      cafe = await prisma.tenant.findFirst({ where: { slug: String(cafeSlug) } });
    }
    if (!cafe && process.env.NODE_ENV !== 'production') {
      cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    if (!cafe) {
      return NextResponse.json({ error: 'Cafe not found or unauthorized' }, { status: 404 });
    }

    // Check if inventory is empty; if so, bootstrap starter inventory and recipe linkages
    const existingCount = await prisma.inventoryItem.count({ where: { cafeId: cafe.id } });
    if (existingCount === 0) {
      const beans = await prisma.inventoryItem.create({
        data: {
          cafeId: cafe.id,
          name: 'Specialty Espresso Beans (Ratnagiri)',
          sku: 'INV-BEANS-01',
          unit: 'g',
          currentStock: 4500, // 4.5 kg
          minStockAlert: 1000, // 1 kg
          costPerUnit: 1.25, // ₹1.25/g
        },
      });

      const wholeMilk = await prisma.inventoryItem.create({
        data: {
          cafeId: cafe.id,
          name: 'Fresh Whole Milk (Farm Fresh)',
          sku: 'INV-MILK-01',
          unit: 'ml',
          currentStock: 14000, // 14 L
          minStockAlert: 3000, // 3 L
          costPerUnit: 0.07, // ₹70/L = ₹0.07/ml
        },
      });

      const oatMilk = await prisma.inventoryItem.create({
        data: {
          cafeId: cafe.id,
          name: 'Oat Milk (Barista Edition)',
          sku: 'INV-OAT-01',
          unit: 'ml',
          currentStock: 6500, // 6.5 L
          minStockAlert: 2000, // 2 L
          costPerUnit: 0.22, // ₹220/L = ₹0.22/ml
        },
      });

      const croissants = await prisma.inventoryItem.create({
        data: {
          cafeId: cafe.id,
          name: 'Butter Croissants (Fresh Baked)',
          sku: 'INV-BAKE-01',
          unit: 'pcs',
          currentStock: 18,
          minStockAlert: 6,
          costPerUnit: 45, // ₹45/pc
        },
      });

      const sourdough = await prisma.inventoryItem.create({
        data: {
          cafeId: cafe.id,
          name: 'Artisan Sourdough Slices',
          sku: 'INV-SOUR-01',
          unit: 'pcs',
          currentStock: 35,
          minStockAlert: 10,
          costPerUnit: 15, // ₹15/slice
        },
      });

      // Link sample recipes to existing menu items if found
      const menuItems = await prisma.menuItem.findMany({ where: { cafeId: cafe.id } });
      for (const item of menuItems) {
        const lowerName = item.name.toLowerCase();
        if (lowerName.includes('pour over') || lowerName.includes('americano') || lowerName.includes('espresso')) {
          await prisma.menuItemIngredient.create({
            data: { menuItemId: item.id, inventoryItemId: beans.id, quantityNeeded: 18 },
          }).catch(() => {});
        } else if (lowerName.includes('flat white') || lowerName.includes('latte') || lowerName.includes('cappuccino')) {
          await prisma.menuItemIngredient.create({
            data: { menuItemId: item.id, inventoryItemId: beans.id, quantityNeeded: 18 },
          }).catch(() => {});
          await prisma.menuItemIngredient.create({
            data: { menuItemId: item.id, inventoryItemId: lowerName.includes('oat') ? oatMilk.id : wholeMilk.id, quantityNeeded: 220 },
          }).catch(() => {});
        } else if (lowerName.includes('croissant')) {
          await prisma.menuItemIngredient.create({
            data: { menuItemId: item.id, inventoryItemId: croissants.id, quantityNeeded: 1 },
          }).catch(() => {});
        } else if (lowerName.includes('toast') || lowerName.includes('avocado')) {
          await prisma.menuItemIngredient.create({
            data: { menuItemId: item.id, inventoryItemId: sourdough.id, quantityNeeded: 2 },
          }).catch(() => {});
        }
      }
    }

    const [items, allMenuItems] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { cafeId: cafe.id },
        include: {
          recipeUsage: {
            include: {
              menuItem: {
                select: { id: true, name: true, price: true, inStock: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: { cafeId: cafe.id },
        select: { id: true, name: true, price: true, inStock: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const enrichedItems = items.map((it) => {
      const isLowStock = it.currentStock <= it.minStockAlert;
      const isDepleted = it.currentStock <= 0;
      const totalItemValue = Math.round(it.currentStock * (it.costPerUnit || 0));
      return {
        ...it,
        isLowStock,
        isDepleted,
        totalItemValue,
      };
    });

    const lowStockItems = enrichedItems.filter((i) => i.isLowStock);
    const totalInventoryValue = enrichedItems.reduce((acc, i) => acc + i.totalItemValue, 0);

    return NextResponse.json({
      success: true,
      cafe,
      items: enrichedItems,
      allMenuItems,
      summary: {
        totalItems: enrichedItems.length,
        lowStockCount: lowStockItems.length,
        totalInventoryValue,
      },
    });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { action, cafeId } = body;

    let targetCafeId = session?.cafeId;
    if (!targetCafeId && cafeId) {
      const c = await prisma.tenant.findUnique({ where: { id: String(cafeId).slice(0, 60) } });
      targetCafeId = c?.id;
    }
    if (!targetCafeId && process.env.NODE_ENV !== 'production') {
      const def = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
      targetCafeId = def?.id;
    }

    if (!targetCafeId) {
      return NextResponse.json({ error: 'Valid cafe context or session required' }, { status: 401 });
    }

    // 1. Create Raw Material / Inventory Item
    if (action === 'create-item') {
      const { name, sku, unit, currentStock, minStockAlert, costPerUnit } = body;
      const cleanName = String(name || '').slice(0, 100).trim();
      if (!cleanName) {
        return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
      }

      const item = await prisma.inventoryItem.create({
        data: {
          cafeId: targetCafeId,
          name: cleanName,
          sku: sku ? String(sku).slice(0, 50).trim() : null,
          unit: String(unit || 'g').slice(0, 10).trim(),
          currentStock: Math.max(0, Number(currentStock) || 0),
          minStockAlert: Math.max(0, Number(minStockAlert) || 10),
          costPerUnit: Math.max(0, Number(costPerUnit) || 0),
        },
      });

      return NextResponse.json({ success: true, item });
    }

    // 2. Adjust Stock / Quick Restock / Spoilage Deduction
    if (action === 'adjust-stock') {
      const { itemId, adjustmentQuantity, reason } = body;
      const item = await prisma.inventoryItem.findUnique({ where: { id: String(itemId).slice(0, 60) } });
      if (!item) {
        return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
      }
      if (item.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Unauthorized to modify this item' }, { status: 403 });
      }

      const delta = Number(adjustmentQuantity);
      if (isNaN(delta)) {
        return NextResponse.json({ error: 'Valid adjustment number required' }, { status: 400 });
      }

      const newStock = Math.max(0, item.currentStock + delta);
      const updated = await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: newStock },
      });

      return NextResponse.json({
        success: true,
        item: updated,
        reason: reason ? String(reason).slice(0, 100) : 'Manual Adjustment',
      });
    }

    // 3. Link Recipe (Map MenuItem to InventoryItem portion)
    if (action === 'link-recipe') {
      const { menuItemId, inventoryItemId, quantityNeeded } = body;
      const numQty = Number(quantityNeeded);
      if (isNaN(numQty) || numQty <= 0) {
        return NextResponse.json({ error: 'Valid positive portion quantity required' }, { status: 400 });
      }

      const [menuItem, invItem] = await Promise.all([
        prisma.menuItem.findUnique({ where: { id: String(menuItemId).slice(0, 60) } }),
        prisma.inventoryItem.findUnique({ where: { id: String(inventoryItemId).slice(0, 60) } }),
      ]);

      if (!menuItem || !invItem) {
        return NextResponse.json({ error: 'Invalid MenuItem or InventoryItem ID' }, { status: 404 });
      }

      if (menuItem.cafeId !== targetCafeId || invItem.cafeId !== targetCafeId) {
        return NextResponse.json({ error: 'Tenant mismatch on recipe link' }, { status: 403 });
      }

      const recipe = await prisma.menuItemIngredient.upsert({
        where: {
          menuItemId_inventoryItemId: {
            menuItemId: menuItem.id,
            inventoryItemId: invItem.id,
          },
        },
        update: { quantityNeeded: numQty },
        create: {
          menuItemId: menuItem.id,
          inventoryItemId: invItem.id,
          quantityNeeded: numQty,
        },
      });

      return NextResponse.json({ success: true, recipe });
    }

    // 4. Delete Recipe Link
    if (action === 'delete-recipe-link') {
      const { menuItemId, inventoryItemId } = body;
      await prisma.menuItemIngredient.deleteMany({
        where: {
          menuItemId: String(menuItemId),
          inventoryItemId: String(inventoryItemId),
        },
      });
      return NextResponse.json({ success: true });
    }

    // 5. Delete Inventory Item
    if (action === 'delete-item') {
      const { itemId } = body;
      const item = await prisma.inventoryItem.findUnique({ where: { id: String(itemId).slice(0, 60) } });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      if (item.cafeId !== targetCafeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

      await prisma.inventoryItem.delete({ where: { id: item.id } });
      return NextResponse.json({ success: true, deletedId: item.id });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: 'Failed to process inventory request' }, { status: 500 });
  }
}
