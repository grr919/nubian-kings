import { afterEach, describe, expect, it, vi } from "vitest";
import { controllerHash } from "./room-controller-server";
import { controllerHeaders, roomControlToken, takeoverHeaders } from "./room-controller-browser";

describe("room controller tokens", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates one unpredictable token per room in session storage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); }
    });
    const first = roomControlToken("ABC234");
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(roomControlToken("ABC234")).toBe(first);
    expect(roomControlToken("DEF567")).not.toBe(first);
    expect(controllerHeaders("/api/multiplayer/rooms/ABC234")["X-NK-Controller"]).toBe(first);
    expect(controllerHeaders("/api/multiplayer/amateur/ABC234")["X-NK-Controller"]).toBe(first);
    expect(controllerHeaders("/api/multiplayer/master/ABC234")["X-NK-Controller"]).toBe(first);
    expect(takeoverHeaders("ABC234")["X-NK-Controller"]).toBe(first);
    expect(controllerHeaders("/api/multiplayer/rooms/join")).toEqual({});
  });

  it("accepts only properly formatted room codes and tokens", () => {
    expect(() => roomControlToken("../secret")).toThrow();
    const req = new Request("https://example.org", { headers: { "X-NK-Controller": "1".repeat(64) } });
    expect(controllerHash(req)).toMatch(/^[a-f0-9]{64}$/);
    expect(controllerHash(new Request("https://example.org", { headers: { "X-NK-Controller": "invalid" } }))).toBeUndefined();
  });
});
