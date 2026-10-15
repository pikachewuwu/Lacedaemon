import type { Rand } from "./rng";

/**
 * Icarus: everyone takes off together. The multiplier is your altitude and
 * it climbs toward the sun. Let go whenever you like and you keep your stake
 * times the altitude. When the wax melts, everyone still flying falls.
 *
 * Crash points follow the usual fair distribution with a small edge:
 * P(crash ≥ m) = (1 − EDGE) / m. A small share of flights melt on takeoff.
 */

export const EDGE = 0.03;
/** Growth rate per second: 2× after ~6.3 s, 10× after ~21 s. */
export const RATE = 0.11;
export const BOARDING_MS = 8000;
export const FALLEN_MS = 3500;

export function crashPoint(rand: Rand): number {
  const r = rand();
  const m = (1 - EDGE) / (1 - r);
  return Math.max(1, Math.floor(m * 100) / 100);
}

export const altitudeAt = (seconds: number) => Math.exp(RATE * seconds);
export const secondsTo = (multiplier: number) => Math.log(multiplier) / RATE;

export interface Flier {
  name: string;
  bet: number;
  /** Altitude the flier lets go at, if they do. */
  target: number;
  you?: boolean;
  /** Set once they let go. */
  out?: number;
}

/** Bots board with a stake and a private target. Some are greedy. */
export function botFliers(names: string[], rand: Rand): Flier[] {
  const n = 3 + Math.floor(rand() * (names.length - 2));
  const pool = names.slice().sort(() => rand() - 0.5).slice(0, n);
  return pool.map((name) => {
    const greedy = rand() < 0.2;
    const target = greedy ? 3 + rand() * 12 : 1.15 + rand() ** 1.6 * 2.6;
    return { name, bet: Math.round((200 + rand() ** 2 * 9800) / 100) * 100, target: Math.round(target * 100) / 100 };
  });
}

export const payoutFor = (bet: number, at: number) => Math.floor(bet * at);
