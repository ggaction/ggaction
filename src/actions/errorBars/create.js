import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { findLayer } from "../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
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
  "groupBy",
  "coordinate",
  "caps",
  "capSize",
  "stroke",
  "strokeWidth",
  "strokeDash",
  "opacity"
]);

const ERROR_BAR_POLICY = Object.freeze({
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

function resolveErrorBar(program, args) {
  const resolved = resolveIntervalComposite(program, args, ERROR_BAR_POLICY);
  return {
    ...resolved,
    lowerCapId: `${resolved.id}LowerCap`,
    upperCapId: `${resolved.id}UpperCap`
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
      "intervalField", "coordinate", "positionScale", "intervalScale",
      "capSize", "stroke", "strokeWidth", "strokeDash", "opacity"
    ], "createErrorBarCap");
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported error-bar orientation "${args.orientation}".`);
    }
    const vertical = args.orientation === "vertical";
    const positionAction = vertical ? "encodeX" : "encodeY";
    const intervalAction = vertical ? "encodeY" : "encodeX";
    return this
      .createRuleMark({ id: args.id, data: args.data })
      [positionAction]({
        target: args.id,
        field: args.positionField,
        fieldType: args.positionFieldType,
        coordinate: args.coordinate,
        scale: { id: args.positionScale }
      })
      [intervalAction]({
        target: args.id,
        field: args.intervalField,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.intervalScale }
      })
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
    coordinate: resolved.coordinate,
    scale: resolved.position.scale
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
    })
      .encodeStroke({ target: resolved.id, value: appearance.stroke })
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
          intervalField: field,
          coordinate: resolved.coordinate,
          positionScale: intervalLayer.encoding[resolved.position.channel].scale,
          intervalScale: intervalLayer.encoding[resolved.interval.channel].scale,
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
        data: resolved.dataId,
        orientation: resolved.orientation,
        positionField: resolved.position.field,
        positionFieldType: resolved.position.fieldType,
        lowerField: resolved.fields.lower,
        upperField: resolved.fields.upper,
        coordinate: resolved.coordinate,
        positionScale: intervalLayer.encoding[resolved.position.channel].scale,
        intervalScale: intervalLayer.encoding[resolved.interval.channel].scale,
        lowerCapId: resolved.lowerCapId,
        upperCapId: resolved.upperCapId,
        ...appearance
      }
    });
  }
);
