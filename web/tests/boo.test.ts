import { describe, expect, it } from "vitest";
import { resolve, splitByWeight, type Stake } from "../src/games/boo/round";

const stake = (player: string, colour: Stake["colour"], amount: number, at = 0): Stake => ({ player, colour, amount, at });

describe("blue or orange", () => {
  it("pays the smallest pool and the winner of the fight", () => {
    const r = resolve([stake("a", "blue", 5000), stake("b", "orange", 3000), stake("c", "green", 1000)], 1);
    expect(r.ranked).toEqual(["blue", "orange", "green"]);
    expect(r.underdog).toBe("green");
    expect(r.fight).toEqual({ winner: "blue", loser: "orange" }); // blue puts out orange
    expect(r.payouts).toEqual({ c: 4500, a: 4500 });
  });

  it("keeps the rake for the module owner", () => {
    const r = resolve([stake("a", "blue", 5000), stake("b", "orange", 3000), stake("c", "green", 2000)], 0.9);
    const paid = Object.values(r.payouts).reduce((s, x) => s + x, 0);
    expect(r.pot).toBe(9000);
    expect(paid).toBe(9000);
  });

  it("lets two backed colours fight for everything", () => {
    const r = resolve([stake("a", "green", 1000), stake("b", "blue", 4000)], 1);
    expect(r.fight?.winner).toBe("green"); // green drinks blue
    expect(r.payouts).toEqual({ a: 5000 });
  });

  it("refunds a one-colour round", () => {
    const r = resolve([stake("a", "blue", 1000), stake("b", "blue", 2000)], 0.9);
    expect(r.void).toBe(true);
    expect(r.payouts).toEqual({ a: 1000, b: 2000 });
  });

  it("breaks pool ties by who committed first", () => {
    const r = resolve([stake("a", "blue", 1000, 5), stake("b", "orange", 1000, 1), stake("c", "green", 3000, 9)], 1);
    expect(r.ranked).toEqual(["green", "orange", "blue"]);
    expect(r.underdog).toBe("blue");
  });

  it("makes splitting a stake across alts strictly worse", () => {
    const honest = resolve([stake("me", "green", 4000), stake("x", "green", 4000), stake("y", "blue", 9000), stake("z", "orange", 9500)], 1);
    const split = resolve(
      [stake("alt1", "green", 1000), stake("alt2", "green", 1000), stake("alt3", "green", 1000), stake("alt4", "green", 1000), stake("x", "green", 4000), stake("y", "blue", 9000), stake("z", "orange", 9500)],
      1,
    );
    const altTotal = ["alt1", "alt2", "alt3", "alt4"].reduce((s, k) => s + (split.payouts[k] ?? 0), 0);
    expect(honest.underdog).toBe("green");
    expect(altTotal).toBeLessThan(honest.payouts.me);
  });

  it("splits integers without losing any", () => {
    const out = splitByWeight(1000, { a: 1, b: 1, c: 1 });
    expect(out.a + out.b + out.c).toBe(1000);
  });
});
