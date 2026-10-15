import { useEffect, useState } from "react";
import { go, type Route } from "../app/router";
import { useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { claim, claimSeason, dailyQuests, level, questState, SEASON, WEEKLY, XP_PER_LEVEL, type Quest } from "../app/quests";
import { countdown, pad } from "../app/time";
import { fmt } from "../app/format";
import { Dragons, toast, useNow } from "../ui/kit";
import { Icon } from "../ui/icons";

function QuestRow({ q }: { q: Quest }) {
  const quests = useStore((s) => s.quests);
  const p = quests.progress[q.id] ?? 0;
  const done = p >= q.goal;
  const claimed = quests.claimed.includes(q.id);
  return (
    <li className={`quest ${done ? "is-done" : ""} ${claimed ? "is-claimed" : ""}`}>
      <span className="quest-icon"><Icon name={q.where} /></span>
      <div className="quest-main">
        <span className="quest-title">{q.title}</span>
        <span className="quest-bar"><i style={{ width: `${(p / q.goal) * 100}%` }} /></span>
        <span className="faint mono quest-meta">{p}/{q.goal} · {q.xp} xp · {q.reward.pack ? "a Spirits pack" : q.reward.dragons ? `${fmt(q.reward.dragons)} dragons` : ""}</span>
      </div>
      {claimed ? (
        <span className="chip">claimed</span>
      ) : done ? (
        <button className="btn btn-primary btn-sm" onClick={() => claim(q) && toast(`+${q.xp} xp`, "good")}>Claim</button>
      ) : (
        <button className="btn btn-sm" onClick={() => go(q.where as Route)}>Go</button>
      )}
    </li>
  );
}

export function QuestsPage() {
  const signedIn = useStore((s) => s.signedIn);
  const xp = useStore((s) => s.xp);
  const claimedLv = useStore((s) => s.seasonClaimed);
  const now = useNow(1000);
  const [, setReady] = useState(false);
  useEffect(() => {
    if (signedIn) questState();
    setReady(true);
  }, [signedIn]);
  const lv = level(xp);
  const into = xp % XP_PER_LEVEL;
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const left = countdown(midnight.getTime() - now);

  return (
    <div className="quests-page">
      <header className="page-head">
        <div>
          <p className="label">Season 1</p>
          <h1 className="display page-title">Quests</h1>
          <p className="muted">Small things to do across the whole site. Each one pays dragons or a pack and moves you up the season track.</p>
        </div>
        {!signedIn && <button className="btn btn-primary" onClick={() => requireAccount()}>Sign in to track quests</button>}
      </header>

      <section className="season panel">
        <div className="season-head">
          <div>
            <span className="label">Season level</span>
            <span className="season-lv display">{lv}</span>
          </div>
          <div className="season-xp">
            <span className="season-bar"><i style={{ width: `${(into / XP_PER_LEVEL) * 100}%` }} /></span>
            <span className="faint num">{into} / {XP_PER_LEVEL} xp to level {lv + 1}</span>
          </div>
        </div>
        <ol className="track">
          {SEASON.map((s) => {
            const reached = lv >= s.level;
            const got = claimedLv.includes(s.level);
            return (
              <li key={s.level} className={`${reached ? "is-reached" : ""} ${got ? "is-got" : ""}`}>
                <span className="track-lv num">{s.level}</span>
                <span className="track-reward">{s.label}</span>
                {reached && !got ? (
                  <button className="btn btn-primary btn-sm" onClick={() => claimSeason(s.level) && toast(`Level ${s.level}: ${s.label}`, "good")}>Claim</button>
                ) : (
                  <span className="faint mono track-state">{got ? "claimed" : `${s.level * XP_PER_LEVEL} xp`}</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="quest-grid">
        <section className="panel">
          <div className="panel-head"><h2>Today</h2><span className="faint mono">new in {pad(left.h)}:{pad(left.m)}:{pad(left.s)}</span></div>
          <ul className="quest-list">{dailyQuests().map((q) => <QuestRow key={q.id} q={q} />)}</ul>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>This week</h2><span className="faint mono">resets after Sunday</span></div>
          <ul className="quest-list">{WEEKLY.map((q) => <QuestRow key={q.id} q={q} />)}</ul>
        </section>
      </div>
      <p className="panel-note faint">Rewards are earned, never bought. <Dragons value={2000} /> for collecting is on top of your normal income.</p>
    </div>
  );
}
