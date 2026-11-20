// Minimal in-memory Nostr relay for local multiplayer tests: node relay.mjs [port]
import { WebSocketServer } from 'ws';

const port = Number(process.argv[2] || 7777);
const wss = new WebSocketServer({ port });
const subs = new Map();   // ws -> Map(subId -> filters)

const match = (f, ev) => {
  if (f.ids && !f.ids.some(i => ev.id.startsWith(i))) return false;
  if (f.kinds && !f.kinds.includes(ev.kind)) return false;
  if (f.authors && !f.authors.some(a => ev.pubkey.startsWith(a))) return false;
  if (f.since && ev.created_at < f.since) return false;
  if (f.until && ev.created_at > f.until) return false;
  for (const k of Object.keys(f)) {
    if (k[0] !== '#') continue;
    const name = k.slice(1), want = f[k];
    if (!ev.tags.some(t => t[0] === name && want.includes(t[1]))) return false;
  }
  return true;
};

wss.on('connection', (ws) => {
  subs.set(ws, new Map());
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const [type, ...rest] = msg;
    if (type === 'REQ') {
      const [id, ...filters] = rest;
      subs.get(ws).set(id, filters);
      ws.send(JSON.stringify(['EOSE', id]));
    } else if (type === 'CLOSE') subs.get(ws).delete(rest[0]);
    else if (type === 'EVENT') {
      const ev = rest[0];
      ws.send(JSON.stringify(['OK', ev.id, true, '']));
      for (const [other, m] of subs) for (const [id, filters] of m) if (filters.some(f => match(f, ev))) other.send(JSON.stringify(['EVENT', id, ev]));
    }
  });
  ws.on('close', () => subs.delete(ws));
});
console.log('relay on', port);
