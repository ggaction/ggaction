import { cloneAndFreeze } from "../core/immutable.js";
import { MAX_BLEND_SOURCES } from "../grammar/weightedBlend.js";
import { interpolateNumber } from "../grammar/animation/values.js";
import { geoTextExpressionKey } from "../materialization/animation/geoTextExpressions.js";
import { sameGeoTextValue as same } from "../materialization/animation/geoTextGeometry.js";
import { prepareAnimationAppearance, sampleAnimationAppearance } from "./appearance.js";

const style = properties => Object.fromEntries(Object.entries(properties).filter(([key]) => !["x", "y"].includes(key)));
const mode = properties => properties.blend ?? "normal";

// Align one raw item order before preparing static expression correspondence.
// Native Text/layout stays with its existing resolver; only weights live here.
export function prepareGeoTextExpressions(from, to, indices) {
  const source = from.expressions.map(expression => cloneAndFreeze({ ...expression,
    properties: indices.map(index => expression.properties[index]) }));
  const target = to.expressions;
  for (let index = 0; index < indices.length; index++) {
    const values = [...source, ...target].map(expression => expression.properties[index]).filter(value => value !== null);
    if (values.some(value => mode(value) !== mode(values[0]))) return { reason: "appearance" };
  }
  const unique = new Set([...source, ...target].map(geoTextExpressionKey));
  if (unique.size > MAX_BLEND_SOURCES) throw new RangeError(`Geographic Text exceeds ${MAX_BLEND_SOURCES} flat expressions.`);
  let appearances;
  if (source.length === 1 && target.length === 1 && source[0].properties.every(p => p !== null) && target[0].properties.every(p => p !== null) && same(source[0].textMetrics, target[0].textMetrics) &&
      same(source[0].layout, target[0].layout) && same(source[0].leader, target[0].leader)) {
    appearances = target[0].properties.map((properties, index) => same(style(source[0].properties[index]), style(properties))
      ? null : prepareAnimationAppearance(style(source[0].properties[index]), style(properties)));
    if (appearances.some(value => value?.kind === "crossfade")) appearances = undefined;
  }
  return { source, target, appearances };
}

export function sampleGeoTextExpressions(prepared, entries, progress, timelineStyle) {
  const { source, target, appearances } = prepared;
  if (appearances !== undefined) {
    return { expressions: [{ ...target[0], weight: 1, properties: target[0].properties.map((properties, index) => ({ ...properties,
      ...(appearances[index] === null ? {} : sampleAnimationAppearance(appearances[index], progress)),
      ...timelineStyle?.(entries[index].identity.key),
      x: interpolateNumber(source[0].properties[index].x, properties.x, progress),
      y: interpolateNumber(source[0].properties[index].y, properties.y, progress) })) }], origins: [{ side: "to", index: 0 }] };
  }
  const values = new Map();
  for (const [side, expressions, multiplier] of [["from", source, 1 - progress], ["to", target, progress]]) {
    expressions.forEach((expression, index) => {
      const weight = expression.weight * multiplier;
      if (weight === 0) return;
      const value = { ...expression, weight, properties: expression.properties.map((properties, index) => properties === null ? null : ({ ...properties,
        ...timelineStyle?.(entries[index].identity.key) })) };
      const key = geoTextExpressionKey(value), previous = values.get(key);
      values.set(key, { expression: { ...value, weight: weight + (previous?.expression.weight ?? 0) }, origin: { side, index } });
    });
  }
  // Round-off from repeated rebases is normalized once in the canonical state.
  const total = [...values.values()].reduce((sum, value) => sum + value.expression.weight, 0);
  return { expressions: [...values.values()].map(value => ({ ...value.expression, weight: value.expression.weight / total })),
    origins: [...values.values()].map(value => value.origin) };
}
