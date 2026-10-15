/**
 * Server bonds: how Lacedaemon pays its real bills. A bond is a voluntary
 * donation in real money, held as a long-term certificate, with a small
 * reward every year of its term. Borrowed from real bonds, rethought:
 *
 * - Nothing is paid back in money, and no reward can be cashed out, traded
 *   or turned into dragons. That keeps bonds a donation, not an investment,
 *   and keeps real money away from the games of chance.
 * - Terms are long: three years, ten years, or perpetual (a consol).
 * - The coupon is yearly, on the bond's anniversary: a laurel card stamped
 *   with the year, which only its holder can own, and one cosmetic of their choice.
 * - The books are open. Every cost is listed, and runway is shown in months.
 * - The server never raises more than two years ahead. Past that, new bonds pause.
 * - If Lacedaemon ever closes, whatever is left goes back to holders, pro rata.
 */

export const MAX_RUNWAY_MONTHS = 24;

export interface Cost {
  id: string;
  item: string;
  note: string;
  /** Euros a month. */
  perMonth: number;
}

export interface Issue {
  id: string;
  name: string;
  /** What this series pays for. */
  funds: string;
  /** Years of yearly coupons; null for a perpetual bond. */
  term: number | null;
  /** Smallest bond in euros. */
  min: number;
  suggested: number[];
  /** Raised so far in euros, and from how many holders. */
  raised: number;
  holders: number;
  /** Extra beyond what every bond gets. */
  extra: string;
}

export const monthlyCost = (costs: Cost[]) => Math.round(costs.reduce((s, c) => s + c.perMonth, 0) * 100) / 100;

/** Whole months the balance covers. */
export function runway(balance: number, costs: Cost[]): number {
  const m = monthlyCost(costs);
  return m <= 0 ? Infinity : Math.floor(balance / m);
}

/** New bonds pause once the balance covers more than the cap. */
export const issuing = (balance: number, costs: Cost[]) => runway(balance, costs) < MAX_RUNWAY_MONTHS;

/** Room left before bonds pause, in euros. */
export const room = (balance: number, costs: Cost[]) => Math.max(0, Math.round(MAX_RUNWAY_MONTHS * monthlyCost(costs) - balance));

const YEAR_MS = 365.2425 * 86_400_000;

/** Anniversaries passed since purchase, capped at the term. */
export function couponsPaid(boughtAt: number, term: number | null, now: number): number {
  const years = Math.floor((now - boughtAt) / YEAR_MS + 1e-9);
  return Math.max(0, term === null ? years : Math.min(term, years));
}

/** When the next coupon falls, or null once the term is over. */
export function nextCoupon(boughtAt: number, term: number | null, now: number): number | null {
  const paid = couponsPaid(boughtAt, term, now);
  if (term !== null && paid >= term) return null;
  return boughtAt + (paid + 1) * YEAR_MS;
}

/** If Lacedaemon closes: what's left goes back to holders in proportion to what they gave. */
export function windDown(balance: number, holdings: { name: string; amount: number }[]): Record<string, number> {
  const total = holdings.reduce((s, h) => s + h.amount, 0);
  const out: Record<string, number> = {};
  if (total <= 0 || balance <= 0) return out;
  for (const h of holdings) out[h.name] = Math.floor(((out[h.name] ?? 0) + (balance * h.amount) / total) * 100) / 100;
  return out;
}
