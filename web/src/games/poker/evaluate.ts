import { rankOf, suitOf, RANK_NAMES, type Card } from "./cards";
import type { Rand } from "../rng";

export const CATEGORY = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
] as const;

export interface HandValue {
  /** Higher is better; comparable across any two hands. */
  score: number;
  category: number;
  name: string;
  best: Card[];
}

const plural = (r: number) => (r === 4 ? "Sixes" : RANK_NAMES[r] + "s");

/** Score exactly five cards. Encoded as category, then five kicker ranks, base 13. */
export function score5(cards: Card[]): { score: number; category: number; kick: number[] } {
  const ranks = cards.map(rankOf).sort((a, b) => b - a);
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]));
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const uniq = groups.map((g) => g[0]).sort((a, b) => b - a);

  let straightHigh = -1;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 12 && uniq[1] === 3 && uniq[4] === 0) straightHigh = 3; // wheel
  }

  let category: number;
  let kick: number[];
  if (straightHigh >= 0 && flush) [category, kick] = [8, [straightHigh]];
  else if (groups[0][1] === 4) [category, kick] = [7, [groups[0][0], groups[1][0]]];
  else if (groups[0][1] === 3 && groups[1][1] === 2) [category, kick] = [6, [groups[0][0], groups[1][0]]];
  else if (flush) [category, kick] = [5, ranks];
  else if (straightHigh >= 0) [category, kick] = [4, [straightHigh]];
  else if (groups[0][1] === 3) [category, kick] = [3, groups.map((g) => g[0])];
  else if (groups[0][1] === 2 && groups[1][1] === 2) [category, kick] = [2, groups.map((g) => g[0])];
  else if (groups[0][1] === 2) [category, kick] = [1, groups.map((g) => g[0])];
  else [category, kick] = [0, ranks];

  let score = category;
  for (let i = 0; i < 5; i++) score = score * 13 + (kick[i] ?? 0);
  return { score, category, kick };
}

const COMBOS: Record<number, number[][]> = {};
function combos(n: number): number[][] {
  if (COMBOS[n]) return COMBOS[n];
  const out: number[][] = [];
  const walk = (start: number, acc: number[]) => {
    if (acc.length === 5) return void out.push(acc.slice());
    for (let i = start; i < n; i++) {
      acc.push(i);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return (COMBOS[n] = out);
}

/** Best five-card hand out of five to seven cards. */
export function evaluate(cards: Card[]): HandValue {
  let best = { score: -1, category: 0, kick: [] as number[] };
  let bestCards: Card[] = [];
  for (const idx of combos(cards.length)) {
    const five = idx.map((i) => cards[i]);
    const v = score5(five);
    if (v.score > best.score) {
      best = v;
      bestCards = five;
    }
  }
  return { score: best.score, category: best.category, name: describe(best.category, best.kick), best: bestCards };
}

function describe(category: number, kick: number[]): string {
  const r = (i: number) => RANK_NAMES[kick[i]];
  switch (category) {
    case 8: return kick[0] === 12 ? "Royal flush" : `Straight flush, ${r(0)} high`;
    case 7: return `Four ${plural(kick[0])}`;
    case 6: return `Full house, ${plural(kick[0])} full of ${plural(kick[1])}`;
    case 5: return `Flush, ${r(0)} high`;
    case 4: return `Straight, ${r(0)} high`;
    case 3: return `Three ${plural(kick[0])}`;
    case 2: return `Two pair, ${plural(kick[0])} and ${plural(kick[1])}`;
    case 1: return `Pair of ${plural(kick[0])}`;
    default: return `${r(0)} high`;
  }
}


function straightHigh(mask: number): number {
  for (let hi = 12; hi >= 4; hi--) {
    const run = 0b11111 << (hi - 4);
    if ((mask & run) === run) return hi;
  }
  return (mask & 0b1000000001111) === 0b1000000001111 ? 3 : -1; // wheel
}

function topRanks(mask: number, n: number, out: number[]) {
  for (let r = 12; r >= 0 && out.length < n; r--) if (mask & (1 << r)) out.push(r);
  return out;
}

/**
 * Same score as `evaluate(cards).score`, computed directly from rank and suit
 * counts without trying every five-card subset. Used for Monte Carlo.
 */
export function fastScore(cards: Card[]): number {
  const counts = new Array(13).fill(0);
  const suitMask = [0, 0, 0, 0];
  const suitCount = [0, 0, 0, 0];
  let mask = 0;
  for (const c of cards) {
    const r = c % 13;
    const s = (c / 13) | 0;
    counts[r]++;
    suitMask[s] |= 1 << r;
    suitCount[s]++;
    mask |= 1 << r;
  }
  const enc = (category: number, kick: number[]) => {
    let score = category;
    for (let i = 0; i < 5; i++) score = score * 13 + (kick[i] ?? 0);
    return score;
  };

  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (suitCount[s] >= 5) flushSuit = s;
  if (flushSuit >= 0) {
    const sf = straightHigh(suitMask[flushSuit]);
    if (sf >= 0) return enc(8, [sf]);
  }

  let quad = -1;
  const trips: number[] = [];
  const pairs: number[] = [];
  for (let r = 12; r >= 0; r--) {
    if (counts[r] === 4) quad = r;
    else if (counts[r] === 3) trips.push(r);
    else if (counts[r] === 2) pairs.push(r);
  }
  if (quad >= 0) return enc(7, [quad, topRanks(mask & ~(1 << quad), 1, [])[0]]);
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const pair = Math.max(trips[1] ?? -1, pairs[0] ?? -1);
    return enc(6, [trips[0], pair]);
  }
  if (flushSuit >= 0) return enc(5, topRanks(suitMask[flushSuit], 5, []));
  const st = straightHigh(mask);
  if (st >= 0) return enc(4, [st]);
  if (trips.length) return enc(3, topRanks(mask & ~(1 << trips[0]), 3, [trips[0]]));
  if (pairs.length >= 2) {
    const kicker = topRanks(mask & ~(1 << pairs[0]) & ~(1 << pairs[1]), 1, [])[0];
    return enc(2, [pairs[0], pairs[1], kicker]);
  }
  if (pairs.length) return enc(1, topRanks(mask & ~(1 << pairs[0]), 4, [pairs[0]]));
  return enc(0, topRanks(mask, 5, []));
}

/**
 * Monte Carlo equity of `hole` against `opponents` random hands, given the
 * board so far and cards known to be out of the deck. Ties count as shares.
 */
export function equity(hole: Card[], board: Card[], opponents: number, iterations: number, rand: Rand): number {
  if (opponents <= 0) return 1;
  const known = new Set([...hole, ...board]);
  const rest: Card[] = [];
  for (let c = 0; c < 52; c++) if (!known.has(c)) rest.push(c);
  let won = 0;
  for (let it = 0; it < iterations; it++) {
    // partial Fisher-Yates: draw only what we need
    const need = opponents * 2 + (5 - board.length);
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rand() * (rest.length - i));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const fullBoard = board.concat(rest.slice(opponents * 2, need));
    const mine = fastScore(hole.concat(fullBoard));
    let ties = 1;
    let beaten = false;
    for (let o = 0; o < opponents; o++) {
      const s = fastScore([rest[o * 2], rest[o * 2 + 1], ...fullBoard]);
      if (s > mine) { beaten = true; break; }
      if (s === mine) ties++;
    }
    if (!beaten) won += 1 / ties;
  }
  return won / iterations;
}
