import { freezeOwned } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";

export const MAX_HIT_TRANSFORMS = 1024;

function record(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw new TypeError(`${label} requires exactly ${keys.join(", ")}.`);
  }
  return value;
}

function point(value, label) {
  record(value, ["x", "y"], label);
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new TypeError(`${label} requires finite coordinates.`);
  }
  return value;
}

function matrix(value) {
  if (!Array.isArray(value) || value.length !== 6) {
    throw new TypeError("Hit transform requires six finite numbers.");
  }
  ownArray(value, "Hit transform");
  if (!value.every(Number.isFinite)) throw new TypeError("Hit transform requires six finite numbers.");
  return value;
}

const frozenPoint = (x, y) => freezeOwned({ x: x === 0 ? 0 : x, y: y === 0 ? 0 : y });

/** Pure forward map for an explicit local-to-parent affine matrix. */
export function transformHitPoint(transform, input) {
  matrix(transform); point(input, "Hit point");
  const [a, b, c, d, e, f] = transform;
  const x = a * input.x + c * input.y + e;
  const y = b * input.x + d * input.y + f;
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError("Hit coordinates overflow.");
  return frozenPoint(x, y);
}

function result(screenPoint, localPoint, code, transformIndex) {
  const diagnostics = code === undefined ? [] : [freezeOwned({ code, transformIndex })];
  return freezeOwned({ screenPoint, localPoint, diagnostics: freezeOwned(diagnostics) });
}

// Row scaling avoids determinant overflow/underflow, including very unequal axes.
function inverse(transform, input) {
  const [a, b, c, d, e, f] = transform;
  const rowX = Math.max(Math.abs(a), Math.abs(c)), rowY = Math.max(Math.abs(b), Math.abs(d));
  if (rowX === 0 || rowY === 0) return { code: "hit-transform-singular" };
  const aa = a / rowX, cc = c / rowX, bb = b / rowY, dd = d / rowY;
  const determinant = aa * dd - bb * cc;
  if (determinant === 0) return { code: "hit-transform-singular" };
  const dx = input.x - e, dy = input.y - f;
  const x = Number.isFinite(dx) ? dx / rowX : input.x / rowX - e / rowX;
  const y = Number.isFinite(dy) ? dy / rowY : input.y / rowY - f / rowY;
  const localX = (dd * x - cc * y) / determinant;
  const localY = (aa * y - bb * x) / determinant;
  if (!Number.isFinite(localX) || !Number.isFinite(localY)) return { code: "hit-coordinate-overflow" };
  return { point: frozenPoint(localX, localY) };
}

/** Client pixels to CSS-local then root/child-local coordinates; no DPR inference. */
export function resolveHitCoordinates(options) {
  record(options, ["point", "rect", "rootTransform", "childTransforms"], "Hit coordinates");
  const input = point(options.point, "Client point");
  const rect = record(options.rect, ["left", "top", "width", "height"], "Client rectangle");
  if (![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) ||
      rect.width < 0 || rect.height < 0 || !Number.isFinite(rect.left + rect.width) ||
      !Number.isFinite(rect.top + rect.height)) {
    throw new RangeError("Client rectangle requires finite bounds and non-negative dimensions.");
  }
  matrix(options.rootTransform);
  const children = options.childTransforms;
  if (!Array.isArray(children) || children.length > MAX_HIT_TRANSFORMS) {
    throw new RangeError(`Child transforms must be an array of at most ${MAX_HIT_TRANSFORMS} matrices.`);
  }
  ownArray(children, "Child transforms");
  children.forEach(matrix);
  const x = input.x - rect.left, y = input.y - rect.top;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return result(null, null, "hit-coordinate-overflow", -1);
  const screenPoint = frozenPoint(x, y);
  if (rect.width === 0 || rect.height === 0) return result(screenPoint, null, "hit-empty-viewport", -1);
  let current = screenPoint;
  for (let index = 0; index <= children.length; index++) {
    const mapped = inverse(index === 0 ? options.rootTransform : children[index - 1], current);
    if (mapped.code !== undefined) return result(screenPoint, null, mapped.code, index);
    current = mapped.point;
  }
  return result(screenPoint, current);
}
