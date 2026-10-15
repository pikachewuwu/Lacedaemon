import { MEMBERS } from "../app/members";
import { hashSeed, seeded, type Rand } from "../games/rng";
import { REFERENCE, SPIRITS, byId, cardValue, mint, type CardInstance } from "../games/spirits/catalog";

/**
 * The card market is an order book per spirit, priced in dragons, like the
 * Economy++ item markets. The mockup fills it with members' orders that
 * change once a day. A 5% fee on each sale goes to the Spirits module.
 */

export const MARKET_FEE = 0.05;

export interface Ask {
  id: string;
  seller: string;
  price: number;
  card: CardInstance;
}

export interface Bid {
  buyer: string;
  price: number;
}

export interface Book {
  spirit: string;
  asks: Ask[];
  bids: Bid[];
  last: number;
  change: number;
}

export function bookFor(spiritId: string, day: string): Book {
  const r = seeded(hashSeed(`book:${spiritId}:${day}`));
  const spirit = byId(spiritId);
  const ref = REFERENCE[spirit.rarity];
  const depth = spirit.rarity === "exalted" ? 1 : spirit.rarity === "mythic" ? 2 : 2 + Math.floor(r() * 4);
  const asks: Ask[] = Array.from({ length: depth }, (_, i) => ({
    id: `${spiritId}-${day}-${i}`,
    seller: MEMBERS[Math.floor(r() * MEMBERS.length)].name,
    price: roundPrice(ref * (0.9 + r() * 0.6)),
    card: { ...mint(r, spirit, "Market"), foil: false },
  })).sort((a, b) => a.price - b.price);
  const bids: Bid[] = Array.from({ length: 1 + Math.floor(r() * 3) }, () => ({
    buyer: MEMBERS[Math.floor(r() * MEMBERS.length)].name,
    price: roundPrice(ref * (0.55 + r() * 0.35)),
  })).sort((a, b) => b.price - a.price);
  const last = roundPrice(ref * (0.8 + r() * 0.5));
  return { spirit: spiritId, asks, bids, last, change: Math.round((r() - 0.45) * 240) / 10 };
}

export function roundPrice(n: number): number {
  const step = n >= 20000 ? 1000 : n >= 2000 ? 100 : 10;
  return Math.max(step, Math.round(n / step) * step);
}

export function allBooks(day: string): Book[] {
  return SPIRITS.map((s) => bookFor(s.id, day));
}

/** Chance per tick that a listing of yours at `price` finds a buyer. */
export function fillChance(card: CardInstance, price: number): number {
  const ratio = price / cardValue(card);
  if (ratio <= 0.9) return 0.9;
  if (ratio <= 1.1) return 0.45;
  if (ratio <= 1.4) return 0.15;
  return 0.03;
}

export const sellerNet = (price: number) => price - Math.round(price * MARKET_FEE);

/** A bot's own cards, for private-table stakes. */
export function botCards(name: string, rand: Rand, count: number): CardInstance[] {
  const r = seeded(hashSeed(`cards:${name}`) ^ Math.floor(rand() * 1e9));
  return Array.from({ length: count }, () => {
    const roll = r();
    const rarity = roll < 0.5 ? "common" : roll < 0.8 ? "uncommon" : roll < 0.96 ? "rare" : "mythic";
    const pool = SPIRITS.filter((s) => s.rarity === rarity);
    return mint(r, pool[Math.floor(r() * pool.length)], `${name}'s collection`);
  });
}
