# Lacedaemon

A website for the Lacedaemon Discord server. Sign in with Discord, play together, win dragons. Every Sunday afternoon the whole server sits at one table.

Underneath it runs **DAEMON**, a fixed-supply currency for the members who build games. Most people never need to notice it.

## The two worlds

**The surface** is the whole server in one place, so Discord becomes optional. A sidebar groups it:

| | | |
|---|---|---|
| **Play** | Lobby | Today's strip (Pente, quests, Blue or Orange, =collect), Sunday's table under a sky that follows the hour in Berlin, every game, a live feed |
| | Sunday | Game night: one table, the prize pot and where it comes from, the season |
| | Poker | No-limit hold'em: sit & go tournaments and **private tables**, where players stake dragons, DAEMON, Spirits cards or **Minecraft items** and must all accept before the deal |
| | Monopoly | Classic rules on a Laconian board: a tilted 3D board, Greek pieces that hop square by square |
| | Blue or Orange | The server classic, now with three colours and rock-paper-scissors dynamics that make cheating pointless |
| | Symposium | One shared room with a public log: **knucklebones** (player-vs-player pot, module 03) and **kottabos** (a skill shot; everyone's antes in one pot) |
| | Arena | Ranked Spirits duels: three a side, both players secretly pick who steps forward, Elo ladder |
| | Pente | The daily five-letter word, same for everyone, solved for dragons and shared into #pente |
| **Collect** | Spirits | 24 collectible creatures: packs, drops after games, cards you can duel or stake |
| | Trade | One market for Spirits, Minecraft items and DAEMON; direct swap offers between members; **trading agents** that buy and sell for you (plain words, rules, or your own bot through a capped API key) |
| | Quests | Daily and weekly quests across every page, and a ten-level season track |
| **World** | Chat | Channels, voice rooms, roles, bots and commands (`=collect`, `/bones`): a Discord replacement with its own purple-cloud look |
| | Minecraft | The SMP in daylight: chat bridged to #minecraft, who is online, your item vault, account linking, prices and bounties |
| | The Laconian | The server's newspaper, written from site data, with subscribable sections (on the site or by Discord DM) and **The Wire**, the Hacker News front page |
| | Ideas | The public backlog: everything the server might become, voted on |
| **You** | Wallet, Profile, Leaderboard | Everything you hold (vault included), roles and titles, and where you stand |

**Underneath** is the Daemon world: modules, the flow of value, a module builder for developers, the Arbiter, supply, governance, and the ledger at the floor. Reach it through the faint epoch counter in the status bar, the "What is it?" link in the wallet, or by typing `daemon` anywhere.

## Two kinds of games

- **House games** belong to the server: Sunday night, poker, Monopoly, the arena, kottabos, Pente. Dragons only. Every entry dragon goes to the prize.
- **Daemon modules** are games members build: Blue or Orange, Spirits and Knucklebones in the mockup. An entry still costs dragons, but those dragons buy DAEMON from the builder, so every player walks away holding a little. The builder decides where the dragons go. The Arbiter pays builders for what people actually play.

## Run it

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # game engines, economy, emission, trade, pente, arena
npm run build      # static site in web/dist
SINGLE=1 npx vite build   # one self-contained HTML file
```

Everything is a mockup: sign-in, balances, members, chat, the Minecraft server, other players' offers and the room are simulated in your browser (`localStorage`). The game engines, the market and the agents' rule parser are real and tested. The Wire fetches the live Hacker News API when the browser allows it and otherwise shows labelled samples.

## Layout

```
web/
  src/games/        poker (evaluator, side pots, bots), monopoly, blue-or-orange, spirits, arena,
                    astragaloi, kottabos, pente (daily word), minecraft items
  src/economy/      modules and house games, entries, arbiter fallback, emission, market, wagers,
                    trade (order books, agents)
  src/app/          state, routing, time (Berlin), sign-in gate, quests, trade actions, the wire
  src/pages/        the surface
  src/daemon/       the world underneath and its ripple field
  tests/            vitest suites
docs/
  vision.md         what this is and why
  games.md          rules for every game
  daemon.md         the protocol: modules, entries, the Arbiter, supply, governance
  economy.md        dragons today: bots, income, commands
  design.md         the visual language
  roadmap.md        one step at a time
  archive/history.md  every economy mechanic the server has run
```

## Related code

- [shibTHEcode/LacedaemonEconomyPlusPlus](https://github.com/shibTHEcode/LacedaemonEconomyPlusPlus): the Economy++ bot and backend in use today, and the original DAEMON whitepaper.
- [shibTHEcode/LacedaemonEconomyPlusPlusTwo](https://github.com/shibTHEcode/LacedaemonEconomyPlusPlusTwo): a planned rewrite of that backend. Never deployed.
