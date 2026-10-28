import { patternInk } from "../../oracles/patterns.js";

const foreground = [15, 118, 110], background = [254, 243, 199], underlay = [226, 232, 240];
// Analytic periodic coverage, independent of the tile polygons and cubic lowering.
function inkAt(bar, x, y) {
  return patternInk(bar.options.style, (x - bar.origin[0]) / bar.options.pitch,
    (y - bar.origin[1]) / bar.options.pitch, bar.options.strokeWidth / bar.options.pitch);
}
function clipped(bar, x, y) {
  if (bar.circle) return Math.hypot(x - bar.circle.center[0], y - bar.circle.center[1]) > bar.circle.radius;
  return x < bar.bounds.x || y < bar.bounds.y || x > bar.bounds.x + bar.bounds.width || y > bar.bounds.y + bar.bounds.height;
}
export function expectedColor(bar, x, y) {
  const alpha = bar.panel.id === "alpha", base = alpha ? underlay : background;
  if (clipped(bar, x, y) || !inkAt(bar, x, y)) return [...base, 255];
  const opacity = alpha ? 0.5 * 0.65 : 1;
  return [...foreground.map((value, index) => Math.round(value * opacity + base[index] * (1 - opacity))), 255];
}
export function samplePixels(fixture) {
  const result = [{ name: "outside", pixel: [2, 2], color: [255, 255, 255, 255] }];
  for (const bar of fixture.bars) {
    const found = new Set();
    for (let y = bar.bounds.y + 4; y < bar.bounds.y + bar.bounds.height - 4; y++) {
      for (let x = bar.bounds.x + 4; x < bar.bounds.x + bar.bounds.width - 4; x++) {
        const center = expectedColor(bar, x + 0.5, y + 0.5);
        const kind = clipped(bar, x + 0.5, y + 0.5) ? "clipped" : inkAt(bar, x + 0.5, y + 0.5) ? "ink" : "gap";
        if (found.has(kind)) continue;
        // Keep a 1.25-pixel clearance from analytic ink and clip boundaries.
        if (![-1.25, 0, 1.25].every(dx => [-1.25, 0, 1.25].every(dy => expectedColor(bar, x + 0.5 + dx, y + 0.5 + dy).every((value, index) => value === center[index])))) continue;
        found.add(kind); result.push({ name: `${bar.id}-${kind}`, pixel: [x, y], color: center });
      }
    }
    if (bar.circle && ["cross", "dots"].includes(fixture.style)) {
      let overlap;
      for (let y = bar.bounds.y + 4; y < bar.bounds.y + bar.bounds.height - 4 && !overlap; y++) {
        for (let x = bar.bounds.x + 4; x < bar.bounds.x + bar.bounds.width - 4; x++) {
          const px = x + 0.5, py = y + 0.5;
          if (clipped(bar, px, py)) continue;
          const u = (px - bar.origin[0]) / bar.options.pitch, v = (py - bar.origin[1]) / bar.options.pitch;
          const radius = bar.options.strokeWidth / bar.options.pitch / 2;
          const intersection = fixture.style === "cross"
            ? Math.abs(u - Math.round(u)) < radius && Math.abs(v - Math.round(v)) < radius
            : [-1, 0, 1, 2].flatMap(dx => [-1, 0, 1, 2].map(dy => Math.hypot(u - (Math.floor(u) + dx), v - (Math.floor(v) + dy)) < radius)).filter(Boolean).length > 1;
          if (!intersection) continue;
          const color = expectedColor(bar, px, py);
          if (![-1.25, 0, 1.25].every(dx => [-1.25, 0, 1.25].every(dy => expectedColor(bar, px + dx, py + dy).every((value, index) => value === color[index])))) continue;
          overlap = { name: `${bar.id}-overlap-alpha`, pixel: [x, y], color }; break;
        }
      }
      if (!overlap) throw new Error(`No overlap alpha sample for ${bar.id}`);
      result.push(overlap);
    }
    if (!found.has("ink")) throw new Error(`No interior ink sample for ${bar.id}`);
    if (bar.circle && !found.has("clipped")) throw new Error(`No clip sample for ${bar.id}`);
  }
  return result;
}
