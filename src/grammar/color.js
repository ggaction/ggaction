import { validateWorkLimit } from "../core/validation.js";

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

export function hue(value) {
  return ((value % 360) + 360) % 360;
}

export function hslToRgb({ h, s, l }) {
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

export function parseContinuousColor(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Continuous color range requires non-empty color strings.");
  }
  const name = value.toLowerCase();
  const normalized = Object.hasOwn(BASIC_COLORS, name) ? BASIC_COLORS[name] : name;
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

// Standard CSS named-color values, independent of host style resolution.
const NAMED_COLORS = Object.freeze({
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  black: "#000000",
  blanchedalmond: "#ffebcd",
  blue: "#0000ff",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  crimson: "#dc143c",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkgrey: "#a9a9a9",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  gray: "#808080",
  green: "#008000",
  greenyellow: "#adff2f",
  grey: "#808080",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  lime: "#00ff00",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  magenta: "#ff00ff",
  maroon: "#800000",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  navy: "#000080",
  oldlace: "#fdf5e6",
  olive: "#808000",
  olivedrab: "#6b8e23",
  orange: "#ffa500",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  pink: "#ffc0cb",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#ff0000",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  silver: "#c0c0c0",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  teal: "#008080",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  white: "#ffffff",
  whitesmoke: "#f5f5f5",
  yellow: "#ffff00",
  yellowgreen: "#9acd32"
});

const NUMBER = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?";
const COMPONENT = new RegExp(`^(${NUMBER})(%)?$`, "i");
const HUE = new RegExp(`^(${NUMBER})(deg|grad|rad|turn)?$`, "i");

function channel(text, divisor, percentage = false) {
  const match = COMPONENT.exec(text);
  if (!match || percentage && match[2] !== "%") return undefined;
  const value = Number(match[1]) / (match[2] === "%" ? 100 : divisor);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
}

function paintHue(text) {
  const match = HUE.exec(text);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  // Reduce before multiplying so very large finite authored hues remain finite.
  if (match[2] === "turn") return (value % 1) * 360;
  if (match[2] === "grad") return (value % 400) * 0.9;
  if (match[2] === "rad") return (value % (2 * Math.PI)) * 180 / Math.PI;
  return value % 360;
}

function rgba(r, g, b, a = 1) {
  return Object.freeze({ r: r === 0 ? 0 : r, g: g === 0 ? 0 : g,
    b: b === 0 ? 0 : b, a: a === 0 ? 0 : a });
}

// The strict, host-independent color boundary for structured paints and effects.
// Legacy solid paint and continuous-scale input retain their existing syntax.
export function parsePaintColor(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Paint color requires a non-empty string.");
  }
  validateWorkLimit(value.length, "Paint color length");
  let color = value.trim().toLowerCase();
  if (color === "transparent") return rgba(0, 0, 0, 0);
  if (Object.hasOwn(NAMED_COLORS, color)) color = NAMED_COLORS[color];
  const hex = /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(color);
  if (hex) {
    const expanded = color.length <= 5
      ? [...color.slice(1)].map(character => character.repeat(2)).join("")
      : color.slice(1);
    const channels = [0, 2, 4].map(index => Number.parseInt(expanded.slice(index, index + 2), 16) / 255);
    return rgba(...channels, expanded.length === 8 ? Number.parseInt(expanded.slice(6), 16) / 255 : 1);
  }
  const functional = /^(rgb|rgba|hsl|hsla)\(([\s\S]*)\)$/.exec(color);
  if (functional) {
    const name = functional[1], parts = functional[2].split(",").map(part => part.trim());
    const alphaForm = name.endsWith("a");
    if (parts.length === (alphaForm ? 4 : 3)) {
      const alpha = alphaForm ? channel(parts[3], 1) : 1;
      if (alpha !== undefined) {
        if (name.startsWith("rgb")) {
          const percentages = parts.slice(0, 3).map(part => part.endsWith("%"));
          const channels = parts.slice(0, 3).map(part => channel(part, 255));
          if (percentages.every(value => value === percentages[0]) && channels.every(value => value !== undefined)) {
            return rgba(...channels, alpha);
          }
        } else {
          const h = paintHue(parts[0]), s = channel(parts[1], 100, true), l = channel(parts[2], 100, true);
          if (h !== undefined && s !== undefined && l !== undefined) {
            const { r, g, b } = hslToRgb({ h, s, l });
            return rgba(r, g, b, alpha);
          }
        }
      }
    }
  }
  throw new Error(`Unsupported paint color "${value}".`);
}

export function paintColorCSS(value, opacity = 1) {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new RangeError("Paint color opacity must be finite from 0 to 1.");
  }
  const { r, g, b, a } = parsePaintColor(value);
  return `rgba(${r * 255},${g * 255},${b * 255},${a * opacity})`;
}
