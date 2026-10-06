export async function simulateAuthentication(kind: "login" | "signup", identifier: string) {
  await new Promise((resolve) => window.setTimeout(resolve, 900));
  if (identifier.toLowerCase().endsWith("@erro.local")) throw new Error("Não foi possível validar os dados agora. Tente novamente.");
  return { ok: true, kind } as const;
}

