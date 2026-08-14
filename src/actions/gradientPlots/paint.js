import { resolveContinuousPalette } from "../../grammar/palettes.js";
import { inverseLerp } from "../../grammar/numeric.js";
import { mapScaleConsumerValues } from "../../materialization/scales/map.js";

function parseHex(value) {
  const match = value.match(/^#([0-9a-f]{6})$/i);
  if (!match) throw new Error(`Gradient plot requires a six-digit hex color, received "${value}".`);
  const color = Number.parseInt(match[1], 16);
  return [color >> 16, color >> 8 & 255, color & 255];
}

function interpolate(left, right, amount) {
  return left.map((channel, index) =>
    Math.round(channel + (right[index] - channel) * amount)
  );
}

function alphaColor(rgb, opacity) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Number(opacity.toFixed(6))})`;
}

function paletteColor(colors, amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  const scaled = bounded * (colors.length - 1);
  const left = Math.floor(scaled);
  return interpolate(
    parseHex(colors[left]),
    parseHex(colors[Math.min(colors.length - 1, left + 1)]),
    scaled - left
  );
}

function categoricalRamp(base) {
  const rgb = parseHex(base);
  const pale = interpolate([255, 255, 255], rgb, 0.2);
  return [
    `#${pale.map(value => value.toString(16).padStart(2, "0")).join("")}`,
    base
  ];
}

export function resolveGradientPlotCategoryColors(program, layer, categories) {
  if (layer.encoding?.color === undefined) return undefined;
  const scale = program.resolvedScales[layer.encoding.color.scale];
  if (scale === undefined) {
    throw new Error(`Gradient plot "${layer.id}" requires a resolved color scale.`);
  }
  return mapScaleConsumerValues(categories, scale, "color");
}

export function createGradientPlotPaint(profile, {
  orientation,
  valueScale,
  intensityDomain,
  palette,
  opacity,
  baseColor
}) {
  const values = profile.values;
  const intensities = profile.intensities;
  const mapped = mapScaleConsumerValues(values, valueScale, "position");
  const startPosition = mapped[0];
  const endPosition = mapped.at(-1);
  if (!Number.isFinite(startPosition) || !Number.isFinite(endPosition) || startPosition === endPosition) {
    throw new Error("Gradient plot requires distinct mapped profile endpoints.");
  }
  const increasing = startPosition < endPosition;
  const start = orientation === "vertical"
    ? { x: 0.5, y: increasing ? 0 : 1 }
    : { x: increasing ? 0 : 1, y: 0.5 };
  const end = orientation === "vertical"
    ? { x: 0.5, y: increasing ? 1 : 0 }
    : { x: increasing ? 1 : 0, y: 0.5 };
  const colors = baseColor === undefined
    ? resolveContinuousPalette(palette, 11)
    : categoricalRamp(baseColor);
  const maximum = intensityDomain[1];
  const stops = values.map((_, index) => {
    const fraction = intensities[index] / maximum;
    const offset = Number(
      inverseLerp(mapped[index], startPosition, endPosition).toFixed(12)
    );
    return {
      offset: Object.is(offset, -0) ? 0 : offset,
      color: alphaColor(
        paletteColor(colors, fraction),
        opacity[0] + (opacity[1] - opacity[0]) * fraction
      )
    };
  });
  return {
    type: "linear-gradient",
    from: start,
    to: end,
    stops
  };
}

export function createDensityLegendPaint(opacity) {
  const colors = ["#e2e8f0", "#334155"];
  return {
    type: "linear-gradient",
    from: { x: 0.5, y: 1 },
    to: { x: 0.5, y: 0 },
    stops: colors.map((color, index) => ({
      offset: index,
      color: alphaColor(parseHex(color), opacity[index])
    }))
  };
}
