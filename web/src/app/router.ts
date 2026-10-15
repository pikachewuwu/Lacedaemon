import { useSyncExternalStore } from "react";

export type Route =
  | "lobby" | "sunday" | "poker" | "monopoly" | "blue-or-orange" | "symposium" | "arena" | "pente"
  | "spirits" | "trade" | "quests"
  | "chat" | "minecraft" | "news" | "treasury" | "ideas"
  | "wallet" | "profile" | "leaderboard"
  | "daemon";

const ROUTES: Route[] = [
  "lobby", "sunday", "poker", "monopoly", "blue-or-orange", "symposium", "arena", "pente",
  "spirits", "trade", "quests", "chat", "minecraft", "news", "treasury", "ideas", "wallet", "profile", "leaderboard", "daemon",
];

function fromHash(): Route {
  try {
    const h = location.hash.replace(/^#\/?/, "");
    return (ROUTES as string[]).includes(h) ? (h as Route) : "lobby";
  } catch {
    return "lobby";
  }
}

let current: Route = fromHash();
const listeners = new Set<() => void>();

export function go(route: Route) {
  if (route === current) return;
  current = route;
  try {
    history.pushState(null, "", `#${route}`);
  } catch {
    /* sandboxed: in-memory routing still works */
  }
  window.scrollTo({ top: 0 });
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    current = fromHash();
    listeners.forEach((l) => l());
  });
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
