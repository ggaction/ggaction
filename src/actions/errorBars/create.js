import { action } from "../../core/action.js";
import {
  validateKeys,
  validateOptionObject
} from "../../core/validation.js";
import { findLayer } from "../../selectors/layers.js";
import { findDataset } from "../../selectors/datasets.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import {
  readNominalField,
  validateCategoricalFieldType
} from "../../grammar/scales/index.js";
import { normalizeOffsetPadding } from "../../grammar/bars/geometry.js";
import { createResolvedIntervalData, ownOptions } from
  "../data/intervalEdit.js";
import { resolveIntervalComposite } from "../intervals/resolve.js";
import { errorBarCaps, resolveErrorBarAppearance } from "./edit.js";

const OPTIONS = Object.freeze([
  "id",
  "target",
  "data",
  "x",
  "y",
  "xOffset",
  "yOffset",
  "groupBy",
  "coordinate",
  "caps",
  "capSize",
  "stroke",
  "strokeWidth",
  "strokeDash",
  "opacity"
]);

const OFFSET_OPTIONS = Object.freeze([
  "field", "fieldType", "scale", "paddingInner", "paddingOuter"
]);

export const ERROR_BAR_POLICY = Object.freeze({
  operation: "createErrorBar",
  resourceLabel: "error-bar",
  defaultId: "errorBar",
  ownerLabel: "Error-bar id",
  positionTypes: Object.freeze([
    "quantitative", "nominal", "ordinal", "temporal"
  ]),
  defaultPositionType: "nominal",
  defaultIntervalChannel: "y",
  scaleDefaults: () => ({}),
  intervalScaleDefaults: Object.freeze({ nice: true, zero: false }),
  allowExplicitGrouping: false,
  ambiguousMessage:
    "createErrorBar requires one quantitative interval axis and one compatible position axis; use interval options to disambiguate two quantitative channels."
});

export function resolveErrorBar(program, args, policy = ERROR_BAR_POLICY) {
  const resolved = resolveIntervalComposite(program, args, policy);
  const offset = resolveErrorBarOffset(program, args, resolved, policy.operation);
  const groupBy = resolved.interval.mode === "statistical" && offset !== undefined
    ? [...new Set([...resolved.groupBy, offset.field])]
    : resolved.groupBy;
  return {
    ...resolved,
    groupBy,
    offset,
    lowerCapId: `${resolved.id}LowerCap`,
    upperCapId: `${resolved.id}UpperCap`
  };
}

function resolveErrorBarOffset(program, args, resolved, operation) {
  const channel = `${resolved.position.channel}Offset`;
  const incompatible = channel === "xOffset" ? "yOffset" : "xOffset";
  if (args[incompatible] !== undefined) {
    throw new Error(
      `${operation} ${incompatible} does not match the ${resolved.orientation} interval orientation.`
    );
  }
  const explicit = args[channel] === undefined
    ? undefined
    : validateOptionObject(args[channel], OFFSET_OPTIONS, `${operation} ${channel}`);
  const inferred = resolved.sourceLayer?.encoding?.[channel];
  if (explicit === undefined && inferred === undefined) return undefined;
  if (!["nominal", "ordinal"].includes(resolved.position.fieldType)) {
    throw new Error(
      `${operation} ${channel} requires a categorical ${resolved.position.channel} position.`
    );
  }
  const field = explicit?.field ?? inferred?.field;
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`${operation} ${channel} field must be a non-empty string.`);
  }
  const fieldType = validateCategoricalFieldType(
    explicit?.fieldType ?? inferred?.fieldType ?? "nominal"
  );
  const dataset = findDataset(program, resolved.source);
  readNominalField(dataset.values, field);
  const padding = normalizeOffsetPadding(
    explicit ?? {},
    resolved.sourceLayer === undefined
      ? undefined
      : program.markConfigs[resolved.sourceLayer.id]?.[channel],
    channel
  );
  return {
    channel,
    field,
    fieldType,
    scale: {
      ...(inferred?.scale === undefined ? {} : { id: inferred.scale }),
      ...(explicit?.scale ?? {})
    },
    ...padding
  };
}

function resolveAppearance(args) {
  return resolveErrorBarAppearance(ownOptions(args, [
    "caps", "capSize", "stroke", "strokeWidth", "strokeDash", "opacity"
  ]), {
    defaults: {
      caps: true,
      capSize: 8,
      stroke: DEFAULT_COLORS.mark,
      strokeWidth: 1.5,
      strokeDash: "solid",
      opacity: 1
    },
    operation: "createErrorBar"
  });
}

export const createErrorBarCap = action(
  {
    op: "createErrorBarCap",
    description: "Create one fixed-pixel error-bar cap."
  },
  function (args = {}) {
    validateKeys(args, [
      "id", "data", "orientation", "positionField", "positionFieldType",
      "intervalField", "coordinate", "positionScale", "intervalScale", "positionTemporalUnit",
      "offsetChannel", "offsetField", "offsetFieldType", "offsetScale",
      "offsetPaddingInner", "offsetPaddingOuter",
      "capSize", "stroke", "strokeWidth", "strokeDash", "opacity"
    ], "createErrorBarCap");
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported error-bar orientation "${args.orientation}".`);
    }
    const vertical = args.orientation === "vertical";
    const expectedOffset = vertical ? "xOffset" : "yOffset";
    if (
      args.offsetChannel !== undefined &&
      args.offsetChannel !== expectedOffset
    ) {
      throw new Error(
        `createErrorBarCap requires ${expectedOffset} for ${args.orientation} intervals.`
      );
    }
    const positionAction = vertical ? "encodeX" : "encodeY";
    const intervalAction = vertical ? "encodeY" : "encodeX";
    let next = this
      .createRuleMark({ id: args.id, data: args.data })
      [positionAction]({
        target: args.id,
        field: args.positionField,
        fieldType: args.positionFieldType,
        ...(args.positionTemporalUnit === undefined ? {} : { temporalUnit: args.positionTemporalUnit }),
        coordinate: args.coordinate,
        scale: { id: args.positionScale }
      })
      [intervalAction]({
        target: args.id,
        field: args.intervalField,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.intervalScale }
      });
    if (args.offsetChannel !== undefined) {
      const offsetAction = args.offsetChannel === "xOffset"
        ? "encodeXOffset"
        : "encodeYOffset";
      next = next[offsetAction]({
        target: args.id,
        field: args.offsetField,
        fieldType: args.offsetFieldType,
        scale: { id: args.offsetScale },
        paddingInner: args.offsetPaddingInner,
        paddingOuter: args.offsetPaddingOuter
      });
    }
    return next
      .encodeStroke({ target: args.id, value: args.stroke })
      .encodeStrokeWidth({ target: args.id, value: args.strokeWidth })
      .encodeStrokeDash({ target: args.id, value: args.strokeDash })
      .encodeOpacity({ target: args.id, value: args.opacity })
      .materializeRuleSpan({
        id: args.id,
        orientation: vertical ? "horizontal" : "vertical",
        size: args.capSize
      });
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

function offsetArgs(resolved) {
  return resolved.offset === undefined
    ? undefined
    : {
        target: resolved.id,
        field: resolved.offset.field,
        fieldType: resolved.offset.fieldType,
        scale: resolved.offset.scale,
        paddingInner: resolved.offset.paddingInner,
        paddingOuter: resolved.offset.paddingOuter
      };
}

function intervalArgs(resolved, field) {
  return {
    target: resolved.id,
    field,
    fieldType: "quantitative",
    coordinate: resolved.coordinate,
    scale: resolved.interval.scale
  };
}

export const createErrorBar = action(
  {
    op: "createErrorBar",
    description: "Create a statistical or explicit vertical or horizontal interval."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createErrorBar");
    const resolved = resolveErrorBar(this, args);
    const appearance = resolveAppearance(args);
    let next = createResolvedIntervalData(this, resolved);
    next = next.createRuleMark({ id: resolved.id, data: resolved.dataId });
    const positionAction = resolved.position.channel === "x" ? "encodeX" : "encodeY";
    const intervalAction = resolved.interval.channel === "x" ? "encodeX" : "encodeY";
    const secondaryAction = resolved.interval.channel === "x" ? "encodeX2" : "encodeY2";
    next = next[positionAction](positionArgs(resolved));
    next = next[intervalAction](intervalArgs(resolved, resolved.fields.lower));
    if (resolved.interval.mode === "explicit") {
      next = next.editSemantic({
        property: `layer[${resolved.id}].encoding.${resolved.interval.channel}.title`,
        value: resolved.interval.title
      });
    }
    next = next[secondaryAction]({
      target: resolved.id,
      field: resolved.fields.upper,
      fieldType: "quantitative"
    });
    if (resolved.offset !== undefined) {
      const offsetAction = resolved.offset.channel === "xOffset"
        ? "encodeXOffset"
        : "encodeYOffset";
      next = next[offsetAction](offsetArgs(resolved));
    }
    next = next.encodeStroke({ target: resolved.id, value: appearance.stroke })
      .encodeStrokeWidth({ target: resolved.id, value: appearance.strokeWidth })
      .encodeStrokeDash({ target: resolved.id, value: appearance.strokeDash })
      .encodeOpacity({ target: resolved.id, value: appearance.opacity });

    const intervalLayer = findLayer(next, resolved.id);
    if (appearance.caps) {
      for (const [id, field] of errorBarCaps(resolved)) {
        next = next.createErrorBarCap({
          id,
          data: resolved.dataId,
          orientation: resolved.orientation,
          positionField: resolved.position.field,
          positionFieldType: resolved.position.fieldType,
        ...(resolved.position.temporalUnit === undefined ? {} : { positionTemporalUnit: resolved.position.temporalUnit }),
          intervalField: field,
          coordinate: resolved.coordinate,
          positionScale: intervalLayer.encoding[resolved.position.channel].scale,
          intervalScale: intervalLayer.encoding[resolved.interval.channel].scale,
          ...(resolved.offset === undefined
            ? {}
            : {
                offsetChannel: resolved.offset.channel,
                offsetField: resolved.offset.field,
                offsetFieldType: resolved.offset.fieldType,
                offsetScale: intervalLayer.encoding[resolved.offset.channel].scale,
                offsetPaddingInner: resolved.offset.paddingInner,
                offsetPaddingOuter: resolved.offset.paddingOuter
              }),
          capSize: appearance.capSize,
          stroke: appearance.stroke,
          strokeWidth: appearance.strokeWidth,
          strokeDash: appearance.strokeDash,
          opacity: appearance.opacity
        });
      }
    }
    return next._withMarkConfig(resolved.id, {
      ...next.markConfigs[resolved.id],
      errorBar: {
        source: resolved.source,
        intervalMode: resolved.interval.mode,
        ...(resolved.interval.mode === "statistical"
          ? { intervalField: resolved.interval.field }
          : { centerField: resolved.fields.center }),
        groupField: resolved.groupField,
        groupBy: resolved.groupBy,
        data: resolved.dataId,
        orientation: resolved.orientation,
        positionField: resolved.position.field,
        positionFieldType: resolved.position.fieldType,
        ...(resolved.position.temporalUnit === undefined ? {} : { positionTemporalUnit: resolved.position.temporalUnit }),
        lowerField: resolved.fields.lower,
        upperField: resolved.fields.upper,
        coordinate: resolved.coordinate,
        positionScale: intervalLayer.encoding[resolved.position.channel].scale,
        intervalScale: intervalLayer.encoding[resolved.interval.channel].scale,
        ...(resolved.offset === undefined
          ? {}
          : {
              offset: {
                ...resolved.offset,
                scale: intervalLayer.encoding[resolved.offset.channel].scale
              }
            }),
        lowerCapId: resolved.lowerCapId,
        upperCapId: resolved.upperCapId,
        ...appearance
      }
    });
  }
);
