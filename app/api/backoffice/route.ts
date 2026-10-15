import type { NextRequest } from "next/server";
import { readSession, requestDatabase } from "@/app/api/auth/_server";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session?.platformAdmin) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const response = await requestDatabase("rpc/platform_overview", session.accessToken, {});
  if (!response?.ok) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  return Response.json({ overview: await response.json() }, { headers });
}
