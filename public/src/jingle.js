// A ♪ button that plays Jingle Bells (the tune is public domain) with little synthesised
// bells, only after a tap, looping until tapped again. Christmas season only.
import { seasonOn } from './catalog.js?v=21';

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, C6: 1046.5, G4: 392.0 };
// [note, beats]; null is a rest.
const VERSE = [['E5', 1], ['E5', 1], ['E5', 2], ['E5', 1], ['E5', 1], ['E5', 2], ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', 0.5], ['E5', 4]];
const TUNE = [
  ...VERSE,
  ['F5', 1], ['F5', 1], ['F5', 1.5], ['F5', 0.5], ['F5', 1], ['E5', 1], ['E5', 1], ['E5', 0.5], ['E5', 0.5],
  ['E5', 1], ['D5', 1], ['D5', 1], ['E5', 1], ['D5', 2], ['G5', 2],
  ...VERSE,
  ['F5', 1], ['F5', 1], ['F5', 1.5], ['F5', 0.5], ['F5', 1], ['E5', 1], ['E5', 1], ['E5', 0.5], ['E5', 0.5],
  ['G5', 1], ['G5', 1], ['F5', 1], ['D5', 1], ['C5', 3], [null, 1],
];
const BEAT = 0.27;

let audio = null;
let timer = null;

function bell(at, frequency) {
  const out = audio.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(0.18, at + 0.01);
  out.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  out.connect(audio.destination);
  // A bell is a fundamental plus a bright, slightly out-of-tune partial.
  for (const [ratio, type] of [[1, 'sine'], [2.76, 'sine'], [4.07, 'triangle']]) {
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency * ratio;
    const level = audio.createGain();
    level.gain.value = ratio === 1 ? 1 : 0.18;
    osc.connect(level).connect(out);
    osc.start(at);
    osc.stop(at + 1);
  }
}
function sleighBells(at) {
  const length = Math.floor(audio.sampleRate * 0.08);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const noise = Object.assign(audio.createBufferSource(), { buffer });
  const filter = Object.assign(audio.createBiquadFilter(), { type: 'highpass' });
  filter.frequency.value = 7000;
  const level = audio.createGain();
  level.gain.value = 0.05;
  noise.connect(filter).connect(level).connect(audio.destination);
  noise.start(at);
}

function playOnce() {
  let at = audio.currentTime + 0.05;
  for (const [note, beats] of TUNE) {
    if (note) bell(at, NOTE[note]);
    at += beats * BEAT;
  }
  const total = TUNE.reduce((sum, [, beats]) => sum + beats, 0);
  for (let beat = 0; beat < total; beat += 1) sleighBells(audio.currentTime + 0.05 + beat * BEAT);
  timer = setTimeout(playOnce, total * BEAT * 1000);
}

if (seasonOn('christmas')) {
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'jingle-toggle' });
  const label = (on) => {
    button.textContent = on ? '♪ Stop the jingle' : '♪ Play a jingle';
    button.setAttribute('aria-pressed', String(on));
  };
  label(false);
  button.addEventListener('click', async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      // Closing drops the notes already queued, so the next tap starts from the top.
      audio.close();
      audio = null;
      label(false);
      return;
    }
    audio = new AudioContext();
    label(true);
    playOnce();
  });
  document.body.append(button);
}
