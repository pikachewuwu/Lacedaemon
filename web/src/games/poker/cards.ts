import { shuffle, type Rand } from "../rng";

/** A card is 0..51. rank = c % 13 (0 = deuce … 12 = ace), suit = c / 13. */
export type Card = number;

export const RANKS = "23456789TJQKA";
export const SUITS = ["s", "h", "d", "c"] as const;
export const SUIT_GLYPH = ["♠", "♥", "♦", "♣"] as const;
export const RANK_NAMES = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];

export const rankOf = (c: Card) => c % 13;
export const suitOf = (c: Card) => Math.floor(c / 13);
export const isRed = (c: Card) => suitOf(c) === 1 || suitOf(c) === 2;

export function newDeck(rand: Rand): Card[] {
  return shuffle(Array.from({ length: 52 }, (_, i) => i), rand);
}

/** "As" -> card, "Td" -> card. Used by tests and logs. */
export function parseCard(text: string): Card {
  const r = RANKS.indexOf(text[0].toUpperCase());
  const s = SUITS.indexOf(text[1].toLowerCase() as (typeof SUITS)[number]);
  if (r < 0 || s < 0) throw new Error(`Bad card: ${text}`);
  return s * 13 + r;
}

export function cardLabel(c: Card): string {
  const r = RANKS[rankOf(c)];
  return (r === "T" ? "10" : r) + SUIT_GLYPH[suitOf(c)];
}
