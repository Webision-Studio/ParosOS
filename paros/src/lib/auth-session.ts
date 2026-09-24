import { cookies } from 'next/headers';

export interface SessionUser {
  userId: string;
  cafeId: string;
  role: string;
  name: string;
  phone: string;
}

const SESSION_COOKIE_NAME = 'paros_session';

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const token = Buffer.from(JSON.stringify(user)).toString('base64');
  
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
    
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded) as SessionUser;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
