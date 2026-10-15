import { describe, expect, it } from "vitest";
import { MAX_RUNWAY_MONTHS, couponsPaid, issuing, monthlyCost, nextCoupon, room, runway, windDown, type Cost } from "../src/economy/bonds";

const COSTS: Cost[] = [
  { id: "a", item: "Hosting", note: "", perMonth: 14 },
  { id: "b", item: "Compute", note: "", perMonth: 6.5 },
];
const YEAR = 365.2425 * 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

describe("server bonds", () => {
  it("shows runway in whole months", () => {
    expect(monthlyCost(COSTS)).toBe(20.5);
    expect(runway(205, COSTS)).toBe(10);
    expect(runway(204, COSTS)).toBe(9);
    expect(runway(100, [])).toBe(Infinity);
  });

  it("pauses new bonds past two years of runway", () => {
    expect(issuing(20.5 * (MAX_RUNWAY_MONTHS - 1), COSTS)).toBe(true);
    expect(issuing(20.5 * MAX_RUNWAY_MONTHS, COSTS)).toBe(false);
    expect(room(400, COSTS)).toBe(92);
    expect(room(5000, COSTS)).toBe(0);
  });

  it("pays one coupon a year, up to the term; perpetual bonds never end", () => {
    expect(couponsPaid(T0, 3, T0 + 0.5 * YEAR)).toBe(0);
    expect(couponsPaid(T0, 3, T0 + YEAR)).toBe(1);
    expect(couponsPaid(T0, 3, T0 + 7 * YEAR)).toBe(3);
    expect(couponsPaid(T0, null, T0 + 40 * YEAR)).toBe(40);
    expect(nextCoupon(T0, 3, T0 + 1.5 * YEAR)).toBeCloseTo(T0 + 2 * YEAR, -3);
    expect(nextCoupon(T0, 3, T0 + 3.2 * YEAR)).toBeNull();
    expect(nextCoupon(T0, null, T0 + 99.5 * YEAR)).toBeCloseTo(T0 + 100 * YEAR, -3);
  });

  it("returns what's left pro rata if the server closes", () => {
    expect(windDown(300, [{ name: "a", amount: 50 }, { name: "b", amount: 25 }, { name: "a", amount: 25 }])).toEqual({ a: 225, b: 75 });
    expect(windDown(0, [{ name: "a", amount: 10 }])).toEqual({});
  });
});
