import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import {
  normalizeStrokeDashPattern,
  validateOpacityValue
} from "../../grammar/scales.js";
import {
  validateRuleStroke,
  validateRuleStrokeWidth
} from "../../grammar/ruleAppearance.js";
import { findLayer } from "../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { resolveErrorBar } from "./resolve.js";

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

function resolveAppearance(args) {
  const caps = args.caps ?? true;
  if (typeof caps !== "boolean") {
    throw new TypeError("createErrorBar caps must be a boolean.");
  }
  const capSize = args.capSize ?? 8;
  if (!Number.isFinite(capSize) || capSize <= 0) {
    throw new RangeError("createErrorBar capSize must be a positive finite number.");
  }
  const stroke = validateRuleStroke(
    args.stroke ?? DEFAULT_COLORS.mark,
    "createErrorBar stroke"
  );
  const strokeWidth = validateRuleStrokeWidth(
    args.strokeWidth ?? 1.5,
    "createErrorBar strokeWidth"
  );
  const strokeDash = args.strokeDash ?? "solid";
  normalizeStrokeDashPattern(strokeDash);
  const opacity = validateOpacityValue(args.opacity ?? 1, "createErrorBar opacity");
  return { caps, capSize, stroke, strokeWidth, strokeDash, opacity };
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

    if (!appearance.caps) return next;

    const intervalLayer = findLayer(next, resolved.id);
    for (const [id, field] of [
      [resolved.lowerCapId, resolved.fields.lower],
      [resolved.upperCapId, resolved.fields.upper]
    ]) {
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
    return next;
  }
);
