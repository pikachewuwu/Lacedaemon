import type { Rand } from "./rng";

/**
 * Astragaloi: the knucklebone throw Greeks gambled on for a thousand years.
 * A bone lands on one of four sides worth 1, 3, 4 or 6. The broad sides
 * (3 and 4) come up far more often than the narrow ones (1 and 6).
 *
 * Throw four. The Venus throw, all four sides different, beats everything.
 * The Dog, four ones, loses to everything. Otherwise four of a kind beats
 * any mixed throw, then the higher total wins.
 */

export const SIDES = [1, 3, 4, 6] as const;
export const WEIGHTS = [0.1, 0.4, 0.4, 0.1];

export function bone(rand: Rand): number {
  let r = rand();
  for (let i = 0; i < 4; i++) {
    if ((r -= WEIGHTS[i]) < 0) return SIDES[i];
  }
  return 6;
}

export const throwBones = (rand: Rand) => [bone(rand), bone(rand), bone(rand), bone(rand)];

export function nameOf(t: number[]): string {
  const set = new Set(t);
  if (set.size === 4) return "Venus";
  if (t.every((x) => x === 1)) return "the Dog";
  if (set.size === 1) return `four ${t[0]}s`;
  return `${t.reduce((a, b) => a + b, 0)}`;
}

/** Higher is better. Venus 1000, four of a kind 500 + face, mixed = sum, Dog -1. */
export function rank(t: number[]): number {
  const set = new Set(t);
  if (set.size === 4) return 1000;
  if (t.every((x) => x === 1)) return -1;
  if (set.size === 1) return 500 + t[0];
  return t.reduce((a, b) => a + b, 0);
}
