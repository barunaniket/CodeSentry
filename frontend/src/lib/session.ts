import { SessionOptions } from 'iron-session';

export interface SessionUser {
  user_id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MODERATOR' | 'STUDENT';
}

export interface AppSession {
  user?: SessionUser;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'codesentry-super-secret-key-min-32-chars-long!!',
  cookieName: 'codesentry_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
