/** Server time is Berlin time; game night is Sunday 16:00 there. */
export const TZ = "Europe/Berlin";
export const GAME_HOUR = 16;

function parts(date: Date) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
  }).formatToParts(date)) out[p.type] = p.value;
  return out;
}

function offsetMs(date: Date): number {
  const p = parts(date);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert a Berlin wall-clock time to a Date. */
export function berlin(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const wall = Date.UTC(year, month, day, hour, minute);
  return new Date(wall - offsetMs(new Date(wall)));
}

export function berlinNow(now = new Date()) {
  const p = parts(now);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { year: +p.year, month: +p.month - 1, day: +p.day, hour: +p.hour, minute: +p.minute, dow: days.indexOf(p.weekday) };
}

export function nextSunday(now = new Date()): Date {
  const b = berlinNow(now);
  const ahead = (7 - b.dow) % 7;
  let t = berlin(b.year, b.month, b.day + ahead, GAME_HOUR);
  if (t.getTime() <= now.getTime()) t = berlin(b.year, b.month, b.day + ahead + 7, GAME_HOUR);
  return t;
}

export function dateKey(now = new Date()): string {
  const b = berlinNow(now);
  return `${b.year}-${String(b.month + 1).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`;
}

/** Week number of the season, counting Sundays since the first game night. */
export const SEASON_START = berlin(2026, 9, 4, GAME_HOUR);
export function sundayIndex(sunday: Date): number {
  return Math.round((sunday.getTime() - SEASON_START.getTime()) / (7 * 86_400_000)) + 1;
}

/** Odd weeks are poker, even weeks Monopoly. */
export function sundayGame(sunday: Date): "poker" | "monopoly" {
  return sundayIndex(sunday) % 2 === 1 ? "poker" : "monopoly";
}

export function fmtDate(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(d);
}

export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
}

export const pad = (n: number) => String(n).padStart(2, "0");
