import type { NextRequest } from "next/server";

export type SupabaseSessionPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
};

export type SupabaseAuthConfig = { url: string; anonKey: string };

const ACCESS_COOKIE = "jf_auth_access";
const REFRESH_COOKIE = "jf_auth_refresh";
const PASSWORD_RECOVERY_COOKIE = "jf_password_recovery";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function getSupabaseConfig(): SupabaseAuthConfig | null {
  const url = process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConfig());
}

export function getCookie(request: NextRequest, name: string) {
  const prefix = `${name}=`;
  const value = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length);
  if (!value) return null;
  try { return decodeURIComponent(value); } catch { return null; }
}

function serializeCookie(name: string, value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function setSessionCookies(headers: Headers, session: SupabaseSessionPayload) {
  if (session.access_token) headers.append("Set-Cookie", serializeCookie(ACCESS_COOKIE, session.access_token, session.expires_in ?? 3600));
  if (session.refresh_token) headers.append("Set-Cookie", serializeCookie(REFRESH_COOKIE, session.refresh_token, COOKIE_MAX_AGE));
}

export function setPasswordRecoveryCookie(headers: Headers) {
  headers.append("Set-Cookie", serializeCookie(PASSWORD_RECOVERY_COOKIE, "1", 15 * 60));
}

export function hasPasswordRecoveryCookie(request: NextRequest) {
  return getCookie(request, PASSWORD_RECOVERY_COOKIE) === "1";
}

export function clearPasswordRecoveryCookie(headers: Headers) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  headers.append("Set-Cookie", `${PASSWORD_RECOVERY_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export function clearSessionCookies(headers: Headers) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    headers.append("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  }
}

export async function requestAuth(path: string, body?: unknown, accessToken?: string, method?: "GET" | "POST" | "PUT") {
  const config = getSupabaseConfig();
  if (!config) return { configured: false as const, response: null, payload: null };
  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    cache: "no-store",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken || config.anonKey}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { configured: true as const, response, payload };
}

export async function requestDatabase(path: string, accessToken: string, body?: unknown, method?: "GET" | "POST") {
  const config = getSupabaseConfig();
  if (!config) return null;
  return fetch(`${config.url}/rest/v1/${path}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    cache: "no-store",
    headers: { apikey: config.anonKey, Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

export async function readSession(request: NextRequest, headers: Headers) {
  const accessToken = getCookie(request, ACCESS_COOKIE);
  const refreshToken = getCookie(request, REFRESH_COOKIE);
  if (!accessToken) return null;

  let currentAccessToken = accessToken;
  let userResponse = await requestAuth("user", undefined, currentAccessToken);
  if (!userResponse.configured) return null;

  if (!userResponse.response?.ok && refreshToken) {
    const refreshed = await requestAuth("token?grant_type=refresh_token", { refresh_token: refreshToken });
    if (refreshed.response?.ok) {
      const session = refreshed.payload as SupabaseSessionPayload;
      setSessionCookies(headers, session);
      currentAccessToken = session.access_token || "";
      userResponse = await requestAuth("user", undefined, currentAccessToken);
    }
  }

  if (!userResponse.response?.ok) {
    clearSessionCookies(headers);
    return null;
  }

  const user = userResponse.payload as { id?: string; email?: string; email_confirmed_at?: string | null };
  if (!user.id) {
    clearSessionCookies(headers);
    return null;
  }

  const config = getSupabaseConfig();
  if (!config) {
    clearSessionCookies(headers);
    return null;
  }
  if (!user.email_confirmed_at) return null;
  const admin = await requestDatabase("rpc/is_platform_admin", currentAccessToken, {});
  if (admin?.ok && await admin.json() === true) return { id: user.id, email: user.email ?? "", platformAdmin: true, company: null, role: "platform_admin", accessToken: currentAccessToken };
  const query = new URLSearchParams({ select: "id,company_id,role,status,full_name,companies(id,name)", user_id: `eq.${user.id}`, status: "eq.active", limit: "1" });
  try {
    const membership = await requestDatabase(`company_members?${query}`, currentAccessToken);
    if (!membership?.ok) throw new Error("Company membership could not be verified");
    const rows = await membership.json() as Array<{ id: string; company_id: string; role: string; full_name: string; companies?: { id: string; name: string } }>;
    if (rows.length === 0) return null;
    return { id: user.id, email: user.email ?? "", platformAdmin: false, company: rows[0].companies ?? { id: rows[0].company_id, name: "Empresa" }, role: rows[0].role, fullName: rows[0].full_name, accessToken: currentAccessToken };
  } catch {
    return null;
  }
}
