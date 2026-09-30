import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface SessionUser {
  userId: string;
  cafeId: string;
  role: string;
  name: string;
  phone: string;
}

const SESSION_COOKIE_NAME = 'paros_session';
const SECRET_KEY = process.env.AUTH_SECRET || 'paros-super-secret-jwt-key-development-2026';

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('base64url');
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url');
  const signature = signPayload(payload);
  const token = `${payload}.${signature}`;
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    // Require signed token format: payload.signature
    if (!token.includes('.')) {
      return null;
    }

    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSig = signPayload(payload);
    if (signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null; // Tampered or invalid signature
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    const user = JSON.parse(decoded) as SessionUser;

    if (!user || typeof user !== 'object' || !user.cafeId || !user.userId) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
