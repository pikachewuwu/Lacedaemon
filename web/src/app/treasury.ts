import { getState, notify, setState } from "./store";
import { issuing, type Cost, type Issue } from "../economy/bonds";

/**
 * The Treasury: what Lacedaemon costs to run in real money, and the server
 * bonds members hold to pay for it. Mockup figures; no money moves here.
 */

export const COSTS: Cost[] = [
  { id: "mc", item: "Minecraft server", note: "8 GB, always on, daily backups", perMonth: 14 },
  { id: "arbiter", item: "The Arbiter", note: "open-weights model, one run a day, pinned version", perMonth: 6 },
  { id: "site", item: "This site", note: "hosting, database, the bot bridge", perMonth: 5 },
  { id: "domain", item: "Domain", note: "lacedaemon.gg, billed yearly", perMonth: 2.5 },
];

/** Euros in the Treasury today. */
export const BALANCE = 412;

export const ISSUES: Issue[] = [
  {
    id: "lights", name: "Lights on", funds: "The Minecraft server and this site: the bills that keep everything running.",
    term: 3, min: 10, suggested: [10, 25, 50], raised: 385, holders: 7, extra: "",
  },
  {
    id: "arbiter", name: "The Arbiter", funds: "Ten years of the daily run that pays DAEMON module builders, on a pinned open model.",
    term: 10, min: 25, suggested: [25, 50, 100], raised: 300, holders: 4, extra: "Your name in the Arbiter's daily log, the day your bond starts.",
  },
  {
    id: "consol", name: "The Consol", funds: "Lacedaemon's endowment. No term, no end: it pays whatever the server needs most, for as long as there is a server.",
    term: null, min: 50, suggested: [50, 100, 250], raised: 450, holders: 3, extra: "The Founder title, for good.",
  },
];

export const issueById = (id: string) => ISSUES.find((i) => i.id === id)!;

/** The wall: everyone who holds a bond, oldest first. */
export const WALL: { name: string; issue: string; since: string }[] = [
  { name: "gorgo", issue: "consol", since: "Feb 2026" },
  { name: "brasidas", issue: "lights", since: "Feb 2026" },
  { name: "kyniska", issue: "arbiter", since: "Mar 2026" },
  { name: "agis", issue: "lights", since: "Apr 2026" },
  { name: "lysander", issue: "consol", since: "May 2026" },
  { name: "chilon", issue: "lights", since: "Jun 2026" },
  { name: "demaratus", issue: "arbiter", since: "Aug 2026" },
  { name: "archidamus", issue: "lights", since: "Sep 2026" },
];

/** What every bond comes with, and what each yearly coupon brings. */
export const EVERY_BOND = [
  "A numbered certificate in your collection",
  "The Bondholder role on the server, and your name on the wall",
  "The Gilded design for the whole site",
];
export const EACH_COUPON = [
  "A laurel card stamped with the year: yours alone, never traded or staked",
  "One cosmetic of your choice: a card back, a profile banner or a title",
];

export const mine = () => getState().bonds.held;
export const balanceNow = () => BALANCE + mine().reduce((s, b) => s + b.amount, 0);
export const isHolder = () => mine().length > 0;

/**
 * Record a bond. In the real site this follows a payment through a payment
 * provider; the mockup only records it so the page can be explored.
 */
export function holdBond(issueId: string, amount: number): string | null {
  const issue = issueById(issueId);
  if (!issuing(balanceNow(), COSTS)) return "Bonds are paused: the server is funded two years ahead.";
  if (!(amount >= issue.min)) return `This series starts at €${issue.min}.`;
  const serial = issue.holders + mine().filter((b) => b.issue === issueId).length + 1;
  setState((s) => ({ bonds: { held: [...s.bonds.held, { id: `${issueId}-${Date.now().toString(36)}`, issue: issueId, amount, serial, at: Date.now() }] } }));
  notify(`Thank you. ${issue.name} bond No. ${String(serial).padStart(3, "0")} is yours, and so is the Gilded design.`, "treasury");
  return null;
}
