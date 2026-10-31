/** @typedef {{ width: number, height: number, data: Uint8ClampedArray }} MoonTexture */

// Duotone anchors at luminance 0, 0.5 and 1; applied after all spherical shading.
const MOON_DUOTONE = Object.freeze([
  Object.freeze([31, 42, 61]),       // #1f2a3d
  Object.freeze([111, 132, 163]),    // #6f84a3
  Object.freeze([238, 243, 250]),    // #eef3fa
]);

/** Color only: preserve the rendered luminance structure and edge coverage.
 * @param {Uint8ClampedArray} pixels RGBA pixels, modified in place.
 */
export function applyMoonDuotone(pixels) {
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const luminance = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
    const segment = luminance < 0.5 ? 0 : 1;
    const t = Math.max(0, Math.min(1, luminance * 2 - segment));
    const low = MOON_DUOTONE[segment], high = MOON_DUOTONE[segment + 1];
    for (let channel = 0; channel < 3; channel++) {
      pixels[i + channel] = low[channel] + (high[channel] - low[channel]) * t;
    }
  }
  return pixels;
}

const EARTHSHINE = 0.18;
const EXPOSURE = 1.45;
const GAMMA = 0.85;
const LIGHT_ROTATION = 18 * Math.PI / 180;
const smoothstep = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};
const shoulder = value => value <= 0.88 ? value : 0.88 + 0.10 * (1 - Math.exp(-(value - 0.88) / 0.10));

/** Rotate the projected light toward the upper right/left, keeping its z and
 * geometric phase unchanged. This is a drawing convention, not sky orientation.
 */
export function moonLightDirection(phase) {
  const theta = phase * Math.PI * 2;
  return { x: Math.sin(theta) * Math.cos(LIGHT_ROTATION),
    y: -Math.abs(Math.sin(theta)) * Math.sin(LIGHT_ROTATION), z: -Math.cos(theta) };
}

/** Bilinear albedo sampling; transparent texels never become black surface paint.
 * @param {MoonTexture} texture
 */
function sample(texture, u, v, channel) {
  const x = Math.max(0, Math.min(texture.width - 1, u * (texture.width - 1)));
  const y = Math.max(0, Math.min(texture.height - 1, v * (texture.height - 1)));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, texture.width - 1), y1 = Math.min(y0 + 1, texture.height - 1);
  const read = (xx, yy) => {
    const index = (yy * texture.width + xx) * 4;
    return texture.data[index + 3] ? texture.data[index + channel] : 190;
  };
  const top = read(x0, y0) * (1 - x + x0) + read(x1, y0) * (x - x0);
  const bottom = read(x0, y1) * (1 - x + x0) + read(x1, y1) * (x - x0);
  return top * (1 - y + y0) + bottom * (y - y0);
}

/** Smooth spherical shading without bump maps or per-texel lighting normals.
 * @param {number} pixels
 * @param {number} phase Unchanged astronomical phase, 0 → 1.
 * @param {MoonTexture | null} texture
 * @param {number} pixelRatio
 */
export function renderMoonSphere(pixels, phase, texture = null, pixelRatio = 1) {
  const output = new Uint8ClampedArray(pixels * pixels * 4);
  const edge = 1.25 * pixelRatio;
  const radius = pixels / 2 - edge / 2;
  if (radius <= 0 || !Number.isFinite(phase)) return output;
  const theta = phase * Math.PI * 2;
  const fraction = (1 - Math.cos(theta)) / 2;
  const direction = moonLightDirection(phase);
  const side = Math.sin(theta) >= 0 ? 1 : -1;
  const cosTilt = Math.cos(LIGHT_ROTATION), sinTilt = Math.sin(LIGHT_ROTATION);
  // Near-full shadow is a subtle wrap, rather than a dark stripe. A genuine
  // night side at other phases retains 18% of the original photograph.
  const nearFullLift = 0.80 * smoothstep(0.82, 0.92, fraction);
  for (let y = 0; y < pixels; y++) for (let x = 0; x < pixels; x++) {
    const sx = x + 0.5 - pixels / 2, sy = y + 0.5 - pixels / 2;
    const distance = Math.hypot(sx, sy);
    const coverage = smoothstep(0, 1, (radius - distance) / edge + 0.5);
    if (!coverage) continue;
    const normalRadius = Math.max(radius, distance);
    const nx = sx / normalRadius, ny = sy / normalRadius;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const limb = 0.5 + 0.5 * Math.pow(nz, 0.6);
    // Signed screen-space distance to the curved terminator. The feather
    // radius is 15% of the lunar radius, independent of phase and resolution.
    const tx = side * nx * cosTilt - ny * sinTilt;
    const ty = side * nx * sinTilt + ny * cosTilt;
    const terminator = Math.cos(theta) * Math.sqrt(Math.max(0, 1 - ty * ty));
    let lit = smoothstep(-0.15, 0.15, tx - terminator) * smoothstep(0, 0.025, fraction);
    lit += (1 - lit) * nearFullLift;
    lit += (1 - lit) * smoothstep(0.995, 1, fraction);
    const hx = Math.sign(direction.x) * 0.18, hy = -0.18;
    const highlight = 1 + 0.08 * Math.exp(-((nx - hx) ** 2 + (ny - hy) ** 2) / 0.12) * lit;
    const u = (nx + 1) / 2, v = (ny + 1) / 2;
    const r = texture ? sample(texture, u, v, 0) : 190;
    const g = texture ? sample(texture, u, v, 1) : 190;
    const b = texture ? sample(texture, u, v, 2) : 190;
    const albedo = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const daylight = shoulder(EXPOSURE * Math.pow(albedo, GAMMA) * highlight);
    const intensity = 255 * (EARTHSHINE * albedo * (1 - lit) + daylight * lit) * limb;
    const index = (y * pixels + x) * 4;
    output[index] = Math.min(253, intensity);
    output[index + 1] = Math.min(253, intensity);
    output[index + 2] = Math.min(253, intensity);
    output[index + 3] = Math.round(255 * coverage);
  }
  return output;
}

/** Read the 3× display asset once. Preserve its native dimensions; no upscaling.
 * @param {HTMLImageElement} photo
 * @returns {MoonTexture | null}
 */
export function readMoonTexture(photo) {
  try {
    const size = Math.min(512, photo.naturalWidth || photo.width);
    if (!size) return null;
    const buffer = document.createElement("canvas");
    buffer.width = buffer.height = size;
    const ctx = buffer.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(photo, 0, 0, size, size);
    return { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data };
  } catch { return null; }
}

/** @param {HTMLCanvasElement} canvas
 * @param {number} phase
 * @param {MoonTexture | null} texture
 */
export function drawMoonSphere(canvas, phase, texture = null, pixelRatio = 1) {
  const size = canvas.getBoundingClientRect().width;
  if (!size) return;
  const ratio = Number.isFinite(pixelRatio) ? Math.max(1, pixelRatio) : 1;
  const pixels = Math.max(2, Math.round(size * ratio));
  canvas.width = canvas.height = pixels;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const frame = ctx.createImageData(pixels, pixels);
  frame.data.set(renderMoonSphere(pixels, phase, texture, pixels / size));
  applyMoonDuotone(frame.data);
  ctx.putImageData(frame, 0, 0);
}
