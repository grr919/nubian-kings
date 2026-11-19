import { createHash, randomBytes } from "node:crypto";

const transactionCookie = "__Host-nile-south-oauth";
const sessionCookie = "__Host-nile-south-game";
const route = "/oauth/callback";
const returnPaths = new Set(["/","/account","/beginner","/amateur","/master","/beginner/multiplayer","/amateur/multiplayer","/master/multiplayer"]);
function allowedReturn(value) {
  if (/^\/(?:beginner|amateur|master)\/multiplayer\?(?:room=[A-Z2-9]{6}|setup=(?:create|join))$/.test(value || "")) return value;
  const path = value?.split("#")[0];
  return returnPaths.has(path) && (path === value || value === path + "#nsg-account-ui") ? value : "";
}
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}

function readCookie(request, name) {
  return (request.headers.get("cookie") ?? "").split(";").map(part => part.trim())
    .find(part => part.startsWith(name + "="))?.slice(name.length + 1);
}

function redirect(location, cookies = []) {
  const result = new Headers({ ...headers, Location: location });
  for (const value of cookies) result.append("Set-Cookie", value);
  return new Response(null, { status: 303, headers: result });
}

async function gameOAuth(request, { origin, clientId, landing, supabaseUrl, publishableKey }) {
  const pilotUserIds = (process.env.NILE_SOUTH_SSO_PILOT_USER_ID ?? "").split(",").map(id => id.trim()).filter(Boolean);
  const publicAccess = process.env.NILE_SOUTH_SSO_ACCESS === "public";
  const url = new URL(request.url);
  if (process.env.NILE_SOUTH_SSO_PILOT !== "enabled" || url.origin !== origin ||
      !clientId || (!publicAccess && !pilotUserIds.length) || !supabaseUrl || !publishableKey) {
    return new Response(null, { status: 404, headers });
  }

  const callback = origin + route;
  if (url.searchParams.get("start") === "1" && !url.searchParams.has("code") && !url.searchParams.has("error")) {
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const authorize = new URL("/auth/v1/oauth/authorize", supabaseUrl);
    authorize.search = new URLSearchParams({
      response_type: "code", client_id: clientId, redirect_uri: callback, state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    const returnTo = allowedReturn(url.searchParams.get("return_to"));
    const transaction = returnTo ? verifier + "." + Buffer.from(returnTo).toString("base64url") : verifier;
    return redirect(authorize.href, [cookie(`${transactionCookie}-${state}`, transaction, 600)]);
  }

  const states = url.searchParams.getAll("state");
  const codes = url.searchParams.getAll("code");
  const name = states.length === 1 && /^[\w-]{43}$/.test(states[0]) ? `${transactionCookie}-${states[0]}` : null;
  const [verifier, continuation] = (name ? readCookie(request, name) ?? "" : "").split(".");
  const returnTo = continuation && /^[\w-]{1,256}$/.test(continuation)
    ? allowedReturn(Buffer.from(continuation, "base64url").toString("utf8"))
    : "";
  const target = new URL(returnTo || landing, origin);
  const failedTarget = new URL(target);
  failedTarget.searchParams.set("sso", "failed");
  const clearTransaction = name ? [cookie(name, "", 0)] : [];
  const failure = () => redirect(failedTarget.href, clearTransaction);
  if (!/^[\w-]{43}$/.test(verifier ?? "") ||
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
    if (!user.id || (!publicAccess && !pilotUserIds.includes(user.id)) || user.is_anonymous || !user.email_confirmed_at) return failure();

    return redirect(target.href, [
      ...clearTransaction,
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

async function pilotSession(request, origin) {
  const noSession = () => new Response(null, { status: 204, headers });
  if (process.env.NILE_SOUTH_SSO_PILOT !== "enabled" || new URL(request.url).origin !== origin) return noSession();
  const sender = request.headers.get("origin");
  const sharedLogout = sender === "https://auth.nilesouth.app" &&
    (request.method === "OPTIONS" || request.method === "DELETE");
  const cors = sharedLogout ? {
    "Access-Control-Allow-Origin": sender,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "DELETE",
    "Access-Control-Allow-Headers": "x-nile-south-session",
    Vary: "Origin",
  } : {};
  if (sharedLogout && request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, ...cors } });
  if ((!sharedLogout && sender !== origin) || request.headers.get("x-nile-south-session") !== "1") {
    return new Response(null, { status: 403, headers });
  }
  if (request.method === "DELETE") {
    return new Response(null, { status: 204, headers: { ...headers, ...cors, "Set-Cookie": cookie(sessionCookie, "", 0) } });
  }
  const publicAccess = process.env.NILE_SOUTH_SSO_ACCESS === "public";
  const token = readCookie(request, sessionCookie);
  if (!token || token.length > 3500 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return publicAccess ? Response.json({ publicAccess }, { headers }) : noSession();
  return Response.json({ accessToken: token, publicAccess }, { headers });
}

export function POST(request) {
  return pilotSession(request, "https://kings.nilesouth.app");
}

export const DELETE = POST;
export const OPTIONS = POST;
