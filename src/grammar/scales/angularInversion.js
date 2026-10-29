import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { angularBrushIntervals, FULL_ANGLE } from "../selectionRegion.js";
import { validateThetaRange } from "../polar.js";
import { invertPositionInterval } from "./inversion.js";

// The existing theta scale owns degrees. Normalize its origin once, keeping
// its direction, domain and resolved band geometry; never reapply reverse.
export function invertAngularInterval(value, start, end) {
  const angles = angularBrushIntervals(start, end);
  ownRecord(value, "Angular brush scale");
  const scale = Object.assign(Object.create(null), value);
  if (["ordinal", "band", "point"].includes(scale.type)) {
    if (Array.isArray(scale.domain)) validateGeneratedItemLimit(scale.domain.length, "Angular brush categories");
    ownArray(scale.domain, "Angular brush categories");
    let work = scale.domain.length;
    for (const item of scale.domain) validateWorkLimit((work += typeof item === "string" ? item.length : 1) * (1 + 4 * angles.length), "Angular brush work");
  }
  const valid = invertPositionInterval(scale, scale.range);
  validateThetaRange(scale.range);
  const low = Math.min(...scale.range), high = Math.max(...scale.range);
  const origin = ((low % 360) + 360) % 360, span = high - low;
  const shifted = { ...scale, range: scale.range[0] < scale.range[1] ? [origin, origin + span] : [origin + span, origin],
    ...(Object.hasOwn(scale, "start") ? { start: origin + (scale.start - low) } : {}) };
  const intervals = angles.map(range => [range.min * 360 / FULL_ANGLE, range.max * 360 / FULL_ANGLE]);
  const values = new Set(), ranges = [];
  for (const [a, b] of intervals) for (const turn of [-1, 0, 1, 2]) {
    const from = a + turn * 360, to = b + turn * 360;
    if (from > origin + span || to < origin) continue;
    // An endpoint at zero belongs to the adjacent turn too. A zero-size
    // interval arises only at a wrapped end=0; use a nonzero request ending
    // at the clipped scale boundary so the existing inverse owns equality.
    let result;
    if (from === to) {
      if (from !== origin && from !== origin + span) continue;
      result = invertPositionInterval(shifted, from === origin ? [from - 1, from] : [from, from + 1]);
    } else result = invertPositionInterval(shifted, [from, to]);
    if (result.kind === "categories") result.values.forEach(item => values.add(item));
    else if (result.bounds !== null) ranges.push({ min: result.bounds[0], max: result.bounds[1] });
  }
  if (valid.kind === "categories") return cloneAndFreeze({ values: scale.domain.filter(item => values.has(item)) });
  ranges.sort((a, b) => a.min - b.min || a.max - b.max);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.min <= previous.max) previous.max = Math.max(previous.max, range.max);
    else merged.push({ ...range });
  }
  return cloneAndFreeze({ ranges: merged });
}
