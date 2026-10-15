import { useState } from "react";
import { useStore } from "../app/store";
import { MEMBERS } from "../app/members";
import { Avatar, Dragons } from "../ui/kit";

type Board = "dragons" | "sundays" | "poker" | "monopoly" | "boo";
const BOARDS: { id: Board; label: string; unit: string }[] = [
  { id: "dragons", label: "Dragons", unit: "" },
  { id: "sundays", label: "Game nights won", unit: "wins" },
  { id: "poker", label: "Poker", unit: "wins" },
  { id: "monopoly", label: "Monopoly", unit: "wins" },
  { id: "boo", label: "Blue or Orange streak", unit: "best" },
];

export function LeaderboardPage() {
  const [board, setBoard] = useState<Board>("dragons");
  const s = useStore((x) => x);
  const you = {
    name: s.name,
    dragons: s.dragons,
    sundays: 0,
    poker: s.stats.poker?.won ?? 0,
    monopoly: s.stats.monopoly?.won ?? 0,
    boo: s.booStreak,
  };
  const rows = [
    ...MEMBERS.map((m) => ({ name: m.name, dragons: m.dragons, sundays: m.sundays, poker: m.pokerWins, monopoly: m.monopolyWins, boo: m.booBest, you: false })),
    ...(s.signedIn ? [{ ...you, you: true }] : []),
  ].sort((a, b) => b[board] - a[board]);
  const max = Math.max(...rows.map((r) => r[board]), 1);

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="label">Season 1</p>
          <h1 className="display page-title">Leaderboard</h1>
        </div>
      </header>
      <div className="tabs" role="tablist">
        {BOARDS.map((b) => (
          <button key={b.id} role="tab" className="tab" aria-selected={board === b.id} onClick={() => setBoard(b.id)}>{b.label}</button>
        ))}
      </div>
      <ol className="board">
        {rows.map((r, i) => (
          <li key={r.name} className={r.you ? "is-you" : ""}>
            <span className={`board-rank num ${i < 3 ? "top" : ""}`}>{i + 1}</span>
            <Avatar name={r.name} you={r.you} />
            <span className="board-name">{r.name}</span>
            <span className="board-bar"><i style={{ width: `${(r[board] / max) * 100}%` }} /></span>
            <span className="board-v">
              {board === "dragons" ? <Dragons value={r.dragons} /> : <span className="num">{r[board]} <span className="faint">{BOARDS.find((b) => b.id === board)!.unit}</span></span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="panel-note faint">Members shown are examples for the mockup.</p>
    </div>
  );
}
