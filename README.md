# Lacedaemon

Lacedaemon is a small Discord server run by three admins, the **Shadow Council**, with a handful of regulars and an economy that has never been reset since 2022.

This repository is the home of the next step: **a website you sign into with Discord, where the server plays one game together every Sunday afternoon and the winner takes the dragons.**

Underneath it sits **DAEMON**, a fixed-supply currency for the few who want to build games and back them. Most people will never notice it, and that is the point.

## Two layers

| | Dragons | DAEMON |
|---|---|---|
| Who it's for | Everyone | Builders and hardcore players |
| Supply | Flexible, set by the council | Hard cap of 21,000,000 |
| How you get it | Role income, drops, chatting, winning game night | Earned through modules: the daily arena, games you build or back |
| Where it lives today | UnbelievaBoat (premium) | Economy++ bot ledger |
| Visible on the site | Front page | A hidden page, `daemon.html` |

## What's here

```
site/                  Static mockup of the website (no build step)
  index.html           Front page: game night, games, dragons, council
  daemon.html          The Daemon page: dark, ripple field, protocol, modules, Arbiter
  assets/              CSS and JS for both pages
docs/
  vision.md            What we're building and why
  daemon.md            The DAEMON protocol, modules and the Arbiter (Module 0)
  economy.md           Dragons today: income, bots, commands
  roadmap.md           The plan, one step at a time
  archive/history.md   Every economy mechanic we've run since 2022
```

## View the mockup

Open `site/index.html` in a browser, or serve the folder:

```bash
python3 -m http.server -d site 8000
# http://localhost:8000
```

To find the Daemon page, click the faint circle in the footer, or type `daemon` anywhere on the front page.

Sign-in, seats, balances and the collect timer are simulated in the browser. Nothing talks to Discord yet.

## Related code

- [shibTHEcode/LacedaemonEconomyPlusPlus](https://github.com/shibTHEcode/LacedaemonEconomyPlusPlus): the Economy++ bot, backend and Minecraft plugin running on the server today, plus the original DAEMON whitepaper.
- [shibTHEcode/LacedaemonEconomyPlusPlusTwo](https://github.com/shibTHEcode/LacedaemonEconomyPlusPlusTwo): a planned clean rewrite (modular backend, gambling and collect features). Never deployed.
