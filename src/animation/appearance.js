import { cloneAndFreeze, isOwned } from '../core/immutable.js';
import { ownRecord } from '../core/ownData.js';
import { validateUnitInterval, validateNonNegativeFinite } from '../core/validation.js';
import { parsePaintColor } from '../grammar/color.js';
import { ANIMATION_COLOR_VERSION, interpolateRGBA, interpolateNumber } from '../grammar/animation/values.js';
import { sameConcreteValue } from './concrete.js';

export const ANIMATION_APPEARANCE_VERSION = ANIMATION_COLOR_VERSION;
const properties = new Set(['fill', 'stroke', 'opacity', 'strokeWidth']);
const plans = new WeakSet();
const fallback = cloneAndFreeze({ kind: 'crossfade', reason: 'appearance' });
function rgba(value) {
  if (value === 'none') return [0, 0, 0, 0];
  const { r, g, b, a } = parsePaintColor(value);
  return [r, g, b, a];
}

// Each native track owner removes its geometry before calling this shared style
// policy. Complex paint/effects remain concrete; no renderer resolves colors here.
export function prepareAnimationAppearance(from, to) {
  ownRecord(from, 'Animation source appearance');
  ownRecord(to, 'Animation target appearance');
  for (const style of [from, to]) for (const key of ['opacity', 'strokeWidth']) {
    if (!Object.hasOwn(style, key)) continue;
    if (key === 'opacity') validateUnitInterval(style[key], 'Animation opacity');
    else validateNonNegativeFinite(style[key], 'Animation stroke width');
  }
  if (typeof from.fill === 'object' || typeof to.fill === 'object') return fallback;
  // Other structured properties already belong to an admitted native endpoint.
  // Do not traverse arbitrary host objects or execute nested getters as style data.
  for (const value of [...Object.values(from), ...Object.values(to)]) {
    if (value !== null && typeof value === 'object' && !isOwned(value)) return fallback;
  }
  const staticValues = value => Object.fromEntries(Object.entries(value).filter(([key]) => !properties.has(key)));
  if (!sameConcreteValue(staticValues(from), staticValues(to))) return fallback;
  const entries = [];
  for (const key of properties) {
    if (from[key] === to[key]) continue;
    if (key === 'fill' || key === 'stroke') {
      if (typeof from[key] !== 'string' || typeof to[key] !== 'string') return fallback;
      let first, last;
      try { first = rgba(from[key]); last = rgba(to[key]); }
      catch { return fallback; }
      entries.push({ key, kind: 'color', from: first, to: last, source: from[key], target: to[key] });
    } else {
      const first = key === 'opacity' && !Object.hasOwn(from, key) ? 1 : from[key];
      const last = key === 'opacity' && !Object.hasOwn(to, key) ? 1 : to[key];
      if (first === undefined || last === undefined) return fallback;
      entries.push({ key, kind: 'number', from: first, to: last });
    }
  }
  const plan = cloneAndFreeze({ kind: 'appearance-interpolation', version: ANIMATION_APPEARANCE_VERSION, entries });
  plans.add(plan);
  return plan;
}

export function sampleAnimationAppearance(plan, progress) {
  if (!plans.has(plan)) throw new TypeError('Appearance sampling requires an authentic compatible plan.');
  validateUnitInterval(progress, 'Appearance progress');
  return cloneAndFreeze(Object.fromEntries(plan.entries.map(entry => {
    if (entry.kind === 'number') return [entry.key, interpolateNumber(entry.from, entry.to, progress)];
    if (progress === 0 || progress === 1) return [entry.key, progress === 0 ? entry.source : entry.target];
    const [r, g, b, a] = interpolateRGBA(entry.from, entry.to, progress);
    return [entry.key, `rgba(${r * 255},${g * 255},${b * 255},${a})`];
  })));
}
