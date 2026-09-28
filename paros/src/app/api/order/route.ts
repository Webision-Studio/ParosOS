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
        where: orderId ? { id: orderId } : { orderNumber: orderNumber as string },
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
      cafe = await prisma.tenant.findUnique({ where: { slug: cafeSlug } });
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

    // Handle Customer Rating & Feedback Submission
    if (body.action === 'submit-feedback') {
      const { orderId, rating, feedbackText, customerPhone, cafeId } = body;
      if (orderId && feedbackText) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            specialNotes: `[CUSTOMER FEEDBACK: ${rating}★] ${feedbackText}`,
          },
        }).catch(() => {});
      }
      if (customerPhone) {
        const digits = String(customerPhone).replace(/[^0-9]/g, '');
        if (digits.length >= 10) {
          const norm = `+91 ${digits.slice(-10)}`;
          let targetCafeId = cafeId;
          if (!targetCafeId) {
            const defCafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
            targetCafeId = defCafe?.id;
          }
          if (targetCafeId) {
            await prisma.customer.updateMany({
              where: { cafeId: targetCafeId, phone: norm },
              data: { ratingScore: Number(rating) },
            }).catch(() => {});
          }
        }
      }
      return NextResponse.json({ success: true, message: 'Feedback recorded successfully' });
    }

    const { tableNumber, items, total, customerName, customerPhone, customerEmail, whatsappOptIn, specialNotes, paymentMode, cafeId } = body;

    let cafe = null;
    if (session?.cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: session.cafeId } });
    }
    if (!cafe && cafeId) {
      cafe = await prisma.tenant.findUnique({ where: { id: cafeId } });
    }
    if (!cafe) {
      cafe = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    if (!cafe) {
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }

    // Find table (case-insensitive & handles 'T4' vs '4' or 'Takeaway')
    const cleanTableNum = String(tableNumber).replace(/^T/i, '').trim();
    const table = await prisma.table.findFirst({
      where: {
        cafeId: cafe.id,
        OR: [
          { tableNumber: { equals: String(tableNumber), mode: 'insensitive' } },
          { tableNumber: { equals: cleanTableNum, mode: 'insensitive' } },
          { tableNumber: { equals: `T${cleanTableNum}`, mode: 'insensitive' } },
        ],
      },
    });

    // Phone number normalization to avoid CRM duplicates
    let normalizedPhone: string | null = null;
    if (customerPhone) {
      const digits = customerPhone.replace(/[^0-9]/g, '');
      if (digits.length >= 10) {
        normalizedPhone = `+91 ${digits.slice(-10)}`;
      }
    }

    // Verify item prices from DB catalog to prevent client price tampering
    const catalog = await prisma.menuItem.findMany({
      where: { cafeId: cafe.id },
      select: { id: true, name: true, price: true },
    });
    const catalogMap = new Map(catalog.map((m) => [m.name.toLowerCase().trim(), m.price]));

    const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;

    const verifiedItems = (items || []).map((i: { name: string; price: number; quantity: number; notes?: string; milk?: string }) => {
      const basePrice = catalogMap.get((i.name || '').toLowerCase().trim()) ?? Number(i.price);
      const milkSurcharge = i.milk && i.milk.toLowerCase().includes('oat') ? 40 : 0;
      return {
        name: i.name,
        price: basePrice + milkSurcharge,
        quantity: Math.max(1, Number(i.quantity || 1)),
        status: 'PENDING' as const,
        notes: [i.notes, i.milk].filter(Boolean).join(' • '),
      };
    });

    const calculatedSubtotal = verifiedItems.reduce((acc: number, item: { price: number; quantity: number }) => acc + item.price * item.quantity, 0);
    const calculatedTotal = calculatedSubtotal + Math.round(calculatedSubtotal * 0.05);

    const order = await prisma.order.create({
      data: {
        cafeId: cafe.id,
        tableId: table?.id || null,
        orderNumber,
        source: 'QR',
        status: 'PLACED',
        dynamicPrepMinutes: 10,
        customerName: customerName || `Table ${tableNumber} Guest`,
        customerPhone: normalizedPhone || '+91 98450 XXXXX',
        customerEmail: customerEmail || null,
        specialNotes: specialNotes || (paymentMode === 'PAY_LATER' ? 'PAY LATER TO WAITER / COUNTER' : 'ONLINE PREPAID (UPI)'),
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
          name: customerName || undefined,
          email: customerEmail || undefined,
          visitCount: { increment: 1 },
          totalSpend: { increment: calculatedTotal },
          lastVisitAt: new Date(),
          isOptedInWhatsApp: whatsappOptIn !== false,
        },
        create: {
          cafeId: cafe.id,
          phone: normalizedPhone,
          name: customerName || null,
          email: customerEmail || null,
          totalSpend: calculatedTotal,
          isOptedInWhatsApp: whatsappOptIn !== false,
        },
      });
    }

    // Dispatch Brevo digital receipt if prepaid via UPI and valid email provided
    if (customerEmail && isValidEmail(customerEmail) && paymentMode === 'UPI_NOW') {
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
        items: verifiedItems.map((it: { name: string; quantity: number; price: number; notes?: string }) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          notes: it.notes,
        })),
        customer: {
          email: customerEmail,
          name: customerName,
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
