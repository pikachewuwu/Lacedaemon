# Roadmap

One step at a time. Each step ships something usable before the next starts.

## Step 1: The mockup (now)

- [x] Web app shell: lobby, Sunday, wallet, leaderboard, status line, sign-in flow
- [x] Playable poker (sit & go, private tables with any stakes), Monopoly, Blue or Orange, Icarus, slots
- [x] Spirits: 24 creatures, packs, drops, market
- [x] House games vs Daemon modules, entry receipts
- [x] The Daemon world: modules, flow, builder, Arbiter console, supply, governance, ledger
- [x] Tested engines and economy math
- [ ] Review copy, prize sizes and the game night time (Sundays 16:00 Berlin)
- [ ] Swap the drawn mark for the real server icon, if wanted

## Step 2: Real accounts

- Discord OAuth2 (`identify`, `guilds.members.read`), members of the Lacedaemon guild only
- Read and write dragon balances through the UnbelievaBoat API
- A small backend (FastAPI fits the Economy++ code) that owns all state; the browser only displays it
- Real Sunday seats and Discord reminders

## Step 3: Live rooms

- WebSocket rooms for the Hall, poker tables and Sunday
- Server-authoritative dealing, dice and crash points (commit-reveal so results can be checked)
- Private tables with real escrow

## Step 4: Spirits for real

- Card ownership in the ledger, pack opening server-side, the market order book
- Laurels minted after each Sunday

## Step 5: Daemon modules

- Port the Economy++ DAEMON ledger
- Governance vote to retire the convergence arena and activate modules
- Module registry, locks, entry receipts, owner programs
- A developer kit: how to build and register a module

## Step 6: The Arbiter

- Publish the prompt and input format in this repository
- Run the pinned model in shadow mode (compute, post, pay nothing) for a few weeks
- Turn on payouts after a governance vote

## Open questions

- Game night prize size, and whether it should scale with seats
- Emission thresholds the whitepaper mentions but never defines
- The Blue or Orange "fair distribution" promised in December 2025: is that DAEMON for every past player?
- Should house games ever route anything to Sunday, or stay 100% to the table?
