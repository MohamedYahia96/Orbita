import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./src/i18n/routing";
import { verifySessionToken, AUTH_COOKIE_NAME } from "./src/lib/session";

const intlMiddleware = createMiddleware(routing);

function getLocaleFromPathname(pathname: string) {
  const localeMatch = pathname.match(/^\/(en|ar)(\/|$)/);
  return localeMatch?.[1] || routing.defaultLocale;
}

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function isPublicApi(pathname: string) {
  return pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron") || pathname.startsWith("/api/webhooks");
}

function isProtectedPage(pathname: string) {
  return /^\/(en|ar)(?:\/(overview|feeds|workspaces|notifications|reading-list|tags|digest|status|analytics|settings)(?:\/|$)|$)/.test(pathname);
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  return Boolean(await verifySessionToken(token));
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicAsset(pathname) || pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  if (isProtectedPage(pathname) || (pathname.startsWith("/api/") && !isPublicApi(pathname))) {
    const authenticated = await hasValidSession(request);

    if (!authenticated) {
      const locale = getLocaleFromPathname(pathname);
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*", "/api/:path*"],
};
