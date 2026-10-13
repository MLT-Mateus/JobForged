import { NextResponse, type NextRequest } from "next/server";

const liveIndexablePaths = new Set(["/", "/termos-servico", "/politicas-privacidade", "/politicas-exclusao"]);

export function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isTest = hostname === "test.jobforged.com";

  // Metadata routes are generated as static artifacts. On Test, remove the
  // Live sitemap discovery link without blocking crawlers from seeing noindex.
  if (isTest && request.nextUrl.pathname === "/robots.txt") {
    return new Response("User-Agent: *\nAllow: /\nDisallow: /api/\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow, noarchive" },
    });
  }

  const response = NextResponse.next();
  const isNotApprovedLivePublicPage = hostname !== "jobforged.com" || !liveIndexablePaths.has(request.nextUrl.pathname);

  if (isTest || (isNotApprovedLivePublicPage && !["/robots.txt", "/sitemap.xml"].includes(request.nextUrl.pathname))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

export const config = {
  matcher: ["/((?!assets/|_next/static|_next/image|brand/|favicon.ico|favicon.svg).*)"],
};
