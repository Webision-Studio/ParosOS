import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== PAROS DEEP OPERATIONAL AUDIT ===\n');

  // 1. Tenants
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          orders: true,
          menuItems: true,
          tables: true,
          bills: true,
          customers: true,
          expenses: true,
          categories: true,
          shifts: true,
        },
      },
    },
  });

  console.log(`Found ${tenants.length} Cafe Tenants:`);
  for (const t of tenants) {
    console.log(`- Cafe: "${t.name}" | Slug: "${t.slug}" | Phone: "${t.phone}" | ID: ${t.id}`);
    console.log(`  Counts: MenuItems: ${t._count.menuItems}, Tables: ${t._count.tables}, Orders: ${t._count.orders}, Bills: ${t._count.bills}, Customers: ${t._count.customers}, Expenses: ${t._count.expenses}, Shifts: ${t._count.shifts}`);
    console.log(`  Settings: QR Mode: ${t.qrMode}, UPI: ${t.upiId || 'NOT SET'}, GSTIN: ${t.gstin || 'NOT SET'}, Wifi: ${t.wifiName || 'NOT SET'}`);
  }

  // 2. Active Orders
  console.log('\n--- Active Orders in System ---');
  const activeOrders = await prisma.order.findMany({
    where: { status: { in: ['PLACED', 'PREPARING', 'READY'] } },
    include: { table: true, items: true, cafe: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log(`Active orders count: ${activeOrders.length}`);
  for (const o of activeOrders) {
    console.log(`- Order ${o.orderNumber} | Cafe: ${o.cafe.name} | Status: ${o.status} | Source: ${o.source} | Items: ${o.items.length}`);
  }

  // 3. Recent Bills
  console.log('\n--- Recent Settled Bills ---');
  const recentBills = await prisma.bill.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { cafe: { select: { name: true } } },
  });
  console.log(`Recent bills count: ${recentBills.length}`);
  for (const b of recentBills) {
    console.log(`- Bill ${b.billNumber} | Cafe: ${b.cafe.name} | Total: ₹${b.total} | Method: ${b.paymentMethod} | Cust: ${b.customerPhone || 'None'}`);
  }

  // 4. Check Cash Shifts
  console.log('\n--- Cash Shifts ---');
  const shifts = await prisma.cashShift.findMany({
    orderBy: { openedAt: 'desc' },
    take: 5,
    include: { cafe: { select: { name: true } } },
  });
  console.log(`Shifts recorded: ${shifts.length}`);
  for (const s of shifts) {
    console.log(`- Shift ID: ${s.id} | Cafe: ${s.cafe.name} | Status: ${s.status} | Opening Float: ₹${s.openingCash} | Expected Cash: ₹${s.expectedCash}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
