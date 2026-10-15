/**
 * Dragon bonds. The Treasury (the house) borrows dragons from members for a
 * named purpose and pays them back at game night. Borrowed from real bonds,
 * rethought for a server:
 *
 * - Terms run in Sundays. Coupons are paid at game night, with the prize.
 * - A coupon has a base and a share of the night: every seat filled beyond a
 *   threshold adds to it, so holders want full tables.
 * - Nothing defaults. A coupon the Treasury can't cover rolls to the next
 *   Sunday and is paid first.
 * - Small orders are filled first, and no member may hold more than a cap of
 *   any series. Bonds are for everyone, not for whoever holds the most.
 * - A bond can always be sold back to the Treasury. The fee starts at 5%
 *   and shrinks to nothing at maturity.
 *
 * Dragons only. A bond is a promise of dragons, never of money.
 */

export const FACE = 10_000;
export const SELL_BACK_FEE = 0.05;

export interface BondSeries {
  id: string;
  name: string;
  /** What the borrowed dragons pay for. */
  funds: string;
  /** Number of Sundays until the face is repaid. */
  term: number;
  /** Coupon per Sunday as a share of face. */
  base: number;
  /** Extra coupon per seat filled beyond `seatsFrom`. */
  perSeat: number;
  seatsFrom: number;
  /** Bonds in the series. */
  size: number;
  /** Most bonds one member may hold. */
  cap: number;
  /** Season week of issue. Coupons start the Sunday after. */
  issueWeek: number;
  /** Already placed with members (mockup state). */
  sold: number;
  status: "open" | "subscribing" | "placed" | "matured";
}

/** Coupon for one Sunday, given how many seats game night filled. */
export function coupon(s: BondSeries, seats: number): number {
  return Math.round(FACE * (s.base + s.perSeat * Math.max(0, seats - s.seatsFrom)));
}

export const maturityWeek = (s: BondSeries) => s.issueWeek + s.term;

/** Every payment one bond makes, given the seats each Sunday fills. */
export function schedule(s: BondSeries, seatsIn: (week: number) => number): { week: number; amount: number; face: boolean }[] {
  return Array.from({ length: s.term }, (_, i) => {
    const week = s.issueWeek + 1 + i;
    const last = i === s.term - 1;
    return { week, amount: coupon(s, seatsIn(week)) + (last ? FACE : 0), face: last };
  });
}

/** What the Treasury pays to take one bond back in a given week. */
export function sellBackValue(s: BondSeries, week: number): number {
  const left = Math.max(0, Math.min(s.term, maturityWeek(s) - week));
  return Math.round(FACE * (1 - SELL_BACK_FEE * (left / s.term)));
}

/** Total paid over the life of one bond per dragon lent, at a flat seat count. */
export function totalReturn(s: BondSeries, seats: number): number {
  return (s.term * coupon(s, seats) + FACE) / FACE - 1;
}

/**
 * Fill a subscription: smallest orders first, each capped, until the series
 * runs out. Returns bonds allotted per member.
 */
export function allocate(orders: { name: string; qty: number }[], available: number, cap: number): Record<string, number> {
  const out: Record<string, number> = {};
  let left = available;
  const queue = orders
    .map((o, i) => ({ ...o, qty: Math.min(o.qty, cap), i }))
    .filter((o) => o.qty > 0)
    .sort((a, b) => a.qty - b.qty || a.i - b.i);
  for (const o of queue) {
    const got = Math.min(o.qty, left);
    out[o.name] = (out[o.name] ?? 0) + got;
    left -= got;
  }
  return out;
}

/**
 * Pay what's due from what the Treasury has. Rolled coupons from earlier
 * Sundays are paid first; anything short rolls on. Nothing defaults.
 */
export function settle(treasury: number, rolled: number, due: number): { paid: number; rolled: number; treasury: number } {
  const owed = rolled + due;
  const paid = Math.min(owed, Math.max(0, treasury));
  return { paid, rolled: owed - paid, treasury: treasury - paid };
}

/** How many times this Sunday's coupons the Treasury earns in a week. */
export const coverage = (income: number, couponsDue: number) => (couponsDue <= 0 ? Infinity : income / couponsDue);
