import { byId, type Element } from "./spirits/catalog";
import type { Rand } from "./rng";

/**
 * Spirits Arena. Two teams of three. Every turn both players secretly pick
 * which spirit steps forward; the two clash and hit each other at once.
 * Water beats fire, fire beats grass, grass beats water, the same cycle as
 * Blue or Orange. Aether hits everything a little harder and fears nothing.
 * Knock out all three of the other side's spirits to win.
 */

export interface Fighter {
  spirit: string;
  hp: number;
  max: number;
}

export const BEATS: Partial<Record<Element, Element>> = { water: "fire", fire: "grass", grass: "water" };

export function multiplier(att: Element, def: Element): number {
  if (att === "aether") return 1.25;
  if (def === "aether") return 1;
  if (BEATS[att] === def) return 1.6;
  if (BEATS[def] === att) return 0.6;
  return 1;
}

export function fighter(spiritId: string): Fighter {
  const s = byId(spiritId);
  const max = 40 + s.power;
  return { spirit: spiritId, hp: max, max };
}

export function damage(att: string, def: string, rand: Rand): number {
  const a = byId(att), d = byId(def);
  return Math.max(1, Math.round((a.power * multiplier(a.element, d.element) * (0.85 + rand() * 0.3)) / 2.2));
}

export interface Clash {
  you: number;
  them: number;
  dealt: number;
  taken: number;
}

/** Resolve one turn in place. Indices pick the stepping-forward fighters. */
export function clash(you: Fighter[], them: Fighter[], yi: number, ti: number, rand: Rand): Clash {
  const dealt = damage(you[yi].spirit, them[ti].spirit, rand);
  const taken = damage(them[ti].spirit, you[yi].spirit, rand);
  them[ti].hp = Math.max(0, them[ti].hp - dealt);
  you[yi].hp = Math.max(0, you[yi].hp - taken);
  return { you: yi, them: ti, dealt, taken };
}

export const alive = (team: Fighter[]) => team.map((f, i) => (f.hp > 0 ? i : -1)).filter((i) => i >= 0);

export function outcome(you: Fighter[], them: Fighter[]): "win" | "loss" | "draw" | null {
  const a = alive(you).length, b = alive(them).length;
  if (a && b) return null;
  if (!a && !b) return "draw";
  return a ? "win" : "loss";
}

/** The bot guesses what you'll send and answers it, with some noise. */
export function botPick(bot: Fighter[], you: Fighter[], rand: Rand): number {
  const mine = alive(bot);
  const theirs = alive(you);
  let best = mine[0];
  let bestScore = -Infinity;
  for (const i of mine) {
    const me = byId(bot[i].spirit);
    let score = 0;
    for (const j of theirs) {
      const t = byId(you[j].spirit);
      score += multiplier(me.element, t.element) * me.power - multiplier(t.element, me.element) * t.power;
    }
    score += (bot[i].hp / bot[i].max) * 20 + rand() * 40;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/** Elo with K = 32. */
export function elo(rating: number, opponent: number, result: 1 | 0.5 | 0): number {
  const expected = 1 / (1 + 10 ** ((opponent - rating) / 400));
  return Math.round(rating + 32 * (result - expected));
}
