// One module per disaster, all with the same interface:
// { name, warning, icon, duration, preWarn?(g, st), start(g, st), update(g, st, dt), stop(g, st), bot }
import flood from './flood.js';
import tsunami from './tsunami.js';
import meteor from './meteor.js';
import thunder from './thunder.js';
import volcano from './volcano.js';
import blizzard from './blizzard.js';
import avalanche from './avalanche.js';
import acid from './acid.js';
import tornado from './tornado.js';
import earthquake from './earthquake.js';
import sandstorm from './sandstorm.js';
import fire from './fire.js';
import virus from './virus.js';

export const DISASTERS = [flood, tsunami, meteor, thunder, volcano, blizzard, avalanche, acid, tornado, earthquake, sandstorm, fire, virus];
