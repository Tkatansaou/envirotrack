import { NextResponse, type NextRequest } from 'next/server';

// Content Security Policy — added once pages exist (the API-only surface
// doesn't render HTML and doesn't need CSP).
// 'unsafe-inline' is required for Next.js inline scripts and Tailwind; a
// nonce-based CSP would be stricter but needs per-request nonce threading.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self'",
  "connect-src 'self' https://*.sentry.io https://sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('Content-Security-Policy', CSP);
  return res;
}

// Silent-refresh gate for protected pages.
//
// The (15-min) access cookie can expire while a (7-day) refresh cookie is
// still valid — typically when a tab sat unfocused or the laptop slept. The
// (authed) layout calling /api/auth/me would 401 and the user would be kicked
// to /login. This middleware catches that case BEFORE the page renders and
// bounces the request through /api/auth/refresh-and-return, which mints fresh
// cookies and 302s back to the original URL — invisible to the user.
//
// Protected paths are configured via AUTH_PROTECTED_PREFIXES (comma-separated,
// e.g. "/dashboard,/account"). Empty by default — the API surface is the only
// thing shipped, so out-of-the-box this middleware is a no-op.
//
// Edge runtime: no DB, no bcrypt, no Prisma. We only inspect cookies and
// build redirects — the heavy lifting happens in /api/auth/refresh-and-return
// (runtime=nodejs).

const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'app';
const ACCESS_COOKIE = `${COOKIE_PREFIX}-token`;
const REFRESH_COOKIE = `${COOKIE_PREFIX}-refresh`;
const LOGIN_PATH = process.env.AUTH_LOGIN_PATH || '/login';

const AUTHED_PREFIXES = (process.env.AUTH_PROTECTED_PREFIXES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isAuthedPath(pathname: string): boolean {
  return AUTHED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const SHORT_REDIRECTS: Record<string, string> = {
  '/login': '/auth/login',
  '/signup': '/auth/signup',
  '/register': '/auth/signup',
  '/forgot-password': '/auth/forgot-password',
};

export function middleware(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;

  if (SHORT_REDIRECTS[pathname]) {
    const url = req.nextUrl.clone();
    url.pathname = SHORT_REDIRECTS[pathname];
    url.search = search;
    return addSecurityHeaders(NextResponse.redirect(url, 301));
  }

  if (AUTHED_PREFIXES.length === 0) return addSecurityHeaders(NextResponse.next());
  if (!isAuthedPath(pathname)) return addSecurityHeaders(NextResponse.next());

  if (req.cookies.get(ACCESS_COOKIE)?.value) return addSecurityHeaders(NextResponse.next());

  const target = pathname + search;

  if (!req.cookies.get(REFRESH_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = `?next=${encodeURIComponent(target)}`;
    return addSecurityHeaders(NextResponse.redirect(url, 303));
  }

  const url = req.nextUrl.clone();
  url.pathname = '/api/auth/refresh-and-return';
  url.search = `?next=${encodeURIComponent(target)}`;
  return addSecurityHeaders(NextResponse.redirect(url, 303));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
