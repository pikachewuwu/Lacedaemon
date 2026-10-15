import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { addCards, payout, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { MEMBERS, hueFor } from "../app/members";
import { fmt } from "../app/format";
import { programBySlug, splitEntry } from "../economy/modules";
import { MonopolyGame, botStep } from "../games/monopoly/game";
import { BOARD, GROUPS, PIT_FINE, isOwnable } from "../games/monopoly/board";
import { byId, rollDrop, type CardInstance } from "../games/spirits/catalog";
import { defaultRand } from "../games/rng";
import { Avatar, Dragons } from "../ui/kit";
import { EntryModal, ModuleLine } from "../ui/Entry";
import { SpiritCard } from "../ui/SpiritCard";

const ENTRY = 10_000;
const ROUNDS = 30;
const D = "₯";

/** Board index to grid cell (1-based row/col on an 11×11 grid). */
function cell(i: number): { row: number; col: number; side: "b" | "l" | "t" | "r" | "c" } {
  if (i === 0) return { row: 11, col: 11, side: "c" };
  if (i < 10) return { row: 11, col: 11 - i, side: "b" };
  if (i === 10) return { row: 11, col: 1, side: "c" };
  if (i < 20) return { row: 11 - (i - 10), col: 1, side: "l" };
  if (i === 20) return { row: 1, col: 1, side: "c" };
  if (i < 30) return { row: 1, col: 1 + (i - 20), side: "t" };
  if (i === 30) return { row: 1, col: 11, side: "c" };
  return { row: 1 + (i - 30), col: 11, side: "r" };
}

const Die = ({ n }: { n: number }) => (
  <span className="die" aria-label={`Die showing ${n}`}>
    {[...Array(9)].map((_, k) => {
      const on = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[n]!.includes(k);
      return <i key={k} className={on ? "on" : ""} />;
    })}
  </span>
);

function Game({ onDone }: { onDone: (standings: string[]) => void }) {
  const name = useStore((s) => s.name);
  const game = useMemo(() => {
    const bots = [...MEMBERS].sort(() => Math.random() - 0.5).slice(0, 3);
    const players = [{ id: "you", name, human: true }, ...bots.map((b) => ({ id: b.id, name: b.name, human: false }))];
    return new MonopolyGame(players, { maxRounds: ROUNDS, startingCash: 1500, rand: defaultRand });
  }, [name]);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [fast, setFast] = useState(false);
  const [deed, setDeed] = useState<number | null>(null);
  const finished = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const me = 0;

  // On narrow screens the board scrolls sideways; start centred on the dice.
  useEffect(() => {
    const el = wrap.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  useEffect(() => {
    if (game.phase === "over") {
      if (!finished.current) {
        finished.current = true;
        setTimeout(() => onDone(game.standings().map((i) => game.players[i].name)), 1400);
      }
      return;
    }
    const humanTurn = game.current.human && !game.current.bankrupt;
    if (humanTurn) return;
    const t = setTimeout(() => {
      if (game.current.human && game.current.bankrupt) game.endTurn();
      else botStep(game);
      rerender();
    }, fast || game.players[me].bankrupt ? 90 : 520);
    return () => clearTimeout(t);
  });

  const act = (fn: () => void) => {
    fn();
    rerender();
  };
  const p = game.current;
  const myTurn = p.human && game.phase !== "over";
  const sq = BOARD[p.pos];
  const tokens: Record<number, number[]> = {};
  game.players.forEach((pl, i) => !pl.bankrupt && (tokens[pl.pos] ??= []).push(i));
  const dd = deed !== null ? BOARD[deed] : null;
  const dDeed = deed !== null ? game.deeds[deed] : null;

  return (
    <div className="mono-game">
      <div className="board-wrap" ref={wrap}>
        <div className="mboard">
          {BOARD.map((s, i) => {
            const c = cell(i);
            const d = game.deeds[i];
            const owner = d?.owner ?? null;
            return (
              <button
                key={i}
                className={`sq sq-${c.side} sq-${s.kind} ${game.landed === i ? "is-landed" : ""} ${d?.mortgaged ? "is-mortgaged" : ""}`}
                style={{ gridRow: c.row, gridColumn: c.col }}
                onClick={() => isOwnable(s) && setDeed(i)}
                aria-label={s.name}
              >
                {s.kind === "property" && <span className="sq-band" style={{ background: GROUPS[s.group].color }} />}
                <span className="sq-name">{s.name}</span>
                {isOwnable(s) && <span className="sq-price num">{D}{s.price}</span>}
                {s.kind === "tax" && <span className="sq-price num">{D}{s.amount}</span>}
                {owner !== null && <span className="sq-owner" style={{ background: `hsl(${hueFor(game.players[owner].name)} 55% 60%)` }} />}
                {d && d.houses > 0 && (
                  <span className="sq-houses">{d.houses === 5 ? <i className="hotel" /> : [...Array(d.houses)].map((_, k) => <i key={k} />)}</span>
                )}
                {tokens[i] && (
                  <span className="sq-tokens">
                    {tokens[i].map((pi) => (
                      <i key={pi} className={`token ${game.players[pi].human ? "is-you" : ""}`} style={{ ["--h" as string]: hueFor(game.players[pi].name) }} title={game.players[pi].name} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
          <div className="mcenter">
            <span className="mc-word display">Lacedaemon</span>
            <span className="label">round {Math.min(game.round, ROUNDS)} of {ROUNDS}</span>
            <div className="mc-dice">{game.dice ? <><Die n={game.dice[0]} /><Die n={game.dice[1]} /></> : <span className="faint mono">roll</span>}</div>
            {game.card && (
              <div className="mc-card">
                <span className="label">{game.card.deck}</span>
                <p>{game.card.text}</p>
              </div>
            )}
            <div className="mc-turn">
              <Avatar name={p.name} you={p.human} />
              <span>{p.human ? "Your turn" : `${p.name}'s turn`}</span>
            </div>
            {myTurn && (
              <div className="mc-actions">
                {game.phase === "pit" && (
                  <>
                    <button className="btn" onClick={() => act(() => game.payToLeavePit())} disabled={p.passes === 0 && p.cash < PIT_FINE}>
                      {p.passes > 0 ? "Use pardon" : `Pay ${D}${PIT_FINE}`}
                    </button>
                    <button className="btn btn-primary" onClick={() => act(() => game.roll())}>Roll for doubles</button>
                  </>
                )}
                {game.phase === "roll" && <button className="btn btn-primary btn-lg" onClick={() => act(() => game.roll())}>Roll</button>}
                {game.phase === "buy" && isOwnable(sq) && (
                  <>
                    <button className="btn btn-primary" onClick={() => act(() => game.buy())} disabled={p.cash < sq.price}>Buy {sq.name} · {D}{sq.price}</button>
                    <button className="btn" onClick={() => act(() => game.pass())}>Pass</button>
                  </>
                )}
                {game.phase === "end" && <button className="btn btn-primary" onClick={() => act(() => game.endTurn())}>End turn</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="mono-side">
        <div className="mono-side-head">
          <span className="label">Players</span>
          <label className="toggle"><input id="mono-fast" type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> Fast bots</label>
        </div>
        <ul className="mplayers">
          {game.players.map((pl, i) => (
            <li key={pl.id} className={`${i === game.turn ? "is-turn" : ""} ${pl.bankrupt ? "is-out" : ""}`}>
              <Avatar name={pl.name} you={pl.human} />
              <div className="mp-info">
                <span className="mp-name">{pl.name}{pl.inPit && <span className="chip">in the Pit</span>}</span>
                <span className="mp-props">
                  {game.owned(i).map((k) => {
                    const s = BOARD[k];
                    return <i key={k} title={s.name} style={{ background: s.kind === "property" ? GROUPS[s.group].color : "var(--text-3)" }} className={game.deeds[k].mortgaged ? "m" : ""} onClick={() => setDeed(k)} />;
                  })}
                </span>
              </div>
              <div className="mp-money">
                <span className="num">{pl.bankrupt ? "bankrupt" : `${D}${fmt(pl.cash)}`}</span>
                {!pl.bankrupt && <span className="num faint">worth {D}{fmt(game.netWorth(i))}</span>}
              </div>
            </li>
          ))}
        </ul>

        {dd && dDeed && isOwnable(dd) && (
          <div className="deed">
            <div className="deed-head" style={{ background: dd.kind === "property" ? GROUPS[dd.group].color : "var(--bg-4)" }}>
              <span>{dd.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeed(null)} aria-label="Close">×</button>
            </div>
            <div className="deed-body">
              {dd.kind === "property" ? (
                <table className="deed-rents num">
                  <tbody>
                    {["Rent", "1 house", "2 houses", "3 houses", "4 houses", "Hotel"].map((l, k) => (
                      <tr key={l} className={dDeed.houses === k && dDeed.owner !== null ? "is-now" : ""}><td>{l}</td><td>{D}{dd.rent[k]}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="faint">{dd.kind === "road" ? "Rent 25, 50, 100, 200 for one to four roads." : "Four times the dice, ten times with both."}</p>
              )}
              <p className="faint deed-owner">{dDeed.owner === null ? "For sale" : `Owned by ${game.players[dDeed.owner].name}`}{dDeed.mortgaged ? " · mortgaged" : ""}</p>
              {dDeed.owner === me && myTurn && (
                <div className="deed-actions">
                  {dd.kind === "property" && <button className="btn btn-sm" disabled={!game.canBuild(me, deed!)} onClick={() => act(() => game.build(me, deed!))}>Build · {D}{GROUPS[dd.group].house}</button>}
                  {dd.kind === "property" && <button className="btn btn-sm" disabled={!game.canSellHouse(me, deed!)} onClick={() => act(() => game.sellHouse(me, deed!))}>Sell house</button>}
                  {dDeed.mortgaged ? (
                    <button className="btn btn-sm" onClick={() => act(() => game.unmortgage(me, deed!))}>Lift mortgage · {D}{game.unmortgageCost(deed!)}</button>
                  ) : (
                    <button className="btn btn-sm" disabled={!game.canMortgage(me, deed!)} onClick={() => act(() => game.mortgage(me, deed!))}>Mortgage · +{D}{dd.price / 2}</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <ol className="mlog mono">
          {game.log.slice(-12).reverse().map((l, i) => <li key={i}>{l}</li>)}
        </ol>
      </aside>
    </div>
  );
}

export function MonopolyPage() {
  const [playing, setPlaying] = useState(false);
  const [entry, setEntry] = useState(false);
  const [result, setResult] = useState<{ standings: string[]; drop: CardInstance | null } | null>(null);
  const name = useStore((s) => s.name);
  const prize = splitEntry(programBySlug("monopoly"), ENTRY).pot * 4;
  const groups = Object.entries(GROUPS);

  return (
    <div className="monopoly-page">
      <header className="page-head">
        <div>
          <p className="label">The Laconian board</p>
          <h1 className="display page-title">Monopoly</h1>
          {!playing && <p className="muted">Classic rules on a board of Laconia: from the marshes of Helos to the Throne of Apollo. {ROUNDS} rounds, then the richest player wins. Money on the board is drachmae; the prize is dragons.</p>}
        </div>
        {playing ? <button className="btn" onClick={() => { setPlaying(false); setResult(null); }}>Leave game</button> : <ModuleLine slug="monopoly" />}
      </header>

      {playing && !result && (
        <Game
          onDone={(standings) => {
            const won = standings[0] === name;
            payout("monopoly", won ? prize : 0, "Won a game of Monopoly", won);
            const drop = rollDrop(defaultRand, "Monopoly");
            if (drop) addCards([drop], "Card drop after a game", "drop");
            setResult({ standings, drop });
          }}
        />
      )}
      {result && (
        <div className="results panel">
          <div className="results-head">
            <span className="label">Final standings</span>
            <h2 className="display">{result.standings[0] === name ? "The board is yours." : `${result.standings[0]} owns Laconia.`}</h2>
            {result.standings[0] === name && <p>Prize: <Dragons value={prize} className="pos" /></p>}
          </div>
          <ol className="standings">
            {result.standings.map((n, i) => <li key={n} className={n === name ? "is-you" : ""}><span className="num faint">{i + 1}</span><Avatar name={n} you={n === name} /> {n}</li>)}
          </ol>
          {result.drop && <div className="drop"><SpiritCard card={result.drop} size="sm" /><p>A card dropped: <b>{byId(result.drop.spirit).name}</b>.</p></div>}
          <button className="btn btn-primary" onClick={() => { setPlaying(false); setResult(null); }}>Back</button>
        </div>
      )}
      {!playing && (
        <div className="mono-intro">
          <button className="room" onClick={() => requireAccount(() => setEntry(true))}>
            <span className="label">Table for four</span>
            <h2>You and three others</h2>
            <p className="muted">Every dragon of every entry goes back to the winner. The owner of this module takes nothing and is paid only by the Arbiter.</p>
            <span className="room-foot"><Dragons value={ENTRY} /> entry · prize <Dragons value={prize} /> <span className="room-cta">Play →</span></span>
          </button>
          <div className="panel groups">
            <div className="panel-head"><h3>The streets</h3></div>
            <ul>
              {groups.map(([g, v]) => (
                <li key={g}>
                  <i style={{ background: v.color }} />
                  <span>{BOARD.filter((s) => s.kind === "property" && s.group === g).map((s) => s.name).join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <EntryModal open={entry} onClose={() => setEntry(false)} slug="monopoly" amount={ENTRY} title="Monopoly · table for four" confirmLabel="Sit down" onEntered={() => setPlaying(true)} />
    </div>
  );
}
