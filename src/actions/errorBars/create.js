import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { findLayer } from "../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { resolveErrorBarAppearance } from "./options.js";
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
  const appearanceArgs = Object.fromEntries(
    ["caps", "capSize", "stroke", "strokeWidth", "strokeDash", "opacity"]
      .filter(key => Object.hasOwn(args, key))
      .map(key => [key, args[key]])
  );
  return resolveErrorBarAppearance(appearanceArgs, {
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

    const intervalLayer = findLayer(next, resolved.id);
    if (appearance.caps) {
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
