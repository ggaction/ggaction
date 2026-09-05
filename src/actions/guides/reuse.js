import { isPlainObject } from "../../core/immutable.js";

export function sameGuideValue(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, i) => sameGuideValue(value, right[i]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key =>
      Object.hasOwn(right, key) && sameGuideValue(left[key], right[key])
    );
  }
  return false;
}

export function guideConflict(label) {
  throw new Error(`Facade guide conflict: ${label}. Use the existing guide editor or disable this facade's guide branch.`);
}

// Only explicit choices constrain existing appearance. Omitted defaults never
// overwrite an earlier author's title, placement, or style.
export function assertGuideOptions(requested, stored, label) {
  for (const [key, value] of Object.entries(requested)) {
    if (Array.isArray(value) && Array.isArray(stored?.[key]) && value.length === stored[key].length) {
      assertGuideOptions(Object.fromEntries(value.entries()), Object.fromEntries(stored[key].entries()), `${label}.${key}`);
    } else if (isPlainObject(value) && isPlainObject(stored?.[key])) {
      assertGuideOptions(value, stored[key], `${label}.${key}`);
    } else if (!sameGuideValue(value, stored?.[key])) {
      guideConflict(`${label}.${key} differs from the existing guide`);
    }
  }
}

export function resolveStoredGuideCoordinate(program, guide, channel) {
  if (guide.coordinate !== undefined) return guide.coordinate;
  const ids = [...new Set(program.semanticSpec.layers.filter(layer =>
    layer.encoding?.[channel]?.scale === guide.scale
  ).map(layer => layer.coordinate).filter(id => id !== undefined))];
  if (ids.length !== 1) {
    guideConflict(`legacy ${channel} guide has no unique compatible coordinate`);
  }
  return ids[0];
}
