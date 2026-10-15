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
import { Avatar, Dragons, Mark } from "../ui/kit";
import { EntryModal, ModuleLine } from "../ui/Entry";
import { SpiritCard } from "../ui/SpiritCard";
import { Board, PIECES, Piece } from "../ui/MonopolyBoard";

const ENTRY = 10_000;
const ROUNDS = 30;
const D = "₯";

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
  const [tilt, setTilt] = useState(() => typeof window === "undefined" || window.innerWidth > 900);
  // Pieces hop square by square toward where the rules put them.
  const [shown, setShown] = useState<number[]>(() => game.players.map((p) => p.pos));
  const moving = shown.some((pos, i) => pos !== game.players[i].pos);
  useEffect(() => {
    if (!moving) return;
    const t = setTimeout(() => {
      setShown((cur) => cur.map((pos, i) => {
        const target = game.players[i].pos;
        if (pos === target) return pos;
        const ahead = (target - pos + 40) % 40;
        return ahead > 12 || fast ? target : (pos + 1) % 40; // long jumps (cards, the Pit) teleport
      }));
    }, fast ? 40 : 120);
    return () => clearTimeout(t);
  });
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
    if (humanTurn || moving) return;
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
  const dd = deed !== null ? BOARD[deed] : null;
  const dDeed = deed !== null ? game.deeds[deed] : null;

  return (
    <div className="mono-game">
      <div className="board-wrap" ref={wrap}>
        <Board game={game} shown={shown} onDeed={setDeed} tilt={tilt}>
          <div className="mc-meander" aria-hidden="true" />
          <Mark size={46} />
          <span className="mc-word display">Lacedaemon</span>
          <span className="label">round {Math.min(game.round, ROUNDS)} of {ROUNDS}</span>
          <div className="mc-dice">{game.dice ? <><Die n={game.dice[0]} key={`a${game.log.length}`} /><Die n={game.dice[1]} key={`b${game.log.length}`} /></> : <span className="faint mono">roll the dice</span>}</div>
          {game.card && (
            <div className="mc-card">
              <span className="label">{game.card.deck}</span>
              <p>{game.card.text}</p>
            </div>
          )}
          <div className="mc-turn">
            <Piece kind={PIECES[game.turn % 4]} color={p.human ? "#f4a35f" : `hsl(${hueFor(p.name)} 55% 66%)`} size={20} />
            <span>{p.human ? "Your turn" : `${p.name}'s turn`}</span>
          </div>
          {myTurn && !moving && (
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
        </Board>
      </div>

      <aside className="mono-side">
        <div className="mono-side-head">
          <span className="label">Players</span>
          <span className="mono-toggles">
            <label className="toggle"><input id="mono-tilt" type="checkbox" checked={tilt} onChange={(e) => setTilt(e.target.checked)} /> Tilt</label>
            <label className="toggle"><input id="mono-fast" type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> Fast bots</label>
          </span>
        </div>
        <ul className="mplayers">
          {game.players.map((pl, i) => (
            <li key={pl.id} className={`${i === game.turn ? "is-turn" : ""} ${pl.bankrupt ? "is-out" : ""}`}>
              <span className="mp-piece"><Piece kind={PIECES[i % 4]} color={pl.human ? "#f4a35f" : `hsl(${hueFor(pl.name)} 55% 66%)`} size={26} /></span>
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
