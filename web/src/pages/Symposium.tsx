import { useCallback, useEffect, useRef, useState } from "react";
import { enter, payout, track, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { MEMBERS, hueFor } from "../app/members";
import { fmt } from "../app/format";
import { nameOf, rank, throwBones } from "../games/astragaloi";
import { CUP, STAND, meter, pathAt, resolve, type Shot } from "../games/kottabos";
import { defaultRand } from "../games/rng";
import { Avatar, Dragons, toast } from "../ui/kit";
import { KindChip, ModuleLine } from "../ui/Entry";

/**
 * The Symposium: one room, a long evening. Knucklebones at the table,
 * kottabos at the stand, and a log everyone in the room can read.
 */

interface Line {
  id: number;
  at: number;
  who?: string;
  text: string;
  tone?: "win" | "loss" | "chat" | "sys";
}

const CHAT = [
  "more wine", "agis throws like a helot", "Venus or nothing", "that disc is glued down", "who brought the figs",
  "one more round", "the Dog again, the gods hate me", "kottabos is a skill game, I swear", "pass the cup",
  "someone light another lamp", "chilon please stop singing",
];

let seq = 0;
function useRoom() {
  const [lines, setLines] = useState<Line[]>(() => [
    { id: seq++, at: Date.now() - 50000, text: "the symposium is open · 6 reclining", tone: "sys" },
    { id: seq++, at: Date.now() - 30000, who: "kyniska", text: "threw Venus, took 7,760", tone: "win" },
    { id: seq++, at: Date.now() - 12000, who: "gorgo", text: "more wine", tone: "chat" },
  ]);
  const say = useCallback((l: Omit<Line, "id" | "at">) => setLines((x) => [...x.slice(-70), { ...l, id: seq++, at: Date.now() }]), []);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      say({ who: MEMBERS[Math.floor(Math.random() * MEMBERS.length)].name, text: CHAT[Math.floor(Math.random() * CHAT.length)], tone: "chat" });
      t = setTimeout(tick, 9000 + Math.random() * 14000);
    };
    t = setTimeout(tick, 6000);
    return () => clearTimeout(t);
  }, [say]);
  return { lines, say };
}

// ---- Knucklebones ---------------------------------------------------------------

function Bone({ v, rolling }: { v: number; rolling: boolean }) {
  // An astragalus: an hourglass-ish bone. Pips show the side it landed on.
  const pips = { 1: [[0, 0]], 3: [[-5, -5], [0, 0], [5, 5]], 4: [[-5, -5], [5, -5], [-5, 5], [5, 5]], 6: [[-6, -6], [6, -6], [-6, 0], [6, 0], [-6, 6], [6, 6]] }[v] ?? [];
  return (
    <svg viewBox="-20 -16 40 32" className={`bone ${rolling ? "is-rolling" : ""}`} aria-label={`${v}`}>
      <path d="M-17 -9 Q -10 -15 -4 -10 Q 0 -6 4 -10 Q 10 -15 17 -9 Q 19 0 17 9 Q 10 15 4 10 Q 0 6 -4 10 Q -10 15 -17 9 Q -19 0 -17 -9 Z" />
      {!rolling && pips.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" />)}
    </svg>
  );
}

type Phase = "ante" | "throw" | "result";
interface Seat {
  name: string;
  you?: boolean;
  bones: number[] | null;
}

const TABLES = [500, 2000, 10000];
const ANTE_MS = 7000;

function Knucklebones({ say }: { say: (l: Omit<Line, "id" | "at">) => void }) {
  const name = useStore((s) => s.name);
  const [stake, setStake] = useState(2000);
  const [phase, setPhase] = useState<Phase>("ante");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [t0, setT0] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [round, setRound] = useState(1);
  const me = seats.find((s) => s.you);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  // Bots sit down during the ante.
  useEffect(() => {
    if (phase !== "ante") return;
    const bots = MEMBERS.filter((m) => m.online).sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
    const timers = bots.map((b, i) =>
      setTimeout(() => {
        setSeats((s) => (s.some((x) => x.name === b.name) ? s : [...s, { name: b.name, bones: null }]));
        say({ who: b.name, text: `antes ${fmt(stake)} at the knucklebones` });
      }, 600 + i * 1300 + Math.random() * 800),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, round, stake, say]);

  // Phase clock.
  useEffect(() => {
    if (phase === "ante" && now - t0 >= ANTE_MS) {
      if (seats.length < 2) { setT0(Date.now()); return; }
      setSeats((s) => s.map((x) => ({ ...x, bones: throwBones(defaultRand) })));
      setPhase("throw");
      setRevealed(0);
      setT0(Date.now());
    } else if (phase === "throw") {
      const due = Math.floor((now - t0) / 900);
      if (due > revealed && revealed < seats.length) setRevealed(revealed + 1);
      if (revealed >= seats.length && now - t0 > seats.length * 900 + 600) {
        const best = Math.max(...seats.map((s) => rank(s.bones!)));
        const winners = seats.filter((s) => rank(s.bones!) === best);
        const pot = Math.floor(seats.length * stake * 0.97);
        const share = Math.floor(pot / winners.length);
        say({ who: winners.map((w) => (w.you ? name : w.name)).join(" & "), text: `threw ${nameOf(winners[0].bones!)}, took ${fmt(share)}`, tone: "win" });
        if (me) {
          const won = winners.some((w) => w.you);
          payout("knucklebones", won ? share : 0, `Knucklebones: threw ${nameOf(me.bones!)}`, won);
          track("bones_throw");
          if (won) toast(<>You threw {nameOf(me.bones!)}. <Dragons value={share} /></>, "good");
        }
        setPhase("result");
        setT0(Date.now());
      }
    } else if (phase === "result" && now - t0 > 3800) {
      setSeats([]);
      setPhase("ante");
      setRound((r) => r + 1);
      setT0(Date.now());
    }
  }, [now, phase, t0, seats, revealed, stake, name, me, say]);

  const sit = () =>
    requireAccount(() => {
      if (phase !== "ante" || me) return;
      if (!enter("knucklebones", stake, `Knucklebones ante · round ${round}`)) return toast("Not enough dragons", "bad");
      setSeats((s) => [...s, { name, you: true, bones: null }]);
      say({ who: name, text: `antes ${fmt(stake)} at the knucklebones` });
    });

  const best = phase !== "ante" && seats.every((s) => s.bones) ? Math.max(...seats.map((s) => rank(s.bones!))) : null;
  const left = Math.max(0, Math.ceil((ANTE_MS - (now - t0)) / 1000));

  return (
    <section className="bones panel-vase">
      <div className="vase-head">
        <div>
          <span className="label">Astragaloi · round {round}</span>
          <h2 className="display">Knucklebones</h2>
        </div>
        <KindChip slug="knucklebones" />
      </div>
      <div className="bones-table">
        {seats.length === 0 && <p className="faint bones-empty">The table is empty. Ante to sit down.</p>}
        {seats.map((s, i) => {
          const shown = phase === "result" || (phase === "throw" && i < revealed);
          const top = best !== null && shown && rank(s.bones!) === best && phase === "result";
          return (
            <div key={s.name} className={`bone-seat ${top ? "is-top" : ""} ${s.you ? "is-you" : ""}`}>
              <Avatar name={s.you ? name : s.name} you={s.you} />
              <span className="bone-name">{s.you ? "you" : s.name}</span>
              <div className="bone-row">
                {(s.bones ?? [3, 4, 3, 4]).map((v, j) => <Bone key={j} v={v} rolling={!shown} />)}
              </div>
              <span className="bone-throw mono">{shown && s.bones ? nameOf(s.bones) : phase === "ante" ? "ready" : "…"}</span>
            </div>
          );
        })}
      </div>
      <div className="bones-foot">
        <div className="seg">
          {TABLES.map((t) => <button key={t} className={`seg-item ${stake === t ? "is-on" : ""}`} disabled={!!me || phase !== "ante"} onClick={() => setStake(t)}>{fmt(t)}</button>)}
        </div>
        <span className="mono faint">pot {fmt(Math.floor(seats.length * stake * 0.97))} · {phase === "ante" ? `throw in ${left}s` : phase === "throw" ? "the bones are rolling" : "next round soon"}</span>
        <button className="btn btn-primary" onClick={sit} disabled={phase !== "ante" || !!me}>{me ? "Seated" : <>Ante · <Dragons value={stake} /></>}</button>
      </div>
      <p className="faint vase-note">Four bones, sides 1 · 3 · 4 · 6. Venus (all different) beats all; the Dog (four ones) loses to all; then four of a kind; then the higher total.</p>
    </section>
  );
}

// ---- Kottabos -------------------------------------------------------------------

const KOTTABOS_ANTE = 500;

function Kottabos({ say }: { say: (l: Omit<Line, "id" | "at">) => void }) {
  const name = useStore((s) => s.name);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<"idle" | "power" | "angle" | "flying" | "done">("idle");
  const [shot, setShot] = useState<Shot>({ power: 0, angle: 0 });
  const [jackpot, setJackpotState] = useState(6500);
  const pot = useRef(6500);
  const setJackpot = (n: number) => {
    pot.current = n;
    setJackpotState(n);
  };
  const [result, setResult] = useState<string | null>(null);
  const start = useRef(Date.now());
  const fly = useRef<{ shot: Shot; t0: number; hit: boolean; tEnd: number } | null>(null);

  // Other drinkers take their shots; the pot grows until someone hits.
  useEffect(() => {
    const t = setInterval(() => {
      const who = MEMBERS[Math.floor(Math.random() * MEMBERS.length)].name;
      if (Math.random() < 0.22) {
        say({ who, text: `knocked the disc down! took ${fmt(pot.current + KOTTABOS_ANTE)}`, tone: "win" });
        setJackpot(3000);
      } else {
        setJackpot(pot.current + KOTTABOS_ANTE);
        say({ who, text: "missed the disc", tone: "loss" });
      }
    }, 16000 + Math.random() * 10000);
    return () => clearInterval(t);
  }, [say]);

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const draw = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const sx = (x: number) => 40 + (x / 7.2) * (W - 70);
      const sy = (y: number) => H - 26 - (y / 3.4) * (H - 50);
      const ink = "#e8935a";
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 1.6;
      // floor line and meander dots
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(W, sy(0)); ctx.stroke();
      ctx.globalAlpha = 1;
      // the stand: a tall rod, the basin (manes) halfway, the disc (plastinx) on top
      const hx = sx(STAND.x);
      ctx.beginPath(); ctx.moveTo(hx, sy(0)); ctx.lineTo(hx, sy(STAND.top)); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx, sy(1.1), 26, 6, 0, 0, Math.PI * 2); ctx.stroke();
      const f = fly.current;
      const elapsed = f ? (Date.now() - f.t0) / 1000 : 0;
      const fallen = f && f.hit && elapsed > f.tEnd;
      const tilt = fallen ? Math.min(1.2, (elapsed - f!.tEnd) * 3) : 0;
      const discY = fallen ? Math.min(sy(1.1) - 4, sy(STAND.top) + (elapsed - f!.tEnd) * 180) : sy(STAND.top);
      ctx.save(); ctx.translate(hx, discY - 3); ctx.rotate(tilt);
      ctx.fillRect(-18, -2, 36, 4);
      ctx.restore();
      if (fallen && elapsed - f!.tEnd < 0.8) {
        ctx.globalAlpha = 1 - (elapsed - f!.tEnd) / 0.8;
        ctx.beginPath(); ctx.arc(hx, sy(1.1), 10 + (elapsed - f!.tEnd) * 80, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // the drinker's cup (kylix)
      const cx = sx(CUP.x), cy = sy(CUP.y);
      ctx.beginPath(); ctx.moveTo(cx - 22, cy); ctx.quadraticCurveTo(cx, cy + 16, cx + 22, cy); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 20); ctx.moveTo(cx - 9, cy + 20); ctx.lineTo(cx + 9, cy + 20); ctx.stroke();
      // aiming preview while choosing
      const ms = Date.now() - start.current;
      const live: Shot = stage === "power" ? { power: meter(ms, 1400), angle: 0.5 } : stage === "angle" ? { power: shot.power, angle: meter(ms, 1600) } : shot;
      if (stage === "power" || stage === "angle") {
        ctx.setLineDash([2, 6]);
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        for (let t = 0; t < 0.45; t += 0.02) {
          const p = pathAt(live, t);
          t ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y));
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      // the wine in flight
      if (f) {
        const end = Math.min(elapsed, f.tEnd + 0.6);
        ctx.fillStyle = "#b8322b";
        for (let k = 0; k < 6; k++) {
          const p = pathAt(f.shot, Math.max(0, end - k * 0.025));
          if (p.y < 0) continue;
          ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 3 - k * 0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [stage, shot]);

  const press = () =>
    requireAccount(() => {
      const ms = Date.now() - start.current;
      if (stage === "idle" || stage === "done") {
        if (!enter("kottabos", KOTTABOS_ANTE, "Kottabos ante")) return toast("Not enough dragons", "bad");
        setJackpot(pot.current + KOTTABOS_ANTE);
        setResult(null);
        fly.current = null;
        start.current = Date.now();
        setStage("power");
      } else if (stage === "power") {
        setShot({ power: meter(ms, 1400), angle: 0.5 });
        start.current = Date.now();
        setStage("angle");
      } else if (stage === "angle") {
        const s = { power: shot.power, angle: meter(ms, 1600) };
        setShot(s);
        const r = resolve(s);
        fly.current = { shot: s, t0: Date.now(), hit: r.hit, tEnd: r.t };
        setStage("flying");
        setTimeout(() => {
          if (r.hit) {
            const j = pot.current;
            payout("kottabos", j, "Kottabos: knocked the disc down", true);
            say({ who: name, text: `knocked the disc down! took ${fmt(j)}`, tone: "win" });
            toast(<>The disc rings. <Dragons value={j} /></>, "good");
            setJackpot(3000);
            track("kottabos_hit");
            setResult("The disc rings.");
          } else {
            payout("kottabos", 0, "", false);
            say({ who: name, text: r.miss > 0 ? "flicked over the disc" : "fell short of the disc", tone: "loss" });
            setResult(r.miss > 0 ? "Too high. Over the disc." : "Too low. Short of the disc.");
          }
          setStage("done");
        }, (r.t + 0.3) * 1000);
      }
    });

  return (
    <section className="kottabos panel-vase">
      <div className="vase-head">
        <div>
          <span className="label">Skill · everyone's antes in one pot</span>
          <h2 className="display">Kottabos</h2>
        </div>
        <KindChip slug="kottabos" />
      </div>
      <canvas ref={canvas} className="kottabos-canvas" aria-label="Kottabos stand and cup" />
      <div className="bones-foot">
        <span className="mono">pot <b>{fmt(jackpot)}</b></span>
        <span className="faint">{result ?? (stage === "power" ? "Stop the power…" : stage === "angle" ? "…now the angle" : "Flick the last of your wine at the bronze disc.")}</span>
        <button className="btn btn-primary" onClick={press} disabled={stage === "flying"}>
          {stage === "power" ? "Set power" : stage === "angle" ? "Flick" : <>Take a turn · <Dragons value={KOTTABOS_ANTE} /></>}
        </button>
      </div>
      <p className="faint vase-note">Two presses: power, then angle. Knock the disc into the basin and the whole pot is yours. A miss feeds the pot for the next drinker.</p>
    </section>
  );
}

function RoomLog({ lines, say }: ReturnType<typeof useRoom>) {
  const name = useStore((s) => s.name);
  const [text, setText] = useState("");
  const box = useRef<HTMLOListElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [lines]);
  return (
    <section className="roomlog panel-vase">
      <div className="vase-head"><h3 className="display">The room</h3><span className="chip chip-live">{MEMBERS.filter((m) => m.online).length + 1} reclining</span></div>
      <ol ref={box} className="room-lines mono">
        {lines.map((l) => (
          <li key={l.id} className={`rl-${l.tone ?? "plain"}`}>
            <span className="rl-t">{new Date(l.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            {l.who && <span className="rl-who" style={{ color: l.who === name ? "var(--accent)" : `hsl(${hueFor(l.who.split(" & ")[0])} 55% 70%)` }}>{l.who}</span>}
            <span className="rl-text">{l.text}</span>
          </li>
        ))}
      </ol>
      <form className="room-say" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; requireAccount(() => { say({ who: name, text: text.trim().slice(0, 140), tone: "chat" }); track("chat_message"); setText(""); }); }}>
        <input id="room-say" className="input" placeholder="Say something to the room" value={text} onChange={(e) => setText(e.target.value)} maxLength={140} />
        <button className="btn" type="submit">Send</button>
      </form>
    </section>
  );
}

export function SymposiumPage() {
  const room = useRoom();
  return (
    <div className="symposium">
      <div className="meander" aria-hidden="true" />
      <header className="page-head">
        <div>
          <p className="label">One room · a long evening</p>
          <h1 className="display page-title">Symposium</h1>
          <p className="muted">Games the Greeks played over wine. Everything that happens at the table lands in the room for everyone here.</p>
        </div>
        <ModuleLine slug="knucklebones" />
      </header>
      <div className="sym-grid">
        <div className="sym-main">
          <Knucklebones say={room.say} />
          <Kottabos say={room.say} />
        </div>
        <RoomLog {...room} />
      </div>
    </div>
  );
}
