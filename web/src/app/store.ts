import { useSyncExternalStore } from "react";
import { programBySlug, splitEntry, type EntrySplit } from "../economy/modules";
import type { CardInstance } from "../games/spirits/catalog";
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
  tag: "entry" | "prize" | "collect" | "pack" | "market" | "drop" | "wager" | "refund";
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
}

const KEY = "lacedaemon.v2";

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
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial, ...JSON.parse(raw) };
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
  state = { ...initial };
  save();
  listeners.forEach((l) => l());
}

export const COLLECT_AMOUNT = 17_000;
export const COLLECT_MS = 777 * 60_000;

export function collect(): boolean {
  if (Date.now() < state.collectAt) return false;
  setState((s) => ({ dragons: s.dragons + COLLECT_AMOUNT, collectAt: Date.now() + COLLECT_MS }));
  record({ text: "Collected Soul income", tag: "collect", dragons: COLLECT_AMOUNT });
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
