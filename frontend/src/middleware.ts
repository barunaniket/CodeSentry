import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, AppSession } from '@/lib/session';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/student', '/moderator', '/admin', '/cases', '/search'];
// Routes that are only for unauthenticated users
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // We need a mutable response to read the session cookie
  const res = NextResponse.next();
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  const user = session.user;

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuthRoute && user) {
    // Already logged in — send to their dashboard
    if (user.role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    if (user.role === 'MODERATOR') return NextResponse.redirect(new URL('/moderator/dashboard', req.url));
    return NextResponse.redirect(new URL('/student/dashboard', req.url));
  }

  // Role-based path enforcement
  if (user && pathname.startsWith('/student') && user.role !== 'STUDENT') {
    return NextResponse.redirect(new URL(getDashboard(user.role), req.url));
  }
  if (user && pathname.startsWith('/moderator') && user.role !== 'MODERATOR') {
    return NextResponse.redirect(new URL(getDashboard(user.role), req.url));
  }
  if (user && pathname.startsWith('/admin') && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL(getDashboard(user.role), req.url));
  }

  return res;
}

function getDashboard(role: string) {
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'MODERATOR') return '/moderator/dashboard';
  return '/student/dashboard';
}

export const config = {
  matcher: [
    '/student/:path*',
    '/moderator/:path*',
    '/admin/:path*',
    '/cases/:path*',
    '/search',
    '/login',
    '/register',
  ],
};
