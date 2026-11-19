import { NextResponse, type NextRequest } from "next/server";

const accountRoutes = new Set([
  "/oauth/authorize",
  "/account",
  "/account/recover",
  "/account/games",
  "/api/account/games",
]);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (accountRoutes.has(pathname) || pathname.startsWith("/_next/static/")) return NextResponse.next();
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export const config = {
  matcher: [
    { source: "/:path*", has: [{ type: "host", value: "auth\\.nilesouth\\.app" }] },
  ],
};
