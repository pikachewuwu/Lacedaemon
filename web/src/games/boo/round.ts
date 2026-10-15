import { hashSeed, seeded, type Rand } from "../rng";

/**
 * Blue or Orange, with rock-paper-scissors dynamics.
 *
 * Three colours, one cycle: blue puts out orange, orange burns green, green
 * drinks blue. Everyone stakes dragons on one colour, in secret. When the
 * round closes (at a random minute, so nobody can snipe the last second):
 *
 *   1. Pools are ranked by total stake.
 *   2. The smallest pool wins half the pot. This is the old Blue or Orange:
 *      the colour fewer people backed wins.
 *   3. The two largest pools fight by the cycle. The winner takes the other half.
 *   4. Inside a winning pool, a stake c is weighted c^1.5.
 *
 * Why this is hard to cheat:
 *   - Payouts follow stake, not head count, so alt accounts add nothing.
 *   - Splitting one stake over k accounts in the same pool shrinks its
 *     weight to c^1.5 / sqrt(k). Concentration is rewarded, splitting punished.
 *   - Colluding to be the minority makes your pool big, which drops it into
 *     the fight, where the outcome depends on a colour you don't control.
 *   - One colour per account per round: hedging needs alts, and alts dilute.
 */

export type Colour = "blue" | "orange" | "green";
export const COLOURS: Colour[] = ["blue", "orange", "green"];
export const BEATS: Record<Colour, Colour> = { blue: "orange", orange: "green", green: "blue" };
export const VERB: Record<Colour, string> = { blue: "puts out", orange: "burns", green: "drinks" };

export interface Stake {
  player: string;
  colour: Colour;
  amount: number;
  /** ms timestamp, used to break ties between equal pools. */
  at: number;
}

export interface Resolution {
  pools: Record<Colour, number>;
  /** Largest first. */
  ranked: Colour[];
  underdog: Colour | null;
  fight: { winner: Colour; loser: Colour } | null;
  pot: number;
  tranches: Partial<Record<Colour, number>>;
  payouts: Record<string, number>;
  /** True when fewer than two colours were backed: everyone is refunded. */
  void: boolean;
}

/** Split `total` by weight with integer results; leftovers go to the heaviest weights. */
export function splitByWeight(total: number, weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights);
  const sum = keys.reduce((s, k) => s + weights[k], 0);
  const out: Record<string, number> = {};
  if (sum <= 0) return out;
  let given = 0;
  for (const k of keys) {
    out[k] = Math.floor((total * weights[k]) / sum);
    given += out[k];
  }
  const order = keys.slice().sort((a, b) => weights[b] - weights[a]);
  for (let i = 0; given < total; i = (i + 1) % order.length, given++) out[order[i]]++;
  return out;
}

export function resolve(stakes: Stake[], redistribution: number): Resolution {
  const pools: Record<Colour, number> = { blue: 0, orange: 0, green: 0 };
  const first: Record<Colour, number> = { blue: Infinity, orange: Infinity, green: Infinity };
  for (const s of stakes) {
    pools[s.colour] += s.amount;
    first[s.colour] = Math.min(first[s.colour], s.at);
  }
  const total = stakes.reduce((sum, s) => sum + s.amount, 0);
  // Ties: the pool that opened earlier ranks higher (and so is not the underdog).
  const ranked = COLOURS.slice().sort((a, b) => pools[b] - pools[a] || first[a] - first[b]);
  const backed = ranked.filter((c) => pools[c] > 0);

  const base = { pools, ranked, pot: 0, tranches: {}, payouts: {} as Record<string, number> };
  if (backed.length < 2) {
    for (const s of stakes) base.payouts[s.player] = (base.payouts[s.player] ?? 0) + s.amount;
    return { ...base, underdog: null, fight: null, void: true };
  }

  const pot = Math.floor(total * redistribution);
  const tranches: Partial<Record<Colour, number>> = {};
  let underdog: Colour | null = null;
  let fight: { winner: Colour; loser: Colour };

  if (backed.length === 2) {
    // Two colours: they fight for everything.
    const [a, b] = backed;
    const winner = BEATS[a] === b ? a : b;
    fight = { winner, loser: winner === a ? b : a };
    tranches[winner] = pot;
  } else {
    const [largest, second, smallest] = ranked;
    underdog = smallest;
    const winner = BEATS[largest] === second ? largest : second;
    fight = { winner, loser: winner === largest ? second : largest };
    tranches[underdog] = Math.floor(pot / 2);
    tranches[winner] = pot - Math.floor(pot / 2);
  }

  const payouts: Record<string, number> = {};
  for (const colour of Object.keys(tranches) as Colour[]) {
    const weights: Record<string, number> = {};
    for (const s of stakes) if (s.colour === colour) weights[s.player] = (weights[s.player] ?? 0) + s.amount;
    for (const k of Object.keys(weights)) weights[k] = weights[k] ** 1.5;
    const split = splitByWeight(tranches[colour]!, weights);
    for (const [player, amount] of Object.entries(split)) payouts[player] = (payouts[player] ?? 0) + amount;
  }
  return { pools, ranked, underdog, fight, pot, tranches, payouts, void: false };
}

/** Today's round closes at a random minute between 20:00 and 22:00, fixed per date. */
export function closeMinute(dateKey: string): number {
  const r = seeded(hashSeed("boo:" + dateKey))();
  return 20 * 60 + Math.floor(r * 120);
}

const NAMES = ["lysander", "gorgo", "brasidas", "kyniska", "agis", "chilon", "demaratus", "archidamus", "leotychidas", "pausanias", "talthybios", "eurybiades"];

/** Other players' stakes for a practice round. Biased so pools differ in size. */
export function simulateField(rand: Rand, count: number, now: number): Stake[] {
  const bias = [rand(), rand(), rand()];
  const stakes: Stake[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rand() * (bias[0] + bias[1] + bias[2]);
    const colour = roll < bias[0] ? "blue" : roll < bias[0] + bias[1] ? "orange" : "green";
    const amount = Math.round((500 + rand() ** 2 * 14500) / 100) * 100;
    stakes.push({ player: NAMES[i % NAMES.length], colour, amount, at: now - Math.floor(rand() * 36e6) });
  }
  return stakes;
}
