/** Context inside the current action panel; never a separate fixed-position panel. */
export default function SecondStrikeNotice({ accepted }: { accepted?: boolean }) {
  if (!accepted) return null;
  return <p className="secondStrikeWarning"><strong>Second strike against the exposed heir. Losing eliminates the challenger’s entire side.</strong></p>;
}
