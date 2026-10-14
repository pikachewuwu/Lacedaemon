# Vision

## The server

Lacedaemon is a Discord server. Three admins run it and call themselves the Shadow Council; four or five other regulars make up the rest. It has had its own currency, **dragons**, since June 2022, and the founding promise still stands:

> We intend to never reset the economy. Those who stick around will be rewarded most. Not participating at all is death.

People love the current economy because it is simple and because of gambling: run `=collect`, play blackjack or slots, chase a BlitzCheck. Anything new has to keep that feeling.

## The website

A website you sign into with your Discord account. The front page has one job: get people to **Sunday game night**.

- **Every Sunday afternoon, one group game.** Everyone plays together, in the browser, while talking in voice chat.
- **The winner earns dragons.** The prize is paid into the same dragon balance people already have.
- **Everyone starts level.** Your dragon balance doesn't buy an advantage in the game itself.

### Games

| Game | Status | Notes |
|---|---|---|
| Monopoly | Wanted | The long game, ~2 h, 2–6 players |
| Poker | Wanted | No-limit hold'em, equal stacks, rising blinds |
| Blue or Orange | Proposal | The server's own minority game, revived as a daily side game |
| Liar's Dice | Proposal | Short, works well with a small group |
| Werewolf | Proposal | Hidden roles, made for voice chat |

The first two are decided. The rest are suggestions for the council to vote on.

### Pages

- **Front page** (`site/index.html`): the next game night with a countdown and seats, the game rotation, how to earn dragons, and the council. Bright and approachable. Its palette comes from the server icon: raised hands, a soft blue sky, a pale glow.
- **Daemon page** (`site/daemon.html`): deliberately hard to find. Black and white, with a dot field that ripples when you click. It explains DAEMON, modules and the Arbiter to the people who care.

The two pages are the two layers of the project: the sky above and what lies underneath.

## DAEMON in one paragraph

DAEMON is a capped currency (21,000,000) that is never printed, only earned. Anything that pays DAEMON out is a **module**: the daily rock-paper-scissors arena, Sunday game night, the Minecraft vault, and anything a member builds. Builders lock DAEMON behind their module as a bond, and others can lock alongside them to back it. Each day **Module 0, the Arbiter**, an open-source AI model with public weights, prompt and inputs, looks at how much each module is actually played and how much conviction stands behind it, and splits that day's emission between them. Players on the surface just play for dragons and never have to touch any of it. See [daemon.md](daemon.md).

## Principles

1. **Simple on top.** A new member should understand the front page in ten seconds.
2. **Never reset.** Balances carry over: UnbelievaBoat dragons, Economy++ dragons, DAEMON.
3. **Open underneath.** DAEMON rules, Arbiter inputs and outputs are public and reproducible.
4. **No real money.** Dragons and DAEMON have no cash value.
5. **Report, don't abuse.** Bug abuse leads to an economy ban; bug reports get rewarded.
