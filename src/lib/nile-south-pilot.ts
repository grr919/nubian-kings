const headers = { "x-nile-south-session": "1" };

export async function pilotAccessToken(): Promise<string | null> {
  if (window.location.hostname !== "kings.nilesouth.app") return null;
  try {
    const response = await fetch("/oauth/callback", { method: "POST", headers, cache: "no-store" });
    if (response.status !== 200) return null;
    const { accessToken } = await response.json();
    return typeof accessToken === "string" ? accessToken : null;
  } catch {
    return null;
  }
}

export async function endLocalPilotSession() {
  const response = await fetch("/oauth/callback", { method: "DELETE", headers, cache: "no-store" });
  if (!response.ok) throw new Error("Could not sign out of this game.");
  window.location.assign("https://auth.nilesouth.app/oauth/authorize?logout=1");
}
