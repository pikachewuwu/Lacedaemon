/** DAEMON supply: 21M cap, 7,200 a day, floor(0.9×) every year. */

export const CAP = 21_000_000;
export const START_DAILY = 7200;
/** The first emission day. Supply figures on the site count from here. */
export const GENESIS = Date.UTC(2026, 3, 14);

export interface Year {
  year: number;
  daily: number;
  minted: number;
  total: number;
}

export function schedule(years = 24): Year[] {
  const out: Year[] = [];
  let daily = START_DAILY;
  let total = 0;
  for (let year = 1; year <= years; year++) {
    const minted = Math.min(daily * 365, CAP - total);
    total += minted;
    out.push({ year, daily, minted, total });
    daily = Math.floor(daily * 0.9);
  }
  return out;
}

export function capYear(): number | null {
  return schedule().find((y) => y.total >= CAP)?.year ?? null;
}

/** Supply minted up to `now`, assuming every day since genesis emitted in full. */
export function mintedBy(now: number): number {
  const days = Math.max(0, Math.floor((now - GENESIS) / 86_400_000));
  let total = 0;
  let daily = START_DAILY;
  for (let d = 0; d < days; d++) {
    if (d > 0 && d % 365 === 0) daily = Math.floor(daily * 0.9);
    total += daily;
  }
  return Math.min(total, CAP);
}

export function epochNumber(now: number): number {
  return Math.max(1, Math.floor((now - GENESIS) / 86_400_000) + 1);
}
