import { describe, expect, it } from "vitest";
import { FACE, allocate, coupon, coverage, schedule, sellBackValue, settle, totalReturn, type BondSeries } from "../src/economy/bonds";

const S: BondSeries = {
  id: "t", name: "Test", funds: "", term: 10, base: 0.01, perSeat: 0.001, seatsFrom: 6,
  size: 50, cap: 10, issueWeek: 4, sold: 0, status: "open",
};

describe("dragon bonds", () => {
  it("pays a base coupon plus a share of every seat beyond the threshold", () => {
    expect(coupon(S, 4)).toBe(100);
    expect(coupon(S, 6)).toBe(100);
    expect(coupon(S, 8)).toBe(120);
  });

  it("schedules one coupon per Sunday and the face at maturity", () => {
    const pay = schedule(S, () => 7);
    expect(pay).toHaveLength(10);
    expect(pay[0].week).toBe(5);
    expect(pay.at(-1)!.week).toBe(14);
    expect(pay.at(-1)!.face).toBe(true);
    expect(pay.reduce((s, p) => s + p.amount, 0)).toBe(10 * 110 + FACE);
    expect(totalReturn(S, 7)).toBeCloseTo(0.11, 9);
  });

  it("charges 5% to sell back at issue, shrinking to nothing at maturity", () => {
    expect(sellBackValue(S, 4)).toBe(9500);
    expect(sellBackValue(S, 9)).toBe(9750);
    expect(sellBackValue(S, 14)).toBe(FACE);
    expect(sellBackValue(S, 30)).toBe(FACE);
    expect(sellBackValue(S, 0)).toBe(9500);
  });

  it("fills small orders first and caps everyone", () => {
    const got = allocate(
      [{ name: "whale", qty: 40 }, { name: "a", qty: 2 }, { name: "b", qty: 5 }, { name: "c", qty: 1 }],
      12,
      10,
    );
    expect(got).toEqual({ c: 1, a: 2, b: 5, whale: 4 });
    expect(allocate([{ name: "x", qty: 50 }], 100, 10)).toEqual({ x: 10 });
  });

  it("never defaults: short coupons roll and are paid first", () => {
    const week1 = settle(500, 0, 800);
    expect(week1).toEqual({ paid: 500, rolled: 300, treasury: 0 });
    const week2 = settle(2000, week1.rolled, 800);
    expect(week2).toEqual({ paid: 1100, rolled: 0, treasury: 900 });
    expect(coverage(3000, 1000)).toBe(3);
    expect(coverage(3000, 0)).toBe(Infinity);
  });
});
