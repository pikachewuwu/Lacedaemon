import { MEMBERS } from "../app/members";
import { hashSeed, seeded } from "../games/rng";
import { REFERENCE, SPIRITS, byId } from "../games/spirits/catalog";
import { ITEMS } from "../games/minecraft/items";

/**
 * One market for everything you can hold: Spirits, Minecraft items and
 * DAEMON, all priced in dragons. Every instrument has an order book.
 * Agents trade for you by rules you set (or describe in plain words).
 */

export type Kind = "spirit" | "item" | "daemon";

export interface Instrument {
  id: string; // "spirit:okeanyx", "item:diamond", "daemon"
  kind: Kind;
  key: string; // spirit id, item id, or "daemon"
  name: string;
  ref: number;
}

export const DAEMON_PRICE = 2000;

export const INSTRUMENTS: Instrument[] = [
  ...ITEMS.map((i) => ({ id: `item:${i.id}`, kind: "item" as const, key: i.id, name: i.name, ref: i.ref })),
  { id: "daemon", kind: "daemon", key: "daemon", name: "DAEMON", ref: DAEMON_PRICE },
  ...SPIRITS.map((s) => ({ id: `spirit:${s.id}`, kind: "spirit" as const, key: s.id, name: s.name, ref: REFERENCE[s.rarity] })),
];

export const instrument = (id: string) => INSTRUMENTS.find((i) => i.id === id)!;

export interface Level {
  price: number;
  qty: number;
  who: string;
}

export interface Book {
  id: string;
  asks: Level[];
  bids: Level[];
  last: number;
  change: number;
  volume: number;
}

export function roundPrice(n: number): number {
  const step = n >= 20000 ? 500 : n >= 2000 ? 50 : n >= 200 ? 5 : 1;
  return Math.max(step, Math.round(n / step) * step);
}

/** A deterministic daily book for an instrument. */
export function bookOf(id: string, day: string): Book {
  const ins = instrument(id);
  const r = seeded(hashSeed(`book2:${id}:${day}`));
  const qtyMax = ins.kind === "item" ? (ins.ref < 100 ? 256 : ins.ref < 1000 ? 48 : 4) : ins.kind === "daemon" ? 40 : 2;
  const levels = (side: 1 | -1) =>
    Array.from({ length: 3 + Math.floor(r() * 3) }, (_, i) => ({
      price: roundPrice(ins.ref * (1 + side * (0.02 + i * 0.04 + r() * 0.05))),
      qty: Math.max(1, Math.round(r() * qtyMax)),
      who: MEMBERS[Math.floor(r() * MEMBERS.length)].name,
    }));
  const asks = levels(1).sort((a, b) => a.price - b.price);
  const bids = levels(-1).sort((a, b) => b.price - a.price);
  return { id, asks, bids, last: roundPrice(ins.ref * (0.96 + r() * 0.08)), change: Math.round((r() - 0.45) * 160) / 10, volume: Math.round(r() * 60) };
}

/** Thirty days of closing prices, for sparklines. */
export function history(id: string, days = 30): number[] {
  const ins = instrument(id);
  const r = seeded(hashSeed(`hist:${id}`));
  const out: number[] = [];
  let p = ins.ref * (0.85 + r() * 0.2);
  for (let i = 0; i < days; i++) {
    p *= 1 + (r() - 0.48) * 0.08;
    p = p * 0.9 + ins.ref * 0.1;
    out.push(Math.round(p));
  }
  return out;
}

// ---- Agents ---------------------------------------------------------------------

export interface AgentRule {
  side: "buy" | "sell";
  instrument: string;
  limit: number;
  maxPerDay: number;
}

export interface Agent {
  id: string;
  name: string;
  rules: AgentRule[];
  budget: number; // dragons per day the agent may spend
  spentToday: number;
  day: string;
  active: boolean;
  source: "rules" | "words" | "api";
  log: { at: number; text: string }[];
}

const ALIASES: Record<string, string> = {
  diamonds: "item:diamond", diamond: "item:diamond", dias: "item:diamond",
  netherite: "item:netherite", ingots: "item:netherite",
  gold: "item:gold", iron: "item:iron", emeralds: "item:emerald", emerald: "item:emerald",
  redstone: "item:redstone", lanterns: "item:sea_lantern", "sea lanterns": "item:sea_lantern", obsidian: "item:obsidian",
  pearls: "item:ender_pearl", "ender pearls": "item:ender_pearl", daemon: "daemon",
};

function resolveName(word: string): string | null {
  const w = word.toLowerCase().trim().replace(/s$/, (m) => m);
  if (ALIASES[w]) return ALIASES[w];
  if (ALIASES[w.replace(/s$/, "")]) return ALIASES[w.replace(/s$/, "")];
  const spirit = SPIRITS.find((s) => s.id === w || s.id === w.replace(/s$/, ""));
  return spirit ? `spirit:${spirit.id}` : null;
}

/**
 * Turn plain words into rules. Understands sentences like
 * "buy diamonds under 450", "sell netherite above 9000",
 * "buy up to 10 emeralds below 200", "spend at most 30000 a day".
 */
export function parseWords(text: string): { rules: AgentRule[]; budget: number | null; unknown: string[] } {
  const rules: AgentRule[] = [];
  const unknown: string[] = [];
  let budget: number | null = null;
  for (const raw of text.toLowerCase().split(/[;\n]|[,.](?!\d)|\band\b/)) {
    const part = raw.trim();
    if (!part) continue;
    const spend = part.match(/(?:spend|budget)\D*?([\d,]+)/);
    if (spend) {
      budget = +spend[1].replace(/,/g, "");
      continue;
    }
    const m = part.match(/\b(buy|sell)\b\s+(?:up to\s+(\d+)\s+)?([a-z ]+?)\s+(?:under|below|for less than|at most|<)\s*([\d,]+)/) ??
      part.match(/\b(buy|sell)\b\s+(?:up to\s+(\d+)\s+)?([a-z ]+?)\s+(?:over|above|for more than|at least|>)\s*([\d,]+)/);
    if (!m) {
      unknown.push(part);
      continue;
    }
    const ins = resolveName(m[3]);
    if (!ins) {
      unknown.push(part);
      continue;
    }
    rules.push({ side: m[1] as "buy" | "sell", instrument: ins, limit: +m[4].replace(/,/g, ""), maxPerDay: m[2] ? +m[2] : 5 });
  }
  return { rules, budget, unknown };
}

export interface Fill {
  rule: AgentRule;
  price: number;
  qty: number;
}

/**
 * One pass of an agent over the books. Buys take asks at or under the
 * limit; sells hit bids at or over it. Budget and per-rule caps apply.
 * `holdings` says how many units of each instrument the owner has to sell.
 */
export function agentPass(agent: Agent, books: Record<string, Book>, holdings: Record<string, number>, doneToday: Record<string, number>): Fill[] {
  const fills: Fill[] = [];
  let budget = agent.budget - agent.spentToday;
  for (const rule of agent.rules) {
    const book = books[rule.instrument];
    if (!book) continue;
    const key = `${rule.side}:${rule.instrument}`;
    let room = rule.maxPerDay - (doneToday[key] ?? 0);
    if (room <= 0) continue;
    if (rule.side === "buy") {
      for (const ask of book.asks) {
        if (ask.price > rule.limit || room <= 0) break;
        const qty = Math.min(ask.qty, room, Math.floor(budget / ask.price));
        if (qty <= 0) break;
        fills.push({ rule, price: ask.price, qty });
        budget -= qty * ask.price;
        room -= qty;
      }
    } else {
      let have = holdings[rule.instrument] ?? 0;
      for (const bid of book.bids) {
        if (bid.price < rule.limit || room <= 0 || have <= 0) break;
        const qty = Math.min(bid.qty, room, have);
        fills.push({ rule, price: bid.price, qty });
        have -= qty;
        room -= qty;
      }
    }
  }
  return fills;
}

export const describeRule = (r: AgentRule) =>
  `${r.side === "buy" ? "Buy" : "Sell"} ${instrument(r.instrument).name} ${r.side === "buy" ? "at or under" : "at or over"} ${r.limit.toLocaleString("en-US")}, up to ${r.maxPerDay} a day`;

export { byId };
