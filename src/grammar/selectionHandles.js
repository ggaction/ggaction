import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { normalizeSelectionRegion } from "./selectionRegion.js";
import { mapContinuousScaleValues } from "./scales/mapping.js";
import { mapOrdinalPositionValues } from "./scales/ordinal.js";
import { invertPositionInterval } from "./scales/inversion.js";
import { invertAngularInterval } from "./scales/angularInversion.js";
import { polarToCartesian } from "./polar.js";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const degrees = radians => radians * 180 / Math.PI;
const radians = angle => angle * Math.PI / 180;
const angle = value => ((value % 360) + 360) % 360;

// A handle describes an authored region boundary, never the bounding box of
// whichever data items happen to be selected. All scale math stays native.
function extent(axis, scale, spend) {
  invertPositionInterval(scale, scale.range);
  if (axis.ranges !== undefined) {
    if (axis.ranges.length !== 1) return null;
    const { min, max } = axis.ranges[0];
    if (min === max) throw new Error("Selection resize handles have ambiguous coincident boundaries.");
    const domainLow = Math.min(...scale.domain), domainHigh = Math.max(...scale.domain);
    if (min < domainLow || max > domainHigh) return null;
    const positions = mapContinuousScaleValues([min, max], scale);
    return { extent: positions, anchors: positions };
  }
  if (!axis.values.length) return null;
  const selected = new Set(axis.values), positions = [];
  spend(scale.domain.length + axis.values.length);
  scale.domain.forEach((value, index) => { if (selected.has(value)) positions.push(index); });
  if (positions.length !== selected.size || positions.some((value, index) => index && value !== positions[index - 1] + 1)) return null;
  const endpoints = mapOrdinalPositionValues([scale.domain[positions[0]], scale.domain[positions.at(-1)]], scale);
  const direction = Math.sign(scale.step);
  return { extent: [endpoints[0] - direction * scale.bandwidth / 2, endpoints[1] + direction * scale.bandwidth / 2], anchors: endpoints };
}

function angularExtent(region, scale, screenAngles, spend) {
  const matches = values => same(normalizeSelectionRegion({ theta: invertAngularInterval(scale, ...values) }).theta, region);
  if (screenAngles !== undefined) {
    return matches(screenAngles) ? screenAngles.map(degrees) : null;
  }
  // Enumerate only authored range ends (at most four), or the two ends of
  // one contiguous category run. A discontinuous selection has no resize arc.
  let endpoints;
  if (region.ranges !== undefined) {
    const domainLow = Math.min(...scale.domain), domainHigh = Math.max(...scale.domain);
    if (region.ranges.some(value => value.min < domainLow || value.max > domainHigh)) return null;
    endpoints = mapContinuousScaleValues(region.ranges.flatMap(value => [value.min, value.max]), scale);
  } else endpoints = extent(region, scale, spend)?.extent ?? [];
  const candidates = new Map();
  for (const from of endpoints) for (const to of endpoints) {
    spend(1);
    if (angle(from) !== angle(to) && matches([radians(angle(from)), radians(angle(to))])) {
      const pair = [angle(from), angle(to)]; candidates.set(JSON.stringify(pair), pair);
    }
  }
  if (candidates.size > 1) throw new Error("Selection resize requires one unambiguous directed arc.");
  return candidates.values().next().value ?? null;
}

export function projectSelectionHandles({ region, channels, scales, bounds, polarFrame, screenAngles }, account = () => {}) {
  const normalized = normalizeSelectionRegion(region), keys = Object.keys(channels);
  if (Object.keys(normalized).length !== keys.length || keys.some(key => !Object.hasOwn(normalized, channels[key]))) return null;
  let work = 0;
  const spend = count => { validateWorkLimit(work += count, "Selection handle work"); account(count); };
  if (polarFrame !== undefined) {
    const angles = angularExtent(normalized.theta, scales.theta, screenAngles, spend);
    if (angles === null) return null;
    if (angle(angles[0]) === angle(angles[1])) throw new Error("Selection resize handles have ambiguous coincident boundaries.");
    const handles = angles.map((theta, index) => ({ handle: index ? "theta-end" : "theta-start",
      point: polarToCartesian({ theta, radius: polarFrame.availableRadius, frame: polarFrame }) }));
    return cloneAndFreeze({ region: normalized, angles, handles });
  }
  const extents = {}, anchors = {};
  for (const key of keys) {
    const projected = extent(normalized[channels[key]], scales[key], spend);
    if (projected === null) return null;
    extents[key] = projected.extent; anchors[key] = projected.anchors;
    if (extents[key][0] === extents[key][1]) throw new Error("Selection resize handles have ambiguous coincident boundaries.");
  }
  const mid = key => extents[key] === undefined ? bounds[key] + bounds[key === "x" ? "width" : "height"] / 2
    : extents[key][0] / 2 + extents[key][1] / 2;
  const handles = [];
  for (const key of keys) for (let side = 0; side < 2; side++) handles.push({ handle: `${key}-${side ? "max" : "min"}`,
    point: { x: mid("x"), y: mid("y"), [key]: extents[key][side] } });
  if (keys.length === 2) for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) handles.push({
    handle: `x-${x ? "max" : "min"}-y-${y ? "max" : "min"}`, point: { x: extents.x[x], y: extents.y[y] } });
  return cloneAndFreeze({ region: normalized, extents, anchors, handles });
}
