import { useEffect, useMemo, useState } from "react";
import { addCards, earn, getState, record, removeCards, setState, spend, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { dateKey } from "../app/time";
import { fmt } from "../app/format";
import { allBooks, fillChance, MARKET_FEE, roundPrice, sellerNet, type Ask } from "../economy/market";
import { programBySlug, splitEntry } from "../economy/modules";
import { defaultRand } from "../games/rng";
import {
  byId, cardValue, openPack, PACK_PRICE, PACK_SLOTS, RARITY_ORDER, REFERENCE, SPIRITS,
  type CardInstance, type Element, type Rarity,
} from "../games/spirits/catalog";
import { Avatar, Daemon, Dragons, Modal, toast } from "../ui/kit";
import { ELEMENT_LABEL, SpiritCard } from "../ui/SpiritCard";
import { ModuleLine } from "../ui/Entry";

type Tab = "packs" | "collection" | "market";

/** Five face-down cards; each flips on click, rarest last. */
export function PackReveal({ cards }: { cards: CardInstance[] }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const t = setInterval(() => setShown((n) => (n >= 4 ? n : n + 1)), 650);
    const first = setTimeout(() => setShown(1), 250);
    return () => {
      clearInterval(t);
      clearTimeout(first);
    };
  }, [cards]);
  const best = cards[cards.length - 1];
  const bestRarity = byId(best.spirit).rarity;
  return (
    <div className="reveal">
      <div className="reveal-row">
        {cards.map((c, i) => (
          <div key={c.uid} className={`reveal-slot ${i < shown ? "is-open" : ""} ${i === 4 ? `last r-${bestRarity}` : ""}`} onClick={() => setShown((n) => Math.max(n, i + 1))}>
            <SpiritCard card={c} faceDown={i >= shown} size="md" />
          </div>
        ))}
      </div>
      {shown >= 5 && (
        <p className="reveal-line">
          {bestRarity === "exalted" ? "Exalted. One in twenty-five packs." : bestRarity === "mythic" ? "A mythic." : "Rare slot: " + byId(best.spirit).name + "."}
          {cards.some((c) => c.foil) && " And a foil."}
        </p>
      )}
    </div>
  );
}

function Packs() {
  const [opened, setOpened] = useState<CardInstance[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const m = programBySlug("spirits");
  const split = splitEntry(m, PACK_PRICE);
  const buy = () =>
    requireAccount(() => {
      if (!spend(PACK_PRICE, "Bought a Spirits pack", "pack")) return toast("Not enough dragons", "bad");
      setState((s) => ({ daemon: Math.round((s.daemon + split.daemon) * 100) / 100, sundayExtra: s.sundayExtra + split.sunday }));
      const cards = openPack(defaultRand);
      addCards(cards, "Opened a Spirits pack", "pack");
      setOpened(cards);
      setConfirm(false);
    });
  return (
    <div className="packs">
      <div className="pack-stage">
        {opened ? (
          <>
            <PackReveal cards={opened} />
            <div className="pack-again">
              <button className="btn btn-primary btn-lg" onClick={buy}>Open another · <Dragons value={PACK_PRICE} /></button>
              <button className="btn btn-lg" onClick={() => setOpened(null)}>Done</button>
            </div>
          </>
        ) : (
          <button className="pack-closed pack-big" onClick={() => setConfirm(true)}>
            <span className="pack-glyph" aria-hidden="true" />
            <span className="pack-name display">Spirits</span>
            <span className="label">Series I · 5 cards</span>
          </button>
        )}
      </div>
      <aside className="pack-side">
        <section className="panel">
          <div className="panel-head"><h3>What's inside</h3></div>
          <ul className="odds">
            <li><span>3 common</span><span className="faint">slots 1–3</span></li>
            <li><span>1 uncommon</span><span className="faint">slot 4</span></li>
            <li><span>1 rare or better</span><span className="faint">slot 5</span></li>
            {PACK_SLOTS[4].map(([r, p]) => (
              <li key={r} className="odds-sub"><span className={`rar rar-${r}`}>{r}</span><span className="num">{Math.round(p * 100)}%</span></li>
            ))}
            <li><span>Any card can be foil</span><span className="num">6%</span></li>
          </ul>
        </section>
        <section className="panel">
          <div className="panel-head"><h3>Where your dragons go</h3></div>
          <div className="panel-body pack-split">
            <div><span>Sunday's prize pot</span><Dragons value={split.sunday} /></div>
            <div><span>{m.owner}, who runs Spirits</span><Dragons value={split.owner} /></div>
            <div><span>You also receive</span><Daemon value={split.daemon} /></div>
          </div>
        </section>
      </aside>
      <Modal open={confirm} onClose={() => setConfirm(false)} label="Buy a pack">
        <div className="modal-head">
          <span className="label">Spirits · module 04</span>
          <h2 className="display" style={{ fontSize: "var(--t-xl)" }}>Open a pack</h2>
          <p className="muted">Five cards. Forty percent of the price goes to this Sunday's prize.</p>
        </div>
        <div className="modal-foot" style={{ paddingTop: 18 }}>
          <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Not now</button>
          <button className="btn btn-primary" onClick={buy}>Open · <Dragons value={PACK_PRICE} /></button>
        </div>
      </Modal>
    </div>
  );
}

function Collection({ onSell }: { onSell: (c: CardInstance) => void }) {
  const cards = useStore((s) => s.cards);
  const [element, setElement] = useState<Element | "all">("all");
  const [focus, setFocus] = useState<string | null>(null);
  const owned = useMemo(() => {
    const map: Record<string, CardInstance[]> = {};
    for (const c of cards) (map[c.spirit] ??= []).push(c);
    return map;
  }, [cards]);
  const count = Object.keys(owned).length;
  const list = SPIRITS.filter((s) => element === "all" || s.element === element);
  const focused = focus ? owned[focus] ?? [] : [];

  return (
    <div className="collection">
      <div className="collection-bar">
        <div className="progress">
          <span className="num">{count}/24</span>
          <span className="progress-track"><i style={{ width: `${(count / 24) * 100}%` }} /></span>
        </div>
        <div className="seg" role="radiogroup" aria-label="Element">
          {(["all", "water", "fire", "grass", "aether"] as const).map((e) => (
            <button key={e} role="radio" aria-checked={element === e} className={`seg-item ${element === e ? "is-on" : ""}`} onClick={() => setElement(e)}>
              {e === "all" ? "All" : ELEMENT_LABEL[e]}
            </button>
          ))}
        </div>
      </div>
      <div className="binder">
        {list.map((s) => {
          const mine = owned[s.id];
          return (
            <div key={s.id} className={`binder-slot ${mine ? "" : "is-missing"}`}>
              {mine ? (
                <SpiritCard card={mine[0]} size="md" onClick={() => setFocus(s.id)} />
              ) : (
                <div className="binder-ghost"><span className="num">{String(s.no).padStart(2, "0")}</span><span>{s.name}</span><span className={`rar rar-${s.rarity}`}>{s.rarity}</span></div>
              )}
              {mine && mine.length > 1 && <span className="binder-count num">×{mine.length}</span>}
            </div>
          );
        })}
      </div>
      <Modal open={!!focus} onClose={() => setFocus(null)} wide label="Card">
        {focus && (
          <div className="card-detail">
            <SpiritCard card={focused[0]} size="lg" />
            <div className="cd-info">
              <span className="label">{ELEMENT_LABEL[byId(focus).element]} · {byId(focus).rarity}</span>
              <h2 className="display">{byId(focus).name}</h2>
              <p className="muted">{byId(focus).line}</p>
              <p className="faint" style={{ fontSize: "var(--t-sm)" }}>{byId(focus).element === "aether" ? "Aether stands outside the cycle." : `${ELEMENT_LABEL[byId(focus).element]} is ${byId(focus).element === "water" ? "Blue" : byId(focus).element === "fire" ? "Orange" : "Green"} in Blue or Orange.`}</p>
              <ul className="copies">
                {focused.map((c) => (
                  <li key={c.uid}>
                    <span className="num">#{String(c.serial).padStart(4, "0")}</span>
                    {c.foil && <span className="chip chip-accent">foil</span>}
                    <span className="faint">{c.origin}</span>
                    <Dragons value={cardValue(c)} className="faint" />
                    <button className="btn btn-sm" onClick={() => { setFocus(null); onSell(c); }}>Sell</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Market({ sellCard, clearSell }: { sellCard: CardInstance | null; clearSell: () => void }) {
  const day = dateKey();
  const books = useMemo(() => allBooks(day), [day]);
  const [bought, setBought] = useState<Set<string>>(new Set());
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const listings = useStore((s) => s.listings);
  const [price, setPrice] = useState(0);
  useEffect(() => {
    if (sellCard) setPrice(roundPrice(cardValue(sellCard)));
  }, [sellCard]);

  const buy = (ask: Ask) =>
    requireAccount(() => {
      if (!spend(ask.price, `Bought ${byId(ask.card.spirit).name} from ${ask.seller}`, "market")) return toast("Not enough dragons", "bad");
      addCards([{ ...ask.card, origin: `Market, from ${ask.seller}` }], `Received ${byId(ask.card.spirit).name}`, "market");
      setBought((b) => new Set(b).add(ask.id));
      toast(<>Bought {byId(ask.card.spirit).name}</>, "good");
    });

  const list = () => {
    if (!sellCard) return;
    removeCards([sellCard.uid]);
    setState((s) => ({ listings: [{ id: sellCard.uid, card: sellCard, price, at: Date.now() }, ...s.listings] }));
    record({ text: `Listed ${byId(sellCard.spirit).name} for ${fmt(price)}`, tag: "market", cards: [sellCard.spirit] });
    clearSell();
    toast("Listed on the market");
  };
  const cancel = (id: string) => {
    const l = getState().listings.find((x) => x.id === id);
    if (!l) return;
    setState((s) => ({ listings: s.listings.filter((x) => x.id !== id) }));
    addCards([l.card], `Took ${byId(l.card.spirit).name} off the market`, "market");
  };

  const rows = books
    .filter((b) => rarity === "all" || byId(b.spirit).rarity === rarity)
    .sort((a, b) => RARITY_ORDER.indexOf(byId(b.spirit).rarity) - RARITY_ORDER.indexOf(byId(a.spirit).rarity) || byId(a.spirit).no - byId(b.spirit).no);

  return (
    <div className="market">
      {(sellCard || listings.length > 0) && (
        <section className="panel market-sell">
          {sellCard && (
            <div className="sell-form">
              <SpiritCard card={sellCard} size="sm" />
              <div className="sell-fields">
                <span className="label">List for sale</span>
                <h3>{byId(sellCard.spirit).name}{sellCard.foil ? " · foil" : ""}</h3>
                <label className="field">
                  <span className="faint">Asking price</span>
                  <input id="ask-price" className="input num" type="number" min={10} step={10} value={price} onChange={(e) => setPrice(Math.max(10, +e.target.value || 0))} />
                </label>
                <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Reference {fmt(cardValue(sellCard))}. You receive {fmt(sellerNet(price))} after the {MARKET_FEE * 100}% fee.</p>
                <div className="sell-actions">
                  <button className="btn btn-ghost" onClick={clearSell}>Cancel</button>
                  <button className="btn btn-primary" onClick={list}>List</button>
                </div>
              </div>
            </div>
          )}
          {listings.length > 0 && (
            <div className="my-listings">
              <span className="label">Your listings</span>
              {listings.map((l) => (
                <div key={l.id} className="my-listing">
                  <span>{byId(l.card.spirit).name}{l.card.foil ? " (foil)" : ""}</span>
                  <Dragons value={l.price} />
                  <span className="chip">waiting for a buyer</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => cancel(l.id)}>Cancel</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="market-bar">
        <div className="seg" role="radiogroup" aria-label="Rarity">
          {(["all", ...RARITY_ORDER] as const).map((r) => (
            <button key={r} role="radio" aria-checked={rarity === r} className={`seg-item ${rarity === r ? "is-on" : ""}`} onClick={() => setRarity(r)}>{r === "all" ? "All" : r}</button>
          ))}
        </div>
        <span className="faint mono" style={{ fontSize: "var(--t-xs)" }}>{MARKET_FEE * 100}% fee per sale funds the Spirits module</span>
      </div>
      <div className="table-wrap panel">
        <table className="table market-table">
          <thead>
            <tr><th>Spirit</th><th>Rarity</th><th className="r">Last</th><th className="r">24h</th><th className="r">Best bid</th><th className="r">Lowest ask</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const s = byId(b.spirit);
              const ask = b.asks.find((a) => !bought.has(a.id));
              return (
                <tr key={b.spirit}>
                  <td><span className="mk-spirit"><span className={`pip pip-${s.element}`} />{s.name}</span></td>
                  <td><span className={`rar rar-${s.rarity}`}>{s.rarity}</span></td>
                  <td className="r num">{fmt(b.last)}</td>
                  <td className={`r num ${b.change >= 0 ? "pos" : "neg"}`}>{b.change >= 0 ? "+" : ""}{b.change.toFixed(1)}%</td>
                  <td className="r num faint">{b.bids[0] ? fmt(b.bids[0].price) : "·"}</td>
                  <td className="r">{ask ? <span className="who-ask"><Avatar name={ask.seller} /> <span className="num">{fmt(ask.price)}</span></span> : <span className="faint">sold out</span>}</td>
                  <td className="r">{ask && <button className="btn btn-sm" onClick={() => buy(ask)}>Buy</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Your listings sell over time, faster when priced near reference. */
function useListingFills() {
  useEffect(() => {
    const t = setInterval(() => {
      const { listings } = getState();
      for (const l of listings) {
        if (Date.now() - l.at < 4000) continue;
        if (Math.random() < fillChance(l.card, l.price) * 0.35) {
          setState((s) => ({ listings: s.listings.filter((x) => x.id !== l.id) }));
          earn(sellerNet(l.price), `Sold ${byId(l.card.spirit).name}`, "market");
          toast(<>Sold {byId(l.card.spirit).name} for <Dragons value={sellerNet(l.price)} /></>, "good");
        }
      }
    }, 3000);
    return () => clearInterval(t);
  }, []);
}

export function SpiritsPage() {
  const [tab, setTab] = useState<Tab>("packs");
  const [selling, setSelling] = useState<CardInstance | null>(null);
  useListingFills();
  return (
    <div className="spirits-page">
      <header className="page-head">
        <div>
          <p className="label">Series I · 24 spirits</p>
          <h1 className="display page-title">Spirits</h1>
          <p className="muted">Water puts out fire, fire burns grass, grass drinks water: the same cycle as Blue or Orange. Collect them, trade them, stake them at a private table.</p>
        </div>
        <ModuleLine slug="spirits" />
      </header>
      <div className="tabs" role="tablist">
        {(["packs", "collection", "market"] as Tab[]).map((t) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      <div className="tab-body">
        {tab === "packs" && <Packs />}
        {tab === "collection" && <Collection onSell={(c) => { setSelling(c); setTab("market"); }} />}
        {tab === "market" && <Market sellCard={selling} clearSell={() => setSelling(null)} />}
      </div>
      <p className="panel-note faint">Reference prices: {RARITY_ORDER.map((r) => `${r} ${fmt(REFERENCE[r])}`).join(" · ")}. Foil ×3.</p>
    </div>
  );
}
