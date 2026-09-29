import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComparisonHighlights, ComparisonStatCard, ComparisonScoreDetail } from "./ComparisonHighlights";

const card = { id: "ore", name: "Ore Deposit", factionId: "egyptian-christians", strength: 1, zeal: 0, wealth: 5 };
describe("comparison explanations", () => {
  it.each(["strength", "zeal", "wealth"] as const)("highlights only the selected %s stat", stat => {
    const html = renderToStaticMarkup(<ComparisonHighlights><ComparisonStatCard card={card} stat={stat} result="Winner"><span>card art</span></ComparisonStatCard></ComparisonHighlights>);
    expect(html).toContain(`stat-${stat}`);
    expect(html).toContain(`${stat} ${card[stat]}. Wins.`);
    expect(html).not.toContain('class="statHighlightRing"');
    expect(html).not.toContain("Replay stat highlights");
  });
  it.each(["Tied", "Cancelled", "Defeated"] as const)("communicates %s without relying on color", result => {
    const html = renderToStaticMarkup(<ComparisonStatCard card={card} stat="wealth" result={result} pile><span>card</span></ComparisonStatCard>);
    expect(html).toContain(`formation ${result.toLowerCase()}`);
    expect(html).toContain("Contribution");
  });
  it("labels unavailable stats when artwork is missing", () => {
    const html = renderToStaticMarkup(<ComparisonStatCard card={{ name: "Unknown" }} stat="zeal" result="Cancelled"><span>fallback</span></ComparisonStatCard>);
    expect(html).not.toContain('class="statHighlightRing"');
    expect(html).toContain("unavailable");
  });
  it("explains a guaranteed winner with a lower numeric score", () => {
    const html = renderToStaticMarkup(<ComparisonScoreDetail cards={[card]} stat="wealth" score={{ base: 5, die: 0, total: 5 }} guarantees={["a"]} playerId="a" winnerId="a" />);
    expect(html).toContain("Wins by one-time guarantee.");
  });
  it("gives cancellation precedence over guarantees", () => {
    const html = renderToStaticMarkup(<ComparisonScoreDetail cards={[card]} stat="wealth" score={{ base: 5, die: 0, total: 5 }} cancelled guarantees={["a"]} playerId="a" winnerId="a" />);
    expect(html).toContain("scores do not decide");
    expect(html).not.toContain("Wins by");
  });
  it("explains when opposing guarantees cancel", () => {
    const html = renderToStaticMarkup(<ComparisonScoreDetail cards={[card]} stat="wealth" score={{ base: 5, die: 0, total: 5 }} guarantees={["a", "b"]} />);
    expect(html).toContain("Both guarantees cancel; scores decide.");
  });
  it("preserves the mercenary X instead of inventing a printed zeal number", () => {
    const mercenary = { ...card, mercenary: true, artFile: "192 6x Black.jpg", zeal: 0 };
    const html = renderToStaticMarkup(<ComparisonStatCard card={mercenary} stat="zeal" result="Cancelled"><span>art</span></ComparisonStatCard>);
    expect(html).toContain("zeal X");
    expect(html).toContain("Immune");
  });
  it("explains a nonnumeric effect result", () => {
    const html = renderToStaticMarkup(<ComparisonScoreDetail cards={[card]} stat="wealth" score={{ base: 5, die: 0, total: 5 }} effectDecided />);
    expect(html).toContain("A card effect decides this result.");
  });
});
