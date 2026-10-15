import { describe, expect, it } from "vitest";
import { alive, botPick, clash, elo, fighter, multiplier, outcome } from "../src/games/arena";
import { seeded } from "../src/games/rng";

describe("arena", () => {
  it("follows the cycle", () => {
    expect(multiplier("water", "fire")).toBeGreaterThan(1);
    expect(multiplier("fire", "water")).toBeLessThan(1);
    expect(multiplier("grass", "grass")).toBe(1);
    expect(multiplier("aether", "fire")).toBeGreaterThan(1);
  });

  it("always ends", () => {
    const rand = seeded(11);
    for (let g = 0; g < 200; g++) {
      const you = ["nerilla", "emberkid", "sproutling"].map(fighter);
      const them = ["okeanyx", "ashmane", "thallo"].map(fighter);
      let turns = 0;
      while (!outcome(you, them) && turns++ < 100) {
        const yi = alive(you)[Math.floor(rand() * alive(you).length)];
        clash(you, them, yi, botPick(them, you, rand), rand);
      }
      expect(outcome(you, them)).not.toBeNull();
    }
  });

  it("moves ratings symmetrically", () => {
    expect(elo(1000, 1000, 1)).toBe(1016);
    expect(elo(1000, 1000, 0)).toBe(984);
  });
});
