import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { go, useRoute, type Route } from "./router";
import { requireAccount, setSignInOpener } from "./account";
import { collect, resetDemo, signIn, signOut, useStore, COLLECT_AMOUNT } from "./store";
import { countdown, fmtDate, nextSunday, pad } from "./time";
import { epochNumber } from "../economy/emission";
import { MEMBERS } from "./members";
import { Avatar, DaemonSign, Dragons, Mark, Modal, Toasts, toast, useNow } from "../ui/kit";
import { Lobby } from "../pages/Lobby";
import { SundayPage } from "../pages/Sunday";
import { PokerPage } from "../pages/Poker";
import { MonopolyPage } from "../pages/Monopoly";
import { BlueOrangePage } from "../pages/BlueOrange";
import { HallPage } from "../pages/Hall";
import { SpiritsPage } from "../pages/Spirits";
import { LeaderboardPage } from "../pages/Leaderboard";
import { WalletPage } from "../pages/Wallet";
import { DaemonWorld } from "../daemon/DaemonWorld";
import { WelcomePack } from "../pages/WelcomePack";

const NAV: { route: Route; label: string }[] = [
  { route: "lobby", label: "Lobby" },
  { route: "sunday", label: "Sunday" },
  { route: "poker", label: "Poker" },
  { route: "monopoly", label: "Monopoly" },
  { route: "blue-or-orange", label: "Blue or Orange" },
  { route: "hall", label: "The Hall" },
  { route: "spirits", label: "Spirits" },
  { route: "leaderboard", label: "Leaderboard" },
];

// ---- Sign-in -----------------------------------------------------------------

function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="Sign in">
      <div className="signin">
        <Mark size={44} />
        <h2 className="display">Enter Lacedaemon</h2>
        <p className="muted">Sign in with the Discord account you use on the server. We read your name, avatar and server roles. Your dragons come with you.</p>
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => {
            signIn();
            onClose();
            toast("Signed in with Discord");
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.6 5.3A16.6 16.6 0 0 0 15.5 4l-.5 1a15.4 15.4 0 0 0-6 0l-.5-1a16.5 16.5 0 0 0-4.1 1.3C1.8 9.2 1.1 13 1.4 16.7A16.7 16.7 0 0 0 6.5 19.3l1.1-1.7c-.6-.2-1.2-.5-1.7-.8l.4-.3a11.8 11.8 0 0 0 11.4 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.6 16.6 0 0 0 5.1-2.6c.4-4.3-.6-8-3-11.4ZM8.5 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" /></svg>
          Continue with Discord
        </button>
        <p className="fine">Mockup: no data leaves your browser.</p>
      </div>
    </Modal>
  );
}

// ---- Top bar ---------------------------------------------------------------

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = useStore((s) => s.name);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button className="menu-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account">
        <Avatar name={name} you />
      </button>
      {open && (
        <div className="menu-list" role="menu">
          <button role="menuitem" onClick={() => { go("wallet"); setOpen(false); }}>Wallet</button>
          <button role="menuitem" onClick={() => { go("leaderboard"); setOpen(false); }}>Your standing</button>
          <hr />
          <button role="menuitem" onClick={() => { resetDemo(); setOpen(false); toast("Demo reset"); }}>Reset demo</button>
          <button role="menuitem" onClick={() => { signOut(); setOpen(false); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}

function CollectButton() {
  const at = useStore((s) => s.collectAt);
  const now = useNow(15000);
  const ready = now >= at;
  const left = countdown(at - now);
  return (
    <button
      className={`btn btn-sm collect ${ready ? "is-ready" : ""}`}
      disabled={!ready}
      onClick={() => collect() && toast(<>Collected <Dragons value={COLLECT_AMOUNT} /></>, "good")}
      title={ready ? "Collect your Soul income" : "Next collect"}
    >
      {ready ? "Collect" : <span className="num">{left.h + left.d * 24}h {pad(left.m)}m</span>}
    </button>
  );
}

function TopBar() {
  const route = useRoute();
  const signedIn = useStore((s) => s.signedIn);
  const dragons = useStore((s) => s.dragons);
  return (
    <header className="topbar">
      <div className="topbar-row">
        <button className="brand" onClick={() => go("lobby")} aria-label="Lacedaemon lobby">
          <Mark size={26} />
          <span className="wordmark">Lacedaemon</span>
        </button>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.route} className={`nav-item ${route === n.route ? "is-on" : ""}`} onClick={() => go(n.route)} aria-current={route === n.route ? "page" : undefined}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          {signedIn ? (
            <>
              <CollectButton />
              <button className="balance" onClick={() => go("wallet")} title="Wallet">
                <Dragons value={dragons} />
              </button>
              <AccountMenu />
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => requireAccount()}>Sign in</button>
          )}
        </div>
      </div>
    </header>
  );
}

// ---- Status line -------------------------------------------------------------

function StatusBar({ onDescend }: { onDescend: () => void }) {
  const now = useNow(1000);
  const sunday = nextSunday(new Date(now));
  const c = countdown(sunday.getTime() - now);
  const online = MEMBERS.filter((m) => m.online).length + 1;
  return (
    <footer className="statusbar mono" aria-label="Status">
      <span className="sb-item"><span className="sb-dot" />connected</span>
      <span className="sb-item">{online} online</span>
      <span className="sb-item sb-hide">berlin {fmtDate(new Date(now), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
      <span className="sb-item">sunday −{c.d}d {pad(c.h)}:{pad(c.m)}:{pad(c.s)}</span>
      <span className="sb-spacer" />
      <button className="sb-item sb-daemon" onClick={onDescend} title="There is something underneath">
        <DaemonSign size={11} /> epoch {epochNumber(now)}
      </button>
      <span className="sb-item sb-hide">v0.2 mockup</span>
    </footer>
  );
}

// ---- App -----------------------------------------------------------------

const PAGES: Record<Exclude<Route, "daemon">, () => ReactNode> = {
  lobby: () => <Lobby />,
  sunday: () => <SundayPage />,
  poker: () => <PokerPage />,
  monopoly: () => <MonopolyPage />,
  "blue-or-orange": () => <BlueOrangePage />,
  hall: () => <HallPage />,
  spirits: () => <SpiritsPage />,
  leaderboard: () => <LeaderboardPage />,
  wallet: () => <WalletPage />,
};

export function App() {
  const route = useRoute();
  const [signInOpen, setSignInOpen] = useState(false);
  const [veil, setVeil] = useState(false);
  useEffect(() => setSignInOpener(() => setSignInOpen(true)), []);

  const descend = useCallback(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return go("daemon");
    setVeil(true);
    setTimeout(() => {
      go("daemon");
      setTimeout(() => setVeil(false), 60);
    }, 650);
  }, []);

  // Type "daemon" anywhere to go underneath.
  useEffect(() => {
    let typed = "";
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/input|textarea|select/i.test(t.tagName) || e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-6);
      if (typed === "daemon" && route !== "daemon") descend();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [descend, route]);

  useEffect(() => {
    document.body.classList.toggle("in-daemon", route === "daemon");
    document.title = route === "daemon" ? "Daemon" : "Lacedaemon";
  }, [route]);

  return (
    <>
      {route === "daemon" ? (
        <DaemonWorld />
      ) : (
        <div className="shell">
          <TopBar />
          <main className="page" key={route}>{PAGES[route]()}</main>
          <StatusBar onDescend={descend} />
        </div>
      )}
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
      <WelcomePack />
      <Toasts />
      <div className={`veil ${veil ? "on" : ""}`} aria-hidden="true" />
    </>
  );
}
