import { useEffect, useMemo, useRef, useState } from "react";
import { go } from "../app/router";
import { addCards, setState, spend, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { fmt } from "../app/format";
import { programBySlug, splitEntry } from "../economy/modules";
import { defaultRand, hashSeed, seeded } from "../games/rng";
import {
  byId, cardValue, openPack, PACK_PRICE, PACK_SLOTS, RARITY_ORDER, REFERENCE, SPIRITS,
  type CardInstance, type Element,
} from "../games/spirits/catalog";
import { Daemon, Dragons, Modal, toast } from "../ui/kit";
import { ELEMENT_LABEL, SpiritCard } from "../ui/SpiritCard";
import { ModuleLine } from "../ui/Entry";

type Tab = "packs" | "collection";

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

/**
 * The reel: the rare slot spins past like a case opening and lands under the
 * marker. Teasers are drawn at the pack's real odds, with the occasional
 * mythic or exalted parked right next to where it stops.
 */
const REEL_LEN = 52;
const LAND = 44;
const STEP = 108; // card width 96 + gap 12
const REEL_MS = 5400;

function CaseReel({ best, onDone }: { best: CardInstance; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  const box = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    const r = seeded(hashSeed(best.uid));
    const odds = PACK_SLOTS[4];
    const pick = () => {
      let x = r();
      for (const [rar, p] of odds) if ((x -= p) < 0) return rar;
      return odds[0][0];
    };
    const of = (rar: string) => {
      const pool = SPIRITS.filter((sp) => sp.rarity === rar);
      return pool[Math.floor(r() * pool.length)].id;
    };
    const list = Array.from({ length: REEL_LEN }, () => of(pick()));
    list[LAND] = best.spirit;
    if (r() < 0.5) list[LAND + (r() < 0.5 ? 1 : -1)] = of(r() < 0.3 ? "exalted" : "mythic");
    return list;
  }, [best]);

  useEffect(() => {
    const el = strip.current!;
    const w = box.current!.clientWidth;
    const jitter = (seeded(hashSeed(best.uid + "j"))() - 0.5) * 70;
    el.style.transition = "none";
    el.style.transform = "translateX(0)";
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = `transform ${REEL_MS}ms cubic-bezier(.1,.7,.12,1)`;
        el.style.transform = `translateX(${-(LAND * STEP + 48 - w / 2 + jitter)}px)`;
      }),
    );
    const t = setTimeout(() => done.current(), REEL_MS + 500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [best]);

  return (
    <div className="case">
      <div className="case-window" ref={box}>
        <div className="case-strip" ref={strip}>
          {items.map((id, i) => (
            <div key={i} className={`case-item r-${byId(id).rarity}`}>
              <SpiritCard spiritId={id} size="sm" />
            </div>
          ))}
        </div>
        <i className="case-marker" aria-hidden="true" />
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => done.current()}>Skip</button>
    </div>
  );
}

let reelOn = true;

function Packs() {
  const [opened, setOpened] = useState<CardInstance[] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState(reelOn);
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
      setSpinning(reel);
      setConfirm(false);
    });
  return (
    <div className="packs">
      <div className="pack-stage">
        {opened && spinning ? (
          <CaseReel best={opened[4]} onDone={() => setSpinning(false)} />
        ) : opened ? (
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
        <label className="reel-toggle faint">
          <input type="checkbox" checked={reel} onChange={(e) => { reelOn = e.target.checked; setReel(e.target.checked); }} /> Spin the rare slot on the reel
        </label>
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
          <span className="label">Spirits · module 02</span>
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

export function SpiritsPage() {
  const [tab, setTab] = useState<Tab>("packs");
  return (
    <div className="spirits-page">
      <header className="page-head">
        <div>
          <p className="label">Series I · 24 spirits</p>
          <h1 className="display page-title">Spirits</h1>
          <p className="muted">Water puts out fire, fire burns grass, grass drinks water: the same cycle as Blue or Orange. Collect them, duel with them in the arena, trade them, stake them at a private table.</p>
        </div>
        <ModuleLine slug="spirits" />
      </header>
      <div className="tabs" role="tablist">
        {(["packs", "collection"] as Tab[]).map((t) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
        <button className="tab" onClick={() => go("arena")}>Arena →</button>
        <button className="tab" onClick={() => go("trade")}>Trade →</button>
      </div>
      <div className="tab-body">
        {tab === "packs" && <Packs />}
        {tab === "collection" && <Collection onSell={() => go("trade")} />}
      </div>
      <p className="panel-note faint">Reference prices: {RARITY_ORDER.map((r) => `${r} ${fmt(REFERENCE[r])}`).join(" · ")}. Foil ×3.</p>
    </div>
  );
}
