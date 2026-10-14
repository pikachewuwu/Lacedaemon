# Roadmap

One step at a time. Each step ships something usable before the next starts.

## Step 1: Mockup website (now)

- [x] Front page: game night countdown, seats, rotation, dragons, council
- [x] Daemon page: ripple field, protocol, arena simulator, emission curve, modules, Arbiter, governance
- [x] Clean docs: vision, DAEMON, economy, history
- [ ] Council review: copy, prize size, game night time (currently Sundays 16:00 Berlin time)
- [ ] Swap the placeholder sky mark for the real server icon

## Step 2: Real sign-in

- Discord OAuth2 (`identify` and `guilds.members.read`), only for members of the Lacedaemon guild
- Read dragon balances from UnbelievaBoat's API
- Real seats for Sunday: sign up, cancel, reminders posted by a bot
- Host as a static site plus a small backend (FastAPI fits the existing Economy++ code)

## Step 3: First game

- Poker first: easiest to run in the browser, plays well with 3–8 people
- Equal starting stacks, rising blinds, server-authoritative dealing
- Prize paid to the winner's UnbelievaBoat balance automatically
- Hall of winners on the front page

## Step 4: Monopoly

- Simplified rules for a ~2 hour session
- Same seat and payout flow as poker

## Step 5: DAEMON modules

- Port the Economy++ DAEMON ledger and arena into the new backend, using the whitepaper resolution rules (see [daemon.md](daemon.md))
- Module registry and DAEMON locks
- Governance vote to activate modules (needed because the whitepaper says emission comes only from the arena)

## Step 6: The Arbiter

- Publish the system prompt and input format in this repository
- Run the pinned open model in shadow mode for a few weeks: compute weights, post them, pay nothing
- Turn on payouts after governance approves

## Open questions

- Prize size for game night, and whether it should scale with the number of players
- Should game night have a small entry fee in dragons, or stay free?
- Emission thresholds that the whitepaper mentions but never defines
- The Blue or Orange "fair distribution" promised in December 2025 (a limited-supply currency reward based on every past game): is that DAEMON?
