import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SecondStrikePrompt from "./SecondStrikePrompt";

const props = { isYou: true, playerName: "You", targetName: "Opponent", victoryMode: "standard" as const, onContinue() {}, onDecide() {} };
describe("second-strike explanation controls", () => {
  it.each([true, false])("pauses before a choice whether isYou is %s", isYou => {
    const html = renderToStaticMarkup(createElement(SecondStrikePrompt, { ...props, isYou }));
    expect(html).toContain("What Happens Next?");
    expect(html).not.toContain("Yes — risk a second strike");
    expect(html).toContain("entire side");
  });
  it("shows the human decision only after the explanation is acknowledged", () => {
    const html=renderToStaticMarkup(createElement(SecondStrikePrompt,{...props,explanationReady:true}));
    expect(html).toContain("Yes — risk a second strike");expect(html).not.toContain("What Happens Next?");
  });
  it("keeps the explanation visible while waiting for other humans",()=>{
    const html=renderToStaticMarkup(createElement(SecondStrikePrompt,{...props,acknowledged:true}));
    expect(html).toContain("disabled");expect(html).toContain("Waiting for the other players to read the explanation");
    expect(html).not.toContain("Yes — risk a second strike");
  });
});
