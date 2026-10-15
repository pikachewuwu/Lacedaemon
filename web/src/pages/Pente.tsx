import { useCallback, useEffect, useMemo, useState } from "react";
import { earn, getState, post, setState, track, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { go } from "../app/router";
import { dateKey } from "../app/time";
import { MEMBERS } from "../app/members";
import { answerFor, isWord, LENGTH, puzzleNumber, score, shareGrid, TRIES, type Mark } from "../games/pente/pente";
import { hashSeed, seeded } from "../games/rng";
import { Avatar, toast } from "../ui/kit";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const PRIZE = [0, 6000, 4000, 3000, 2000, 1500, 1000];

export function PentePage() {
  const day = dateKey();
  const answer = useMemo(() => answerFor(day), [day]);
  const saved = useStore((s) => s.pente);
  const guesses = saved.day === day ? saved.guesses : [];
  const [cur, setCur] = useState("");
  const [shake, setShake] = useState(false);
  const solved = guesses.includes(answer);
  const over = solved || guesses.length >= TRIES;
  const marks = guesses.map((g) => score(g, answer));

  const keyState = useMemo(() => {
    const k: Record<string, Mark> = {};
    const rank = { miss: 0, near: 1, hit: 2 };
    guesses.forEach((g, i) => [...g].forEach((ch, j) => {
      const m = marks[i][j];
      if (!k[ch] || rank[m] > rank[k[ch]]) k[ch] = m;
    }));
    return k;
  }, [guesses, marks]);

  const submit = useCallback(() => {
    if (over) return;
    if (cur.length < LENGTH) return;
    if (!isWord(cur)) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return toast("Not in the word list", "bad");
    }
    if (!requireAccount()) return;
    const next = [...guesses, cur];
    const won = cur === answer;
    const done = won || next.length >= TRIES;
    const p = getState().pente;
    const base = p.day === day ? p : { ...p, day, guesses: [] };
    setState({
      pente: done
        ? {
            ...base, guesses: next, played: base.played + 1, won: base.won + (won ? 1 : 0), streak: won ? base.streak + 1 : 0,
            dist: base.dist.map((d, i) => (won && i === next.length - 1 ? d + 1 : d)),
          }
        : { ...base, guesses: next },
    });
    setCur("");
    if (done) {
      track("pente_done");
      if (won) {
        earn(PRIZE[next.length], `Pente ${puzzleNumber(day)} in ${next.length}`, "prize");
        toast(["", "Impossible.", "Brilliant.", "Splendid.", "Good.", "Solid.", "Phew."][next.length], "good");
      } else toast(`The word was ${answer.toUpperCase()}`);
    }
  }, [answer, cur, day, guesses, over]);

  const press = useCallback((k: string) => {
    if (over) return;
    if (k === "enter") return submit();
    if (k === "back") return setCur((c) => c.slice(0, -1));
    if (/^[a-z]$/.test(k)) setCur((c) => (c.length < LENGTH ? c + k : c));
  }, [over, submit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (/input|textarea|select/i.test(t.tagName)) return;
      if (e.key === "Enter") press("enter");
      else if (e.key === "Backspace") press("back");
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  // Today's results from the rest of the server (examples).
  const others = useMemo(() => {
    const r = seeded(hashSeed("pente:" + day));
    return MEMBERS.slice(0, 6).map((m) => ({ name: m.name, tries: r() < 0.12 ? 0 : 2 + Math.floor(r() * 5) })).sort((a, b) => (a.tries || 9) - (b.tries || 9));
  }, [day]);

  const rows = Array.from({ length: TRIES }, (_, i) => guesses[i] ?? (i === guesses.length ? cur : ""));

  return (
    <div className="pente-page">
      <header className="page-head">
        <div>
          <p className="label">Daily · puzzle {puzzleNumber(day)}</p>
          <h1 className="display page-title">Pente</h1>
          <p className="muted">One five-letter word a day, the same for everyone on the server. Six guesses. Solve it for dragons; the fewer guesses, the more.</p>
        </div>
      </header>
      <div className="pente-grid">
        <section className="pente-board">
          <div className="pente-rows">
            {rows.map((w, i) => (
              <div key={i} className={`pente-row ${i === guesses.length && shake ? "is-shake" : ""}`}>
                {Array.from({ length: LENGTH }, (_, j) => {
                  const m = marks[i]?.[j];
                  return (
                    <span key={j} className={`tile-l ${m ? `m-${m} is-flip` : w[j] ? "is-typed" : ""}`} style={{ animationDelay: `${j * 0.12}s` }}>
                      {w[j]?.toUpperCase() ?? ""}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="keyboard">
            {ROWS.map((row, i) => (
              <div key={row} className="kb-row">
                {i === 2 && <button className="key key-wide" onClick={() => press("enter")}>Enter</button>}
                {[...row].map((k) => <button key={k} className={`key ${keyState[k] ? `m-${keyState[k]}` : ""}`} onClick={() => press(k)}>{k.toUpperCase()}</button>)}
                {i === 2 && <button className="key key-wide" onClick={() => press("back")} aria-label="Delete">⌫</button>}
              </div>
            ))}
          </div>
        </section>
        <aside className="pente-side">
          {over && (
            <section className="panel pente-done">
              <div className="panel-head"><h3>{solved ? `Solved in ${guesses.length}` : "Not today"}</h3></div>
              <div className="panel-body">
                <pre className="share mono">{shareGrid(day, marks, solved)}</pre>
                <div className="pente-actions">
                  <button className="btn btn-primary" onClick={() => { post("pente", shareGrid(day, marks, solved)); toast("Shared to #pente"); }}>Share to #pente</button>
                  <button className="btn" onClick={() => go("chat")}>Open chat</button>
                </div>
              </div>
            </section>
          )}
          <section className="panel">
            <div className="panel-head"><h3>Your stats</h3><span className="num">{saved.streak} streak</span></div>
            <div className="panel-body pente-stats">
              <div><span className="label">Played</span><b className="num">{saved.played}</b></div>
              <div><span className="label">Won</span><b className="num">{saved.played ? Math.round((saved.won / saved.played) * 100) : 0}%</b></div>
              <ol className="dist">
                {saved.dist.map((d, i) => (
                  <li key={i}><span className="num">{i + 1}</span><i style={{ width: `${Math.max(6, (d / Math.max(1, ...saved.dist)) * 100)}%` }}>{d}</i></li>
                ))}
              </ol>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><h3>Today on the server</h3></div>
            <ul className="pente-others">
              {others.map((o) => (
                <li key={o.name}>
                  <Avatar name={o.name} /> {o.name}
                  <span className="num">{o.tries ? `${o.tries}/6` : "X/6"}</span>
                </li>
              ))}
            </ul>
          </section>
          <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Prize by guesses: 6,000 · 4,000 · 3,000 · 2,000 · 1,500 · 1,000 dragons.</p>
        </aside>
      </div>
    </div>
  );
}
