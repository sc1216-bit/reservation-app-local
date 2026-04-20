import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const isLoginPath = request.nextUrl.pathname === '/admin';
    const authCookie = request.cookies.get('reservation_admin_auth')?.value;
    if (!isLoginPath && authCookie !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
