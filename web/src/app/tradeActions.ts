import { addCards, getState, notify, record, removeCards, setState, track, type Asset, type Offer } from "./store";
import { dateKey } from "./time";
import { MEMBERS } from "./members";
import { agentPass, bookOf, instrument, INSTRUMENTS, type Agent, type Book } from "../economy/trade";
import { byId, cardValue, mint, SPIRITS } from "../games/spirits/catalog";
import { ITEMS, itemById } from "../games/minecraft/items";
import { defaultRand, hashSeed, seeded } from "../games/rng";

/** How much of each instrument the member holds. */
export function holdings(): Record<string, number> {
  const s = getState();
  const h: Record<string, number> = { daemon: Math.floor(s.daemon) };
  for (const [id, qty] of Object.entries(s.mc.vault)) h[`item:${id}`] = qty;
  for (const c of s.cards) h[`spirit:${c.spirit}`] = (h[`spirit:${c.spirit}`] ?? 0) + 1;
  return h;
}

function give(insId: string, qty: number, why: string) {
  const ins = instrument(insId);
  if (ins.kind === "item") setState((s) => ({ mc: { ...s.mc, vault: { ...s.mc.vault, [ins.key]: (s.mc.vault[ins.key] ?? 0) + qty } } }));
  else if (ins.kind === "daemon") setState((s) => ({ daemon: Math.round((s.daemon + qty) * 100) / 100 }));
  else addCards(Array.from({ length: qty }, () => ({ ...mint(defaultRand, byId(ins.key), why), foil: false })), why, "market");
}

function take(insId: string, qty: number): boolean {
  const ins = instrument(insId);
  const s = getState();
  if ((holdings()[insId] ?? 0) < qty) return false;
  if (ins.kind === "item") setState({ mc: { ...s.mc, vault: { ...s.mc.vault, [ins.key]: s.mc.vault[ins.key] - qty } } });
  else if (ins.kind === "daemon") setState({ daemon: Math.round((s.daemon - qty) * 100) / 100 });
  else {
    const cheapest = s.cards.filter((c) => c.spirit === ins.key && !c.laurel).sort((a, b) => cardValue(a) - cardValue(b)).slice(0, qty);
    if (cheapest.length < qty) return false;
    removeCards(cheapest.map((c) => c.uid));
  }
  return true;
}

/** Buy `qty` at `price` each (taking the ask). */
export function buy(insId: string, qty: number, price: number, by = "you"): boolean {
  const cost = qty * price;
  if (getState().dragons < cost) return false;
  setState((s) => ({ dragons: s.dragons - cost }));
  give(insId, qty, `Bought on the market`);
  record({ text: `${by === "you" ? "Bought" : `${by} bought`} ${qty} × ${instrument(insId).name} at ${price.toLocaleString("en-US")}`, tag: "market", dragons: -cost });
  track("market_trade");
  if (instrument(insId).kind === "item") track("mc_trade");
  return true;
}

/** Sell `qty` at `price` each (hitting the bid). */
export function sell(insId: string, qty: number, price: number, by = "you"): boolean {
  if (!take(insId, qty)) return false;
  const got = qty * price;
  setState((s) => ({ dragons: s.dragons + got }));
  record({ text: `${by === "you" ? "Sold" : `${by} sold`} ${qty} × ${instrument(insId).name} at ${price.toLocaleString("en-US")}`, tag: "market", dragons: got });
  track("market_trade");
  if (instrument(insId).kind === "item") track("mc_trade");
  return true;
}

export function todaysBooks(): Record<string, Book> {
  const day = dateKey();
  return Object.fromEntries(INSTRUMENTS.map((i) => [i.id, bookOf(i.id, day)]));
}

/** Run every active agent once against today's books. */
export function runAgents(): number {
  const s = getState();
  const day = dateKey();
  const done = s.trade.day === day ? { ...s.trade.done } : {};
  const books = todaysBooks();
  let trades = 0;
  const agents = s.trade.agents.map((a) => (a.day === day ? a : { ...a, day, spentToday: 0 }));
  for (const a of agents) {
    if (!a.active) continue;
    for (const f of agentPass(a, books, holdings(), done)) {
      const key = `${f.rule.side}:${f.rule.instrument}`;
      const ok = f.rule.side === "buy" ? buy(f.rule.instrument, f.qty, f.price, a.name) : sell(f.rule.instrument, f.qty, f.price, a.name);
      if (!ok) continue;
      trades++;
      done[key] = (done[key] ?? 0) + f.qty;
      if (f.rule.side === "buy") a.spentToday += f.qty * f.price;
      a.log = [{ at: Date.now(), text: `${f.rule.side === "buy" ? "bought" : "sold"} ${f.qty} × ${instrument(f.rule.instrument).name} at ${f.price.toLocaleString("en-US")}` }, ...a.log].slice(0, 30);
    }
  }
  setState({ trade: { ...getState().trade, agents, done, day } });
  if (trades) notify(`Your agents made ${trades} trade${trades > 1 ? "s" : ""}.`, "trade");
  return trades;
}

export function saveAgent(agent: Agent) {
  setState((s) => ({ trade: { ...s.trade, agents: [agent, ...s.trade.agents.filter((a) => a.id !== agent.id)] } }));
}

export function removeAgent(id: string) {
  setState((s) => ({ trade: { ...s.trade, agents: s.trade.agents.filter((a) => a.id !== id) } }));
}

// ---- Trade offers ---------------------------------------------------------------

export function assetValue(a: Asset): number {
  if (a.kind === "dragons") return a.amount;
  if (a.kind === "daemon") return a.amount * 2000;
  if (a.kind === "item") return itemById(a.id).ref * a.qty;
  return cardValue(a.card);
}

export function assetLabel(a: Asset): string {
  if (a.kind === "dragons") return `${a.amount.toLocaleString("en-US")} dragons`;
  if (a.kind === "daemon") return `${a.amount} DAEMON`;
  if (a.kind === "item") return `${a.qty} × ${itemById(a.id).name}`;
  return `${byId(a.card.spirit).name}${a.card.foil ? " (foil)" : ""}`;
}

function canGive(assets: Asset[]): boolean {
  const s = getState();
  const h = holdings();
  let dragons = 0;
  for (const a of assets) {
    if (a.kind === "dragons") dragons += a.amount;
    else if (a.kind === "daemon" && s.daemon < a.amount) return false;
    else if (a.kind === "item" && (h[`item:${a.id}`] ?? 0) < a.qty) return false;
    else if (a.kind === "card" && !s.cards.some((c) => c.uid === a.card.uid)) return false;
  }
  return s.dragons >= dragons;
}

function transfer(assets: Asset[], direction: 1 | -1, who: string) {
  for (const a of assets) {
    if (a.kind === "dragons") setState((s) => ({ dragons: s.dragons + direction * a.amount }));
    else if (a.kind === "daemon") setState((s) => ({ daemon: Math.round((s.daemon + direction * a.amount) * 100) / 100 }));
    else if (a.kind === "item") setState((s) => ({ mc: { ...s.mc, vault: { ...s.mc.vault, [a.id]: (s.mc.vault[a.id] ?? 0) + direction * a.qty } } }));
    else if (direction > 0) addCards([{ ...a.card, origin: `Trade with ${who}` }], `Received ${byId(a.card.spirit).name} from ${who}`, "market");
    else removeCards([a.card.uid]);
  }
}

/** Accept an incoming offer: you give what they asked for and get what they offered. */
export function acceptOffer(id: string): boolean {
  const offer = getState().trade.offers.find((o) => o.id === id);
  if (!offer || offer.status !== "open" || !canGive(offer.get)) return false;
  transfer(offer.get, -1, offer.with);
  transfer(offer.give, 1, offer.with);
  record({ text: `Trade with ${offer.with}: ${offer.get.map(assetLabel).join(", ")} for ${offer.give.map(assetLabel).join(", ")}`, tag: "market" });
  setOffer(id, "accepted");
  track("market_trade");
  return true;
}

export function declineOffer(id: string) {
  setOffer(id, "declined");
}

function setOffer(id: string, status: Offer["status"], note?: string) {
  setState((s) => ({ trade: { ...s.trade, offers: s.trade.offers.map((o) => (o.id === id ? { ...o, status, note: note ?? o.note } : o)) } }));
}

/** Send an offer. The other side answers after a moment (mockup). */
export function sendOffer(to: string, give: Asset[], get: Asset[]): Offer | null {
  if (!canGive(give)) return null;
  const offer: Offer = { id: `o${Date.now().toString(36)}`, with: to, incoming: false, give, get, status: "open", at: Date.now() };
  setState((s) => ({ trade: { ...s.trade, offers: [offer, ...s.trade.offers] } }));
  setTimeout(() => {
    const mine = give.reduce((sum, a) => sum + assetValue(a), 0);
    const theirs = get.reduce((sum, a) => sum + assetValue(a), 0);
    const yes = mine >= theirs * 0.9 || Math.random() < 0.2;
    const current = getState().trade.offers.find((o) => o.id === offer.id);
    if (!current || current.status !== "open") return;
    if (yes && canGive(give)) {
      transfer(give, -1, to);
      transfer(get, 1, to);
      record({ text: `Trade with ${to}: ${give.map(assetLabel).join(", ")} for ${get.map(assetLabel).join(", ")}`, tag: "market" });
      setOffer(offer.id, "accepted", "Deal.");
      notify(`${to} accepted your trade.`, "trade");
      track("market_trade");
    } else {
      setOffer(offer.id, "declined", "Not worth it to me.");
      notify(`${to} declined your trade.`, "trade");
    }
  }, 3500 + Math.random() * 3000);
  return offer;
}

/** A few incoming offers so the mockup has something to look at. */
export function seedOffers() {
  const s = getState();
  if (s.trade.offers.some((o) => o.incoming)) return;
  const r = seeded(hashSeed("offers:" + dateKey()));
  const items = ITEMS.filter((i) => i.id !== "redstone");
  const people = MEMBERS.slice().sort(() => r() - 0.5).slice(0, 3);
  const offers: Offer[] = people.map((m, i) => {
    const want = items[Math.floor(r() * items.length)];
    const wantQty = Math.max(1, Math.round((3000 + r() * 6000) / want.ref));
    const spirit = SPIRITS.filter((x) => x.rarity === "rare" || x.rarity === "uncommon")[Math.floor(r() * 7)];
    const give: Asset[] = i === 1 ? [{ kind: "card", card: { ...mint(r, spirit, `${m.name}'s collection`), foil: false } }] : [{ kind: "dragons", amount: Math.round((want.ref * wantQty * (1.02 + r() * 0.1)) / 100) * 100 }];
    return { id: `in${i}${dateKey()}`, with: m.name, incoming: true, give, get: [{ kind: "item", id: want.id, qty: wantQty }], status: "open", at: Date.now() - (i + 1) * 1800_000 };
  });
  setState((st) => ({ trade: { ...st.trade, offers: [...offers, ...st.trade.offers] } }));
}
