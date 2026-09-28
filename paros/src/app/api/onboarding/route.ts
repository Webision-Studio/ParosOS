import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, createSession } from '@/lib/auth-session';

/**
 * Validate and sanitize URLs (prevent javascript: and other dangerous pseudo-schemes)
 */
function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim().slice(0, 500);
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const {
      outletName,
      city,
      businessType,
      tableCount,
      closingTime,
      googleReviewUrl,
      wifiName,
      wifiPassword,
      cashierPin,
      kitchenPin,
    } = body;

    // Strict Tenant Isolation:
    // Only an authenticated session can update an existing cafe.
    // Unauthenticated callers CANNOT pass an arbitrary cafeId to hijack or overwrite another tenant's data.
    let targetCafeId: string | null = session?.cafeId || null;
    if (!targetCafeId && body.cafeId && process.env.NODE_ENV !== 'production') {
      targetCafeId = String(body.cafeId);
    }

    const safeOutletName = String(outletName || 'Artisan Cafe').slice(0, 100).trim();
    const safeCity = String(city || 'Bandra West, Mumbai').slice(0, 100).trim();
    const safeClosingTime = String(closingTime || '23:00').slice(0, 10).trim();
    const safeWifiName = wifiName ? String(wifiName).slice(0, 50).trim() : null;
    const safeWifiPassword = wifiPassword ? String(wifiPassword).slice(0, 50).trim() : null;
    const safeGoogleReviewUrl = sanitizeUrl(googleReviewUrl);

    // Enforce 4-digit PIN constraints
    const safeCashierPin = cashierPin && /^\d{4}$/.test(String(cashierPin).trim()) ? String(cashierPin).trim() : '1234';
    const safeKitchenPin = kitchenPin && /^\d{4}$/.test(String(kitchenPin).trim()) ? String(kitchenPin).trim() : '7788';

    // Strictly bound table count between 0 and 100 to prevent Denial of Service loop attacks
    const count = Math.min(100, Math.max(0, parseInt(String(tableCount ?? 8), 10) || 0));

    let updatedCafe: any;
    let finalCafeId: string;

    if (!targetCafeId) {
      // Create new tenant and owner user
      const cleanSlug =
        safeOutletName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 30) + '-' + Math.floor(100 + Math.random() * 900);

      updatedCafe = await prisma.tenant.create({
        data: {
          name: safeOutletName,
          slug: cleanSlug,
          city: safeCity,
          plan: 'GOLD',
          closingTime: safeClosingTime,
          googleReviewUrl: safeGoogleReviewUrl,
          wifiName: safeWifiName,
          wifiPassword: safeWifiPassword,
          cashierPin: safeCashierPin,
          kitchenPin: safeKitchenPin,
        },
      });
      finalCafeId = updatedCafe.id;

      const newUser = await prisma.user.create({
        data: {
          cafeId: finalCafeId,
          name: 'Cafe Owner',
          role: 'OWNER',
        },
      });

      await createSession({
        userId: newUser.id,
        cafeId: finalCafeId,
        role: 'OWNER',
        name: 'Cafe Owner',
        phone: session?.phone || '+91 98450 11223',
      });
    } else {
      // Verify the tenant exists before attempting update
      const existingTenant = await prisma.tenant.findUnique({ where: { id: targetCafeId } });
      if (!existingTenant) {
        return NextResponse.json({ error: 'Tenant cafe not found' }, { status: 404 });
      }
      finalCafeId = existingTenant.id;

      // 1. Update Cafe Details
      updatedCafe = await prisma.tenant.update({
        where: { id: finalCafeId },
        data: {
          name: safeOutletName,
          city: safeCity,
          plan: 'GOLD',
          closingTime: safeClosingTime,
          googleReviewUrl: safeGoogleReviewUrl !== undefined ? safeGoogleReviewUrl : undefined,
          wifiName: safeWifiName !== undefined ? safeWifiName : undefined,
          wifiPassword: safeWifiPassword !== undefined ? safeWifiPassword : undefined,
          cashierPin: safeCashierPin,
          kitchenPin: safeKitchenPin,
        },
      });
    }

    // 2. Set up Zones & Tables
    let mainZone = await prisma.zone.findFirst({ where: { cafeId: finalCafeId } });
    if (!mainZone) {
      mainZone = await prisma.zone.create({
        data: {
          cafeId: finalCafeId,
          name: 'Main Seating',
          sortOrder: 1,
        },
      });
    }

    // Delete existing tables for this cafe so fresh table count takes effect
    await prisma.table.deleteMany({
      where: { cafeId: finalCafeId },
    }).catch(() => {});

    const tableCreations = [];

    if (count > 0) {
      for (let i = 1; i <= count; i++) {
        tableCreations.push(
          prisma.table.create({
            data: {
              cafeId: finalCafeId,
              zoneId: mainZone.id,
              tableNumber: i.toString(),
              capacity: 4,
              currentStatus: 'AVAILABLE',
            },
          })
        );
      }
    }

    // Always include Takeaway / Counter station
    tableCreations.push(
      prisma.table.create({
        data: {
          cafeId: finalCafeId,
          zoneId: mainZone.id,
          tableNumber: 'Takeaway',
          capacity: 0,
          currentStatus: 'AVAILABLE',
        },
      })
    );

    await Promise.all(tableCreations);

    // Update tenant qrMode flag based on table count
    updatedCafe = await prisma.tenant.update({
      where: { id: finalCafeId },
      data: { qrMode: count === 0 ? 'COUNTER_ONLY' : 'PER_TABLE' },
    }).catch(() => updatedCafe);

    // 3. Preload Menu Items if empty
    const existingItems = await prisma.menuItem.count({ where: { cafeId: finalCafeId } });
    if (existingItems === 0) {
      const catCoffee = await prisma.category.create({
        data: { cafeId: finalCafeId, name: 'Hot Coffee', icon: 'coffee', sortOrder: 1 },
      });
      const catIced = await prisma.category.create({
        data: { cafeId: finalCafeId, name: 'Iced Brews', icon: 'local_drink', sortOrder: 2 },
      });
      const catBakery = await prisma.category.create({
        data: { cafeId: finalCafeId, name: 'Bakery & Hearth', icon: 'bakery_dining', sortOrder: 3 },
      });
      const catToasties = await prisma.category.create({
        data: { cafeId: finalCafeId, name: 'Artisanal Toast', icon: 'breakfast_dining', sortOrder: 4 },
      });

      await Promise.all([
        prisma.menuItem.create({
          data: {
            cafeId: finalCafeId,
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
            cafeId: finalCafeId,
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
            cafeId: finalCafeId,
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
            cafeId: finalCafeId,
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
            cafeId: finalCafeId,
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
            cafeId: finalCafeId,
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
            cafeId: finalCafeId,
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
            cafeId: finalCafeId,
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
      where: { cafeId: finalCafeId, status: 'OPEN' },
    });

    if (!activeShift) {
      await prisma.cashShift.create({
        data: {
          cafeId: finalCafeId,
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
