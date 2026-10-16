import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SecondStrikeNotice from "./SecondStrikeNotice";

it("adds the second-strike warning within the action panel without another panel or button",()=>{
 const html=renderToStaticMarkup(createElement("section",{className:"chooser npcChoicePanel"},
  createElement(SecondStrikeNotice,{accepted:true}),
  createElement("h2",null,"Nubian Christians attack Ethiopian Christians."),
  createElement("button",null,"What Happens Next?")));
 expect(html.match(/<section/g)).toHaveLength(1);
 expect(html.match(/<button/g)).toHaveLength(1);
 expect(html).toContain("Losing eliminates the challenger");
 expect(html).toContain("Nubian Christians attack Ethiopian Christians.");
});
it("does not show a second-strike warning for an ordinary attack",()=>{
 expect(renderToStaticMarkup(createElement(SecondStrikeNotice,{}))).toBe("");
});
