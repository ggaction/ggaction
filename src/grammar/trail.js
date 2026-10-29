import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateNonNegativeFinite } from "../core/validation.js";
import { requireFiniteResult } from "./numeric.js";
import { validateLineCap, validateLineJoin, validateMiterLimit } from "./strokeStyle.js";
import { validatePathCommandCount, validatePathFillRule } from "./pathTopology.js";
import { arcToCubicCommands } from "./pathGeometry.js";

// A screen-space run is already ordered and projected by its coordinate owner.
// Null explicitly separates missing-data runs. This module never sorts samples.
export function normalizeTrailOptions(input = {}) {
  ownRecord(input, "Trail options");
  rejectUnknownProperties(input, ["lineJoin", "lineCap", "miterLimit", "fillRule", "closed"], "Trail options");
  if (Object.values(input).some(value => value === null || value === undefined)) throw new TypeError("Trail options require defined values.");
  if (input.closed !== undefined && typeof input.closed !== "boolean") throw new TypeError("Trail closed must be boolean.");
  return cloneAndFreeze({ ...(input.closed === undefined ? {} : { closed: input.closed }), lineJoin: validateLineJoin(input.lineJoin ?? "miter", "Trail"),
    lineCap: validateLineCap(input.lineCap ?? "butt", "Trail"),
    miterLimit: validateMiterLimit(input.miterLimit ?? 4, "Trail"),
    fillRule: validatePathFillRule(input.fillRule ?? "nonzero") });
}
const same = (a, b) => a.x === b.x && a.y === b.y;
const finite = value => requireFiniteResult(value, "Trail geometry");
const point = (x, y) => ({ x: finite(x), y: finite(y) });
const offset = (sample, direction, normal = 1, along = 0) => point(
  sample.x - direction.y * sample.width / 2 * normal + direction.x * sample.width / 2 * along,
  sample.y + direction.x * sample.width / 2 * normal + direction.y * sample.width / 2 * along);
function direction(a, b) {
  const x = finite(b.x - a.x), y = finite(b.y - a.y), length = finite(Math.hypot(x, y));
  return { x: x / length, y: y / length };
}
function samples(input) {
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "Trail sample count");
  ownArray(input, "Trail samples");
  const runs = []; let run;
  input.forEach((entry, sourceIndex) => {
    if (entry === null) { run = undefined; return; }
    ownRecord(entry, "Trail sample"); rejectUnknownProperties(entry, ["x", "y", "width"], "Trail sample");
    if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) throw new TypeError("Trail samples require finite x/y coordinates.");
    validateNonNegativeFinite(entry.width, "Trail sample width");
    if (run === undefined) { run = []; runs.push(run); }
    if (run.length && same(run.at(-1), entry)) {
      run.at(-1).width = entry.width; run.at(-1).sourceIndices.push(sourceIndex);
    } else run.push({ x: entry.x, y: entry.y, width: entry.width, sourceIndices: [sourceIndex] });
  });
  return runs;
}
// A true reversal has no unique bisector. Two capped subpaths retain both
// segments and their lineage instead of dividing by a zero miter denominator.
function splitReversals(run) {
  if (run.length < 3) return [run];
  const parts = []; let start = 0, before = direction(run[0], run[1]);
  for (let i = 1; i < run.length - 1; i++) {
    const after = direction(run[i], run[i + 1]);
    if (before.x * after.y - before.y * after.x === 0 && before.x * after.x + before.y * after.y < 0) {
      parts.push(run.slice(start, i + 1)); start = i;
    }
    before = after;
  }
  parts.push(run.slice(start)); return parts;
}
function writer(commands) {
  const append = command => { validatePathCommandCount(commands.length + 1, "Trail path command count"); commands.push(command); };
  const line = p => append({ op: commands.length ? "L" : "M", ...p });
  const arc = (sample, startAngle, endAngle) => {
    if (sample.width / 2 === 0) { line(point(sample.x, sample.y)); return; }
    const result = arcToCubicCommands({ centerX: sample.x, centerY: sample.y, radiusX: sample.width / 2, startAngle, endAngle });
    if (result.diagnostics.length) throw new RangeError("Trail round geometry cannot meet its arc tolerance.");
    validatePathCommandCount(commands.length + result.commands.length, "Trail path command count");
    line(point(result.commands[0].x, result.commands[0].y));
    for (const command of result.commands.slice(1)) append(command);
  };
  return { append, line, arc };
}
function join(sample, a, b, options, write) {
  const cross = a.x * b.y - a.y * b.x, dot = a.x * b.x + a.y * b.y;
  if (cross === 0 && dot > 0) { write.line(offset(sample, b)); return; }
  const nx = -a.y - b.y, ny = a.x + b.x, norm = Math.hypot(nx, ny), ratio = 2 / norm;
  const outer = cross < 0;
  // Inner and miter joins use the same bounded tangent bisector. Bevel is
  // the deterministic fallback when the intersection exceeds miterLimit.
  if ((!outer || options.lineJoin === "miter") && ratio <= options.miterLimit) {
    const distance = finite(sample.width / 2 * ratio);
    write.line(point(sample.x + nx / norm * distance, sample.y + ny / norm * distance));
  } else if (outer && options.lineJoin === "round") {
    const angle = Math.atan2(a.x, -a.y);
    write.arc(sample, angle, angle + Math.atan2(cross, dot));
  } else {
    write.line(offset(sample, a)); write.line(offset(sample, b));
  }
}
function boundary(run, options, write) {
  const directions = run.slice(1).map((sample, i) => direction(run[i], sample));
  write.line(offset(run[0], directions[0]));
  for (let i = 1; i < run.length - 1; i++) join(run[i], directions[i - 1], directions[i], options, write);
  write.line(offset(run.at(-1), directions.at(-1)));
  return directions;
}
function combinePaths(parts, materialize) {
  const commands = [];
  for (const part of parts) {
    const next = materialize(part);
    validatePathCommandCount(commands.length + next.length, "Trail path command count");
    for (const command of next) commands.push(command);
  }
  return commands;
}
function closedRibbon(run, options) {
  if (run.length < 2) return ribbon(run, options);
  const reversal = run.findIndex((sample, index) => {
    const a = direction(run[(index + run.length - 1) % run.length], sample), b = direction(sample, run[(index + 1) % run.length]);
    return a.x * b.y - a.y * b.x === 0 && a.x * b.x + a.y * b.y < 0;
  });
  if (reversal !== -1) {
    const rotated = [...run.slice(reversal), ...run.slice(0, reversal), run[reversal]];
    return combinePaths(splitReversals(rotated), part => ribbon(part, options));
  }
  // Opposite winding contours preserve the empty center under nonzero fill.
  // Each contour has its own move, so there is no painted seam connector.
  return combinePaths([run, [...run].reverse()], points => {
    const commands = [], write = writer(commands);
    points.forEach((sample, index) => join(sample,
      direction(points[(index + points.length - 1) % points.length], sample),
      direction(sample, points[(index + 1) % points.length]), options, write));
    write.append({ op: "Z" }); return commands;
  });
}
function cap(sample, direction, options, write) {
  if (options.lineCap === "round") {
    const angle = Math.atan2(direction.x, -direction.y);
    write.arc(sample, angle, angle - Math.PI);
  } else {
    if (options.lineCap === "square") {
      write.line(offset(sample, direction, 1, 1)); write.line(offset(sample, direction, -1, 1));
    }
    write.line(offset(sample, direction, -1));
  }
}
function ribbon(run, options) {
  const commands = [], write = writer(commands);
  if (run.length === 1) {
    const sample = run[0];
    if (options.lineCap === "round") write.arc(sample, Math.PI / 2, -Math.PI * 3 / 2);
    else if (options.lineCap === "square") {
      for (const [x, y] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) write.line(point(sample.x + x * sample.width / 2, sample.y + y * sample.width / 2));
    } else write.line(point(sample.x, sample.y));
  } else {
    const forward = boundary(run, options, write); cap(run.at(-1), forward.at(-1), options, write);
    const reverse = [...run].reverse(), backward = boundary(reverse, options, write);
    cap(run[0], backward.at(-1), options, write);
  }
  write.append({ op: "Z" }); return commands;
}
export function layoutTrailRibbon(input, options = {}) {
  const normalized = normalizeTrailOptions(options), runs = samples(input), commands = [];
  for (const run of runs) {
    if (normalized.closed && run.length > 1 && same(run[0], run.at(-1))) {
      const last = run.pop(); run[0].width = last.width; run[0].sourceIndices.push(...last.sourceIndices);
    }
    for (const part of normalized.closed ? [run] : splitReversals(run)) {
      const next = normalized.closed ? closedRibbon(part, normalized) : ribbon(part, normalized);
      validatePathCommandCount(commands.length + next.length, "Trail path command count");
      for (const command of next) commands.push(command);
    }
  }
  return cloneAndFreeze({ options: normalized, runs, commands, fillRule: normalized.fillRule });
}
