import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { PokerTable } from "../games/poker/table";
import { decide, STYLES, type BotStyle } from "../games/poker/bots";
import { cardLabel, isRed, rankOf, suitOf, RANKS, SUIT_GLYPH, type Card } from "../games/poker/cards";
import { defaultRand } from "../games/rng";
import { fmt } from "../app/format";
import { track } from "../app/store";
import { Avatar } from "./kit";

export function PlayingCard({ card, down = false, small = false, highlight = false }: { card?: Card; down?: boolean; small?: boolean; highlight?: boolean }) {
  if (down || card === undefined) return <span className={`pcard is-down ${small ? "is-small" : ""}`} aria-label="Face-down card" />;
  const r = RANKS[rankOf(card)];
  return (
    <span className={`pcard ${isRed(card) ? "is-red" : ""} ${small ? "is-small" : ""} ${highlight ? "is-hl" : ""}`} aria-label={cardLabel(card)}>
      <span className="pc-r">{r === "T" ? "10" : r}</span>
      <span className="pc-s">{SUIT_GLYPH[suitOf(card)]}</span>
    </span>
  );
}

export interface Player {
  id: string;
  name: string;
  human: boolean;
}

const styleFor = (name: string): BotStyle => {
  const all = Object.values(STYLES);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return all[h % all.length];
};

/** Seat coordinates on the oval, human always at the bottom. */
function seatPos(i: number, n: number, human: number) {
  const k = (i - human + n) % n;
  const angle = Math.PI / 2 + (k / n) * Math.PI * 2;
  return { left: `${50 + Math.cos(angle) * 46}%`, top: `${50 + Math.sin(angle) * 42}%` };
}

export function PokerTableView({
  players,
  startingStack,
  handsPerLevel,
  onFinish,
  title,
}: {
  players: Player[];
  startingStack: number;
  handsPerLevel: number;
  onFinish: (standings: string[]) => void;
  title: string;
}) {
  const table = useMemo(() => new PokerTable(players, { startingStack, handsPerLevel, rand: defaultRand }), [players, startingStack, handsPerLevel]);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [fast, setFast] = useState(false);
  const [raiseTo, setRaiseTo] = useState(0);
  const finished = useRef(false);
  const human = players.findIndex((p) => p.human);

  // Drive the table: deal, let bots act, pause between hands.
  useEffect(() => {
    if (finished.current) return;
    let t: ReturnType<typeof setTimeout>;
    if (table.handNo === 0) {
      t = setTimeout(() => { table.startHand(); rerender(); }, 400);
    } else if (table.handOver) {
      if (table.gameOver) {
        finished.current = true;
        t = setTimeout(() => onFinish(table.standings().map((i) => table.seats[i].name)), 1600);
      } else {
        const humanOut = table.seats[human]?.out;
        t = setTimeout(() => {
          if (!humanOut) track("poker_hand");
          table.startHand();
          rerender();
        }, humanOut || fast ? 900 : 2600);
      }
    } else if (table.toAct >= 0 && !table.seats[table.toAct].human) {
      const delay = fast || table.seats[human]?.out ? 160 : 650 + Math.random() * 700;
      t = setTimeout(() => {
        table.act(decide(table, table.toAct, styleFor(table.seats[table.toAct].name), defaultRand));
        rerender();
      }, delay);
    }
    return () => clearTimeout(t);
  });

  const me = table.seats[human];
  const myTurn = !table.handOver && table.toAct === human;
  const legal = myTurn ? table.legal(human) : null;
  useEffect(() => {
    if (legal) setRaiseTo(legal.minRaiseTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurn, table.street, table.currentBet]);

  const act = (a: Parameters<PokerTable["act"]>[0]) => {
    table.act(a);
    rerender();
  };
  const winners = new Set(table.result?.awards.flatMap((a) => a.winners) ?? []);
  const bestCards = new Set(table.result?.showdown ? Object.entries(table.result.hands).filter(([i]) => winners.has(+i)).flatMap(([, h]) => h.best) : []);
  const [sb, bb] = table.blinds;
  const potPreview = table.pot;

  return (
    <div className="poker">
      <div className="poker-head">
        <div className="mono faint">{title} · hand {table.handNo} · blinds {sb}/{bb}</div>
        <label className="toggle"><input id="poker-fast" type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> Fast bots</label>
      </div>
      <div className="felt-wrap">
        <div className="felt">
          <div className="felt-light" aria-hidden="true" />
          <div className="felt-center">
            <div className="cboard">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="board-slot">{table.board[i] !== undefined && <PlayingCard card={table.board[i]} highlight={bestCards.has(table.board[i])} />}</span>
              ))}
            </div>
            <div className="pot num">Pot {fmt(potPreview)}</div>
            {table.result && (
              <div className="hand-result">
                {table.result.awards.map((a, i) => (
                  <span key={i}>{a.winners.map((w) => table.seats[w].name).join(" & ")} {a.winners.length > 1 ? "split" : "wins"} {fmt(a.amount)}{a.hand ? ` · ${a.hand}` : ""}</span>
                ))}
              </div>
            )}
          </div>
          {table.seats.map((s, i) => {
            const showCards = s.human || (table.result?.showdown && !s.folded && !s.out);
            return (
              <div key={s.id} className={`seat ${i === table.toAct ? "is-turn" : ""} ${s.folded ? "is-folded" : ""} ${s.out ? "is-out" : ""} ${winners.has(i) ? "is-winner" : ""}`} style={seatPos(i, table.seats.length, human)}>
                <div className="seat-cards">
                  {s.hole.map((c, j) => <PlayingCard key={j} card={c} down={!showCards} small={!s.human} highlight={bestCards.has(c)} />)}
                </div>
                <div className="seat-plate">
                  <Avatar name={s.name} you={s.human} />
                  <div className="seat-info">
                    <span className="seat-name">{s.name}{i === table.dealer && <span className="dealer" title="Dealer">D</span>}</span>
                    <span className="seat-stack num">{s.out ? "out" : fmt(s.stack)}</span>
                  </div>
                </div>
                {s.lastAction && !s.out && <span className="seat-action mono">{s.lastAction}</span>}
                {s.bet > 0 && <span className="seat-bet num">{fmt(s.bet)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="action-bar">
        {myTurn && legal ? (
          <>
            <button className="btn btn-lg" onClick={() => act({ type: "fold" })}>Fold</button>
            <button className="btn btn-lg" onClick={() => act({ type: legal.canCheck ? "check" : "call" })}>
              {legal.canCheck ? "Check" : `Call ${fmt(legal.toCall)}`}
            </button>
            {legal.canRaise && (
              <div className="raise">
                <div className="raise-presets">
                  {[["½ pot", 0.5], ["¾ pot", 0.75], ["Pot", 1]].map(([label, f]) => (
                    <button key={label as string} className="btn btn-sm" onClick={() => setRaiseTo(Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, Math.round(table.currentBet + (legal.pot + legal.toCall) * (f as number)))))}>
                      {label}
                    </button>
                  ))}
                  <button className="btn btn-sm" onClick={() => setRaiseTo(legal.maxRaiseTo)}>All-in</button>
                </div>
                <input id="raise" type="range" min={legal.minRaiseTo} max={legal.maxRaiseTo} step={Math.max(1, bb / 2)} value={raiseTo} onChange={(e) => setRaiseTo(+e.target.value)} aria-label="Raise amount" />
                <button className="btn btn-primary btn-lg" onClick={() => act({ type: "raise", to: raiseTo })}>
                  {raiseTo >= legal.maxRaiseTo ? "All-in" : table.currentBet === 0 ? "Bet" : "Raise to"} {fmt(raiseTo)}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="mono faint">
            {me?.out ? "You're out. The table plays on." : table.handOver ? "Next hand…" : table.toAct >= 0 ? `${table.seats[table.toAct].name} is thinking…` : "Dealing…"}
          </p>
        )}
      </div>

      <details className="poker-log">
        <summary className="label">Hand log</summary>
        <ol className="mono">
          {table.log.slice(-14).reverse().map((l, i) => <li key={i}>{l}</li>)}
        </ol>
      </details>
    </div>
  );
}
