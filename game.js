const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const NAME = "Mom"; // used in birthday messages

// ---------- saved settings ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let cheats = store.get("arcadeCheats", {});
let best = store.get("arcadeBest", 0);
let sfxOn = store.get("arcadeSfx", true);
let musicOn = store.get("arcadeMusic", true);
let diff = store.get("arcadeDiff", "normal");
let scores = store.get("arcadeScores", []);
const DIFF = { easy: { lives: 5, speed: .75 }, normal: { lives: 3, speed: 1 }, hard: { lives: 3, speed: 1.3 } };
const getMode = () => { try { return sessionStorage.getItem("birthdayArcadeMode") || "halloween"; } catch (e) { return "halloween"; } };
const cheat = (k) => !!cheats[k];

// ---------- menus ----------
const CHEATS = [
  ["god", "♥", "God Mode", "Invincible, no damage"], ["lives", "∞", "Infinite Lives", "Never lose a life"],
  ["rapid", "⚡", "Rapid Fire", "Shoot faster"], ["slow", "❄", "Slow Asteroids", "Asteroids move slower"],
  ["shield", "◈", "Permanent Shield", "A bubble that recharges"], ["auto", "✦", "Auto-Fire", "Just steer, no tapping"],
  ["big", "⬆", "Big Ship", "Larger and easier to see"], ["chaos", "💥", "Chaos Mode", "Way more rocks"],
  ["bday", "🎂", "Birthday Mode", "Fireworks and wishes"]
];
const cheatRows = CHEATS.map(([k, i, n, d]) => `<div class="cheat-row"><span class="ci">${i}</span><div class="cheat-copy"><strong>${n}</strong><small>${d}</small></div><button class="switch" type="button" role="switch" aria-checked="false" data-cheat="${k}" aria-label="${n}"></button></div>`).join("");
$("#cheat-list").innerHTML = cheatRows; $("#pause-cheats").innerHTML = cheatRows;

const panels = ["main-menu", "cheat-menu", "settings-menu", "scores-menu"].map((id) => $("#" + id));
const mainMenu = panels[0];
function showPanel(p) { panels.forEach((i) => i.classList.add("hidden")); p.classList.remove("hidden"); if (p.id === "scores-menu") drawScores(); window.scrollTo(0, 0); }
function drawScores() {
  const el = $("#scores-list");
  if (!scores.length) { el.innerHTML = '<p class="empty-note">No scores yet.<br>Play a game and set the first record!</p>'; return; }
  el.innerHTML = '<div class="score-row head"><span>#</span><span>SCORE</span><span>MODE</span><span>DATE</span></div>' +
    scores.map((x, i) => `<div class="score-row${i ? "" : " first"}"><span>${i ? i + 1 : "👑"}</span><span>${x.s}</span><span class="${x.m === "halloween" ? "hal" : ""}">${x.m === "halloween" ? "Halloween" : "Normal"}</span><span>${x.d}</span></div>`).join("");
}
function syncUI() {
  $("#edition").textContent = getMode() === "normal" ? "COLORFUL EDITION" : "HALLOWEEN EDITION";
  $("#best-line").textContent = best ? "Best score: " + best : "";
  $$("[data-cheat]").forEach((b) => b.setAttribute("aria-checked", String(cheat(b.dataset.cheat))));
  $('[data-set="music"]').setAttribute("aria-checked", String(musicOn));
  $('[data-set="sfx"]').setAttribute("aria-checked", String(sfxOn));
  $$("[data-mode-choice]").forEach((b) => b.classList.toggle("on", b.dataset.modeChoice === getMode()));
  $$("[data-diff]").forEach((b) => b.classList.toggle("on", b.dataset.diff === diff));
}
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-cheat]");
  if (c) { cheats[c.dataset.cheat] = !cheat(c.dataset.cheat); store.set("arcadeCheats", cheats); }
  const s = e.target.closest("[data-set]");
  if (s) { if (s.dataset.set === "music") { musicOn = !musicOn; store.set("arcadeMusic", musicOn); } else { sfxOn = !sfxOn; store.set("arcadeSfx", sfxOn); } }
  const m = e.target.closest("[data-mode-choice]");
  if (m) { try { sessionStorage.setItem("birthdayArcadeMode", m.dataset.modeChoice); } catch (_) {} }
  const d = e.target.closest("[data-diff]");
  if (d) { diff = d.dataset.diff; store.set("arcadeDiff", diff); }
  if (e.target.closest("[data-back]")) showPanel(mainMenu);
  syncUI();
});
$("#home-button").onclick = () => { location.href = "index.html"; };
$("#open-settings").onclick = () => showPanel(panels[2]);
$("#open-cheats").onclick = () => showPanel(panels[1]);
$("#open-scores").onclick = () => showPanel(panels[3]);
syncUI();

// ---------- pictures (optional) ----------
const IM = {};
Object.keys(IMAGE_FILES).forEach((k) => loadImage(k).then((img) => {
  IM[k] = img;
  if (k === "homeBg" && img) document.body.style.backgroundImage = `linear-gradient(rgba(14,4,26,.5), rgba(14,4,26,.88)), url(${img.src})`;
}));

// ---------- sound ----------
let AC;
function beep(f, d = .1, type = "square", v = .04, music = false) {
  if (!(music ? musicOn : sfxOn)) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d);
  } catch (e) {}
}

let musicTimer = null, mi = 0;
const NOTES = [220, 262, 330, 262, 247, 294, 370, 294];
function startMusic() {
  stopMusic();
  musicTimer = setInterval(() => {
    if (!musicOn || !G || paused || G.end) return;
    const f = NOTES[mi % 8] * (Math.floor(mi / 8) % 2 ? .75 : 1);
    beep(f, .3, "triangle", .018, true); if (mi % 4 === 0) beep(f / 2, .5, "sine", .025, true); mi++;
  }, 280);
}
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

// ---------- game ----------
const cv = $("#cv"), cx = cv.getContext("2d");
let W = 1, H = 1, U = 1, G = null, paused = false, last = 0, keys = {}, stars = [];
const COLORS = ["#ff5c8a", "#b95cff", "#ff9a45", "#4fd8ff", "#ff8dd0", "#ffd84f"];
const PUMPKINS = ["#ff9a45", "#ff7a1a", "#c13fe0", "#ff536f", "#ffae5c"];
const rnd = (a, b) => a + Math.random() * (b - a);
const halloween = () => getMode() === "halloween";

function size() {
  const r = window.devicePixelRatio || 1;
  W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight;
  cv.width = W * r; cv.height = H * r; cx.setTransform(r, 0, 0, r, 0, 0);
  U = Math.max(.75, Math.min(W, H) / 380);
  stars = Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(0, H), p: rnd(0, 6), s: rnd(.6, 1.8) }));
}
addEventListener("resize", () => { if (G) size(); });

function spawnShip() { G.ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, inv: 180, sh: 1, shT: 0 }; }
function makeRock(x, y, s) {
  const sp = (rnd(.5, 1) + G.level * .07) * U * (4 - s) * .45 * DIFF[diff].speed * (cheat("slow") ? .4 : 1), a = rnd(0, 6.28);
  return { x, y, s, r: [0, 13, 25, 42][s] * U, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: rnd(0, 6), va: rnd(-.03, .03),
    p: Array.from({ length: 9 }, () => rnd(.75, 1.15)),
    c: halloween() ? PUMPKINS[Math.floor(rnd(0, PUMPKINS.length))] : COLORS[Math.floor(rnd(0, COLORS.length))] };
}
function wave() {
  const n = Math.min(12, 2 + G.level + (cheat("chaos") ? 5 : 0));
  for (let i = 0; i < n; i++) {
    let x, y;
    do { x = rnd(0, W); y = rnd(0, H); } while (G.ship && Math.hypot(x - G.ship.x, y - G.ship.y) < 150 * U);
    G.ast.push(makeRock(x, y, 3));
  }
}
function start() {
  $("#play").classList.remove("hidden"); document.body.style.overflow = "hidden";
  size();
  G = { score: 0, lives: DIFF[diff].lives, prevBest: best, level: 1, ast: [], bul: [], par: [], cool: 0, resp: 0, next: 0, end: false,
    bats: Array.from({ length: 4 }, () => ({ x: rnd(0, W), y: rnd(0, H), v: rnd(.4, 1), p: rnd(0, 6) })) };
  spawnShip(); wave(); paused = false;
  $("#pause-ov").classList.add("hidden"); $("#over-ov").classList.add("hidden");
  hud(); startMusic();
}
function hud() {
  $("#score").textContent = G.score; $("#level").textContent = G.level; $("#best").textContent = best;
  $("#lives").textContent = cheat("lives") ? "▲ ∞" : "▲".repeat(Math.max(0, G.lives));
}
function burst(x, y, n, cols, sp = 3) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.28), v = rnd(.5, sp) * U;
    G.par.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: rnd(25, 55), m: 55, c: cols[Math.floor(rnd(0, cols.length))], z: rnd(1.5, 3.5) * U });
  }
}
function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 2200); }
function hit(a, pts) {
  G.ast.splice(G.ast.indexOf(a), 1);
  if (pts) { G.score += [0, 100, 50, 20][a.s]; if (G.score > best) { best = G.score; store.set("arcadeBest", best); } }
  burst(a.x, a.y, a.s * 7, cheat("chaos") ? COLORS : [a.c, "#ffd24a", "#fff"], cheat("chaos") ? 5 : 3);
  beep(160 - a.s * 30, .18, "sawtooth", .05);
  if (a.s > 1) for (let i = 0; i < 2; i++) G.ast.push(makeRock(a.x, a.y, a.s - 1));
  hud();
}
function die() {
  const s = G.ship;
  burst(s.x, s.y, 30, ["#fff", "#ff9a45", "#ff536f", "#b95cff"], 5);
  beep(70, .5, "sawtooth", .08);
  if (navigator.vibrate) navigator.vibrate(80);
  G.ship = null;
  if (!cheat("lives")) G.lives--;
  hud();
  if (G.lives <= 0) {
    G.end = true;
    setTimeout(() => {
      if (!G) return;
      const win = G.score > G.prevBest && G.score > 0;
      if (G.score > 0) {
        scores.push({ s: G.score, m: getMode(), d: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
        scores.sort((a, b) => b.s - a.s); scores = scores.slice(0, 10); store.set("arcadeScores", scores);
      }
      $("#over-title").textContent = win ? "NEW HIGH SCORE!" : "GAME OVER";
      $("#final-score").textContent = G.score;
      $("#over-msg").textContent = win ? "You are a true space legend, " + NAME + "! ♥" : "Nice flying, " + NAME + "! Best score: " + best;
      $("#over-ov").classList.remove("hidden");
      if (win) for (let i = 0; i < 8; i++) setTimeout(() => G && burst(rnd(40, W - 40), rnd(60, H * .6), 40, COLORS, 5), i * 300);
    }, 900);
  } else G.resp = 90;
}
function update(dt) {
  const s = G.ship;
  if (s) {
    const k = cheat("big") ? 1.5 : 1, sr = 9 * k * U;
    if (keys.l) s.a -= .075 * dt;
    if (keys.r) s.a += .075 * dt;
    if (keys.t) {
      s.vx += Math.cos(s.a) * .11 * U * dt; s.vy += Math.sin(s.a) * .11 * U * dt;
      if (Math.random() < .5) G.par.push({ x: s.x - Math.cos(s.a) * 10 * k * U, y: s.y - Math.sin(s.a) * 10 * k * U, vx: -Math.cos(s.a) * 2 * U + rnd(-.5, .5), vy: -Math.sin(s.a) * 2 * U + rnd(-.5, .5), l: 15, m: 15, c: "#ff9a45", z: 2 * U });
    }
    const f = Math.pow(.993, dt); s.vx *= f; s.vy *= f;
    const m = Math.hypot(s.vx, s.vy), mx = 5.5 * U; if (m > mx) { s.vx *= mx / m; s.vy *= mx / m; }
    s.x = (s.x + s.vx * dt + W) % W; s.y = (s.y + s.vy * dt + H) % H;
    if (s.inv > 0) s.inv -= dt;
    if (s.sh === 0) { s.shT -= dt; if (s.shT <= 0) s.sh = 1; }
    G.cool -= dt;
    if ((keys.f || cheat("auto")) && G.cool <= 0) {
      G.bul.push({ x: s.x + Math.cos(s.a) * 12 * k * U, y: s.y + Math.sin(s.a) * 12 * k * U, vx: Math.cos(s.a) * 8.5 * U + s.vx * .4, vy: Math.sin(s.a) * 8.5 * U + s.vy * .4, l: 48 });
      G.cool = cheat("rapid") ? 5 : 15; beep(720, .07, "square", .025);
    }
    for (const a of G.ast.slice()) {
      if (Math.hypot(a.x - s.x, a.y - s.y) < a.r + sr * .8 && s.inv <= 0 && !cheat("god")) {
        if (cheat("shield") && s.sh) { s.sh = 0; s.shT = 300; s.inv = 40; hit(a, false); beep(300, .2, "triangle", .06); }
        else { die(); break; }
      }
    }
  } else if (!G.end && G.resp > 0) { G.resp -= dt; if (G.resp <= 0) spawnShip(); }
  for (const b of G.bul) { b.x += b.vx * dt; b.y += b.vy * dt; b.l -= dt; if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) b.l = 0; }
  G.bul = G.bul.filter((b) => b.l > 0);
  for (const a of G.ast) { a.x = (a.x + a.vx * dt + W) % W; a.y = (a.y + a.vy * dt + H) % H; a.a += a.va * dt; }
  for (const b of G.bul.slice()) for (const a of G.ast) { if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + 3 * U) { b.l = 0; hit(a, true); break; } }
  for (const p of G.par) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; }
  G.par = G.par.filter((p) => p.l > 0);
  if (!G.ast.length && !G.next && !G.end) {
    G.next = 70; G.level++; hud();
    if (cheat("bday")) {
      toast("Happy Birthday, " + NAME + "! 🎂");
      for (let i = 0; i < 6; i++) setTimeout(() => G && burst(rnd(40, W - 40), rnd(80, H / 2), 40, COLORS, 5), i * 220);
      beep(660, .3, "triangle", .06);
    } else toast("Level " + G.level);
  }
  if (G.next) { G.next -= dt; if (G.next <= 0) { G.next = 0; wave(); } }
}

// ---------- drawing ----------
function drawBg(t) {
  const im = halloween() ? IM.gameBg : null;
  if (im) {
    const sc = Math.max(W / im.width, H / im.height);
    cx.drawImage(im, -(im.width * sc - W) * .66, (H - im.height * sc) / 2, im.width * sc, im.height * sc);
    cx.fillStyle = "rgba(10,2,20,.3)"; cx.fillRect(0, 0, W, H);
  } else {
    const g = cx.createLinearGradient(0, 0, 0, H), h = halloween();
    g.addColorStop(0, h ? "#1d0538" : "#0b0220"); g.addColorStop(1, h ? "#4a0a28" : "#2a0a4a");
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  cx.fillStyle = "#fff";
  for (const s of stars) { cx.globalAlpha = (im ? .2 : .4) + .5 * Math.abs(Math.sin(t + s.p)); cx.fillRect(s.x, s.y, s.s, s.s); }
  cx.globalAlpha = 1;
  if (halloween()) {
    if (!im) { cx.fillStyle = "rgba(255,224,239,.92)"; cx.shadowColor = "#f6b8ff"; cx.shadowBlur = 30; cx.beginPath(); cx.arc(W * .8, H * .22, 28 * U, 0, 7); cx.fill(); cx.shadowBlur = 0; }
    cx.font = 22 * U + "px serif"; cx.textAlign = "center";
    for (const b of G.bats) { b.x = (b.x + b.v) % W; b.y += Math.sin(t + b.p) * .6; cx.globalAlpha = .55; cx.fillText("🦇", b.x, b.y); }
    cx.globalAlpha = 1;
  }
}
function drawRock(a) {
  cx.save(); cx.translate(a.x, a.y);
  const hw = halloween(), im = hw ? IM.pumpkin : IM.rock;
  if (im) {
    const w = a.r * 2.2, h = w * im.height / im.width;
    cx.rotate(hw ? Math.sin(a.a) * .5 : a.a); cx.drawImage(im, -w / 2, -h / 2, w, h);
  } else if (hw) pumpkin(a);
  else {
    cx.rotate(a.a); cx.beginPath();
    a.p.forEach((q, i) => { const an = i / a.p.length * 6.283; cx[i ? "lineTo" : "moveTo"](Math.cos(an) * a.r * q, Math.sin(an) * a.r * q); });
    cx.closePath(); cx.fillStyle = a.c + "33"; cx.strokeStyle = a.c; cx.lineWidth = 2.5 * U; cx.shadowColor = a.c; cx.shadowBlur = 12; cx.fill(); cx.stroke();
  }
  cx.restore();
}
function pumpkin(a) {
  const r = a.r; cx.rotate(Math.sin(a.a) * .5);
  cx.shadowColor = a.c; cx.shadowBlur = 12; cx.fillStyle = a.c; cx.beginPath(); cx.ellipse(0, 0, r, r * .88, 0, 0, 7); cx.fill(); cx.shadowBlur = 0;
  cx.strokeStyle = "rgba(0,0,0,.28)"; cx.lineWidth = 1.5 * U;
  for (const q of [.5, -.5]) { cx.beginPath(); cx.ellipse(0, 0, r * Math.abs(q), r * .88, 0, 0, 7); cx.stroke(); }
  cx.fillStyle = "#3b7d2a"; cx.fillRect(-r * .1, -r * 1.05, r * .2, r * .25);
  if (a.s > 1) {
    cx.fillStyle = "#ffe066";
    cx.beginPath(); cx.moveTo(-r * .5, -r * .05); cx.lineTo(-r * .12, -r * .05); cx.lineTo(-r * .31, -r * .4); cx.fill();
    cx.beginPath(); cx.moveTo(r * .5, -r * .05); cx.lineTo(r * .12, -r * .05); cx.lineTo(r * .31, -r * .4); cx.fill();
    cx.beginPath(); cx.moveTo(-r * .5, r * .2); cx.lineTo(-r * .25, r * .52); cx.lineTo(0, r * .28); cx.lineTo(r * .25, r * .52); cx.lineTo(r * .5, r * .2); cx.lineTo(0, r * .4); cx.fill();
  }
}
function drawShip(s) {
  if (s.inv > 0 && Math.floor(s.inv / 6) % 2) return;
  const k = (cheat("big") ? 1.5 : 1) * U;
  cx.save(); cx.translate(s.x, s.y); cx.rotate(s.a);
  if (IM.ship) {
    const w = 34 * k, h = w * IM.ship.height / IM.ship.width; cx.rotate(Math.PI / 2); cx.drawImage(IM.ship, -w / 2, -h / 2, w, h);
  } else {
    cx.scale(k, k); cx.beginPath(); cx.moveTo(14, 0); cx.lineTo(-10, -9); cx.lineTo(-5, 0); cx.lineTo(-10, 9); cx.closePath();
    const hw = halloween(); cx.fillStyle = hw ? "rgba(255,141,168,.3)" : "rgba(79,216,255,.3)"; cx.strokeStyle = hw ? "#ffc0d1" : "#4fd8ff";
    cx.lineWidth = 2.2; cx.shadowColor = cx.strokeStyle; cx.shadowBlur = 14; cx.fill(); cx.stroke();
  }
  cx.restore(); cx.shadowBlur = 0;
  if (cheat("god") || (cheat("shield") && s.sh)) {
    cx.strokeStyle = cheat("god") ? "rgba(255,216,79,.85)" : "rgba(79,216,255,.85)"; cx.lineWidth = 2.5;
    cx.beginPath(); cx.arc(s.x, s.y, 17 * k, 0, 7); cx.stroke();
  }
}
function draw() {
  const t = performance.now() / 600;
  drawBg(t);
  G.ast.forEach(drawRock);
  cx.fillStyle = "#fff"; cx.shadowColor = "#f0abfc"; cx.shadowBlur = 10;
  for (const b of G.bul) { cx.beginPath(); cx.arc(b.x, b.y, 3.2 * U, 0, 7); cx.fill(); }
  cx.shadowBlur = 0;
  for (const p of G.par) { cx.globalAlpha = Math.max(0, p.l / p.m); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.z, p.z); }
  cx.globalAlpha = 1;
  if (G.ship) drawShip(G.ship);
}
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - last) / 16.67 || 1, 3); last = t;
  if (!G || $("#play").classList.contains("hidden")) return;
  if (!paused) update(dt);
  draw();
}
requestAnimationFrame(loop);

// ---------- touch + keyboard controls ----------
$$("[data-k]").forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); keys[k] = 1; b.classList.add("down"); try { b.setPointerCapture(e.pointerId); } catch (_) {} });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => b.addEventListener(ev, () => { keys[k] = 0; b.classList.remove("down"); }));
});
document.addEventListener("contextmenu", (e) => { if (!$("#play").classList.contains("hidden")) e.preventDefault(); });
const KM = { ArrowLeft: "l", a: "l", ArrowRight: "r", d: "r", ArrowUp: "t", w: "t", " ": "f" };
addEventListener("keydown", (e) => { if (KM[e.key]) { keys[KM[e.key]] = 1; e.preventDefault(); } if (G && (e.key === "p" || e.key === "Escape")) pause(!paused); });
addEventListener("keyup", (e) => { if (KM[e.key]) keys[KM[e.key]] = 0; });
function pause(on) {
  if (!G || G.end) return;
  paused = on; $("#pause-ov").classList.toggle("hidden", !on); keys = {}; $$(".ctl").forEach((b) => b.classList.remove("down"));
}
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(true); });
$("#pause-btn").onclick = () => pause(true);
$("#resume").onclick = () => pause(false);
function leave() { stopMusic(); G = null; paused = false; $("#play").classList.add("hidden"); document.body.style.overflow = ""; syncUI(); showPanel(mainMenu); }
$("#restart").onclick = start; $("#again").onclick = start;
$("#quit").onclick = leave; $("#quit2").onclick = leave;
$("#start-game").onclick = start;
