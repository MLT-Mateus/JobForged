import { isSupabaseConfigured } from "../_server";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ enabled: isSupabaseConfigured() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
