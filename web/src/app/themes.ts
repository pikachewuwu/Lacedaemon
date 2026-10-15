import { getState, setState } from "./store";

/** Designs members can pick. The swatch drives the picker's little preview. */
export interface Design {
  id: string;
  name: string;
  line: string;
  /** chrome, page, panel, text, accent */
  swatch: [string, string, string, string, string];
  font: string;
  /** Only for holders of a server bond. */
  holders?: boolean;
}

export const DESIGNS: Design[] = [
  { id: "laconia", name: "Laconia", line: "Dark and warm, one orange light. The original.", swatch: ["#0f0d10", "#121012", "#1f1b21", "#ece4da", "#f4a35f"], font: "Marcellus" },
  { id: "sky", name: "Sky", line: "The logo's blue, and the pale gold the hands reach for.", swatch: ["#0a1120", "#0b1322", "#16233a", "#eef2f8", "#ffd98a"], font: "Marcellus" },
  { id: "thermopylae", name: "Thermopylae", line: "Black, a crimson cloak, bronze. Capitals that stand their ground.", swatch: ["#090707", "#0b0909", "#1c1615", "#f1e6d6", "#d63a3a"], font: "Marcellus" },
  { id: "terminal", name: "Terminal", line: "Phosphor on black. Everything monospace, square corners, scanlines.", swatch: ["#040704", "#050805", "#0c170d", "#c6f7cf", "#3dff8a"], font: "IBM Plex Mono" },
  { id: "parchment", name: "Parchment", line: "Ink on paper, terracotta red. For reading in daylight.", swatch: ["#e3d7c0", "#ece3d2", "#f5eee1", "#2a2017", "#b4441d"], font: "Marcellus" },
  { id: "gilded", name: "Gilded", line: "Black lacquer and gold leaf. For everyone who holds a server bond.", swatch: ["#0a0907", "#0c0b09", "#1a1712", "#f3e9d2", "#d9b77a"], font: "Marcellus", holders: true },
];

export const designById = (id: string) => DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];

export const canUse = (d: Design) => !d.holders || getState().bonds.held.length > 0;

/** Put a design on the page. */
export function applyDesign(id: string) {
  try {
    const d = designById(id);
    if (d.id === "laconia") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = d.id;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", d.swatch[1]);
  } catch {
    /* no document (tests) */
  }
}

export function chooseDesign(id: string): boolean {
  const d = designById(id);
  if (!canUse(d)) return false;
  setState({ theme: d.id });
  applyDesign(d.id);
  return true;
}
