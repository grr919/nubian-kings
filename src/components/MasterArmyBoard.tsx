"use client";

import { useRef, useState, type ReactNode } from "react";
import { isLegalInitialPile, type MasterCard, type MasterPile } from "../game/master";

type Props = {
  cards: MasterCard[];
  piles: MasterPile[];
  busy?: boolean;
  renderCard: (card: MasterCard) => ReactNode;
  onMove: (cardId: string, targetId?: string) => void;
};

// Array order is bottom to top. Move the selected card and all cards above it.
function movingCards(piles: MasterPile[], card: MasterCard) {
 const source=piles.find(p=>p.cards.some(c=>c.id===card.id));
 return source ? source.cards.slice(source.cards.findIndex(c=>c.id===card.id)) : [card];
}
function combineCards(bottom: MasterCard[], top: MasterCard[]) {
 const cards=[...bottom,...top];
 return [...cards.filter(c=>c.type==="place"),...cards.filter(c=>c.type!=="place")];
}
export function canMoveArmyCard(cards: MasterCard[], piles: MasterPile[], card: MasterCard, targetId?: string) {
 const source=piles.find(p=>p.cards.some(c=>c.id===card.id));
 if ((source&&source.id===targetId)||card.id===targetId) return false;
 const moving=movingCards(piles,card), ids=new Set(moving.map(c=>c.id));
 const remainder=source?.cards.filter(c=>!ids.has(c.id))??[];
 if(remainder.length&&!isLegalInitialPile(remainder))return false;
 if(!targetId)return isLegalInitialPile(moving);
 const target=piles.find(p=>p.id===targetId);
 if(target)return isLegalInitialPile(combineCards(target.cards,moving));
 const other=cards.find(c=>c.id===targetId);
 if(!other||ids.has(targetId)||piles.some(p=>p.cards.some(c=>c.id===targetId)))return false;
 return isLegalInitialPile(combineCards([other],moving));
}
export function moveArmyCard(cards: MasterCard[], piles: MasterPile[], card: MasterCard, targetId?: string): MasterPile[] | undefined {
 if(!canMoveArmyCard(cards,piles,card,targetId))return;
 const moving=movingCards(piles,card),ids=new Set(moving.map(c=>c.id));
 const next=piles.map(p=>({...p,cards:p.cards.filter(c=>!ids.has(c.id))})).filter(p=>p.cards.length);
 const target=next.find(p=>p.id===targetId);
 if(target)target.cards=combineCards(target.cards,moving);
 else {const other=cards.find(c=>c.id===targetId);next.push({id:`pile-${Date.now()}-${card.id}`,cards:other?combineCards([other],moving):moving});}
 return next;
}

export default function MasterArmyBoard({ cards, piles, busy = false, renderCard, onMove }: Props) {
  const [selected, setSelected] = useState<string>();
  const [dragging, setDragging] = useState<string>();
  const touchStart = useRef<{ x: number; y: number; id: string } | null>(null);
  const ignoreClick = useRef(false);
  const assigned = new Set(piles.flatMap((pile) => pile.cards.map((card) => card.id)));
  const loose = cards.filter((card) => !assigned.has(card.id));
  const chosen = cards.find((card) => card.id === (dragging ?? selected));

  function place(id: string, target?: string) {
    const card = cards.find((item) => item.id === id);
    if (busy || !card || !canMoveArmyCard(cards, piles, card, target)) return;
    onMove(id, target);
    setSelected(undefined);
    setDragging(undefined);
  }

  function cardButton(card: MasterCard) {
    return <button key={card.id} type="button" className={`armyBoardCard ${selected === card.id ? "selectedSetupCard" : ""}`} draggable={!busy}
      aria-label={`Select ${card.name} (${card.type === "leader" ? "person" : card.type})`} aria-pressed={selected === card.id}
      onClick={(event) => { event.stopPropagation(); if (ignoreClick.current) { ignoreClick.current = false; return; } if (busy) return; if (selected && selected !== card.id) { const pile = piles.find((item) => item.cards.some((member) => member.id === card.id)); place(selected, pile?.id ?? card.id); } else setSelected((old) => old === card.id ? undefined : card.id); }}
      onDragStart={(event) => { event.dataTransfer.setData("text/plain", card.id); event.dataTransfer.effectAllowed = "move"; setDragging(card.id); }}
      onDragEnd={() => setDragging(undefined)}
      onPointerDown={(event) => { if (event.pointerType === "touch") { touchStart.current = { id: card.id, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); } }}
      onPointerCancel={() => { touchStart.current = null; }}
      onPointerUp={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (event.pointerType !== "touch" || start?.id !== card.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 12) return;
        ignoreClick.current = true;
        window.setTimeout(() => { ignoreClick.current = false; }, 400);
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-army-target]");
        if (target) place(card.id, target.dataset.armyTarget || undefined);
      }}>{renderCard(card)}</button>;
  }

  function destination(target?: string) {
    return {
      onDragOver: (event: React.DragEvent) => { event.preventDefault(); },
      onDrop: (event: React.DragEvent) => { event.preventDefault(); place(event.dataTransfer.getData("text/plain"), target); },
      onClick: () => { if (selected) place(selected, target); },
    };
  }

  return <section className="armyBoard" aria-label="Arrange your army">
    <div className="armyBoardHeading"><h2>Your cards · {piles.length + loose.filter(card => card.type !== "thing").length} units</h2><p>People and Places may stand alone. Two or more People may share a pile only in a Place. Objects must be given to a Person. From bottom to top: Place, Person, then People or objects. Drag a card to move it and every card above it together.</p></div>
    <div className="armyBoardGrid">
      {piles.map((pile, index) => <div key={pile.id} className={`armyBoardSlot ${chosen && canMoveArmyCard(cards, piles, chosen, pile.id) ? "armyBoardAccepts" : ""}`} data-army-target={pile.id} {...destination(pile.id)}>
        <strong>{pile.cards.length} card{pile.cards.length === 1 ? "" : "s"}</strong><div className="armyBoardStack">{pile.cards.map(cardButton)}</div>
        <small>{pile.cards.map((card) => card.type === "leader" ? "person" : card.type).join(" · ")}</small>
      </div>)}
      {loose.map((card) => <div key={card.id} className={`armyBoardSlot armyBoardLoose ${chosen && canMoveArmyCard(cards, piles, chosen, card.id) ? "armyBoardAccepts" : ""}`} data-army-target={card.id} {...destination(card.id)}><span className="armyBoardLooseLabel">{card.type === "thing" ? "Needs a Person" : "Stands alone"}</span>{cardButton(card)}</div>)}
      <div className={`armyBoardSlot armyBoardEmpty ${chosen && canMoveArmyCard(cards, piles, chosen) ? "armyBoardAccepts" : ""}`} data-army-target="" {...destination()}><span>+ Stand alone</span></div>
    </div>
    <p className="armyBoardCount" aria-live="polite">{loose.filter(card => card.type === "thing").length} objects still need a Person</p>
  </section>;
}
