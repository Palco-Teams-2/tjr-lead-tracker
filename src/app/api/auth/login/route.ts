import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  IP_COOKIE,
  createIpToken,
  createSessionToken,
  getClientIp,
  verifyIpToken,
  verifyPassword,
  verifySessionToken,
  authCookieOptions,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const ip = getClientIp(req.headers);
  const session = await createSessionToken(ip);
  const ipToken = await createIpToken(ip);
  const opts = authCookieOptions();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, session, opts);
  res.cookies.set(IP_COOKIE, ipToken, opts);
  return res;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const session = req.cookies.get(AUTH_COOKIE)?.value;
  const ipAuth = req.cookies.get(IP_COOKIE)?.value;
  const ok =
    (session ? await verifySessionToken(session) : false) ||
    (ipAuth ? await verifyIpToken(ipAuth, ip) : false);
  return NextResponse.json({ ok });
}
