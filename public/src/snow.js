// Gentle snow on the home page over Christmas (the Christmas season's dates), with a button to turn it off (remembered on
// this device). Nothing falls for anyone who has asked their device for less motion.
import { seasonOn } from './catalog.js?v=21';

const KEY = 'kls-snow-off';

function remembered() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
function remember(off) {
  try { off ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch { /* fine */ }
}

if (seasonOn('christmas') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'snow' });
  canvas.setAttribute('aria-hidden', 'true');
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'snow-toggle' });
  document.body.append(canvas, button);
  const ctx = canvas.getContext('2d');
  let flakes = [];
  let running = false;

  function size() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.round(Math.min(70, innerWidth / 18));
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: 1.5 + Math.random() * 3, speed: 0.3 + Math.random() * 0.7, sway: Math.random() * Math.PI * 2,
    }));
  }
  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = '#a9bccb';
    for (const f of flakes) {
      f.y += f.speed; f.sway += 0.01; f.x += Math.sin(f.sway) * 0.3;
      if (f.y > innerHeight + 5) { f.y = -5; f.x = Math.random() * innerWidth; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  function set(on) {
    running = on && !document.hidden;
    canvas.hidden = !on;
    button.textContent = on ? 'Snow: on' : 'Snow: off';
    button.setAttribute('aria-pressed', String(on));
    if (running) requestAnimationFrame(frame);
  }
  let on = !remembered();
  button.addEventListener('click', () => { on = !on; remember(!on); set(on); });
  // No point drawing snow nobody can see.
  document.addEventListener('visibilitychange', () => set(on));
  addEventListener('resize', size);
  size();
  set(on);
}
