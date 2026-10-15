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

import { nameOf, rank, throwBones, WEIGHTS } from "../src/games/astragaloi";
import { resolve } from "../src/games/kottabos";

describe("astragaloi", () => {
  it("ranks Venus above everything and the Dog below everything", () => {
    expect(nameOf([1, 3, 4, 6])).toBe("Venus");
    expect(rank([6, 4, 3, 1])).toBeGreaterThan(rank([6, 6, 6, 6]));
    expect(rank([6, 6, 6, 6])).toBeGreaterThan(rank([6, 6, 6, 4]));
    expect(rank([1, 1, 1, 1])).toBeLessThan(rank([1, 1, 1, 3]));
  });

  it("throws the broad sides most often", () => {
    const rand = seeded(5);
    const counts: Record<number, number> = { 1: 0, 3: 0, 4: 0, 6: 0 };
    for (let i = 0; i < 20000; i++) for (const b of throwBones(rand)) counts[b]++;
    const total = 80000;
    expect(Math.abs(counts[3] / total - WEIGHTS[1])).toBeLessThan(0.02);
    expect(Math.abs(counts[1] / total - WEIGHTS[0])).toBeLessThan(0.02);
  });
});

describe("kottabos", () => {
  it("has a reachable hit window", () => {
    let hits = 0;
    for (let p = 0; p <= 1; p += 0.01) for (let a = 0; a <= 1; a += 0.01) if (resolve({ power: p, angle: a }).hit) hits++;
    expect(hits).toBeGreaterThan(40);
    expect(hits).toBeLessThan(2500); // hard, not trivial
  });
});
