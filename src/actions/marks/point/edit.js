import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../../core/validation.js";
import { validatePointShape } from "../../../grammar/pointShapes.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../../grammar/strokeStyle.js";
import { resolveEligibleLayer } from "../../../selectors/layers.js";
import { rematerializeExistingLegend } from "../../encodings/shared.js";
import { validateMarkOptions } from "../shared.js";
import { validateItemMissing } from "../../../grammar/itemMissing.js";

const OPTIONS = Object.freeze([
  "target", "missing", "shape", "fill", "opacity", "stroke", "strokeWidth",
  ...STROKE_STYLE_PROPERTIES
]);

export const editPointMark = /* @__PURE__ */ action(
  {
    op: "editPointMark",
    description: "Edit constant point-mark appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, OPTIONS, "editPointMark");
    const strokeDetails = requestedStrokeDetails(args, "editPointMark");
    const editable = [
      "missing", "shape", "fill", "opacity", "stroke", "strokeWidth",
      ...STROKE_STYLE_PROPERTIES
    ];
    if (!editable.some(property => Object.hasOwn(args, property))) {
      throw new Error(
        "editPointMark requires shape, fill, opacity, stroke, strokeWidth, or missing."
      );
    }
    if (args.target !== undefined) validateUserId(args.target, "Point mark id");
    const layer = resolveEligibleLayer(this, {
      target: args.target,
      predicate: candidate => candidate.mark?.type === "point",
      label: "point mark"
    });
    const id = layer.id;
    if (Object.hasOwn(args, "shape") && layer.encoding?.shape !== undefined) {
      throw new Error(
        "editPointMark shape cannot be combined with a shape encoding."
      );
    }
    if (Object.hasOwn(args, "fill") && layer.encoding?.color !== undefined) {
      throw new Error(
        "editPointMark fill cannot be combined with a color encoding."
      );
    }
    if (Object.hasOwn(args, "stroke") && layer.encoding?.stroke !== undefined) {
      throw new Error(
        "editPointMark stroke conflicts with a field encoding; use encodeStroke with value to replace it."
      );
    }
    if (Object.hasOwn(args, "opacity") && layer.encoding?.opacity?.field !== undefined) {
      throw new Error("editPointMark opacity conflicts with a field encoding; use encodeOpacity with value to replace it.");
    }
    const semantic = Object.hasOwn(args, "missing")
      ? this.editSemantic({
          property: `layer[${id}].mark.missing`,
          value: validateItemMissing(args.missing, "Point missing")
        })
      : this;
    const config = { ...semantic.markConfigs[id] };
    Object.assign(config, strokeDetails);
    if (Object.hasOwn(args, "shape")) {
      config.shape = validatePointShape(args.shape);
    }
    if (Object.hasOwn(args, "fill")) {
      config.fill = validateNonEmptyString(args.fill, "Point fill");
    }
    if (Object.hasOwn(args, "opacity")) {
      config.opacity = validateUnitInterval(args.opacity, "Point opacity");
    }
    if (args.stroke === false && Object.hasOwn(args, "strokeWidth")) {
      throw new Error(
        "editPointMark cannot set strokeWidth while removing stroke."
      );
    }
    if (Object.hasOwn(args, "stroke")) {
      if (args.stroke === false) {
        config.stroke = false;
        delete config.strokeWidth;
      } else {
        const restoresStroke = config.stroke === false;
        config.stroke = validateNonEmptyString(args.stroke, "Point stroke");
        if (restoresStroke) config.strokeWidth = 1;
        else config.strokeWidth ??= 1;
      }
    }
    if (Object.hasOwn(args, "strokeWidth")) {
      if (typeof config.stroke !== "string" && layer.encoding?.stroke?.field === undefined) {
        throw new Error("Point strokeWidth requires an active stroke.");
      }
      config.strokeWidth = validateNonNegativeFinite(
        args.strokeWidth,
        "Point strokeWidth"
      );
    }
    const next = semantic
      ._withMarkConfig(id, config)
      .rematerializePointMark({ id });
    return rematerializeExistingLegend(next);
  }
);
