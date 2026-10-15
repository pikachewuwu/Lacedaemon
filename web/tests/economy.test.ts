import { describe, expect, it } from "vitest";
import { MODULES, PROGRAMS, splitEntry, programBySlug } from "../src/economy/modules";
import { bound, fallbackWeights, MAX_SHARE } from "../src/economy/arbiter";
import { capYear, schedule, CAP } from "../src/economy/emission";
import { openPack, rollDrop, SPIRITS, byId } from "../src/games/spirits/catalog";
import { seeded } from "../src/games/rng";

describe("entries", () => {
  it("routes every dragon and buys DAEMON from the owner", () => {
    for (const m of PROGRAMS) {
      const s = splitEntry(m, 10000);
      expect(s.pot + s.sunday + s.owner).toBe(10000);
    }
    for (const m of MODULES) expect(Math.abs(splitEntry(m, 10000).daemon - 10000 / m.price)).toBeLessThan(0.01);
  });

  it("keeps house games free of DAEMON", () => {
    const s = splitEntry(programBySlug("monopoly"), 10000);
    expect(s).toEqual({ daemon: 0, pot: 10000, sunday: 0, owner: 0 });
  });
});

describe("arbiter fallback", () => {
  it("produces bounded weights that sum to one", () => {
    const rows = fallbackWeights(MODULES, 7200);
    const sum = rows.reduce((s, r) => s + r.weight, 0);
    expect(sum).toBeCloseTo(1, 9);
    for (const r of rows) expect(r.weight).toBeLessThanOrEqual(MAX_SHARE + 1e-9);
  });

  it("caps a dominant module at half", () => {
    const w = bound([10, 1, 1]);
    expect(w[0]).toBeCloseTo(0.5, 9);
    expect(w[1] + w[2]).toBeCloseTo(0.5, 9);
  });
});

describe("emission", () => {
  it("never exceeds the cap and reaches it in year 16", () => {
    const s = schedule();
    expect(s[s.length - 1].total).toBe(CAP);
    expect(capYear()).toBe(16);
  });
});

describe("spirits", () => {
  it("has 24 spirits with unique ids", () => {
    expect(new Set(SPIRITS.map((s) => s.id)).size).toBe(24);
  });

  it("opens five cards with the rare slot last", () => {
    const rand = seeded(3);
    for (let i = 0; i < 200; i++) {
      const pack = openPack(rand);
      expect(pack).toHaveLength(5);
      expect(["rare", "mythic", "exalted"]).toContain(byId(pack[4].spirit).rarity);
    }
  });

  it("drops a spirit of the requested element", () => {
    const rand = seeded(9);
    for (let i = 0; i < 200; i++) {
      const d = rollDrop(rand, "test", "fire", 1);
      expect(d && byId(d.spirit).element).toBe("fire");
    }
  });
});

import { crashPoint, EDGE, altitudeAt, secondsTo } from "../src/games/icarus";

describe("icarus", () => {
  it("returns about 97% over many flights for any fixed target", () => {
    const rand = seeded(42);
    const points = Array.from({ length: 200000 }, () => crashPoint(rand));
    for (const target of [1.5, 2, 5]) {
      const ret = points.reduce((s, c) => s + (c >= target ? target : 0), 0) / points.length;
      expect(Math.abs(ret - (1 - EDGE))).toBeLessThan(0.03);
    }
    expect(points.reduce((a, b) => Math.min(a, b), Infinity)).toBe(1);
  });

  it("inverts time and altitude", () => {
    expect(altitudeAt(secondsTo(4.2))).toBeCloseTo(4.2, 9);
  });
});
