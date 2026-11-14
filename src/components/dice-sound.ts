import { useEffect, useRef } from "react";

export function playDiceSound() {
  void new Audio("/2d6.mp3").play().catch(() => {});
}

export function useRoomDiceSound(code: string | undefined, roll: string | undefined) {
  const previous = useRef<{ code: string | undefined; roll: string | undefined } | null>(null);
  useEffect(() => {
    const last = previous.current;
    previous.current = { code, roll };
    if (code && roll && last?.code === code && last.roll !== roll) playDiceSound();
  }, [code, roll]);
}
