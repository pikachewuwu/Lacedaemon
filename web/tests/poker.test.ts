import { describe, expect, it } from "vitest";
import { parseCard } from "../src/games/poker/cards";
import { evaluate, fastScore } from "../src/games/poker/evaluate";
import { buildPots, PokerTable } from "../src/games/poker/table";
import { decide, STYLES } from "../src/games/poker/bots";
import { seeded } from "../src/games/rng";

const hand = (s: string) => s.split(" ").map(parseCard);

describe("evaluate", () => {
  it("ranks categories in order", () => {
    const ladder = [
      "2c 7d 9h Js Kd",
      "2c 2d 9h Js Kd",
      "2c 2d 9h 9s Kd",
      "2c 2d 2h 9s Kd",
      "5c 6d 7h 8s 9d",
      "2h 7h 9h Jh Kh",
      "2c 2d 2h 9s 9d",
      "2c 2d 2h 2s 9d",
      "5h 6h 7h 8h 9h",
    ].map((h) => evaluate(hand(h)).score);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i]).toBeGreaterThan(ladder[i - 1]);
  });

  it("knows the wheel is the lowest straight", () => {
    const wheel = evaluate(hand("Ac 2d 3h 4s 5d"));
    const six = evaluate(hand("2c 3d 4h 5s 6d"));
    expect(wheel.name).toBe("Straight, Five high");
    expect(six.score).toBeGreaterThan(wheel.score);
  });

  it("picks the best five of seven", () => {
    const v = evaluate(hand("Ah Kh 2c 7h Qh 9s Jh"));
    expect(v.name).toBe("Flush, Ace high");
    expect(evaluate(hand("Ts Js Qs Ks As 2c 2d")).name).toBe("Royal flush");
  });

  it("uses kickers", () => {
    expect(evaluate(hand("Ac Ad Kh 7s 2d")).score).toBeGreaterThan(evaluate(hand("Ac Ad Qh 7s 2d")).score);
    expect(evaluate(hand("Kc Kd 7h 7s Ad")).score).toBeGreaterThan(evaluate(hand("Kc Kd 7h 7s Qd")).score);
  });
});

describe("fastScore", () => {
  it("matches the exhaustive evaluator on random seven-card hands", () => {
    const rand = seeded(7);
    for (let n = 0; n < 4000; n++) {
      const deck = Array.from({ length: 52 }, (_, i) => i);
      for (let i = 0; i < 7; i++) {
        const j = i + Math.floor(rand() * (52 - i));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const seven = deck.slice(0, 7);
      expect(fastScore(seven)).toBe(evaluate(seven).score);
    }
  });
});

describe("side pots", () => {
  it("splits an all-in into main and side pot", () => {
    const pots = buildPots([
      { committed: 100, folded: false, out: false },
      { committed: 500, folded: false, out: false },
      { committed: 500, folded: false, out: false },
      { committed: 50, folded: true, out: false },
    ]);
    expect(pots).toEqual([
      { amount: 350, eligible: [0, 1, 2] },
      { amount: 800, eligible: [1, 2] },
    ]);
  });

  it("returns an uncalled bet to its owner", () => {
    const pots = buildPots([
      { committed: 200, folded: false, out: false },
      { committed: 900, folded: false, out: false },
    ]);
    expect(pots[1]).toEqual({ amount: 700, eligible: [1] });
  });
});

describe("tournament", () => {
  it("conserves chips and always ends with one winner", { timeout: 60000 }, () => {
    for (let seed = 1; seed <= 12; seed++) {
      const rand = seeded(seed);
      const players = ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id, human: false }));
      const t = new PokerTable(players, { startingStack: 3000, handsPerLevel: 4, rand });
      const styles = Object.values(STYLES);
      let guard = 0;
      while (!t.gameOver && guard++ < 400) {
        t.startHand();
        let steps = 0;
        while (!t.handOver && steps++ < 200) t.act(decide(t, t.toAct, styles[t.toAct % styles.length], rand));
        expect(t.handOver).toBe(true);
        expect(t.seats.reduce((s, x) => s + x.stack, 0)).toBe(15000);
      }
      expect(t.gameOver).toBe(true);
      expect(t.standings()).toHaveLength(5);
    }
  });
});
