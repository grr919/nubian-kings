import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/oauth/authorize") return NextResponse.next();
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export const config = {
  matcher: [
    { source: "/:path*", has: [{ type: "host", value: "auth\\.nilesouth\\.app" }] },
  ],
};
