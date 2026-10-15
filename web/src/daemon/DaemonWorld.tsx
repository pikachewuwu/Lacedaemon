import { useEffect, useMemo, useRef, useState } from "react";
import { go } from "../app/router";
import { useStore } from "../app/store";
import { fmt, fmtD, compact } from "../app/format";
import { countdown, pad } from "../app/time";
import { CAP, START_DAILY, capYear, epochNumber, mintedBy, schedule } from "../economy/emission";
import { MODULES, activity, conviction, splitEntry, type ModuleProgram } from "../economy/modules";
import { fallbackWeights, MAX_SHARE, MIN_SHARE } from "../economy/arbiter";
import { useNow } from "../ui/kit";
import { startField } from "./field";

/** The world is read top to bottom: what surfaces first, the machinery under it, the ledger at the floor. */
const SECTIONS = [
  ["modules", "Modules", "the visible layer"],
  ["flow", "Flow", "how value moves"],
  ["build", "Build", "for developers"],
  ["arbiter", "Arbiter", "module 0"],
  ["supply", "Supply", "the cap"],
  ["governance", "Governance", "the rules"],
  ["ledger", "Ledger", "the floor"],
] as const;

function DepthGauge() {
  const [state, setState] = useState({ active: 0, metres: 0 });
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const metres = Math.round((scrollY / Math.max(1, max)) * 777);
      let active = -1;
      SECTIONS.forEach(([id], i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < innerHeight * 0.5) active = i;
      });
      setState((s) => (s.active === active && s.metres === metres ? s : { active, metres }));
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className="depth" aria-label="Depth">
      <span className="depth-m">−{String(state.metres).padStart(3, "0")} m</span>
      <ol>
        <li className={state.active < 0 ? "is-on" : ""}><button onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><i />surface</button></li>
        {SECTIONS.map(([id, label], i) => (
          <li key={id} className={i === state.active ? "is-on" : i < state.active ? "is-past" : ""}>
            <button onClick={() => scrollToId(id)}><i />{label.toLowerCase()}</button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const HEX = "0123456789abcdef";
const hash = () => "0x" + Array.from({ length: 8 }, () => HEX[Math.floor(Math.random() * 16)]).join("");
const pickName = () => ["lysander", "gorgo", "brasidas", "kyniska", "agis", "chilon", "demaratus", "archidamus"][Math.floor(Math.random() * 8)];

function ledgerLine(): string {
  const r = Math.random();
  const m = MODULES[Math.floor(Math.random() * MODULES.length)];
  if (r < 0.34) {
    const d = [500, 1000, 2000, 2500, 5000][Math.floor(Math.random() * 5)];
    return `${hash()}  entry     ${m.slug.padEnd(15)} ${pickName().padEnd(11)} ${fmt(d).padStart(6)} dr → ${fmtD(d / m.price)} DAEMON`;
  }
  if (r < 0.5) return `${hash()}  hidden    ░░░░░░░░ → ░░░░░░░░       ${fmtD(Math.random() * 40)} DAEMON`;
  if (r < 0.64) return `${hash()}  send      ${pickName()} → ${pickName()}`.padEnd(64) + `${fmtD(Math.random() * 20)} DAEMON`;
  if (r < 0.76) return `${hash()}  market    ${fmtD(1 + Math.random() * 6)} DAEMON @ ${fmt(1900 + Math.random() * 300)} dr   ${pickName()} ⇄ ${pickName()}`;
  if (r < 0.86) return `${hash()}  lock      ${m.slug.padEnd(15)} +${fmt(100 * Math.ceil(Math.random() * 20))} DAEMON · ${[30, 90, 180, 365][Math.floor(Math.random() * 4)]}d`;
  if (r < 0.94) return `${hash()}  vote      P-0${8 + Math.floor(Math.random() * 2)} ${Math.random() < 0.6 ? "yes" : "no "} ${fmt(Math.random() * 3000)} DAEMON`;
  return `${hash()}  receipt   ${m.slug.padEnd(15)} → ${pickName().padEnd(11)} ${fmtD(Math.random() * 4)} DAEMON from stock`;
}

function LedgerTail() {
  const mine = useStore((s) => s.ledger).filter((l) => l.daemon);
  const [lines, setLines] = useState<string[]>(() => [
    ...Array.from({ length: 14 }, ledgerLine),
    ...mine.slice(0, 4).reverse().map((l) => `${hash()}  ${l.daemon! > 0 ? "receipt" : "escrow "}   you                         ${l.daemon! > 0 ? "+" : "−"}${fmtD(Math.abs(l.daemon!))} DAEMON · ${l.text.toLowerCase()}`),
  ]);
  const box = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const t = setInterval(() => setLines((l) => [...l.slice(-60), ledgerLine()]), 900);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);
  return (
    <figure className="console tail">
      <figcaption>
        <span className="c-dots"><i /><i /><i /></span>
        <span>ledger · tail -f · every transfer, entry and lock</span>
      </figcaption>
      <pre ref={box}>
        {lines.map((l, i) => <span key={i} className={l.includes(" you ") ? "c-cmd" : i === lines.length - 1 ? "c-row" : "c-dim"}>{l + "\n"}</span>)}
      </pre>
    </figure>
  );
}

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

// ---- Flow diagram ---------------------------------------------------------------

function Flow() {
  // Paths always run left to right (or top to bottom) so labels read correctly;
  // `reverse` sends the particles the other way.
  const NODES: { id: string; x: number; y: number; t: string; s: string }[] = [
    { id: "arbiter", x: 380, y: 46, t: "ARBITER", s: "module 0 · new DAEMON" },
    { id: "player", x: 90, y: 190, t: "PLAYER", s: "plays for dragons" },
    { id: "module", x: 380, y: 190, t: "MODULE", s: "owner · locked stock" },
    { id: "pot", x: 670, y: 112, t: "POT", s: "paid to the winner" },
    { id: "sunday", x: 670, y: 268, t: "SUNDAY", s: "another module's pot" },
    { id: "backers", x: 380, y: 334, t: "BACKERS", s: "locked alongside" },
  ];
  const EDGES: { d: string; label: string; daemon?: boolean; reverse?: boolean; dash?: boolean; side?: [number, number]; dur: number }[] = [
    { d: "M152 182 Q 235 140 318 182", label: "dragons · entry", dur: 2.8 },
    { d: "M152 198 Q 235 240 318 198", label: "DAEMON from the owner's stock", daemon: true, reverse: true, dur: 3.6 },
    { d: "M442 180 Q 540 130 608 116", label: "routed share", dur: 2.6 },
    { d: "M442 200 Q 540 250 608 264", label: "routed share", dash: true, dur: 3.2 },
    { d: "M380 66 L 380 170", label: "emission", daemon: true, side: [390, 122], dur: 2.2 },
    { d: "M380 210 L 380 314", label: "their share", daemon: true, side: [390, 266], dur: 2.6 },
  ];
  return (
    <div className="flow-wrap">
      <svg viewBox="0 0 760 380" className="flow" role="img" aria-label="Players pay dragons into a module and receive DAEMON from its owner. The owner routes dragons to pots. The Arbiter pays new DAEMON to the module, which shares it with backers.">
        {EDGES.map((e, i) => (
          <g key={i}>
            <path id={`edge-${i}`} d={e.d} className={`edge ${e.dash ? "dash" : ""}`} />
            {[0, 1, 2].map((k) => (
              <circle key={k} r={e.daemon ? 2.2 : 1.9} className={e.daemon ? "pt pt-d" : "pt"}>
                <animateMotion dur={`${e.dur}s`} repeatCount="indefinite" begin={`${(k * e.dur) / 3}s`} keyPoints={e.reverse ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear">
                  <mpath href={`#edge-${i}`} />
                </animateMotion>
              </circle>
            ))}
            {e.side ? (
              <text x={e.side[0]} y={e.side[1]} className="edge-label">{e.label}</text>
            ) : (
              <text className="edge-label" dy={e.reverse ? 14 : -6}>
                <textPath href={`#edge-${i}`} startOffset="50%" textAnchor="middle">{e.label}</textPath>
              </text>
            )}
          </g>
        ))}
        {NODES.map((n) => (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="node">
            <rect x="-62" y="-20" width="124" height="40" />
            <text y="-3" textAnchor="middle" className="node-t">{n.t}</text>
            <text y="11" textAnchor="middle" className="node-s">{n.s}</text>
          </g>
        ))}
      </svg>
      <div className="flow-legend mono">
        <span><i className="lg-dragon" /> dragons</span>
        <span><i className="lg-daemon" /> DAEMON</span>
      </div>
    </div>
  );
}

// ---- Registry -------------------------------------------------------------------

function Registry() {
  const rows = useMemo(() => fallbackWeights(MODULES, START_DAILY), []);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="registry-wrap">
      <table className="registry">
        <thead>
          <tr><th>ID</th><th>Module</th><th>Owner</th><th>Routes</th><th className="r">Price</th><th className="r">Locked</th><th className="r">Players 7d</th><th className="r">Weight</th></tr>
        </thead>
        <tbody>
          <tr className="core">
            <td>00</td><td><b>Arbiter</b><span>Splits the emission</span></td><td>protocol</td><td>·</td><td className="r">·</td><td className="r">·</td><td className="r">·</td><td className="r">·</td>
          </tr>
          {MODULES.map((m, i) => {
            const pot = (m.routes.pot ?? 0) * 100, sun = (m.routes.sunday ?? 0) * 100, own = 100 - pot - sun;
            return [
              <tr key={m.id} className={`row ${open === m.id ? "is-open" : ""}`} onClick={() => setOpen(open === m.id ? null : m.id)}>
                <td>{m.id}</td>
                <td><b>{m.name}</b><span>{m.slug}</span></td>
                <td>{m.owner}</td>
                <td>
                  <span className="routes" title={`pot ${pot}% · sunday ${sun}% · owner ${own}%`}>
                    <i className="r-pot" style={{ width: `${pot}%` }} />
                    <i className="r-sun" style={{ width: `${sun}%` }} />
                    <i className="r-own" style={{ width: `${own}%` }} />
                  </span>
                </td>
                <td className="r">{fmt(m.price)}</td>
                <td className="r">{fmt(m.locked)}</td>
                <td className="r">{m.players7d}</td>
                <td className="r share"><i style={{ width: `${rows[i].weight * 120}px` }} />{(rows[i].weight * 100).toFixed(1)}%</td>
              </tr>,
              open === m.id && (
                <tr key={m.id + "-d"} className="detail">
                  <td />
                  <td colSpan={7}>
                    <p>{m.summary}</p>
                    <dl>
                      <div><dt>Entry of 10,000 buys</dt><dd>{fmtD(splitEntry(m, 10000).daemon)} DAEMON</dd></div>
                      <div><dt>Routes</dt><dd>pot {pot}% · sunday {sun}% · owner {own}%</dd></div>
                      <div><dt>Lock</dt><dd>{fmt(m.locked)} for {m.lockDays} days · {m.backers} backers</dd></div>
                      <div><dt>Activity / conviction</dt><dd>{activity(m).toFixed(1)} / {compact(conviction(m))}</dd></div>
                      <div><dt>Today's emission</dt><dd>{fmtD(rows[i].daemon)} DAEMON</dd></div>
                    </dl>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
      <p className="note">Example figures. Click a module for its program.</p>
    </div>
  );
}

// ---- Builder -------------------------------------------------------------------

function Builder() {
  const [name, setName] = useState("Liar's Dice");
  const [price, setPrice] = useState(2000);
  const [pot, setPot] = useState(85);
  const [sunday, setSunday] = useState(5);
  const [locked, setLocked] = useState(5000);
  const [days, setDays] = useState(90);
  const [players, setPlayers] = useState(5);
  const fee = 5000;
  const draft: ModuleProgram = {
    kind: "module", id: "04", slug: "draft", name, owner: "you", price,
    routes: { pot: pot / 100, sunday: sunday / 100 }, locked, lockDays: days, backers: 1,
    players7d: players, entries7d: players * 3, volume7d: players * 3 * fee, summary: "",
  };
  const split = splitEntry(draft, fee);
  const weights = fallbackWeights([...MODULES, draft], START_DAILY);
  const mine = weights[weights.length - 1];
  const entriesPerDay = (players * 3) / 7;
  const daemonOutPerDay = entriesPerDay * split.daemon;
  const runway = daemonOutPerDay > 0 ? locked / daemonOutPerDay : Infinity;
  const net = mine.daemon - daemonOutPerDay;
  const owner = 100 - pot - sunday;

  return (
    <div className="builder">
      <form className="b-form" onSubmit={(e) => e.preventDefault()}>
        <label className="b-field"><span>Module name</span><input id="b-name" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="b-field"><span>DAEMON price <em>dragons per DAEMON your entries pay</em></span><input id="b-price" type="range" min={500} max={6000} step={100} value={price} onChange={(e) => setPrice(+e.target.value)} /><b>{fmt(price)}</b></label>
        <label className="b-field"><span>Back to the table <em>share of each entry into the game's pot</em></span><input id="b-pot" type="range" min={0} max={100 - sunday} value={pot} onChange={(e) => setPot(+e.target.value)} /><b>{pot}%</b></label>
        <label className="b-field"><span>To Sunday <em>share routed into game night's pot</em></span><input id="b-sunday" type="range" min={0} max={100 - pot} value={sunday} onChange={(e) => setSunday(+e.target.value)} /><b>{sunday}%</b></label>
        <label className="b-field"><span>Lock <em>DAEMON behind the module, and for how long</em></span><input id="b-locked" type="range" min={1000} max={40000} step={500} value={locked} onChange={(e) => setLocked(+e.target.value)} /><b>{fmt(locked)}</b></label>
        <label className="b-field"><span>Lock length</span><input id="b-days" type="range" min={7} max={365} value={days} onChange={(e) => setDays(+e.target.value)} /><b>{days} days</b></label>
        <label className="b-field"><span>Expected players a week</span><input id="b-players" type="range" min={1} max={12} value={players} onChange={(e) => setPlayers(+e.target.value)} /><b>{players}</b></label>
      </form>
      <div className="b-out">
        <div className="b-receipt">
          <span className="k">one entry of {fmt(fee)} dragons</span>
          <div><span>player receives</span><b>{fmtD(split.daemon)} DAEMON</b></div>
          <div><span>to the pot</span><b>{fmt(split.pot)}</b></div>
          <div><span>to sunday</span><b>{fmt(split.sunday)}</b></div>
          <div><span>you keep</span><b>{fmt(split.owner)} ({owner}%)</b></div>
        </div>
        <div className="b-receipt">
          <span className="k">per day, arbiter fallback</span>
          <div><span>weight</span><b>{(mine.weight * 100).toFixed(1)}%</b></div>
          <div><span>emission to you</span><b>+{fmtD(mine.daemon)}</b></div>
          <div><span>DAEMON paid to players</span><b>−{fmtD(daemonOutPerDay)}</b></div>
          <div className={net >= 0 ? "pos" : "neg"}><span>net DAEMON</span><b>{net >= 0 ? "+" : "−"}{fmtD(Math.abs(net))}</b></div>
          <div><span>stock lasts</span><b>{runway === Infinity ? "forever" : `${Math.floor(runway)} days`}</b></div>
        </div>
        <p className="note">Generous programs attract players, players raise activity, activity raises emission. Lock longer to count for more. Registration opens with the module system.</p>
        <button className="d-btn" type="button" disabled>Register module 04</button>
      </div>
    </div>
  );
}

// ---- Arbiter console --------------------------------------------------------------

function Console() {
  const now = useNow(60000);
  const epoch = epochNumber(now);
  const rows = useMemo(() => fallbackWeights(MODULES, START_DAILY), []);
  const lines = useMemo(() => {
    const L: string[] = [
      `$ arbiter run --epoch ${epoch}`,
      "",
      "model      deepseek-v3 · open weights · pinned",
      `sampling   temperature 0 · seed ${epoch}`,
      "prompt     sha256:9f2c…e41a  docs/arbiter/prompt.md",
      `inputs     sha256:41b7…07dc  ${MODULES.length} modules · 7d window`,
      `emission   ${fmt(START_DAILY)} DAEMON`,
      "",
      "module            activity  conviction  weight   daemon",
      ...rows.map((r) => `${r.id} ${r.name.toLowerCase().replace(/ /g, "-").padEnd(15)} ${r.activity.toFixed(2).padStart(7)}  ${r.conviction.toFixed(2).padStart(10)}  ${r.weight.toFixed(3).padStart(6)}  ${fmtD(r.daemon).padStart(8)}`),
      "",
      `bounds     max ${MAX_SHARE.toFixed(2)} ok · min ${MIN_SHARE.toFixed(2)} ok · sum ${rows.reduce((s, r) => s + r.weight, 0).toFixed(3)} ok`,
      "agree      model output within 0.02 of fallback ok",
      "output     sha256:c0de…5ea1 · posted · contest window 24h",
    ];
    return L;
  }, [epoch, rows]);
  const [shown, setShown] = useState(lines.length);
  const run = () => setShown(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), lines[shown] === "" ? 120 : 160);
    return () => clearTimeout(t);
  }, [shown, lines]);
  return (
    <figure className="console">
      <figcaption>
        <span className="c-dots"><i /><i /><i /></span>
        <span>arbiter · epoch {epoch}</span>
        <button className="d-btn d-btn-sm" onClick={run} disabled={shown < lines.length}>Run epoch</button>
      </figcaption>
      <pre>
        {lines.slice(0, shown).map((l, i) => (
          <span key={i} className={l.startsWith("$") ? "c-cmd" : /^\d\d /.test(l) ? "c-row" : l.includes(" ok") ? "c-ok" : "c-dim"}>{l + "\n"}</span>
        ))}
        <span className="cursor" />
      </pre>
    </figure>
  );
}

// ---- Supply chart ------------------------------------------------------------------

function Supply() {
  const years = schedule(24);
  const now = useNow(60000);
  const minted = mintedBy(now);
  const VW = 640, VH = 300, L = 54, R = 14, T = 24, B = 32;
  const sx = (y: number) => L + (y / 24) * (VW - L - R);
  const sy = (v: number) => T + (1 - v / CAP) * (VH - T - B);
  const pts = [[sx(0), sy(0)], ...years.map((y) => [sx(y.year), sy(y.total)])];
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const cy = capYear();
  const bw = (VW - L - R) / 24;
  return (
    <div className="supply">
      <div className="supply-facts">
        <div><span>minted so far</span><b>{fmt(minted)}</b></div>
        <div><span>cap</span><b>{fmt(CAP)}</b></div>
        <div><span>year 1 · 5 · 10 daily</span><b>{fmt(years[0].daily)} · {fmt(years[4].daily)} · {fmt(years[9].daily)}</b></div>
        <div><span>cap reached</span><b>year {cy}</b></div>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${VW} ${VH}`} className="chart" role="img" aria-label="Cumulative DAEMON supply approaching 21 million by year 16">
          {[0, 5e6, 10e6, 15e6].map((v) => (
            <g key={v}>
              <line x1={L} x2={VW - R} y1={sy(v)} y2={sy(v)} className="grid" />
              <text x={L - 8} y={sy(v) + 4} textAnchor="end">{v ? `${v / 1e6}M` : "0"}</text>
            </g>
          ))}
          <line x1={L} x2={VW - R} y1={sy(CAP)} y2={sy(CAP)} className="cap" />
          <text x={L - 8} y={sy(CAP) + 4} textAnchor="end" className="hi">21M</text>
          {years.map((y) => y.minted > 0 && <rect key={y.year} x={sx(y.year - 1) + bw * 0.2} y={sy(y.minted)} width={bw * 0.6} height={sy(0) - sy(y.minted)} className="bar" />)}
          <path d={`${d} L${sx(24)} ${sy(0)} L${sx(0)} ${sy(0)} Z`} className="area" />
          <path d={d} className="curve" />
          {cy && <circle cx={sx(cy)} cy={sy(CAP)} r="3.5" className="dot" />}
          {cy && <text x={sx(cy)} y={sy(CAP) - 10} textAnchor="middle" className="hi">cap · year {cy}</text>}
          {[0, 4, 8, 12, 16, 20, 24].map((y) => <text key={y} x={sx(y)} y={VH - 10} textAnchor="middle">{y === 0 ? "year 0" : y}</text>)}
          <text x={VW - R} y={sy(2.2e6)} textAnchor="end">bars: minted per year</text>
        </svg>
      </div>
    </div>
  );
}

// ---- Governance ------------------------------------------------------------------

const PROPOSALS = [
  { id: "P-09", title: "Blue or Orange: cap a single stake at 50,000 dragons", need: 50, yes: 31, status: "voting" },
  { id: "P-08", title: "Pin the Arbiter to deepseek-v3, open weights, temperature 0, seed = epoch", need: 66, yes: 48, status: "voting" },
  { id: "P-07", title: "Retire the convergence arena. All emission flows to modules through the Arbiter", need: 60, yes: 71, status: "passed" },
  { id: "P-06", title: "Count only accounts older than 90 days toward Arbiter activity", need: 50, yes: 64, status: "passed" },
  { id: "P-05", title: "Spirits routes 40% of every pack into the Sunday pot", need: 50, yes: 58, status: "passed" },
  { id: "P-04", title: "Let modules set their own DAEMON price", need: 50, yes: 39, status: "rejected" },
];

function Governance() {
  return (
    <ol className="proposals">
      {PROPOSALS.map((p) => (
        <li key={p.id} className={`prop is-${p.status}`}>
          <span className="prop-id">{p.id}</span>
          <span className="prop-title">{p.title}</span>
          <span className="prop-bar" title={`${p.yes}% yes of ${p.need}% needed`}>
            <i style={{ width: `${p.yes}%` }} />
            <b style={{ left: `${p.need}%` }} />
          </span>
          <span className="prop-status">{p.status === "voting" ? `${p.yes}% / ${p.need}%` : p.status}</span>
        </li>
      ))}
    </ol>
  );
}

// ---- World ----------------------------------------------------------------------

export function DaemonWorld() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const word = useRef<HTMLHeadingElement>(null);
  const now = useNow(1000);
  const daemon = useStore((s) => s.daemon);
  const epoch = epochNumber(now);
  const nextEpoch = (Math.floor(now / 86_400_000) + 1) * 86_400_000;
  const c = countdown(nextEpoch - now);

  useEffect(() => {
    if (!canvas.current) return;
    return startField(canvas.current, word.current);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && go("lobby");
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dw">
      <canvas ref={canvas} className="dw-field" aria-hidden="true" />
      <DepthGauge />
      <header className="dw-top">
        <button className="dw-surface" onClick={() => go("lobby")}>← surface</button>
        <nav className="dw-nav" aria-label="Sections">
          {SECTIONS.map(([id, label]) => <button key={id} onClick={() => scrollToId(id)}>{label}</button>)}
        </nav>
        <span className="dw-epoch">epoch {epoch} · {pad(c.h)}:{pad(c.m)}:{pad(c.s)}</span>
      </header>

      <main>
        <section className="dw-hero">
          <p className="k">underneath lacedaemon</p>
          <h1 ref={word} className="dw-word">DAEMON</h1>
          <p className="dw-thesis">The games on the surface run on it. Nobody has to notice. Lock it behind what you build; every entry buys from you; the Arbiter pays you for what people actually play.</p>
          <dl className="dw-stats">
            <div><dt>minted</dt><dd>{fmt(mintedBy(now))}</dd></div>
            <div><dt>cap</dt><dd>21,000,000</dd></div>
            <div><dt>today</dt><dd>{fmt(START_DAILY)}</dd></div>
            <div><dt>modules</dt><dd>{MODULES.length + 1}</dd></div>
            {daemon > 0 && <div><dt>yours</dt><dd>{fmtD(daemon)}</dd></div>}
          </dl>
          <p className="dw-hint">click anywhere</p>
        </section>

        <section className="dw-block" id="modules">
          <header className="dw-head">
            <p className="k">−1 · modules · the visible layer</p>
            <h2>What surfaces is what members build.</h2>
            <p>Up there, a module is just a game with a small mark on it. Down here it has an owner, a DAEMON price, a routing program and DAEMON locked behind it. House games (Sunday, poker, Monopoly, the arena, kottabos, Pente) are not modules: they run on dragons alone. The convergence arena is retired; Blue or Orange carries its rock-paper-scissors core.</p>
          </header>
          <Registry />
        </section>

        <section className="dw-block" id="flow">
          <header className="dw-head">
            <p className="k">−2 · flow</p>
            <h2>Dragons go in. DAEMON comes out.</h2>
            <p>An entry costs dragons. Those dragons buy DAEMON from the module's owner, so every player leaves holding some. The owner routes the dragons by their program: back to the table, into another module's pot, or into their own pocket. The Arbiter pays owners new DAEMON for activity and conviction, so being generous is how you earn.</p>
          </header>
          <Flow />
        </section>

        <section className="dw-block" id="build">
          <header className="dw-head">
            <p className="k">−3 · build · for developers</p>
            <h2>Program a module.</h2>
            <p>Set the price your entries pay, where the dragons go, and how much you lock. The numbers on the right are what the fallback formula would pay you today.</p>
          </header>
          <Builder />
        </section>

        <section className="dw-block" id="arbiter">
          <header className="dw-head">
            <p className="k">−4 · arbiter · module 0</p>
            <h2>An open brain decides the split.</h2>
            <p>A pinned open-weights model reads each module's activity and conviction and splits the day's emission. Its prompt, inputs and output are public and hashed, so anyone can rerun the epoch and check it.</p>
          </header>
          <div className="arbiter-grid">
            <ul className="rules">
              <li><b>Reproducible.</b> One model version, temperature 0, seeded by the epoch.</li>
              <li><b>Bounded.</b> No module above {MAX_SHARE * 100}%. Weights sum to one.</li>
              <li><b>Checked.</b> It must land near the plain formula: √activity × √conviction.</li>
              <li><b>Never stuck.</b> If it fails or breaks a bound, the formula pays instead.</li>
              <li><b>Sybil-aware.</b> Only established accounts count as activity. Receipts flowing back to an owner get flagged.</li>
              <li><b>Contestable.</b> Payouts wait 24 hours. Governance can veto an epoch or swap the model.</li>
            </ul>
            <Console />
          </div>
        </section>

        <section className="dw-block" id="supply">
          <header className="dw-head">
            <p className="k">−5 · supply</p>
            <h2>21,000,000. Nothing printed.</h2>
            <p>{fmt(START_DAILY)} a day, cut by a tenth each year, rounded down. New DAEMON only enters through the Arbiter.</p>
          </header>
          <Supply />
        </section>

        <section className="dw-block" id="governance">
          <header className="dw-head">
            <p className="k">−6 · governance</p>
            <h2>No consensus mechanism is eternal.</h2>
            <p>A proposal names the share of supply it needs. Holders vote by weight. Anything can change this way, the Arbiter included.</p>
          </header>
          <Governance />
          <p className="note">Example proposals.</p>
        </section>

        <section className="dw-block dw-floor" id="ledger">
          <header className="dw-head">
            <p className="k">−7 · the ledger · the floor</p>
            <h2>Everything above rests on this.</h2>
            <p>One append-only ledger. Every entry, receipt, lock, vote and transfer, in order. Hidden transfers show the amount and nothing else. Your own receipts are in here too.</p>
          </header>
          <LedgerTail />
        </section>
      </main>

      <footer className="dw-foot">
        <span>21,000,000 · nothing printed · everything earned</span>
        <button className="dw-surface" onClick={() => go("lobby")}>return to the surface ↑</button>
      </footer>
    </div>
  );
}
