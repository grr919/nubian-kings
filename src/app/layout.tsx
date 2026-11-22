import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nubian Kings",
  description: "Private Core-rules playtest prototype",
  robots: { index: false, follow: false },
};

// Run before the browser paints the landing page. The shared script starts
// after hydration and can briefly cover a page that the player already saw.
const restoreSharedSignIn = `
(() => {
  const returnTo = location.pathname + location.search;
  if (location.hostname !== "kings.nilesouth.app" ||
      (returnTo !== "/" && returnTo !== "/account") ||
      (location.hash && location.hash !== "#nsg-account-ui")) return;

  const attemptKey = "nile-south-direct-sign-in";
  const root = document.documentElement;
  const reveal = () => root.classList.remove("checking-shared-sign-in");
  root.classList.add("checking-shared-sign-in");
  addEventListener("pageshow", event => { if (event.persisted) reveal(); });

  async function checkSession() {
    let navigating = false;
    try {
      const local = await fetch("/oauth/callback", {
        method: "POST",
        headers: { "x-nile-south-session": "1" },
        cache: "no-store",
        signal: AbortSignal.timeout(1600),
      });
      if (local.ok && (await local.json()).accessToken) {
        sessionStorage.removeItem(attemptKey);
        return;
      }
      if (Date.now() - Number(sessionStorage.getItem(attemptKey)) < 20000) return;
      const shared = await fetch("https://auth.nilesouth.app/oauth/authorize?session-check=1", {
        credentials: "include",
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(1600),
      });
      if (shared.status !== 204 || document.visibilityState === "hidden") return;
      const query = new URLSearchParams({ start: "1", return_to: returnTo + location.hash });
      sessionStorage.setItem(attemptKey, String(Date.now()));
      location.replace("/oauth/callback?" + query);
      navigating = true;
    } catch {
      // Keep the landing page available when the session check fails.
    } finally {
      if (!navigating) reveal();
    }
  }

  function start() {
    if (document.visibilityState === "hidden") return;
    document.removeEventListener("visibilitychange", start);
    void checkSession();
  }
  document.addEventListener("visibilitychange", start);
  start();
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{".checking-shared-sign-in body { visibility: hidden; }"}</style>
        <script dangerouslySetInnerHTML={{ __html: restoreSharedSignIn }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
