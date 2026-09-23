import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

/**
 * UI-only guard: sends visitors without a session to /login.
 * The API checks the real token on every request.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has('csbms_session') || req.cookies.has('csbms_at');
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip API calls, Next internals and static files.
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
};
