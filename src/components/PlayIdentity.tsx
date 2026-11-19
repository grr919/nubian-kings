"use client";

import { useEffect, useState } from "react";
import { useMultiplayerPlayerName } from "./MultiplayerPlayerName";

type Player = ReturnType<typeof useMultiplayerPlayerName>;

export default function PlayIdentity({ destination, playOptions }: {
  destination: string;
  playOptions: string;
}) {
  const player = useMultiplayerPlayerName();
  return <PlayIdentityChoice player={player} destination={destination} playOptions={playOptions} />;
}

export function PlayIdentityChoice({ player, destination, playOptions, multiplayer = false }: {
  player: Player;
  destination: string;
  playOptions: string;
  multiplayer?: boolean;
}) {
  const [guest, setGuest] = useState(false);
  const [sharedHost, setSharedHost] = useState(false);
  useEffect(() => {
    setSharedHost(location.hostname === "kings.nilesouth.app");
    try { setGuest(sessionStorage.getItem("nsg-guest-choice") === "1"); } catch {}
  }, []);
  useEffect(() => {
    if (player.status !== "registered") return;
    try { sessionStorage.removeItem("nsg-guest-choice"); } catch {}
    setGuest(false);
  }, [player.status]);
  const signIn = sharedHost ? "/oauth/callback?" + new URLSearchParams({
    start: "1", return_to: destination
  }) : "/account";

  function chooseGuest() {
    setGuest(true);
    try { sessionStorage.setItem("nsg-guest-choice", "1"); } catch {}
    const options = document.getElementById(playOptions);
    (options instanceof HTMLInputElement ? options : options?.querySelector<HTMLElement>("button, a[href], input"))?.focus();
  }

  return <section aria-label="Nile South account" className="playIdentity">
    {player.status === "registered" ? <>
      <p><strong>Signed in to Nile South</strong> · {player.name}</p>
      <div className="actions"><a href="/account/games">My Nile South games</a><a href="/account">Manage account</a></div>
    </> : <>
      <div className="actions">
        <a className="buttonLink" href={signIn}>Sign in with Nile South</a>
        {player.status !== "missing" && (guest || multiplayer && player.status === "guest" ?
          <strong role="status">Playing as a guest</strong> :
          <button className="secondary" type="button" onClick={chooseGuest}>Play as a guest</button>)}
      </div>
      <p>Sign in to resume eligible online seats on another device. {multiplayer ? "Guest seats are tied to this browser." : "Solo games save in this browser."}</p>
      <div className="actions"><a href="https://auth.nilesouth.app/account?mode=create">Create account</a><a href="https://auth.nilesouth.app/account/recover">Forgot password?</a></div>
    </>}
  </section>;
}
