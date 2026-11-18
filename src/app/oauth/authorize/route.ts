import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const authOrigin = "https://auth.nilesouth.app";
const kingsOrigin = "https://kings.nilesouth.app";
const path = "/oauth/authorize";
const sessionCookie = "__Host-nile-south-pilot";
const callbacks = [
  { url: kingsOrigin + "/oauth/callback", name: "Nubian Kings", id: () => process.env.NILE_SOUTH_KINGS_CLIENT_ID },
  { url: "https://hoard.nilesouth.app/oauth/callback", name: "Coptic Wizard’s Hoard", id: () => process.env.NILE_SOUTH_HOARD_CLIENT_ID },
];

function response(status: number, body: string | null = null, extra: Record<string, string> = {}) {
  return new Response(body, { status, headers: {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extra,
  } });
}

function page(body: string, status = 200) {
  return response(status, '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nile South sign-in</title><main><h1>Nile South sign-in</h1>' + body + "</main></html>", {
    "Content-Type": "text/html; charset=utf-8",
  });
}

function idFrom(url: URL) {
  const ids = url.searchParams.getAll("authorization_id");
  return ids.length === 1 && /^[a-zA-Z0-9_-]{1,128}$/.test(ids[0]) ? ids[0] : null;
}

function entry(origin: string, id: string) {
  return origin + path + "?authorization_id=" + id;
}

function loginForm(id: string, failed = false) {
  return page((failed ? '<p role="alert">Sign-in was unsuccessful.</p>' : "") +
    '<form method="post" action="' + entry(authOrigin, id) + '">' +
    '<label>Email <input type="email" name="email" autocomplete="username" required></label><br>' +
    '<label>Password <input type="password" name="password" autocomplete="current-password" required></label><br>' +
    '<button name="action" value="login">Sign in</button></form>', failed ? 401 : 200);
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const userId = process.env.NILE_SOUTH_SSO_PILOT_USER_ID;
  return url && key && userId && callbacks.every(callback => callback.id()) ? { url, key, userId } : null;
}

function supabase(settings: NonNullable<ReturnType<typeof config>>) {
  return createClient(settings.url, settings.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function authorization(request: Request, id: string, approve: boolean) {
  const settings = config();
  if (!settings) return response(404);
  const jwt = request.headers.get("cookie")?.match(/(?:^|;\s*)__Host-nile-south-pilot=([\w.-]+)(?:;|$)/)?.[1];
  if (!jwt) return loginForm(id);

  const { data: { user }, error } = await supabase(settings).auth.getUser(jwt);
  if (error || user?.id !== settings.userId || user.is_anonymous || !user.email_confirmed_at) return loginForm(id);

  const endpoint = settings.url + "/auth/v1/oauth/authorizations/" + id;
  const headers = { apikey: settings.key, Authorization: "Bearer " + jwt, "Content-Type": "application/json" };
  const details = await fetch(endpoint, { headers, cache: "no-store", redirect: "error" });
  if (!details.ok) return page("<p>This authorization request is unavailable.</p>", 400);
  const data = await details.json();

  if (typeof data.redirect_url === "string") return callbackRedirect(data.redirect_url);
  const game = callbacks.find(callback => callback.id() === data.client?.id && callback.url === data.redirect_uri);
  if (!game || data.authorization_id !== id || data.user?.id !== user.id) return response(403);
  if (!approve) {
    return page('<p>Continue to ' + game.name + ' with your Nile South account.</p><form method="post" action="' +
      entry(authOrigin, id) + '"><button name="action" value="approve">Continue</button></form>');
  }

  const consent = await fetch(endpoint + "/consent", {
    method: "POST", headers, body: JSON.stringify({ action: "approve" }), cache: "no-store", redirect: "error",
  });
  if (!consent.ok) return page("<p>Authorization failed. Return to the game and try again.</p>", 400);
  return callbackRedirect((await consent.json()).redirect_url, game.url);
}

function callbackRedirect(destination: unknown, expected?: string) {
  if (typeof destination !== "string") return response(403);
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return response(403);
  }
  const base = url.origin + url.pathname;
  if (url.username || url.password || url.hash || !callbacks.some(callback => callback.url === base) ||
      (expected && expected !== base)) return response(403);
  return response(303, null, { Location: url.href });
}

function signedOutPage() {
  const nonce = randomBytes(16).toString("base64");
  const endpoints = [
    "https://kings.nilesouth.app/oauth/callback",
    "https://hoard.nilesouth.app/oauth/callback",
  ];
  const body = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nile South sign-out</title><main><h1>Nile South sign-out</h1><p id="status" role="status">Clearing the two game sessions…</p>
<noscript><p>JavaScript is required to clear both game sessions.</p></noscript>
<p><a href="https://kings.nilesouth.app/account">Nubian Kings</a> · <a href="https://hoard.nilesouth.app/">Coptic Wizard’s Hoard</a></p>
<script nonce="${nonce}">
const statusLine = document.getElementById("status");
Promise.allSettled(${JSON.stringify(endpoints)}.map(async endpoint => {
  const result = await fetch(endpoint, {
    method: "DELETE", credentials: "include", cache: "no-store", redirect: "error",
    headers: { "x-nile-south-session": "1" }, signal: AbortSignal.timeout(8000),
  });
  if (result.status !== 204) throw new Error("Could not clear a game session.");
})).then(results => {
  statusLine.textContent = results.every(result => result.status === "fulfilled")
    ? "Signed out of the Nile South pilot in this browser."
    : "A game session could not be cleared. Reload this page to retry.";
});
</script></main></html>`;
  return response(200, body, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; connect-src https://kings.nilesouth.app https://hoard.nilesouth.app; frame-ancestors 'none'; base-uri 'none'`,
    "Set-Cookie": sessionCookie + "=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.NILE_SOUTH_SSO_PILOT !== "enabled" || (url.origin !== kingsOrigin && url.origin !== authOrigin)) {
    return response(404);
  }
  if (url.origin === authOrigin && url.searchParams.get("logout") === "1") {
    return page('<p>Sign out of the pilot on both games in this browser.</p><form method="post" action="/oauth/authorize?logout=1"><button name="action" value="logout">Sign out</button></form>');
  }
  const id = idFrom(url);
  if (!id) return response(400);
  if (url.origin === kingsOrigin) return response(303, null, { Location: entry(authOrigin, id) });
  return authorization(request, id, false);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const settings = config();
  if (process.env.NILE_SOUTH_SSO_PILOT !== "enabled" || url.origin !== authOrigin || !settings) return response(404);
  if (request.headers.get("origin") !== authOrigin) return response(403);
  const id = idFrom(url);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return response(400);
  const form = await request.formData();
  if (url.searchParams.get("logout") === "1" && form.get("action") === "logout") return signedOutPage();
  if (!id) return response(400);
  if (form.get("action") === "approve") return authorization(request, id, true);
  const email = form.get("email");
  const password = form.get("password");
  if (form.get("action") !== "login" || typeof email !== "string" || typeof password !== "string" ||
      email.length > 320 || password.length > 4096) return response(400);

  const { data: { session, user }, error } = await supabase(settings).auth.signInWithPassword({ email: email.trim(), password });
  if (error || !session || user?.id !== settings.userId || user.is_anonymous || !user.email_confirmed_at) {
    return loginForm(id, true);
  }
  const maxAge = Math.min(session.expires_in, 900);
  return response(303, null, {
    Location: entry(authOrigin, id),
    "Set-Cookie": sessionCookie + "=" + session.access_token + "; Path=/; Max-Age=" + maxAge + "; Secure; HttpOnly; SameSite=Lax",
  });
}
