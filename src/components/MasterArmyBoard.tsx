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

export function canMoveArmyCard(cards: MasterCard[], piles: MasterPile[], card: MasterCard, targetId?: string) {
  const source = piles.find((pile) => pile.cards.some((item) => item.id === card.id));
  if ((source && source.id === targetId) || card.id === targetId) return false;
  const remainder = source?.cards.filter((item) => item.id !== card.id) ?? [];
  if (remainder.length && !isLegalInitialPile(remainder)) return false;
  if (!targetId) return isLegalInitialPile([card]);
  const targetPile = piles.find((pile) => pile.id === targetId);
  if (targetPile) return isLegalInitialPile([...targetPile.cards, card].sort((a, b) => rank(a) - rank(b)));
  const targetCard = cards.find((item) => item.id === targetId);
  if (!targetCard || piles.some((pile) => pile.cards.some((item) => item.id === targetId))) return false;
  return isLegalInitialPile([card, targetCard].sort((a, b) => rank(a) - rank(b)));
}

export function moveArmyCard(cards: MasterCard[], piles: MasterPile[], card: MasterCard, targetId?: string): MasterPile[] | undefined {
  if (!canMoveArmyCard(cards, piles, card, targetId)) return;
  const next = piles.map((pile) => ({ ...pile, cards: pile.cards.filter((item) => item.id !== card.id) })).filter((pile) => pile.cards.length);
  const target = next.find((pile) => pile.id === targetId);
  if (target) {
    target.cards = [...target.cards, card].sort((a, b) => rank(a) - rank(b));
  } else {
    const targetCard = cards.find((item) => item.id === targetId);
    next.push({ id: `pile-${Date.now()}-${card.id}`, cards: targetCard ? [targetCard, card].sort((a, b) => rank(a) - rank(b)) : [card] });
  }
  return next;
}

function rank(card: MasterCard) { return card.type === "place" ? 0 : card.type === "thing" ? 2 : 1; }

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
    <div className="armyBoardHeading"><h2>Your cards · {piles.length} piles</h2><p>Drag one card onto another to make a pile. Select two cards to do the same by tapping. You can also move cards onto a pile or into an empty slot.</p></div>
    <div className="armyBoardGrid">
      {piles.map((pile, index) => <div key={pile.id} className={`armyBoardSlot ${chosen && canMoveArmyCard(cards, piles, chosen, pile.id) ? "armyBoardAccepts" : ""}`} data-army-target={pile.id} {...destination(pile.id)}>
        <strong>Pile {index + 1}</strong><div className="armyBoardStack">{pile.cards.map(cardButton)}</div>
        <small>{pile.cards.map((card) => card.type === "leader" ? "person" : card.type).join(" · ")}</small>
      </div>)}
      {loose.map((card) => <div key={card.id} className={`armyBoardSlot armyBoardLoose ${chosen && canMoveArmyCard(cards, piles, chosen, card.id) ? "armyBoardAccepts" : ""}`} data-army-target={card.id} {...destination(card.id)}><span className="armyBoardLooseLabel">Unassigned</span>{cardButton(card)}</div>)}
      <div className={`armyBoardSlot armyBoardEmpty ${chosen && canMoveArmyCard(cards, piles, chosen) ? "armyBoardAccepts" : ""}`} data-army-target="" {...destination()}><span>+ New pile</span></div>
    </div>
    <p className="armyBoardCount" aria-live="polite">{loose.length} card{loose.length === 1 ? "" : "s"} left to assign</p>
  </section>;
}
