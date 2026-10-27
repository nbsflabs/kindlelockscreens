// Lock screen templates. Each one draws onto a 1264x1680 canvas
// context from code, so there are no image assets to license or ship.

export const W = 1264;
export const H = 1680;

export const FONTS = [
  '700 100px "Playfair Display"',
  '700 100px "Caveat"',
  '500 100px "DM Sans"',
  '700 100px "DM Sans"',
  '400 100px "Bebas Neue"',
  '400 100px "Special Elite"',
  '700 100px "Cormorant Garamond"',
];

function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fitFont(ctx, text, style, family, maxWidth, maxSize) {
  ctx.font = `${style} 100px ${family}`;
  const width = ctx.measureText(text).width || 1;
  const size = Math.min(maxSize, (100 * maxWidth) / width);
  ctx.font = `${style} ${size}px ${family}`;
  return size;
}

function spaced(ctx, text, x, y, spacing) {
  ctx.letterSpacing = `${spacing}px`;
  // Trailing spacing would push centred text off-centre.
  ctx.fillText(text, x + (ctx.textAlign === 'center' ? spacing / 2 : 0), y);
  ctx.letterSpacing = '0px';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const PAPER = '#ecebe6';
const INK = '#1f1f21';

function pen(ctx, width = 6) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = PAPER;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function place(ctx, x, y, rotation, scale, motif, ...args) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  pen(ctx);
  motif(ctx, ...args);
  ctx.restore();
}

function fillStroke(ctx, fill = PAPER) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function openBook(ctx) {
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.bezierCurveTo(side * 45, -95, side * 110, -95, side * 150, -75);
    ctx.lineTo(side * 150, 65);
    ctx.bezierCurveTo(side * 110, 45, side * 45, 45, 0, 80);
    ctx.closePath();
    fillStroke(ctx);
    ctx.save();
    ctx.lineWidth *= 0.6;
    for (let i = 0; i < 3; i++) {
      const y = -36 + i * 32;
      ctx.beginPath();
      ctx.moveTo(side * 28, y + 4);
      ctx.quadraticCurveTo(side * 75, y - 16, side * 125, y - 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- Monochrome print collection ----------
// Solid tones and substantial strokes retain their structure on e-ink.
function printGround(ctx, dark = false) {
  ctx.fillStyle = dark ? '#181818' : '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.strokeStyle = dark ? '#ffffff' : '#181818';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
}

function printPath(ctx, points, fill = false) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (fill) { ctx.closePath(); ctx.fill(); }
  else ctx.stroke();
}

function printDisc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function decoPortal(ctx, { name, line2 }) {
  printGround(ctx, true);
  // Stepped architectural frame, with a fan of inlaid rays above the door.
  ctx.strokeRect(78, 78, W - 156, H - 156);
  for (let i = 0; i < 4; i++) {
    const inset = i * 42;
    printPath(ctx, [[180 + inset, 1420], [180 + inset, 510 + inset],
      [340 + inset, 510 + inset], [340 + inset, 280 + inset],
      [924 - inset, 280 + inset], [924 - inset, 510 + inset],
      [1084 - inset, 510 + inset], [1084 - inset, 1420]]);
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(360, 280, 544, 480); ctx.clip();
  for (let i = -6; i <= 6; i++) {
    printPath(ctx, [[632, 800], [632 + i * 100, 230]]);
  }
  ctx.restore();
  ctx.fillStyle = '#181818'; ctx.fillRect(300, 790, 664, 400);
  ctx.fillStyle = '#ffffff';
  ctx.font = '500 32px "DM Sans"';
  spaced(ctx, 'THE PRIVATE LIBRARY OF', 632, 850, 5);
  fitFont(ctx, name.trim() || 'A Reader', '700', '"Cormorant Garamond"', 620, 150);
  ctx.fillText(name.trim() || 'A Reader', 632, 1020);
  fitFont(ctx, line2.trim() || 'A WORLD WITHIN', '500', '"DM Sans"', 600, 38);
  ctx.fillText(line2.trim() || 'A WORLD WITHIN', 632, 1120);
  printPath(ctx, [[480, 1310], [632, 1200], [784, 1310], [632, 1420]], true);
}

function offshore(ctx) {
  printGround(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(90, 150, 1084, 1330); ctx.clip();
  ctx.fillStyle = '#b0b0b0'; printDisc(ctx, 850, 460, 160);
  ctx.fillStyle = '#181818';
  printPath(ctx, [[590, 1030], [895, 650], [1190, 1030]], true);
  ctx.fillStyle = '#ffffff';
  printPath(ctx, [[820, 745], [895, 650], [972, 749], [919, 725], [888, 754], [861, 727]], true);
  // A curling breaker, its hooked crest carved out of a heavy ink mass.
  ctx.fillStyle = '#181818'; ctx.beginPath(); ctx.moveTo(0, 1420);
  ctx.bezierCurveTo(110, 1180, 40, 600, 400, 540);
  ctx.bezierCurveTo(710, 480, 860, 800, 620, 950);
  ctx.bezierCurveTo(750, 740, 525, 650, 455, 850);
  ctx.bezierCurveTo(350, 1170, 850, 1150, 1264, 980);
  ctx.lineTo(1264, 1680); ctx.lineTo(0, 1680); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 12;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(60 + i * 42, 1450);
    ctx.bezierCurveTo(340 + i * 28, 1230, 150 + i * 32, 760, 424 + i * 20, 640 + i * 25);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(510, 1280 + i * 35);
    ctx.bezierCurveTo(760, 1370 + i * 26, 990, 1160 + i * 35, 1240, 1160 + i * 40); ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  for (const [x, y, r] of [[400, 570, 27], [454, 550, 22], [512, 563, 28], [566, 588, 24], [610, 630, 27], [638, 680, 22], [651, 731, 19], [343, 508, 13], [520, 470, 15], [700, 585, 13]]) printDisc(ctx, x, y, r);
  ctx.restore();
  ctx.strokeStyle = '#181818'; ctx.strokeRect(90, 150, 1084, 1330);
  ctx.fillStyle = '#181818'; ctx.font = '500 32px "DM Sans"';
  spaced(ctx, 'OFFSHORE / A STUDY IN INK', 632, 1550, 5);
}

function mobileGarden(ctx) {
  printGround(ctx);
  // A mid-century hanging mobile: asymmetric leaves balance on slender rods.
  printPath(ctx, [[632, 140], [632, 350], [305, 500], [1020, 500]]);
  printPath(ctx, [[305, 500], [305, 700], [140, 810], [580, 810]]);
  printPath(ctx, [[1020, 500], [1020, 900], [780, 1020], [1110, 1020]]);
  const pod = (x, y, flip, tone) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
    ctx.fillStyle = tone; ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-170, 40, -190, 260, 0, 300);
    ctx.bezierCurveTo(150, 230, 130, 65, 0, 0); ctx.fill();
    ctx.strokeStyle = tone === '#181818' ? '#ffffff' : '#181818';
    printPath(ctx, [[0, 35], [-25, 145], [0, 265]]); ctx.restore();
  };
  pod(140, 810, 1, '#181818'); pod(580, 810, -1, '#a0a0a0');
  pod(780, 1020, 1, '#a0a0a0'); pod(1110, 1020, -1, '#181818');
  ctx.fillStyle = '#181818'; printDisc(ctx, 690, 500, 94);
  ctx.font = '700 62px "DM Sans"'; ctx.fillText('a little balance', 632, 1490);
}

function herbarium(ctx, { name, line2 }) {
  printGround(ctx);
  ctx.strokeRect(90, 90, 1084, 1500);
  // Three pressed ginkgo branches. Fan veins stay well separated.
  for (const [x, y, angle, scale] of [[610, 1160, -0.45, 1], [660, 1020, 0.55, 0.85], [550, 800, -0.15, 0.8]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.beginPath(); ctx.moveTo(0, 160); ctx.quadraticCurveTo(-30, -20, 0, -180); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -70);
    ctx.bezierCurveTo(-30, -180, -190, -200, -210, -365);
    ctx.bezierCurveTo(-130, -415, -50, -420, 0, -360);
    ctx.bezierCurveTo(50, -420, 130, -415, 210, -365);
    ctx.bezierCurveTo(190, -200, 30, -180, 0, -70); ctx.closePath(); ctx.stroke();
    ctx.lineWidth = 5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(0, -90);
      ctx.quadraticCurveTo(i * 32, -220, i * 55, -365 - Math.abs(i) * 3); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = '#181818'; ctx.font = '500 30px "DM Sans"';
  spaced(ctx, 'GINKGO BILOBA · NO. 01', 632, 240, 5);
  fitFont(ctx, name.trim() || 'Collected leaves', 'italic 700', '"Cormorant Garamond"', 900, 105);
  ctx.fillText(name.trim() || 'Collected leaves', 632, 1400);
  fitFont(ctx, line2.trim() || 'A PRIVATE HERBARIUM', '500', '"DM Sans"', 900, 34);
  ctx.fillText(line2.trim() || 'A PRIVATE HERBARIUM', 632, 1490);
}

function windowSeat(ctx) {
  printGround(ctx);
  // Arched window, rainy panes, deep upholstered seat and a waiting book.
  ctx.beginPath(); ctx.moveTo(240, 1040); ctx.lineTo(240, 540);
  ctx.arc(632, 540, 392, Math.PI, 0); ctx.lineTo(1024, 1040); ctx.closePath(); ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#d0d0d0'; ctx.fillRect(240, 148, 784, 892);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9;
  for (let i = 0; i < 35; i++) {
    const x = 260 + (i * 173 % 750), y = 260 + (i * 137 % 710);
    printPath(ctx, [[x, y], [x - 22, y + 45]]);
  }
  ctx.restore(); ctx.strokeStyle = '#181818'; ctx.lineWidth = 12;
  printPath(ctx, [[632, 150], [632, 1040]]);
  printPath(ctx, [[240, 610], [1024, 610]]);
  ctx.fillStyle = '#181818'; ctx.fillRect(170, 1035, 924, 42);
  roundRect(ctx, 185, 1085, 894, 210, 36); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#181818';
  ctx.save(); ctx.translate(380, 1040); ctx.rotate(-0.16);
  roundRect(ctx, -130, -200, 260, 205, 30); fillStroke(ctx, '#ffffff');
  printPath(ctx, [[-70, -150], [70, -45]]); printPath(ctx, [[70, -150], [-70, -45]]); ctx.restore();
  place(ctx, 760, 1040, 0.12, 1.15, openBook);
  printPath(ctx, [[240, 1295], [210, 1425]]); printPath(ctx, [[1024, 1295], [1054, 1425]]);
  ctx.fillStyle = '#181818'; ctx.font = 'italic 700 76px "Cormorant Garamond"';
  ctx.fillText('Saved you a seat.', 632, 1540);
}

function slowPages(ctx) {
  printGround(ctx);
  ctx.textAlign = 'left';
  ctx.font = '500 32px "DM Sans"'; spaced(ctx, 'A SMALL REMINDER', 150, 300, 7);
  ctx.font = '700 174px "Cormorant Garamond"';
  ['There is', 'no hurry', 'inside', 'a book.'].forEach((text, i) => ctx.fillText(text, 140, 590 + i * 205));
  ctx.fillRect(150, 1360, 120, 10);
  ctx.font = '500 34px "DM Sans"'; ctx.fillText('Take your time.', 150, 1470);
  // A single oversized printer’s bracket makes the empty margin intentional.
  ctx.lineWidth = 14; printPath(ctx, [[1050, 420], [1100, 420], [1100, 1280], [1050, 1280]]);
}

function islandAtlas(ctx) {
  printGround(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(100, 180, 1064, 1260); ctx.clip();
  // Nested closed elevation contours, with a common centre and no crossings.
  for (let n = 0; n < 15; n++) {
    const radius = 72 + n * 35;
    ctx.strokeStyle = n % 4 === 0 ? '#181818' : '#808080';
    ctx.lineWidth = n % 4 === 0 ? 9 : 5;
    ctx.beginPath();
    for (let i = 0; i <= 180; i++) {
      const a = i * Math.PI / 90;
      const r = radius * (1 + 0.13 * Math.sin(a * 3) + 0.07 * Math.cos(a * 5));
      const x = 605 + Math.cos(a) * r * 0.82, y = 790 + Math.sin(a) * r * 1.15;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.strokeStyle = '#181818'; ctx.lineWidth = 6; ctx.setLineDash([16, 18]);
  ctx.beginPath(); ctx.moveTo(350, 1340); ctx.bezierCurveTo(240, 1020, 900, 1050, 605, 790); ctx.stroke();
  ctx.setLineDash([]); ctx.fillStyle = '#181818';
  printPath(ctx, [[605, 755], [580, 805], [630, 805]], true);
  ctx.restore(); ctx.strokeStyle = '#181818'; ctx.lineWidth = 7; ctx.strokeRect(100, 180, 1064, 1260);
  printPath(ctx, [[1010, 400], [1010, 260], [980, 310], [1010, 260], [1040, 310]]);
  ctx.fillStyle = '#181818'; ctx.font = '700 30px "DM Sans"'; ctx.fillText('N', 1010, 235);
  ctx.font = '700 68px "Cormorant Garamond"'; ctx.fillText('The unexplored interior', 632, 1540);
}

function orbitalStudy(ctx) {
  printGround(ctx, true);
  ctx.save(); ctx.translate(632, 800); ctx.rotate(-0.5);
  ctx.lineWidth = 6;
  for (const r of [240, 370, 500]) {
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.65, r * 1.17, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#ffffff'; printDisc(ctx, 0, 0, 125);
  for (const [x, y, r] of [[0, -585, 48], [240, 110, 34], [-150, 340, 60]]) {
    ctx.fillStyle = '#181818'; printDisc(ctx, x, y, r + 12);
    ctx.fillStyle = '#ffffff'; printDisc(ctx, x, y, r);
  }
  ctx.restore();
  // Large, sparse stars, rather than a field of fragile pinpricks.
  for (const [x, y] of [[200, 300], [1020, 400], [190, 1230], [1040, 1310]]) {
    printPath(ctx, [[x - 22, y], [x + 22, y]]); printPath(ctx, [[x, y - 22], [x, y + 22]]);
  }
  ctx.font = '500 34px "DM Sans"'; spaced(ctx, 'THE QUIET BETWEEN WORLDS', 632, 1510, 5);
}

function bauhausPress(ctx) {
  printGround(ctx);
  ctx.textAlign = 'left'; ctx.font = '700 115px "DM Sans"';
  ctx.fillText('FORM', 120, 240); ctx.fillText('& FABLE', 120, 365);
  // A modular printing-press composition: roller, sheet and rotating cylinder.
  ctx.fillStyle = '#181818'; ctx.fillRect(120, 470, 260, 820);
  ctx.fillStyle = '#a0a0a0'; ctx.fillRect(420, 470, 724, 260);
  ctx.fillStyle = '#181818'; printDisc(ctx, 782, 1015, 275);
  ctx.fillStyle = '#ffffff'; printDisc(ctx, 782, 1015, 150);
  ctx.fillStyle = '#181818'; printDisc(ctx, 782, 1015, 38);
  ctx.save(); ctx.beginPath(); ctx.rect(420, 750, 362, 550); ctx.clip();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 12;
  for (let y = 780; y < 1300; y += 32) printPath(ctx, [[420, y], [782, y]]);
  ctx.restore();
  ctx.fillStyle = '#181818'; ctx.fillRect(120, 1340, 1024, 14);
  ctx.font = '500 32px "DM Sans"'; ctx.fillText('STUDIES IN READING', 120, 1450);
  ctx.textAlign = 'right'; ctx.fillText('01 / 03', 1144, 1450);
}

function foxAndBirches(ctx) {
  printGround(ctx, true);
  ctx.save(); ctx.beginPath(); ctx.rect(100, 100, 1064, 1410); ctx.clip();
  ctx.fillStyle = '#ffffff'; printDisc(ctx, 865, 390, 150);
  // White birch trunks with black gouge marks; an alert fox in the clearing.
  for (const [x, lean, width] of [[170, 70, 80], [385, -50, 65], [1000, 45, 90], [1130, -60, 54]]) {
    ctx.fillStyle = '#ffffff';
    printPath(ctx, [[x, 1460], [x + lean, 80], [x + lean + width, 80], [x + width, 1460]], true);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 22;
    printPath(ctx, [[x + 30, 600], [x - 90, 460], [x - 130, 250]]);
    ctx.strokeStyle = '#181818'; ctx.lineWidth = 10;
    for (let i = 0; i < 12; i++) {
      const y = 180 + i * 104, dx = lean * (1460 - y) / 1380;
      printPath(ctx, [[x + dx + (i % 2 ? 4 : width / 2), y], [x + dx + width - 8, y - 12]]);
    }
  }
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(410, 1310);
  ctx.bezierCurveTo(650, 1340, 470, 1100, 710, 1050);
  ctx.lineTo(740, 925); ctx.lineTo(800, 1000); ctx.lineTo(875, 935);
  ctx.lineTo(875, 1080); ctx.lineTo(930, 1130); ctx.lineTo(830, 1180);
  ctx.lineTo(790, 1320); ctx.lineTo(745, 1320); ctx.lineTo(750, 1195);
  ctx.bezierCurveTo(650, 1330, 580, 1430, 410, 1310); ctx.fill();
  ctx.fillStyle = '#181818';
  printPath(ctx, [[780, 1090], [850, 1115], [828, 1160]], true);
  printDisc(ctx, 851, 1070, 9); printDisc(ctx, 920, 1130, 12);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8;
  for (let i = 0; i < 9; i++) printPath(ctx, [[120 + i * 126, 1470], [145 + i * 126, 1410], [165 + i * 126, 1460]]);
  ctx.restore(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.strokeRect(100, 100, 1064, 1410);
  ctx.font = '500 32px "DM Sans"'; spaced(ctx, 'THE BIRCHWOOD / RELIEF STUDY', 632, 1580, 5);
}

// Round two: relief-print shapes and fitted typography. User copy is never letter-spaced.
function type(ctx, text, y, size = 60, family = '"DM Sans"', width = 960, style = '700', x = W / 2) {
  fitFont(ctx, text, style, family, width, size);
  ctx.fillText(text, x, y);
}
function ownerText(value, fallback = 'A Reader') {
  return String(value ?? '').trim() || fallback;
}
function signature(ctx, data, y = 1430, width = 920) {
  type(ctx, ownerText(data.line2, 'A LIFE IN BOOKS'), y, 36, '"DM Sans"', width, '500');
}
function frame(ctx, inset = 90) { ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2); }
function lozenge(ctx, x, y, r) {
  printPath(ctx, [[x, y-r], [x+r, y], [x, y+r], [x-r, y]], true);
}
function branch(ctx, x, y, angle = 0, size = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(size, size);
  printPath(ctx, [[0, 160], [0, -170]]);
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(side * 39, 100-i*75, 58, 24, side * -0.7, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function heartPrint(ctx, x, y, size) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  ctx.beginPath(); ctx.moveTo(0, 90);
  ctx.bezierCurveTo(-210, -40, -95, -170, 0, -70);
  ctx.bezierCurveTo(95, -170, 210, -40, 0, 90); ctx.fill(); ctx.restore();
}
function midnight(ctx, data) {
  printGround(ctx, true); frame(ctx);
  // A large cut-paper crescent; no offscreen bitmap or gradient.
  printDisc(ctx, 632, 530, 235); ctx.fillStyle = '#181818'; printDisc(ctx, 730, 455, 205);
  ctx.fillStyle = '#ffffff';
  for (const [x,y,r] of [[260,330,18],[1000,580,26],[380,780,13],[890,230,14]]) lozenge(ctx,x,y,r);
  type(ctx, 'THE NIGHT READER', 940, 36);
  type(ctx, ownerText(data.name), 1140, 170, '"Cormorant Garamond"');
  signature(ctx, data, 1260); printPath(ctx, [[470,1420],[794,1420]]);
}
function libraryCard(ctx, data) {
  printGround(ctx); frame(ctx); ctx.textAlign = 'left';
  type(ctx,'PUBLIC LIBRARY',220,64,'"Special Elite"',940,'400',150);
  type(ctx,'BORROWER / 001',300,30,'"DM Sans"',940,'700',150);
  type(ctx,ownerText(data.name),520,155,'"Cormorant Garamond"',950,'700',150);
  type(ctx,ownerText(data.line2,'LIFETIME READING PRIVILEGES'),600,34,'"DM Sans"',950,'500',150);
  ctx.lineWidth=7;
  for(let y=700;y<=1400;y+=140) printPath(ctx,[[150,y],[1114,y]]);
  printPath(ctx,[[535,700],[535,1400]]);
  type(ctx,'DATE DUE',760,30,'"DM Sans"',330,'700',175);
  type(ctx,'RENEWAL',760,30,'"DM Sans"',500,'700',570);
  for(let i=0;i<4;i++) {
    type(ctx,['03 JAN','21 MAR','09 JUN','15 OCT'][i],935+i*140,46,'"Special Elite"',330,'400',175);
    type(ctx,i===3?'STILL READING':'RENEWED',935+i*140,36,'"Special Elite"',480,'400',570);
  }
  ctx.textAlign='center'; type(ctx,'NO FINES FOR GETTING LOST',1510,30);
}
function bookplate(ctx, data) {
  printGround(ctx); frame(ctx); ctx.strokeRect(115,115,1034,1450);
  type(ctx,'EX LIBRIS',300,95,'"Cormorant Garamond"');
  branch(ctx,310,780,-0.35,1.3); branch(ctx,954,780,0.35,1.3);
  place(ctx,632,740,0,1.25,openBook);
  type(ctx,ownerText(data.name),1120,175,'"Cormorant Garamond"',850);
  signature(ctx,data,1230,850); type(ctx,'ONE BOOK · A THOUSAND WORLDS',1460,28);
}
function composition(ctx,data) {
  printGround(ctx,true);
  // Deliberate chunky terrazzo, rather than fine marbling.
  const random=seeded(49);
  for(let i=0;i<150;i++) {
    const x=random()*W,y=random()*H;
    ctx.save();ctx.translate(x,y);ctx.rotate(random()*6);
    ctx.fillRect(-12,-25,24+random()*24,50);ctx.restore();
  }
  ctx.fillStyle='#ffffff';ctx.fillRect(135,430,994,720);
  ctx.strokeStyle='#181818';ctx.lineWidth=10;ctx.strokeRect(160,455,944,670);
  ctx.fillStyle='#181818';type(ctx,'COMPOSITION',580,65);
  type(ctx,ownerText(data.name),810,165,'"Caveat"',840);
  signature(ctx,data,930,840);type(ctx,'VOL. 01 / STORIES & OTHER THINGS',1050,27);
}
function autumnBadge(ctx) {
  printGround(ctx);frame(ctx);ctx.lineWidth=12;
  ctx.beginPath();ctx.arc(632,720,410,0,Math.PI*2);ctx.stroke();
  branch(ctx,632,660,0,1.4); ctx.fillStyle='#ffffff';ctx.fillRect(300,800,664,200);
  ctx.fillStyle='#181818';type(ctx,'LEAF THROUGH',890,92,'"Bebas Neue"',900,'400');
  type(ctx,'AUTUMN',1000,110,'"Bebas Neue"',900,'400');
  type(ctx,'COOL AIR / WARM STORIES',1350,36);lozenge(ctx,632,1480,24);
}
function bookTree(ctx) {
  printGround(ctx,true);frame(ctx);
  lozenge(ctx,632,310,64);
  for(let i=0;i<9;i++) {
    const w=170+i*85,y=420+i*96;
    ctx.fillStyle=i%3===0?'#a0a0a0':'#ffffff';ctx.fillRect(632-w/2,y,w,70);
    ctx.fillStyle='#181818';ctx.fillRect(662-w/2,y,12,70);
  }
  ctx.fillStyle='#ffffff';ctx.fillRect(600,1280,64,70);
  type(ctx,'ALL BOOKED UP',1460,86,'"Bebas Neue"',960,'400');type(ctx,'FOR CHRISTMAS',1540,33);
}
function resolutions(ctx,data) {
  printGround(ctx);frame(ctx);ctx.textAlign='left';
  type(ctx,'A NEW CHAPTER',240,86,'"Bebas Neue"',960,'400',160);
  type(ctx,ownerText(data.name),430,145,'"Cormorant Garamond"',940,'700',160);
  type(ctx,ownerText(data.line2,'READING RESOLUTIONS'),520,34,'"DM Sans"',940,'500',160);
  ['Make time.','Turn the page.','Try another world.','Begin again.'].forEach((s,i)=>{
    const y=760+i*180;ctx.strokeRect(165,y-66,66,66);type(ctx,s,y,66,'"Cormorant Garamond"',800,'700',280);
  });
  ctx.textAlign='center';type(ctx,'THE YEAR IS YOURS TO WRITE',1500,30);
}
function bookLover(ctx,data) {
  printGround(ctx);frame(ctx);heartPrint(ctx,632,610,2.3);
  ctx.fillStyle='#ffffff';place(ctx,632,570,0,1.25,openBook);
  ctx.fillStyle='#181818';type(ctx,'A LOVE OF STORIES',1010,50);
  type(ctx,ownerText(data.name),1210,170,'"Cormorant Garamond"');signature(ctx,data,1330);
  lozenge(ctx,632,1470,22);
}
// A personalised edition with the name as its principal type.
function paperbackAuthor(ctx,data) {
  printGround(ctx);ctx.fillStyle='#181818';ctx.fillRect(0,0,W,360);
  ctx.fillStyle='#ffffff';type(ctx,ownerText(data.name),245,180,'"Bebas Neue"',1040,'400');
  ctx.fillStyle='#181818';type(ctx,'THE WORLD',560,135,'"Bebas Neue"',1050,'400');
  type(ctx,'BETWEEN PAGES',700,135,'"Bebas Neue"',1050,'400');
  ctx.fillStyle='#a0a0a0';printDisc(ctx,632,1090,255);
  ctx.fillStyle='#181818';printPath(ctx,[[270,1300],[632,880],[994,1300]],true);
  ctx.fillStyle='#ffffff';printPath(ctx,[[632,880],[632,1300],[820,1300]],true);
  ctx.fillStyle='#181818';signature(ctx,data,1460);type(ctx,'A READER’S EDITION',1570,29);
}
// Colour e-ink: opaque, muted fields with stepped luminance. No gradients.
// Luma order: #354b50 (~71), #a87969 (~130), #c5bd96 (~188), #eee9d8 (~233).
const SOFT = ['#354b50','#a87969','#c5bd96','#eee9d8'];
function colourGround(ctx) { printGround(ctx);ctx.fillStyle=SOFT[3];ctx.fillRect(0,0,W,H); }
function ochreOrchard(ctx) {
  colourGround(ctx);ctx.fillStyle=SOFT[2];ctx.fillRect(100,100,1064,1280);
  ctx.fillStyle=SOFT[1];printDisc(ctx,865,390,160);
  ctx.strokeStyle=SOFT[0];ctx.lineWidth=30;
  for(const [x,y] of [[365,830],[850,1010]]) {
    printPath(ctx,[[x,1260],[x,y-220]]);printPath(ctx,[[x,y],[x-150,y-140]]);printPath(ctx,[[x,y-80],[x+140,y-210]]);
    ctx.fillStyle=SOFT[0];printDisc(ctx,x-130,y-220,115);printDisc(ctx,x+110,y-300,125);printDisc(ctx,x-30,y-400,135);
    ctx.fillStyle=SOFT[3];printDisc(ctx,x-125,y-230,24);printDisc(ctx,x+100,y-300,24);
  }
  ctx.fillStyle=SOFT[0];type(ctx,'THE QUIET ORCHARD',1500,70,'"Bebas Neue"',1000,'400');
}
function tidalColour(ctx) {
  colourGround(ctx);ctx.fillStyle=SOFT[2];ctx.fillRect(100,100,1064,1280);
  ctx.fillStyle=SOFT[1];printDisc(ctx,800,450,195);
  ctx.fillStyle=SOFT[3];printPath(ctx,[[100,850],[480,500],[760,850]],true);
  ctx.fillStyle=SOFT[0];printPath(ctx,[[100,1020],[750,600],[1164,1020]],true);
  ctx.fillStyle=SOFT[1];ctx.fillRect(100,1050,1064,140);
  ctx.fillStyle=SOFT[0];ctx.fillRect(100,1220,1064,160);
  ctx.fillStyle=SOFT[0];type(ctx,'LOW TIDE / LONG DAYS',1500,60,'"Bebas Neue"',1000,'400');
}
function patchworkColour(ctx) {
  colourGround(ctx);
  for(let r=0;r<4;r++)for(let c=0;c<3;c++) {
    const x=140+c*328,y=140+r*328;
    ctx.fillStyle=SOFT[(r+c)%2===0?0:2];ctx.fillRect(x,y,328,328);
    ctx.fillStyle=SOFT[(r+c)%2===0?3:1];ctx.beginPath();
    ctx.arc(x+164,y+164,125,(r+c)*Math.PI/2,(r+c+2)*Math.PI/2);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle=SOFT[0];type(ctx,'PIECES OF A QUIET DAY',1560,54,'"Bebas Neue"',1000,'400');
}
// season controls catalogue collections; colour is optional display metadata.
export const TEMPLATES = [
  { id: 'bookplate', label: 'Bookplate', named: true, draw: bookplate },
  { id: 'offshore', label: 'Offshore', named: false, draw: offshore },
  { id: 'slow-pages', label: 'Slow pages', named: false, draw: slowPages },
  { id: 'midnight', label: 'Midnight', named: true, draw: midnight },
  { id: 'library-card', label: 'Library card', named: true, draw: libraryCard },
  { id: 'fox-and-birches', label: 'Fox and birches', named: false, draw: foxAndBirches },
  { id: 'mobile-garden', label: 'Mobile garden', named: false, draw: mobileGarden },
  { id: 'herbarium', label: 'Herbarium', named: true, draw: herbarium },
  { id: 'deco-portal', label: 'Deco portal', named: true, draw: decoPortal },
  { id: 'window-seat', label: 'Window seat', named: false, draw: windowSeat },
  { id: 'island-atlas', label: 'Island atlas', named: false, draw: islandAtlas },
  { id: 'composition', label: 'Composition book', named: true, draw: composition },
  { id: 'orbital-study', label: 'Orbital study', named: false, draw: orbitalStudy },
  { id: 'bauhaus-press', label: 'Bauhaus press', named: false, draw: bauhausPress },
  { id: 'paperback-author', label: 'Paperback author', named: true, draw: paperbackAuthor },
  { id: 'ochre-orchard', label: 'Quiet orchard', named: false, colour: true, draw: ochreOrchard },
  { id: 'tidal-colour', label: 'Low tide', named: false, colour: true, draw: tidalColour },
  { id: 'patchwork-colour', label: 'Quiet patchwork', named: false, colour: true, draw: patchworkColour },
  { id: 'autumn-badge', label: 'Autumn reading', named: false, season: 'autumn', draw: autumnBadge },
  { id: 'book-tree', label: 'Book tree', named: false, season: 'christmas', draw: bookTree },
  { id: 'resolutions', label: 'Reading resolutions', named: true, season: 'newyear', draw: resolutions },
  { id: 'book-lover', label: 'Book lover', named: true, season: 'valentines', draw: bookLover },
];
