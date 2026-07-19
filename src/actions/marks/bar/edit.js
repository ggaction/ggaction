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

const EDIT_OPTIONS = Object.freeze([
  "target", "fill", "opacity", "stroke", "strokeWidth"
]);

export const editBarMark = action(
  {
    op: "editBarMark",
    description: "Edit whole-bar fill, opacity, and outline appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editBarMark");
    const changes = ["fill", "opacity", "stroke", "strokeWidth"];
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
    if (args.stroke === false && Object.hasOwn(args, "strokeWidth")) {
      throw new Error(
        "editBarMark cannot set strokeWidth while removing stroke."
      );
    }

    const config = { ...this.markConfigs[layer.id] };
    const appearance = { ...config.barAppearance };
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
    return canMaterializeBar(next, layer)
      ? next.rematerializeBarMark({ id: layer.id })
      : next;
  }
);
