import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  IP_COOKIE,
  getClientIp,
  verifyIpToken,
  verifySessionToken,
} from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (pathname === "/login") {
      const ip = getClientIp(request.headers);
      const session = request.cookies.get(AUTH_COOKIE)?.value;
      const ipAuth = request.cookies.get(IP_COOKIE)?.value;
      const authed =
        (session ? await verifySessionToken(session) : false) ||
        (ipAuth ? await verifyIpToken(ipAuth, ip) : false);
      if (authed) {
        const dest = request.nextUrl.searchParams.get("from") || "/";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return NextResponse.next();
  }

  const ip = getClientIp(request.headers);
  const session = request.cookies.get(AUTH_COOKIE)?.value;
  const ipAuth = request.cookies.get(IP_COOKIE)?.value;

  const authed =
    (session ? await verifySessionToken(session) : false) ||
    (ipAuth ? await verifyIpToken(ipAuth, ip) : false);

  if (authed) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
