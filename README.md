# Natural Disaster Survival — web remake

A browser recreation of the classic round-based Roblox survival game, playable as a static website.
You play as the classic **Noob** (yellow head & arms, blue torso, green legs, Smile face), get dropped
onto a random map with other players, read the warning, and try to survive the disaster.

Everything runs client-side: [three.js](https://threejs.org) for rendering and
[Rapier](https://rapier.rs) for physics, both vendored in `vendor/` so the site has no build step
and no external runtime dependencies (except the optional Google Font).

## Play locally

Any static file server works (ES modules don't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Host it

Upload the repository root to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3…).
`index.html` is the entry point.

For GitHub Pages, `.github/workflows/pages.yml` deploys the site on every push to `main`.
Enable it once under **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## What's in it

| Spec item | Implementation |
|---|---|
| Round loop | Intermission (15 s, map vote for Compass owners) → map announce (5 s) → teleport → free roam (20 s, hints/volcano/mountain 15 s early) → disaster (45–70 s) → survivors (6 s) → back to lobby. No map repeats from recent history. |
| World | Grass island with brown rim (tornado never enters it), endless ocean, tall safety tower lobby with switch-back ramps down to the island, scoreboard, Weather Machine. Living players take damage hiding in the tower mid-round. |
| Avatar | R6-style Noob with the classic Smile face; walk 16, jump power 50, 100 HP, Roblox gravity 196.2. Walk/jump/fall/climb/swim/sit animations. Falls apart into six pieces on death. |
| Maps (23) | Arch Park, Coastal Quickstop, Devastation Station, Factory Frenzy, Fort Indestructible, Furious Station, Glass Office, Happy Home, Heights School, Launch Land, Lucky Mart, Manic Mansion, Modest Headquarters, Party Palace, Prison Panic, Rainbow Ride, Rakish Refinery, Raving Raceway, Safety Second, Sky Tower, Sunny Ranch, Surf Central, Trailer Park — each with its fixed fire start, stairs/truss ladders, seats, drivable cars, and a launchable rocket on Launch Land. |
| Disasters (13) | Flash Flood, Tsunami, Meteor Shower, Thunder Storm (45 strikes), Volcanic Eruption, Blizzard (warmth from walls + nearby players), Avalanche, Acid Rain, Tornado, Earthquake, Sandstorm, Fire, Deadly Virus — exact warning strings. |
| Destruction | Every brick is anchored at round start. Disasters unanchor, push, corrode, burn or delete parts; a weld graph makes anything no longer connected to the ground collapse. Fast debris deals damage by speed and size. |
| Multi-Disaster | Weather Machine (E in the lobby, or the shop) stacks up to 7 extra disasters; warnings stack on screen. |
| Items | Green Balloon, Red Apple, Yellow Compass, Blue Hammer (12/day) — all free here. |
| Progression | Survivals + streak saved in `localStorage`; all badges from the spec (milestones, streaks, Close Call, Chance, map/disaster combos, Rocket Escape, Multi-Disaster 2–7). |
| Players | Simulated server players (bots) that wander the lobby, explore, and then pick a spot depending on the warning (high ground, indoors, open ground, away from the hazard). |
| UI | Status banner, warning popup, health bar, survivors list, leaderboard, shop buttons, hotbar, map vote, badge toasts, menu with Reset Character. Mobile thumbstick + jump button. |
| Sound | All synthesized with WebAudio (rain, wind, thunder, rumble, water roar, explosions, coughs, chime). |

## Controls

WASD / ↑↓ move · Space jump · right- (or left-) drag to turn the camera · scroll or I/O to zoom
(zoom all the way in for first person) · ← → turn · Shift toggles shift-lock · 1–3 equip tools,
click to use · E interact · Esc menu (R to reset).

## URL options (handy for testing)

`?map=Sky%20Tower&disaster=Tornado,Fire&bots=12&fast&low&god&seed=42&autostart`

- `map`, `disaster` — force a map / one or more disasters (name substring)
- `bots` — number of simulated players (0–20, default 9)
- `fast` — short timers · `low` — low graphics · `god` — no damage · `seed` — reproducible randomness

## Code layout

```
index.html, style.css      page + HUD
src/main.js                game bootstrap and main loop
src/world.js               Rapier world, Parts, instanced rendering, weld graph
src/character.js           humanoid controller (player and bots)
src/avatar.js              Noob avatar model + animation
src/island.js              island, ocean, lobby tower, scoreboard, Weather Machine
src/builder.js             map-building DSL (walls with windows, buildings with stairs, props, cars)
src/maps.js                the 23 maps
src/disasters/*.js         one module per disaster, same interface
src/round.js               RoundManager
src/bots.js                simulated players
src/ui.js, data.js         HUD and saved data/badges
src/effects.js, audio.js   sky/weather/particles and synthesized sound
```

Fan-made tribute to Stickmasterluke's Natural Disaster Survival. Not affiliated with or endorsed by Roblox Corporation.
