import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const authOrigin = "https://auth.nilesouth.app";
const kingsOrigin = "https://kings.nilesouth.app";
const path = "/oauth/authorize";
const sessionCookie = "__Host-nile-south-pilot";
const callbacks = [
  { url: kingsOrigin + "/oauth/callback", name: "Nubian Kings", id: () => process.env.NILE_SOUTH_KINGS_CLIENT_ID },
  { url: "https://hoard.nilesouth.app/oauth/callback", name: "Coptic Wizard’s Hoard", id: () => process.env.NILE_SOUTH_HOARD_CLIENT_ID },
];

const herd = {
  url: "https://herd.nilesouth.app/oauth/callback",
  name: "A Mighty Herd",
  id: () => process.env.NILE_SOUTH_HERD_CLIENT_ID,
};

const adwa = {
  url: "https://adwa.nilesouth.app/oauth/callback",
  name: "Adwa",
  id: () => process.env.NILE_SOUTH_ADWA_CLIENT_ID,
};

function activeCallbacks() {
  return [...callbacks, ...[herd, adwa].filter(game => game.id())];
}

function response(status: number, body: string | null = null, extra: Record<string, string> = {}) {
  return new Response(body, { status, headers: {
    "Cache-Control": "no-store",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extra,
  } });
}

const logoUrl = "https://nilesouth.app/highland-logo.jpg";
const pageStyles = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: clamp(1rem, 5vw, 4rem);
    background: radial-gradient(ellipse at 12% 9%, #356f65 0%, transparent 52%),
                radial-gradient(ellipse at 96% 100%, #854735 0%, transparent 56%), #172f37;
    color: #253b36;
    font: 1rem/1.55 system-ui, sans-serif;
  }
  main {
    width: min(100%, 29rem);
    padding: clamp(1.5rem, 6vw, 3rem);
    border: 1px solid #e8d8b9;
    border-top: 5px solid #d5a759;
    border-radius: 1.25rem;
    background: #fff9ed;
    box-shadow: 0 24px 70px #101d2b55;
    text-align: center;
  }
  img {
    display: block;
    width: min(100%, 13.5rem);
    height: auto;
    margin: 0 auto 1.35rem;
    border-radius: .65rem;
  }
  h1 {
    margin: 0 0 1.55rem;
    color: #183e38;
    font: 600 clamp(1.8rem, 6vw, 2.45rem)/1.15 Georgia, serif;
  }
  p { margin: 0 0 1.25rem; }
  p:last-child { margin-bottom: 0; }
  form { display: grid; gap: 1.05rem; }
  label { display: grid; gap: .4rem; text-align: left; font-weight: 650; }
  input, button { font: inherit; border-radius: .55rem; min-height: 3rem; }
  input {
    width: 100%;
    padding: .65rem .8rem;
    border: 1px solid #90836c;
    background: #fffdfa;
    color: #213732;
  }
  button {
    margin-top: .4rem;
    padding: .65rem 1rem;
    border: 1px solid transparent;
    background: #245c50;
    color: #fff9ed;
    font-weight: 700;
    cursor: pointer;
  }
  button:hover { background: #19483e; }
  a { color: #245c50; text-underline-offset: .18em; }
  :focus-visible { outline: 3px solid #a65432; outline-offset: 3px; }
  [role="alert"] {
    padding: .65rem .85rem;
    border-radius: .55rem;
    background: #f8e3d8;
    color: #792f20;
  }
`;
const styleHash = createHash("sha256").update(pageStyles).digest("base64");

function page(body: string, status = 200) {
  return response(status, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nile South sign-in</title>
<style>${pageStyles}</style>
</head>
<body>
<main>
<img src="${logoUrl}" alt="Nile South Games" width="420" height="280">
<h1>Nile South sign-in</h1>
${body}
</main>
</body>
</html>`, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": `default-src 'none'; style-src 'sha256-${styleHash}'; img-src ${logoUrl}; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,
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
    '<label>Email <input type="email" name="email" autocomplete="username" required></label>' +
    '<label>Password <input type="password" name="password" autocomplete="current-password" required></label>' +
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
  if (!details.ok) {
    return page('<p>This sign-in request expired or was already used. Start again from the game.</p>' +
      '<p><a href="https://kings.nilesouth.app/oauth/callback?start=1">Continue to Nubian Kings</a> · ' +
      activeCallbacks().slice(1).map(game => `<a href="${game.url}?start=1">Continue to ${game.name}</a>`).join(" · ") + "</p>", 400);
  }
  const data = await details.json();

  if (typeof data.redirect_url === "string") return callbackRedirect(data.redirect_url);
  const game = activeCallbacks().find(callback => callback.id() === data.client?.id && callback.url === data.redirect_uri);
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
  if (url.username || url.password || url.hash || !activeCallbacks().some(callback => callback.url === base) ||
      (expected && expected !== base)) return response(403);
  return response(303, null, { Location: url.href });
}

function signedOutPage() {
  const nonce = randomBytes(16).toString("base64");
  const endpoints = activeCallbacks().map(callback => callback.url);
  const gameOrigins = endpoints.map(endpoint => new URL(endpoint).origin).join(" ");
  const body = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nile South sign-out</title><main><h1>Nile South sign-out</h1><p id="status" role="status">Clearing your shared game sessions…</p>
<noscript><p>JavaScript is required to clear the game sessions.</p></noscript>
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
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; connect-src ${gameOrigins}; frame-ancestors 'none'; base-uri 'none'`,
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
