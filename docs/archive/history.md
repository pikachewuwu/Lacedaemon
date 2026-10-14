# Economy history

Every mechanic Lacedaemon has run, from the economy announcement channel, cleaned up and in order. Retired mechanics are kept because they are the source of ideas for new modules. Per-player payout lists are left out; the original messages are still in Discord.

## 2022: Dragons

**June 2022: Local server currency.** Dragons launch. They are tied to no asset, only sentimental value, with plans to bind them to one later and "no guarantees except for a wild ride".

- Income through `=collect`, scaled by roles. A small automatic reward for chatting every hour. Valuable contributions get rewarded by hand.
- **Casino role.** Members blew up their balances within minutes, so gambling sits behind a role bought in `=shop`, with a betting limit to stop whales.
- Original role income: Soul 1 per 4 h, then 5 per 10 h; Booster 1 per 4 h, then 20 per 6 days; Lizard 25 per 5 days; Hustler announced, never released.
- Self-assignable roles via `=join-role` / `=leave-role` in #exchange.
- **Airdrops.** Random drops to everyone who wrote at least one message in the last 24 hours. The log is unlocked by buying the Truth Seeker role.
- **OmegaCoin.** A premium currency: 1 OmegaCoin for 50 dragons via `=buy-item 1 Omega`, one at a time (buying more lost dragons due to a bug).
- Pledges: never reset the economy; those who stick around are rewarded most; not participating at all is death.

## 2025: The experiment year

**May 2025: Income update.** Sparta Capital 80,000 per 10 days; Soul 17,000 per 777 minutes; Booster 4,444 per 6 hours; chat money 100–300 every 5 seconds. Casino: `=bj`, `=roulette`, `=russian-roulette`, `=roll`, `=slots` (cock fights removed).

**June 2025** brought a burst of mini-games, most now retired:

- **Wild West** *(retired)*: `=crime` every 5 hours. 50% chance of winning 0–3,000, 50% chance of losing 0–3%. Pulled for being abusable.
- **Stimulus Check** *(retired)*: every 10 hours for OG role holders, worth 2,000.
- **BlitzCheck** *(live)*: dropped 3–6 hours after the previous one in #collect, worth 5,000. Replaced the Stimulus Check.
- **Blue or Orange** *(retired, to be revived)*: daily at 11:00 CEST for OG role holders. Pick blue or orange; the colour with fewer votes wins. Win: 10,000. Tie: 5,000. Three wins in a row: Champion, 30,000. Playing also gifted a Nuclear Nations share.
- **Collect Guess** *(retired)*: daily at 10:00 CEST. Guess how many times `=collect` will be used the next day, within 90%. Own collects don't count; 1-hour cooldown per collect. Win: Oracle role, 3,000. Commands `=guess`, `=check`, `=myguess`.
- **Blue and Orange Index Options** *(retired)*: a weekly index moved +1/−1/0 by each Blue or Orange result. Fifteen option products for outcomes −7 to +7 (supply 5 each, 10 for zero). Only the correct outcome pays 10,000 at expiry. Buying a product also buys its anti-product. Anonymous trading via `-buy`, `-buycode`, `-sell`, `-sellcode`, `-inventory`, `-prices`, `-market`.
- **Nuclear Nations** *(retired)*: buy shares in USA, UK, DE, FR, RU, CN or KP; the largest shareholder is president. Presidents pick a target with `-setnuke` and `-launch <code>`. Price = liquidity / shares + 500 to buy, +10% to sell, 20% sell tax into "stuck liquidity". Liquidity decides voting power. 19% interception, 1% backfire on the largest voting nation. A nuked nation's liquidity goes half to the strongest nation, half to a random one. Voting every 72 hours at 18:00 CEST; 3,000 stuck liquidity added to two random nations daily. Played with NDragons, bought via a role and cashed out with `-cashout`. A playtest ran in June 2025; active players got 5,000 and the final shares split 50,000.
- **Rule:** report bugs instead of abusing them.
- **Prefix vote:** `=` vs `-` tied 3–3.

**June 2025: A new currency is announced.** Tied to Blue or Orange outcomes, limited supply, diminishing rewards, anonymous, code never edited except for bug fixes. This became DAEMON.

**Late summer 2025: Minecraft bounties by vote.** 70,000 for an efficient sea lantern farm (passed 2–0) and for an efficient redstone farm (passed 3–1).

**September 2025:** Rock Paper Scissors duels for dragons (`-rps @user <amount>`; 60 s to accept, 30 s to choose) *(retired)*. The **Real human being (and a real hero)** role starts paying 8,000 for 30 minutes in voice in the last 24 hours.

**December 2025:** Income roughly doubled. A "major update" promised a more dynamic dragon economy, and a fair distribution of a new limited-supply currency to everyone who ever played Blue or Orange.

## 2026: Markets and DAEMON

**January 2026:** Slots odds published (return 96.875%). **Buckshot Roulette v0.1** *(retired)*: `-buckshot`, `-balance`, `-payout`, played with NDragons; double-or-nothing was broken.

**January 2026: Community Bonus vote.** A proposed bonus for everyone based on total collected income tied 4–4 and was not accepted. All voters received 10,000.

**February 2026:** Minecraft speedrun event. The winner finished in 2:29:35.

**April 2026: MDragons market (Economy++).** Link Minecraft with `/discord` and `/link`; deposit and withdraw diamonds and netherite; trade them on order books with `/place_sell_order` and `/place_buy_order`; Netherite Overlord for the top netherite holder; `/cashout` and `/mdragons` bridge to UnbelievaBoat.

**April 2026: RPS Consensus.** The Daily RPS Weighted Arena spec: commit DAEMON to rock, paper or scissors; the smallest pool wins half; the two largest fight for the other half; 7,200 DAEMON per cycle, split by investment power. This is DAEMON's convergence arena.

**April 2026:** Economy++ published as [shibTHEcode/LacedaemonEconomyPlusPlus](https://github.com/shibTHEcode/LacedaemonEconomyPlusPlus).
