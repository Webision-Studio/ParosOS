import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-session';
import { isValidEmail, sendCustomerReceiptEmail } from '@/lib/brevo';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const cafeSlug = searchParams.get('cafeSlug');
    const orderId = searchParams.get('orderId');
    const orderNumber = searchParams.get('orderNumber');

    // 1. Live Order Status Lookup (for customer countdown & ETA polling)
    if (orderId || orderNumber) {
      const order = await prisma.order.findFirst({
        where: orderId ? { id: String(orderId).slice(0, 60) } : { orderNumber: String(orderNumber).slice(0, 20) },
        include: { items: true, table: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ order });
    }

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe && cafeSlug) {
      cafe = await prisma.tenant.findUnique({ where: { slug: String(cafeSlug).slice(0, 60) } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    if (!cafe) {
      return NextResponse.json({ error: 'No active cafe found' }, { status: 404 });
    }

    const [tables, categories, menuItems] = await Promise.all([
      prisma.table.findMany({ where: { cafeId: cafe.id }, orderBy: { tableNumber: 'asc' } }),
      prisma.category.findMany({ where: { cafeId: cafe.id, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.menuItem.findMany({ where: { cafeId: cafe.id, inStock: true }, include: { category: true } }),
    ]);

    return NextResponse.json({
      cafe,
      tables,
      categories,
      menuItems,
    });
  } catch (error) {
    console.error('Order GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch QR order menu' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();

    // 1. Handle Customer Rating & Feedback Submission
    if (body.action === 'submit-feedback') {
      const { orderId, rating, feedbackText, customerPhone, cafeId } = body;

      // Validate rating integer bounds (1 to 5)
      const validRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
      const cleanFeedback = feedbackText ? String(feedbackText).slice(0, 1000).trim() : '';

      let targetCafeId = session?.cafeId || cafeId;
      if (!targetCafeId) {
        const defCafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
        targetCafeId = defCafe?.id;
      }

      if (orderId && cleanFeedback) {
        // Enforce tenant isolation: verify order exists and belongs to targetCafeId
        const existingOrder = await prisma.order.findUnique({
          where: { id: String(orderId).slice(0, 60) },
          select: { id: true, cafeId: true, specialNotes: true },
        });

        if (existingOrder && (!targetCafeId || existingOrder.cafeId === targetCafeId)) {
          const prevNotes = existingOrder.specialNotes ? `${existingOrder.specialNotes} • ` : '';
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              specialNotes: `${prevNotes}[CUSTOMER FEEDBACK: ${validRating}★] ${cleanFeedback}`.slice(0, 1200),
            },
          }).catch(() => {});
        }
      }

      if (customerPhone && targetCafeId) {
        const digits = String(customerPhone).replace(/[^0-9]/g, '');
        if (digits.length >= 10) {
          const norm = `+91 ${digits.slice(-10)}`;
          await prisma.customer.updateMany({
            where: { cafeId: targetCafeId, phone: norm },
            data: { ratingScore: validRating },
          }).catch(() => {});
        }
      }

      return NextResponse.json({ success: true, message: 'Feedback recorded securely' });
    }

    // 2. Validate Order Placement Inputs
    const { tableNumber, items, customerName, customerPhone, customerEmail, whatsappOptIn, specialNotes, paymentMode, cafeId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order cart cannot be empty' }, { status: 400 });
    }

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe && cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: String(cafeId).slice(0, 60) } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    if (!cafe) {
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }

    // Find table (case-insensitive & handles 'T4' vs '4' or 'Takeaway')
    const cleanTableNum = String(tableNumber || 'Takeaway').replace(/^T/i, '').trim();
    const table = await prisma.table.findFirst({
      where: {
        cafeId: cafe.id,
        OR: [
          { tableNumber: { equals: String(tableNumber || 'Takeaway'), mode: 'insensitive' } },
          { tableNumber: { equals: cleanTableNum, mode: 'insensitive' } },
          { tableNumber: { equals: `T${cleanTableNum}`, mode: 'insensitive' } },
        ],
      },
    });

    // Phone number normalization
    let normalizedPhone: string | null = null;
    if (customerPhone) {
      const digits = String(customerPhone).replace(/[^0-9]/g, '');
      if (digits.length >= 10) {
        normalizedPhone = `+91 ${digits.slice(-10)}`;
      }
    }

    // Server-Side Price Verification against DB catalog to completely prevent client price tampering
    const catalog = await prisma.menuItem.findMany({
      where: { cafeId: cafe.id, inStock: true },
      select: { id: true, name: true, price: true },
    });
    const catalogMap = new Map(catalog.map((m) => [m.name.toLowerCase().trim(), m.price]));

    const verifiedItems = [];
    for (const item of items) {
      const cleanName = String(item.name || '').trim();
      const baseCatalogPrice = catalogMap.get(cleanName.toLowerCase());

      if (baseCatalogPrice === undefined) {
        return NextResponse.json(
          { error: `Item "${cleanName}" is currently unavailable or does not exist in the menu catalog` },
          { status: 400 }
        );
      }

      // Quantity must be a safe positive integer (1..50)
      const quantity = Math.min(50, Math.max(1, Math.floor(Number(item.quantity) || 1)));
      const milkSurcharge = item.milk && String(item.milk).toLowerCase().includes('oat') ? 40 : 0;
      const verifiedUnitPrice = baseCatalogPrice + milkSurcharge;

      verifiedItems.push({
        name: cleanName.slice(0, 100),
        price: verifiedUnitPrice,
        quantity,
        status: 'PENDING' as const,
        notes: [item.notes ? String(item.notes).slice(0, 150) : null, item.milk ? String(item.milk).slice(0, 50) : null]
          .filter(Boolean)
          .join(' • '),
      });
    }

    const calculatedSubtotal = verifiedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const calculatedGst = Math.round(calculatedSubtotal * 0.05);
    const calculatedTotal = calculatedSubtotal + calculatedGst;

    const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;

    const safeCustomerName = customerName ? String(customerName).slice(0, 80).trim() : `Table ${tableNumber} Guest`;
    const safeCustomerEmail = customerEmail && isValidEmail(customerEmail) ? String(customerEmail).trim().slice(0, 100) : null;
    const safeNotes = specialNotes
      ? String(specialNotes).slice(0, 300).trim()
      : paymentMode === 'PAY_LATER'
      ? 'PAY LATER TO WAITER / COUNTER'
      : 'ONLINE PREPAID (UPI)';

    const order = await prisma.order.create({
      data: {
        cafeId: cafe.id,
        tableId: table?.id || null,
        orderNumber,
        source: 'QR',
        status: 'PLACED',
        dynamicPrepMinutes: 10,
        customerName: safeCustomerName,
        customerPhone: normalizedPhone || '+91 98450 XXXXX',
        customerEmail: safeCustomerEmail,
        specialNotes: safeNotes,
        items: {
          create: verifiedItems,
        },
      },
      include: { items: true },
    });

    // Update table status to OCCUPIED only if it is a physical dine-in table
    if (table && table.tableNumber.toLowerCase() !== 'takeaway' && table.tableNumber.toLowerCase() !== 'counter') {
      await prisma.table.update({
        where: { id: table.id },
        data: { currentStatus: 'OCCUPIED', activeOrderId: order.id },
      });
    }

    // Upsert Customer record if phone is provided
    if (normalizedPhone) {
      await prisma.customer.upsert({
        where: {
          cafeId_phone: { cafeId: cafe.id, phone: normalizedPhone }
        },
        update: {
          name: safeCustomerName !== `Table ${tableNumber} Guest` ? safeCustomerName : undefined,
          email: safeCustomerEmail || undefined,
          visitCount: { increment: 1 },
          totalSpend: { increment: calculatedTotal },
          lastVisitAt: new Date(),
          isOptedInWhatsApp: whatsappOptIn !== false,
        },
        create: {
          cafeId: cafe.id,
          phone: normalizedPhone,
          name: safeCustomerName !== `Table ${tableNumber} Guest` ? safeCustomerName : null,
          email: safeCustomerEmail || null,
          totalSpend: calculatedTotal,
          isOptedInWhatsApp: whatsappOptIn !== false,
        },
      });
    }

    // Dispatch Brevo digital receipt if prepaid via UPI and valid email provided
    if (safeCustomerEmail && paymentMode === 'UPI_NOW') {
      const billNumber = `INV-${order.orderNumber.replace('#', '')}-${Math.floor(100 + Math.random() * 900)}`;
      sendCustomerReceiptEmail({
        cafe,
        bill: {
          billNumber,
          subtotal: calculatedSubtotal,
          cgst: Math.round(calculatedSubtotal * 0.025 * 100) / 100,
          sgst: Math.round(calculatedSubtotal * 0.025 * 100) / 100,
          total: calculatedTotal,
          paymentMethod: 'UPI_ONLINE',
          createdAt: order.createdAt,
          tableNumber: table?.tableNumber || (tableNumber ? String(tableNumber) : 'Takeaway'),
        },
        items: verifiedItems.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          notes: it.notes,
        })),
        customer: {
          email: safeCustomerEmail,
          name: safeCustomerName,
          phone: normalizedPhone,
        },
      }).catch((err) => console.error('Failed to send QR customer receipt email:', err));
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      order,
      orderNumber,
      prepTimeMinutes: order.dynamicPrepMinutes || 10,
    });

  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create QR order' }, { status: 500 });
  }
}
