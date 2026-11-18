const authorizationUi = "https://auth.nilesouth.app/oauth/authorize";

export function GET(request: Request): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
  const url = new URL(request.url);
  if (process.env.NILE_SOUTH_SSO_PILOT !== "enabled" || url.origin !== "https://kings.nilesouth.app") {
    return new Response(null, { status: 404, headers });
  }

  const ids = url.searchParams.getAll("authorization_id");
  if (ids.length !== 1 || !/^[a-zA-Z0-9_-]{1,128}$/.test(ids[0])) {
    return new Response("Invalid authorization request.", { status: 400, headers });
  }

  const destination = new URL(authorizationUi);
  destination.searchParams.set("authorization_id", ids[0]);
  headers.set("Location", destination.href);
  return new Response(null, { status: 303, headers });
}
