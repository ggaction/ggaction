import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../core/validation.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { validateCurveInterpolation } from "../../grammar/curveCommands.js";
import { normalizeStrokeDashPattern } from "../../grammar/scales.js";
import { resolveErrorBand } from "./resolve.js";

const OPTIONS = Object.freeze([
  "id",
  "target",
  "data",
  "x",
  "y",
  "groupBy",
  "coordinate",
  "fill",
  "opacity",
  "curve",
  "boundaries"
]);
const BOUNDARY_OPTIONS = Object.freeze([
  "stroke", "strokeWidth", "strokeDash", "opacity", "curve"
]);

function resolveBoundaries(value, areaCurve) {
  if (value === undefined || value === false) return undefined;
  if (!isPlainObject(value)) {
    throw new TypeError("createErrorBand boundaries must be false or a plain object.");
  }
  validateKeys(value, BOUNDARY_OPTIONS, "createErrorBand boundaries");
  const stroke = value.stroke ?? DEFAULT_COLORS.mark;
  const strokeWidth = value.strokeWidth ?? 1;
  const strokeDash = value.strokeDash ?? "solid";
  const opacity = value.opacity ?? 1;
  const curve = validateCurveInterpolation(value.curve ?? areaCurve);
  validateNonEmptyString(stroke, "Error-band boundary stroke");
  validateNonNegativeFinite(
    strokeWidth,
    "Error-band boundary strokeWidth"
  );
  const resolvedStrokeDash = normalizeStrokeDashPattern(strokeDash);
  validateUnitInterval(opacity, "Error-band boundary opacity");
  return {
    stroke,
    strokeWidth,
    strokeDash: resolvedStrokeDash,
    opacity,
    curve
  };
}

function positionArgs(resolved) {
  return {
    target: resolved.id,
    field: resolved.position.field,
    fieldType: resolved.position.fieldType,
    coordinate: resolved.coordinate,
    scale: resolved.position.scale
  };
}

function rangeArgs(resolved) {
  return {
    target: resolved.id,
    lower: resolved.fields.lower,
    upper: resolved.fields.upper,
    fieldType: "quantitative",
    coordinate: resolved.coordinate,
    scale: resolved.interval.scale
  };
}

export const createErrorBand = action(
  {
    op: "createErrorBand",
    description: "Create a statistical or explicit interval band."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createErrorBand");
    const resolved = resolveErrorBand(this, args);
    const curve = validateCurveInterpolation(args.curve ?? "linear");
    const boundaries = resolveBoundaries(args.boundaries, curve);
    let next = this;

    if (resolved.interval.mode === "statistical") {
      next = next.createIntervalData({
        id: resolved.dataId,
        source: resolved.source,
        field: resolved.interval.field,
        groupBy: resolved.groupBy,
        center: resolved.interval.center,
        extent: resolved.interval.extent,
        level: resolved.interval.level,
        as: resolved.fields
      });
    }

    next = next.createAreaMark({
      id: resolved.id,
      data: resolved.dataId,
      ...(args.fill === undefined ? {} : { fill: args.fill }),
      ...(args.opacity === undefined ? {} : { opacity: args.opacity }),
      ...(Object.hasOwn(args, "curve") ? { curve } : {})
    });
    next = resolved.orientation === "vertical"
      ? next
          .encodeX(positionArgs(resolved))
          .encodeYRange(rangeArgs(resolved))
      : next
          .encodeY(positionArgs(resolved))
          .encodeXRange(rangeArgs(resolved));

    if (resolved.interval.mode === "explicit") {
      next = next.editSemantic({
        property: `layer[${resolved.id}].encoding.${resolved.interval.channel}.title`,
        value: resolved.interval.title
      });
    }
    if (resolved.groupField !== undefined) {
      next = next.encodeGroup({
        target: resolved.id,
        field: resolved.groupField,
        fieldType: "nominal"
      });
    }
    if (boundaries !== undefined) {
      const shared = {
        data: resolved.dataId,
        orientation: resolved.orientation,
        position: resolved.position,
        coordinate: resolved.coordinate,
        intervalScale:
          resolved.interval.scale.id ?? resolved.interval.channel,
        positionScale:
          resolved.position.scale.id ?? resolved.position.channel,
        groupBy: resolved.groupField,
        ...boundaries
      };
      next = next
        .createErrorBandBoundary({
          ...shared,
          id: `${resolved.id}LowerBoundary`,
          bound: resolved.fields.lower
        })
        .createErrorBandBoundary({
          ...shared,
          id: `${resolved.id}UpperBoundary`,
          bound: resolved.fields.upper
        });
    }
    return next;
  }
);
