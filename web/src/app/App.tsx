import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { go, useRoute, type Route } from "./router";
import { requireAccount, setSignInOpener } from "./account";
import { collect, markNotesRead, resetDemo, signIn, signOut, useStore, COLLECT_AMOUNT } from "./store";
import { countdown, dateKey, fmtDate, nextSunday, pad } from "./time";
import { dailyQuests, WEEKLY } from "./quests";
import { sundayInfo } from "./sunday";
import { epochNumber } from "../economy/emission";
import { MEMBERS } from "./members";
import { ago } from "./format";
import { Avatar, DaemonSign, Dragons, Mark, Modal, Toasts, toast, useNow } from "../ui/kit";
import { Icon } from "../ui/icons";
import { DesignPicker } from "../ui/DesignPicker";
import { applyDesign } from "./themes";
import { Lobby } from "../pages/Lobby";
import { SundayPage } from "../pages/Sunday";
import { PokerPage } from "../pages/Poker";
import { MonopolyPage } from "../pages/Monopoly";
import { BlueOrangePage } from "../pages/BlueOrange";
import { SymposiumPage } from "../pages/Symposium";
import { ArenaPage } from "../pages/Arena";
import { PentePage } from "../pages/Pente";
import { SpiritsPage } from "../pages/Spirits";
import { TradePage } from "../pages/Trade";
import { QuestsPage } from "../pages/Quests";
import { ChatPage } from "../pages/Chat";
import { MinecraftPage } from "../pages/Minecraft";
import { NewsPage } from "../pages/News";
import { IdeasPage } from "../pages/Ideas";
import { TreasuryPage } from "../pages/Treasury";
import { LeaderboardPage } from "../pages/Leaderboard";
import { WalletPage } from "../pages/Wallet";
import { ProfilePage } from "../pages/Profile";
import { DaemonWorld } from "../daemon/DaemonWorld";
import { WelcomePack } from "../pages/WelcomePack";

type NavItem = { route: Route; label: string };
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Play",
    items: [
      { route: "lobby", label: "Lobby" },
      { route: "sunday", label: "Sunday" },
      { route: "poker", label: "Poker" },
      { route: "monopoly", label: "Monopoly" },
      { route: "blue-or-orange", label: "Blue or Orange" },
      { route: "symposium", label: "Symposium" },
      { route: "arena", label: "Arena" },
      { route: "pente", label: "Pente" },
    ],
  },
  {
    group: "Collect",
    items: [
      { route: "spirits", label: "Spirits" },
      { route: "trade", label: "Trade" },
      { route: "quests", label: "Quests" },
    ],
  },
  {
    group: "World",
    items: [
      { route: "chat", label: "Chat" },
      { route: "minecraft", label: "Minecraft" },
      { route: "news", label: "The Laconian" },
      { route: "treasury", label: "Treasury" },
      { route: "ideas", label: "Ideas" },
    ],
  },
  {
    group: "You",
    items: [
      { route: "wallet", label: "Wallet" },
      { route: "profile", label: "Profile" },
      { route: "leaderboard", label: "Leaderboard" },
    ],
  },
];

const ICON: Partial<Record<Route, string>> = { pente: "ideas" };

// ---- Sign-in ---------------------------------------------------------------

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

// ---- Sidebar ----------------------------------------------------------------

function useBadges(): Partial<Record<Route, string | number>> {
  const quests = useStore((s) => s.quests);
  const signedIn = useStore((s) => s.signedIn);
  const news = useStore((s) => s.news.read);
  if (!signedIn) return {};
  const claimable = [...dailyQuests(), ...WEEKLY].filter(
    (q) => (quests.progress[q.id] ?? 0) >= q.goal && !quests.claimed.includes(q.id),
  ).length;
  const today = dateKey();
  return {
    quests: claimable || "",
    chat: 3,
    news: news.includes(today) ? "" : "new",
  };
}

function Sidebar({ open, onNavigate, onDescend }: { open: boolean; onNavigate: () => void; onDescend: () => void }) {
  const route = useRoute();
  const badges = useBadges();
  const now = useNow(30000);
  const s = useStore((x) => x);
  const info = sundayInfo(s, new Date(now));
  const c = countdown(info.date.getTime() - now);
  return (
    <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Main">
      <button className="brand" onClick={() => { go("lobby"); onNavigate(); }} aria-label="Lacedaemon lobby">
        <Mark size={26} />
        <span className="wordmark">Lacedaemon</span>
      </button>
      <nav className="side-nav">
        {NAV.map((g) => (
          <div key={g.group} className="side-group">
            <span className="side-label">{g.group}</span>
            {g.items.map((n) => (
              <button
                key={n.route}
                className={`side-item ${route === n.route ? "is-on" : ""}`}
                onClick={() => { go(n.route); onNavigate(); }}
                aria-current={route === n.route ? "page" : undefined}
              >
                <Icon name={ICON[n.route] ?? n.route} />
                <span>{n.label}</span>
                {badges[n.route] ? <span className={`side-badge ${typeof badges[n.route] === "string" ? "is-dot" : ""}`}>{badges[n.route]}</span> : null}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <button className="side-sunday" onClick={() => { go("sunday"); onNavigate(); }}>
        <span className="label">Game night</span>
        <span className="side-sunday-game display">{info.game === "poker" ? "Poker" : "Monopoly"}</span>
        <span className="num faint">{c.d}d {pad(c.h)}h {pad(c.m)}m · {info.entrants.length}/{info.seats}</span>
      </button>
      <button className="side-epoch mono" onClick={onDescend} title="There is something underneath">
        <DaemonSign size={10} /> epoch {epochNumber(now)}
      </button>
    </aside>
  );
}

// ---- Top bar ------------------------------------------------------------------

function Notifications() {
  const notes = useStore((s) => s.notes);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const now = useNow(30000);
  const unread = notes.filter((n) => !n.read).length;
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button className="icon-btn" onClick={() => { setOpen((o) => !o); if (!open) setTimeout(markNotesRead, 1200); }} aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}>
        <Icon name="bell" />
        {unread > 0 && <span className="bell-count">{unread}</span>}
      </button>
      {open && (
        <div className="menu-list notes" role="menu">
          <span className="label notes-head">Notifications</span>
          {notes.length === 0 && <p className="faint notes-empty">Nothing yet. Quests, game night and drops show up here.</p>}
          {notes.slice(0, 12).map((n) => (
            <button key={n.id} className={`note ${n.read ? "" : "is-new"}`} onClick={() => { if (n.route) go(n.route as Route); setOpen(false); }}>
              <span>{n.text}</span>
              <span className="faint mono">{ago(n.at, now)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [designs, setDesigns] = useState(false);
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
          <button role="menuitem" onClick={() => { go("profile"); setOpen(false); }}>Profile</button>
          <button role="menuitem" onClick={() => { go("wallet"); setOpen(false); }}>Wallet</button>
          <button role="menuitem" onClick={() => { setDesigns(true); setOpen(false); }}>Design</button>
          <hr />
          <button role="menuitem" onClick={() => { resetDemo(); setOpen(false); toast("Demo reset"); }}>Reset demo</button>
          <button role="menuitem" onClick={() => { signOut(); setOpen(false); }}>Sign out</button>
        </div>
      )}
      <Modal open={designs} onClose={() => setDesigns(false)} wide label="Design">
        <div className="modal-head">
          <span className="label">Design</span>
          <h2 className="display" style={{ fontSize: "var(--t-xl)" }}>How the site looks for you</h2>
          <p className="muted">Only you see your choice. Chat, Minecraft and the world underneath keep their own look.</p>
        </div>
        <div className="modal-pad"><DesignPicker onPicked={() => setDesigns(false)} /></div>
      </Modal>
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
      {ready ? "=collect" : <span className="num">{left.h + left.d * 24}h {pad(left.m)}m</span>}
    </button>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const signedIn = useStore((s) => s.signedIn);
  const dragons = useStore((s) => s.dragons);
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open navigation"><Icon name="menu" /></button>
      <button className="brand brand-top" onClick={() => go("lobby")} aria-label="Lacedaemon lobby">
        <Mark size={24} />
      </button>
      <div className="topbar-right">
        {signedIn ? (
          <>
            <CollectButton />
            <button className="balance" onClick={() => go("wallet")} title="Wallet">
              <Dragons value={dragons} />
            </button>
            <Notifications />
            <AccountMenu />
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => requireAccount()}>Sign in with Discord</button>
        )}
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
      <span className="sb-item sb-hide">mc · 3 in game</span>
      <span className="sb-item sb-hide">berlin {fmtDate(new Date(now), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
      <span className="sb-item">sunday −{c.d}d {pad(c.h)}:{pad(c.m)}:{pad(c.s)}</span>
      <span className="sb-spacer" />
      <button className="sb-item sb-daemon" onClick={onDescend} title="There is something underneath">
        <DaemonSign size={11} /> epoch {epochNumber(now)}
      </button>
      <span className="sb-item sb-hide">v0.3 mockup</span>
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
  symposium: () => <SymposiumPage />,
  arena: () => <ArenaPage />,
  pente: () => <PentePage />,
  spirits: () => <SpiritsPage />,
  trade: () => <TradePage />,
  quests: () => <QuestsPage />,
  chat: () => <ChatPage />,
  minecraft: () => <MinecraftPage />,
  news: () => <NewsPage />,
  ideas: () => <IdeasPage />,
  treasury: () => <TreasuryPage />,
  wallet: () => <WalletPage />,
  profile: () => <ProfilePage />,
  leaderboard: () => <LeaderboardPage />,
};

/** Routes that bring their own full-bleed world instead of the page frame. */
const WORLDS: Route[] = ["chat", "minecraft"];

export function App() {
  const route = useRoute();
  const [signInOpen, setSignInOpen] = useState(false);
  const [veil, setVeil] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setSignInOpener(() => setSignInOpen(true)), []);
  const theme = useStore((s) => s.theme);
  const holder = useStore((s) => s.bonds.held.length > 0);
  // Keep the page in the chosen design; Gilded falls back if its bond is gone.
  useEffect(() => applyDesign(theme === "gilded" && !holder ? "laconia" : theme), [theme, holder]);

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

  const world = WORLDS.includes(route);
  return (
    <>
      {route === "daemon" ? (
        <DaemonWorld />
      ) : (
        <div className={`shell ${world ? "is-world" : ""}`}>
          <Sidebar open={drawer} onNavigate={() => setDrawer(false)} onDescend={descend} />
          {drawer && <div className="drawer-scrim" onClick={() => setDrawer(false)} />}
          <div className="shell-main">
            <TopBar onMenu={() => setDrawer(true)} />
            <main className={world ? `world world-${route}` : "page"} key={route}>{PAGES[route]()}</main>
          </div>
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
