import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { outletName, city, businessType, tableCount } = body;

    const targetCafeId = session?.cafeId || body.cafeId;
    if (!targetCafeId) {
      return NextResponse.json({ error: 'Unauthorized or missing cafeId' }, { status: 401 });
    }

    // 1. Update Cafe Details
    const updatedCafe = await prisma.tenant.update({
      where: { id: targetCafeId },
      data: {
        name: outletName || 'Artisan Cafe',
        city: city || 'Bandra West, Mumbai',
        plan: 'GOLD',
      },
    });

    // 2. Set up Zones & Tables
    const existingTables = await prisma.table.count({ where: { cafeId: targetCafeId } });
    if (existingTables === 0) {
      const mainZone = await prisma.zone.create({
        data: {
          cafeId: targetCafeId,
          name: 'Main Seating',
          sortOrder: 1,
        },
      });

      const count = Number(tableCount) || 8;
      const tableCreations = [];

      for (let i = 1; i <= count; i++) {
        tableCreations.push(
          prisma.table.create({
            data: {
              cafeId: targetCafeId,
              zoneId: mainZone.id,
              tableNumber: i.toString(),
              capacity: 4,
              currentStatus: 'AVAILABLE',
            },
          })
        );
      }

      // Always include Takeaway / Counter
      tableCreations.push(
        prisma.table.create({
          data: {
            cafeId: targetCafeId,
            tableNumber: 'Takeaway',
            capacity: 0,
            currentStatus: 'AVAILABLE',
          },
        })
      );

      await Promise.all(tableCreations);
    }

    // 3. Preload Sample Menu if empty
    const existingItems = await prisma.menuItem.count({ where: { cafeId: targetCafeId } });
    if (existingItems === 0) {
      const catCoffee = await prisma.category.create({
        data: { cafeId: targetCafeId, name: 'Espresso & Brews', icon: 'coffee', sortOrder: 1 },
      });
      const catBakery = await prisma.category.create({
        data: { cafeId: targetCafeId, name: 'Artisan Bakery', icon: 'bakery_dining', sortOrder: 2 },
      });
      const catToasties = await prisma.category.create({
        data: { cafeId: targetCafeId, name: 'Sourdough Toasties', icon: 'breakfast_dining', sortOrder: 3 },
      });

      await Promise.all([
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catCoffee.id,
            name: 'Flat White (Oat Milk)',
            description: 'Double ristretto espresso, velvety textured oat milk',
            price: 260,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 5,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catBakery.id,
            name: 'French Butter Croissant',
            description: '27-layer laminated all-butter flaky pastry',
            price: 180,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 3,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catToasties.id,
            name: 'Truffle Mushroom Toast',
            description: 'Sourdough toast, wild sautéed mushrooms, truffle drizzle',
            price: 340,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 8,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catCoffee.id,
            name: 'Cold Brew Tonic',
            description: '18-hour steep with botanical tonic water and charred orange',
            price: 220,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 3,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catBakery.id,
            name: 'Basque Burnt Cheesecake',
            description: 'Creamy caramelised Spanish cheesecake slice',
            price: 280,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 2,
          },
        }),
      ]);
    }

    // 4. Initialize Cash Register Shift
    const activeShift = await prisma.cashShift.findFirst({
      where: { cafeId: targetCafeId, status: 'OPEN' },
    });

    if (!activeShift) {
      await prisma.cashShift.create({
        data: {
          cafeId: targetCafeId,
          userId: session?.userId,
          status: 'OPEN',
          openingCash: 2000,
          cashSales: 0,
          pettyExpenses: 0,
          expectedCash: 2000,
          notes: 'Initial register float opened on onboarding.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      cafe: updatedCafe,
      redirectUrl: '/pos',
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error during onboarding' }, { status: 500 });
  }
}
