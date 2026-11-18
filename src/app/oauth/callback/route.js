import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const transactionCookie = "__Host-nile-south-oauth";
const sessionCookie = "__Host-nile-south-game";
const route = "/oauth/callback";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}

function readCookie(request, name) {
  return (request.headers.get("cookie") ?? "").split(";").map(part => part.trim())
    .find(part => part.startsWith(name + "="))?.slice(name.length + 1);
}

function sameState(left, right) {
  return /^[\w-]{43}$/.test(left ?? "") && /^[\w-]{43}$/.test(right ?? "") &&
    timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function redirect(location, cookies = []) {
  const result = new Headers({ ...headers, Location: location });
  for (const value of cookies) result.append("Set-Cookie", value);
  return new Response(null, { status: 303, headers: result });
}

async function gameOAuth(request, { origin, clientId, landing, supabaseUrl, publishableKey }) {
  const userId = process.env.NILE_SOUTH_SSO_PILOT_USER_ID;
  const url = new URL(request.url);
  if (process.env.NILE_SOUTH_SSO_PILOT !== "enabled" || url.origin !== origin ||
      !clientId || !userId || !supabaseUrl || !publishableKey) {
    return new Response(null, { status: 404, headers });
  }

  const callback = origin + route;
  const target = origin + landing;
  const clearTransaction = cookie(transactionCookie, "", 0);
  if (url.searchParams.get("start") === "1" && !url.searchParams.has("code") && !url.searchParams.has("error")) {
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const authorize = new URL("/auth/v1/oauth/authorize", supabaseUrl);
    authorize.search = new URLSearchParams({
      response_type: "code", client_id: clientId, redirect_uri: callback, state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    return redirect(authorize.href, [cookie(transactionCookie, state + "." + verifier, 600)]);
  }

  const [expectedState, verifier] = (readCookie(request, transactionCookie) ?? "").split(".");
  const states = url.searchParams.getAll("state");
  const codes = url.searchParams.getAll("code");
  const failure = () => redirect(target + "?sso=failed", [clearTransaction]);
  if (states.length !== 1 || !sameState(expectedState, states[0]) || !/^[\w-]{43}$/.test(verifier ?? "") ||
      codes.length !== 1 || !codes[0] || codes[0].length > 2048 || url.searchParams.has("error")) {
    return failure();
  }

  try {
    const exchange = await fetch(new URL("/auth/v1/oauth/token", supabaseUrl), {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({
        grant_type: "authorization_code", code: codes[0], client_id: clientId,
        redirect_uri: callback, code_verifier: verifier,
      }),
    });
    if (!exchange.ok) return failure();
    const tokens = await exchange.json();
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(tokens.access_token ?? "") || tokens.access_token.length > 3500 ||
        !Number.isFinite(tokens.expires_in) || tokens.expires_in < 1) return failure();

    const userResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
      headers: { apikey: publishableKey, Authorization: "Bearer " + tokens.access_token },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
    });
    if (!userResponse.ok) return failure();
    const user = await userResponse.json();
    if (user.id !== userId || user.is_anonymous || !user.email_confirmed_at) return failure();

    return redirect(target, [
      clearTransaction,
      cookie(sessionCookie, tokens.access_token, Math.floor(Math.min(tokens.expires_in, 900))),
    ]);
  } catch {
    return failure();
  }
}

export function GET(request) {
  return gameOAuth(request, {
    origin: "https://kings.nilesouth.app",
    clientId: process.env.NILE_SOUTH_KINGS_CLIENT_ID,
    landing: "/account",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
