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

## The Treasury and dragon bonds (proposal)

The house has its own small books: the slot machine's edge, private table fees and a 1% trade fee on items and DAEMON. House games still pay every entry dragon to the prize; the Treasury lives on edges and fees.

**Dragon bonds** let the server spend those future fees now, on things worth doing ahead of time: a big season-final prize announced before the season starts, dragon bounties for a Minecraft build, seed pots for new member-built modules. Members lend dragons; the Treasury pays them back at game night. They borrow from real bonds but are rethought for a server:

| | Real bonds | Dragon bonds |
|---|---|---|
| Schedule | Coupons twice a year | A coupon every game night; the face back on the last Sunday of the term |
| Coupon | Fixed or tied to an index | A base plus a share of the night: every seat filled past six adds to it, so holders want full tables |
| Allocation | Biggest buyers first | Smallest orders first, and a cap per member per series |
| Shortfall | Default | Nothing defaults: an unpaid coupon rolls to next Sunday and is paid first |
| Early exit | Sell at market | Sell back to the Treasury any time (5% fee at issue, shrinking to zero at maturity), or sell to a member on the board |

Face is 10,000 dragons. The Treasury page shows income, the coupons due this Sunday and the coverage between them, so anyone can see whether the server can pay. Dragons only: a bond is a promise of dragons, never of money. Real costs (Minecraft hosting, the Arbiter's compute) stay outside the dragon economy.

Why at all: Soul income (17,000 every 777 minutes) keeps adding dragons. Bonds give people with large balances something steady to do with them that isn't gambling, take dragons out of circulation for a while, and let the community decide in advance what's worth funding.

Engine: `web/src/economy/bonds.ts` (coupons, schedules, sell-back value, small-first allocation, rolling shortfalls), tested in `web/tests/bonds.test.ts`.
