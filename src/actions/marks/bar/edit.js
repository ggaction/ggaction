import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../../core/validation.js";
import { canMaterializeBar } from "../../../materialization/marks/index.js";
import { DEFAULT_BAR_STROKE_WIDTH } from "../../../materialization/bars/resolve.js";
import { resolveEligibleLayer } from "../../../selectors/layers.js";
import { validateMarkOptions } from "../shared.js";
import { requestedRectStyleDetails } from
  "../../../grammar/roundedRect.js";
import { STROKE_STYLE_PROPERTIES } from
  "../../../grammar/strokeStyle.js";
import { rematerializeExistingLegend } from "../../encodings/shared.js";

const EDIT_OPTIONS = Object.freeze([
  "target", "fill", "opacity", "stroke", "strokeWidth", "cornerRadius",
  ...STROKE_STYLE_PROPERTIES
]);

export const editBarMark = /* @__PURE__ */ action(
  {
    op: "editBarMark",
    description: "Edit whole-bar fill, opacity, and outline appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editBarMark");
    const styleDetails = requestedRectStyleDetails(args, "editBarMark");
    const changes = [
      "fill", "opacity", "stroke", "strokeWidth", "cornerRadius",
      ...STROKE_STYLE_PROPERTIES
    ];
    if (!changes.some(key => Object.hasOwn(args, key))) {
      throw new Error(
        "editBarMark requires fill, opacity, stroke, or strokeWidth."
      );
    }
    const requested = Object.hasOwn(args, "target")
      ? validateUserId(args.target, "Bar mark id")
      : undefined;
    const layer = resolveEligibleLayer(this, {
      target: requested,
      predicate: candidate => candidate.mark?.type === "bar",
      label: "bar mark"
    });
    if (Object.hasOwn(args, "fill") && layer.encoding?.color !== undefined) {
      throw new Error(
        "editBarMark fill cannot be combined with a color encoding."
      );
    }
    if (Object.hasOwn(args, "stroke") && layer.encoding?.stroke !== undefined) {
      throw new Error(
        "editBarMark stroke conflicts with a field encoding; use encodeStroke with value to replace it."
      );
    }
    if (args.stroke === false && Object.hasOwn(args, "strokeWidth")) {
      throw new Error(
        "editBarMark cannot set strokeWidth while removing stroke."
      );
    }

    const config = { ...this.markConfigs[layer.id] };
    const appearance = { ...config.barAppearance };
    Object.assign(appearance, styleDetails);
    if (Object.hasOwn(args, "fill")) {
      appearance.fill = validateNonEmptyString(args.fill, "Bar fill");
    }
    if (Object.hasOwn(args, "opacity")) {
      appearance.opacity = validateUnitInterval(args.opacity, "Bar opacity");
    }
    if (Object.hasOwn(args, "stroke")) {
      if (args.stroke === false) {
        appearance.stroke = false;
      } else {
        const restoresStroke = appearance.stroke === false;
        appearance.stroke = validateNonEmptyString(args.stroke, "Bar stroke");
        if (Object.hasOwn(args, "strokeWidth")) {
          appearance.strokeWidth = validateNonNegativeFinite(
            args.strokeWidth,
            "Bar strokeWidth"
          );
        } else if (restoresStroke) {
          appearance.strokeWidth = DEFAULT_BAR_STROKE_WIDTH;
        }
      }
    } else if (Object.hasOwn(args, "strokeWidth")) {
      if (appearance.stroke === false) {
        throw new Error("editBarMark strokeWidth requires an active stroke.");
      }
      appearance.strokeWidth = validateNonNegativeFinite(
        args.strokeWidth,
        "Bar strokeWidth"
      );
    }

    const next = this._withMarkConfig(layer.id, {
      ...config,
      barAppearance: appearance
    });
    const materialized = canMaterializeBar(next, layer)
      ? next.rematerializeBarMark({ id: layer.id })
      : next;
    return rematerializeExistingLegend(materialized);
  }
);
