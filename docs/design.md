# Design

## Two worlds

**The surface** is where everyone plays. Dark and warm like Discord, never pure white. One light source: a soft orange, the light the hands in the server icon reach for. Blue is its counterpart (the sky, and one side of Blue or Orange). Quiet hacker details: monospace numbers and labels, a terminal-style status line at the bottom, a live feed.

**The Daemon world** is underneath. Pure black, a warm white, nothing else. A dot field fills the screen and the word DAEMON is drawn in it; every click sends a ripple through the field. It reads top to bottom as a descent: modules are the visible layer, then the flow of value, the builder, the Arbiter, supply, governance, and the ledger at the floor. A depth gauge counts down to −777 m and the field grows darker the deeper you go. It is allowed to overwhelm.

**Chat** is its own place: deep violet with slow purple clouds behind frosted panels, so it never feels like a game page. **Minecraft** is daylight: a blue sky with pixel clouds and a square sun, light glass panels, inventory slots and item sprites drawn on an 8×8 grid. **The Symposium** borrows from red-figure vases: black ground, terracotta lines, a meander border. **The Laconian** is set like a broadsheet in Newsreader.

The surface is organised by a left sidebar (Play, Collect, World, You) with badges for unread chat, claimable quests and a new paper, and a notification bell in the top bar. Nothing borrows the language of skin gambling: no cases, no rarity spin strips, no crash charts.

## The mark

Two raised arms with open hands, and the light above them: taken from the server icon. It appears small in the top bar and on the back of every Spirits card, and large in the lobby, where the arms rise into a sky that follows the hour in Berlin (stars at night, dusk orange in the evening). It's the one place the page lets itself be beautiful.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#121012` | page |
| `--bg-2` / `--bg-3` | `#18151a` / `#1f1b21` | panels / raised |
| `--text` | `#ece4da` | warm off-white, never `#fff` |
| `--accent` | `#f4a35f` | the light: primary actions, dragons |
| `--blue` / `--orange` / `--green` | `#6fa9e6` / `#f08c3c` / `#86c27f` | Blue or Orange, Spirits elements |

Type: **Marcellus** (inscriptional capitals, for titles and the wordmark), **Geist** (interface), **Geist Mono** (numbers, labels, logs). The Daemon world uses **Syncopate** and **IBM Plex Mono**; The Laconian uses **Newsreader**.

## Marks for game kinds

House games carry a small `HOUSE` tag. Daemon modules carry a black chip with the DAEMON glyph and the builder's name. The entry receipt shows a black DAEMON line only for modules. That's the only place most players ever see the layer underneath.

## Hidden ways down

- The faint `epoch` counter in the status bar.
- "What is it?" next to DAEMON in the wallet.
- The "Yours" tile on the member shelf.
- Typing `daemon` anywhere.
