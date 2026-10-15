import { earn, getState, notify, setState, spend, type BondLot } from "./store";
import { nextSunday, sundayIndex } from "./time";
import { hashSeed } from "../games/rng";
import { FACE, allocate, coupon, maturityWeek, sellBackValue, type BondSeries } from "../economy/bonds";

/**
 * The Treasury: the house's books and the dragon bonds it issues. Series sit
 * at fixed season weeks; what you can do with each follows from the clock.
 */

/** The coming game night's season week. Coupons up to the week before have been paid. */
export const thisWeek = () => sundayIndex(nextSunday());

/** Seats filled at a past or expected game night (simulated, stable per week). */
export const seatsIn = (week: number) => 5 + (hashSeed("seats:" + week) % 4);

type Draft = Omit<BondSeries, "status" | "sold"> & { placed: number };

const DRAFTS: Draft[] = [
  {
    id: "final", name: "Season II final", funds: "A 1,000,000 dragon prize for the last Sunday of season II, announced before the season starts.",
    term: 12, base: 0.009, perSeat: 0.001, seatsFrom: 6, size: 100, cap: 10, issueWeek: 1, placed: 64,
  },
  {
    id: "lighthouse", name: "The Lighthouse", funds: "Dragon bounties on the SMP for the spawn lighthouse: sea lanterns, prismarine and gold, paid per stack delivered.",
    term: 6, base: 0.0125, perSeat: 0, seatsFrom: 6, size: 30, cap: 5, issueWeek: 0, placed: 30,
  },
  {
    id: "builders", name: "Builders' grant", funds: "Seed pots for new member-built modules: their first four weeks of prizes, so a new game starts with players.",
    term: 20, base: 0.007, perSeat: 0.0015, seatsFrom: 6, size: 50, cap: 10, issueWeek: 3, placed: 33,
  },
];

export function series(): BondSeries[] {
  const last = thisWeek() - 1;
  return DRAFTS.map(({ placed, ...d }) => {
    const status: BondSeries["status"] =
      last >= d.issueWeek + d.term ? "matured" : last < d.issueWeek ? "subscribing" : placed >= d.size ? "placed" : "open";
    return { ...d, sold: status === "subscribing" ? 0 : placed, status };
  });
}

export const seriesById = (id: string) => series().find((s) => s.id === id)!;

/** Other members' orders for the series taking subscriptions. */
export const OTHER_ORDERS: Record<string, { name: string; qty: number }[]> = {
  builders: [
    { name: "agis", qty: 25 },
    { name: "gorgo", qty: 10 },
    { name: "demaratus", qty: 6 },
    { name: "lysander", qty: 4 },
    { name: "kyniska", qty: 2 },
    { name: "chilon", qty: 1 },
  ],
};

/** Members selling bonds they hold, before maturity. */
export function board(): { id: string; series: string; name: string; qty: number; price: number }[] {
  return [
    { id: "b1", series: "lighthouse", name: "brasidas", qty: 2, price: 10_180 },
    { id: "b2", series: "final", name: "archidamus", qty: 3, price: 9_960 },
    { id: "b3", series: "lighthouse", name: "chilon", qty: 1, price: 10_240 },
    { id: "b4", series: "final", name: "lysander", qty: 1, price: 10_020 },
  ];
}

/** What the house earns in a week, by source. Pays the coupons. */
export const INCOME = [
  { source: "The machine's edge", note: "3.125% of about 2.4M in spins", amount: 75_000 },
  { source: "Private table fees", note: "500 a table, about 34 tables", amount: 17_000 },
  { source: "Trade fee on items and DAEMON", note: "1% of volume", amount: 21_400 },
];
export const weeklyIncome = () => INCOME.reduce((s, i) => s + i.amount, 0);

export const heldIn = (id: string) => getState().bonds.lots.filter((l) => l.series === id).reduce((s, l) => s + l.qty, 0);

/** Coupons due at the coming game night across every bond placed, yours included. */
export function couponsDue(): number {
  const wk = thisWeek();
  return series()
    .filter((s) => s.issueWeek < wk && maturityWeek(s) >= wk)
    .reduce((sum, s) => sum + (s.sold + heldIn(s.id)) * coupon(s, seatsIn(wk)), 0);
}

let lotSeq = 0;
const lot = (s: BondSeries, qty: number, serial: number): BondLot => ({
  id: `${s.id}-${Date.now().toString(36)}-${lotSeq++}`, series: s.id, qty, serial, paidThrough: thisWeek() - 1, at: Date.now(),
});

function roomFor(s: BondSeries) {
  return s.cap - heldIn(s.id) - (getState().bonds.orders[s.id] ?? 0);
}

/** Buy at face from a series still open. */
export function buyNew(id: string, qty: number): string | null {
  const s = seriesById(id);
  const mine = getState().bonds.lots.filter((l) => l.series === id).reduce((n, l) => n + l.qty, 0);
  if (s.status !== "open") return "This series isn't selling.";
  if (qty < 1) return "Pick at least one.";
  if (qty > roomFor(s)) return `Most one member can hold is ${s.cap}.`;
  if (qty > s.size - s.sold - mine) return "Not that many left.";
  if (!spend(qty * FACE, `Bought ${qty} ${s.name} bond${qty > 1 ? "s" : ""}`, "bond")) return "Not enough dragons.";
  const serial = s.sold + mine + 1;
  setState((st) => ({ bonds: { ...st.bonds, lots: [...st.bonds.lots, lot(s, qty, serial)] } }));
  return null;
}

/** Buy from another member on the board. */
export function buyFromBoard(ask: ReturnType<typeof board>[number]): string | null {
  const s = seriesById(ask.series);
  if (ask.qty > roomFor(s)) return `Most one member can hold is ${s.cap}.`;
  if (!spend(ask.qty * ask.price, `Bought ${ask.qty} ${s.name} bond${ask.qty > 1 ? "s" : ""} from ${ask.name}`, "bond")) return "Not enough dragons.";
  const serial = 1 + (hashSeed(ask.id) % Math.max(1, s.sold - ask.qty));
  setState((st) => ({ bonds: { ...st.bonds, lots: [...st.bonds.lots, lot(s, ask.qty, serial)] } }));
  notify(`${ask.name} sold you ${ask.qty} ${s.name} bond${ask.qty > 1 ? "s" : ""}.`, "treasury");
  return null;
}

/** Place an order in a subscription. Dragons are held until game night. */
export function order(id: string, qty: number): string | null {
  const s = seriesById(id);
  const had = getState().bonds.orders[id] ?? 0;
  if (s.status !== "subscribing") return "This series isn't taking orders.";
  if (qty < 1 || qty + had > s.cap - heldIn(id)) return `Orders are capped at ${s.cap} a member.`;
  if (!spend(qty * FACE, `Ordered ${qty} ${s.name} bond${qty > 1 ? "s" : ""} (held until game night)`, "bond")) return "Not enough dragons.";
  setState((st) => ({ bonds: { ...st.bonds, orders: { ...st.bonds.orders, [id]: had + qty } } }));
  return null;
}

export function cancelOrder(id: string) {
  const qty = getState().bonds.orders[id] ?? 0;
  if (!qty) return;
  const { [id]: _, ...rest } = getState().bonds.orders;
  setState((st) => ({ bonds: { ...st.bonds, orders: rest } }));
  earn(qty * FACE, `Cancelled ${qty} ${seriesById(id).name} order${qty > 1 ? "s" : ""}`, "refund");
}

/** What you'd be allotted if the subscription closed now. */
export function previewAllotment(id: string): { mine: number; all: Record<string, number> } {
  const s = seriesById(id);
  const mine = getState().bonds.orders[id] ?? 0;
  const all = allocate([...(OTHER_ORDERS[id] ?? []), ...(mine ? [{ name: getState().name, qty: mine }] : [])], s.size, s.cap);
  return { mine: all[getState().name] ?? 0, all };
}

export function sellBack(lotId: string) {
  const l = getState().bonds.lots.find((x) => x.id === lotId);
  if (!l) return;
  const s = seriesById(l.series);
  const value = sellBackValue(s, thisWeek() - 1) * l.qty;
  setState((st) => ({ bonds: { ...st.bonds, lots: st.bonds.lots.filter((x) => x.id !== lotId) } }));
  earn(value, `Sold ${l.qty} ${s.name} bond${l.qty > 1 ? "s" : ""} back to the Treasury`, "bond");
}

/**
 * Settle everything game nights have made due since your last visit:
 * coupons, faces at maturity, and subscriptions that closed.
 */
export function settleBonds() {
  const st = getState();
  if (!st.signedIn) return;
  const last = thisWeek() - 1;
  let paid = 0;
  const lots: BondLot[] = [];
  for (const l of st.bonds.lots) {
    const s = seriesById(l.series);
    const end = Math.min(last, maturityWeek(s));
    for (let w = l.paidThrough + 1; w <= end; w++) {
      paid += l.qty * coupon(s, seatsIn(w)) + (w === maturityWeek(s) ? l.qty * FACE : 0);
    }
    if (end >= maturityWeek(s)) continue;
    lots.push({ ...l, paidThrough: Math.max(l.paidThrough, end) });
  }
  const orders = { ...st.bonds.orders };
  for (const [id, qty] of Object.entries(st.bonds.orders)) {
    const s = seriesById(id);
    if (last < s.issueWeek) continue;
    const got = previewAllotment(id).mine;
    if (got) lots.push({ ...lot(s, got, 1), paidThrough: s.issueWeek });
    if (qty > got) earn((qty - got) * FACE, `${s.name}: ${qty - got} unfilled, returned`, "refund");
    delete orders[id];
  }
  setState({ bonds: { lots, orders, earned: st.bonds.earned + paid } });
  if (paid > 0) {
    earn(paid, "Bond coupons from game night", "bond");
    notify(`Game night paid your bonds ${paid.toLocaleString("en-US")} dragons.`, "treasury");
  }
}
