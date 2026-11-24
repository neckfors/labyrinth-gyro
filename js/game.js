import { LEVELS } from './levels.js';
import { sound } from './audio.js';

const THEMES = {
  stone: {
    bg: '#1c2026',
    tileA: '#363d47',
    tileB: '#313741',
    grout: '#22262e',
    wallTop: '#6b7280',
    wallHighlight: '#9ca3af',
    wallSide: '#374151',
    wallShadow: 'rgba(0,0,0,0.52)',
    ballColors: ['#fff6d1', '#f59e0b', '#92400e'],
    obstacleType: 'spikes',
    pitColor: '#090b0f',
    pitRim: '#4b5563',
    goalColor: '#34d399',
    torch: false
  },
  wood: {
    bg: '#4b2e1b',
    tileA: '#d9a773',
    tileB: '#cfa06b',
    grout: '#b8844f',
    wallTop: '#8b5a2b',
    wallHighlight: '#b97f45',
    wallSide: '#543215',
    wallShadow: 'rgba(35,18,5,0.48)',
    ballColors: ['#ffffff', '#cbd5e1', '#475569'],
    obstacleType: 'hurdle',
    pitColor: '#160d06',
    pitRim: '#6d411c',
    goalColor: '#22c55e',
    torch: false
  },
  temple: {
    bg: '#0c0d12',
    tileA: '#1d202b',
    tileB: '#181a24',
    grout: '#10121a',
    wallTop: '#33394d',
    wallHighlight: '#505975',
    wallSide: '#181b26',
    wallShadow: 'rgba(0,0,0,0.68)',
    ballColors: ['#d1fae5', '#10b981', '#064e3b'],
    obstacleType: 'lava_bar',
    pitColor: '#ea580c',
    pitRim: '#7c2d12',
    goalColor: '#38bdf8',
    torch: true
  }
};

// DOM elements
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const lvlBadge = document.getElementById('lvlBadge');
const lvlName = document.getElementById('lvlName');
const timerPill = document.getElementById('timerPill');
const hintToast = document.getElementById('hintToast');
const inputModeLabel = document.getElementById('inputModeLabel');

const startOverlay = document.getElementById('startOverlay');
const winOverlay = document.getElementById('winOverlay');
const menuOverlay = document.getElementById('menuOverlay');

const startGyroBtn = document.getElementById('startGyroBtn');
const startWebBtn = document.getElementById('startWebBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const replayBtn = document.getElementById('replayBtn');
const calibrateBtn = document.getElementById('calibrateBtn');
const muteBtn = document.getElementById('muteBtn');
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const jumpBtn = document.getElementById('jumpBtn');
const unlockAllBtn = document.getElementById('unlockAllBtn');
const sensSlider = document.getElementById('sensSlider');
const sensVal = document.getElementById('sensVal');
const levelGrid = document.getElementById('levelGrid');

// Persistent progress
let unlocked = Number(localStorage.getItem('labyrinth_unlocked') || 1);
let bestTimes = JSON.parse(localStorage.getItem('labyrinth_best') || '{}');
let activeTheme = localStorage.getItem('labyrinth_theme') || 'wood';
let gyroSens = Number(localStorage.getItem('labyrinth_sens') || 1.0);
sensSlider.value = String(gyroSens);
sensVal.textContent = `${gyroSens.toFixed(1)}×`;

// Game state
let levelIndex = 0;
let grid = [];
let rows = 0;
let cols = 0;
let playing = false;
let paused = true;
let levelTime = 0;
let falls = 0;
let trapClock = 0;
let hintTimeout = null;

// Ball physics (in grid cell units!)
const BALL_R = 0.285; // Corridor is 1 / (2 * 0.285) ≈ 1.75x ball diameter
const ball = {
  x: 1.5,
  y: 1.5,
  vx: 0,
  vy: 0,
  z: 0,
  vz: 0,
  spawnX: 1.5,
  spawnY: 1.5,
  coyote: 0,
  jumpBuffer: 0,
  dyingTimer: 0,
  flashTimer: 0
};

// Camera (in grid cell units)
const cam = { x: 0, y: 0 };

// Input state
const keys = new Set();
let gyroEnabled = false;
let gyroRaw = { beta: 32, gamma: 0 };
let gyroNeutral = { beta: 32, gamma: 0 };
let hasGyroEvent = false;

// Touch virtual tilt fallback (drag on mobile if gyro off)
let touchDrag = null;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const t = Math.floor((sec * 10) % 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${t}`;
}

function showHint(text) {
  clearTimeout(hintTimeout);
  hintToast.textContent = text;
  hintToast.classList.remove('fade');
  hintTimeout = setTimeout(() => hintToast.classList.add('fade'), 4500);
}

function loadLevel(idx) {
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, idx));
  const lvl = LEVELS[levelIndex];
  grid = lvl.grid.map((row) => row.split(''));
  rows = grid.length;
  cols = grid[0].length;

  let sx = 1.5;
  let sy = 1.5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 'S') {
        sx = c + 0.5;
        sy = r + 0.5;
      }
    }
  }

  ball.spawnX = sx;
  ball.spawnY = sy;
  resetBallToSpawn();
  levelTime = 0;
  falls = 0;
  trapClock = 0;

  cam.x = ball.x;
  cam.y = ball.y;

  lvlBadge.textContent = `LVL ${levelIndex + 1}/${LEVELS.length}`;
  lvlName.textContent = lvl.name;
  timerPill.textContent = formatTime(0);
  showHint(lvl.hint);
  renderLevelGrid();
}

function resetBallToSpawn() {
  ball.x = ball.spawnX;
  ball.y = ball.spawnY;
  ball.vx = 0;
  ball.vy = 0;
  ball.z = 0;
  ball.vz = 0;
  ball.coyote = 0;
  ball.jumpBuffer = 0;
  ball.dyingTimer = 0;
}

function requestJump() {
  if (paused || !playing || ball.dyingTimer > 0) return;
  ball.jumpBuffer = 0.12;
}

function performJump() {
  ball.vz = 3.9;
  ball.z = Math.max(ball.z, 0.02);
  ball.coyote = 0;
  ball.jumpBuffer = 0;
  sound.jump();
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Keyboard input
window.addEventListener('keydown', (e) => {
  const code = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) {
    e.preventDefault();
  }
  keys.add(code);
  if (code === 'Space') {
    if (!winOverlay.classList.contains('hidden')) {
      nextLevelBtn.click();
    } else {
      requestJump();
    }
  }
});

window.addEventListener('keyup', (e) => keys.delete(e.code));

// Tap canvas to jump (or drag if gyro not enabled)
canvas.addEventListener('pointerdown', (e) => {
  if (paused || !playing) return;
  sound.ensure();
  touchDrag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, moved: false };
  requestJump();
});

canvas.addEventListener('pointermove', (e) => {
  if (!touchDrag || touchDrag.id !== e.pointerId || gyroEnabled) return;
  const dx = e.clientX - touchDrag.startX;
  const dy = e.clientY - touchDrag.startY;
  if (Math.hypot(dx, dy) > 10) touchDrag.moved = true;
  touchDrag.dx = Math.max(-60, Math.min(60, dx)) / 60;
  touchDrag.dy = Math.max(-60, Math.min(60, dy)) / 60;
});

const clearTouch = (e) => {
  if (touchDrag && touchDrag.id === e.pointerId) touchDrag = null;
};
canvas.addEventListener('pointerup', clearTouch);
canvas.addEventListener('pointercancel', clearTouch);

jumpBtn.addEventListener('click', () => {
  sound.ensure();
  requestJump();
});

// Gyro setup
function onDeviceOrientation(e) {
  if (e.beta == null || e.gamma == null) return;
  hasGyroEvent = true;
  gyroRaw.beta = e.beta;
  gyroRaw.gamma = e.gamma;
}

async function enableGyro() {
  sound.ensure();
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') {
        showHint('Gyro permission denied — using keyboard / touch.');
        startPlaying(false);
        return;
      }
    } catch {
      startPlaying(false);
      return;
    }
  }
  window.addEventListener('deviceorientation', onDeviceOrientation);
  startPlaying(true);
}

function startPlaying(withGyro) {
  gyroEnabled = withGyro;
  if (withGyro) {
    gyroNeutral.beta = gyroRaw.beta;
    gyroNeutral.gamma = gyroRaw.gamma;
    inputModeLabel.textContent = '📱 Gyro Tilt · Tap Screen to Jump';
  } else {
    inputModeLabel.textContent = '⌨️ WASD / Arrows · Space to Jump';
  }
  startOverlay.classList.add('hidden');
  playing = true;
  paused = false;
}

startGyroBtn.addEventListener('click', enableGyro);
startWebBtn.addEventListener('click', () => {
  sound.ensure();
  startPlaying(false);
});

calibrateBtn.addEventListener('click', () => {
  if (!hasGyroEvent) {
    showHint('No gyro sensor detected — use WASD / Arrows + Space.');
    return;
  }
  gyroNeutral.beta = gyroRaw.beta;
  gyroNeutral.gamma = gyroRaw.gamma;
  showHint('Gyro neutral calibrated!');
});

// Mute
function updateMuteIcon() {
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
}
updateMuteIcon();
muteBtn.addEventListener('click', () => {
  sound.toggleMute();
  updateMuteIcon();
});

// Menu & themes
menuBtn.addEventListener('click', () => {
  paused = true;
  renderLevelGrid();
  menuOverlay.classList.remove('hidden');
});

closeMenuBtn.addEventListener('click', () => {
  menuOverlay.classList.add('hidden');
  if (playing && winOverlay.classList.contains('hidden')) paused = false;
});

document.querySelectorAll('.theme-pill').forEach((btn) => {
  if (btn.dataset.theme === activeTheme) btn.classList.add('active');
  else btn.classList.remove('active');

  btn.addEventListener('click', () => {
    activeTheme = btn.dataset.theme;
    localStorage.setItem('labyrinth_theme', activeTheme);
    document.querySelectorAll('.theme-pill').forEach((b) => b.classList.toggle('active', b === btn));
  });
});

sensSlider.addEventListener('input', () => {
  gyroSens = Number(sensSlider.value);
  sensVal.textContent = `${gyroSens.toFixed(1)}×`;
  localStorage.setItem('labyrinth_sens', String(gyroSens));
});

unlockAllBtn.addEventListener('click', () => {
  unlocked = LEVELS.length;
  localStorage.setItem('labyrinth_unlocked', String(unlocked));
  renderLevelGrid();
});

function renderLevelGrid() {
  levelGrid.innerHTML = '';
  LEVELS.forEach((lvl, i) => {
    const isLocked = i + 1 > unlocked;
    const card = document.createElement('button');
    card.className = `level-card ${isLocked ? 'locked' : ''} ${i === levelIndex ? 'current' : ''}`;
    const best = bestTimes[i] != null ? formatTime(bestTimes[i]) : '--:--.-';
    card.innerHTML = `
      <span class="level-card-title">${i + 1}. ${lvl.name}</span>
      <span class="level-card-meta">${isLocked ? '🔒 Locked' : `Best: ${best}`}</span>
    `;
    if (!isLocked) {
      card.addEventListener('click', () => {
        loadLevel(i);
        menuOverlay.classList.add('hidden');
        startOverlay.classList.add('hidden');
        playing = true;
        paused = false;
      });
    }
    levelGrid.appendChild(card);
  });
}

nextLevelBtn.addEventListener('click', () => {
  winOverlay.classList.add('hidden');
  if (levelIndex + 1 < LEVELS.length) {
    loadLevel(levelIndex + 1);
  } else {
    loadLevel(0);
  }
  paused = false;
});

replayBtn.addEventListener('click', () => {
  winOverlay.classList.add('hidden');
  loadLevel(levelIndex);
  paused = false;
});

// Trap timing: 2.6s cycle -> [0..1.4s retracted, 1.4..1.9s warning, 1.9..2.6s extended]
function getTrapPhase(t) {
  const m = t % 2.6;
  if (m < 1.4) return 'safe';
  if (m < 1.9) return 'warn';
  return 'active';
}

function tileAt(c, r) {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return '#';
  return grid[r][c];
}

function isSolidForBall(c, r) {
  const t = tileAt(c, r);
  if (t === '#') return true;
  if (t === '-' && ball.z <= 0.24) return true; // Low barrier blocks ground movement
  return false;
}

function resolveWalls() {
  const minC = Math.floor(ball.x - BALL_R - 1);
  const maxC = Math.floor(ball.x + BALL_R + 1);
  const minR = Math.floor(ball.y - BALL_R - 1);
  const maxR = Math.floor(ball.y + BALL_R + 1);

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (!isSolidForBall(c, r)) continue;
      const nearX = Math.max(c, Math.min(ball.x, c + 1));
      const nearY = Math.max(r, Math.min(ball.y, r + 1));
      const dx = ball.x - nearX;
      const dy = ball.y - nearY;
      const distSq = dx * dx + dy * dy;

      if (distSq < BALL_R * BALL_R && distSq > 1e-9) {
        const dist = Math.sqrt(distSq);
        const overlap = BALL_R - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          if (Math.abs(vn) > 1.3) sound.bump(Math.min(1, Math.abs(vn) / 4));
          ball.vx -= (1 + 0.28) * vn * nx;
          ball.vy -= (1 + 0.28) * vn * ny;
        }
      }
    }
  }
}

function triggerFail() {
  if (ball.dyingTimer > 0) return;
  falls++;
  ball.dyingTimer = 0.32;
  ball.flashTimer = 0.32;
  sound.fail();
}

function completeLevel() {
  paused = true;
  sound.win();

  const prevBest = bestTimes[levelIndex];
  if (prevBest == null || levelTime < prevBest) {
    bestTimes[levelIndex] = levelTime;
    localStorage.setItem('labyrinth_best', JSON.stringify(bestTimes));
  }
  if (levelIndex + 2 > unlocked) {
    unlocked = Math.min(LEVELS.length, levelIndex + 2);
    localStorage.setItem('labyrinth_unlocked', String(unlocked));
  }

  const isFinal = levelIndex === LEVELS.length - 1;
  document.getElementById('winEyebrow').textContent = isFinal ? 'All Labyrinths Conquered!' : 'Labyrinth Cleared';
  document.getElementById('winTitle').textContent = LEVELS[levelIndex].name;
  document.getElementById('winTime').textContent = formatTime(levelTime);
  document.getElementById('winBest').textContent = formatTime(bestTimes[levelIndex]);
  document.getElementById('winFalls').textContent = String(falls);
  nextLevelBtn.textContent = isFinal ? 'Play From Start ↺' : 'Next Labyrinth →';

  winOverlay.classList.remove('hidden');
}

function getAcceleration() {
  let ax = 0;
  let ay = 0;

  if (keys.has('KeyA') || keys.has('ArrowLeft')) ax -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ax += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) ay -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) ay += 1;

  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    return { ax: ax / len, ay: ay / len };
  }

  if (gyroEnabled && hasGyroEvent) {
    const dead = 2.5;
    let gx = gyroRaw.gamma - gyroNeutral.gamma;
    let gy = gyroRaw.beta - gyroNeutral.beta;
    if (Math.abs(gx) < dead) gx = 0;
    if (Math.abs(gy) < dead) gy = 0;
    const maxTilt = 26 / gyroSens;
    ax = Math.max(-1, Math.min(1, gx / maxTilt));
    ay = Math.max(-1, Math.min(1, gy / maxTilt));
    return { ax, ay };
  }

  if (touchDrag && touchDrag.moved) {
    return { ax: touchDrag.dx, ay: touchDrag.dy };
  }

  return { ax: 0, ay: 0 };
}

function update(dt) {
  if (paused || !playing) return;

  levelTime += dt;
  trapClock += dt;
  timerPill.textContent = formatTime(levelTime);

  if (ball.flashTimer > 0) ball.flashTimer = Math.max(0, ball.flashTimer - dt);

  if (ball.dyingTimer > 0) {
    ball.dyingTimer -= dt;
    if (ball.dyingTimer <= 0) resetBallToSpawn();
    return;
  }

  // Z-axis jump physics
  if (ball.z <= 0.001) {
    ball.coyote = 0.09;
  } else {
    ball.coyote = Math.max(0, ball.coyote - dt);
  }
  if (ball.jumpBuffer > 0) {
    ball.jumpBuffer = Math.max(0, ball.jumpBuffer - dt);
    if (ball.coyote > 0) performJump();
  }

  if (ball.z > 0 || ball.vz > 0) {
    const wasAir = ball.z > 0.05;
    ball.z += ball.vz * dt;
    ball.vz -= 11.5 * dt;
    if (ball.z <= 0) {
      ball.z = 0;
      ball.vz = 0;
      if (wasAir) sound.land();
    }
  }

  // XY rolling physics
  const { ax, ay } = getAcceleration();
  const accel = 14.5;
  const maxSpeed = 5.4;
  const friction = ball.z > 0.05 ? 0.985 : 0.90;

  ball.vx += ax * accel * dt;
  ball.vy += ay * accel * dt;
  ball.vx *= Math.pow(friction, dt * 60);
  ball.vy *= Math.pow(friction, dt * 60);

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > maxSpeed) {
    ball.vx = (ball.vx / speed) * maxSpeed;
    ball.vy = (ball.vy / speed) * maxSpeed;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  resolveWalls();

  // Check current tile interactions
  const c = Math.floor(ball.x);
  const r = Math.floor(ball.y);
  const tile = tileAt(c, r);
  const grounded = ball.z <= 0.24;

  if (tile === 'P' && grounded) {
    triggerFail();
  } else if (tile === '^' && grounded) {
    triggerFail();
  } else if (tile === 'T' && grounded && getTrapPhase(trapClock) === 'active') {
    triggerFail();
  } else if (tile === 'C') {
    const cx = c + 0.5;
    const cy = r + 0.5;
    if (ball.spawnX !== cx || ball.spawnY !== cy) {
      ball.spawnX = cx;
      ball.spawnY = cy;
      showHint('Checkpoint reached!');
    }
  } else if (tile === 'G') {
    const dist = Math.hypot(ball.x - (c + 0.5), ball.y - (r + 0.5));
    if (dist < 0.34) {
      completeLevel();
    }
  }

  // Smooth camera follow
  cam.x += (ball.x - cam.x) * Math.min(1, dt * 8);
  cam.y += (ball.y - cam.y) * Math.min(1, dt * 8);
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function render() {
  const theme = THEMES[activeTheme] || THEMES.stone;
  const W = canvas.width;
  const H = canvas.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Ideal cell size (~52 CSS px) so corridors are neither too small nor too big/easy
  const cell = Math.round(52 * dpr);
  const boardW = cols * cell;
  const boardH = rows * cell;

  // Compute camera top-left offset, centering if board fits in viewport
  let ox, oy;
  if (boardW <= W) {
    ox = (W - boardW) / 2;
  } else {
    ox = W / 2 - cam.x * cell;
    ox = Math.min(16 * dpr, Math.max(W - boardW - 16 * dpr, ox));
  }
  if (boardH <= H) {
    oy = (H - boardH) / 2;
  } else {
    oy = H / 2 - cam.y * cell;
    oy = Math.min(16 * dpr, Math.max(H - boardH - 16 * dpr, oy));
  }

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  const trapPhase = getTrapPhase(trapClock);

  // 1. Floor & obstacles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cell;
      const y = oy + r * cell;
      if (x + cell < 0 || x > W || y + cell < 0 || y > H) continue;
      const t = grid[r][c];
      if (t === '#') continue;

      ctx.fillStyle = (r + c) % 2 === 0 ? theme.tileA : theme.tileB;
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = theme.grout;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);

      if (t === 'P') {
        ctx.fillStyle = theme.pitRim;
        drawRoundedRect(x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8, 8 * dpr);
        ctx.fillStyle = theme.pitColor;
        drawRoundedRect(x + cell * 0.17, y + cell * 0.17, cell * 0.66, cell * 0.66, 6 * dpr);
      } else if (t === '^' || (t === 'T' && trapPhase !== 'safe')) {
        const warnOnly = t === 'T' && trapPhase === 'warn';
        ctx.fillStyle = warnOnly ? 'rgba(245, 158, 11, 0.45)' : '#cbd5e1';
        for (let i = 0; i < 3; i++) {
          const sx = x + cell * (0.2 + i * 0.22);
          const sy = y + cell * 0.7;
          const h = warnOnly ? cell * 0.12 : cell * 0.34;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + cell * 0.08, sy - h);
          ctx.lineTo(sx + cell * 0.16, sy);
          ctx.closePath();
          ctx.fill();
        }
      } else if (t === 'T') {
        // Retracted trap holes
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x + cell * (0.28 + i * 0.22), y + cell * 0.55, cell * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (t === '-') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        drawRoundedRect(x + cell * 0.12, y + cell * 0.44, cell * 0.76, cell * 0.18, 4 * dpr);
        ctx.fillStyle = theme.obstacleType === 'lava_bar' ? '#f97316' : '#ef4444';
        drawRoundedRect(x + cell * 0.12, y + cell * 0.38, cell * 0.76, cell * 0.16, 4 * dpr);
      } else if (t === 'C') {
        const active = Math.abs(ball.spawnX - (c + 0.5)) < 0.1 && Math.abs(ball.spawnY - (r + 0.5)) < 0.1;
        ctx.strokeStyle = active ? '#38bdf8' : 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.24, 0, Math.PI * 2);
        ctx.stroke();
      } else if (t === 'G') {
        const pulse = 0.72 + Math.sin(trapClock * 4.5) * 0.2;
        ctx.save();
        ctx.strokeStyle = theme.goalColor;
        ctx.lineWidth = 3 * dpr;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = theme.goalColor;
        ctx.globalAlpha = 0.24;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // 2. Wall drop shadows
  const wallDepth = 8 * dpr;
  ctx.fillStyle = theme.wallShadow;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== '#') continue;
      const x = ox + c * cell;
      const y = oy + r * cell;
      if (x + cell < 0 || x > W || y + cell < 0 || y > H) continue;
      ctx.fillRect(x + 4 * dpr, y + 6 * dpr, cell, cell);
    }
  }

  // 3. Raised 3D-style walls
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== '#') continue;
      const x = ox + c * cell;
      const y = oy + r * cell;
      if (x + cell < -wallDepth || x > W || y + cell < -wallDepth || y > H + wallDepth) continue;
      ctx.fillStyle = theme.wallSide;
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = theme.wallTop;
      ctx.fillRect(x, y - wallDepth, cell, cell);
      ctx.fillStyle = theme.wallHighlight;
      ctx.fillRect(x, y - wallDepth, cell, 3 * dpr);
    }
  }

  // 4. Ball & Jump scaling
  const bx = ox + ball.x * cell;
  const by = oy + ball.y * cell;
  const baseR = BALL_R * cell;
  const shrink = ball.dyingTimer > 0 ? Math.max(0.15, ball.dyingTimer / 0.32) : 1;
  const jumpScale = (1 + ball.z * 0.58) * shrink;
  const drawR = baseR * jumpScale;
  const liftY = ball.z * 18 * dpr;
  const drawY = by - liftY;

  // Floor shadow
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.16, 0.48 - ball.z * 0.22)})`;
  ctx.beginPath();
  ctx.ellipse(
    bx + (3 + ball.z * 9) * dpr,
    by + (4 + ball.z * 11) * dpr,
    baseR * (1 - ball.z * 0.16) * shrink,
    baseR * (0.85 - ball.z * 0.14) * shrink,
    0, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  // Sphere
  const grad = ctx.createRadialGradient(
    bx - drawR * 0.32,
    drawY - drawR * 0.35,
    drawR * 0.12,
    bx,
    drawY,
    drawR
  );
  grad.addColorStop(0, theme.ballColors[0]);
  grad.addColorStop(0.55, theme.ballColors[1]);
  grad.addColorStop(1, theme.ballColors[2]);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(bx, drawY, drawR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  if (ball.flashTimer > 0) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.24)';
    ctx.fillRect(0, 0, W, H);
  }

  // 5. Torchlight vignette for Obsidian Temple
  if (theme.torch) {
    const vig = ctx.createRadialGradient(bx, drawY, cell * 1.2, bx, drawY, cell * 5.2);
    vig.addColorStop(0, 'rgba(255, 170, 60, 0.08)');
    vig.addColorStop(0.55, 'rgba(8, 10, 15, 0.48)');
    vig.addColorStop(1, 'rgba(5, 6, 10, 0.90)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

loadLevel(0);
requestAnimationFrame(loop);
