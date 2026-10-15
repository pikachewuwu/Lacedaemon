# Games

All engines live in `web/src/games/` and are covered by tests in `web/tests/`.

## Sunday game night (house)

- Every Sunday at 16:00 Berlin time. Poker on odd weeks, Monopoly on even weeks; new games join the rotation by vote.
- Entry: 10,000 dragons. Every entry dragon goes to the prize.
- Other modules can route into the pot. Spirits sends 40% of every pack.
- The winner takes the pot and the week's **laurel**, a single Orthia card stamped with the week and the game.

## Poker (house)

No-limit Texas hold'em, tournament style: equal stacks, rising blinds, last player with chips wins.

- **Sit & go:** six seats, 2,500 entry, 3,000 chips, blinds up every six hands. Winner takes all entries.
- **Private tables:** the host invites players and puts up a stake made of any mix of dragons, DAEMON, Spirits cards and Minecraft items from the vault. Every invited player answers with a stake of their own, then accepts or declines after seeing everyone's. Nothing is dealt until all remaining seats have accepted. Stakes go into escrow for the game. The winner takes everything on the table. Table fee: 500.
- Engine: exact hand evaluator (with a fast seven-card path for bots), side pots, uncalled bets returned, odd chips clockwise from the dealer. Bots play by Monte Carlo equity with four temperaments.

## Monopoly (house)

Classic rules on the Lacedaemon board: Helos and Gytheion up to the Sanctuary of Orthia and the Throne of Apollo, four roads (Argos, Tegea, Messene, Olympia), the Wells and the Forge, the Oracle and Apella decks, and the Pit for jail.

- Buy or pass (no auctions), even building, mortgages at half price and 110% to lift, three doubles to the Pit, bankruptcy to the creditor.
- In-game money is drachmae (₯). Dragons only change hands at entry and payout.
- A game lasts 30 rounds, so it fits an afternoon; then net worth decides.
- Trading between players comes with the live version.
- The board is drawn as an object: cream tiles, colour bands, a 3D tilt, and four Greek pieces (helmet, shield, trireme, owl) that hop square by square.

## Blue or Orange (module 01)

The server classic, rebuilt around rock-paper-scissors.

- Three colours, one cycle: **blue puts out orange, orange burns green, green drinks blue.**
- Once a day, back one colour with any stake from 500. Stakes are hidden and final. One colour per account.
- The round closes at a random minute between 20:00 and 22:00.
- Pools are ranked by total stake (ties: the pool that opened first ranks higher).
  - The **smallest pool wins half** the pot. That's the original Blue or Orange.
  - The **two largest pools fight** by the cycle; the winner takes the other half.
  - If only two colours were backed, they fight for everything. If only one, everyone is refunded.
- Inside a winning pool, a stake `c` is weighted `c^1.5`.
- Three wins in a row: Champion.

**Why it resists cheating:**

1. Payouts follow stake, not head count, so alt accounts add nothing.
2. Splitting one stake over `k` accounts shrinks its weight to `c^1.5 / √k`. Four alts earn half as much as one honest account (tested).
3. A group that colludes to be the minority makes its pool big, and big pools have to fight a colour they don't control.
4. Hidden pools and a random closing minute stop last-second sniping.

## The Symposium

One room, everyone in it, a long evening. Every ante, throw, hit and chat line goes into the room log, so nobody plays alone. The chance games here are old ones played between people. There are no crash charts, reels or cases.

**Knucklebones (astragaloi, module 03).** Players ante 500, 2,000 or 10,000 during a seven-second window, then everyone throws four bones together. Each bone lands on 1, 3, 4 or 6 (the narrow sides, 1 and 6, are rarer). **Venus** (all four different) beats everything; the **Dog** (four ones) loses to everything; then four of a kind; then the higher total. The best throw takes 97% of the antes, split on a tie. It's player against player: the house has no edge to win.

**Kottabos (house).** The drinking game: flick the last of your wine at a bronze disc balanced on a stand. Two presses set power and angle. Each turn costs 500 into one shared pot; knock the disc into the basin and the whole pot is yours. A miss feeds the pot for the next drinker. Skill, not odds.

## Arena (house)

Ranked Spirits duels. Bring three different spirits (or borrow a starter team).

- Each turn both players choose, in secret, who steps forward. The two spirits clash.
- The cycle from Blue or Orange decides damage: an element beating the other hits ×1.6, a losing one ×0.6, aether ×1.25 against everything. Power and health come from the spirit, and the strong ones are the rare ones.
- Knock out all three of theirs to win. Ratings are Elo (K = 32) and show on a public ladder.
- Wins count for quests and the season.

## Pente (house)

The daily five-letter word, the same for every member on the server. Six guesses. Green is right, gold is in the word but elsewhere, repeated letters are counted the way people expect.

- Solving pays 6,000, 4,000, 3,000, 2,000, 1,500 or 1,000 dragons for one to six guesses.
- Share the coloured grid to #pente (no letters). Streaks and the guess distribution live on your profile.
- 607 answers chosen from common words and 12,578 accepted guesses.

## Quests

Small things to do across the whole site: four daily quests drawn from a pool (collect, play hands, throw the bones, chat, say something in Minecraft, read the paper, vote on an idea, finish Pente…), five weekly ones (sit at game night, win three duels, trade an item…). Each pays dragons or a pack plus XP. Every 300 XP is a season level, and the ten levels pay dragons, packs and titles (Hoplite, Helot Whisperer, Ephor, Spartiate).

## Spirits (module 02)

Twenty-four creatures in four elements. Water, fire and grass mirror Blue or Orange; aether stands outside the cycle.

- Rarities: common, uncommon, rare, mythic, exalted. Any card can be foil (6%).
- **Packs** (3,000): three commons, one uncommon, one rare-or-better (80% rare, 16% mythic, 4% exalted). Every new member gets one free.
- **Drops:** a 30% chance of a card after any finished game. A Blue or Orange win drops a spirit of the winning colour.
- **Trading:** every spirit has an order book on the Trade page, next to Minecraft items and DAEMON. Sellers pay a 5% fee to the module.
- Each card has a serial number and a record of where it came from. Art is generated from the spirit's name, so every copy of a spirit looks the same and every spirit looks different.
- Spirits fight in the Arena.

## Trade

One market for everything a member holds: Spirits, Minecraft items from the vault, DAEMON.

- **Buy now / sell now** against the best ask or bid, with depth and a price history per instrument.
- **Offers:** a direct swap with another member: any mix of dragons, DAEMON, items and cards on each side. The other side accepts, declines, or counters.
- **Agents** trade for you while you're away. Write the rule in plain words ("buy diamonds under 430, up to 10 a day; sell netherite over 9,000"), build it from fields, or connect your own bot with an API key that can only trade, never withdraw, under a daily budget you set. Agents act on the same books as people.

## Minecraft items

The SMP vault mirrors items you deposit in game (`/deposit diamond 10`). Vaulted items can be traded, swapped in offers or staked at a private poker table; withdraw them back into the world any time.
