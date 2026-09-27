"use client";

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";

export type InspectionCard = {
  id: string;
  name?: string;
  image?: string;
  strength?: number;
  zeal?: number;
  wealth?: number;
};

export function CardInspection({ cards, onClose }: { cards: InspectionCard[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <dialog ref={dialog} className="cardInspection" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <section className="inspectionPanel">
        <header><div><h2 id={titleId}>{cards.length === 1 ? cards[0].name : "Revealed stack"}</h2>
          <p>Click outside the cards or press Escape to close.</p></div>
          <button type="button" autoFocus aria-label="Close enlarged cards" onClick={onClose}>×</button>
        </header>
        <div className="inspectionCards">
          {cards.map((card) => <article className="inspectionCard" key={card.id}>
            {card.image && <img src={card.image} alt={card.name ?? "Revealed card"} />}
            <h3>{card.name}</h3>
            <dl>{(["strength", "zeal", "wealth"] as const).map((stat) =>
              <div key={stat}><dt>{stat}</dt><dd>{card[stat] ?? "—"}</dd></div>)}</dl>
          </article>)}
        </div>
      </section>
    </dialog>, document.body);
}

// Selection keeps its existing handler. Only otherwise inactive, revealed cards inspect.
export default function InspectionButton({ cards, disabled, onClick, className = "", children, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { cards: InspectionCard[] }) {
  const [open, setOpen] = useState(false);
  const selecting = !disabled && Boolean(onClick);
  const inspectable = !selecting && cards.length > 0;
  return <>
    <button {...props} type="button" disabled={!selecting && !inspectable}
      className={className + (inspectable ? " inspectableCard" : selecting ? " selectionCard" : "")}
      aria-label={inspectable ? (cards.length === 1 ? "Enlarge " + cards[0].name : "Enlarge revealed stack") : props["aria-label"]}
      aria-haspopup={inspectable ? "dialog" : undefined}
      onClick={(event) => { if (selecting) onClick?.(event); else if (inspectable) { event.stopPropagation(); setOpen(true); } }}>
      {children}
    </button>
    {open && <CardInspection cards={cards} onClose={() => setOpen(false)} />}
  </>;
}
