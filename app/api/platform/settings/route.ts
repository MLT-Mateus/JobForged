import { getSupabaseConfig, requestDatabase } from "@/app/api/auth/_server";
export const runtime = "nodejs";
export async function GET() {
  const config = getSupabaseConfig();
  const response = config ? await requestDatabase("rpc/platform_public_settings", config.anonKey, {}) : null;
  if (!response?.ok) return Response.json({ message: "Configurações indisponíveis." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
}
