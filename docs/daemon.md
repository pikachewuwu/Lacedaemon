# DAEMON

DAEMON is the layer underneath Lacedaemon: a fixed-supply currency for the members who build games. This document restates the original whitepaper (`Daemon Whitepaper.pdf` in [LacedaemonEconomyPlusPlus](https://github.com/shibTHEcode/LacedaemonEconomyPlusPlus)) and replaces its convergence arena with the module system.

Status markers: **[live]** runs in the Economy++ bot today, **[spec]** is in the whitepaper, **[proposal]** is new here and needs a governance vote.

## 1. Supply

- Hard cap: **21,000,000 DAEMON**. **[spec]**
- Emission starts at **7,200 per day** and becomes `floor(0.9 × rate)` every year and at supply thresholds. **[spec]** With yearly cuts alone the cap is reached in year 16.
- Nothing is printed. After genesis, new DAEMON only enters through emission. **[live]**
- Supply counts DAEMON locked in orders, escrow and module stock.
- Open question: the whitepaper mentions thresholds without listing them. Proposal: 25%, 50% and 75% of the cap.

## 2. Ledger

- Transfers are atomic and final; hidden transfers log the amount only. **[live]**
- A DAEMON/dragon order book. **[live]**
- One append-only ledger holds every entry, receipt, lock, vote and transfer. The Daemon world shows its live tail.

## 3. The convergence arena is retired **[proposal]**

The daily rock-paper-scissors arena was the whitepaper's only source of emission. Its core idea (the smallest pool wins half, the two largest fight) now lives on the surface inside Blue or Orange, where it does what it was meant to do: make coordination and alt accounts pointless. See [games.md](games.md). Emission moves to modules.

Note for the backend: the Economy++ Two arena code resolves only two-pool rounds and splits pro rata; the rules in `games.md` are canonical.

## 4. Two kinds of games

- **House games** (Sunday, poker, Monopoly, slots) belong to the server and run on dragons only. They are not modules.
- **Modules** are games built by members. What surfaces on the site is a game with a small mark; underneath, it is a program.

## 5. Modules **[proposal]**

A module is registered by an owner who locks DAEMON behind it (at least 1,000) for a chosen duration. Anyone can lock alongside to back it.

**An entry:**

1. The player pays dragons.
2. Those dragons **buy DAEMON from the owner** at the owner's price, drawn from the locked stock. The player keeps that DAEMON whether they win or lose.
3. The owner's program **routes the dragons**: a share into the game's pot, a share into another module's pot (Spirits feeds the Sunday prize), and the rest to the owner. Routing everything back is allowed (fully or partially redistributed).
4. If the stock runs out, the module stops taking entries until the owner tops it up.

**Why owners do this:** each day the Arbiter pays modules new DAEMON for activity and conviction. A generous program attracts players, players raise activity, activity raises emission. The owner shares emission with backers in proportion to locked amount × lock weight.

Example programs from the mockup:

| ID | Module | Owner | Price | Routes |
|---|---|---|---|---|
| 01 | Blue or Orange | gorgo | 2,000 | 95% pot · 5% owner |
| 02 | Spirits | kyniska | 1,500 | 40% Sunday · 60% owner |
| 03 | Icarus | agis | 2,500 | 98% bank · 2% owner |

**Activity** = 10 × unique players + 6 × √entries + 4 × log10(1 + dragon volume), over 7 days.
**Conviction** = locked DAEMON × √(lock days, capped at 90).

The Daemon world has a builder that previews a program's economics live: what a player receives, where each dragon goes, the fallback weight, net DAEMON per day and how long the stock lasts.

## 6. The Arbiter (module 0) **[proposal]**

An open-weights model, pinned to one exact version (DeepSeek as the first candidate), splits each day's emission between modules.

- **Inputs** (published per epoch): each module's activity, conviction, backers, and its last 7 days of weights.
- **Reproducible:** temperature 0, seeded by the epoch number. The prompt lives in this repository; changing it is a governance proposal. Prompt, input and output hashes are posted before payout.
- **Bounded:** no module above 50%, none below 2%, weights sum to 1.
- **Checked:** the output must land within 0.02 of the deterministic fallback, `√activity share × √conviction share`, bounded and normalised. If the model fails or breaks a bound, the fallback pays.
- **Sybil-aware:** only accounts older than 90 days count toward activity, no single account counts for more than a quarter of a module's entries, and DAEMON receipts that flow back to the owner get flagged.
- **Contestable:** payouts wait 24 hours; governance can veto an epoch or swap the model.

The fallback is implemented and tested in `web/src/economy/arbiter.ts`.

## 7. Governance **[live, extended]**

- A proposal names its own approval threshold as a share of circulating supply. Votes are weighted by DAEMON. Proposal slots are scarce and can be bid for.
- Anything can change this way: emission, the Arbiter, module rules, governance itself.
- A value from the 2025 announcement of this currency: *code is not edited except to fix bugs*. Rules change through governance, never by quiet edits.

## 8. Discord commands **[live]**

| Command | Purpose |
|---|---|
| `/daemon balance` · `send` · `stats` · `info` | Wallet and transfers (hidden transfers supported) |
| `/daemon market` · `buy` · `sell` · `orders` · `cancel_order` | DAEMON/dragon order book |
| `/governance proposal` · `vote` · `bid` | Governance |
| `/iamsatoshinakamoto yes\|no` | Top holder claims the Satoshi role |
| `/arena …` | Retired with the convergence arena |
