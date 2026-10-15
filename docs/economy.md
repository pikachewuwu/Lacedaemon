# Dragons

Dragons are the everyday currency of Lacedaemon. They have no cash value.

## Where they live

| System | Role |
|---|---|
| **UnbelievaBoat** (premium) | The main economy today. Balances, `=collect`, the shop, the casino. Prefix `=`. |
| **YAGPDB** | Drops a **BlitzCheck** every few hours: a redeemable role worth dragons. |
| **Economy++** ([repo](https://github.com/shibTHEcode/LacedaemonEconomyPlusPlus)) | Minecraft vault, item order books, bounties, DAEMON. Its own dragon ledger, bridged to UnbelievaBoat through roles (MDragons, cashout). Prefix `-` and slash commands. |

The website should read dragon balances from UnbelievaBoat (it has a public API for reading and changing balances) and pay game night prizes into the same balance, so nobody has to move anything.

## Income (current)

| Source | Amount | Interval |
|---|---|---|
| Soul role (`=collect`) | 17,000 | every 777 minutes |
| Booster role | 4,444 | every 6 hours |
| Sparta Capital role | 80,000 | every 10 days |
| Chat money | 100–300 random | while chatting (5 s cooldown) |
| BlitzCheck (YAGPDB drop in #collect) | 5,000 | 3–6 hours after the last one |
| *Real human being (and a real hero)*: 30 min in voice in the last 24 h | 8,000 | daily |
| Winning Sunday game night | the pot (all entries) | weekly |

Roles that grant dragons pay out on the next `=collect` in #collect.

In December 2025 income was roughly doubled; the table shows current values where known.

## Casino

UnbelievaBoat games: `=bj`, `=roulette`, `=russian-roulette`, `=roll`, `=slots`.

Slots payout table (January 2026): four symbols pay 34×, 16×, 8× and 4×. Three in a row has a 1/16 chance, a specific symbol 1/64. Overall return: 96.875%.

## Useful commands

| Command | Purpose |
|---|---|
| `=collect` | Collect role income |
| `=bal` / `=money` | Balance |
| `=leaderboard` | Richest members |
| `=economy-stats` | Total money in circulation |
| `=shop` / `=buy <item>` | Shop (casino role, NDragons, MDragons, cashout roles) |
| `=join-role <role>` / `=leave-role` | Self-assignable roles, in #exchange |

## Economy++ (Minecraft)

- In Minecraft: `/discord` gives a six-digit code; link it in Discord with `/link`.
- `/deposit` and `/withdraw` move diamonds, netherite and other items in and out of the vault.
- `/place_sell_order`, `/place_buy_order`, `/market <item>`, `/cancel_order`, `/cancel_all_orders` trade items for dragons on an order book.
- The top netherite holder gets **Netherite Overlord**; the top total dragon holder gets **Mansa Musa**.
- `/cashout` unlocks the cashout role (costs 35,000, grants 35,000 on UnbelievaBoat).
- `=buy mdragons` on UnbelievaBoat, then `/mdragons`, moves dragons the other way.

## Rules

- Report bugs instead of abusing them. Abuse means an economy ban; reports may be rewarded.
- Good suggestions are rewarded.
- The economy is never reset.
