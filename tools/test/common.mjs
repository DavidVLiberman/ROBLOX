// Shared helpers for the headless map tests.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

export const BASE = 'http://localhost:8765/index.html';

export async function openGame(query = '') {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}?solo&bots=0&autostart&low&seed=7${query}`);
  await page.waitForFunction(() => window.game && window.game.started, null, { timeout: 60000 });
  return { browser, page, errors };
}

// Load a map straight away (no round), with the round logic paused.
export async function loadMap(page, name, { stopLoop = false } = {}) {
  return page.evaluate(async ({ name, stopLoop }) => {
    const g = window.game;
    const { MAPS } = await import('./src/maps.js');
    const def = MAPS.find(m => m.name === name);
    if (!def) throw new Error('no map ' + name);
    g.round.update = () => {};
    g.keepInLobby = () => {};
    if (g.map) g.unloadMap();
    g.round.loadMap(def, 12345);
    if (stopLoop) g.frame = () => {};
    return true;
  }, { name, stopLoop });
}
