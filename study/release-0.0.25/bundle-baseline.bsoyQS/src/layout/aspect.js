import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const ALIGN_FRACTIONS = Object.freeze({ start: 0, center: 0.5, end: 1 });
const ASPECT_MODES = new Set(["frame", "data"]);

function validateAspect(value) {
  if (!isPlainObject(value) || !ASPECT_MODES.has(value.mode)) {
    throw new TypeError("Coordinate aspect resolver requires frame or data mode.");
  }
  if (!Number.isFinite(value.ratio) || value.ratio <= 0) {
    throw new RangeError("Coordinate aspect ratio must be a positive finite number.");
  }
  const alignX = value.alignX ?? "center";
  const alignY = value.alignY ?? "center";
  if (!(alignX in ALIGN_FRACTIONS) || !(alignY in ALIGN_FRACTIONS)) {
    throw new Error("Coordinate aspect alignment must be start, center, or end.");
  }
  return { mode: value.mode, ratio: value.ratio, alignX, alignY };
}

function validateBounds(bounds) {
  if (
    !isPlainObject(bounds) ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    bounds.width < 0 ||
    bounds.height < 0
  ) {
    throw new TypeError(
      "Coordinate aspect requires finite, non-negative allocated bounds."
    );
  }
  return bounds;
}

function domainSpan(domain, channel) {
  if (
    !Array.isArray(domain) ||
    domain.length !== 2 ||
    !domain.every(Number.isFinite)
  ) {
    throw new TypeError(
      `Coordinate data aspect requires a finite two-value ${channel} domain.`
    );
  }
  const span = Math.abs(domain[1] - domain[0]);
  if (!Number.isFinite(span) || span <= 0) {
    throw new RangeError(
      `Coordinate data aspect requires a positive ${channel} domain span.`
    );
  }
  return span;
}

export function resolveEffectiveBounds(allocatedBounds, requestedAspect, domains) {
  const allocated = validateBounds(allocatedBounds);
  if (requestedAspect === undefined || requestedAspect === "auto") {
    return cloneAndFreeze(allocated);
  }
  const aspect = validateAspect(requestedAspect);
  const ratio = aspect.mode === "frame"
    ? aspect.ratio
    : aspect.ratio * domainSpan(domains?.x, "x") /
      domainSpan(domains?.y, "y");
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError(
      "Coordinate aspect must resolve to a positive finite frame ratio."
    );
  }
  const width = Math.min(allocated.width, allocated.height * ratio);
  const height = width / ratio;
  if (![width, height].every(Number.isFinite)) {
    throw new RangeError("Coordinate aspect bounds exceed the finite numeric range.");
  }
  return cloneAndFreeze({
    x: allocated.x + (allocated.width - width) * ALIGN_FRACTIONS[aspect.alignX],
    y: allocated.y + (allocated.height - height) * ALIGN_FRACTIONS[aspect.alignY],
    width,
    height
  });
}
