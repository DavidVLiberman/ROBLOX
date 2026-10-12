# Natural Disaster Survival — web remake

A browser recreation of the classic round-based Roblox survival game, playable as a static website. Made by David.

**Play it: https://davidvliberman.github.io/ROBLOX/** — share the link and everyone who opens it lands in the same server.
You play as the classic **Noob** (yellow head & arms, blue torso, green legs, Smile face), get dropped
onto a random map with other players, read the warning, and try to survive the disaster.

Everything runs client-side: [three.js](https://threejs.org) for rendering,
[Rapier](https://rapier.rs) for physics and [Trystero](https://github.com/dmotz/trystero) for
peer-to-peer multiplayer, all vendored in `vendor/` so the site has no build step and needs no game server.

## Multiplayer

Everyone who opens the site joins the same server, so sharing the link is enough to play together.

- Players find each other through public [Nostr](https://nostr.com) relays (only used to introduce players)
  and then talk directly over WebRTC.
- Like a Roblox server, one machine is in charge: whoever has been in the server longest is the **host**.
  It runs the round, makes every random disaster decision, simulates the bots and owns the physics of every
  brick; the other players get the bricks streamed to them (10 updates a second, ~16 bytes per moving brick).
- Each player simulates their own character, the way Roblox gives clients network ownership of their
  character, and sends it 15 times a second; everyone else sees a smoothed copy.
- If the host leaves, the next most senior player takes over in the middle of the round.
- Simulated players fill the server up to 10 people and leave as real people join.
- Add `?server=anything` to the link for a private server with your friends.
- If no other player can be reached within about 7 seconds you simply host your own server, so the game
  also works offline. Some strict networks (certain mobile carriers, school or office firewalls) block
  direct WebRTC connections; a TURN server can be added in `src/net.js` (`turn` option) if that happens.


## Play locally

Any static file server works (ES modules don't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Host it

Upload the repository root to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3…).
`index.html` is the entry point.

This repository is published with GitHub Pages straight from its default branch: every push redeploys
https://davidvliberman.github.io/ROBLOX/ within a minute or two. (`.github/workflows/pages.yml` is an
alternative that deploys from `main` if Pages is switched to **Source: GitHub Actions**.)

## What's in it

| Spec item | Implementation |
|---|---|
| Round loop | Intermission (15 s, map vote for Compass owners) → map announce (5 s) → teleport → free roam (20 s, hints/volcano/mountain 15 s early) → disaster (45–70 s) → survivors (6 s) → back to lobby. No map repeats from recent history. |
| World | Grass island with brown rim (tornado never enters it) and endless ocean. The **Lobby Tower** stands at the island's edge looking straight over the map, like the real one: a two-storey round building on a dark grey pole. You spawn on the first floor (facing the map, behind a glass railing), two blue staircases lead to the roof with the Red Apple and Yellow Compass signs, the Survivalist Leaderboard, the Green Balloon sign and the Weather Machine. The glowing circle between the staircases leads to a hidden Secret Lab. Jump off the tower to get down to the island. Players waiting in the lobby are safe from disasters; living players who hide there mid-round take damage. |
| Lobby & dying | When you die you respawn in the Lobby Tower after 5 seconds, looking out over the map. From the lobby you can press **Spectate** to follow anyone still in the round (◀ ▶ to switch). |
| Avatar | R6-style Noob with the classic Smile face; walk 16, jump power 50, 100 HP, Roblox gravity 196.2. Walk/jump/fall/climb/swim/sit animations and the R6 chat emotes (/e dance, dance2, dance3, wave, point, cheer, laugh). Falls apart into six pieces on death. |
| Climbing | Truss climbing like a Roblox Humanoid: walk into a truss to grab it, forward climbs at 11.2 studs/s (70% of WalkSpeed), back climbs down, no input hangs on, sideways shuffles, Space kicks off backwards, and you pull yourself up over the top. |
| Movement | Fixed 60 Hz physics with smoothed (interpolated) rendering, 1.6-stud auto step-up, a short jump grace period after walking off a ledge, ground snapping on slopes and stairs, and players gently pushing apart instead of getting stuck on each other. Trusses climb at 12 studs/s. |
| Maps (23) | Arch Park, Coastal Quickstop, Devastation Station, Factory Frenzy, Fort Indestructible, Furious Station, Glass Office, Happy Home, Heights School, Launch Land, Lucky Mart, Manic Mansion, Modest Headquarters, Party Palace, Prison Panic, Rainbow Ride, Rakish Refinery, Raving Raceway, Safety Second, Sky Tower, Sunny Ranch, Surf Central, Trailer Park — each with its fixed fire start, stairs, seats, drivable cars, and a launchable rocket on Launch Land. Every map has truss ladders up to high ground (roofs, towers, chimneys, silos, the crane, the stage); on Launch Land you can climb the launch tower and walk across onto a walkway around the rocket and ride it up. Buildings have window sills and headers, door frames, roof coping and ridge caps, AC units, porch lights, furniture inside, and the maps have signs, bushes, trees and street lamps. |
| Disasters (13) | Flash Flood (rises, then surges around its peak), Tsunami (bright blue curling wave that shrinks as it comes ashore, then a smaller second wave), Meteor Shower (about two a second at random angles, punching through a floor or two), Thunder Storm (45 yellow branching bolts, near misses burn and throw you), Volcanic Eruption (rises out of the sea next to the island, erupts 15 s later, throws lava blocks that cool into obsidian), Blizzard (three frost stages, only the last one hurts; walls and other players keep you warm), Avalanche (mountain rises before the warning, snow chunks tumble down), Acid Rain (bricks go grey, green, dark green, black, then dissolve; green bricks break loose and burn on touch), Tornado (layered swirling funnel with a cloud cap and orbiting debris), Earthquake (cracks open in the ground), Sandstorm (a rolling sand front; only flying bricks hurt), Fire (bricks heat up with small flames before catching, burn yellow/orange/red, then char black; never spreads to grass), Deadly Virus (purple droplets, no cure) — exact warning strings, and the same weather hints before the warning as the real game. |
| Destruction | Every brick is anchored at round start. Disasters unanchor, push, corrode, burn or delete parts; a weld graph makes anything no longer connected to the ground collapse. Fast debris deals damage by speed and size. |
| Multi-Disaster | Weather Machine (E in the lobby, or the shop) stacks up to 7 extra disasters; warnings stack on screen. |
| Items | Green Balloon, Red Apple, Yellow Compass, Blue Hammer (12/day) — all free here. |
| Progression | Survivals + streak saved in `localStorage`; all badges from the spec (milestones, streaks, Close Call, Chance, map/disaster combos, Rocket Escape, Multi-Disaster 2–7). |
| Players | Real players over peer-to-peer multiplayer (see above), plus simulated players (bots) that wander the lobby, explore, pick a spot depending on the warning (high ground, indoors, open ground, away from the hazard), chat, and answer when people talk to them. |
| Chat | Shared server chat with Roblox name colours and bubble chat (3 stacked bubbles, 30 s, shrinks to "⋯" beyond 40 studs, hidden beyond 100), a "..." typing indicator, Roblox-style `#` filtering of swear words, phone numbers, e-mails and links, "joined/left the game" messages, and the TextChatService commands: `/e`, `/w name`, `/m name`, `/um name`, `/cls`, `/help`, `/v`. |
| Roblox interface | Recreated in HTML/CSS (no copied Roblox image files): top bar (Roblox menu button + ≡ menu with Leaderboard / Backpack / Capture / Report, chat toggle), chat window + bubble chat with Roblox name colours, player list with a Survivals column (Tab), backpack hotbar + inventory with Search (` key) where tools show their names like icon-less Roblox tools, ProximityPrompts, Roblox-style notifications ("Badge Awarded"), the "Buy Item" purchase prompt, and the Esc menu with People / Settings / Report / Help tabs plus Reset Character [R], Leave [L], Resume [Esc]. Mobile thumbstick + jump button. |
| Game GUI | Status bar, disaster warning, health bar, survivors list, Compass map vote, item buttons. |
| Sound | All synthesized with WebAudio (rain, wind, thunder, rumble, water roar, explosions, coughs, chime). Disaster sounds go through their own quieter effects channel (about a third of the interface volume) with a compressor, so explosions and thunder never blast. |

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
Walk into a truss to climb it: W climbs, S climbs down, Space lets go.

## URL options

- `server=name` — play on a private server (everyone with the same name plays together)
- `solo` — play offline with bots only

Handy for testing: `?map=Sky%20Tower&disaster=Tornado,Fire&bots=12&fast&low&god&seed=42&autostart`

- `map`, `disaster` — force a map / one or more disasters (name substring); these imply `solo` unless `online` is added
- `bots` — number of simulated players (0–20, default 9; fewer as real people join)
- `fast` — short timers · `low` — low graphics · `god` — no damage · `seed` — reproducible randomness
- `name` — player name · `relay=wss://…` — use your own Nostr relay(s) for finding players

## Code layout

```
index.html, style.css      page + HUD
src/main.js                game bootstrap and main loop
src/net.js                 multiplayer: peers, host election, character/world/round replication
src/chatfilter.js          Roblox-style # chat filter
src/world.js               Rapier world, Parts, instanced rendering, weld graph
src/character.js           humanoid controller (player and bots)
src/avatar.js              Noob avatar model + animation
src/island.js              island, ocean, lobby tower, scoreboard, Weather Machine
src/builder.js             map-building DSL (walls with windows, buildings with stairs, props, cars)
src/maps.js                the 23 maps
src/disasters/*.js         one module per disaster, same interface (host decides, everyone plays it)
src/round.js               RoundManager
src/bots.js                simulated players
src/ui.js, data.js         HUD and saved data/badges
src/effects.js, audio.js   sky/weather/particles and synthesized sound
```

Fan-made tribute to Stickmasterluke's Natural Disaster Survival. Not affiliated with or endorsed by Roblox Corporation.
