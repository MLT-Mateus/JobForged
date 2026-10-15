"use client";

import { useEffect, useState } from "react";
import type { LoginValues, SignupValues } from "./auth-validation";

type AuthResult = { ok: true; requiresConfirmation?: boolean; message?: string; status?: number } | { ok: false; message: string; status?: number };
export type AuthSessionState = {
  authenticated: boolean;
  checking: boolean;
  demo: false;
  email?: string;
  company?: { id: string; name: string } | null;
  role?: string;
  platformAdmin?: boolean;
  fullName?: string;
};

async function postAuth(path: string, body?: unknown): Promise<AuthResult> {
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string; requiresConfirmation?: boolean };
    if (!response.ok) return { ok: false, message: payload.message || "Não foi possível concluir a solicitação.", status: response.status };
    return { ok: true, requiresConfirmation: payload.requiresConfirmation, message: payload.message, status: response.status };
  } catch {
    return { ok: false, message: "Serviço de autenticação indisponível. Tente novamente em instantes." };
  }
}

export function signInCompany(values: LoginValues) {
  return postAuth("sign-in", { email: values.identifier.trim().toLowerCase(), password: values.password });
}

export function signUpCompany(values: SignupValues) {
  return postAuth("sign-up", {
    responsible: values.responsible,
    company: values.company,
    cnpj: values.cnpj,
    phone: values.phone,
    email: values.email.trim().toLowerCase(),
    password: values.password,
    confirmPassword: values.confirmPassword,
    acceptedTerms: true,
  });
}

export function requestPasswordRecovery(email: string) {
  return postAuth("recover", { email: email.trim().toLowerCase() });
}

export function verifyPasswordRecovery(tokenHash: string, type: "recovery" | "invite" = "recovery") {
  return postAuth("recovery/session", { tokenHash, type });
}

export function updateRecoveredPassword(password: string, confirmPassword: string) {
  return postAuth("recovery/password", { password, confirmPassword });
}

export async function signOutCompany() {
  await postAuth("sign-out");
}

const initialState: AuthSessionState = { authenticated: false, checking: true, demo: false };

export function useCompanyAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(initialState);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
        const session = response.ok ? (await response.json()) as { email?: string; company?: { id: string; name: string } | null; role?: string; platformAdmin?: boolean; fullName?: string } : null;
        if (!active) return;
        setState({
          authenticated: Boolean(session),
          checking: false,
          demo: false,
          email: session?.email,
          company: session?.company,
          role: session?.role,
          platformAdmin: session?.platformAdmin,
          fullName: session?.fullName,
        });
      } catch {
        if (active) setState({ authenticated: false, checking: false, demo: false });
      }
    };

    void refresh();
    return () => { active = false; };
  }, []);

  return state;
}
