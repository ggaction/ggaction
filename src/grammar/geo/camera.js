import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeProjectionOptions, finiteProjectionNumber, projectionTuple } from "./projectionOptions.js";
import { createProjectionKernel } from "./projections.js";
import { fitGeometryProjection } from "./fit.js";

const OPERATIONS = Object.freeze({
  pan: ["deltaPx"], zoom: ["anchorPx", "factor", "scaleExtent"],
  pinch: ["fromPx", "toPx", "scaleExtent"], rotate: ["rotateDeg"],
  reset: ["initial"], resize: ["fromViewport", "toViewport", "scaling"],
  fit: ["geometry", "viewport", "coordinateKind"]
});

function positive(value, label) {
  finiteProjectionNumber(value, label);
  if (value <= 0) throw new RangeError(`${label} must be positive.`);
  return value;
}

function viewport(value) {
  ownRecord(value, "Camera viewport");
  rejectUnknownProperties(value, ["x", "y", "width", "height"], "camera viewport");
  const x = finiteProjectionNumber(value.x, "Camera viewport x"), y = finiteProjectionNumber(value.y, "Camera viewport y");
  const width = positive(value.width, "Camera viewport width"), height = positive(value.height, "Camera viewport height");
  const center = [x + width / 2, y + height / 2];
  center.forEach(number => finiteProjectionNumber(number, "Camera viewport center"));
  return { center, width, height };
}

function translate(options, delta) {
  return normalizeProjectionOptions({ ...options, translatePx: options.translatePx.map((value, index) => value + delta[index]) });
}

function zoom(options, anchorPx, factor, scaleExtent, destination = anchorPx) {
  const anchor = projectionTuple(anchorPx, [2], "Camera zoom anchor");
  positive(factor, "Camera zoom factor");
  const extent = projectionTuple(scaleExtent, [2], "Camera scale extent");
  if (extent[0] <= 0 || extent[1] < extent[0]) throw new RangeError("Camera scale extent must be positive and ordered.");
  const inverse = createProjectionKernel(options).inverse(anchor);
  if (inverse.point === null) throw new RangeError("Camera zoom anchor is outside the visible invertible domain.");
  const requested = positive(options.scalePx * factor, "Camera zoom scale");
  const scalePx = Math.max(extent[0], Math.min(extent[1], requested));
  const ratio = scalePx / options.scalePx;
  const translatePx = anchor.map((value, index) => destination[index] - (value - options.translatePx[index]) * ratio);
  const result = normalizeProjectionOptions({ ...options, scalePx, translatePx });
  const projected = createProjectionKernel(result).forward(inverse.point);
  if (projected.point === null || projected.component !== inverse.component || Math.hypot(...projected.point.map((value, index) => value - destination[index])) > 0.25) {
    throw new RangeError("Camera zoom cannot preserve its visible anchor.");
  }
  return result;
}

function pointers(value) {
  ownArray(value, "Camera pinch pointers");
  if (value.length !== 2) throw new TypeError("Camera pinch requires two pointers.");
  const [a, b] = value.map(point => projectionTuple(point, [2], "Camera pinch point"));
  const distance = positive(Math.hypot(a[0] - b[0], a[1] - b[1]), "Camera pinch distance");
  return { center: a.map((number, index) => number / 2 + b[index] / 2), distance };
}

// Runtime adapters retain the initial snapshot and viewport explicitly. Only the
// returned projection parameters are committed by the existing projection action.
export function applyGeoCamera(input, operation) {
  const options = normalizeProjectionOptions(input);
  ownRecord(operation, "Camera operation");
  const fields = typeof operation.type === "string" && Object.hasOwn(OPERATIONS, operation.type) ? OPERATIONS[operation.type] : undefined;
  if (fields === undefined) throw new TypeError("Unsupported camera operation.");
  rejectUnknownProperties(operation, ["type", ...fields], "camera operation");
  if (fields.some(key => !Object.hasOwn(operation, key) || operation[key] === undefined)) throw new TypeError("Camera operation requires all explicit parameters.");
  if (operation.type === "pan") return translate(options, projectionTuple(operation.deltaPx, [2], "Camera pan delta"));
  if (operation.type === "zoom") return zoom(options, operation.anchorPx, operation.factor, operation.scaleExtent);
  if (operation.type === "pinch") {
    const from = pointers(operation.fromPx), to = pointers(operation.toPx);
    return zoom(options, from.center, to.distance / from.distance, operation.scaleExtent, to.center);
  }
  if (operation.type === "rotate") {
    if (options.rotateDeg === undefined) throw new TypeError("Camera rotation requires a non-composite spherical projection.");
    return normalizeProjectionOptions({ ...options, rotateDeg: operation.rotateDeg });
  }
  if (operation.type === "reset") return normalizeProjectionOptions(operation.initial);
  if (operation.type === "fit") return fitGeometryProjection(operation.geometry, options, operation.viewport, { coordinateKind: operation.coordinateKind }).parameters;
  const from = viewport(operation.fromViewport), to = viewport(operation.toViewport);
  if (!["preserve", "fit"].includes(operation.scaling)) throw new TypeError("Camera resize scaling must be preserve or fit.");
  const ratio = operation.scaling === "preserve" ? 1 : Math.min(to.width / from.width, to.height / from.height);
  return normalizeProjectionOptions({ ...options, scalePx: options.scalePx * ratio,
    translatePx: options.translatePx.map((value, index) => to.center[index] - (from.center[index] - value) * ratio) });
}
