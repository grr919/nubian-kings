import Link from "next/link";
import EparchCrownMark from "@/components/EparchCrownMark";

export default function Home() {
  return (
    <main className="landing levelLanding">
      <section className="panel levelSelectPanel">
        <p className="kicker">THE BATTLE FOR AFRICA</p>
        <EparchCrownMark className="royalMark" />
        <h1>Nubian Kings</h1>
        <p className="subtitle">Choose a level</p>
        <div className="levelGrid">
          <Link href="/beginner" className="levelOption">
            <span className="levelName">Beginner</span>
            <strong>The Al-Azhar Mosque</strong>
            <small>Five-card armies and shared comparisons</small>
            <span className="levelAction">Play Beginner</span>
          </Link>
          <Link href="/amateur" className="levelOption">
            <span className="levelName">Amateur</span>
            <strong>The Cathedral at Qasr Ibrim</strong>
            <small>Protected heirs and targeted attacks</small>
            <span className="levelAction">Play Amateur</span>
          </Link>
          <Link href="/master" className="levelOption">
            <span className="levelName">Master</span>
            <strong>The Rock Church of Lalibela</strong>
            <small>Twenty-card armies in hidden formations</small>
            <span className="levelAction">Play Master</span>
          </Link>
        </div>
        <small className="profileNote">Core profile · Special card effects are not used</small>
        <footer className="landingFooter">© 2026 Nile South Games</footer>
      </section>
    </main>
  );
}
