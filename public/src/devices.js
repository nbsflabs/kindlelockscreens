// E-readers the maker can size a lock screen for. Designs are drawn on a 1264x1680 canvas and
// scaled to fill each screen exactly, trimming a sliver from the edges when the shape differs.
//
// method: 'kindle' = a tiny book whose cover is the lock screen (Display Cover, no jailbreak);
//         'image'  = a picture file the reader's own screensaver setting shows (Kobo, KOReader, hacks).

export const DEVICES = [
  { id: 'kindle-pw', group: 'Kindle', label: 'Kindle Paperwhite (2024), Colorsoft, Oasis', width: 1264, height: 1680, method: 'kindle', guide: 'kindle' },
  { id: 'kindle-pw5', group: 'Kindle', label: 'Kindle Paperwhite (2021) / Signature', width: 1236, height: 1648, method: 'kindle', guide: 'kindle' },
  { id: 'kindle-basic', group: 'Kindle', label: 'Kindle (2022 or 2024)', width: 1072, height: 1448, method: 'kindle', guide: 'kindle' },
  { id: 'kindle-old', group: 'Kindle', label: 'Kindle (2019 or older basic model)', width: 600, height: 800, method: 'kindle', guide: 'kindle' },
  { id: 'kindle-scribe', group: 'Kindle', label: 'Kindle Scribe', width: 1860, height: 2480, method: 'kindle', guide: 'kindle' },
  { id: 'kobo-clara', group: 'Kobo', label: 'Kobo Clara (BW, Colour, 2E, HD)', width: 1072, height: 1448, method: 'image', format: 'png', guide: 'kobo' },
  { id: 'kobo-libra', group: 'Kobo', label: 'Kobo Libra (Colour, 2, H2O)', width: 1264, height: 1680, method: 'image', format: 'png', guide: 'kobo' },
  { id: 'kobo-sage', group: 'Kobo', label: 'Kobo Sage, Forma', width: 1440, height: 1920, method: 'image', format: 'png', guide: 'kobo' },
  { id: 'kobo-elipsa', group: 'Kobo', label: 'Kobo Elipsa', width: 1404, height: 1872, method: 'image', format: 'png', guide: 'kobo' },
  { id: 'kobo-nia', group: 'Kobo', label: 'Kobo Nia', width: 758, height: 1024, method: 'image', format: 'png', guide: 'kobo' },
  { id: 'koreader-1264', group: 'KOReader or a jailbroken Kindle', label: 'Paperwhite (2024), Oasis, Colorsoft · 1264 × 1680', width: 1264, height: 1680, method: 'image', format: 'png', guide: 'koreader' },
  { id: 'koreader-1236', group: 'KOReader or a jailbroken Kindle', label: 'Paperwhite (2021) · 1236 × 1648', width: 1236, height: 1648, method: 'image', format: 'png', guide: 'koreader' },
  { id: 'koreader-1072', group: 'KOReader or a jailbroken Kindle', label: 'Kindle (2022, 2024), Paperwhite 3/4, Voyage, Oasis (2016) · 1072 × 1448', width: 1072, height: 1448, method: 'image', format: 'png', guide: 'koreader' },
  { id: 'koreader-758', group: 'KOReader or a jailbroken Kindle', label: 'Paperwhite 1/2 · 758 × 1024', width: 758, height: 1024, method: 'image', format: 'png', guide: 'koreader' },
  { id: 'koreader-600', group: 'KOReader or a jailbroken Kindle', label: 'Kindle (2019 or older), Kindle 4, 5, Touch · 600 × 800', width: 600, height: 800, method: 'image', format: 'png', guide: 'koreader' },
];

export const DEFAULT_DEVICE = DEVICES[0].id;

const STORE_KEY = 'kls-device';

// Remembers the reader on this device only (localStorage, never sent anywhere).
export function savedDevice() {
  try {
    const id = localStorage.getItem(STORE_KEY);
    return DEVICES.some((d) => d.id === id) ? id : DEFAULT_DEVICE;
  } catch {
    return DEFAULT_DEVICE;
  }
}
export function saveDevice(id) {
  try { localStorage.setItem(STORE_KEY, id); } catch { /* private mode: fine */ }
}
