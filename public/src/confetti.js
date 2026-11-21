// A little burst of books and stars when a lock screen is made (snowflakes at Christmas).
// Drawn on a canvas inside the "ready" dialog, so it shows above the page; skipped for anyone
// who has asked their device for less motion.
import { seasonOn } from './catalog.js?v=23';

const COLOURS = ['#2f5d50', '#d4a64a', '#b8433a', '#16181d', '#8fb3a7'];

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2, d = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}
function book(ctx, r) {
  ctx.fillRect(-r * 0.7, -r, r * 1.4, r * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r * 0.7 + r * 0.25, -r, r * 0.18, r * 2);
}
function flake(ctx, r) {
  ctx.lineWidth = Math.max(1.5, r / 4);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
  }
}

function burst() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.querySelector('dialog[open]') ?? document.body;
  const canvas = Object.assign(document.createElement('canvas'), { className: 'confetti' });
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  const wintry = seasonOn('christmas');
  const shapes = wintry ? [star, book, flake, flake] : [star, book, book];
  const pieces = Array.from({ length: 110 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 16,
    vy: -10 - Math.random() * 12,
    spin: (Math.random() - 0.5) * 0.3,
    turn: Math.random() * Math.PI,
    r: 6 + Math.random() * 7,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
  }));

  const started = performance.now();
  function frame(now) {
    const t = now - started;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = Math.max(0, Math.min(1, (2600 - t) / 600));
    for (const p of pieces) {
      p.vy += 0.38; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.turn += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.turn);
      ctx.fillStyle = ctx.strokeStyle = p.shape === flake ? '#8fb3d9' : p.colour;
      p.shape(ctx, p.r);
      ctx.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

addEventListener('lockscreen-made', burst);
