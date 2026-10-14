// The 23 maps, one file each in src/maps/. Each is a themed set piece made of
// ordinary bricks, with spawn points and a fixed fire start (tag 'fire').
import m0 from './maps/arch-park.js';
import m1 from './maps/coastal-quickstop.js';
import m2 from './maps/devastation-station.js';
import m3 from './maps/factory-frenzy.js';
import m4 from './maps/fort-indestructible.js';
import m5 from './maps/furious-station.js';
import m6 from './maps/glass-office.js';
import m7 from './maps/happy-home.js';
import m8 from './maps/heights-school.js';
import m9 from './maps/launch-land.js';
import m10 from './maps/lucky-mart.js';
import m11 from './maps/manic-mansion.js';
import m12 from './maps/modest-headquarters.js';
import m13 from './maps/party-palace.js';
import m14 from './maps/prison-panic.js';
import m15 from './maps/rainbow-ride.js';
import m16 from './maps/rakish-refinery.js';
import m17 from './maps/raving-raceway.js';
import m18 from './maps/safety-second.js';
import m19 from './maps/sky-tower.js';
import m20 from './maps/sunny-ranch.js';
import m21 from './maps/surf-central.js';
import m22 from './maps/trailer-park.js';

export const MAPS = [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17, m18, m19, m20, m21, m22];

export function buildMap(game, def, MapBuilder) {
  const b = new MapBuilder(game, def.name);
  def.build(b, game);
  const map = b.finish();
  game.world.buildSupport(map.parts, 0);
  return map;
}
