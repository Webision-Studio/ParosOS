import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Paros database with sample cafe...');

  // Clean existing data
  await prisma.expense.deleteMany();
  await prisma.cashShift.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 1. Create Cafe
  const cafe = await prisma.tenant.create({
    data: {
      name: 'Artisan Roastery & Bakehouse',
      slug: 'artisan-roastery',
      city: 'Indiranagar, Bengaluru',
      address: '12th Main Rd, HAL 2nd Stage, Indiranagar',
      phone: '+91 98450 11223',
      email: 'hello@artisanroastery.in',
      gstin: '29AABCU9603R1Z7',
      plan: 'GOLD',
      qrMode: 'MODE_A',
      upiId: 'artisanroastery@okaxis',
      enableKds: true,
      enableWhatsapp: true,
    },
  });

  // 2. Create Owner User
  const owner = await prisma.user.create({
    data: {
      cafeId: cafe.id,
      name: 'Chef Kabir',
      phone: '+91 98450 11223',
      email: 'kabir@artisanroastery.in',
      role: 'OWNER',
    },
  });

  // 3. Create Zones
  const indoor = await prisma.zone.create({
    data: {
      cafeId: cafe.id,
      name: 'Main Indoor AC',
      sortOrder: 1,
    },
  });

  const patio = await prisma.zone.create({
    data: {
      cafeId: cafe.id,
      name: 'Garden Patio',
      sortOrder: 2,
    },
  });

  // 4. Create Tables (T1-T8 + Takeaway)
  const tables = await Promise.all([
    prisma.table.create({ data: { cafeId: cafe.id, zoneId: indoor.id, tableNumber: '1', capacity: 2, currentStatus: 'AVAILABLE' } }),
    prisma.table.create({ data: { cafeId: cafe.id, zoneId: indoor.id, tableNumber: '2', capacity: 4, currentStatus: 'AVAILABLE' } }),
    prisma.table.create({ data: { cafeId: cafe.id, zoneId: indoor.id, tableNumber: '3', capacity: 2, currentStatus: 'AVAILABLE' } }),
    prisma.table.create({ data: { cafeId: cafe.id, zoneId: indoor.id, tableNumber: '4', capacity: 4, currentStatus: 'OCCUPIED' } }),
    prisma.table.create({ data: { cafeId: cafe.id, zoneId: indoor.id, tableNumber: '5', capacity: 6, currentStatus: 'AVAILABLE' } }),
    prisma.table.create({ data: { cafeId: cafe.id, zoneId: patio.id, tableNumber: '6', capacity: 4, currentStatus: 'AVAILABLE' } }),
    prisma.table.create({ data: { cafeId: cafe.id, zoneId: patio.id, tableNumber: '7', capacity: 4, currentStatus: 'AVAILABLE' } }),
    prisma.table.create({ data: { cafeId: cafe.id, zoneId: patio.id, tableNumber: '8', capacity: 4, currentStatus: 'AVAILABLE' } }),
    prisma.table.create({ data: { cafeId: cafe.id, tableNumber: 'Takeaway', capacity: 0, currentStatus: 'AVAILABLE' } }),
  ]);

  const table4 = tables[3];
  const takeawayTable = tables[8];

  // 5. Create Categories
  const catEspresso = await prisma.category.create({
    data: { cafeId: cafe.id, name: 'Espresso Bar', icon: 'coffee', sortOrder: 1 },
  });
  const catBakery = await prisma.category.create({
    data: { cafeId: cafe.id, name: 'Artisan Bakery', icon: 'bakery_dining', sortOrder: 2 },
  });
  const catToasties = await prisma.category.create({
    data: { cafeId: cafe.id, name: 'Breakfast Toasties', icon: 'breakfast_dining', sortOrder: 3 },
  });
  const catCoolers = await prisma.category.create({
    data: { cafeId: cafe.id, name: 'Coolers & Cold Brews', icon: 'icecream', sortOrder: 4 },
  });

  // 6. Create Menu Items
  const items = await Promise.all([
    prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
        categoryId: catEspresso.id,
        name: 'Flat White',
        description: 'Double ristretto espresso, velvety textured micro-foam milk',
        price: 220,
        isVeg: true,
        inStock: true,
        prepTimeMinutes: 5,
      },
    }),
    prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
        categoryId: catEspresso.id,
        name: 'Specialty Pour Over (Ratnagiri Estate)',
        description: 'Single-origin light roast brewed on Hario V60 with floral notes',
        price: 260,
        isVeg: true,
        inStock: true,
        prepTimeMinutes: 7,
      },
    }),
    prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
        categoryId: catCoolers.id,
        name: 'Iced Oat Latte',
        description: 'Espresso poured over Minor Figures oat milk and artisanal ice',
        price: 250,
        isVeg: true,
        inStock: true,
        prepTimeMinutes: 4,
      },
    }),
    prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
        categoryId: catCoolers.id,
        name: 'Cold Brew with Tonic & Orange',
        description: '18-hour cold steeped coffee with botanical tonic and charred citrus',
        price: 210,
        isVeg: true,
        inStock: true,
        prepTimeMinutes: 3,
      },
    }),
    prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
        categoryId: catBakery.id,
        name: 'French Butter Croissant',
        description: '27 laminated butter layers, baked fresh every morning',
        price: 180,
        isVeg: true,
        inStock: true,
        prepTimeMinutes: 3,
      },
    }),
    prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
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
        cafeId: cafe.id,
        categoryId: catToasties.id,
        name: 'Wild Herb Sourdough Toast',
        description: 'Artisanal sourdough with hand-churned salted herb butter',
        price: 160,
        isVeg: true,
        inStock: true,
        prepTimeMinutes: 6,
      },
    }),
    prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
        categoryId: catToasties.id,
        name: 'Avocado & Danish Feta Toast',
        description: 'Hass avocado mash, crumbled feta, chili flakes, microgreens',
        price: 280,
        isVeg: true,
        inStock: true,
        prepTimeMinutes: 8,
      },
    }),
  ]);

  // 7. Create Active Shift
  const shift = await prisma.cashShift.create({
    data: {
      cafeId: cafe.id,
      userId: owner.id,
      status: 'OPEN',
      openingCash: 2000,
      cashSales: 1470,
      pettyExpenses: 340,
      expectedCash: 3130, // 2000 + 1470 - 340
      notes: 'Morning shift opened by Kabir with ₹2,000 float.',
    },
  });

  // 8. Create Sample Petty Expense
  await prisma.expense.create({
    data: {
      cafeId: cafe.id,
      shiftId: shift.id,
      title: 'Emergency Fresh Full-Cream Milk (10L)',
      amount: 340,
      category: 'INGREDIENTS',
      paidVia: 'DRAWER_CASH',
      receiptNote: 'Nandini Milk Booth Bill #891',
    },
  });

  // 9. Create Active Order on Table 4
  const orderTable4 = await prisma.order.create({
    data: {
      cafeId: cafe.id,
      tableId: table4.id,
      orderNumber: '#1042',
      source: 'POS',
      status: 'PREPARING',
      dynamicPrepMinutes: 8,
      customerName: 'Rahul Sharma',
      customerPhone: '+91 98450 44321',
      items: {
        create: [
          {
            menuItemId: items[0].id,
            name: 'Flat White (Oat Milk)',
            price: 260,
            quantity: 1,
            status: 'READY',
            notes: 'Oat Milk Sub (+₹40)',
          },
          {
            menuItemId: items[1].id,
            name: 'Specialty Pour Over (Ratnagiri)',
            price: 260,
            quantity: 1,
            status: 'PENDING',
            notes: 'Medium Grind, V60',
          },
          {
            menuItemId: items[4].id,
            name: 'French Butter Croissant',
            price: 180,
            quantity: 1,
            status: 'READY',
            notes: 'Warm from oven',
          },
        ],
      },
    },
  });

  // Update table 4 with active order
  await prisma.table.update({
    where: { id: table4.id },
    data: { activeOrderId: orderTable4.id },
  });

  // 10. Create Ready Takeaway Order
  await prisma.order.create({
    data: {
      cafeId: cafe.id,
      tableId: takeawayTable.id,
      orderNumber: '#1041',
      source: 'QR',
      status: 'READY',
      dynamicPrepMinutes: 5,
      customerName: 'Ananya Rao',
      customerPhone: '+91 98765 12340',
      items: {
        create: [
          {
            menuItemId: items[2].id,
            name: 'Iced Oat Latte',
            price: 250,
            quantity: 1,
            status: 'READY',
          },
          {
            menuItemId: items[5].id,
            name: 'Almond Frangipane Tart',
            price: 210,
            quantity: 1,
            status: 'READY',
          },
        ],
      },
    },
  });

  // 11. Create Sample Loyal Customer
  await prisma.customer.create({
    data: {
      cafeId: cafe.id,
      name: 'Rahul Sharma',
      phone: '+91 98450 44321',
      visitCount: 14,
      totalSpend: 5480,
      isOptedInWhatsApp: true,
      ratingScore: 5,
    },
  });

  console.log('✅ Seeding complete! Cafe "Artisan Roastery" ready with menu, tables, and live orders.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
