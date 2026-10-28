import { createPatternTile, resolvePatternOrigin } from "../../../src/grammar/patterns.js";

export const frame = Object.freeze({ width: 600, height: 360 });
export const styles = Object.freeze(["solid", "diagonal", "antidiagonal", "horizontal", "vertical", "cross", "dots"]);
export const panels = Object.freeze([
  { id: "plot", title: "Plot origin · phase 0, 0", x: 24, y: 22, coordinateSpace: "plot", phase: [0, 0] },
  { id: "object", title: "Object origin · phase 0, 0", x: 324, y: 22, coordinateSpace: "object", phase: [0, 0] },
  { id: "phase", title: "Plot origin · phase 7, 5", x: 24, y: 192, coordinateSpace: "plot", phase: [7, 5] },
  { id: "alpha", title: "Alpha 0.5 × 0.65 · circle clip", x: 324, y: 192, coordinateSpace: "plot", phase: [7, 5] }
]);
export const paint = Object.freeze({ foreground: "#0f766e", background: "#fef3c7", underlay: "#e2e8f0", text: "#243447" });
export function rectangle({ x, y, width, height }) {
  return [{ op: "M", x, y }, { op: "L", x: x + width, y }, { op: "L", x: x + width, y: y + height }, { op: "L", x, y: y + height }, { op: "Z" }];
}
export function circle(x, y, radius) {
  const k = radius * 4 / 3 * Math.tan(Math.PI / 8);
  return [{ op: "M", x: x + radius, y },
    { op: "C", x1: x + radius, y1: y + k, x2: x + k, y2: y + radius, x, y: y + radius },
    { op: "C", x1: x - k, y1: y + radius, x2: x - radius, y2: y + k, x: x - radius, y },
    { op: "C", x1: x - radius, y1: y - k, x2: x - k, y2: y - radius, x, y: y - radius },
    { op: "C", x1: x + k, y1: y - radius, x2: x + radius, y2: y - k, x: x + radius, y }, { op: "Z" }];
}

// The private kernel returns corner circles. Clip each to its tile quadrant
// before joining all tiles into one compound fill (including overlapping dots).
function cornerCircle(value, x, y, pitch) {
  const cx = x + value.x * pitch, cy = y + value.y * pitch, r = value.radius * pitch;
  const k = r * 4 / 3 * Math.tan(Math.PI / 8);
  const segments = value.x === 0 && value.y === 0
    ? [{ op: "L", x: cx + r, y: cy }, { op: "C", x1: cx + r, y1: cy + k, x2: cx + k, y2: cy + r, x: cx, y: cy + r }]
    : value.x === 1 && value.y === 0
      ? [{ op: "L", x: cx, y: cy + r }, { op: "C", x1: cx - k, y1: cy + r, x2: cx - r, y2: cy + k, x: cx - r, y: cy }]
      : value.x === 1 && value.y === 1
        ? [{ op: "L", x: cx - r, y: cy }, { op: "C", x1: cx - r, y1: cy - k, x2: cx - k, y2: cy - r, x: cx, y: cy - r }]
        : [{ op: "L", x: cx, y: cy - r }, { op: "C", x1: cx + k, y1: cy - r, x2: cx + r, y2: cy - k, x: cx + r, y: cy }];
  return [{ op: "M", x: cx, y: cy }, ...segments, { op: "Z" }];
}

// Review-only lowering: finite fixture bounds, one nonzero fill per owner.
// This is not a public paint materializer or renderer extension.
function tiledCommands(tile, bounds, origin) {
  if (!tile.repeat) return rectangle(bounds);
  const pitch = tile.options.pitch, result = [];
  for (let row = Math.floor((bounds.y - origin[1]) / pitch) - 1; row <= Math.ceil((bounds.y + bounds.height - origin[1]) / pitch); row++) {
    for (let column = Math.floor((bounds.x - origin[0]) / pitch) - 1; column <= Math.ceil((bounds.x + bounds.width - origin[0]) / pitch); column++) {
      const x = origin[0] + column * pitch, y = origin[1] + row * pitch;
      for (const polygon of tile.polygons) result.push(...polygon.map(([px, py], index) => ({ op: index ? "L" : "M", x: x + px * pitch, y: y + py * pitch })), { op: "Z" });
      for (const value of tile.circles) result.push(...cornerCircle(value, x, y, pitch));
    }
  }
  return result;
}
export function patternFixture(style) {
  if (!styles.includes(style)) throw new TypeError("Unknown review pattern.");
  const bars = panels.flatMap(panel => [54, 82].map((height, index) => {
    const bounds = { x: panel.x + 18 + index * 112, y: panel.y + 120 - height, width: 80, height };
    const alpha = panel.id === "alpha";
    const tile = createPatternTile({ style, pitch: 18, strokeWidth: alpha && style === "dots" ? 20 : 6,
      phase: panel.phase, coordinateSpace: panel.coordinateSpace,
      foreground: alpha ? "rgba(15,118,110,0.5)" : paint.foreground, background: alpha ? "transparent" : paint.background });
    const origin = resolvePatternOrigin(tile.options, { plot: [panel.x, panel.y + 38], object: [bounds.x, bounds.y] });
    const center = [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2], radius = Math.min(bounds.width, bounds.height) / 2 - 2;
    return { id: `${panel.id}-${index}`, panel, bounds, options: tile.options, origin,
      commands: tiledCommands(tile, bounds, origin), opacity: alpha ? 0.65 : 1,
      clip: alpha ? { type: "path", commands: circle(...center, radius), fillRule: "nonzero" } : bounds,
      circle: alpha ? { center, radius } : undefined };
  }));
  return { style, bars, underlay: bars.flatMap(bar => rectangle(bar.bounds)), background: bars.filter(bar => bar.panel.id !== "alpha").flatMap(bar => rectangle(bar.bounds)),
    labels: { x: [...panels.map(panel => panel.x), ...bars.map(bar => bar.bounds.x)],
      y: [...panels.map(panel => panel.y), ...bars.map(bar => bar.panel.y + 140)],
      text: [...panels.map(panel => panel.title), ...bars.map((bar, index) => index % 2 ? "West · 82" : "East · 54")] } };
}
