import { describe, expect, it } from "vitest";
import { agentPass, bookOf, parseWords, type Agent, type Book } from "../src/economy/trade";

const agent = (rules: Agent["rules"], budget = 100000): Agent => ({
  id: "a", name: "test", rules, budget, spentToday: 0, day: "d", active: true, source: "rules", log: [],
});

const book: Book = {
  id: "item:diamond",
  asks: [{ price: 420, qty: 3, who: "x" }, { price: 460, qty: 5, who: "y" }],
  bids: [{ price: 410, qty: 2, who: "z" }, { price: 380, qty: 9, who: "w" }],
  last: 430, change: 0, volume: 0,
};

describe("plain-words agents", () => {
  it("understands buy, sell and budget", () => {
    const p = parseWords("buy diamonds under 450, sell netherite above 9,000 and spend at most 30000 a day");
    expect(p.rules).toEqual([
      { side: "buy", instrument: "item:diamond", limit: 450, maxPerDay: 5 },
      { side: "sell", instrument: "item:netherite", limit: 9000, maxPerDay: 5 },
    ]);
    expect(p.budget).toBe(30000);
    expect(p.unknown).toEqual([]);
  });

  it("reads quantities and spirit names, and reports what it didn't understand", () => {
    const p = parseWords("buy up to 2 okeanyx below 7000; make me rich");
    expect(p.rules[0]).toEqual({ side: "buy", instrument: "spirit:okeanyx", limit: 7000, maxPerDay: 2 });
    expect(p.unknown).toEqual(["make me rich"]);
  });
});

describe("agent execution", () => {
  it("buys only at or under the limit, within caps and budget", () => {
    const fills = agentPass(agent([{ side: "buy", instrument: "item:diamond", limit: 450, maxPerDay: 10 }]), { "item:diamond": book }, {}, {});
    expect(fills).toEqual([{ rule: expect.anything(), price: 420, qty: 3 }]);
    const capped = agentPass(agent([{ side: "buy", instrument: "item:diamond", limit: 500, maxPerDay: 10 }], 2000), { "item:diamond": book }, {}, {});
    expect(capped.reduce((s, f) => s + f.price * f.qty, 0)).toBeLessThanOrEqual(2000);
  });

  it("sells only what it holds, at or over the limit", () => {
    const fills = agentPass(agent([{ side: "sell", instrument: "item:diamond", limit: 400, maxPerDay: 10 }]), { "item:diamond": book }, { "item:diamond": 1 }, {});
    expect(fills).toEqual([{ rule: expect.anything(), price: 410, qty: 1 }]);
  });

  it("makes deterministic daily books with asks above bids", () => {
    const b = bookOf("item:netherite", "2026-10-15");
    expect(b).toEqual(bookOf("item:netherite", "2026-10-15"));
    expect(b.asks[0].price).toBeGreaterThan(b.bids[0].price);
  });
});
