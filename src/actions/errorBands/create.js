import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  validateKeys,
  validateNonEmptyString,
} from "../../core/validation.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { validateCurveInterpolation } from "../../grammar/curveCommands.js";
import { createResolvedIntervalData } from "../data/intervalEdit.js";
import { resolveIntervalComposite } from "../intervals/resolve.js";
import { errorBandBoundaries, resolveBoundaryAppearance } from "./edit.js";

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

export const ERROR_BAND_POLICY = Object.freeze({
  operation: "createErrorBand",
  resourceLabel: "error-band",
  defaultId: "errorBand",
  ownerLabel: "Error-band id",
  positionTypes: Object.freeze(["quantitative", "temporal"]),
  defaultPositionType: "quantitative",
  defaultIntervalChannel: "y",
  scaleDefaults: fieldType => fieldType === "temporal"
    ? { nice: true }
    : { nice: true, zero: false },
  intervalScaleDefaults: Object.freeze({ nice: true, zero: false }),
  allowExplicitGrouping: true,
  ambiguousMessage:
    "createErrorBand cannot infer the interval axis when both positions are quantitative; provide an interval option."
});

export function resolveErrorBand(program, args, policy = ERROR_BAND_POLICY) {
  const resolved = resolveIntervalComposite(program, args, policy);
  if (resolved.groupField === resolved.position.field) {
    throw new Error(
      "createErrorBand groupBy must differ from the independent position field."
    );
  }
  return {
    ...resolved,
    lowerBoundaryId: `${resolved.id}LowerBoundary`,
    upperBoundaryId: `${resolved.id}UpperBoundary`
  };
}

function resolveBoundaries(value, areaCurve) {
  if (value === undefined || value === false) return undefined;
  if (!isPlainObject(value)) {
    throw new TypeError("createErrorBand boundaries must be false or a plain object.");
  }
  return resolveBoundaryAppearance(value, {
    defaults: {
      stroke: DEFAULT_COLORS.mark,
      strokeWidth: 1,
      strokeDash: "solid",
      opacity: 1,
      curve: areaCurve
    },
    operation: "createErrorBand boundaries"
  });
}

function positionOptions({ target, field, fieldType, coordinate, scale, temporalUnit }) {
  return { target, field, fieldType, coordinate, scale: { id: scale },
    ...(temporalUnit === undefined ? {} : { temporalUnit }) };
}

export const createErrorBandBoundary = action(
  {
    op: "createErrorBandBoundary",
    description: "Create one lower or upper error-band boundary line."
  },
  function ({
    id,
    data,
    orientation,
    bound,
    position,
    coordinate,
    intervalScale,
    positionScale,
    groupBy,
    stroke,
    strokeWidth,
    strokeDash,
    opacity,
    curve
  } = {}) {
    const vertical = orientation === "vertical";
    let next = this
      .createLineMark({ id, data, strokeWidth, curve })
      .encodeY(positionOptions({
        target: id,
        field: vertical ? bound : position.field,
        fieldType: vertical ? "quantitative" : position.fieldType,
        temporalUnit: vertical ? undefined : position.temporalUnit,
        coordinate,
        scale: vertical ? intervalScale : positionScale
      }))
      .encodeX(positionOptions({
        target: id,
        field: vertical ? position.field : bound,
        fieldType: vertical ? position.fieldType : "quantitative",
        temporalUnit: vertical ? position.temporalUnit : undefined,
        coordinate,
        scale: vertical ? positionScale : intervalScale
      }));
    if (groupBy !== undefined) {
      next = next.encodeGroup({ target: id, field: groupBy });
    }
    return next
      .editGraphics({ target: id, property: "stroke", value: stroke })
      .editGraphics({
        target: id,
        property: "strokeDash",
        value: next.graphicSpec.objects[id].items.map(() => strokeDash)
      })
      .editGraphics({ target: id, property: "opacity", value: opacity });
  }
);

function positionArgs(resolved) {
  return {
    target: resolved.id,
    field: resolved.position.field,
    fieldType: resolved.position.fieldType,
    ...(resolved.position.temporalUnit === undefined ? {} : { temporalUnit: resolved.position.temporalUnit }),
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
    if (args.fill !== undefined) validateNonEmptyString(args.fill, "Error-band fill");
    let next = createResolvedIntervalData(this, resolved);
    next = next.createAreaMark({
      id: resolved.id,
      data: resolved.dataId,
      ...(args.fill === undefined ? {} : { fill: args.fill }),
      ...(args.opacity === undefined ? {} : { opacity: args.opacity }),
      ...(Object.hasOwn(args, "curve") ? { curve } : {})
    });
    const vertical = resolved.orientation === "vertical";
    next = next[vertical ? "encodeX" : "encodeY"](positionArgs(resolved));
    next = next[vertical ? "encodeYRange" : "encodeXRange"](
      rangeArgs(resolved)
    );

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
      for (const [id, field] of errorBandBoundaries(resolved)) {
        next = next.createErrorBandBoundary({
          ...shared,
          id,
          bound: field
        });
      }
      for (const [id, , bound] of errorBandBoundaries(resolved)) {
        next = next._withMarkConfig(id, {
          ...next.markConfigs[id],
          ...boundaries,
          errorBandBoundary: { owner: resolved.id, bound }
        });
      }
    }
    return next._withMarkConfig(resolved.id, {
      ...next.markConfigs[resolved.id],
      errorBand: {
        ...(args.fill === undefined ? {} : { fill: args.fill }),
        source: resolved.source,
        intervalMode: resolved.interval.mode,
        ...(resolved.interval.mode === "statistical"
          ? { intervalField: resolved.interval.field }
          : { centerField: resolved.fields.center }),
        transformGroupBy: resolved.groupBy,
        data: resolved.dataId,
        orientation: resolved.orientation,
        position: resolved.position,
        coordinate: resolved.coordinate,
        intervalScale: resolved.interval.scale.id ?? resolved.interval.channel,
        positionScale: resolved.position.scale.id ?? resolved.position.channel,
        groupBy: resolved.groupField,
        lowerField: resolved.fields.lower,
        upperField: resolved.fields.upper,
        lowerBoundaryId: resolved.lowerBoundaryId,
        upperBoundaryId: resolved.upperBoundaryId
      }
    });
  }
);
