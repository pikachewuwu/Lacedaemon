import type { ReactNode } from "react";
import { BOARD, GROUPS, isOwnable } from "../games/monopoly/board";
import type { MonopolyGame } from "../games/monopoly/game";
import { hueFor } from "../app/members";

/** Board index to grid cell (1-based row/col on an 11×11 grid). */
export function cell(i: number): { row: number; col: number; side: "b" | "l" | "t" | "r" | "c" } {
  if (i === 0) return { row: 11, col: 11, side: "c" };
  if (i < 10) return { row: 11, col: 11 - i, side: "b" };
  if (i === 10) return { row: 11, col: 1, side: "c" };
  if (i < 20) return { row: 11 - (i - 10), col: 1, side: "l" };
  if (i === 20) return { row: 1, col: 1, side: "c" };
  if (i < 30) return { row: 1, col: 1 + (i - 20), side: "t" };
  if (i === 30) return { row: 1, col: 11, side: "c" };
  return { row: 1 + (i - 30), col: 11, side: "r" };
}

/** Greek game pieces, one per seat. */
export const PIECES = ["helmet", "shield", "trireme", "owl"] as const;

export function Piece({ kind, color, size = 22 }: { kind: (typeof PIECES)[number]; color: string; size?: number }) {
  const s = { fill: color, stroke: "#120e10", strokeWidth: 1.1, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="piece" aria-hidden="true">
      {kind === "helmet" && (
        <g {...s}>
          <path d="M6 20V11c0-4 2.7-7 6-7s6 3 6 7v9h-4v-5l-2-2-2 2v5H6Z" />
          <path d="M12 4c0-1.6 2.5-2.8 5-2-1.5.6-3 2-3.5 3.4" fill="#c0392b" />
        </g>
      )}
      {kind === "shield" && (
        <g {...s}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 16.5 12 7.5l3.5 9" fill="none" stroke="#120e10" strokeWidth="1.6" />
        </g>
      )}
      {kind === "trireme" && (
        <g {...s}>
          <path d="M2 14h20l-3 5H6Z" />
          <path d="M12 3v11M12 4l6 7h-6" />
        </g>
      )}
      {kind === "owl" && (
        <g {...s}>
          <path d="M6 5l3 2h6l3-2v9c0 4-2.7 7-6 7s-6-3-6-7Z" />
          <circle cx="9.5" cy="11" r="2" fill="#f4e2c0" />
          <circle cx="14.5" cy="11" r="2" fill="#f4e2c0" />
          <path d="M12 13.5l-1 1.5h2Z" fill="#120e10" />
        </g>
      )}
    </svg>
  );
}

function Corner({ i }: { i: number }) {
  if (i === 0)
    return (
      <span className="corner corner-agora">
        <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><circle cx="16" cy="7" r="2.6" fill="var(--accent)" /><path d="M10.4 30.5c.3-6.6-.9-11.5-3.1-15.6-.9-1.7-.6-3.4.6-4 1.3-.7 2.6.3 3.3 1.7l1.6 3.3M21.6 30.5c-.3-6.6.9-11.5 3.1-15.6.9-1.7.6-3.4-.6-4-1.3-.7-2.6.3-3.3 1.7l-1.6 3.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        <b>Agora</b><small>collect ₯200</small>
      </span>
    );
  if (i === 10)
    return (
      <span className="corner corner-pit">
        <span className="pit-hole"><i /><i /><i /></span>
        <b>The Pit</b><small>just visiting</small>
      </span>
    );
  if (i === 20)
    return (
      <span className="corner corner-rest">
        <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M16 28V8M16 24c-6-1-9-5-9-10 4 1 8 4 9 10Zm0-6c6-1 9-5 9-10-4 1-8 4-9 10Zm0-6c-4-1-6-4-6-8 3 1 5 3 6 8Zm0 0c4-1 6-4 6-8-3 1-5 3-6 8Z" fill="none" stroke="var(--green)" strokeWidth="1.4" /></svg>
        <b>Rest</b><small>under the olive</small>
      </span>
    );
  return (
    <span className="corner corner-banish">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M6 26 26 6M26 6h-9M26 6v9" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" /></svg>
      <b>Banished</b><small>go to the Pit</small>
    </span>
  );
}

export function Board({
  game,
  shown,
  onDeed,
  tilt,
  children,
}: {
  game: MonopolyGame;
  shown: number[];
  onDeed: (i: number) => void;
  tilt: boolean;
  children: ReactNode;
}) {
  const tokens: Record<number, number[]> = {};
  game.players.forEach((p, i) => !p.bankrupt && (tokens[shown[i]] ??= []).push(i));
  return (
    <div className={`mb-stage ${tilt ? "is-tilt" : ""}`}>
      <div className="mb">
        {BOARD.map((s, i) => {
          const c = cell(i);
          const d = game.deeds[i];
          const owner = d?.owner ?? null;
          const isCorner = c.side === "c";
          return (
            <button
              key={i}
              className={`mt mt-${c.side} mt-${s.kind} ${game.landed === i ? "is-landed" : ""} ${d?.mortgaged ? "is-mortgaged" : ""}`}
              style={{ gridRow: c.row, gridColumn: c.col }}
              onClick={() => isOwnable(s) && onDeed(i)}
              aria-label={s.name}
            >
              {isCorner ? (
                <Corner i={i} />
              ) : (
                <>
                  {s.kind === "property" && <span className="mt-band" style={{ ["--band" as string]: GROUPS[s.group].color }} />}
                  <span className="mt-body">
                    {s.kind === "road" && <span className="mt-glyph">⟶</span>}
                    {s.kind === "utility" && <span className="mt-glyph">{s.name === "The Wells" ? "◌" : "⚒"}</span>}
                    {(s.kind === "oracle" || s.kind === "apella") && <span className="mt-glyph">{s.kind === "oracle" ? "☉" : "Ψ"}</span>}
                    {s.kind === "tax" && <span className="mt-glyph">⚖</span>}
                    <span className="mt-name">{s.name}</span>
                    {isOwnable(s) && <span className="mt-price">₯{s.price}</span>}
                    {s.kind === "tax" && <span className="mt-price">₯{s.amount}</span>}
                  </span>
                  {owner !== null && <span className="mt-owner" style={{ background: game.players[owner].human ? "var(--accent)" : `hsl(${hueFor(game.players[owner].name)} 55% 62%)` }} />}
                  {d && d.houses > 0 && (
                    <span className="mt-houses">{d.houses === 5 ? <i className="temple" /> : [...Array(d.houses)].map((_, k) => <i key={k} />)}</span>
                  )}
                </>
              )}
              {tokens[i] && (
                <span className="mt-tokens">
                  {tokens[i].map((pi) => (
                    <span key={pi} className={`token-piece ${game.turn === pi ? "is-turn" : ""}`}>
                      <Piece kind={PIECES[pi % 4]} color={game.players[pi].human ? "#f4a35f" : `hsl(${hueFor(game.players[pi].name)} 55% 66%)`} />
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
        <div className="mb-center">{children}</div>
      </div>
    </div>
  );
}
