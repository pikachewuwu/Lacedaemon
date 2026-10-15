import { useEffect, useMemo, useState } from "react";
import { getState, useStore, type Asset } from "../app/store";
import { requireAccount } from "../app/account";
import { MEMBERS } from "../app/members";
import { dateKey } from "../app/time";
import { fmt, ago } from "../app/format";
import {
  acceptOffer, assetLabel, assetValue, buy, declineOffer, holdings, removeAgent, runAgents, saveAgent, seedOffers, sell, sendOffer,
} from "../app/tradeActions";
import { bookOf, describeRule, history, INSTRUMENTS, instrument, parseWords, type Agent, type AgentRule, type Instrument } from "../economy/trade";
import { ITEMS } from "../games/minecraft/items";
import { byId } from "../games/spirits/catalog";
import { Avatar, DaemonSign, Dragons, toast, useNow } from "../ui/kit";
import { ItemSprite } from "../ui/Pixel";
import { SpiritArt, SpiritCard } from "../ui/SpiritCard";

type Tab = "market" | "offers" | "agents";

export function Spark({ data, w = 90, h = 26, up }: { data: number[]; w?: number; h?: number; up?: boolean }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / Math.max(1, max - min)) * (h - 4)).toFixed(1)}`);
  const rising = up ?? data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={`spark ${rising ? "up" : "down"}`} aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" strokeWidth="1.4" />
      <circle cx={w} cy={pts[pts.length - 1].split(",")[1]} r="2" />
    </svg>
  );
}

export function InstrumentIcon({ ins, size = 28 }: { ins: Instrument; size?: number }) {
  if (ins.kind === "item") return <span className="ins-icon ins-item" style={{ width: size, height: size }}><ItemSprite id={ins.key} size={size - 6} /></span>;
  if (ins.kind === "daemon") return <span className="ins-icon ins-daemon" style={{ width: size, height: size }}><DaemonSign size={size - 12} /></span>;
  return <span className="ins-icon ins-spirit" style={{ width: size, height: size }}><SpiritArt spirit={byId(ins.key)} /></span>;
}

// ---- Market -----------------------------------------------------------------------

function Market({ onAgent }: { onAgent: (insId: string) => void }) {
  const day = dateKey();
  const [filter, setFilter] = useState<"all" | "item" | "spirit" | "daemon">("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("item:diamond");
  const [qty, setQty] = useState(1);
  useStore((s) => s.dragons + s.cards.length + Object.values(s.mc.vault).join());
  const held = holdings();
  const list = INSTRUMENTS.filter((i) => (filter === "all" || i.kind === filter) && i.name.toLowerCase().includes(q.toLowerCase()));
  const ins = instrument(sel);
  const book = useMemo(() => bookOf(sel, day), [sel, day]);
  const hist = useMemo(() => history(sel), [sel]);
  const ask = book.asks[0];
  const bid = book.bids[0];
  const maxDepth = Math.max(...book.asks.map((a) => a.qty), ...book.bids.map((b) => b.qty));

  return (
    <div className="market2">
      <section className="panel ins-list">
        <div className="ins-tools">
          <input id="trade-search" className="input" placeholder="Search diamonds, Okeanyx, DAEMON…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="seg">
            {(["all", "item", "spirit", "daemon"] as const).map((f) => (
              <button key={f} className={`seg-item ${filter === f ? "is-on" : ""}`} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "item" ? "Minecraft" : f === "spirit" ? "Spirits" : "DAEMON"}</button>
            ))}
          </div>
        </div>
        <ul>
          {list.map((i) => {
            const b = bookOf(i.id, day);
            return (
              <li key={i.id}>
                <button className={`ins-row ${sel === i.id ? "is-on" : ""}`} onClick={() => { setSel(i.id); setQty(1); }}>
                  <InstrumentIcon ins={i} />
                  <span className="ins-name">{i.name}<span className="faint">{held[i.id] ? ` · you hold ${held[i.id]}` : ""}</span></span>
                  <Spark data={history(i.id, 20)} w={60} h={20} />
                  <span className="num ins-last">{fmt(b.last)}</span>
                  <span className={`num ins-chg ${b.change >= 0 ? "pos" : "neg"}`}>{b.change >= 0 ? "+" : ""}{b.change.toFixed(1)}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel ins-detail">
        <div className="ins-head">
          <InstrumentIcon ins={ins} size={52} />
          <div>
            <span className="label">{ins.kind === "item" ? "Minecraft item · vaulted" : ins.kind === "spirit" ? `Spirit · ${byId(ins.key).rarity}` : "Currency"}</span>
            <h2 className="display">{ins.name}</h2>
          </div>
          <div className="ins-price">
            <Dragons value={book.last} className="ins-big" />
            <span className={`num ${book.change >= 0 ? "pos" : "neg"}`}>{book.change >= 0 ? "+" : ""}{book.change.toFixed(1)}% today</span>
          </div>
        </div>
        <Spark data={hist} w={560} h={90} />
        <div className="quick">
          <div className="qty">
            <button className="btn btn-sm" onClick={() => setQty((x) => Math.max(1, x - 1))} aria-label="Less">−</button>
            <input id="trade-qty" className="input num" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Math.floor(+e.target.value || 1)))} />
            <button className="btn btn-sm" onClick={() => setQty((x) => x + 1)} aria-label="More">+</button>
          </div>
          <button
            className="btn btn-primary btn-lg"
            disabled={!ask}
            onClick={() => requireAccount(() => (buy(sel, qty, ask.price) ? toast(`Bought ${qty} × ${ins.name}`, "good") : toast("Not enough dragons", "bad")))}
          >
            Buy now · <Dragons value={ask ? ask.price * qty : 0} />
          </button>
          <button
            className="btn btn-lg"
            disabled={!bid || (held[sel] ?? 0) < qty}
            onClick={() => requireAccount(() => (sell(sel, qty, bid.price) ? toast(`Sold ${qty} × ${ins.name}`, "good") : toast("You don't hold that many", "bad")))}
          >
            Sell now · <Dragons value={bid ? bid.price * qty : 0} />
          </button>
        </div>
        <p className="faint quick-note">Buy now takes the lowest ask; sell now takes the highest bid. Want a better price? <button className="link" onClick={() => onAgent(sel)}>Let an agent wait for it</button>.</p>
        <div className="depth-book">
          <div>
            <span className="label">Bids · buyers</span>
            {book.bids.map((b, i) => (
              <div key={i} className="lvl bid"><i style={{ width: `${(b.qty / maxDepth) * 100}%` }} /><span className="num">{fmt(b.price)}</span><span className="num">{b.qty}</span><span className="faint">{b.who}</span></div>
            ))}
          </div>
          <div>
            <span className="label">Asks · sellers</span>
            {book.asks.map((a, i) => (
              <div key={i} className="lvl ask"><i style={{ width: `${(a.qty / maxDepth) * 100}%` }} /><span className="num">{fmt(a.price)}</span><span className="num">{a.qty}</span><span className="faint">{a.who}</span></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ---- Offers ------------------------------------------------------------------------

function AssetChips({ assets }: { assets: Asset[] }) {
  return (
    <div className="asset-chips">
      {assets.map((a, i) =>
        a.kind === "card" ? (
          <SpiritCard key={i} card={a.card} size="sm" />
        ) : (
          <span key={i} className="asset-chip">
            {a.kind === "item" && <ItemSprite id={a.id} size={20} />}
            {a.kind === "daemon" && <DaemonSign size={14} />}
            {a.kind === "dragons" ? <Dragons value={a.amount} /> : assetLabel(a)}
          </span>
        ),
      )}
    </div>
  );
}

function Offers() {
  const offers = useStore((s) => s.trade.offers);
  const cards = useStore((s) => s.cards);
  const now = useNow(30000);
  const [to, setTo] = useState("brasidas");
  const [give, setGive] = useState<Asset[]>([]);
  const [get, setGet] = useState<Asset[]>([{ kind: "item", id: "netherite", qty: 1 }]);
  const [giveDragons, setGiveDragons] = useState(8000);
  const [giveItem, setGiveItem] = useState("diamond");
  const [giveQty, setGiveQty] = useState(10);
  const [getItem, setGetItem] = useState("netherite");
  const [getQty, setGetQty] = useState(1);
  useEffect(() => seedOffers(), []);

  const value = (a: Asset[]) => a.reduce((s, x) => s + assetValue(x), 0);
  const allGive: Asset[] = [...(giveDragons > 0 ? [{ kind: "dragons", amount: giveDragons } as Asset] : []), ...give];

  return (
    <div className="offers">
      <section className="offer-list">
        {offers.length === 0 && <p className="faint">No offers yet.</p>}
        {offers.map((o) => {
          const yours = o.incoming ? value(o.get) : value(o.give);
          const theirs = o.incoming ? value(o.give) : value(o.get);
          const edge = Math.round(((theirs - yours) / Math.max(1, yours)) * 100);
          return (
            <article key={o.id} className={`offer panel is-${o.status}`}>
              <header>
                <Avatar name={o.with} />
                <span>{o.incoming ? <><b>{o.with}</b> wants to trade</> : <>You offered <b>{o.with}</b></>}</span>
                <span className="faint mono">{ago(o.at, now)}</span>
                <span className={`chip ${o.status === "accepted" ? "chip-live" : ""}`}>{o.status}</span>
              </header>
              <div className="offer-sides">
                <div><span className="label">You give</span><AssetChips assets={o.incoming ? o.get : o.give} /></div>
                <span className="offer-arrow" aria-hidden="true">⇄</span>
                <div><span className="label">You get</span><AssetChips assets={o.incoming ? o.give : o.get} /></div>
              </div>
              <footer>
                <span className={`num ${edge >= 0 ? "pos" : "neg"}`}>{edge >= 0 ? "+" : ""}{edge}% for you at reference prices</span>
                {o.note && <span className="faint">“{o.note}”</span>}
                {o.incoming && o.status === "open" && (
                  <span className="offer-actions">
                    <button className="btn btn-sm" onClick={() => declineOffer(o.id)}>Decline</button>
                    <button className="btn btn-sm btn-primary" onClick={() => requireAccount(() => (acceptOffer(o.id) ? toast("Trade done", "good") : toast("You don't have what they asked for", "bad")))}>Accept</button>
                  </span>
                )}
              </footer>
            </article>
          );
        })}
      </section>

      <section className="panel offer-new">
        <div className="panel-head"><h3>New offer</h3></div>
        <div className="panel-body">
          <label className="field" htmlFor="offer-to"><span className="faint">With</span>
            <select id="offer-to" className="select" value={to} onChange={(e) => setTo(e.target.value)}>
              {MEMBERS.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </label>
          <span className="label">You give</span>
          <div className="offer-row">
            <input id="offer-dragons" className="input num" type="number" min={0} step={500} value={giveDragons} onChange={(e) => setGiveDragons(Math.max(0, +e.target.value || 0))} aria-label="Dragons to give" />
            <span className="faint">dragons</span>
          </div>
          <div className="offer-row">
            <input id="offer-give-qty" className="input num" type="number" min={1} value={giveQty} onChange={(e) => setGiveQty(Math.max(1, +e.target.value || 1))} aria-label="Quantity" />
            <select id="offer-give-item" className="select" value={giveItem} onChange={(e) => setGiveItem(e.target.value)}>
              {ITEMS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <button className="btn btn-sm" onClick={() => setGive((g) => [...g, { kind: "item", id: giveItem, qty: giveQty }])}>Add</button>
          </div>
          {cards.length > 0 && (
            <div className="offer-cards">
              {cards.slice(0, 8).map((c) => (
                <SpiritCard key={c.uid} card={c} size="sm" selected={give.some((g) => g.kind === "card" && g.card.uid === c.uid)}
                  onClick={() => setGive((g) => (g.some((x) => x.kind === "card" && x.card.uid === c.uid) ? g.filter((x) => !(x.kind === "card" && x.card.uid === c.uid)) : [...g, { kind: "card", card: c }]))} />
              ))}
            </div>
          )}
          {give.length > 0 && <AssetChips assets={give} />}
          <span className="label">You ask for</span>
          <div className="offer-row">
            <input id="offer-get-qty" className="input num" type="number" min={1} value={getQty} onChange={(e) => setGetQty(Math.max(1, +e.target.value || 1))} aria-label="Quantity wanted" />
            <select id="offer-get-item" className="select" value={getItem} onChange={(e) => setGetItem(e.target.value)}>
              {ITEMS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <button className="btn btn-sm" onClick={() => setGet([{ kind: "item", id: getItem, qty: getQty }])}>Set</button>
          </div>
          <AssetChips assets={get} />
          <p className="faint mono" style={{ fontSize: 11 }}>you give ≈ {fmt(value(allGive))} · you get ≈ {fmt(value(get))}</p>
          <button
            className="btn btn-primary"
            onClick={() => requireAccount(() => {
              const o = sendOffer(to, allGive, get);
              if (!o) return toast("You don't have everything you're offering", "bad");
              toast(`Offer sent to ${to}`);
              setGive([]);
            })}
          >
            Send offer
          </button>
        </div>
      </section>
    </div>
  );
}

// ---- Agents -----------------------------------------------------------------------

function Agents({ preset }: { preset: string | null }) {
  const agents = useStore((s) => s.trade.agents);
  const now = useNow(10000);
  const [mode, setMode] = useState<"words" | "rules" | "api">("words");
  const [name, setName] = useState("Diamond hands");
  const [words, setWords] = useState("buy diamonds under 450, sell netherite above 9,000, spend at most 30,000 a day");
  const [rule, setRule] = useState<AgentRule>({ side: "buy", instrument: preset ?? "item:diamond", limit: 440, maxPerDay: 5 });
  const [rules, setRules] = useState<AgentRule[]>([]);
  const [budget, setBudget] = useState(30000);
  const parsed = useMemo(() => parseWords(words), [words]);
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    if (preset) { setMode("rules"); setRule((r) => ({ ...r, instrument: preset, limit: Math.round(instrument(preset).ref * 0.95) })); }
  }, [preset]);

  // Agents keep working while you're here.
  useEffect(() => {
    const t = setInterval(() => getState().trade.agents.some((a) => a.active) && runAgents(), 15000);
    return () => clearInterval(t);
  }, []);

  const create = () =>
    requireAccount(() => {
      const r = mode === "words" ? parsed.rules : rules;
      if (!r.length) return toast("Give the agent at least one rule", "bad");
      const agent: Agent = { id: `ag${Date.now().toString(36)}`, name, rules: r, budget: mode === "words" ? parsed.budget ?? budget : budget, spentToday: 0, day: dateKey(), active: true, source: mode === "words" ? "words" : "rules", log: [] };
      saveAgent(agent);
      toast(`${name} is trading`);
      setRules([]);
    });

  return (
    <div className="agents">
      <section className="panel agent-new">
        <div className="panel-head">
          <h3>New agent</h3>
          <div className="seg">
            {(["words", "rules", "api"] as const).map((m) => (
              <button key={m} className={`seg-item ${mode === m ? "is-on" : ""}`} onClick={() => setMode(m)}>{m === "words" ? "Plain words" : m === "rules" ? "Rules" : "Your own agent"}</button>
            ))}
          </div>
        </div>
        <div className="panel-body">
          {mode !== "api" && (
            <label className="field" htmlFor="agent-name"><span className="faint">Name</span>
              <input id="agent-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          {mode === "words" && (
            <>
              <label className="field" htmlFor="agent-words"><span className="faint">Tell it what to do</span>
                <textarea id="agent-words" className="input textarea" rows={3} value={words} onChange={(e) => setWords(e.target.value)} />
              </label>
              <div className="parsed">
                <span className="label">It understood</span>
                {parsed.rules.map((r, i) => <p key={i} className="parsed-rule">→ {describeRule(r)}</p>)}
                {parsed.budget && <p className="parsed-rule">→ Spend at most {fmt(parsed.budget)} dragons a day</p>}
                {parsed.unknown.map((u, i) => <p key={i} className="parsed-bad">? “{u}” — try “buy … under …” or “sell … above …”</p>)}
              </div>
            </>
          )}
          {mode === "rules" && (
            <>
              <div className="rule-row">
                <select id="rule-side" className="select" value={rule.side} onChange={(e) => setRule({ ...rule, side: e.target.value as AgentRule["side"] })}>
                  <option value="buy">Buy</option><option value="sell">Sell</option>
                </select>
                <select id="rule-ins" className="select" value={rule.instrument} onChange={(e) => setRule({ ...rule, instrument: e.target.value })}>
                  {INSTRUMENTS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input id="rule-limit" className="input num" type="number" value={rule.limit} onChange={(e) => setRule({ ...rule, limit: +e.target.value || 0 })} aria-label="Limit price" />
                <input id="rule-max" className="input num" type="number" value={rule.maxPerDay} onChange={(e) => setRule({ ...rule, maxPerDay: Math.max(1, +e.target.value || 1) })} aria-label="Max per day" />
                <button className="btn btn-sm" onClick={() => setRules((r) => [...r, rule])}>Add rule</button>
              </div>
              <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Side · item · limit price · max per day. Reference for {instrument(rule.instrument).name}: {fmt(instrument(rule.instrument).ref)}.</p>
              {rules.map((r, i) => <p key={i} className="parsed-rule">→ {describeRule(r)}</p>)}
              <label className="field" htmlFor="agent-budget"><span className="faint">Daily budget (dragons)</span>
                <input id="agent-budget" className="input num" type="number" value={budget} onChange={(e) => setBudget(Math.max(0, +e.target.value || 0))} />
              </label>
            </>
          )}
          {mode === "api" && (
            <div className="api">
              <p className="muted">Run your own agent (a script, a bot, an AI model) against the same market. It gets a key that can only trade, only for you, and only up to a daily cap. Revoke it any time.</p>
              <div className="api-scopes mono">
                <span>✓ market:read</span><span>✓ orders:write</span><span>✗ transfers</span><span>✗ withdrawals</span><span>cap 50,000 / day</span>
              </div>
              {key ? (
                <pre className="api-key mono">{`LACEDAEMON_KEY=${key}

curl -H "Authorization: Bearer $LACEDAEMON_KEY" \\
  https://lacedaemon.gg/api/market/item:diamond/book

curl -X POST -H "Authorization: Bearer $LACEDAEMON_KEY" \\
  -d '{"side":"buy","instrument":"item:diamond","qty":4,"limit":440}' \\
  https://lacedaemon.gg/api/orders`}</pre>
              ) : (
                <button className="btn btn-primary" onClick={() => requireAccount(() => setKey(`ldm_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`))}>Create a trading key</button>
              )}
              <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Mockup: the key and endpoints are examples.</p>
            </div>
          )}
          {mode !== "api" && <button className="btn btn-primary" onClick={create}>Start agent</button>}
        </div>
      </section>

      <section className="agent-list">
        <div className="section-title">
          <h2>Your agents</h2>
          <button className="btn btn-sm" onClick={() => requireAccount(() => { const n = runAgents(); toast(n ? `${n} trade${n > 1 ? "s" : ""} made` : "Nothing at those prices yet"); })}>Run now</button>
        </div>
        {agents.length === 0 && <p className="faint">No agents yet. They check the books every few seconds while the site is open; on the real site they run around the clock.</p>}
        {agents.map((a) => (
          <article key={a.id} className={`panel agent ${a.active ? "" : "is-paused"}`}>
            <header>
              <span className="agent-dot" />
              <b>{a.name}</b>
              <span className="chip">{a.source === "words" ? "plain words" : "rules"}</span>
              <span className="faint num">{fmt(a.spentToday)} / {fmt(a.budget)} today</span>
              <span className="agent-actions">
                <button className="btn btn-sm" onClick={() => saveAgent({ ...a, active: !a.active })}>{a.active ? "Pause" : "Resume"}</button>
                <button className="btn btn-sm btn-ghost" onClick={() => removeAgent(a.id)}>Remove</button>
              </span>
            </header>
            <ul className="agent-rules">{a.rules.map((r, i) => <li key={i}>{describeRule(r)}</li>)}</ul>
            <ol className="agent-log mono">
              {a.log.length === 0 && <li className="faint">waiting for a price</li>}
              {a.log.slice(0, 6).map((l, i) => <li key={i}><span className="faint">{ago(l.at, now)}</span> {l.text}</li>)}
            </ol>
          </article>
        ))}
      </section>
    </div>
  );
}

export function TradePage() {
  const [tab, setTab] = useState<Tab>("market");
  const [preset, setPreset] = useState<string | null>(null);
  const open = useStore((s) => s.trade.offers.filter((o) => o.incoming && o.status === "open").length);
  return (
    <div className="trade-page">
      <header className="page-head">
        <div>
          <p className="label">Spirits · Minecraft items · DAEMON</p>
          <h1 className="display page-title">Trade</h1>
          <p className="muted">One market for everything you hold. Buy or sell in one click, swap directly with another member, or let an agent wait for your price.</p>
        </div>
      </header>
      <div className="tabs" role="tablist">
        {(["market", "offers", "agents"] as Tab[]).map((t) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === "market" ? "Market" : t === "offers" ? <>Offers{open ? <span className="tab-count">{open}</span> : null}</> : "Agents"}
          </button>
        ))}
      </div>
      <div className="tab-body">
        {tab === "market" && <Market onAgent={(id) => { setPreset(id); setTab("agents"); }} />}
        {tab === "offers" && <Offers />}
        {tab === "agents" && <Agents preset={preset} />}
      </div>
    </div>
  );
}
