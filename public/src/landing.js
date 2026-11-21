import { FONTS, H, W } from './templates.js?v=23';
import { loadCatalogue } from './catalog.js?v=23';

const SAMPLE = { name: 'Leaf', line2: 'Kindle', books: '24', favourite: '' };
const { templates: available } = loadCatalogue();

function draw(canvas, scale) {
  const template = available.find((t) => t.id === canvas.dataset.design);
  if (!template) return;
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  template.draw(ctx, SAMPLE);
}

// The three designs at the top change on every visit.
const heroCanvases = [...document.querySelectorAll('.hero-art canvas')];
const shuffled = [...available].sort(() => Math.random() - 0.5);
// The front device is the second canvas; give it a light design so the trio reads well.
const picks = shuffled.slice(0, heroCanvases.length);
heroCanvases.forEach((canvas, i) => {
  if (picks[i]) canvas.dataset.design = picks[i].id;
});

const gallery = document.getElementById('gallery');
// Seasonal designs lead the gallery while they are available.
for (const template of [...available].sort((a, b) => Boolean(b.season) - Boolean(a.season))) {
  const link = document.createElement('a');
  link.href = `/make/?design=${template.id}`;
  const canvas = document.createElement('canvas');
  canvas.dataset.design = template.id;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${template.label} design`);
  link.append(canvas, template.label);
  if (template.season) link.append(Object.assign(document.createElement('small'), { textContent: 'Limited time' }));
  gallery.append(link);
}

function drawAll() {
  for (const canvas of heroCanvases) draw(canvas, 0.45);
  for (const canvas of gallery.querySelectorAll('canvas')) draw(canvas, 0.32);
}
drawAll();
// Designs use web fonts; redraw once they have arrived.
Promise.all(FONTS.map((font) => document.fonts.load(font)))
  .catch(() => {})
  .then(drawAll);
