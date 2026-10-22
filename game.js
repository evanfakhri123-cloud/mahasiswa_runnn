(() => {
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const W = 800, LH = 200, GY = 165;
let mode = 2, state = 'menu', players = [], obs = [], parts = [];
let speed, dist, frame, shake = 0, acc = 0, last = 0, hi = 0;
try { hi = +localStorage.getItem('mr_hi') || 0; } catch (e) {}
const keys = {};
const pad5 = n => String(n).padStart(5, '0');
const cleanName = v => v.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 12);

// ---------- leaderboard ----------
// Isi REMOTE_URL dengan URL Firebase Realtime Database (mis. 'https://proyekmu-default-rtdb.firebaseio.com')
// agar leaderboard dipakai bersama semua pemain. Jika kosong, skor hanya tersimpan di browser ini.
const REMOTE_URL = '';
const LB_KEY = 'ma_lb';
let scores = [];
const localScores = () => { try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch (e) { return []; } };
async function loadScores() {
  scores = localScores();
  if (REMOTE_URL) {
    try { const d = await (await fetch(REMOTE_URL.replace(/\/$/, '') + '/scores.json')).json(); if (d) scores = Object.values(d); } catch (e) {}
  }
  scores = scores.filter(s => s && typeof s.name == 'string' && +s.score >= 0)
    .sort((a, b) => b.score - a.score || a.t - b.t).slice(0, 100);
  renderLB();
}
async function addScore(name, score) {
  const e = { name, score, t: Date.now() };
  const list = localScores(); list.push(e); list.sort((a, b) => b.score - a.score);
  try { localStorage.setItem(LB_KEY, JSON.stringify(list.slice(0, 100))); } catch (_) {}
  if (REMOTE_URL) { try { await fetch(REMOTE_URL.replace(/\/$/, '') + '/scores.json', { method: 'POST', body: JSON.stringify(e) }); } catch (_) {} }
}
function fillList(el, list) {
  el.textContent = '';
  if (!list.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Belum ada skor. Jadilah yang pertama!'; el.appendChild(li); return; }
  const medal = ['🥇', '🥈', '🥉'];
  list.forEach((s, i) => {
    const li = document.createElement('li'), rk = document.createElement('span'), nm = document.createElement('span'), sc = document.createElement('b');
    rk.className = 'rk'; rk.textContent = medal[i] || i + 1;
    nm.className = 'nm'; nm.textContent = s.name;
    sc.textContent = pad5(s.score);
    li.append(rk, nm, sc); el.appendChild(li);
  });
}
function renderLB() { fillList($('lbTop'), scores.slice(0, 5)); fillList($('lbAll'), scores); $('lbCount').textContent = scores.length; }
const closeModal = () => $('modal').classList.add('hide');

const defs = [
  { e: '📚', n: 'Buku',    w: 30, h: 30, b: 0 },
  { e: '💻', n: 'Laptop',  w: 36, h: 34, b: 0 },
  { e: '🗂️', n: 'Tugas',   w: 34, h: 48, b: 0 },
  { e: '🧑‍🏫', n: 'Dosen',   w: 36, h: 62, b: 0 },
  { e: '📄', n: 'Revisi!', w: 34, h: 28, b: 36, air: 1 }
];
const ctl = [{ j: ['KeyW', 'Space'], d: ['KeyS'] }, { j: ['ArrowUp'], d: ['ArrowDown'] }];

// ---------- suara ----------
let ac;
function beep(f, d, type = 'square', v = .05) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = v;
    o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d);
    o.stop(ac.currentTime + d);
  } catch (e) {}
}

// ---------- state ----------
function reset() {
  const cols = ['#4da3ff', '#ff5d6c'];
  players = [];
  for (let i = 0; i < mode; i++)
    players.push({ y: 0, vy: 0, duck: false, dead: false, score: 0, col: cols[i], name: cleanName($('n' + (i + 1)).value) || 'P' + (i + 1) });
  obs = []; parts = []; speed = 6; dist = 0; frame = 0; shake = 0;
  hud();
}
function setMode(m) {
  mode = m;
  $('m1').classList.toggle('on', m == 1);
  $('m2').classList.toggle('on', m == 2);
  $('card2').style.display = $('pad2').style.display = $('nw2').style.display = m == 2 ? '' : 'none';
  cv.height = LH * m; state = 'menu'; reset();
  showOverlay('Siap kuliah?', 'Tekan Spasi / Enter atau tombol di bawah', '▶ MULAI');
}
function showOverlay(t, p, b) { $('ot').textContent = t; $('op').textContent = p; $('go').textContent = b; $('overlay').classList.remove('hide'); }
function start() {
  for (let i = 0; i < mode; i++) {
    if (!cleanName($('n' + (i + 1)).value)) {
      const el = $('n' + (i + 1)); el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); el.focus(); return;
    }
  }
  try { localStorage.setItem('ma_names', JSON.stringify([$('n1').value, $('n2').value])); } catch (e) {}
  document.activeElement && document.activeElement.blur();
  reset(); state = 'run'; $('overlay').classList.add('hide'); beep(660, .12);
}
function hud() {
  players.forEach((p, i) => $('l' + (i + 1)).textContent = p.name);
  $('s1').textContent = pad5(players[0] ? players[0].score : 0);
  $('s2').textContent = pad5(players[1] ? players[1].score : 0);
  $('hi').textContent = pad5(hi);
}

// ---------- input ----------
$('m1').onclick = e => { setMode(1); e.target.blur(); };
$('m2').onclick = e => { setMode(2); e.target.blur(); };
$('go').onclick = e => { start(); e.target.blur(); };
addEventListener('keydown', e => {
  if (!$('modal').classList.contains('hide')) { if (e.code == 'Escape') closeModal(); return; }
  if (e.target.tagName == 'INPUT') { if (e.code == 'Enter' && state != 'run') start(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (state != 'run' && (e.code == 'Enter' || e.code == 'Space')) start();
});
addEventListener('keyup', e => keys[e.code] = false);
[['p1j', 'P1J'], ['p1d', 'P1D'], ['p2j', 'P2J'], ['p2d', 'P2D']].forEach(([id, k]) => {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; if (state != 'run') start(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => keys[k] = false));
});
const down = (i, t) => (t == 'j' ? ctl[i].j : ctl[i].d).some(k => keys[k]) || keys['P' + (i + 1) + (t == 'j' ? 'J' : 'D')];

// ---------- partikel ----------
function puff(x, y, col, n, spd) {
  for (let i = 0; i < n; i++)
    parts.push({ x, y, vx: (Math.random() - .5) * spd, vy: -Math.random() * spd, l: 20 + Math.random() * 14, col });
}

// ---------- update ----------
function update() {
  frame++; speed = Math.min(15, 6 + dist / 1800); dist += speed;
  players.forEach((p, i) => {
    if (p.dead) return;
    p.score = Math.floor(dist / 10);
    const onG = p.y <= 0;
    if (onG && down(i, 'j')) { p.vy = 12.5; p.y = .01; beep(520, .1, 'square'); puff(i * 0, 0, '#ddd', 0, 0); }
    p.duck = onG && down(i, 'd');
    if (!onG && down(i, 'd')) p.vy -= 1.2;
    if (p.y > 0 || p.vy > 0) {
      p.vy -= .65; p.y += p.vy;
      if (p.y <= 0) { p.y = 0; p.vy = 0; parts.push(...Array.from({ length: 6 }, () => ({ x: 80, y: i * LH + GY, vx: (Math.random() - .5) * 4, vy: -Math.random() * 2, l: 16, col: 'rgba(200,200,200,.8)' }))); }
    } else if (frame % 6 == 0) {
      parts.push({ x: 66, y: i * LH + GY - 2, vx: -speed * .3, vy: -Math.random(), l: 14, col: 'rgba(200,200,200,.6)' });
    }
  });
  obs.forEach(o => o.x -= speed);
  obs = obs.filter(o => o.x > -80);
  const lo = obs[obs.length - 1];
  if (!lo || lo.x < W - (280 + Math.random() * 260 + speed * 14)) {
    const pool = dist > 1500 ? defs : defs.slice(0, 4);
    obs.push({ ...pool[Math.floor(Math.random() * pool.length)], x: W + 20 });
  }
  players.forEach((p, i) => {
    if (p.dead) return;
    const ph = p.duck ? 30 : 52, px = 68, pw = 28;
    for (const o of obs) {
      const ox = o.x + 6, ow = o.w - 10;
      if (px + pw > ox && px < ox + ow && p.y + 4 < o.b + o.h - 4 && p.y + ph - 4 > o.b + 4) {
        p.dead = true; shake = 12; beep(140, .35, 'sawtooth', .08);
        puff(80, i * LH + GY - 30, p.col, 24, 8); break;
      }
    }
  });
  hud();
  if (players.every(p => p.dead)) end();
}
function end() {
  state = 'over';
  const best = Math.max(...players.map(p => p.score));
  if (best > hi) { hi = best; try { localStorage.setItem('mr_hi', hi); } catch (e) {} }
  hud();
  Promise.all(players.filter(p => p.score > 0).map(p => addScore(p.name, p.score))).then(loadScores);
  let t = 'GAME OVER 💀';
  if (mode == 2) {
    const [a, b] = players;
    t = a.score > b.score ? '🏆 ' + a.name.toUpperCase() + ' MENANG!' : b.score > a.score ? '🏆 ' + b.name.toUpperCase() + ' MENANG!' : 'SERI! 🤝';
  }
  setTimeout(() => showOverlay(t, 'Skor: ' + players.map(p => p.name + ' ' + pad5(p.score)).join('  ·  '), '↻ MAIN LAGI'), 700);
}

// ---------- gambar ----------
const mx = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join()})`;
const night = () => Math.min(1, Math.max(0, (Math.sin(dist / 2600 - 1) + .35) / 1.2));

function drawBg(n) {
  const g = ctx.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, mx([110, 190, 255], [12, 16, 48], n));
  g.addColorStop(1, mx([255, 236, 214], [58, 44, 110], n));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, LH);
  // bintang
  if (n > .3) {
    ctx.fillStyle = `rgba(255,255,255,${(n - .3) * 1.2})`;
    for (let i = 0; i < 28; i++) ctx.fillRect((i * 83) % W, (i * 37) % 90 + 6, 2, 2);
  }
  // matahari / bulan
  const sx = 640 - (dist * .02) % 120, sy = 52 + n * 6;
  ctx.fillStyle = n > .5 ? '#f4f1d0' : '#ffd166';
  ctx.shadowColor = n > .5 ? '#fff' : '#ffb347'; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.arc(sx, sy, 20, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  // awan
  ctx.fillStyle = mx([255, 255, 255], [80, 80, 130], n);
  for (let k = 0; k < 4; k++) {
    const cx = ((k * 260 - dist * .18) % (W + 140) + W + 140) % (W + 140) - 70;
    const cy = 28 + (k * 23) % 50;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.arc(cx + 15, cy - 5, 14, 0, 7); ctx.arc(cx + 32, cy, 11, 0, 7); ctx.fill();
  }
  // gedung kampus (parallax)
  const total = 14 * 90;
  for (let i = 0; i < 14; i++) {
    const bw = 46 + (i * 13) % 30, bh = 38 + (i * 29) % 58;
    const bx = ((i * 90 - dist * .35) % total + total) % total - 90;
    ctx.fillStyle = mx([120, 140, 175], [24, 28, 66], n);
    ctx.fillRect(bx, GY - bh, bw, bh);
    ctx.fillStyle = n > .4 ? '#ffd98a' : mx([200, 220, 245], [200, 220, 245], 0);
    for (let wy = GY - bh + 8; wy < GY - 10; wy += 14)
      for (let wx = bx + 7; wx < bx + bw - 8; wx += 12) ctx.fillRect(wx, wy, 5, 7);
  }
  // tanah
  const gr = ctx.createLinearGradient(0, GY, 0, LH);
  gr.addColorStop(0, mx([120, 200, 120], [30, 70, 60], n));
  gr.addColorStop(1, mx([90, 160, 95], [18, 44, 40], n));
  ctx.fillStyle = gr; ctx.fillRect(0, GY, W, LH - GY);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, GY, W, 3);
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  for (let k = 0; k < 24; k++) ctx.fillRect(((k * 71 - dist) % W + W) % W, GY + 9 + (k % 3) * 8, 14, 2);
}

function drawStudent(p) {
  const gy = GY - p.y, f = Math.floor(frame / 5) % 2, x = 60;
  ctx.save();
  // bayangan
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  const sw = 28 - Math.min(14, p.y / 6);
  ctx.beginPath(); ctx.ellipse(x + 20, GY + 2, sw, 4, 0, 0, 7); ctx.fill();
  if (p.dead) ctx.globalAlpha = .55;
  const skin = '#f1c9a0', hair = '#2b2118', shoe = '#fff';
  if (p.duck) {
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x - 8, gy - 26, 10, 18);        // tas
    ctx.fillStyle = '#2f3a5c'; ctx.fillRect(x + 2, gy - 9, 30, 9);          // kaki
    ctx.fillStyle = shoe; ctx.fillRect(x + 28, gy - 5, 10, 5);
    ctx.fillStyle = p.col; ctx.fillRect(x, gy - 26, 34, 18);                 // badan
    ctx.fillStyle = skin; ctx.fillRect(x + 28, gy - 32, 18, 16);             // kepala
    ctx.fillStyle = hair; ctx.fillRect(x + 26, gy - 35, 20, 7);
    ctx.fillStyle = '#111'; ctx.fillRect(x + 40, gy - 25, 3, 3);
  } else {
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x - 6, gy - 38, 11, 24);         // tas
    ctx.fillStyle = '#2f3a5c';
    const air = p.y > 0 || p.dead;
    if (air) { ctx.fillRect(x + 8, gy - 14, 7, 12); ctx.fillRect(x + 20, gy - 14, 7, 12); }
    else if (f) { ctx.fillRect(x + 8, gy - 14, 7, 14); ctx.fillRect(x + 20, gy - 8, 7, 8); }
    else { ctx.fillRect(x + 8, gy - 8, 7, 8); ctx.fillRect(x + 20, gy - 14, 7, 14); }
    ctx.fillStyle = shoe;
    if (air) { ctx.fillRect(x + 7, gy - 3, 10, 4); ctx.fillRect(x + 20, gy - 3, 10, 4); }
    else if (f) { ctx.fillRect(x + 7, gy - 3, 10, 4); ctx.fillRect(x + 20, gy - 3 + 0, 10, 3); }
    else { ctx.fillRect(x + 7, gy - 3, 10, 3); ctx.fillRect(x + 20, gy - 3, 10, 4); }
    ctx.fillStyle = p.col; ctx.fillRect(x + 4, gy - 38, 26, 25);             // kaos
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 4, gy - 28, 26, 3);
    ctx.fillStyle = skin; ctx.fillRect(x + 29, gy - 30, 5, 8);               // lengan
    ctx.fillRect(x + 8, gy - 54, 22, 17);                                    // kepala
    ctx.fillStyle = hair; ctx.fillRect(x + 6, gy - 58, 26, 8); ctx.fillRect(x + 6, gy - 54, 4, 8);
    ctx.fillStyle = '#111';
    if (p.dead) { ctx.fillRect(x + 22, gy - 48, 6, 2); ctx.fillRect(x + 24, gy - 50, 2, 6); }
    else { ctx.fillRect(x + 23, gy - 48, 3, 4); ctx.fillStyle = '#fff'; ctx.fillRect(x + 20, gy - 49, 9, 1); }
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, cv.height);
  const n = night();
  players.forEach((p, i) => {
    ctx.save();
    ctx.translate(0, i * LH);
    ctx.beginPath(); ctx.rect(0, 0, W, LH); ctx.clip();
    if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawBg(n);
    obs.forEach(o => {
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, GY + 2, o.w / 2, 3.5, 0, 0, 7); ctx.fill();
      ctx.font = o.h + 'px serif'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#000';
      ctx.fillText(o.e, o.x, GY - o.b + (o.air ? Math.sin(frame / 8) * 3 : 0));
      ctx.textBaseline = 'alphabetic';
      if (o.air) { ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#ff5d6c'; ctx.fillText(o.n, o.x - 3, GY - o.b - o.h - 4); }
    });
    drawStudent(p);
    // label pemain
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = p.col;
    ctx.fillText(p.name + (p.dead ? ' ☠' : ''), 12, 20);
    if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 0, W, 2); }
    ctx.restore();
  });
  // partikel (koordinat dunia kanvas)
  parts.forEach(q => { ctx.globalAlpha = Math.max(0, q.l / 30); ctx.fillStyle = q.col; ctx.fillRect(q.x, q.y, 4, 4); });
  ctx.globalAlpha = 1;
}
function stepParts() {
  parts.forEach(q => { q.x += q.vx; q.y += q.vy; q.vy += .15; q.l--; });
  parts = parts.filter(q => q.l > 0);
  if (shake > 0) shake *= .88;
}

function loop(t) {
  acc += Math.min(100, t - last); last = t;
  while (acc >= 16.67) { if (state == 'run') update(); stepParts(); acc -= 16.67; if (state != 'run') frame++; }
  draw(); requestAnimationFrame(loop);
}
try { const sv = JSON.parse(localStorage.getItem('ma_names')); if (sv) { $('n1').value = sv[0] || ''; $('n2').value = sv[1] || ''; } } catch (e) {}
$('lbMore').onclick = () => $('modal').classList.remove('hide');
$('lbClose').onclick = closeModal;
$('modal').onclick = e => { if (e.target.id == 'modal') closeModal(); };
const enter = () => { $('splash').classList.add('gone'); document.body.classList.add('ready'); };
$('splash').onclick = enter; setTimeout(enter, 2400);
loadScores(); setMode(2); requestAnimationFrame(loop);
})();
