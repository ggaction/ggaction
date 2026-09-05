import targets from "../../../examples/area-layout/targets.json" with { type: "json" };
import { partitionReference, referenceAreaCommands, referenceBarItems, splitReferenceSegments } from "../../oracles/series-area.js";

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const targetDefinitions = freeze(targets);
export const layout = targetDefinitions[0].dimensions;
export const defaultColors = freeze(["#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b",
  "#eeca3b", "#b279a2", "#ff9da6", "#9d755d", "#bab0ac"]);

export function areaReference(id) {
  const target = targetDefinitions.find(target => target.id === id);
  const rows = target.publicCalls[1].args.values;
  const options = target.publicCalls[2].args;
  const horizontal = options.valueChannel === "x";
  const independentField = horizontal ? options.y : options.x;
  const measurement = horizontal ? options.x : options.y;
  const range = typeof measurement === "object" && "lower" in measurement;
  const primary = range ? measurement.lower : typeof measurement === "string" ? measurement : measurement.field;
  const secondary = range ? measurement.upper : { datum: options.baseline ?? 0 };
  const mode = options.layout ?? "overlay";
  const groups = options.groupBy ? [...new Set(rows.map(row => row[options.groupBy]))] : [undefined];
  const positions = [...new Set(rows.map(row => row[independentField]))].sort((a, b) => a - b);
  const boundaries = groups.map(group => ({ group, samples: [] }));
  for (const position of positions) {
    const selected = groups.map(group => rows.find(row => row[independentField] === position &&
      (!options.groupBy || row[options.groupBy] === group)));
    const lower = selected.map(row => row[primary]);
    const upper = selected.map(row => typeof secondary === "string" ? row[secondary] : secondary.datum);
    const pairs = mode === "overlay" ? lower.map((lo, i) => [lo, upper[i]]) : partitionReference(lower, mode);
    pairs.forEach(([lower, upper], group) => boundaries[group].samples.push({ position, lower, upper }));
  }
  const domainValues = boundaries.flatMap(b => b.samples.flatMap(s => [s.lower, s.upper])).filter(v => v != null);
  const measureDomain = mode === "fill" ? [0, 1] : [Math.min(...domainValues), Math.max(...domainValues)];
  const independentDomain = [positions[0], positions.at(-1)];
  const measureType = typeof measurement === "object" ? measurement.scale?.type ?? "linear" : "linear";
  const geometry = { ...layout, horizontal, measureType, measureDomain, independentDomain };
  const segments = boundaries.flatMap((boundary, index) => splitReferenceSegments(boundary.samples)
    .map(samples => ({ group: boundary.group, samples, commands: referenceAreaCommands(samples, geometry),
      fill: options.color ? defaultColors[index] : defaultColors[0] })));
  return freeze({ target, rows, options, horizontal, independentField, primary, secondary, mode,
    groups, positions, boundaries, segments, measureDomain, independentDomain, measureType,
    xDomain: horizontal ? measureDomain : independentDomain,
    yDomain: horizontal ? independentDomain : measureDomain });
}

export function barReference(id) {
  const target = targetDefinitions.find(target => target.id === id);
  const rows = target.publicCalls[1].args.values;
  const mode = id === "bar-independent-stack" ? "stack" : "group";
  return freeze({ target, rows, mode, ...referenceBarItems(rows, mode, layout) });
}
