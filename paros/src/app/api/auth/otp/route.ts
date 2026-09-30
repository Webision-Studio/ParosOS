import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, clearSession } from '@/lib/auth-session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Request OTP
    if (action === 'send-otp') {
      const { phone } = body;
      if (!phone || phone.length < 10) {
        return NextResponse.json({ error: 'Valid 10-digit phone number is required' }, { status: 400 });
      }

      // In production with Firebase/SMS provider, dispatch SMS here.
      // For instant testing, 123456 is active.
      return NextResponse.json({
        success: true,
        message: 'OTP dispatched successfully. Use 123456 for instant testing.',
      });
    }

    // 2. Verify OTP & Authenticate
    if (action === 'verify-otp') {
      const { phone, otp, name } = body;
      const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

      if (!cleanPhone || cleanPhone.length !== 10) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
      }

      // Demo/dev OTP check (or Firebase verification)
      if (otp !== '123456' && otp.length !== 6) {
        return NextResponse.json({ error: 'Invalid OTP code. Please enter 123456.' }, { status: 400 });
      }

      const formattedPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;

      // Look up existing user across phone variations or cafe phone
      let user: any = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: formattedPhone },
            { phone: cleanPhone },
            { phone: `+91${cleanPhone}` },
            { phone: { contains: cleanPhone } },
            { cafe: { phone: { contains: cleanPhone } } },
          ],
        },
        include: {
          cafe: {
            include: {
              tables: true,
              _count: {
                select: { orders: true, menuItems: true },
              },
            },
          },
        },
      });

      let hasExistingSetup = false;
      if (user && user.cafe) {
        const tableCount = user.cafe.tables ? user.cafe.tables.length : 0;
        const menuCount = user.cafe._count ? user.cafe._count.menuItems : 0;
        const orderCount = user.cafe._count ? user.cafe._count.orders : 0;
        const isCustomName = Boolean(user.cafe.name && user.cafe.name !== 'My Cafe' && !user.cafe.name.endsWith("'s Cafe"));

        if (tableCount > 0 || menuCount > 0 || orderCount > 0 || isCustomName) {
          hasExistingSetup = true;
        }
      }

      // If user doesn't exist, create initial cafe & owner
      if (!user) {
        const cafeSlug = `cafe-${cleanPhone}-${Date.now().toString().slice(-4)}`;
        const cafe = await prisma.tenant.create({
          data: {
            name: name ? `${name}'s Cafe` : 'My Cafe',
            slug: cafeSlug,
            phone: formattedPhone,
            plan: 'GOLD',
          },
        });

        user = await prisma.user.create({
          data: {
            cafeId: cafe.id,
            name: name || 'Cafe Owner',
            phone: formattedPhone,
            role: 'OWNER',
          },
          include: { cafe: true },
        });
      }

      if (!user) {
        return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 500 });
      }

      // Set session cookie
      await createSession({
        userId: user.id,
        cafeId: user.cafeId,
        role: user.role,
        name: user.name,
        phone: user.phone || formattedPhone,
      });

      return NextResponse.json({
        success: true,
        hasExistingSetup,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        cafe: user.cafe,
      });
    }

    // 3. Google Workspace Auth
    if (action === 'google-auth') {
      const { email, name } = body;
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      let user: any = await prisma.user.findFirst({
        where: { email },
        include: {
          cafe: {
            include: {
              tables: true,
              _count: {
                select: { orders: true, menuItems: true },
              },
            },
          },
        },
      });

      let hasExistingSetup = false;
      if (user && user.cafe) {
        const tableCount = user.cafe.tables ? user.cafe.tables.length : 0;
        const menuCount = user.cafe._count ? user.cafe._count.menuItems : 0;
        const orderCount = user.cafe._count ? user.cafe._count.orders : 0;
        const isCustomName = Boolean(user.cafe.name && user.cafe.name !== 'My Cafe' && !user.cafe.name.endsWith("'s Cafe"));

        if (tableCount > 0 || menuCount > 0 || orderCount > 0 || isCustomName) {
          hasExistingSetup = true;
        }
      }

      if (!user) {
        const cafeSlug = `cafe-${email.split('@')[0]}-${Date.now().toString().slice(-4)}`;
        const cafe = await prisma.tenant.create({
          data: {
            name: `${name || 'My'}'s Cafe`,
            slug: cafeSlug,
            email,
            plan: 'GOLD',
          },
        });

        user = await prisma.user.create({
          data: {
            cafeId: cafe.id,
            name: name || 'Cafe Owner',
            email,
            role: 'OWNER',
          },
          include: { cafe: true },
        });
      }

      if (!user) {
        return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 500 });
      }

      await createSession({
        userId: user.id,
        cafeId: user.cafeId,
        role: user.role,
        name: user.name,
        phone: user.phone || '',
      });

      return NextResponse.json({
        success: true,
        hasExistingSetup,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        cafe: user.cafe,
      });
    }

    // 4. Logout
    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
