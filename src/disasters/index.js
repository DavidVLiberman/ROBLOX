// One module per disaster, all with the same interface:
// { name, warning, duration, bot,
//   params?(g)          host only: random choices shared with every player (directions, spots)
//   preWarn?(g, st)     weather hint before the warning
//   start(g, st), update(g, st, dt), stop(g, st)   run on every machine (st.p = params)
//   onEvent?(g, st, ev)                            a decided event (meteor, strike, cough...)
//   netState?(st) / applyNetState?(g, st, s)       continuous state streamed by the host
//   promote?(g, st)     this machine became the host in the middle of the disaster }
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
