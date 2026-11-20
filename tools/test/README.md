# Map tests (headless Chromium)

Serve the repo first: `python3 -m http.server 8765` from the repo root. Playwright is
imported from the global install (`/opt/node22/lib/node_modules/playwright`); change the
path in `common.mjs` / `round.mjs` if yours lives elsewhere.

- `node mapcheck.mjs "Map Name" [0]` – part count, floating parts, spots, spawns, things
  outside the island; screenshots in `mc/` (pass `0` to skip them, `VIEWS='[[x,y,z,tx,ty,tz],…]'` to aim).
- `node nav.mjs "Map Name" [seconds]` – a bot walks from a spawn to every indoor/high spot
  (simulated faster than real time) and reports the ones it can't reach.
- `node navdbg.mjs "Map Name" <spot>` – the route and every fall for one spot.
- `./navall.sh` – `nav.mjs` on all 23 maps.
- `node launch.mjs [0|1]` – Launch Land's four buttons, countdown and a good (0) or failed (1) launch.
- `node round.mjs "Map" "Disaster" [seconds]` – a real fast round with bots; reports page errors.
- `node train.mjs` – drives the Devastation Station loco round the loop, dumps the coal hopper and lowers the crossing gates.
- `node drive.mjs "Map" [vehicle] [seconds] [keys]` – sit in a vehicle and hold keys (e.g. `w` or `w,a`).
