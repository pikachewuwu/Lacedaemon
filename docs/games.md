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
- **Private tables:** the host invites players and puts up a stake made of any mix of dragons, DAEMON and Spirits cards. Every invited player answers with a stake of their own, then accepts or declines after seeing everyone's. Nothing is dealt until all remaining seats have accepted. Stakes go into escrow for the game. The winner takes everything on the table. Table fee: 500.
- Engine: exact hand evaluator (with a fast seven-card path for bots), side pots, uncalled bets returned, odd chips clockwise from the dealer. Bots play by Monte Carlo equity with four temperaments.

## Monopoly (house)

Classic rules on the Lacedaemon board: Helos and Gytheion up to the Sanctuary of Orthia and the Throne of Apollo, four roads (Argos, Tegea, Messene, Olympia), the Wells and the Forge, the Oracle and Apella decks, and the Pit for jail.

- Buy or pass (no auctions), even building, mortgages at half price and 110% to lift, three doubles to the Pit, bankruptcy to the creditor.
- In-game money is drachmae (₯). Dragons only change hands at entry and payout.
- A game lasts 30 rounds, so it fits an afternoon; then net worth decides.
- Trading between players comes with the live version.

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

## The Hall

One room, everyone in it. Every boarding, let-go, fall, spin and chat line goes into the room log.

**Icarus (module 03).** Everyone boards during an eight-second window, then takes off together. The multiplier is your altitude, climbing toward the sun (2× after about six seconds). Let go any time to keep stake × altitude, or set an automatic let-go. When the wax melts, everyone still flying falls. Crash points follow `P(crash ≥ m) = 0.97 / m`, so any fixed strategy returns about 97% over time (tested over 200,000 flights).

**The machine (house).** The server's slot machine with its published odds: four symbols paying 34×, 16×, 8× and 4×, three of a kind 1 in 16, return 96.875%.

## Spirits (module 02)

Twenty-four creatures in four elements. Water, fire and grass mirror Blue or Orange; aether stands outside the cycle.

- Rarities: common, uncommon, rare, mythic, exalted. Any card can be foil (6%).
- **Packs** (3,000): three commons, one uncommon, one rare-or-better (80% rare, 16% mythic, 4% exalted). Every new member gets one free.
- **Drops:** a 30% chance of a card after any finished game. A Blue or Orange win drops a spirit of the winning colour.
- **Market:** an order book per spirit, priced in dragons. Sellers pay a 5% fee to the module.
- Each card has a serial number and a record of where it came from. Art is generated from the spirit's name, so every copy of a spirit looks the same and every spirit looks different.
- A battle mode using the cycle is a natural next step.
