import { cardValue, type CardInstance } from "../games/spirits/catalog";
import { botCards } from "./market";
import type { Rand } from "../games/rng";

/**
 * Private poker tables: everyone puts something on the table. Dragons,
 * DAEMON, cards, anything in the inventory. Nothing is dealt until every
 * seat has seen every stake and accepted. The winner takes the table.
 * Stakes sit in escrow while the game runs, so nobody can spend them twice.
 */

export const DAEMON_REF = 2000; // dragons per DAEMON, for comparing stakes

export interface StakeItems {
  dragons: number;
  daemon: number;
  cards: CardInstance[];
}

export interface SeatStake {
  player: string;
  items: StakeItems;
  status: "waiting" | "accepted" | "declined";
  note?: string;
}

export const emptyStake = (): StakeItems => ({ dragons: 0, daemon: 0, cards: [] });

export function stakeValue(s: StakeItems): number {
  return s.dragons + s.daemon * DAEMON_REF + s.cards.reduce((sum, c) => sum + cardValue(c), 0);
}

export function isEmpty(s: StakeItems) {
  return s.dragons <= 0 && s.daemon <= 0 && s.cards.length === 0;
}

/** A bot answers your stake with one of its own, close in value, in its own style. */
export function botStake(name: string, target: number, rand: Rand): StakeItems {
  const style = rand();
  const items = emptyStake();
  let left = target * (0.85 + rand() * 0.3);
  if (style > 0.35) {
    for (const c of botCards(name, rand, 6)) {
      const v = cardValue(c);
      if (v <= left * 0.7 && items.cards.length < 3) {
        items.cards.push(c);
        left -= v;
      }
    }
  }
  if (style > 0.75 && left > DAEMON_REF * 2) {
    const d = Math.floor((left * 0.4) / DAEMON_REF);
    items.daemon = d;
    left -= d * DAEMON_REF;
  }
  items.dragons = Math.max(0, Math.round(left / 100) * 100);
  return items;
}

/** Bots accept when the table is worth at least what they put in, with some temperament. */
export function botDecision(own: StakeItems, table: StakeItems[], rand: Rand): { accept: boolean; note: string } {
  const mine = stakeValue(own);
  const others = table.map(stakeValue);
  const avg = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
  if (avg >= mine * 0.8) return { accept: true, note: rand() < 0.3 ? "Deal." : "Accepted." };
  if (rand() < 0.3) return { accept: true, note: "Fine. I like the cards." };
  return { accept: false, note: "Not enough on the table." };
}

export function mergeStakes(stakes: StakeItems[]): StakeItems {
  return stakes.reduce(
    (acc, s) => ({ dragons: acc.dragons + s.dragons, daemon: acc.daemon + s.daemon, cards: [...acc.cards, ...s.cards] }),
    emptyStake(),
  );
}
