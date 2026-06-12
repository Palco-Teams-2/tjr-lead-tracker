const AUTH_PASSWORD = "d82ade46df04b0$bbfd8867f583d22d52d1%";
export const AUTH_COOKIE = "tjr_auth";
export const IP_COOKIE = "tjr_ip_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days (browser max practical)

function secret(): string {
  return process.env.AUTH_SECRET?.trim() || AUTH_PASSWORD;
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(sig).toString("base64url");
}

async function hmacVerify(payload: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(payload);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(ip: string): Promise<string> {
  const exp = Date.now() + AUTH_MAX_AGE * 1000;
  const payload = `s.${exp}.${ip}`;
  return `${payload}.${await hmacSign(payload)}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!(await hmacVerify(payload, sig))) return false;
  const parts = payload.split(".");
  if (parts[0] !== "s" || parts.length !== 3) return false;
  const exp = Number(parts[1]);
  return Number.isFinite(exp) && Date.now() <= exp;
}

export async function createIpToken(ip: string): Promise<string> {
  const exp = Date.now() + AUTH_MAX_AGE * 1000;
  const payload = `i.${exp}.${ip}`;
  return `${payload}.${await hmacSign(payload)}`;
}

export async function verifyIpToken(token: string, ip: string): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!(await hmacVerify(payload, sig))) return false;
  const parts = payload.split(".");
  if (parts[0] !== "i" || parts.length !== 3) return false;
  const exp = Number(parts[1]);
  const tokenIp = parts[2];
  return Number.isFinite(exp) && Date.now() <= exp && tokenIp === ip;
}

export function verifyPassword(password: string): boolean {
  const a = Buffer.from(password);
  const b = Buffer.from(AUTH_PASSWORD);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: AUTH_MAX_AGE,
  };
}
