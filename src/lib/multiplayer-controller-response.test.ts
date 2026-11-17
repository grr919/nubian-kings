import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("multiplayer controller response contract", () => {
  for (const level of ["rooms", "amateur", "master"]) {
    it(`${level} returns control status after successful moves`, () => {
      const source = readFileSync(
        resolve(process.cwd(), "src/app/api/multiplayer", level, "[code]", "route.ts"),
        "utf8"
      );
      // A move must return the authoritative controller status as well as
      // updated game state. Without it, a valid controller sees a false
      // view-only banner immediately after every successful move.
      const ending = source.slice(source.lastIndexOf("const fresh=") >= 0
        ? source.lastIndexOf("const fresh=")
        : source.lastIndexOf("const refreshed="));
      expect(ending).toMatch(/control\s*:\s*\{\s*canControl\s*:\s*true\s*\}/);
    });
  }
});
