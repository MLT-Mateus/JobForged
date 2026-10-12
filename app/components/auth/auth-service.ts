"use client";

import { useEffect, useState } from "react";
import type { PlanId } from "@/app/data/plans";
import type { LoginValues, SignupValues } from "./auth-validation";

const DEMO_SESSION_KEY = "jobforged.auth.session.v1";
const SUPABASE_SESSION_KEY = "jobforged.auth.supabase.v1";

type AuthResult = { ok: true; requiresConfirmation?: boolean } | { ok: false; message: string };
type DemoSession = { user: { id: string; email: string; name: string }; organization: { id: string; name: string }; createdAt: string };
type SupabaseSession = { access_token: string; refresh_token?: string; expires_at: number; user?: { id: string; email?: string } };
type RuntimeAuthConfig = { supabaseUrl: string; supabaseAnonKey: string };
export type AuthSessionState = { authenticated: boolean; checking: boolean; demo: boolean; email?: string };

let runtimeConfig: RuntimeAuthConfig | null | undefined;

export function hasSupabaseConfig() {
  return Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || (runtimeConfig?.supabaseUrl && runtimeConfig.supabaseAnonKey));
}

async function loadRuntimeConfig() {
  if (runtimeConfig !== undefined) return runtimeConfig;
  if (typeof window === "undefined") {
    runtimeConfig = null;
    return runtimeConfig;
  }
  try {
    const response = await fetch("/api/auth/config", { cache: "no-store" });
    runtimeConfig = response.ok ? await response.json() : null;
  } catch {
    runtimeConfig = null;
  }
  return runtimeConfig;
}

async function getRuntimeAuthConfig() {
  const config = await loadRuntimeConfig();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || config?.supabaseUrl;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || config?.supabaseAnonKey;
  return supabaseUrl && supabaseAnonKey ? { supabaseUrl: supabaseUrl.replace(/\/$/, ""), supabaseAnonKey } : null;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readDemoSession() {
  return readJson<DemoSession>(DEMO_SESSION_KEY);
}

function readSupabaseSession() {
  const session = readJson<SupabaseSession>(SUPABASE_SESSION_KEY);
  if (!session) return null;
  if (session.expires_at && session.expires_at * 1000 < Date.now()) {
    window.localStorage.removeItem(SUPABASE_SESSION_KEY);
    return null;
  }
  return session;
}

function writeDemoSession(values: SignupValues | { email: string; name?: string; company?: string }) {
  if (typeof window === "undefined") return;
  const email = values.email.trim().toLowerCase();
  const session: DemoSession = {
    user: { id: `demo_${crypto.randomUUID()}`, email, name: "responsible" in values ? values.responsible.trim() : values.name || email },
    organization: { id: `org_${crypto.randomUUID()}`, name: "responsible" in values ? values.company.trim() : values.company || "Empresa Free" },
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
}

function writeSupabaseSession(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  const session: SupabaseSession = {
    access_token: String(payload.access_token || ""),
    refresh_token: typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: payload.user as SupabaseSession["user"],
  };
  if (session.access_token) window.localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session));
}

async function supabaseAuthRequest(path: string, body: unknown): Promise<Record<string, unknown> | null> {
  const config = await getRuntimeAuthConfig();
  if (!config) return null;
  const response = await fetch(`${config.supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.msg || payload.error_description || payload.message || "Não foi possível autenticar agora."));
  return payload;
}

export async function signInCompany(values: LoginValues): Promise<AuthResult> {
  const identifier = values.identifier.trim().toLowerCase();
  const config = await getRuntimeAuthConfig();
  if (!config) {
    writeDemoSession({ email: identifier.includes("@") ? identifier : "demo@jobforged.local", name: "Administrador", company: "Empresa Free" });
    return { ok: true };
  }
  if (!identifier.includes("@")) return { ok: false, message: "Nesta primeira versão, o login real pelo Supabase usa e-mail. O CPF será vinculado ao perfil empresarial na próxima etapa." };
  try {
    const payload = await supabaseAuthRequest("token?grant_type=password", { email: identifier, password: values.password });
    if (payload) writeSupabaseSession(payload);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Credenciais inválidas." };
  }
}

export async function signUpCompany(values: SignupValues, planId: PlanId): Promise<AuthResult> {
  const config = await getRuntimeAuthConfig();
  if (!config) {
    writeDemoSession(values);
    return { ok: true };
  }
  try {
    const payload = await supabaseAuthRequest("signup", {
      email: values.email.trim().toLowerCase(),
      password: values.password,
      data: {
        account_type: "company_admin",
        responsible_name: values.responsible.trim(),
        company_name: values.company.trim(),
        company_cnpj: values.cnpj,
        phone: values.phone,
        plan_id: planId,
        plan_status: "free",
      },
    });
    if (payload?.access_token) writeSupabaseSession(payload);
    return { ok: true, requiresConfirmation: !payload?.access_token };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Cadastro não concluído." };
  }
}

export async function signOutCompany() {
  window.localStorage.removeItem(DEMO_SESSION_KEY);
  window.localStorage.removeItem(SUPABASE_SESSION_KEY);
}

export function useCompanyAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({ authenticated: false, checking: true, demo: !hasSupabaseConfig() });
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      await loadRuntimeConfig();
      const demo = readDemoSession();
      const session = readSupabaseSession();
      if (!active) return;
      setState({ authenticated: Boolean(session || demo), checking: false, demo: !session && Boolean(demo), email: session?.user?.email ?? demo?.user.email });
    };
    void refresh();
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return state;
}
