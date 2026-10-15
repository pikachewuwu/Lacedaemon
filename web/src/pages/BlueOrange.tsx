import { useMemo, useState } from "react";
import { addCards, payout, setState, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { berlinNow, countdown, dateKey, pad } from "../app/time";
import { fmt } from "../app/format";
import { programBySlug } from "../economy/modules";
import { BEATS, closeMinute, COLOURS, resolve, simulateField, VERB, type Colour, type Resolution, type Stake } from "../games/boo/round";
import { COLOUR_ELEMENT, rollDrop, byId } from "../games/spirits/catalog";
import { defaultRand, hashSeed, seeded } from "../games/rng";
import { Dragons, toast, useNow } from "../ui/kit";
import { EntryModal, ModuleLine } from "../ui/Entry";
import { SpiritCard } from "../ui/SpiritCard";

const NAME: Record<Colour, string> = { blue: "Blue", orange: "Orange", green: "Green" };

function Cycle() {
  // Triangle: blue top, orange bottom-right, green bottom-left. Arrows follow BEATS.
  const pos: Record<Colour, [number, number]> = { blue: [120, 34], orange: [206, 182], green: [34, 182] };
  return (
    <svg viewBox="0 0 240 220" className="cycle" role="img" aria-label="Blue puts out orange, orange burns green, green drinks blue">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--text-3)" />
        </marker>
      </defs>
      {COLOURS.map((c) => {
        const [x1, y1] = pos[c];
        const [x2, y2] = pos[BEATS[c]];
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
        const k = 30 / len;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const off = c === "orange" ? [0, 18] : c === "blue" ? [22, -4] : [-22, -4];
        return (
          <g key={c}>
            <line x1={x1 + dx * k} y1={y1 + dy * k} x2={x2 - dx * k} y2={y2 - dy * k} stroke="var(--text-3)" strokeWidth="1.2" markerEnd="url(#arrow)" />
            <text x={mx + off[0]} y={my + off[1]} textAnchor="middle" className="cycle-verb">{VERB[c]}</text>
          </g>
        );
      })}
      {COLOURS.map((c) => (
        <g key={c}>
          <circle cx={pos[c][0]} cy={pos[c][1]} r="22" className={`orb-${c}`} />
          <text x={pos[c][0]} y={pos[c][1] + 4} textAnchor="middle" className="cycle-name">{NAME[c]}</text>
        </g>
      ))}
    </svg>
  );
}

function ResolutionView({ res, you, stake }: { res: Resolution; you?: string; stake?: number }) {
  const max = Math.max(...COLOURS.map((c) => res.pools[c]), 1);
  const won = you ? res.payouts[you] ?? 0 : 0;
  return (
    <div className="res">
      {res.ranked.map((c, i) => {
        const role = res.void ? "refunded" : c === res.underdog ? "smallest pool · wins half" : res.fight?.winner === c ? `${VERB[c]} ${res.fight.loser} · ${res.underdog ? "wins half" : "wins all"}` : res.fight?.loser === c ? `loses to ${res.fight.winner}` : "not backed";
        const isWin = !res.void && (c === res.underdog || c === res.fight?.winner);
        return (
          <div key={c} className={`res-row ${isWin ? "is-win" : ""}`}>
            <span className={`res-name t-${c}`}><i className={`orb-dot orb-${c}`} />{NAME[c]}</span>
            <span className="res-bar"><i className={`fill-${c}`} style={{ width: `${(res.pools[c] / max) * 100}%` }} /></span>
            <span className="res-amt num">{fmt(res.pools[c])}</span>
            <span className="res-role">{i === 0 ? "largest · " : i === 1 ? "second · " : "smallest · "}{role}</span>
          </div>
        );
      })}
      {you && stake !== undefined && (
        <p className="res-you">
          {res.void ? "Only one colour was backed. Everyone gets their stake back." : won > 0 ? <>You staked <Dragons value={stake} /> and receive <Dragons value={won} className="pos" />.</> : <>Your <Dragons value={stake} /> went to the winners. The DAEMON you received stays yours.</>}
        </p>
      )}
    </div>
  );
}

function fieldFor(day: string): Stake[] {
  const r = seeded(hashSeed("field:" + day));
  return simulateField(r, 9, Date.now());
}

export function BlueOrangePage() {
  const now = useNow(1000);
  const s = useStore((x) => x);
  const m = programBySlug("blue-or-orange");
  const today = dateKey(new Date(now));
  const b = berlinNow(new Date(now));
  const closeAt = closeMinute(today);
  const minutes = b.hour * 60 + b.minute;
  const done = s.booHistory.find((h) => h.date === today);
  const mine = s.boo && s.boo.date === today ? s.boo : null;
  const field = useMemo(() => fieldFor(today), [today]);

  const [colour, setColour] = useState<Colour>("green");
  const [amount, setAmount] = useState(2000);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ res: Resolution; stake: number } | null>(null);
  const [practice, setPractice] = useState<{ res: Resolution; stake: number } | null>(null);
  const [drop, setDrop] = useState<ReturnType<typeof rollDrop>>(null);

  const windowLeft = countdown(Math.max(0, 20 * 60 - minutes) * 60_000);

  const closeNow = () => {
    if (!mine) return;
    const stakes: Stake[] = [...field, { player: s.name, colour: mine.colour, amount: mine.amount, at: mine.at }];
    const res = resolve(stakes, m.routes.pot ?? 0.95);
    const got = res.payouts[s.name] ?? 0;
    const winners = res.void ? [] : ([res.underdog, res.fight?.winner].filter(Boolean) as Colour[]);
    const won = !res.void && got > 0;
    payout("boo", got, won ? `Blue or Orange: ${mine.colour} won` : "Blue or Orange refund", won);
    const streak = won ? s.booStreak + 1 : res.void ? s.booStreak : 0;
    setState((st) => ({ boo: null, booStreak: streak, booHistory: [{ date: today, colour: mine.colour, amount: mine.amount, payout: got, winners }, ...st.booHistory].slice(0, 60) }));
    if (won) {
      const d = rollDrop(defaultRand, "Blue or Orange win", COLOUR_ELEMENT[mine.colour], 0.5);
      if (d) {
        addCards([d], "Card drop for backing the winner", "drop");
        setDrop(d);
      }
      if (streak === 3) toast("Three in a row. You're Champion.", "good");
    }
    setResult({ res, stake: mine.amount });
  };

  const runPractice = () => {
    const r = seeded((Date.now() & 0xffffff) ^ 0x51);
    const stakes = [...simulateField(r, 6 + Math.floor(r() * 6), Date.now()), { player: "you", colour, amount, at: Date.now() }];
    setPractice({ res: resolve(stakes, m.routes.pot ?? 0.95), stake: amount });
  };

  return (
    <div className="boo-page">
      <header className="page-head">
        <div>
          <p className="label">Daily · three colours</p>
          <h1 className="display page-title">Blue or Orange</h1>
          <p className="muted">Back a colour in secret. When the round closes, the smallest pool wins half the pot and the two largest fight for the other half.</p>
        </div>
        <ModuleLine slug="blue-or-orange" />
      </header>

      <div className="boo-grid">
        <section className="panel boo-today">
          <div className="panel-head">
            <h2>Today's round</h2>
            <span className={`chip ${minutes < closeAt && !done ? "chip-live" : ""}`}>{done ? "Settled" : minutes < closeAt ? "Open" : "Closing"}</span>
          </div>
          <div className="panel-body">
            <div className="boo-pools">
              {COLOURS.map((c) => (
                <button
                  key={c}
                  className={`pool-pick pick-${c} ${colour === c ? "is-on" : ""}`}
                  onClick={() => setColour(c)}
                  disabled={!!mine || !!done}
                  aria-pressed={colour === c}
                >
                  <span className={`orb orb-${c}`} />
                  <span className="pool-name">{NAME[c]}</span>
                  <span className="pool-rule faint">{VERB[c]} {BEATS[c]}</span>
                  <span className="pool-hidden mono">pool hidden</span>
                </button>
              ))}
            </div>

            <div className="boo-meta mono">
              <span>{field.length + (mine ? 1 : 0)} stakes</span>
              <span>closes 20:00–22:00 at a random minute</span>
              {minutes < 20 * 60 && <span>window opens in {windowLeft.h}h {pad(windowLeft.m)}m</span>}
            </div>

            {done ? (
              <div className="boo-done">
                {result ? <ResolutionView res={result.res} you={s.name} stake={result.stake} /> : <p>You played today: <b className={`t-${done.colour}`}>{done.colour}</b>, {done.payout > 0 ? <>won <Dragons value={done.payout} /></> : "no payout"}. Next round opens at midnight.</p>}
                {drop && (
                  <div className="drop">
                    <SpiritCard card={drop} size="sm" />
                    <p>A {byId(drop.spirit).element} spirit dropped for backing {done.colour}.</p>
                  </div>
                )}
              </div>
            ) : mine ? (
              <div className="boo-mine">
                <p>You backed <b className={`t-${mine.colour}`}>{NAME[mine.colour]}</b> with <Dragons value={mine.amount} />. Stakes are final.</p>
                <button className="btn" onClick={closeNow}>Close today's round now <span className="faint">(mockup)</span></button>
              </div>
            ) : (
              <div className="boo-stake">
                <label className="field" htmlFor="boo-amount">
                  <span className="faint">Stake</span>
                  <Dragons value={amount} className="boo-amount" />
                </label>
                <input id="boo-amount" type="range" min={500} max={50000} step={500} value={amount} onChange={(e) => setAmount(+e.target.value)} />
                <div className="presets">
                  {[1000, 2000, 5000, 10000, 25000].map((v) => <button key={v} className="btn btn-sm" onClick={() => setAmount(v)}>{fmt(v)}</button>)}
                </div>
                <button className={`btn btn-primary btn-lg btn-block back-${colour}`} onClick={() => requireAccount(() => setConfirm(true))}>
                  Back {NAME[colour]} · <Dragons value={amount} />
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="boo-side">
          <section className="panel">
            <div className="panel-head"><h3>The cycle</h3></div>
            <div className="panel-body"><Cycle /></div>
          </section>
          <section className="panel">
            <div className="panel-head"><h3>Why it's hard to cheat</h3></div>
            <ul className="why">
              <li><b>Stake decides, not head count.</b> Alt accounts add nothing.</li>
              <li><b>Splitting costs you.</b> Payouts weigh each stake by c<sup>1.5</sup>, so one stake spread over four accounts earns half as much.</li>
              <li><b>Colluding backfires.</b> A group that piles onto one colour makes it big, and big pools have to fight.</li>
              <li><b>No sniping.</b> Pools are hidden and the round closes at a random minute.</li>
            </ul>
          </section>
          <section className="panel">
            <div className="panel-head"><h3>Your streak</h3><span className="num">{s.booStreak}</span></div>
            <div className="panel-body streak">
              {[0, 1, 2].map((i) => <i key={i} className={i < s.booStreak ? "on" : ""} />)}
              <span className="faint">Three wins in a row makes you Champion.</span>
            </div>
          </section>
        </aside>

        <section className="panel boo-practice">
          <div className="panel-head">
            <h2>Practice round</h2>
            <button className="btn btn-sm" onClick={runPractice}>Run one with {NAME[colour]} · {fmt(amount)}</button>
          </div>
          <div className="panel-body">
            {practice ? <ResolutionView res={practice.res} you="you" stake={practice.stake} /> : <p className="muted">Play a round against a random field without staking anything. Pick a colour and amount above.</p>}
          </div>
        </section>
      </div>

      <EntryModal
        open={confirm}
        onClose={() => setConfirm(false)}
        slug="blue-or-orange"
        amount={amount}
        title={`Back ${NAME[colour]}`}
        detail="One colour per day. Stakes are final and hidden until the round closes."
        confirmLabel="Back it"
        onEntered={() => setState({ boo: { date: today, colour, amount, at: Date.now() } })}
      />
    </div>
  );
}

