import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { fmt, fmtD } from "../app/format";
import { hueFor } from "../app/members";

/** The mark: two raised arms, open hands, and the light above them. */
export function Mark({ size = 28, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark-svg">
      {glow && <circle cx="16" cy="7" r="6" fill="var(--accent)" opacity=".18" />}
      <circle cx="16" cy="7" r="2.3" fill="var(--accent)" />
      <path
        d="M10.4 30.5c.3-6.6-.9-11.5-3.1-15.6-.9-1.7-.6-3.4.6-4 1.3-.7 2.6.3 3.3 1.7l1.6 3.3M21.6 30.5c-.3-6.6.9-11.5 3.1-15.6.9-1.7.6-3.4-.6-4-1.3-.7-2.6.3-3.3 1.7l-1.6 3.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dragons glyph: a small coiled tail. Used as the currency sign. */
export function DragonSign({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="sign">
      <path d="M12.5 4.5C11.4 2.9 9.6 2 7.7 2 4.5 2 2 4.6 2 7.8S4.5 13.5 7.7 13.5c2.3 0 4.2-1.4 4.2-3.4 0-1.6-1.3-2.8-2.9-2.8-1.4 0-2.4 1-2.4 2.2 0 .9.7 1.6 1.6 1.6"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12.5 4.5l1.6-1.4M12.5 4.5l.3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** DAEMON glyph: a ring with a point at its centre. */
export function DaemonSign({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="sign">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.2 1.6" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function Dragons({ value, signed: sign = false, className = "" }: { value: number; signed?: boolean; className?: string }) {
  const s = sign && value > 0 ? "+" : sign && value < 0 ? "−" : "";
  return (
    <span className={`money ${className}`}>
      <DragonSign />
      <span className="num">{s}{fmt(Math.abs(value))}</span>
    </span>
  );
}

export function Daemon({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`money money-daemon ${className}`}>
      <DaemonSign />
      <span className="num">{fmtD(value)}</span>
    </span>
  );
}

export function Avatar({ name, you = false, size }: { name: string; you?: boolean; size?: "lg" }) {
  return (
    <span className={`avatar ${size === "lg" ? "avatar-lg" : ""} ${you ? "avatar-you" : ""}`} style={{ ["--h" as string]: hueFor(name) }} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

// ---- Toasts -------------------------------------------------------------

interface Toast {
  id: number;
  text: ReactNode;
  tone?: "good" | "bad";
}
let toasts: Toast[] = [];
let toastSeq = 0;
const toastListeners = new Set<() => void>();
const emit = () => toastListeners.forEach((l) => l());

export function toast(text: ReactNode, tone?: Toast["tone"]) {
  const id = ++toastSeq;
  toasts = [...toasts.slice(-3), { id, text, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3600);
}

export function Toasts() {
  const list = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
  );
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.tone ? `toast-${t.tone}` : ""}`}>{t.text}</div>
      ))}
    </div>
  );
}

// ---- Modal --------------------------------------------------------------

export function Modal({ open, onClose, children, wide = false, label }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <span className="stat-v">{children}</span>
    </div>
  );
}
