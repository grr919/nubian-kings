import Link from "next/link";
import EparchCrownMark from "@/components/EparchCrownMark";

export default function Home() {
  return (
    <main className="landing levelLanding nkMain">
      <div className="nkBackdrop" aria-hidden="true">
        <div className="nkLeftFigure">
          <svg viewBox="0 0 220 420" role="presentation">
            <path d="M48 53 76 16l30 13 27-14 30 38-15 22H62Z" fill="#a86b32" stroke="#6f3e24" strokeWidth="5"/>
            <path d="M67 55h77l-9 34H77Z" fill="#d7b264" stroke="#7d4a29" strokeWidth="4"/>
            <circle cx="103" cy="111" r="35" fill="#5b321f"/>
            <path d="M92 84c28 3 44 20 45 41-7-9-16-14-26-17l-2 43-28-8c-8-18-4-43 11-59Z" fill="#6b3c25"/>
            <path d="M112 103c8 3 14 9 18 17-6 3-12 6-18 7Z" fill="#c9924f" opacity=".8"/>
            <circle cx="111" cy="113" r="3" fill="#20140d"/>
            <circle cx="77" cy="128" r="10" fill="none" stroke="#d8b969" strokeWidth="4"/>
            <path d="M59 160c24-14 63-14 91 1l18 116-129 3Z" fill="#a9573e" stroke="#6f3e24" strokeWidth="4"/>
            <path d="M75 159 96 277M132 160l-16 117" stroke="#d5b06c" strokeWidth="8"/>
            <path d="M56 183 40 343M147 182l21 161" stroke="#6f3e24" strokeWidth="7"/>
            <path d="M22 340h43M143 340h47" stroke="#6f3e24" strokeWidth="7"/>
            <path d="M188 142v208" stroke="#704025" strokeWidth="6"/>
            <path d="M176 155h24M188 143v24" stroke="#704025" strokeWidth="6"/>
            <path d="M39 280h119" stroke="#d6b468" strokeWidth="4" opacity=".6"/>
          </svg>
        </div>

        <div className="nkRightFort">
          <svg viewBox="0 0 330 260" role="presentation">
            <path d="M49 209 69 101h52V64h58v40h53l18 105Z" fill="#9a6338" stroke="#6c4429" strokeWidth="4"/>
            <path d="M139 63 150 33l11 30Z" fill="#75482c"/>
            <path d="M126 209v-63c0-20 16-35 35-35s35 15 35 35v63Z" fill="#5f3a26"/>
            <path d="M72 120h28v27H72Zm119 8h28v26h-28Z" fill="#6b4028"/>
            <path d="M15 224c44-22 95-28 142-21 54 8 105 6 159-13" fill="none" stroke="#73503a" strokeWidth="6"/>
            <path d="M271 80c-16 15-17 43-4 61M286 71c-20 19-20 48-5 72M301 84c-15 14-16 38-4 53" fill="none" stroke="#5f4f35" strokeWidth="4"/>
            <path d="M284 70v91M301 82v84M268 80v87" stroke="#5f4f35" strokeWidth="4"/>
          </svg>
        </div>

        <div className="nkNile">
          <svg viewBox="0 0 1600 250" preserveAspectRatio="none" role="presentation">
            <path d="M0 139c180-44 342-42 506-15 180 30 340 20 510-11 182-33 365-28 584 23v114H0Z" fill="#9a7047" opacity=".5"/>
            <path d="M0 169c209-28 399-22 566 1 211 30 406 20 610-12 143-22 282-14 424 13v79H0Z" fill="#6d5c46" opacity=".34"/>
            <path d="M0 193c250 11 415-18 640-4 245 16 451-6 960 2" fill="none" stroke="#5a7280" strokeWidth="8" opacity=".48"/>
            <g fill="#745135" opacity=".9">
              <path d="M90 186h86l-43-62Z"/><path d="M110 187h57l-30 35Z"/>
              <path d="M510 193h68l-34-48Z"/><path d="M521 194h50l-24 25Z"/>
              <path d="M1190 186h112l-56-76Z"/><path d="M1216 188h61l-30 38Z"/>
            </g>
          </svg>
        </div>
        <div className="nkManuscript nkManuscriptLeft">✣ · ✢ · ✣<br/>ⲡⲉ · ⲛⲟⲩ · ⲡⲁ<br/>✢ · ⲙⲁ · ⲛⲉ</div>
        <div className="nkManuscript nkManuscriptRight">✣ · ⲧⲉ · ⲛⲁ<br/>ⲡⲉ · ⲕⲁ · ⲙⲁ<br/>✢ · ✣ · ✢</div>
      </div>

      <section className="nkShell" aria-label="Nubian Kings main menu">
        <header className="nkHero">
          <EparchCrownMark className="royalMark" />
          <h1>Nubian Kings</h1>
          <p className="kicker">THE BATTLE FOR AFRICA</p>
        </header>

        <section className="panel levelSelectPanel nkPanel">
          <p className="nkChoose">Choose a level</p>
          <div className="levelGrid nkLevelGrid">
            <Link href="/beginner" className="levelOption nkLevelOption beginnerTone">
              <span className="levelName">Beginner</span>
              <strong>The Al-Azhar Mosque</strong>
              <small>Five-card armies and shared comparisons</small>
              <span className="levelAction">Play Beginner</span>
            </Link>
            <Link href="/amateur" className="levelOption nkLevelOption amateurTone">
              <span className="levelName">Amateur</span>
              <strong>The Cathedral at Qasr Ibrim</strong>
              <small>Protected heirs and targeted attacks</small>
              <span className="levelAction">Play Amateur</span>
            </Link>
            <Link href="/master" className="levelOption nkLevelOption masterTone">
              <span className="levelName">Master</span>
              <strong>The Rock Church of Lalibela</strong>
              <small>Twenty-card armies in hidden formations</small>
              <span className="levelAction">Play Master</span>
            </Link>
          </div>
          <small className="profileNote">Core profile · Special card effects are not used</small>
        </section>

        <footer className="nkFooter">
          <span className="nkDivider">☥</span>
          <strong>Explore a golden age of African civilization</strong>
          <small>© 2026 Nile South Games</small>
        </footer>
      </section>

      <style>{`
        .nkMain{position:relative;isolation:isolate;min-height:100svh;padding:28px 22px 170px;overflow:hidden;background:#d6bc8f;color:#283747;display:block}
        .nkMain:before{content:"";position:absolute;inset:0;z-index:-4;background:
          radial-gradient(circle at 50% 5%,#f7e9c9 0,#e5cfaa 36%,#cfaa77 100%),
          repeating-linear-gradient(0deg,#6d3e1b08 0 1px,transparent 1px 5px),
          repeating-linear-gradient(90deg,#6d3e1b08 0 1px,transparent 1px 7px)}
        .nkMain:after{content:"";position:absolute;inset:10px;z-index:5;pointer-events:none;border:1px solid #8b5928;box-shadow:inset 0 0 0 7px #d2a86955,inset 0 0 55px #5f35172b}
        .nkBackdrop{position:absolute;inset:0;z-index:-2;pointer-events:none;overflow:hidden;color:#7b4a2d}
        .nkLeftFigure{position:absolute;left:0;top:10px;width:min(22vw,250px);opacity:.72}
        .nkLeftFigure svg{display:block;width:100%;height:auto}
        .nkRightFort{position:absolute;right:-8px;top:105px;width:min(25vw,360px);opacity:.72}
        .nkRightFort svg{display:block;width:100%;height:auto}
        .nkNile{position:absolute;left:0;right:0;bottom:0;height:200px;opacity:.78}
        .nkNile svg{width:100%;height:100%;display:block}
        .nkManuscript{position:absolute;font:700 clamp(.72rem,1.4vw,1.1rem)/1.9 Georgia,serif;letter-spacing:.14em;color:#7f4b2f;opacity:.34;text-shadow:0 1px #fff4}
        .nkManuscriptLeft{left:15%;top:22px}.nkManuscriptRight{right:14%;top:24px;text-align:right}
        .nkShell{position:relative;z-index:1;width:min(980px,100%);margin:0 auto;text-align:center}
        .nkHero{padding-top:8px;margin-bottom:22px;text-shadow:0 2px 0 #fff5}
        .nkHero .royalMark{width:104px;height:84px;color:#c59631;filter:drop-shadow(0 3px 1px #7b4c1e66);fill:none;stroke:currentColor;stroke-width:2.1}
        .nkHero h1{margin:-4px 0 2px;font-size:clamp(3.2rem,8vw,6.2rem);font-weight:500;line-height:.92;letter-spacing:.025em;text-transform:uppercase;color:#5e3b14;text-shadow:0 2px #f7e7bd,0 5px 12px #69431d2b}
        .nkHero .kicker{margin-top:10px;color:#26384b;font-size:clamp(.74rem,1.4vw,1.04rem);letter-spacing:.3em}
        .nkPanel{position:relative;width:100%;padding:clamp(26px,4vw,42px);background:linear-gradient(180deg,#f7ead0f5,#ead3aaf2);border:1px solid #b3864f;outline:1px solid #fff8df;outline-offset:-7px;border-radius:7px;box-shadow:0 12px 26px #70451f45,0 2px 0 #fff8 inset;color:#24384a}
        .nkChoose{margin:0 0 22px;font-size:clamp(1.8rem,4vw,2.65rem);font-weight:700}
        .nkLevelGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:0}
        .nkLevelOption{position:relative;min-height:190px;padding:22px 18px 18px;border:1px solid #6d5436;border-radius:5px;text-decoration:none;color:#f9f1df;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;box-shadow:0 4px 0 #4a3825,0 9px 16px #4b2d1838,inset 0 1px #fff4;transition:transform .15s ease,filter .15s ease}
        .nkLevelOption:hover{transform:translateY(-2px);filter:brightness(1.08)}
        .beginnerTone{background:linear-gradient(#0d7047,#075137)}
        .amateurTone{background:linear-gradient(#0b5f91,#08436b)}
        .masterTone{background:linear-gradient(#a16526,#754516)}
        .nkLevelOption .levelName{font:700 .73rem/1 Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#fff0c2}
        .nkLevelOption strong{font-size:1.28rem;line-height:1.2}.nkLevelOption small{color:#f6ead2;line-height:1.35}.nkLevelOption .levelAction{margin-top:4px;padding-top:9px;border-top:1px solid #fff5;font-weight:700}
        .nkPanel .profileNote{display:block;margin-top:24px;color:#66533d;font-style:italic}
        .nkFooter{position:relative;margin-top:22px;color:#56381d;text-transform:uppercase;letter-spacing:.18em}
        .nkFooter .nkDivider{display:block;font-size:2rem;line-height:1;color:#9d6b1d}.nkFooter strong{display:block;margin-top:4px;font-size:clamp(.72rem,1.25vw,.95rem);font-weight:500}.nkFooter small{display:block;margin-top:10px;letter-spacing:.08em;text-transform:none;color:#6f583d}
        @media(max-width:900px){.nkLeftFigure{width:190px;left:-36px;opacity:.4}.nkRightFort{width:260px;right:-70px;opacity:.4}.nkManuscript{opacity:.2}.nkMain{padding-bottom:150px}.nkLevelGrid{gap:12px}.nkLevelOption{min-height:175px;padding:18px 12px}}
        @media(max-width:680px){.nkMain{padding:18px 12px 135px}.nkMain:after{inset:5px}.nkHero{padding-top:20px}.nkHero .royalMark{width:82px;height:66px}.nkHero h1{font-size:clamp(2.8rem,14vw,4.6rem)}.nkHero .kicker{font-size:.66rem;letter-spacing:.22em}.nkLevelGrid{grid-template-columns:1fr}.nkLevelOption{min-height:128px}.nkPanel{padding:22px 16px}.nkLeftFigure{width:145px;top:38px;left:-54px}.nkRightFort{width:190px;top:105px;right:-74px}.nkNile{height:125px}.nkManuscript{display:none}.nkFooter strong{font-size:.68rem;line-height:1.5}}
      `}</style>
    </main>
  );
}
