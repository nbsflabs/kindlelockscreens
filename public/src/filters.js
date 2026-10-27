// The maker's adjustments: grayscale, brightness, contrast, the e-ink boost and dithering.

export const DEFAULT_FILTERS = { grayscale: true, eink: false, dither: false, brightness: 0, contrast: 0 };

const clampByte = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

function sharpen(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(image.data);
  const out = image.data;
  const amount = 0.5;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const neighbours = src[i - width * 4 + c] + src[i + width * 4 + c] + src[i - 4 + c] + src[i + 4 + c];
        out[i + c] = clampByte(src[i + c] + amount * (src[i + c] * 4 - neighbours));
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

// E-ink panels show 16 shades of grey. Floyd–Steinberg dithering spreads the rounding error
// to neighbouring pixels, so smooth skies and shadows don't break into visible bands.
const LEVELS = 15;
function dither(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const grey = new Float32Array(width * height);
  for (let p = 0; p < grey.length; p++) grey[p] = data[p * 4];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const old = grey[p];
      const value = Math.round((clampByte(old) / 255) * LEVELS) * (255 / LEVELS);
      const err = old - value;
      data[p * 4] = data[p * 4 + 1] = data[p * 4 + 2] = value;
      if (x + 1 < width) grey[p + 1] += (err * 7) / 16;
      if (y + 1 < height) {
        if (x > 0) grey[p + width - 1] += (err * 3) / 16;
        grey[p + width] += (err * 5) / 16;
        if (x + 1 < width) grey[p + width + 1] += err / 16;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function applyFilters(ctx, width, height, filters) {
  const { grayscale, eink, dither: smooth, brightness, contrast } = filters;
  if (!grayscale && !eink && !smooth && brightness === 0 && contrast === 0) return;

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const shift = (brightness / 100) * 255;
  const c = contrast * 1.5 + (eink ? 30 : 0);
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const toGray = grayscale || eink || smooth;

  for (let i = 0; i < data.length; i += 4) {
    let r = clampByte(factor * (data[i] + shift - 128) + 128);
    let g = clampByte(factor * (data[i + 1] + shift - 128) + 128);
    let b = clampByte(factor * (data[i + 2] + shift - 128) + 128);
    if (toGray) r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  ctx.putImageData(image, 0, 0);
  if (eink) sharpen(ctx, width, height);
  if (smooth) dither(ctx, width, height);
}
