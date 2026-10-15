import { useMemo, useState } from "react";
import { payout, setState, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { MEMBERS } from "../app/members";
import { go } from "../app/router";
import { alive, botPick, clash, elo, fighter, multiplier, outcome, type Clash, type Fighter } from "../games/arena";
import { byId, SPIRITS } from "../games/spirits/catalog";
import { defaultRand, hashSeed, seeded } from "../games/rng";
import { Avatar, Dragons, toast } from "../ui/kit";
import { ELEMENT_LABEL, SpiritArt, SpiritCard } from "../ui/SpiritCard";

const LOANERS = ["nerilla", "emberkid", "sproutling"];
const WIN_PRIZE = 1500;

const VERDICT = (m: number) => (m >= 1.6 ? "It's devastating." : m <= 0.6 ? "It barely lands." : m > 1 ? "Aether cuts through." : "");

function Hp({ f }: { f: Fighter }) {
  const pct = (f.hp / f.max) * 100;
  return (
    <span className="hp">
      <i style={{ width: `${pct}%` }} className={pct < 30 ? "low" : pct < 60 ? "mid" : ""} />
      <b className="num">{f.hp}/{f.max}</b>
    </span>
  );
}

function ladder(myRating: number, me: string) {
  const rows = MEMBERS.map((m) => ({ name: m.name, rating: 900 + (hashSeed("elo" + m.name) % 420) }));
  return [...rows, { name: me, rating: myRating, you: true }].sort((a, b) => b.rating - a.rating);
}

export function ArenaPage() {
  const s = useStore((x) => x);
  const uniq = useMemo(() => [...new Set(s.cards.map((c) => c.spirit))], [s.cards]);
  const [team, setTeam] = useState<string[]>(() => (s.arena.team.length === 3 ? s.arena.team : []));
  const [battle, setBattle] = useState<{ you: Fighter[]; them: Fighter[]; foe: string; foeRating: number; log: string[]; last: Clash | null } | null>(null);
  const [result, setResult] = useState<{ r: "win" | "loss" | "draw"; delta: number } | null>(null);

  const pickTeam = (id: string) => setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < 3 ? [...t, id] : t));
  const useLoan = uniq.length < 3;

  const start = () =>
    requireAccount(() => {
      const mine = useLoan ? LOANERS : team;
      if (mine.length !== 3) return toast("Pick three spirits", "bad");
      setState((st) => ({ arena: { ...st.arena, team: mine } }));
      const r = seeded((Date.now() & 0xffff) ^ 0x2a);
      const foe = MEMBERS[Math.floor(r() * MEMBERS.length)];
      const foeRating = 900 + (hashSeed("elo" + foe.name) % 420);
      const pool = SPIRITS.filter((x) => x.rarity === "common" || x.rarity === "uncommon" || (foeRating > 1150 && x.rarity === "rare"));
      const theirs = Array.from({ length: 3 }, () => pool[Math.floor(r() * pool.length)].id);
      setBattle({ you: mine.map(fighter), them: theirs.map(fighter), foe: foe.name, foeRating, log: [`${foe.name} accepts the duel.`], last: null });
      setResult(null);
    });

  const step = (yi: number) => {
    if (!battle || result) return;
    const you = battle.you.map((f) => ({ ...f }));
    const them = battle.them.map((f) => ({ ...f }));
    const ti = botPick(them, you, defaultRand);
    const c = clash(you, them, yi, ti, defaultRand);
    const ys = byId(you[yi].spirit), ts = byId(them[ti].spirit);
    const line = `${ys.name} meets ${ts.name}: ${ys.move} for ${c.dealt}. ${VERDICT(multiplier(ys.element, ts.element))} ${ts.move} for ${c.taken}.`;
    const log = [line, ...battle.log].slice(0, 12);
    const o = outcome(you, them);
    setBattle({ ...battle, you, them, log, last: c });
    if (o) {
      const score = o === "win" ? 1 : o === "draw" ? 0.5 : 0;
      const rating = elo(s.arena.rating, battle.foeRating, score);
      setState((st) => ({ arena: { ...st.arena, rating, wins: st.arena.wins + (o === "win" ? 1 : 0), losses: st.arena.losses + (o === "loss" ? 1 : 0) } }));
      payout("arena", o === "win" ? WIN_PRIZE : 0, `Arena: beat ${battle.foe}`, o === "win");
      setResult({ r: o, delta: rating - s.arena.rating });
    }
  };

  const yourFront = battle?.last ? battle.you[battle.last.you] : null;
  const theirFront = battle?.last ? battle.them[battle.last.them] : null;

  return (
    <div className="arena-page">
      <header className="page-head">
        <div>
          <p className="label">Spirits · ranked duels</p>
          <h1 className="display page-title">Arena</h1>
          <p className="muted">Three spirits a side. Each turn you both choose, in secret, who steps forward. Water beats fire, fire beats grass, grass beats water. Guess what they'll send.</p>
        </div>
        <div className="arena-rating">
          <span className="label">Your rating</span>
          <span className="display arena-elo">{s.arena.rating}</span>
          <span className="faint num">{s.arena.wins}–{s.arena.losses}</span>
        </div>
      </header>

      {!battle && (
        <div className="arena-setup">
          <section className="panel">
            <div className="panel-head">
              <h2>Your team</h2>
              <span className="label">{useLoan ? "loaned · you need 3 different spirits" : `${team.length}/3 picked`}</span>
            </div>
            <div className="panel-body team-pick">
              {(useLoan ? LOANERS : uniq).map((id) => (
                <SpiritCard key={id} spiritId={id} size="sm" selected={useLoan || team.includes(id)} onClick={useLoan ? undefined : () => pickTeam(id)} />
              ))}
            </div>
            <div className="panel-foot">
              {useLoan ? <span className="faint">Open packs to fight with your own spirits. <button className="link" onClick={() => go("spirits")}>Spirits</button></span> : <span className="faint">Mix elements so nothing counters you twice.</span>}
              <button className="btn btn-primary" onClick={start}>Find a duel</button>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Ladder</h2><span className="faint">example ratings</span></div>
            <ol className="ladder">
              {ladder(s.arena.rating, s.name).map((r, i) => (
                <li key={r.name} className={"you" in r ? "is-you" : ""}><span className="num faint">{i + 1}</span><Avatar name={r.name} you={"you" in r} /> {r.name}<span className="num">{r.rating}</span></li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {battle && (
        <div className="battle">
          <div className="arena-floor">
            <div className="side side-you">
              <span className="label">you</span>
              {yourFront ? (
                <div className={`front ${yourFront.hp === 0 ? "is-down" : ""}`} key={`y${battle.log.length}`}>
                  <div className={`front-art e-${byId(yourFront.spirit).element}`}><SpiritArt spirit={byId(yourFront.spirit)} /></div>
                  <span className="front-name display">{byId(yourFront.spirit).name}</span>
                  <Hp f={yourFront} />
                  {battle.last && <span className="dmg num">−{battle.last.taken}</span>}
                </div>
              ) : <div className="front front-empty display">?</div>}
            </div>
            <div className="versus display">vs</div>
            <div className="side side-them">
              <span className="label">{battle.foe} · {battle.foeRating}</span>
              {theirFront ? (
                <div className={`front ${theirFront.hp === 0 ? "is-down" : ""}`} key={`t${battle.log.length}`}>
                  <div className={`front-art e-${byId(theirFront.spirit).element}`}><SpiritArt spirit={byId(theirFront.spirit)} /></div>
                  <span className="front-name display">{byId(theirFront.spirit).name}</span>
                  <Hp f={theirFront} />
                  {battle.last && <span className="dmg num">−{battle.last.dealt}</span>}
                </div>
              ) : <div className="front front-empty display">?</div>}
            </div>
          </div>

          <div className="benches">
            <div className="bench">
              <span className="label">{result ? "Your spirits" : "Who steps forward?"}</span>
              <div className="bench-row">
                {battle.you.map((f, i) => (
                  <button key={i} className={`bench-card e-${byId(f.spirit).element}`} disabled={f.hp === 0 || !!result} onClick={() => step(i)}>
                    <SpiritArt spirit={byId(f.spirit)} />
                    <span className="bench-name">{byId(f.spirit).name}</span>
                    <span className="faint bench-el">{ELEMENT_LABEL[byId(f.spirit).element]} · {byId(f.spirit).power}</span>
                    <Hp f={f} />
                  </button>
                ))}
              </div>
            </div>
            <div className="bench bench-them">
              <span className="label">{battle.foe}'s spirits</span>
              <div className="bench-row">
                {battle.them.map((f, i) => (
                  <div key={i} className={`bench-card is-static e-${byId(f.spirit).element} ${f.hp === 0 ? "is-down" : ""}`}>
                    <SpiritArt spirit={byId(f.spirit)} />
                    <span className="bench-name">{byId(f.spirit).name}</span>
                    <span className="faint bench-el">{ELEMENT_LABEL[byId(f.spirit).element]} · {byId(f.spirit).power}</span>
                    <Hp f={f} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {result && (
            <div className={`arena-result is-${result.r}`}>
              <h2 className="display">{result.r === "win" ? "Victory." : result.r === "draw" ? "Both sides fall." : `${battle.foe} wins.`}</h2>
              <p>
                Rating {result.delta >= 0 ? "+" : ""}{result.delta}. {result.r === "win" && <>Prize <Dragons value={WIN_PRIZE} />.</>}
              </p>
              <div className="nego-actions">
                <button className="btn" onClick={() => setBattle(null)}>Change team</button>
                <button className="btn btn-primary" onClick={start}>Next duel</button>
              </div>
            </div>
          )}

          <ol className="battle-log mono">{battle.log.map((l, i) => <li key={battle.log.length - i}>{l}</li>)}</ol>
          {!result && <p className="faint" style={{ fontSize: "var(--t-xs)" }}>{alive(battle.you).length} of yours standing · {alive(battle.them).length} of theirs</p>}
        </div>
      )}
    </div>
  );
}
