import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import {
  normalizePalette,
  resolveContinuousPalette
} from "../palettes.js";

export const CONTINUOUS_COLOR_INTERPOLATIONS = cloneAndFreeze([
  "rgb",
  "hsl",
  "hsl-long",
  "lab",
  "hcl",
  "hcl-long",
  "cubehelix",
  "cubehelix-long"
]);

const BASIC_COLORS = Object.freeze({
  black: "#000000",
  blue: "#0000ff",
  cyan: "#00ffff",
  gray: "#808080",
  green: "#008000",
  grey: "#808080",
  magenta: "#ff00ff",
  navy: "#000080",
  orange: "#ffa500",
  purple: "#800080",
  red: "#ff0000",
  teal: "#008080",
  white: "#ffffff",
  yellow: "#ffff00"
});

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function hue(value) {
  return ((value % 360) + 360) % 360;
}

function hslToRgb({ h, s, l }) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue(h) / 60;
  const second = chroma * (1 - Math.abs(segment % 2 - 1));
  const [red, green, blue] = segment < 1 ? [chroma, second, 0]
    : segment < 2 ? [second, chroma, 0]
      : segment < 3 ? [0, chroma, second]
        : segment < 4 ? [0, second, chroma]
          : segment < 5 ? [second, 0, chroma]
            : [chroma, 0, second];
  const match = l - chroma / 2;
  return { r: red + match, g: green + match, b: blue + match };
}

function parseColor(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Continuous color range requires non-empty color strings.");
  }
  const normalized = BASIC_COLORS[value.toLowerCase()] ?? value.toLowerCase();
  let match = normalized.match(/^#([0-9a-f]{3})$/i);
  if (match) {
    return Object.fromEntries(["r", "g", "b"].map((channel, index) => [
      channel,
      Number.parseInt(match[1][index].repeat(2), 16) / 255
    ]));
  }
  match = normalized.match(/^#([0-9a-f]{6})$/i);
  if (match) {
    return {
      r: Number.parseInt(match[1].slice(0, 2), 16) / 255,
      g: Number.parseInt(match[1].slice(2, 4), 16) / 255,
      b: Number.parseInt(match[1].slice(4, 6), 16) / 255
    };
  }
  match = normalized.match(
    /^rgb\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)$/
  );
  if (match) {
    const percentage = normalized.includes("%");
    const divisor = percentage ? 100 : 255;
    const channels = match.slice(1).map(item => Number(item) / divisor);
    if (channels.every(item => Number.isFinite(item) && item >= 0 && item <= 1)) {
      return { r: channels[0], g: channels[1], b: channels[2] };
    }
  }
  match = normalized.match(
    /^hsl\(\s*([-\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/
  );
  if (match) {
    const h = Number(match[1]);
    const s = Number(match[2]) / 100;
    const l = Number(match[3]) / 100;
    if ([h, s, l].every(Number.isFinite) && s >= 0 && s <= 1 && l >= 0 && l <= 1) {
      return hslToRgb({ h, s, l });
    }
  }
  throw new Error(`Unsupported continuous color "${value}".`);
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map(channel =>
    Math.round(clamp(channel) * 255).toString(16).padStart(2, "0")
  ).join("")}`;
}

function rgbToHsl({ r, g, b }) {
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  const l = (maximum + minimum) / 2;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  const raw = maximum === r
    ? ((g - b) / delta) % 6
    : maximum === g
      ? (b - r) / delta + 2
      : (r - g) / delta + 4;
  return { h: hue(raw * 60), s, l };
}

function linearRgb(channel) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function encodedRgb(channel) {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function rgbToLab(color) {
  const r = linearRgb(color.r);
  const g = linearRgb(color.g);
  const b = linearRgb(color.b);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const convert = value => value > 216 / 24389
    ? Math.cbrt(value)
    : 841 / 108 * value + 4 / 29;
  const fx = convert(x);
  const fy = convert(y);
  const fz = convert(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function labToRgb({ l, a, b }) {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const convert = value => value ** 3 > 216 / 24389
    ? value ** 3
    : 108 / 841 * (value - 4 / 29);
  const x = 0.95047 * convert(fx);
  const y = convert(fy);
  const z = 1.08883 * convert(fz);
  return {
    r: encodedRgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
    g: encodedRgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
    b: encodedRgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z)
  };
}

function labToHcl({ l, a, b }) {
  return { h: hue(Math.atan2(b, a) * 180 / Math.PI), c: Math.hypot(a, b), l };
}

function hclToLab({ h, c, l }) {
  const radians = h * Math.PI / 180;
  return { l, a: Math.cos(radians) * c, b: Math.sin(radians) * c };
}

function rgbToCubehelix({ r, g, b }) {
  const A = -0.14861;
  const B = 1.78277;
  const C = -0.29227;
  const D = -0.90649;
  const E = 1.97294;
  const ED = E * D;
  const EB = E * B;
  const BC_DA = B * C - D * A;
  const l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB);
  const blue = b - l;
  const k = (E * (g - l) - C * blue) / D;
  const denominator = E * l * (1 - l);
  return {
    h: hue(Math.atan2(k, blue) * 180 / Math.PI - 120),
    s: denominator === 0 ? 0 : Math.hypot(k, blue) / denominator,
    l
  };
}

function cubehelixToRgb({ h, s, l }) {
  const angle = (h + 120) * Math.PI / 180;
  const amplitude = s * l * (1 - l);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    r: l + amplitude * (-0.14861 * cosine + 1.78277 * sine),
    g: l + amplitude * (-0.29227 * cosine - 0.90649 * sine),
    b: l + amplitude * (1.97294 * cosine)
  };
}

function interpolateHue(left, right, amount, long) {
  let delta = right - left;
  if (!long) delta = ((delta + 540) % 360) - 180;
  return hue(left + delta * amount);
}

function mix(left, right, amount, method) {
  const linear = key => left[key] + (right[key] - left[key]) * amount;
  if (method === "rgb") {
    return { r: linear("r"), g: linear("g"), b: linear("b") };
  }
  if (method.startsWith("hsl")) {
    const a = rgbToHsl(left);
    const b = rgbToHsl(right);
    return hslToRgb({
      h: interpolateHue(a.h, b.h, amount, method.endsWith("-long")),
      s: a.s + (b.s - a.s) * amount,
      l: a.l + (b.l - a.l) * amount
    });
  }
  if (method === "lab") {
    const a = rgbToLab(left);
    const b = rgbToLab(right);
    return labToRgb({
      l: a.l + (b.l - a.l) * amount,
      a: a.a + (b.a - a.a) * amount,
      b: a.b + (b.b - a.b) * amount
    });
  }
  if (method.startsWith("hcl")) {
    const a = labToHcl(rgbToLab(left));
    const b = labToHcl(rgbToLab(right));
    return labToRgb(hclToLab({
      h: interpolateHue(a.h, b.h, amount, method.endsWith("-long")),
      c: a.c + (b.c - a.c) * amount,
      l: a.l + (b.l - a.l) * amount
    }));
  }
  const a = rgbToCubehelix(left);
  const b = rgbToCubehelix(right);
  return cubehelixToRgb({
    h: interpolateHue(a.h, b.h, amount, method.endsWith("-long")),
    s: a.s + (b.s - a.s) * amount,
    l: a.l + (b.l - a.l) * amount
  });
}

export function validateContinuousColorInterpolation(value) {
  if (!CONTINUOUS_COLOR_INTERPOLATIONS.includes(value)) {
    throw new Error(`Unsupported continuous color interpolation "${value}".`);
  }
  return value;
}

export function validateSequentialColorRange(value) {
  if (value === "auto") return value;
  if (Array.isArray(value)) {
    if (value.length < 2) {
      throw new TypeError("Sequential color range requires at least two colors.");
    }
    value.forEach(parseColor);
    return cloneAndFreeze(value);
  }
  if (
    !isPlainObject(value) ||
    Object.keys(value).length !== 1 ||
    !Object.hasOwn(value, "palette")
  ) {
    throw new TypeError("Sequential color range requires colors or a palette descriptor.");
  }
  const palette = normalizePalette(value.palette);
  if (palette.count !== undefined) {
    throw new Error("Continuous palette does not accept count.");
  }
  return cloneAndFreeze({ palette });
}

export function resolveSequentialColorStops(value) {
  const range = validateSequentialColorRange(value);
  if (range === "auto") return resolveContinuousPalette("viridis");
  return Array.isArray(range)
    ? cloneAndFreeze(range.map(color => rgbToHex(parseColor(color))))
    : resolveContinuousPalette(range.palette);
}

export function interpolateColorStops(stops, position, interpolation = "rgb") {
  const method = validateContinuousColorInterpolation(interpolation);
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new TypeError("Color interpolation requires at least two stops.");
  }
  const colors = stops.map(parseColor);
  const bounded = clamp(position);
  const scaled = bounded * (colors.length - 1);
  const left = Math.floor(scaled);
  const right = Math.min(colors.length - 1, left + 1);
  return rgbToHex(mix(colors[left], colors[right], scaled - left, method));
}

export function mapSequentialColors(
  values,
  domain,
  stops,
  { interpolation = "rgb", clamp: shouldClamp = false } = {}
) {
  if (!Array.isArray(domain) || domain.length !== 2 || !domain.every(Number.isFinite)) {
    throw new TypeError("Sequential color domain must contain two finite numbers.");
  }
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError("Sequential color values must be finite numbers.");
  }
  if (typeof shouldClamp !== "boolean") {
    throw new TypeError("Sequential color clamp must be a boolean.");
  }
  const [start, end] = domain;
  const constant = start === end;
  return cloneAndFreeze(values.map(value => {
    const raw = constant ? 0.5 : (value - start) / (end - start);
    if (!shouldClamp && (raw < 0 || raw > 1)) {
      return interpolateColorStops(stops, raw < 0 ? 0 : 1, interpolation);
    }
    return interpolateColorStops(stops, clamp(raw), interpolation);
  }));
}
