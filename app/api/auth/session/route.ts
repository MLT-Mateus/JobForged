import type { NextRequest } from "next/server";
import { readSession } from "../_server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Cookie" });
  const session = await readSession(request, headers);
  if (!session) return Response.json({ authenticated: false }, { status: 401, headers });
  return Response.json({ authenticated: true, id: session.id, email: session.email,
    platformAdmin: session.platformAdmin, company: session.company, role: session.role,
    originSlug:"originSlug" in session?session.originSlug:undefined, fullName: "fullName" in session ? session.fullName : undefined }, { headers });
}
