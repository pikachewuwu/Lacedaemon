import { describe, expect, it } from "vitest";
import { MonopolyGame, botStep } from "../src/games/monopoly/game";
import { BOARD, groupSquares } from "../src/games/monopoly/board";
import { seeded } from "../src/games/rng";

const bots = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i}`, name: `bot${i}`, human: false }));

describe("monopoly", () => {
  it("has a 40-square board with 28 deeds", () => {
    expect(BOARD).toHaveLength(40);
    const g = new MonopolyGame(bots(2), { maxRounds: 10, startingCash: 1500, rand: seeded(1) });
    expect(Object.keys(g.deeds)).toHaveLength(28);
  });

  it("doubles base rent on a full colour set", () => {
    const g = new MonopolyGame(bots(2), { maxRounds: 10, startingCash: 1500, rand: seeded(1) });
    const [a, b] = groupSquares("brown");
    g.deeds[a].owner = 0;
    expect(g.rentFor(a, 7)).toBe(2);
    g.deeds[b].owner = 0;
    expect(g.rentFor(a, 7)).toBe(4);
    expect(g.canBuild(0, a)).toBe(true);
    g.build(0, a);
    expect(g.canBuild(0, a)).toBe(false); // even building
    expect(g.rentFor(a, 7)).toBe(10);
  });

  it("plays complete bot games without negative cash", { timeout: 60000 }, () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = new MonopolyGame(bots(4), { maxRounds: 60, startingCash: 1500, rand: seeded(seed) });
      let steps = 0;
      while (g.phase !== "over" && steps++ < 20000) {
        botStep(g);
        for (const p of g.players) expect(p.cash).toBeGreaterThanOrEqual(0);
        for (const deed of Object.values(g.deeds)) {
          expect(deed.houses).toBeLessThanOrEqual(5);
          if (deed.owner !== null) expect(g.players[deed.owner].bankrupt).toBe(false);
        }
      }
      expect(g.phase).toBe("over");
      expect(g.standings()).toHaveLength(4);
    }
  });
});
