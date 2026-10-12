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
| Roblox interface | Recreated in HTML/CSS (no copied Roblox image files): top bar (Roblox menu button + ≡ menu with Leaderboard / Backpack / Capture / Report, chat toggle), chat window + bubble chat with Roblox name colours, player list with a Survivals column (Tab), backpack hotbar + inventory with Search (` key) where tools show their names like icon-less Roblox tools, ProximityPrompts, Roblox-style notifications ("Badge Awarded"), the "Buy Item" purchase prompt, and the Esc menu with People / Settings / Report / Help tabs plus Reset Character [R], Leave [L], Resume [Esc]. Mobile thumbstick + jump button. |
| Game GUI | Status bar, disaster warning, health bar, survivors list, Compass map vote, item buttons. |
| Sound | All synthesized with WebAudio (rain, wind, thunder, rumble, water roar, explosions, coughs, chime). |

## Where the interface details come from

- **Backpack / hotbar / inventory:** constants from Roblox's open-sourced `BackpackScript.lua` (github.com/Roblox/Core-Scripts):
  60px square slots with 5px gaps, background rgb(31,31,31) at 50% opacity, a blue rgb(90,142,233) equipped border at 10% thickness,
  tool names in SourceSans 14 when a tool has no icon, a gray 16px tooltip, and a 655×320 inventory with a 190×30 search box.
- **Health colours:** `TopbarConstants.lua` (red 255,28,0 → yellow 250,235,0 → green 27,252,107).
- **Chat and bubble chat:** default `ChatWindowConfiguration`, `ChatInputBarConfiguration` and `BubbleChatConfiguration`
  values from Roblox's creator docs (github.com/Roblox/creator-docs).
- **Top bar, leaderboard, ProximityPrompt, Esc menu, purchase prompt:** laid out from the official screenshots in Roblox's creator docs.
- **Fonts:** Roblox's Builder Sans is licensed for on-platform use only, so Montserrat stands in for it. The game GUI uses Roboto, the
  font Natural Disaster Survival switched to in its September 2023 UI redesign.
- **Game details:** the survivors screen shows each survivor's remaining health, and disaster lengths follow the fan wiki's
  per-disaster round durations.
- **Animation:** limb motion follows the classic R6 `Animate` script (walk amplitude 1 at frequency 9, arms up when jumping or
  falling, rate-limited joints).

No Roblox image files are copied; icons are simple vector shapes drawn for this project.

## Controls

WASD / ↑↓ move · Space jump · right- (or left-) drag to turn the camera · scroll or I/O to zoom
(zoom all the way in for first person) · ← → turn · Shift toggles shift-lock · 1–0 equip tools,
click to use · ` backpack · / chat · Tab player list · E interact · Esc menu (then R + Enter to reset).

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
