import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAdminRole, canVisit } from '@/lib/roles';
import { canAccessModa } from '@/lib/modaAccess';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string ?? '';
    const email = token?.email as string | null ?? null;

    // Admin area guards
    if (pathname.startsWith('/admin')) {
      if (!isAdminRole(role)) {
        return NextResponse.redirect(new URL('/home', req.url));
      }
      if (!canVisit(role, pathname)) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }

    // Moda PE27 and Casa hub — exclusive access while experimental
    if (pathname.startsWith('/moda') || pathname.startsWith('/casa')) {
      if (!canAccessModa(role, email)) {
        return NextResponse.redirect(new URL('/home', req.url));
      }
    }

    // Destination selection page: only operators need it
    if (pathname === '/seleziona-destinazione') {
      if (isAdminRole(role)) {
        return NextResponse.redirect(new URL('/home', req.url));
      }
      if (role === 'OPERATOR' && token?.destinazioneId) {
        return NextResponse.redirect(new URL('/home', req.url));
      }
    }

    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/home',
    '/home/:path*',
    '/catalog/:path*',
    '/orders/:path*',
    '/admin',
    '/admin/:path*',
    '/moda/:path*',
    '/moda',
    '/casa/:path*',
    '/casa',
    '/budget',
    '/budget/:path*',
    '/collezione-home',
    '/collezione-home/:path*',
    '/seleziona-destinazione',
  ],
};
