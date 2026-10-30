// ============================================================
//  TYPE THE WORLD オンライン対戦サーバー（2人用ルーム）
//  ・外部ライブラリなし（Node.js だけで動く）
//  ・サーバー → ブラウザ：Server-Sent Events（/api/stream）
//  ・ブラウザ → サーバー：小さな JSON の POST（/api/*）
//  ・開始時刻・終了時刻・問題の順番・最終結果はサーバーが決める
//  ・受け取るのは「正しく打った文字数・ミス数・解いた問題数」だけ（キー入力そのものは受け取らない）
//  設定は server/config.json（環境変数 PORT / HOST / MATCH_SECONDS などで上書き可）
// ============================================================
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// ---- 設定 ----
const DEFAULTS = {
  port: 8787, host: '0.0.0.0', gameFile: '../index.html',
  matchSeconds: 60, countdownSeconds: 3, disconnectGraceSeconds: 15, lobbyGraceSeconds: 30,
  resultGraceMs: 1500, problemCount: 80, maxRooms: 200, roomIdleMinutes: 30, maxCharsPerSecond: 20,
  allowedOrigin: '*', trustProxy: false, maxJoinsPerMinute: 30,
};
function loadConfig() {
  let file = {};
  try { file = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); }
  catch (e) { console.warn('[config] config.json を読めなかったので初期値を使います:', e.message); }
  const c = Object.assign({}, DEFAULTS, file);
  const env = process.env, num = (k, v) => (env[k] !== undefined && env[k] !== '' && !isNaN(+env[k])) ? +env[k] : v;
  c.port = num('PORT', c.port);
  c.host = env.HOST || c.host;
  c.matchSeconds = num('MATCH_SECONDS', c.matchSeconds);
  c.countdownSeconds = num('COUNTDOWN_SECONDS', c.countdownSeconds);
  c.disconnectGraceSeconds = num('GRACE_SECONDS', c.disconnectGraceSeconds);
  c.lobbyGraceSeconds = num('LOBBY_GRACE_SECONDS', c.lobbyGraceSeconds);
  if (env.ALLOWED_ORIGIN) c.allowedOrigin = env.ALLOWED_ORIGIN;          // ゲームのページを別の場所に置くとき、その https://〜
  if (env.TRUST_PROXY !== undefined) c.trustProxy = /^(1|true|yes)$/i.test(env.TRUST_PROXY);   // Render などの公開先では 1
  return c;
}
const CFG = loadConfig();
const GAME_FILE = path.resolve(__dirname, CFG.gameFile);

// ---- 小道具 ----
const now = () => Date.now();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 読みまちがえやすい I O 0 1 は使わない
function newCode() {
  for (let k = 0; k < 50; k++) {
    let s = ''; const b = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) s += CODE_CHARS[b[i] % CODE_CHARS.length];
    if (!rooms.has(s)) return s;
  }
  return null;
}
const newToken = () => crypto.randomBytes(18).toString('base64url');
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const cleanName = n => String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) || 'プレイヤー';
const int = (v, lo, hi) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo; };

// ---- 部屋 ----
// room: { code, phase:'lobby'|'countdown'|'playing'|'result', players:[], pool, problems, startAt, endAt, matchNo, result, ... }
const rooms = new Map();

function publicState(room, you) {
  return {
    now: now(), code: room.code, phase: room.phase, you,
    category: room.category, catLabel: room.catLabel, matchNo: room.matchNo,
    startAt: room.startAt, endAt: room.endAt, matchSeconds: CFG.matchSeconds,
    graceSeconds: CFG.disconnectGraceSeconds,
    players: room.players.map(p => ({
      name: p.name, ready: p.ready, rematch: p.rematch, connected: p.connected,
      disconnectedAt: p.connected ? null : p.disconnectedAt,
      correct: p.prog.correct, miss: p.prog.miss, solved: p.prog.solved,
    })),
    result: room.result, notice: room.notice,
  };
}
function send(res, event, data) {
  try { res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n'); } catch (e) { /* 切れている */ }
}
function broadcast(room) {
  room.players.forEach((p, i) => { const st = publicState(room, i); for (const res of p.streams) send(res, 'state', st); });
}
function sendMatch(room, p) {
  if (!room.problems) return;
  const m = { matchNo: room.matchNo, problems: room.problems, startAt: room.startAt, endAt: room.endAt, now: now() };
  for (const res of p.streams) send(res, 'match', m);
}
function clearTimers(room) { for (const t of room.timers) clearTimeout(t); room.timers = []; }
function later(room, ms, fn) { room.timers.push(setTimeout(fn, Math.max(0, ms))); }

function resetProgress(p) { p.prog = { correct: 0, miss: 0, solved: 0, t: 0 }; }

function startMatch(room) {
  clearTimers(room);
  const list = [];
  while (list.length < CFG.problemCount) list.push(...shuffle(room.pool.slice()));
  room.problems = list.slice(0, CFG.problemCount);
  room.matchNo++;
  room.startAt = now() + CFG.countdownSeconds * 1000;
  room.endAt = room.startAt + CFG.matchSeconds * 1000;
  room.result = null;
  room.phase = 'countdown';
  room.players.forEach(p => { resetProgress(p); p.ready = false; p.rematch = false; });
  room.players.forEach(p => sendMatch(room, p));
  broadcast(room);
  later(room, room.startAt - now(), () => { if (room.phase === 'countdown') { room.phase = 'playing'; broadcast(room); } });
  later(room, room.endAt + CFG.resultGraceMs - now(), () => finish(room, 'time'));
}
function finish(room, reason, winnerIdx) {
  if (room.phase !== 'countdown' && room.phase !== 'playing') return;
  clearTimers(room);
  const ps = room.players.map(p => {
    const tot = p.prog.correct + p.prog.miss;
    return { name: p.name, correct: p.prog.correct, miss: p.prog.miss, solved: p.prog.solved,
      acc: tot ? Math.round(p.prog.correct / tot * 1000) / 10 : 0 };
  });
  let winner = null, draw = false;
  if (reason === 'time') {
    if (ps.length === 2 && ps[0].correct !== ps[1].correct) winner = ps[0].correct > ps[1].correct ? 0 : 1;
    else draw = true;
  } else if (reason === 'forfeit') winner = winnerIdx;
  else draw = true;   // 'abandoned'（2人とも切れた）
  room.result = { reason, winner, draw, players: ps, matchNo: room.matchNo, endedAt: now() };
  room.phase = 'result';
  room.players.forEach(p => { p.ready = false; p.rematch = false; });
  broadcast(room);
}
// 切断の見張り：対戦中は一定時間もどらなければ相手の不戦勝。待機中は部屋から外す
function watchDisconnect(room, p) {
  const graceMs = (room.phase === 'countdown' || room.phase === 'playing' ? CFG.disconnectGraceSeconds : CFG.lobbyGraceSeconds) * 1000;
  later(room, graceMs + 50, () => {
    if (p.connected || !room.players.includes(p)) return;
    if (now() - p.disconnectedAt < graceMs) return;
    if (room.phase === 'countdown' || room.phase === 'playing') {
      const other = room.players.find(q => q !== p);
      if (other && other.connected) finish(room, 'forfeit', room.players.indexOf(other));
      else finish(room, 'abandoned');
    } else {
      removePlayer(room, p);
    }
  });
}
function removePlayer(room, p) {
  room.players = room.players.filter(q => q !== p);
  for (const res of p.streams) { send(res, 'gone', { reason: 'left' }); try { res.end(); } catch (e) {} }
  p.streams.clear();
  if (!room.players.length) { clearTimers(room); rooms.delete(room.code); return; }
  // 対戦の結果画面はそのまま残す（残った人が結果を見られるように）。それ以外は待機にもどす
  if (room.phase === 'countdown' || room.phase === 'playing') { clearTimers(room); room.phase = 'lobby'; }
  room.players.forEach(q => { q.ready = false; q.rematch = false; });
  room.notice = 'opponentLeft';
  broadcast(room);
}
function find(code, token) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return {};
  const p = room.players.find(q => q.token === token);
  return { room, p };
}

// ---- 問題の受け取り（部屋を作った人のお題リスト。サーバーで並びを決めて2人に配る）----
function cleanPool(pool) {
  if (!Array.isArray(pool)) return null;
  const out = [];
  for (const it of pool.slice(0, 500)) {
    if (!it) continue;
    const d = String(it.display || '').slice(0, 60), r = String(it.roman || '');
    if (!d || !/^[a-z]{1,120}$/.test(r)) continue;
    out.push({ display: d, roman: r });
  }
  return out.length >= 5 ? out : null;
}

// ---- 進み具合（ありえない値は受けつけない）----
function applyProgress(room, p, b) {
  if (room.phase !== 'playing' && room.phase !== 'countdown') return 'not-playing';
  const t = now();
  if (t < room.startAt || t > room.endAt + CFG.resultGraceMs) return 'out-of-time';
  const solved = int(b.solved, 0, room.problems.length);
  const correct = int(b.correct, 0, 1e6), miss = int(b.miss, 0, 1e6);
  if (solved < p.prog.solved || correct < p.prog.correct || miss < p.prog.miss) return 'backwards';
  // 打てる文字数の上限：解いた問題の文字数＋いま打っている問題の文字数
  let maxChars = 0;
  for (let i = 0; i <= solved && i < room.problems.length; i++) maxChars += room.problems[i].roman.length;
  const elapsed = (Math.min(t, room.endAt) - room.startAt) / 1000;
  const speedCap = Math.ceil(elapsed * CFG.maxCharsPerSecond) + 10;
  if (correct > maxChars || correct > speedCap) return 'impossible';
  let solvedChars = 0; for (let i = 0; i < solved; i++) solvedChars += room.problems[i].roman.length;
  if (correct < solvedChars) return 'impossible';
  p.prog = { correct, miss, solved, t };
  return null;
}

// ---- HTTP ----
function cors(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', CFG.allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');   // file:// から LAN のサーバーへ
}
function json(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too-large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(new Error('bad-json')); } });
    req.on('error', reject);
  });
}
// 相手の IP（公開先のプロキシの後ろでは X-Forwarded-For の先頭）
function clientIp(req) {
  if (CFG.trustProxy) { const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (f) return f; }
  return req.socket.remoteAddress || '?';
}
// 作りすぎ・コードの総当たりをふせぐ（IP ごと・1分あたり）
const rateLogs = { create: new Map(), join: new Map() };
function allow(kind, ip, max) {
  const log = rateLogs[kind], t = now(), a = (log.get(ip) || []).filter(x => t - x < 60000);
  if (a.length >= max) { log.set(ip, a); return false; }
  a.push(t); log.set(ip, a); return true;
}
setInterval(() => { const t = now(); for (const log of Object.values(rateLogs)) for (const [ip, a] of log) if (!a.some(x => t - x < 60000)) log.delete(ip); }, 60000).unref();

const api = {
  async create(b, req) {
    if (rooms.size >= CFG.maxRooms) return [503, { error: 'busy', message: 'サーバーの部屋がいっぱいです。しばらくしてからためしてください。' }];
    if (!allow('create', clientIp(req), 10)) return [429, { error: 'rate', message: '部屋を作りすぎています。少し待ってください。' }];
    const pool = cleanPool(b.pool);
    if (!pool) return [400, { error: 'pool', message: 'お題を受け取れませんでした。' }];
    const code = newCode(); if (!code) return [503, { error: 'busy', message: '部屋を作れませんでした。' }];
    const p = { name: cleanName(b.name), token: newToken(), ready: false, rematch: false, connected: false, disconnectedAt: now(), streams: new Set() };
    resetProgress(p);
    const room = { code, phase: 'lobby', players: [p], pool, problems: null, startAt: 0, endAt: 0, matchNo: 0, result: null,
      category: String(b.category || '').slice(0, 20), catLabel: String(b.catLabel || '').slice(0, 20), timers: [], lastActive: now(), notice: null };
    rooms.set(code, room);
    watchDisconnect(room, p);   // 部屋を作ったのに接続しないまま放置したとき用
    return [200, { code, token: p.token, you: 0 }];
  },
  async join(b, req) {
    if (!allow('join', clientIp(req), CFG.maxJoinsPerMinute)) return [429, { error: 'rate', message: '参加の操作が多すぎます。1分ほど待ってからためしてください。' }];
    const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const room = rooms.get(code);
    if (!room) return [404, { error: 'notfound', message: 'そのコードの部屋は見つかりません。コードをもう一度たしかめてください。' }];
    if (room.phase === 'countdown' || room.phase === 'playing') return [409, { error: 'playing', message: 'その部屋はいま対戦中なので入れません。' }];
    if (room.players.length >= 2) return [409, { error: 'full', message: 'その部屋はもう2人そろっています（満員）。' }];
    const p = { name: cleanName(b.name), token: newToken(), ready: false, rematch: false, connected: false, disconnectedAt: now(), streams: new Set() };
    resetProgress(p);
    room.players.push(p); room.phase = 'lobby'; room.result = null; room.notice = null;
    room.players.forEach(q => { q.ready = false; q.rematch = false; });
    room.lastActive = now();
    watchDisconnect(room, p);
    broadcast(room);
    return [200, { code, token: p.token, you: room.players.length - 1 }];
  },
  async ready(b) {
    const { room, p } = find(b.code, b.token); if (!p) return [404, { error: 'notfound', message: '部屋が見つかりません。' }];
    if (room.phase !== 'lobby') return [409, { error: 'phase' }];
    p.ready = !!b.ready; room.lastActive = now(); room.notice = null;
    if (room.players.length === 2 && room.players.every(q => q.ready && q.connected)) startMatch(room);
    else broadcast(room);
    return [200, { ok: true }];
  },
  async progress(b) {
    const { room, p } = find(b.code, b.token); if (!p) return [404, { error: 'notfound' }];
    const err = applyProgress(room, p, b); room.lastActive = now();
    if (err) return [409, { error: err }];
    broadcast(room);
    return [200, { ok: true }];
  },
  async rematch(b) {
    const { room, p } = find(b.code, b.token); if (!p) return [404, { error: 'notfound', message: '部屋が見つかりません。' }];
    if (room.phase !== 'result') return [409, { error: 'phase' }];
    p.rematch = !!b.want; room.lastActive = now();
    if (room.players.length === 2 && room.players.every(q => q.rematch && q.connected)) startMatch(room);
    else broadcast(room);
    return [200, { ok: true }];
  },
  async leave(b) {
    const { room, p } = find(b.code, b.token); if (!p) return [200, { ok: true }];
    if (room.phase === 'countdown' || room.phase === 'playing') {
      const other = room.players.find(q => q !== p);
      if (other) finish(room, 'forfeit', room.players.indexOf(other));
    }
    removePlayer(room, p);
    return [200, { ok: true }];
  },
};

function stream(req, res, q) {
  const { room, p } = find(q.get('code'), q.get('token'));
  if (!p) { json(res, 404, { error: 'notfound' }); return; }
  cors(res);
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 2000\n\n');
  p.streams.add(res); p.connected = true; p.disconnectedAt = null; room.lastActive = now();
  const idx = room.players.indexOf(p);
  if (room.problems && room.phase !== 'lobby') sendMatch(room, p);
  broadcast(room);
  send(res, 'state', publicState(room, idx));
  const ping = setInterval(() => { try { res.write(': ping ' + now() + '\n\n'); } catch (e) {} }, 10000);
  req.on('close', () => {
    clearInterval(ping);
    p.streams.delete(res);
    if (!p.streams.size && room.players.includes(p)) {
      p.connected = false; p.disconnectedAt = now();
      broadcast(room);
      watchDisconnect(room, p);
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      fs.readFile(GAME_FILE, (err, buf) => {
        if (err) { res.writeHead(500); res.end('index.html が見つかりません'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); res.end(buf);
      });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/time') { json(res, 200, { now: now() }); return; }
    if (req.method === 'GET' && url.pathname === '/api/health') { json(res, 200, { ok: true, name: 'ttw-online', rooms: rooms.size, matchSeconds: CFG.matchSeconds }); return; }
    if (req.method === 'GET' && url.pathname === '/api/stream') { stream(req, res, url.searchParams); return; }
    if (req.method === 'GET' && url.pathname === '/api/check') {   // 再接続の前に「まだ部屋にいるか」をたしかめる
      const { p } = find(url.searchParams.get('code'), url.searchParams.get('token'));
      json(res, p ? 200 : 404, p ? { ok: true } : { error: 'notfound' }); return;
    }
    const m = url.pathname.match(/^\/api\/(create|join|ready|progress|rematch|leave)$/);
    if (req.method === 'POST' && m) {
      let body;
      try { body = await readBody(req, m[1] === 'create' ? 256 * 1024 : 4 * 1024); }
      catch (e) { json(res, 400, { error: 'bad-request' }); return; }
      const [code, obj] = await api[m[1]](body, req);
      json(res, code, obj); return;
    }
    json(res, 404, { error: 'notfound' });
  } catch (e) {
    console.error(e);
    try { json(res, 500, { error: 'server' }); } catch (e2) {}
  }
});

// 使われていない部屋をかたづける
setInterval(() => {
  const t = now();
  for (const [code, room] of rooms) {
    const idle = t - room.lastActive > CFG.roomIdleMinutes * 60000;
    const nobody = room.players.every(p => !p.connected) && t - Math.max(...room.players.map(p => p.disconnectedAt || 0)) > CFG.lobbyGraceSeconds * 1000 * 2;
    if (idle || nobody) { clearTimers(room); for (const p of room.players) for (const r of p.streams) { try { r.end(); } catch (e) {} } rooms.delete(code); }
  }
}, 30000).unref();

server.listen(CFG.port, CFG.host, () => {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
  console.log('==============================================');
  console.log(' TYPE THE WORLD オンライン対戦サーバー 起動');
  console.log(' このパソコン: http://localhost:' + CFG.port + '/');
  if (process.env.RENDER_EXTERNAL_URL) console.log(' 公開URL: ' + process.env.RENDER_EXTERNAL_URL + '/');
  for (const ip of ips) console.log(' 同じWi-Fiの別のパソコン: http://' + ip + ':' + CFG.port + '/');
  console.log(' 対戦 ' + CFG.matchSeconds + '秒 / カウントダウン ' + CFG.countdownSeconds + '秒 / 切断の猶予 ' + CFG.disconnectGraceSeconds + '秒');
  console.log(' 止めるときは このウィンドウで Ctrl + C');
  console.log('==============================================');
});
module.exports = { server, rooms, CFG };
