/**
 * Minecraft items the Economy++ vault knows. Each has an 8×8 sprite, drawn
 * by hand, and a reference price in dragons used for wagers and agents.
 * Vault quantities are whole items (blocks and nuggets are converted on
 * deposit by the plugin).
 */

export interface McItem {
  id: string;
  name: string;
  ref: number;
  sprite: string[];
  palette: Record<string, string>;
}

const INGOT = ["........", "........", "..hhhhh.", ".hlllllm", "hlllllmm", "mmmmmmm.", "........", "........"];

export const ITEMS: McItem[] = [
  {
    id: "diamond", name: "Diamond", ref: 450,
    sprite: ["..cccc..", ".wcccdc.", "cwcccccd", "cccccccd", ".ccccdd.", "..cccd..", "...cd...", "........"],
    palette: { c: "#5fe3e8", w: "#e9ffff", d: "#2a9ea6" },
  },
  { id: "netherite", name: "Netherite ingot", ref: 8500, sprite: INGOT, palette: { h: "#6d6265", l: "#4a3f43", m: "#2b2326" } },
  { id: "gold", name: "Gold ingot", ref: 90, sprite: INGOT, palette: { h: "#fff3a6", l: "#f2c94c", m: "#b8862b" } },
  { id: "iron", name: "Iron ingot", ref: 40, sprite: INGOT, palette: { h: "#ffffff", l: "#d8d8d8", m: "#9a9a9a" } },
  {
    id: "emerald", name: "Emerald", ref: 220,
    sprite: ["...ee...", "..eEee..", ".eEeeed.", ".eeeeed.", ".eeeedd.", "..eedd..", "...dd...", "........"],
    palette: { e: "#41d17a", E: "#c9ffd9", d: "#178a43" },
  },
  {
    id: "redstone", name: "Redstone", ref: 6,
    sprite: ["........", "..r..r..", ".rRr.rr.", "..r.rRr.", ".rr..r..", ".rRr..r.", "..r.rr..", "........"],
    palette: { r: "#b0201b", R: "#ff5a4a" },
  },
  {
    id: "sea_lantern", name: "Sea lantern", ref: 180,
    sprite: ["aaaaaaaa", "abbabbba", "abccccba", "aacbbcaa", "abcbbcba", "abccccba", "abbabbba", "aaaaaaaa"],
    palette: { a: "#9fc9c2", b: "#d9f3ee", c: "#f4fffd" },
  },
  {
    id: "obsidian", name: "Obsidian", ref: 60,
    sprite: ["oopooooq", "opqooopo", "ooooqpoo", "pooopooo", "oqoooopq", "oopqoooo", "qooopoqo", "oopooooo"],
    palette: { o: "#1a1226", p: "#3b2654", q: "#5d3f80" },
  },
  {
    id: "ender_pearl", name: "Ender pearl", ref: 300,
    sprite: ["........", "..pppp..", ".pqqqpp.", ".pqwqqp.", ".pqqqqp.", ".ppqqpp.", "..pppp..", "........"],
    palette: { p: "#0f4b44", q: "#2a8a7e", w: "#9ff0e4" },
  },
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id)!;
