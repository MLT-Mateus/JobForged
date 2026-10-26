import { NextRequest, NextResponse } from "next/server";
/** Reachable state pages retain HTTP semantics; APIs are never intercepted. */
export function proxy(request: NextRequest) {
  return NextResponse.next({ status: request.nextUrl.pathname === "/503" ? 503 : 500, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
export const config = { matcher: ["/500", "/503"] };
