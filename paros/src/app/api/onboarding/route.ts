import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, createSession } from '@/lib/auth-session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { outletName, city, businessType, tableCount } = body;

    let targetCafeId = session?.cafeId || body.cafeId;
    let updatedCafe;

    if (!targetCafeId) {
      // Create new tenant if not already in session
      const cleanSlug = (outletName || 'artisan-cafe')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 30) + '-' + Math.floor(100 + Math.random() * 900);

      updatedCafe = await prisma.tenant.create({
        data: {
          name: outletName || 'Artisan Cafe',
          slug: cleanSlug,
          city: city || 'Bandra West, Mumbai',
          plan: 'GOLD',
        },
      });
      targetCafeId = updatedCafe.id;

      const newUser = await prisma.user.create({
        data: {
          cafeId: targetCafeId,
          name: 'Cafe Owner',
          role: 'OWNER',
        },
      });

      await createSession({
        userId: newUser.id,
        cafeId: targetCafeId,
        role: 'OWNER',
        name: 'Cafe Owner',
        phone: '+91 98450 11223',
      });
    } else {
      // 1. Update Cafe Details
      updatedCafe = await prisma.tenant.update({
        where: { id: targetCafeId },
        data: {
          name: outletName || 'Artisan Cafe',
          city: city || 'Bandra West, Mumbai',
          plan: 'GOLD',
        },
      });
    }

    // 2. Set up Zones & Tables
    let mainZone = await prisma.zone.findFirst({ where: { cafeId: targetCafeId } });
    if (!mainZone) {
      mainZone = await prisma.zone.create({
        data: {
          cafeId: targetCafeId,
          name: 'Main Seating',
          sortOrder: 1,
        },
      });
    }

    const count = Number(tableCount) || 8;

    // Delete existing unused tables for this cafe so fresh table count takes effect
    await prisma.table.deleteMany({
      where: { cafeId: targetCafeId, activeOrderId: null },
    }).catch(() => {});

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
          zoneId: mainZone.id,
          tableNumber: 'Takeaway',
          capacity: 0,
          currentStatus: 'AVAILABLE',
        },
      })
    );

    await Promise.all(tableCreations);

    // 3. Preload Menu Items if empty
    const existingItems = await prisma.menuItem.count({ where: { cafeId: targetCafeId } });
    if (existingItems === 0) {
      const catCoffee = await prisma.category.create({
        data: { cafeId: targetCafeId, name: 'Hot Coffee', icon: 'coffee', sortOrder: 1 },
      });
      const catIced = await prisma.category.create({
        data: { cafeId: targetCafeId, name: 'Iced Brews', icon: 'local_drink', sortOrder: 2 },
      });
      const catBakery = await prisma.category.create({
        data: { cafeId: targetCafeId, name: 'Bakery & Hearth', icon: 'bakery_dining', sortOrder: 3 },
      });
      const catToasties = await prisma.category.create({
        data: { cafeId: targetCafeId, name: 'Artisanal Toast', icon: 'breakfast_dining', sortOrder: 4 },
      });

      await Promise.all([
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catCoffee.id,
            name: 'Specialty Pour Over (Ratnagiri)',
            description: 'Single-origin light roast brewed on Hario V60',
            price: 260,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 5,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catCoffee.id,
            name: 'Flat White',
            description: 'Double ristretto espresso, velvety textured micro-foam milk',
            price: 220,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 4,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catIced.id,
            name: 'Iced Oat Latte',
            description: 'Espresso poured over Minor Figures oat milk and clear ice',
            price: 250,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 3,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catIced.id,
            name: 'Cold Brew with Tonic & Orange',
            description: '18-hour cold steeped coffee with botanical tonic',
            price: 210,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 3,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catBakery.id,
            name: 'French Butter Croissant',
            description: '27 laminated butter layers, baked fresh every morning',
            price: 180,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 2,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catBakery.id,
            name: 'Almond Frangipane Tart',
            description: 'Sweet pastry shell with toasted almond cream and roasted flakes',
            price: 210,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 3,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catToasties.id,
            name: 'Wild Herb Sourdough Toast',
            description: 'Artisanal sourdough with hand-churned salted herb butter',
            price: 160,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 5,
          },
        }),
        prisma.menuItem.create({
          data: {
            cafeId: targetCafeId,
            categoryId: catToasties.id,
            name: 'Avocado & Danish Feta Toast',
            description: 'Hass avocado mash, crumbled feta, chili flakes',
            price: 280,
            isVeg: true,
            inStock: true,
            prepTimeMinutes: 6,
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
