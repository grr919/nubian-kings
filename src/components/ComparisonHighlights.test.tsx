import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComparisonHighlights, ComparisonStatCard, ComparisonScoreDetail } from "./ComparisonHighlights";

const card = { id: "ore", name: "Ore Deposit", factionId: "egyptian-christians", strength: 1, zeal: 0, wealth: 5 };
describe("comparison explanations", () => {
  it.each([1, 6])("shows the actual d6 roll %s and the final score", die => {
    const html = renderToStaticMarkup(<ComparisonScoreDetail cards={[card]} stat="wealth" score={{ base: 5, die, total: 5 + die }} />);
    expect(html).toContain("Nile Flood d6");
    expect(html).toContain(`<b>${die}</b>`);
    expect(html).toContain(`Base score 5 plus Nile Flood roll ${die} equals total ${5 + die}.`);
  });
  it("keeps ordinary comparisons quiet when Floods are off", () => {
    expect(renderToStaticMarkup(<ComparisonScoreDetail cards={[card]} stat="wealth" score={{ base: 5, die: 0, total: 5 }} />)).toBe("");
  });
  it("shows one roll for an entire formation, including its effective base", () => {
    const html = renderToStaticMarkup(<ComparisonScoreDetail cards={[card, { ...card, id: "second" }]} stat="wealth" score={{ base: 13, die: 4, total: 17 }} />);
    expect(html.match(/Nile Flood d6/g)).toHaveLength(1);
    expect(html).toContain("Base score 13 plus Nile Flood roll 4 equals total 17.");
  });
  it("keeps cancellation explicit even when a Flood roll already happened", () => {
    const html = renderToStaticMarkup(<ComparisonScoreDetail cards={[card]} stat="wealth" score={{ base: 5, die: 4, total: 9 }} cancelled guarantees={["a"]} />);
    expect(html).toContain("Nile Flood d6");
    expect(html).toContain("scores do not decide");
    expect(html).not.toContain("Wins by");
  });

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
