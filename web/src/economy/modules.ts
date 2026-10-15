/**
 * Two kinds of games.
 *
 * House games belong to the server: Sunday night, poker, Monopoly, kottabos.
 * They run on dragons only. Every entry dragon goes to the prize.
 *
 * Daemon modules are games built on DAEMON by members. An entry still costs
 * dragons, but those dragons buy DAEMON from the module's owner, so every
 * player walks away holding a little. The owner routes the dragons by their
 * program: back into the game's pot, into another pot (the Sunday prize),
 * or into their own pocket. The Arbiter pays owners new DAEMON for activity
 * and conviction, which is what makes generosity pay.
 */

export type Route = "pot" | "sunday" | "owner";

export interface GameProgram {
  kind: "house" | "module";
  id: string;
  slug: string;
  name: string;
  owner: string;
  /** Dragons per DAEMON when an entry buys from the owner. 0 for house games. */
  price: number;
  /** Where entry dragons go. Shares sum to at most 1; the owner gets the rest. */
  routes: Partial<Record<Route, number>>;
  /** DAEMON the owner keeps locked behind the module. Entries draw from it. */
  locked: number;
  lockDays: number;
  backers: number;
  /** Example activity over the last 7 days. */
  players7d: number;
  entries7d: number;
  volume7d: number;
  summary: string;
}

export type ModuleProgram = GameProgram & { kind: "module" };

const house = (slug: string, name: string, summary: string): GameProgram => ({
  kind: "house", id: "H", slug, name, owner: "the house", price: 0, routes: { pot: 1 },
  locked: 0, lockDays: 0, backers: 0, players7d: 0, entries7d: 0, volume7d: 0, summary,
});

export const MODULES: ModuleProgram[] = [
  {
    kind: "module",
    id: "01",
    slug: "blue-or-orange",
    name: "Blue or Orange",
    owner: "gorgo",
    price: 2000,
    routes: { pot: 0.95 },
    locked: 9200,
    lockDays: 180,
    backers: 4,
    players7d: 8,
    entries7d: 41,
    volume7d: 186000,
    summary: "Daily. Three colours. The smallest pool wins half, the two largest fight for the rest. The rock-paper-scissors core of the old convergence arena, on the surface.",
  },
  {
    kind: "module",
    id: "02",
    slug: "spirits",
    name: "Spirits",
    owner: "kyniska",
    price: 1500,
    routes: { sunday: 0.4 },
    locked: 6400,
    lockDays: 60,
    backers: 5,
    players7d: 8,
    entries7d: 57,
    volume7d: 171000,
    summary: "Packs, drops and the card market. Forty percent of every pack funds Sunday's prize.",
  },
  {
    kind: "module",
    id: "03",
    slug: "knucklebones",
    name: "Knucklebones",
    owner: "agis",
    price: 2500,
    routes: { pot: 0.97 },
    locked: 12500,
    lockDays: 120,
    backers: 3,
    players7d: 7,
    entries7d: 164,
    volume7d: 310000,
    summary: "Astragaloi at the Symposium table. Everyone antes, everyone throws, the best throw takes the pot. Venus beats all.",
  },
];

export const HOUSE: GameProgram[] = [
  house("poker", "Poker", "Sit & go tournaments and private tables. Every entry dragon goes to the winner."),
  house("monopoly", "Monopoly", "The Laconian board. Every entry dragon goes to the winner."),
  house("kottabos", "Kottabos", "Flick wine at the bronze disc. Everyone who knocks it down splits the round's pot."),
  house("arena", "Arena", "Ranked Spirits duels. Wins pay from the house."),
  house("pente", "Pente", "The daily five-letter word. Free to play, solves pay from the house."),
];

export const PROGRAMS: GameProgram[] = [...MODULES, ...HOUSE];

export const programBySlug = (slug: string): GameProgram => {
  const p = PROGRAMS.find((m) => m.slug === slug);
  if (!p) throw new Error(`Unknown game: ${slug}`);
  return p;
};

export interface EntrySplit {
  daemon: number;
  pot: number;
  sunday: number;
  owner: number;
}

/** What happens to one entry of `dragons`. Integer dragons, DAEMON to 0.01. */
export function splitEntry(m: GameProgram, dragons: number): EntrySplit {
  const pot = Math.floor(dragons * (m.routes.pot ?? 0));
  const sunday = Math.floor(dragons * (m.routes.sunday ?? 0));
  return {
    daemon: m.kind === "module" ? Math.floor((dragons / m.price) * 100) / 100 : 0,
    pot,
    sunday,
    owner: dragons - pot - sunday,
  };
}

/** Conviction: locked DAEMON weighted by how long it stays locked (sqrt of days, capped at 90). */
export function conviction(m: Pick<GameProgram, "locked" | "lockDays">): number {
  return m.locked * Math.sqrt(Math.min(m.lockDays, 90));
}

/** Activity: unique players count most, entries and volume add with diminishing returns. */
export function activity(m: Pick<GameProgram, "players7d" | "entries7d" | "volume7d">): number {
  return m.players7d * 10 + Math.sqrt(m.entries7d) * 6 + Math.log10(1 + m.volume7d) * 4;
}
