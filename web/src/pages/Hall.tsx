import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { enter, payout, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { MEMBERS, hueFor } from "../app/members";
import { fmt } from "../app/format";
import { programBySlug, splitEntry } from "../economy/modules";
import { BOARDING_MS, FALLEN_MS, altitudeAt, botFliers, crashPoint, payoutFor, secondsTo, type Flier } from "../games/icarus";
import { defaultRand } from "../games/rng";
import { Avatar, Dragons, toast } from "../ui/kit";
import { KindChip, ModuleLine } from "../ui/Entry";

/**
 * The Hall: one room, everyone in it. Every bet, every let-go and every fall
 * lands in the room log for all to see. Two machines: Icarus (a Daemon
 * module) and the house slot machine with the server's classic odds.
 */

type Phase = "boarding" | "flight" | "fallen";

interface RoomLine {
  id: number;
  at: number;
  who?: string;
  text: string;
  tone?: "win" | "loss" | "chat" | "sys";
}

interface Round {
  no: number;
  phase: Phase;
  t0: number;
  crash: number;
  fliers: (Flier & { joinAt: number })[];
}

const CHAT = [
  "the wax holds", "who's still up", "1.2 and out, call me a coward", "sun's hungry tonight", "gg",
  "lysander never lets go", "I can see Olympia from here", "sending it", "that was a fake sun",
  "brb collecting", "one more flight", "my wings are paper", "orange tonight, trust", "who took Orthia in the market",
];

let lineSeq = 0;

function useRoom(name: string) {
  const [lines, setLines] = useState<RoomLine[]>(() => [
    { id: lineSeq++, at: Date.now() - 60000, text: "6 people in the Hall", tone: "sys" },
    { id: lineSeq++, at: Date.now() - 42000, who: "agis", text: "new wings on Icarus, enjoy", tone: "chat" },
    { id: lineSeq++, at: Date.now() - 20000, who: "kyniska", text: "let go at 3.10× +7,440", tone: "win" },
  ]);
  const say = useCallback((line: Omit<RoomLine, "id" | "at">) => {
    setLines((l) => [...l.slice(-60), { ...line, id: lineSeq++, at: Date.now() }]);
  }, []);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const who = MEMBERS[Math.floor(Math.random() * MEMBERS.length)].name;
      say({ who, text: CHAT[Math.floor(Math.random() * CHAT.length)], tone: "chat" });
      t = setTimeout(tick, 7000 + Math.random() * 12000);
    };
    t = setTimeout(tick, 4000);
    return () => clearTimeout(t);
  }, [say]);
  return { lines, say, name };
}

function newRound(no: number): Round {
  const names = MEMBERS.filter((m) => m.online).map((m) => m.name);
  return {
    no,
    phase: "boarding",
    t0: Date.now(),
    crash: crashPoint(defaultRand),
    fliers: botFliers(names, defaultRand).map((f) => ({ ...f, joinAt: 400 + Math.random() * (BOARDING_MS - 1600) })),
  };
}

// ---- Stage ----------------------------------------------------------------------

function Stage({ round, history }: { round: MutableRefObject<Round>; history: number[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const feathers = useRef<{ x: number; y: number; vx: number; vy: number; r: number }[]>([]);
  const fallFrom = useRef<{ x: number; y: number } | null>(null);
  const [label, setLabel] = useState({ m: 1, phase: "boarding" as Phase, left: BOARDING_MS });

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let lastPhase: Phase = "boarding";
    const draw = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = round.current;
      const now = Date.now();
      const el = now - r.t0;
      const m = r.phase === "flight" ? Math.min(altitudeAt(el / 1000), r.crash) : r.phase === "fallen" ? r.crash : 1;
      const sunX = W * 0.8, sunY = H * 0.2;
      const groundY = H - 34, startX = 44;

      // sky
      ctx.clearRect(0, 0, W, H);
      const heat = Math.min(1, Math.log(m) / Math.log(12));
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `rgba(${30 + heat * 40},${20 + heat * 12},${32},1)`);
      sky.addColorStop(1, "#0d0b0e");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // sun: grows hotter the higher they fly; flares on the fall
      const flare = r.phase === "fallen" ? Math.max(0, 1 - el / 900) : 0;
      const sunR = 34 + heat * 26 + flare * 60 + Math.sin(now / 600) * 2;
      const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3.2);
      g.addColorStop(0, "#fff1dc");
      g.addColorStop(0.18, "#ffcf9e");
      g.addColorStop(0.32, `rgba(244,163,95,${0.55 + heat * 0.3})`);
      g.addColorStop(1, "rgba(244,163,95,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 3.2, 0, Math.PI * 2);
      ctx.fill();

      // ground line
      ctx.strokeStyle = "#ffffff14";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      // the flight path: always aimed at the sun, never quite reaching it
      const view = Math.max(2.4, m * 1.3);
      const at = (mm: number) => {
        const u = Math.log(mm) / Math.log(view);
        return { x: startX + u * (sunX - startX) * 0.9, y: groundY - Math.pow(u, 1.5) * (groundY - sunY) * 0.86 };
      };
      if (r.phase !== "boarding") {
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const p = at(Math.exp((i / 64) * Math.log(m)));
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.strokeStyle = r.phase === "fallen" ? "#ffffff30" : "#f4a35f";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#f4a35f";
        ctx.shadowBlur = r.phase === "fallen" ? 0 : 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // fliers who let go stay where they let go
      ctx.font = "500 10px 'Geist Mono', monospace";
      for (const f of r.fliers) {
        if (!f.out || r.phase === "boarding") continue;
        const p = at(f.out);
        ctx.fillStyle = f.you ? "#f4a35f" : `hsl(${hueFor(f.name)} 55% 66%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, f.you ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ece4dacc";
        ctx.fillText(`${f.you ? "you" : f.name} ${f.out.toFixed(2)}×`, p.x + 7, p.y - 6);
      }

      // the tip: Icarus himself, wings beating
      const tip = r.phase === "boarding" ? { x: startX, y: groundY } : at(m);
      if (r.phase === "fallen") {
        if (lastPhase !== "fallen") {
          fallFrom.current = tip;
          feathers.current = Array.from({ length: 22 }, () => ({ x: tip.x, y: tip.y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, r: Math.random() * Math.PI }));
        }
        const t = el / 1000;
        const f0 = fallFrom.current ?? tip;
        const fy = Math.min(groundY, f0.y + 160 * t * t);
        ctx.fillStyle = "#ece4da88";
        ctx.beginPath();
        ctx.arc(f0.x + t * 20, fy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ece4da66";
        for (const p of feathers.current) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.r += 0.05;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(p.r) * 5, p.y + Math.sin(p.r) * 5);
          ctx.stroke();
        }
      } else {
        const flap = Math.sin(now / (r.phase === "flight" ? 90 : 300)) * 5;
        ctx.strokeStyle = "#ece4da";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tip.x - 11, tip.y - 2 + flap);
        ctx.quadraticCurveTo(tip.x - 5, tip.y - 8, tip.x, tip.y);
        ctx.quadraticCurveTo(tip.x + 5, tip.y - 8, tip.x + 11, tip.y - 2 + flap);
        ctx.stroke();
        ctx.fillStyle = "#ece4da";
        ctx.beginPath();
        ctx.arc(tip.x, tip.y + 1, 2.4, 0, Math.PI * 2);
        ctx.fill();
        // passengers still flying, trailing behind the tip
        const flying = r.fliers.filter((f) => !f.out && (r.phase === "flight" || f.joinAt <= el));
        flying.forEach((f, i) => {
          const back = at(Math.max(1, m / (1 + (i + 1) * 0.035)));
          ctx.fillStyle = f.you ? "#f4a35f" : `hsl(${hueFor(f.name)} 50% 60%)`;
          ctx.beginPath();
          ctx.arc(r.phase === "boarding" ? startX + 14 + i * 9 : back.x, r.phase === "boarding" ? groundY - 6 : back.y + 6, f.you ? 3.5 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      lastPhase = r.phase;
      setLabel((l) => {
        const left = r.phase === "boarding" ? BOARDING_MS - el : 0;
        const mm = Math.round(m * 100) / 100;
        return l.m === mm && l.phase === r.phase && Math.ceil(l.left / 1000) === Math.ceil(left / 1000) ? l : { m: mm, phase: r.phase, left };
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [round]);

  return (
    <div className="stage-wrap">
    <div className="stage">
      <canvas ref={canvas} className="stage-canvas" aria-label="Icarus flight" />
      <div className="stage-overlay">
        <div className={`alt num ${label.phase === "fallen" ? "is-fallen" : ""}`}>{label.phase === "boarding" ? "1.00×" : `${label.m.toFixed(2)}×`}</div>
        <div className="stage-phase mono">
          {label.phase === "boarding" && `boarding · takeoff in ${Math.max(0, Math.ceil(label.left / 1000))}s`}
          {label.phase === "flight" && "in flight"}
          {label.phase === "fallen" && `the wax melted at ${label.m.toFixed(2)}×`}
        </div>
      </div>
    </div>
      <div className="history num" aria-label="Recent flights">
        <span className="label">last flights</span>
        {history.slice(-16).reverse().map((h, i) => (
          <span key={i} className={h < 1.5 ? "h-low" : h < 3 ? "h-mid" : h < 10 ? "h-high" : "h-sun"}>{h.toFixed(2)}×</span>
        ))}
      </div>
    </div>
  );
}

// ---- Icarus controls + roster -------------------------------------------------------

function Icarus({ say }: { say: (l: Omit<RoomLine, "id" | "at">) => void }) {
  const name = useStore((s) => s.name);
  const round = useRef<Round>(newRound(1));
  const [, force] = useState(0);
  const [history, setHistory] = useState<number[]>(() => Array.from({ length: 14 }, () => crashPoint(defaultRand)));
  const [bet, setBet] = useState(1000);
  const [auto, setAuto] = useState(0);
  const announced = useRef(new Set<string>());

  const letGo = useCallback(() => {
    const r = round.current;
    const me = r.fliers.find((f) => f.you && !f.out);
    if (!me || r.phase !== "flight") return;
    const m = Math.floor(Math.min(altitudeAt((Date.now() - r.t0) / 1000), r.crash) * 100) / 100;
    me.out = m;
    const win = payoutFor(me.bet, m);
    payout("icarus", win, `Icarus: let go at ${m.toFixed(2)}×`, true);
    say({ who: name, text: `let go at ${m.toFixed(2)}× +${fmt(win)}`, tone: "win" });
    toast(<>Let go at {m.toFixed(2)}×. <Dragons value={win} /></>, "good");
    force((x) => x + 1);
  }, [name, say]);

  // The room clock.
  useEffect(() => {
    const t = setInterval(() => {
      const r = round.current;
      const el = Date.now() - r.t0;
      if (r.phase === "boarding") {
        for (const f of r.fliers) {
          const key = `${r.no}:board:${f.name}`;
          if (!f.you && f.joinAt <= el && !announced.current.has(key)) {
            announced.current.add(key);
            say({ who: f.name, text: `boards with ${fmt(f.bet)}` });
          }
        }
        if (el >= BOARDING_MS) {
          r.phase = "flight";
          r.t0 = Date.now();
          say({ text: `flight ${r.no} takes off with ${r.fliers.length} aboard`, tone: "sys" });
        }
      } else if (r.phase === "flight") {
        const m = altitudeAt(el / 1000);
        for (const f of r.fliers) {
          if (f.out) continue;
          const target = f.you ? (auto > 1 ? auto : Infinity) : f.target;
          if (target <= r.crash && m >= target) {
            if (f.you) {
              letGo();
            } else {
              f.out = target;
              say({ who: f.name, text: `let go at ${target.toFixed(2)}× +${fmt(payoutFor(f.bet, target))}`, tone: "win" });
            }
          }
        }
        if (m >= r.crash) {
          r.phase = "fallen";
          r.t0 = Date.now();
          const fell = r.fliers.filter((f) => !f.out);
          say({ text: `the wax melted at ${r.crash.toFixed(2)}×${fell.length ? ` · ${fell.map((f) => (f.you ? "you" : f.name)).join(", ")} fell` : ""}`, tone: "loss" });
          if (fell.some((f) => f.you)) payout("icarus", 0, "", false);
          setHistory((h) => [...h.slice(-30), r.crash]);
        }
      } else if (el >= FALLEN_MS) {
        round.current = newRound(r.no + 1);
      }
      force((x) => (x + 1) % 1e6);
    }, 100);
    return () => clearInterval(t);
  }, [auto, letGo, say]);

  const r = round.current;
  const me = r.fliers.find((f) => f.you);
  const m = r.phase === "flight" ? Math.min(altitudeAt((Date.now() - r.t0) / 1000), r.crash) : 1;
  const board = () =>
    requireAccount(() => {
      if (r.phase !== "boarding" || me) return;
      const receipt = enter("icarus", bet, `Icarus flight ${r.no}`);
      if (!receipt) return toast("Not enough dragons", "bad");
      r.fliers.push({ name, bet, target: Infinity, you: true, joinAt: Date.now() - r.t0 });
      say({ who: name, text: `boards with ${fmt(bet)}` });
      force((x) => x + 1);
    });
  const el = Date.now() - r.t0;
  const roster = r.fliers.filter((f) => f.you || r.phase !== "boarding" || f.joinAt <= el);
  const split = splitEntry(programBySlug("icarus"), bet);

  return (
    <section className="icarus">
      <div className="icarus-main">
        <Stage round={round} history={history} />
        <div className="icarus-controls">
          {me && !me.out && r.phase === "flight" ? (
            <button className="btn btn-primary btn-lg letgo" onClick={letGo}>
              Let go · <Dragons value={payoutFor(me.bet, Math.floor(m * 100) / 100)} />
            </button>
          ) : (
            <>
              <div className="bet-field">
                <span className="label">Stake</span>
                <div className="presets">
                  {[500, 1000, 2500, 5000, 10000].map((v) => (
                    <button key={v} className={`btn btn-sm ${bet === v ? "is-on" : ""}`} onClick={() => setBet(v)}>{fmt(v)}</button>
                  ))}
                </div>
              </div>
              <div className="bet-field">
                <label className="label" htmlFor="auto">Let go at</label>
                <select id="auto" className="select auto" value={auto} onChange={(e) => setAuto(+e.target.value)}>
                  <option value={0}>by hand</option>
                  {[1.5, 2, 3, 5, 10].map((v) => <option key={v} value={v}>{v.toFixed(2)}×</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-lg board" disabled={r.phase !== "boarding" || !!me} onClick={board}>
                {me ? (me.out ? `Let go at ${me.out.toFixed(2)}×` : r.phase === "fallen" ? "You fell" : "Aboard") : r.phase === "boarding" ? <>Board · <Dragons value={bet} /></> : "Next flight soon"}
              </button>
            </>
          )}
        </div>
        <p className="faint mono icarus-note">
          {fmt(bet)} buys {split.daemon.toFixed(2)} DAEMON from {programBySlug("icarus").owner} · flights return 97% over time · altitude {secondsTo(2).toFixed(1)}s to 2×
        </p>
      </div>
      <aside className="roster panel">
        <div className="panel-head"><h3>Flight {r.no}</h3><span className="label">{roster.length} aboard</span></div>
        <ul>
          {roster.map((f) => {
            const fell = r.phase === "fallen" && !f.out;
            return (
              <li key={f.name} className={`${f.you ? "is-you" : ""} ${f.out ? "is-out" : ""} ${fell ? "is-fell" : ""}`}>
                <Avatar name={f.you ? name : f.name} you={f.you} />
                <span className="ro-name">{f.you ? "you" : f.name}</span>
                <span className="num ro-bet">{fmt(f.bet)}</span>
                <span className="num ro-state">{f.out ? `${f.out.toFixed(2)}×` : fell ? "fell" : r.phase === "flight" ? "flying" : "aboard"}</span>
              </li>
            );
          })}
        </ul>
      </aside>
    </section>
  );
}

// ---- Slots: the house machine ----------------------------------------------------------

const SYMBOLS = [
  { id: "dragon", mult: 34, label: "Dragon" },
  { id: "sun", mult: 16, label: "Sun" },
  { id: "laurel", mult: 8, label: "Laurel" },
  { id: "wave", mult: 4, label: "Wave" },
] as const;

function Symbol({ id }: { id: (typeof SYMBOLS)[number]["id"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 40 40" className={`sym sym-${id}`} aria-label={id}>
      {id === "dragon" && <path {...common} d="M30 12c-2.6-3.6-6.6-5.6-10.8-5.6C12 6.4 6.4 12 6.4 19.2S12 31.6 19.2 31.6c5 0 9.2-3 9.2-7.4 0-3.6-2.8-6.2-6.4-6.2-3 0-5.4 2.2-5.4 5 0 2 1.6 3.6 3.6 3.6M30 12l3.6-3.2M30 12l.8 4.4" />}
      {id === "sun" && (
        <g {...common}>
          <circle cx="20" cy="20" r="7" fill="currentColor" stroke="none" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1={20 + Math.cos((a * Math.PI) / 180) * 11} y1={20 + Math.sin((a * Math.PI) / 180) * 11} x2={20 + Math.cos((a * Math.PI) / 180) * 15} y2={20 + Math.sin((a * Math.PI) / 180) * 15} />)}
        </g>
      )}
      {id === "laurel" && <path {...common} d="M20 34V14M20 30c-6-1-9-5-9-10 4 1 8 4 9 10Zm0-6c6-1 9-5 9-10-4 1-8 4-9 10Zm0-6c-4-1-6-4-6-8 3 1 5 3 6 8Zm0 0c4-1 6-4 6-8-3 1-5 3-6 8Z" />}
      {id === "wave" && <path {...common} d="M5 16c5-5 10 5 15 0s10 5 15 0M5 24c5-5 10 5 15 0s10 5 15 0" />}
    </svg>
  );
}

function Slots({ say }: { say: (l: Omit<RoomLine, "id" | "at">) => void }) {
  const name = useStore((s) => s.name);
  const [bet, setBet] = useState(1000);
  const [reels, setReels] = useState<number[]>([0, 1, 2]);
  const [spinning, setSpinning] = useState<boolean[]>([false, false, false]);
  const [result, setResult] = useState<string | null>(null);
  const spinningRef = useRef([false, false, false]);

  const spin = () =>
    requireAccount(() => {
      if (spinning.some(Boolean)) return;
      if (!enter("slots", bet, "Slots spin")) return toast("Not enough dragons", "bad");
      const final = [0, 1, 2].map(() => Math.floor(Math.random() * 4));
      setResult(null);
      setSpinning([true, true, true]);
      const ticker = setInterval(() => setReels((r) => r.map((v, i) => (spinningRef.current[i] ? (v + 1) % 4 : v))), 70);
      final.forEach((f, i) =>
        setTimeout(() => {
          spinningRef.current[i] = false;
          setReels((r) => r.map((v, j) => (j === i ? f : v)));
          setSpinning((s) => s.map((v, j) => (j === i ? false : v)));
          if (i === 2) {
            clearInterval(ticker);
            const win = final[0] === final[1] && final[1] === final[2] ? SYMBOLS[final[0]] : null;
            if (win) {
              const amount = bet * win.mult;
              payout("slots", amount, `Slots: three ${win.label.toLowerCase()}s`, true);
              setResult(`Three ${win.label.toLowerCase()}s · ${win.mult}×`);
              say({ who: name, text: `hit three ${win.label.toLowerCase()}s +${fmt(amount)}`, tone: "win" });
            } else {
              payout("slots", 0, "", false);
              setResult("No line");
            }
          }
        }, 700 + i * 450),
      );
      spinningRef.current = [true, true, true];
    });

  return (
    <section className="slots panel">
      <div className="panel-head">
        <h3>The machine</h3>
        <KindChip slug="slots" />
      </div>
      <div className="panel-body slots-body">
        <div className="reels">
          {reels.map((s, i) => (
            <div key={i} className={`reel ${spinning[i] ? "is-spinning" : ""}`}><Symbol id={SYMBOLS[s].id} /></div>
          ))}
        </div>
        <p className={`slots-result ${result && result !== "No line" ? "is-win" : ""}`}>{result ?? "Three in a row pays."}</p>
        <div className="paytable">
          {SYMBOLS.map((s) => (
            <span key={s.id}><Symbol id={s.id} /><b className="num">{s.mult}×</b></span>
          ))}
        </div>
        <div className="slots-controls">
          <div className="presets">
            {[500, 1000, 5000].map((v) => <button key={v} className={`btn btn-sm ${bet === v ? "is-on" : ""}`} onClick={() => setBet(v)}>{fmt(v)}</button>)}
          </div>
          <button className="btn btn-primary" onClick={spin} disabled={spinning.some(Boolean)}>Spin · <Dragons value={bet} /></button>
        </div>
        <p className="faint mono" style={{ fontSize: 11 }}>Three of a kind 1 in 16 · returns 96.875% · house game</p>
      </div>
    </section>
  );
}

// ---- Room log ------------------------------------------------------------------------

function RoomLog({ lines, say, name }: ReturnType<typeof useRoom>) {
  const [text, setText] = useState("");
  const box = useRef<HTMLOListElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);
  return (
    <section className="roomlog panel">
      <div className="panel-head"><h3>The room</h3><span className="chip chip-live">{MEMBERS.filter((m) => m.online).length + 1} here</span></div>
      <ol ref={box} className="room-lines mono">
        {lines.map((l) => (
          <li key={l.id} className={`rl-${l.tone ?? "plain"}`}>
            <span className="rl-t">{new Date(l.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            {l.who && <span className="rl-who" style={{ color: l.who === name ? "var(--accent)" : `hsl(${hueFor(l.who)} 55% 70%)` }}>{l.who}</span>}
            <span className="rl-text">{l.text}</span>
          </li>
        ))}
      </ol>
      <form
        className="room-say"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          requireAccount(() => {
            say({ who: name, text: text.trim().slice(0, 140), tone: "chat" });
            setText("");
          });
        }}
      >
        <input id="room-say" className="input" placeholder="Say something to the room" value={text} onChange={(e) => setText(e.target.value)} maxLength={140} />
        <button className="btn" type="submit">Send</button>
      </form>
    </section>
  );
}

export function HallPage() {
  const name = useStore((s) => s.name);
  const room = useRoom(name);
  return (
    <div className="hall">
      <header className="page-head">
        <div>
          <p className="label">The Hall · one room, everyone in it</p>
          <h1 className="display page-title">The Hall</h1>
          <p className="muted">Gambling is better with witnesses. Every stake, every let-go and every fall shows up in the room for everyone here.</p>
        </div>
        <ModuleLine slug="icarus" />
      </header>
      <div className="hall-grid">
        <div className="hall-main">
          <div className="section-title"><h2>Icarus</h2><span className="faint" style={{ fontSize: "var(--t-sm)" }}>Fly toward the sun. Let go before the wax melts.</span></div>
          <Icarus say={room.say} />
          <Slots say={room.say} />
        </div>
        <RoomLog {...room} />
      </div>
    </div>
  );
}
