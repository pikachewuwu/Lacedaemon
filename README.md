# Lacedaemon

A website for the Lacedaemon Discord server. Sign in with Discord, play together, win dragons. Every Sunday afternoon the whole server sits at one table.

Underneath it runs **DAEMON**, a fixed-supply currency for the members who build games. Most people never need to notice it.

## The two worlds

**The surface** is a games site:

| | |
|---|---|
| Lobby | Sunday's table under a sky that follows the hour in Berlin, every game, a live feed |
| Sunday | Game night: one table, the prize pot and where it comes from, the season |
| Poker | No-limit hold'em: sit & go tournaments and **private tables**, where players stake dragons, DAEMON or cards and must all accept before the deal |
| Monopoly | Classic rules on a Laconian board, played against the clock |
| Blue or Orange | The server classic, now with three colours and rock-paper-scissors dynamics that make cheating pointless |
| The Hall | One shared room: **Icarus** (a crash game everyone flies together), the slot machine, and a log where everyone sees everyone's bets |
| Spirits | 24 collectible creatures: packs, drops after games, a market, cards you can put on the table |
| Wallet, Leaderboard | Everything you hold, and where you stand |

**Underneath** is the Daemon world: modules, the flow of value, a module builder for developers, the Arbiter, supply, governance, and the ledger at the floor. Reach it through the faint epoch counter in the status bar, the "What is it?" link in the wallet, or by typing `daemon` anywhere.

## Two kinds of games

- **House games** belong to the server: Sunday night, poker, Monopoly, slots. Dragons only. Every entry dragon goes to the prize.
- **Daemon modules** are games members build: Blue or Orange, Spirits and Icarus in the mockup. An entry still costs dragons, but those dragons buy DAEMON from the builder, so every player walks away holding a little. The builder decides where the dragons go. The Arbiter pays builders for what people actually play.

## Run it

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # game engines, economy, emission
npm run build      # static site in web/dist
SINGLE=1 npx vite build   # one self-contained HTML file
```

Everything is a mockup: sign-in, balances, members and the room are simulated in your browser (`localStorage`). The game engines are real and tested.

## Layout

```
web/
  src/games/        poker (evaluator, side pots, bots), monopoly, blue-or-orange, icarus, spirits
  src/economy/      modules and house games, entries, arbiter fallback, emission, market, wagers
  src/app/          state, routing, time (Berlin), sign-in gate
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
