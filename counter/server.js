// Visit and "lock screens made" counter. Two plain numbers, nothing about the visitor is kept:
// IP addresses only live in memory for an hour, to stop one person running the numbers up.
// No dependencies. Caddy passes /api/* here (127.0.0.1:8090).
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = process.env.COUNTER_DIR || '/data';
const FILE = join(DIR, 'counts.json');
const PORT = Number(process.env.PORT || 8090);
// Per address, per hour. A visit is counted once per browser tab session by the page itself.
const LIMITS = { visits: 30, made: 60 };

mkdirSync(DIR, { recursive: true });
let counts = { visits: 0, made: 0 };
try {
  const saved = JSON.parse(readFileSync(FILE, 'utf8'));
  for (const key of Object.keys(counts)) if (Number.isSafeInteger(saved[key])) counts[key] = saved[key];
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

let dirty = false;
function save() {
  if (!dirty) return;
  writeFileSync(`${FILE}.tmp`, JSON.stringify(counts));
  renameSync(`${FILE}.tmp`, FILE);
  dirty = false;
}
setInterval(save, 5000).unref();
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { save(); process.exit(0); });

let recent = new Map();
setInterval(() => { recent = new Map(); }, 60 * 60 * 1000).unref();
function allowed(request, key) {
  const ip = request.headers['cf-connecting-ip'] || request.socket.remoteAddress;
  const id = `${key} ${ip}`;
  const used = recent.get(id) || 0;
  if (used >= LIMITS[key]) return false;
  recent.set(id, used + 1);
  return true;
}

const ROUTES = { '/api/stats': null, '/api/visit': 'visits', '/api/made': 'made' };

createServer((request, response) => {
  const path = request.url.split('?')[0];
  const reply = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(body));
  };
  if (!(path in ROUTES)) return reply(404, { error: 'not found' });
  const key = ROUTES[path];
  if (key) {
    if (request.method !== 'POST') return reply(405, { error: 'POST only' });
    if (allowed(request, key)) {
      counts[key] += 1;
      dirty = true;
    }
  } else if (request.method !== 'GET') {
    return reply(405, { error: 'GET only' });
  }
  request.resume();
  reply(200, counts);
}).listen(PORT, '127.0.0.1');
