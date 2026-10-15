import { useSyncExternalStore } from "react";
import { programBySlug, splitEntry, type EntrySplit } from "../economy/modules";
import type { CardInstance } from "../games/spirits/catalog";
import type { Agent } from "../economy/trade";
import type { Colour } from "../games/boo/round";

/**
 * The signed-in member's state for the mockup: balances, inventory and a
 * ledger. Everything lives in the browser. In the real site this is the
 * backend's job; the shapes here are what its API should return.
 */

export interface LedgerEntry {
  id: string;
  at: number;
  text: string;
  tag: "entry" | "prize" | "collect" | "pack" | "market" | "drop" | "wager" | "refund" | "quest" | "minecraft";
  dragons?: number;
  daemon?: number;
  cards?: string[];
}

export interface BooCommit {
  date: string;
  colour: Colour;
  amount: number;
  at: number;
}

export interface BooRecord {
  date: string;
  colour: Colour;
  amount: number;
  payout: number;
  winners: Colour[];
}

export interface Listing {
  id: string;
  card: CardInstance;
  price: number;
  at: number;
}

export interface GameStats {
  played: number;
  won: number;
  net: number;
}

export interface State {
  signedIn: boolean;
  name: string;
  dragons: number;
  daemon: number;
  cards: CardInstance[];
  ledger: LedgerEntry[];
  collectAt: number;
  sundayWeek: string | null;
  boo: BooCommit | null;
  booHistory: BooRecord[];
  booStreak: number;
  stats: Record<string, GameStats>;
  listings: Listing[];
  /** Dragons other modules have routed into this week's Sunday pot. */
  sundayExtra: number;
  welcomePack: boolean;
  /** Quest progress for the current day and week, keyed by quest id. */
  quests: { day: string; week: string; progress: Record<string, number>; claimed: string[] };
  xp: number;
  seasonClaimed: number[];
  titles: string[];
  title: string | null;
  notes: Note[];
  /** Minecraft: linked account and vaulted items (in item units). */
  mc: { linked: string | null; vault: Record<string, number> };
  arena: { rating: number; wins: number; losses: number; team: string[] };
  news: { subs: string[]; delivery: "site" | "dm"; read: string[] };
  ideas: { votes: Record<string, 1 | -1>; mine: { id: string; title: string; body: string; at: number }[] };
  /** Cards shown on your profile. */
  showcase: string[];
  trade: { agents: Agent[]; offers: Offer[]; done: Record<string, number>; day: string };
  pente: { day: string; guesses: string[]; streak: number; played: number; won: number; dist: number[] };
  /** Messages you posted from elsewhere on the site (shares, Minecraft chat), shown in Chat. */
  posts: { id: string; channel: string; text: string; at: number }[];
  /** Server bonds you hold (real-money donations with yearly cosmetic coupons). */
  bonds: { held: HeldBond[] };
  /** Chosen site design. */
  theme: string;
}

export interface HeldBond {
  id: string;
  issue: string;
  /** Euros given. */
  amount: number;
  serial: number;
  at: number;
}

export type Asset =
  | { kind: "dragons"; amount: number }
  | { kind: "daemon"; amount: number }
  | { kind: "item"; id: string; qty: number }
  | { kind: "card"; card: CardInstance };

export interface Offer {
  id: string;
  with: string;
  incoming: boolean;
  give: Asset[];
  get: Asset[];
  status: "open" | "accepted" | "declined";
  at: number;
  note?: string;
}

export interface Note {
  id: string;
  at: number;
  text: string;
  route?: string;
  read: boolean;
}

const KEY = "lacedaemon.v3";

const initial: State = {
  signedIn: false,
  name: "you",
  dragons: 172_400,
  daemon: 0,
  cards: [],
  ledger: [],
  collectAt: 0,
  sundayWeek: null,
  boo: null,
  booHistory: [],
  booStreak: 0,
  stats: {},
  listings: [],
  sundayExtra: 38_400,
  welcomePack: true,
  quests: { day: "", week: "", progress: {}, claimed: [] },
  xp: 0,
  seasonClaimed: [],
  titles: ["Newcomer"],
  title: "Newcomer",
  notes: [],
  mc: { linked: null, vault: { diamond: 41, netherite: 3, iron: 220, gold: 96, emerald: 18, redstone: 640, sea_lantern: 64, obsidian: 32 } },
  arena: { rating: 1000, wins: 0, losses: 0, team: [] },
  news: { subs: ["front", "sunday", "markets", "minecraft"], delivery: "site", read: [] },
  ideas: { votes: {}, mine: [] },
  showcase: [],
  trade: { agents: [], offers: [], done: {}, day: "" },
  pente: { day: "", guesses: [], streak: 0, played: 0, won: 0, dist: [0, 0, 0, 0, 0, 0] },
  posts: [],
  bonds: { held: [] },
  theme: "laconia",
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // An earlier preview kept dragon bonds in a different shape; drop it.
      if (!Array.isArray(saved.bonds?.held)) delete saved.bonds;
      return { ...initial, ...saved };
    }
  } catch {
    /* storage unavailable: start fresh */
  }
  return { ...initial };
}

let state: State = load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function getState() {
  return state;
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  save();
  listeners.forEach((l) => l());
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
  );
}

let seq = 0;
const id = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

function record(entry: Omit<LedgerEntry, "id" | "at">) {
  setState((s) => ({ ledger: [{ ...entry, id: id(), at: Date.now() }, ...s.ledger].slice(0, 200) }));
}

// ---- Account ---------------------------------------------------------------

export function signIn() {
  setState({ signedIn: true });
}

export function signOut() {
  setState({ signedIn: false });
}

export function resetDemo() {
  state = { ...initial, theme: state.theme };
  save();
  listeners.forEach((l) => l());
}

export const COLLECT_AMOUNT = 17_000;
export const COLLECT_MS = 777 * 60_000;

export function collect(): boolean {
  if (Date.now() < state.collectAt) return false;
  setState((s) => ({ dragons: s.dragons + COLLECT_AMOUNT, collectAt: Date.now() + COLLECT_MS }));
  record({ text: "Collected Soul income", tag: "collect", dragons: COLLECT_AMOUNT });
  track("collect");
  return true;
}

// ---- Entries and prizes ----------------------------------------------------

export interface Receipt extends EntrySplit {
  dragons: number;
  module: string;
  ownerName: string;
}

/** Pay an entry into a module. Returns the receipt, or null when the balance is short. */
export function enter(slug: string, dragons: number, text: string): Receipt | null {
  if (state.dragons < dragons || dragons <= 0) return null;
  const m = programBySlug(slug);
  const split = splitEntry(m, dragons);
  setState((s) => ({
    dragons: s.dragons - dragons,
    daemon: Math.round((s.daemon + split.daemon) * 100) / 100,
    sundayExtra: s.sundayExtra + split.sunday,
  }));
  record({ text, tag: "entry", dragons: -dragons, daemon: split.daemon || undefined });
  track(`enter:${slug}`);
  return { ...split, dragons, module: m.name, ownerName: m.owner };
}

export function payout(game: string, dragons: number, text: string, won: boolean) {
  setState((s) => {
    const st = s.stats[game] ?? { played: 0, won: 0, net: 0 };
    return {
      dragons: s.dragons + dragons,
      stats: { ...s.stats, [game]: { played: st.played + 1, won: st.won + (won ? 1 : 0), net: st.net + dragons } },
    };
  });
  if (dragons > 0) record({ text, tag: "prize", dragons });
  track(`play:${game}`);
  if (won) track(`win:${game}`);
}

export function refund(dragons: number, text: string) {
  setState((s) => ({ dragons: s.dragons + dragons }));
  record({ text, tag: "refund", dragons });
}

// ---- Cards -----------------------------------------------------------------

export function addCards(cards: CardInstance[], text: string, tag: LedgerEntry["tag"] = "drop") {
  if (!cards.length) return;
  setState((s) => ({ cards: [...cards, ...s.cards] }));
  record({ text, tag, cards: cards.map((c) => c.spirit) });
  if (tag === "pack") track("pack_open");
}

export function removeCards(uids: string[]) {
  const gone = new Set(uids);
  setState((s) => ({ cards: s.cards.filter((c) => !gone.has(c.uid)) }));
}

export function spend(dragons: number, text: string, tag: LedgerEntry["tag"]): boolean {
  if (state.dragons < dragons) return false;
  setState((s) => ({ dragons: s.dragons - dragons }));
  record({ text, tag, dragons: -dragons });
  return true;
}

export function earn(dragons: number, text: string, tag: LedgerEntry["tag"]) {
  setState((s) => ({ dragons: s.dragons + dragons }));
  record({ text, tag, dragons });
}

export function moveDaemon(delta: number, text: string, tag: LedgerEntry["tag"]) {
  setState((s) => ({ daemon: Math.round((s.daemon + delta) * 100) / 100 }));
  record({ text, tag, daemon: delta });
}

export { record };

export function post(channel: string, text: string) {
  setState((s) => ({ posts: [...s.posts, { id: id(), channel, text, at: Date.now() }].slice(-80) }));
}

// ---- Notifications -------------------------------------------------------------

export function notify(text: string, route?: string) {
  setState((s) => ({ notes: [{ id: id(), at: Date.now(), text, route, read: false }, ...s.notes].slice(0, 40) }));
}

export function markNotesRead() {
  setState((s) => ({ notes: s.notes.map((n) => ({ ...n, read: true })) }));
}

// ---- Quest events -----------------------------------------------------------------

type Tracker = (event: string, amount: number) => void;
let tracker: Tracker = () => {};
/** Quests register here; everything else just calls track(). */
export function setTracker(fn: Tracker) {
  tracker = fn;
}
export function track(event: string, amount = 1) {
  tracker(event, amount);
}
