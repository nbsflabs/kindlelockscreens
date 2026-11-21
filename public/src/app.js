import { FONTS, H, TEMPLATES, W } from './templates.js?v=21';
import { loadCatalogue } from './catalog.js?v=21';
import { DEFAULT_FILTERS, applyFilters } from './filters.js?v=21';
import { buildEpub, zipStore } from './epub.js?v=21';
import { DEVICES, saveDevice, savedDevice } from './devices.js?v=21';

const catalogue = loadCatalogue();
const AVAILABLE = catalogue.templates.length ? catalogue.templates : [{ ...TEMPLATES[0], fields: { name: true, line2: true } }];

// The preview is drawn this many pixels wide, whatever the screen size.
const PREVIEW_WIDTH = 632;
const THUMB_SCALE = 0.12;
const MAX_ZOOM = 4;

// True while Download is making the files.
let exporting = false;
const state = {
  mode: 'photo',
  image: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  template: AVAILABLE[0].id,
  name: 'Leaf',
  line2: 'Kindle',
  books: '24',
  favourite: '',
  filters: { ...DEFAULT_FILTERS },
  device: savedDevice(),
  caption: '',
  captionAt: 'bottom',
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const screen = $('screen');
const dropzone = $('dropzone');
const fileInput = $('file');
const zoomInput = $('zoom');
const errorEl = $('error');

const currentTemplate = () => AVAILABLE.find((t) => t.id === state.template);
const currentDevice = () => DEVICES.find((d) => d.id === state.device);

// ---------- Rendering ----------

function photoScale() {
  return Math.max(W / state.image.width, H / state.image.height) * state.zoom;
}

// Keeps the photo covering the whole screen so no blank edges are exported.
function clampPan() {
  const scale = photoScale();
  state.panX = Math.min(0, Math.max(W - state.image.width * scale, state.panX));
  state.panY = Math.min(0, Math.max(H - state.image.height * scale, state.panY));
}

function drawPhoto(ctx) {
  ctx.fillStyle = '#e9e6df';
  ctx.fillRect(0, 0, W, H);
  if (!state.image) return;
  const scale = photoScale();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(state.image, state.panX, state.panY, state.image.width * scale, state.image.height * scale);
}

// A short line of text over the photo, e.g. "If found, please email …". Drawn on the
// 1264x1680 design canvas, kept clear of the edges that other screen shapes trim.
const CAPTION_Y = { top: 190, middle: H / 2, bottom: H - 190 };
function drawCaption(ctx) {
  const text = state.caption.trim();
  if (!text) return;
  // Wrap at spaces; shrink the text if a long word (an email address, say) still won't fit.
  let size = 54;
  let lines;
  for (;;) {
    ctx.font = `600 ${size}px "DM Sans", sans-serif`;
    lines = [];
    for (const word of text.split(/\s+/)) {
      const last = lines[lines.length - 1];
      if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= 980) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    lines.splice(3);
    if (size <= 24 || Math.max(...lines.map((l) => ctx.measureText(l).width)) <= 980) break;
    size -= 2;
  }
  const lineHeight = Math.round(size * 1.3);
  const boxHeight = lines.length * lineHeight + 56;
  const boxWidth = Math.min(1100, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 96);
  const top = CAPTION_Y[state.captionAt] - boxHeight / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.roundRect((W - boxWidth) / 2, top, boxWidth, boxHeight, 28);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, top + 28 + lineHeight * (i + 0.5)));
}

// Fits the 1264x1680 design canvas to a screen: scaled to fill it, centred, with any
// overhang trimmed equally from both edges (at most a few percent for real e-readers).
function fit(width, height) {
  const scale = Math.max(width / W, height / H);
  return { scale, dx: (width - W * scale) / 2, dy: (height - H * scale) / 2 };
}

// A design with a colour version (inColour) draws it whenever black and white is off.
function paint(ctx, template, grayscale = state.filters.grayscale) {
  (template.inColour && !grayscale ? template.inColour : template.draw)(ctx, state);
}

function draw(ctx, template, grayscale) {
  if (template) paint(ctx, template, grayscale);
  else if (state.mode === 'photo') {
    drawPhoto(ctx);
    drawCaption(ctx);
  } else paint(ctx, currentTemplate(), grayscale);
}

function render(canvas, width, height, { template, filters = state.filters } = {}) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { scale, dx, dy } = fit(width, height);
  ctx.setTransform(scale, 0, 0, scale, dx, dy);
  draw(ctx, template, filters.grayscale);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  applyFilters(ctx, width, height, filters);
}

function renderPreview() {
  const { width, height } = currentDevice();
  screen.style.aspectRatio = `${width} / ${height}`;
  render(preview, PREVIEW_WIDTH, Math.round((PREVIEW_WIDTH * height) / width));
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(renderPreview);
}

function renderThumb(canvas, id) {
  canvas.width = Math.round(W * THUMB_SCALE);
  canvas.height = Math.round(H * THUMB_SCALE);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(THUMB_SCALE, 0, 0, THUMB_SCALE, 0, 0);
  paint(ctx, AVAILABLE.find((t) => t.id === id));
}

// ---------- UI state ----------

function refresh() {
  const isPhoto = state.mode === 'photo';
  const hasPhoto = Boolean(state.image);
  const ready = !state.loading && !exporting && (!isPhoto || hasPhoto);

  for (const tab of document.querySelectorAll('[role="tab"]')) {
    tab.setAttribute('aria-selected', String(tab.dataset.mode === state.mode));
  }
  $('panel-photo').hidden = !isPhoto;
  $('panel-template').hidden = isPhoto;
  $('caption-fields').hidden = !hasPhoto;
  const device = currentDevice();
  $('device-note').textContent = `${device.width} × ${device.height} pixels · ${device.method === 'kindle' ? 'sent as a tiny Kindle book, no jailbreak needed' : 'saved as an image for your screensaver folder'}`;
  $('pack').hidden = device.method !== 'image';
  $('pack').disabled = !ready;
  const { fields } = currentTemplate();
  for (const key of ['name', 'line2', 'books', 'favourite']) $(`${key}-field`).hidden = !fields[key];
  dropzone.hidden = !isPhoto || hasPhoto;
  screen.classList.toggle('pannable', isPhoto && hasPhoto);
  // With a photo loaded the preview can be focused and moved from the keyboard.
  if (isPhoto && hasPhoto) preview.tabIndex = 0;
  else preview.removeAttribute('tabindex');
  preview.setAttribute('aria-label', isPhoto && hasPhoto ? 'Lock screen preview. Use the arrow keys to move the photo, plus and minus to zoom.' : 'Lock screen preview');
  $('hint').textContent = isPhoto && hasPhoto ? 'Drag the photo to reposition it.' : '';
  $('choose').textContent = hasPhoto ? 'Replace photo' : 'Choose photo';
  zoomInput.disabled = !hasPhoto;
  $('download').disabled = !ready;

  for (const button of document.querySelectorAll('#thumbs button')) {
    button.setAttribute('aria-pressed', String(button.dataset.id === state.template));
  }
  schedule();
}

function refreshThumbs() {
  for (const button of document.querySelectorAll('#thumbs button')) {
    renderThumb(button.firstElementChild, button.dataset.id);
  }
}

// ---------- Photo loading, pan and zoom ----------

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

// Phone photos can be 50 megapixels or more. A copy at most 3000 px on its long side keeps
// plenty of detail for a 1264 × 1680 screen while using a fraction of the memory.
const MAX_SIDE = 3000;
function shrink(image) {
  const scale = MAX_SIDE / Math.max(image.width, image.height);
  if (scale >= 1) return image;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  return canvas;
}

function setPhoto(image) {
  image = shrink(image);
  state.image = image;
  state.zoom = 1;
  zoomInput.value = '1';
  const scale = photoScale();
  state.panX = (W - image.width * scale) / 2;
  state.panY = (H - image.height * scale) / 2;
  refresh();
}

// HEIC/HEIF files are ISO media files whose brand sits at bytes 8-12.
async function looksLikeHeic(file) {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) return true;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = String.fromCharCode(...head);
  return text.slice(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|heim|heis|mif1|msf1/.test(text.slice(8, 12));
}

// Only Safari opens HEIC natively. Elsewhere the converter (about 3 MB) is
// fetched the first time it is needed. The photo still never leaves the browser.
async function convertHeic(file) {
  const { heicTo } = await import('../vendor/heic-to/heic-to.js');
  return heicTo({ blob: file, type: 'bitmap' });
}

const MAX_BYTES = 40 * 1024 * 1024;
let loadId = 0;
function finishLoading() {
  state.loading = false;
  dropzone.classList.remove('busy');
  $('choose').disabled = false;
  refresh();
}

function loadPhoto(file) {
  if (!file) return;
  const id = ++loadId;
  showError('');
  // A newer photo replaces any that is still loading, so reset its busy state here.
  finishLoading();
  if (file.size > MAX_BYTES) {
    showError('That photo is over 40 MB. Try a smaller copy, such as one shared from your photos app.');
    return;
  }
  // Until the new photo is ready, Download would save the old one.
  state.loading = true;
  refresh();
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    if (id !== loadId) return;
    state.loading = false;
    setPhoto(image);
  };
  image.onerror = async () => {
    URL.revokeObjectURL(url);
    const heic = await looksLikeHeic(file).catch(() => false);
    // A newer photo may have been chosen while this one was checked.
    if (id !== loadId) return;
    if (!heic) {
      if (id === loadId) {
        finishLoading();
        showError('That file could not be opened as an image. Try a JPG, PNG or WebP.');
      }
      return;
    }
    dropzone.classList.add('busy');
    $('choose').disabled = true;
    $('hint').textContent = 'Converting iPhone photo…';
    try {
      const bitmap = await convertHeic(file);
      if (id === loadId) {
        state.loading = false;
        setPhoto(bitmap);
      }
    } catch {
      if (id === loadId) showError('That HEIC photo could not be converted. Try exporting it as a JPG first.');
    } finally {
      if (id === loadId) finishLoading();
    }
  };
  image.src = url;
}

function setZoom(zoom) {
  if (!state.image) return;
  // Zoom about the centre of the screen rather than the photo's corner.
  const before = photoScale();
  const centreX = (W / 2 - state.panX) / before;
  const centreY = (H / 2 - state.panY) / before;
  state.zoom = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const after = photoScale();
  state.panX = W / 2 - centreX * after;
  state.panY = H / 2 - centreY * after;
  clampPan();
  zoomInput.value = String(state.zoom);
  schedule();
}

// One pointer drags the photo; two pointers pinch to zoom.
const pointers = new Map();
let pinch = null;
const pinchDistance = () => {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
};
preview.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'photo' || !state.image) return;
  preview.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  pinch = pointers.size === 2 ? { distance: pinchDistance(), zoom: state.zoom } : null;
});
preview.addEventListener('pointermove', (event) => {
  const last = pointers.get(event.pointerId);
  if (!last) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinch) {
    if (pinch.distance > 0) setZoom(pinch.zoom * (pinchDistance() / pinch.distance));
    return;
  }
  if (pointers.size !== 1) return;
  // Design-canvas units per screen pixel of the preview.
  const perPixel = PREVIEW_WIDTH / fit(PREVIEW_WIDTH, preview.height).scale / preview.clientWidth;
  state.panX += (event.clientX - last.x) * perPixel;
  state.panY += (event.clientY - last.y) * perPixel;
  clampPan();
  schedule();
});
for (const type of ['pointerup', 'pointercancel']) {
  preview.addEventListener(type, (event) => {
    pointers.delete(event.pointerId);
    pinch = null;
  });
}
preview.addEventListener(
  'wheel',
  (event) => {
    if (state.mode !== 'photo' || !state.image) return;
    event.preventDefault();
    setZoom(state.zoom * (event.deltaY < 0 ? 1.06 : 1 / 1.06));
  },
  { passive: false },
);

preview.addEventListener('keydown', (event) => {
  if (state.mode !== 'photo' || !state.image) return;
  const step = event.shiftKey ? 80 : 20;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (moves[event.key]) {
    state.panX += moves[event.key][0];
    state.panY += moves[event.key][1];
    clampPan();
    schedule();
  } else if (event.key === '+' || event.key === '=') {
    setZoom(state.zoom * 1.06);
  } else if (event.key === '-') {
    setZoom(state.zoom / 1.06);
  } else {
    return;
  }
  event.preventDefault();
});

// The two tabs follow the usual keyboard pattern: arrow keys move between them.
document.querySelector('.tabs').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const other = document.querySelector(`[role="tab"][aria-selected="false"]`);
  other.click();
  other.focus();
});

screen.addEventListener('dragover', (event) => {
  if (state.mode !== 'photo') return;
  event.preventDefault();
  screen.classList.add('dragover');
});
screen.addEventListener('dragleave', () => screen.classList.remove('dragover'));
screen.addEventListener('drop', (event) => {
  if (state.mode !== 'photo') return;
  event.preventDefault();
  screen.classList.remove('dragover');
  loadPhoto(event.dataTransfer.files[0]);
});

dropzone.addEventListener('click', () => fileInput.click());
$('choose').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  loadPhoto(fileInput.files[0]);
  fileInput.value = '';
});
zoomInput.addEventListener('input', () => setZoom(Number(zoomInput.value)));

// ---------- Controls ----------

for (const tab of document.querySelectorAll('[role="tab"]')) {
  tab.addEventListener('click', () => {
    state.mode = tab.dataset.mode;
    refresh();
  });
}

const GROUPS = [
  ...catalogue.collections.map((c) => [`${c.label} · limited time`, (t) => t.season === c.id]),
  ['With your name', (t) => !t.season && t.named],
  ['Ready-made', (t) => !t.season && !t.named],
];
for (const [heading, belongs] of GROUPS) {
  if (!AVAILABLE.some(belongs)) continue;
  const label = document.createElement('p');
  label.className = 'thumbs-label';
  label.textContent = heading;
  const group = document.createElement('div');
  group.className = 'thumbs-group';
  for (const template of AVAILABLE.filter(belongs)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = template.id;
    button.title = template.colour ? `${template.label} (colour, for Kindle Colorsoft)` : template.label;
    button.setAttribute('aria-label', button.title);
    button.append(document.createElement('canvas'));
    button.addEventListener('click', () => {
      chooseTemplate(template.id);
      refresh();
    });
    group.append(button);
  }
  $('thumbs').append(label, group);
}

for (const key of ['name', 'line2', 'books', 'favourite']) {
  $(key).addEventListener('input', (event) => {
    state[key] = event.target.value;
    refreshThumbs();
    schedule();
  });
}

function syncFilterInputs() {
  $('grayscale').checked = state.filters.grayscale;
  $('ink-mono').setAttribute('aria-pressed', String(state.filters.grayscale));
  $('ink-colour').setAttribute('aria-pressed', String(!state.filters.grayscale));
  $('eink').checked = state.filters.eink;
  $('dither').checked = state.filters.dither;
  $('brightness').value = String(state.filters.brightness);
  $('contrast').value = String(state.filters.contrast);
}
// Colour is for the Kindle Colorsoft. A colour-only design turns black and white off; going
// from one to a design that has no colour version turns it back on. Designs with a colour
// version just follow the Black & white / Colour switch.
function chooseTemplate(id) {
  const wasColourOnly = Boolean(currentTemplate().colour);
  state.template = id;
  const next = currentTemplate();
  const grayscale = next.colour ? false : wasColourOnly && !next.inColour ? true : state.filters.grayscale;
  if (grayscale !== state.filters.grayscale) {
    state.filters.grayscale = grayscale;
    syncFilterInputs();
    refreshThumbs();
  }
}

function setColour(on) {
  state.filters.grayscale = !on;
  syncFilterInputs();
  refreshThumbs();
  schedule();
}
$('ink-mono').addEventListener('click', () => setColour(false));
$('ink-colour').addEventListener('click', () => setColour(true));

for (const key of ['grayscale', 'eink', 'dither']) {
  $(key).addEventListener('change', (event) => {
    state.filters[key] = event.target.checked;
    if (key === 'grayscale') {
      syncFilterInputs();
      refreshThumbs();
    }
    schedule();
  });
}
for (const key of ['brightness', 'contrast']) {
  $(key).addEventListener('input', (event) => {
    state.filters[key] = Number(event.target.value);
    schedule();
  });
}
// Device picker: grouped by brand, remembered on this device only.
for (const group of [...new Set(DEVICES.map((d) => d.group))]) {
  const optgroup = document.createElement('optgroup');
  optgroup.label = group;
  for (const device of DEVICES.filter((d) => d.group === group)) optgroup.append(new Option(device.label, device.id));
  $('device').append(optgroup);
}
$('device').value = state.device;
$('device').addEventListener('change', (event) => {
  state.device = event.target.value;
  saveDevice(state.device);
  refresh();
});

$('caption').addEventListener('input', (event) => {
  state.caption = event.target.value;
  schedule();
});
$('caption-at').addEventListener('change', (event) => {
  state.captionAt = event.target.value;
  schedule();
});

$('reset').addEventListener('click', () => {
  state.filters = { ...DEFAULT_FILTERS };
  syncFilterInputs();
  schedule();
});

// ---------- Export ----------

function exportImage(type, options, device = currentDevice()) {
  const { width, height } = device;
  const canvas = document.createElement('canvas');
  render(canvas, width, height, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate image'))), type, 0.92);
  });
}

function exportTitle() {
  if (state.mode !== 'template') return 'Lock Screen';
  const template = currentTemplate();
  if (!template.fields.name) return `${template.label} Lock Screen`;
  const name = state.name.trim();
  return name ? `${name}’s Lock Screen` : 'Lock Screen';
}

// ---------- Download ----------

// A download waits for the web fonts, so a quick tap can't save fallback lettering.
const fontsReady = Promise.all(FONTS.map((font) => document.fonts.load(font))).catch(() => {});

// Both files are made here in the browser, so a photo never leaves the device.
const canShareFiles = matchMedia('(pointer: coarse)').matches && Boolean(navigator.canShare);
let kindleFile = null;
let fileUrls = [];

$('download').addEventListener('click', async () => {
  const button = $('download');
  const message = $('download-message');
  if (exporting) return;
  exporting = true;
  message.hidden = true;
  button.disabled = true;
  button.textContent = 'Making your file…';
  try {
    await fontsReady;
    const device = currentDevice();
    const asBook = device.method === 'kindle';
    const image = await exportImage(asBook ? 'image/jpeg' : 'image/png');
    fileUrls.forEach((url) => URL.revokeObjectURL(url));
    fileUrls = [URL.createObjectURL(image)];
    $('get-image').href = fileUrls[0];
    $('get-image').download = asBook ? 'kindle-lock-screen.jpg' : 'lock-screen.png';
    $('get-image').textContent = asBook ? 'Download the image (JPEG)' : `Download the image (PNG, ${device.width} × ${device.height})`;
    $('get-image').className = asBook ? 'link' : 'btn primary';
    let share = false;
    if (asBook) {
      const epub = buildEpub(new Uint8Array(await image.arrayBuffer()), { title: exportTitle() });
      kindleFile = new File([epub], 'kindle-lock-screen.epub', { type: 'application/epub+zip' });
      fileUrls.push(URL.createObjectURL(kindleFile));
      $('get-epub').href = fileUrls[1];
      // On phones, the share sheet can hand the file straight to the Kindle app. Sharing must
      // start from the tap itself, which is why the file is made before the dialog opens.
      share = canShareFiles && navigator.canShare({ files: [kindleFile] });
    }
    $('get-epub').hidden = !asBook;
    $('share-kindle').hidden = !share;
    $('get-epub').classList.toggle('primary', !share);
    $('phone-step').hidden = !share;
    $('computer-step').hidden = share;
    $('share-message').hidden = true;
    for (const steps of document.querySelectorAll('[data-guide]')) steps.hidden = steps.dataset.guide !== device.guide;
    $('ready').showModal();
    dispatchEvent(new Event('lockscreen-made'));
  } catch (error) {
    message.textContent = error.message || 'That could not be made. Please try again.';
    message.hidden = false;
  } finally {
    exporting = false;
    button.textContent = 'Download';
    refresh();
  }
});
$('share-kindle').addEventListener('click', async () => {
  const message = $('share-message');
  message.hidden = true;
  try {
    await navigator.share({ files: [kindleFile] });
  } catch (error) {
    // Closing the share sheet is not a failure.
    if (error.name === 'AbortError') return;
    message.hidden = false;
  }
});
$('ready-close').addEventListener('click', () => $('ready').close());

// Kobo and KOReader can pick a random picture from a folder each time they sleep, so their
// owners can take every design at once, sized for their screen and with their name on.
$('pack').addEventListener('click', async () => {
  const button = $('pack');
  if (exporting) return;
  exporting = true;
  button.disabled = true;
  const label = button.textContent;
  try {
    await fontsReady;
    // Settings are fixed when packing starts, so changing them midway can't mix sizes.
    const device = currentDevice();
    const base = { ...state.filters };
    const files = [];
    for (const [i, template] of AVAILABLE.entries()) {
      button.textContent = `Drawing ${i + 1} of ${AVAILABLE.length}…`;
      const filters = { ...base, grayscale: base.grayscale && !template.colour };
      const blob = await exportImage('image/png', { template, filters }, device);
      files.push({ name: `${template.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    const url = URL.createObjectURL(new Blob([zipStore(files)], { type: 'application/zip' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `kindle-lock-screens-${device.width}x${device.height}.zip` });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    dispatchEvent(new Event('lockscreen-made'));
  } catch (error) {
    $('download-message').textContent = 'The designs could not be packed. Please try again.';
    $('download-message').hidden = false;
  } finally {
    exporting = false;
    button.textContent = label;
    refresh();
  }
});

// Picks any design other than the one showing, for anyone who can't decide.
function surprise() {
  const others = AVAILABLE.filter((t) => t.id !== state.template);
  state.mode = 'template';
  chooseTemplate(others[Math.floor(Math.random() * others.length)].id);
}
$('surprise').addEventListener('click', () => {
  surprise();
  refresh();
});

// ---------- Start ----------

// The landing page links here with ?design=<template id>.
const requested = new URLSearchParams(location.search).get('design');
if (requested === 'surprise') surprise();
else if (AVAILABLE.some((t) => t.id === requested)) {
  state.mode = 'template';
  chooseTemplate(requested);
}

syncFilterInputs();
refresh();
refreshThumbs();
// Templates draw with web fonts; redraw once they have arrived.
fontsReady.then(() => {
  refreshThumbs();
  schedule();
});
