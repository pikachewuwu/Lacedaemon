# DAEMON

DAEMON is the layer underneath Lacedaemon: a fixed-supply currency for the people who build and back the games. This document restates the original whitepaper (`Daemon Whitepaper.pdf` in [LacedaemonEconomyPlusPlus](https://github.com/shibTHEcode/LacedaemonEconomyPlusPlus)) and adds the module system and the Arbiter.

Status markers: **[live]** runs in the Economy++ bot today, **[spec]** is in the whitepaper, **[proposal]** is new here and needs a governance vote before it applies.

## 1. Supply

- Hard cap: **21,000,000 DAEMON**. **[spec]**
- Emission starts at **7,200 per day**. **[spec]**
- Each year, and when supply crosses defined thresholds, the daily rate becomes `floor(0.9 × rate)`. **[spec]** With yearly cuts alone the cap is reached in year 16.
- DAEMON is never printed by admins. Initial balances may be seeded only when a fresh database is created; after that, new DAEMON enters circulation only through emission. **[live]**
- Supply accounting includes DAEMON locked in orders, arena commitments and module locks.

Open question: the whitepaper mentions "defined cumulative thresholds" but never lists them. Proposal: cut at 25%, 50% and 75% of the cap.

## 2. Ledger

- Transfers are atomic and final. **[live]**
- Hidden transfers: the public log shows the amount, not sender or recipient. **[live]**
- A DAEMON/Dragon limit order book. Sell orders lock DAEMON, buy orders lock dragons. **[live]**

## 3. Convergence (Module 1)

The daily arena. **[spec]**

1. A cycle opens with three options: rock, paper, scissors.
2. Anyone commits any whole amount of DAEMON (minimum 1) to any mix of options. Individual choices are hidden; commitments are final.
3. When the cycle closes (at a randomised time inside the daily window), the three pools are ranked by size. Ties go to the pool whose first commitment came earliest (earliest ranks higher; latest becomes the underdog).
4. The **smallest pool** (the underdog) takes half the emission.
5. The **two largest pools** fight by normal rock-paper-scissors rules. The winner takes the other half.
6. The losing pool's commitments are forfeited.
7. Inside each winning pool, a commit `c` earns `c^1.5 / Σ c_j^1.5 × tranche`. Concentrated conviction beats spreading thin.

Choices made here:

- Winners get their stake back. Forfeited stakes are split equally between the two winning tranches, so nothing disappears. **[proposal]** (The Economy++ Two rewrite also handed forfeited stakes to winners.)
- If only two pools have commitments, they fight for the whole emission. If only one does, every stake is returned and nothing is minted.

Implementation note: the Economy++ Two rewrite (`economy/arena.py`) only resolves when exactly two pools exist and splits pro rata, not by `c^1.5`. The whitepaper rule above is the canonical one; any new backend should implement it.

The earlier draft "Daily RPS Weighted Arena" spec (April 2026) described the same rules with 7,200 DAEMON per cycle. Only its overview survived in the Discord log.

## 4. Modules **[proposal]**

**Everything that pays out DAEMON is a module.** This generalises the whitepaper, where emission came only from the arena, so it needs a governance vote to activate.

| ID | Module | What it is |
|---|---|---|
| 00 | Arbiter | Splits each day's emission between modules |
| 01 | Convergence | The daily arena above |
| 02 | Sunday Table | Weekly game night: Monopoly, poker |
| 03 | Blue or Orange | Daily minority game |
| 04 | Vault | Minecraft items traded for dragons |
| 05+ | Open | Anything a member builds |

How it works:

1. **Lock.** A builder registers a module by locking at least 1,000 DAEMON as a bond. Anyone can lock DAEMON behind an existing module to back it. Locks have a chosen duration; a longer lock counts for more (weight = √days, capped at 90 days). Locked DAEMON can't be spent until the lock ends.
2. **Play.** Players use the module, usually for dragons. They never need to hold DAEMON. The module reports activity for the day: unique players, sessions, returning players and dragon volume.
3. **Weigh.** Once a day the Arbiter scores each module and outputs weights that sum to 1.
4. **Emit.** Each module receives `weight × daily emission`. Convergence pays it out through the arena rules. Every other module pays its builder and backers in proportion to locked amount × lock weight.

Players aren't paid in DAEMON for playing. That keeps games playable without knowing DAEMON exists, and it keeps DAEMON from becoming farmable by bots.

## 5. The Arbiter (Module 0) **[proposal]**

An open-source AI model decides the daily split. Everyone knows which model it is, and anyone can rerun it.

**Inputs** (published per epoch): each module's activity numbers, conviction (total locked × lock weight, number of distinct backers), and its last 7 days of weights.

**Model:** an open-weights model pinned to one exact version (DeepSeek as a first candidate), run at temperature 0 with the epoch number as seed. The system prompt lives in this repository; changing it is a governance proposal.

**Output:** one weight per module, plus a short written rationale.

**Guarantees**

1. **Reproducible.** Model version, prompt hash, input hash and output hash are posted before payout. Anyone with the weights can check the result.
2. **Bounded.** No module gets more than 0.50. Convergence never gets less than 0.10. Weights are non-negative and sum to 1.
3. **Never stuck.** If the model fails, times out or breaks a bound, a deterministic fallback runs: weight ∝ √activity × √conviction, then bounds are applied.
4. **Contestable.** Payout waits 24 hours. Governance can veto an epoch, which then uses the fallback.
5. **Replaceable.** Governance can swap the model or the prompt.

The model is a judge, not a ledger: it never moves DAEMON directly, it only outputs weights that the backend validates.

## 6. Governance **[live]**

- A proposal names its own approval threshold as a percentage of circulating supply.
- Votes are weighted by DAEMON held.
- Proposal slots are rate-limited; members can bid DAEMON for the next slot.
- Anything can be changed this way, including the arena rules, the emission schedule, the Arbiter and governance itself. As the whitepaper says, no consensus mechanism is eternal.

From the 2025 announcement of a future currency, kept here as a design value: *"Code is not to be edited ever (unless to fix bugs, but features shall not be changed)."* In DAEMON this means rules change only through governance, never by an admin quietly editing code.

## 7. Discord commands **[live]**

| Command | Purpose |
|---|---|
| `/daemon balance` | Show your balance privately |
| `/daemon send <user> <amount> [hidden] [message]` | Transfer |
| `/daemon stats` / `/daemon info` | Supply and guide |
| `/daemon market` / `buy` / `sell` / `orders` / `cancel_order` | DAEMON/Dragon order book |
| `/arena rock\|paper\|scissors <amount>` | Commit to today's convergence |
| `/arena spread <amount>` / `/daemon split` | Split evenly across all three |
| `/arena autospread` / `/daemon dailysplit` | Auto-split every cycle |
| `/governance proposal` / `vote` / `bid` | Governance |
| `/iamsatoshinakamoto yes\|no` | Top holder claims or releases the Satoshi role |
