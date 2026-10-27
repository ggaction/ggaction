import { requestedMarkClip, validateMarkClipCoordinate } from "../../../selectors/markClip.js";
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
import { requestedRectStyleDetails, RECT_RADIUS_PROPERTIES } from
  "../../../grammar/roundedRect.js";
import { STROKE_STYLE_PROPERTIES } from
  "../../../grammar/strokeStyle.js";
import { rematerializeExistingLegend } from "../../encodings/shared.js";
import { validateFillPaint } from "../../../grammar/paint.js";
import { validateItemMissing } from "../../../grammar/itemMissing.js";

const EDIT_OPTIONS = Object.freeze([
  "target", "clip", "missing", "blend", "fill", "opacity", "stroke", "strokeWidth", ...RECT_RADIUS_PROPERTIES,
  ...STROKE_STYLE_PROPERTIES
]);

export const editBarMark = /* @__PURE__ */ action(
  {
    op: "editBarMark",
    description: "Edit whole-bar fill, opacity, outline, and compositing appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editBarMark");
    requestedMarkClip(args);
    const styleDetails = requestedRectStyleDetails(args, "editBarMark");
    const changes = [
      "clip", "missing", "blend", "fill", "opacity", "stroke", "strokeWidth", ...RECT_RADIUS_PROPERTIES,
      ...STROKE_STYLE_PROPERTIES
    ];
    if (!changes.some(key => Object.hasOwn(args, key))) {
      throw new Error(
        "editBarMark requires fill, opacity, stroke, or strokeWidth; missing is also editable."
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
    if (Object.hasOwn(args, "opacity") && layer.encoding?.opacity !== undefined) {
      throw new Error("editBarMark opacity conflicts with a field encoding; use encodeOpacity with value to replace it.");
    }
    if (args.stroke === false && Object.hasOwn(args, "strokeWidth")) {
      throw new Error(
        "editBarMark cannot set strokeWidth while removing stroke."
      );
    }

    if (Object.hasOwn(args, "blend") && !["normal", "difference"].includes(args.blend)) {
      throw new Error("Bar blend must be normal or difference.");
    }
    const missing = Object.hasOwn(args, "missing")
      ? validateItemMissing(args.missing, "Bar missing") : undefined;
    validateMarkClipCoordinate(this, layer, args.clip ?? this.markConfigs[layer.id]?.clip);
    const config = { ...this.markConfigs[layer.id], ...requestedMarkClip(args) };
    const appearance = { ...config.barAppearance };
    Object.assign(appearance, styleDetails);
    if (Object.hasOwn(args, "fill")) {
      appearance.fill = validateFillPaint(args.fill, "Bar fill");
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

    let semantic = missing === undefined ? this : this.editSemantic({
      property: `layer[${layer.id}].mark.missing`, value: missing
    });
    if (Object.hasOwn(args, "blend")) {
      if (args.blend === "difference") {
        semantic = semantic.editSemantic({property: `layer[${layer.id}].mark.blend`, value: "difference"});
      } else if (layer.mark.blend !== undefined) {
        semantic = semantic.editSemantic({property: `layer[${layer.id}].mark.blend`, remove: true});
      }
    }
    const editsAppearance = changes.some(key => key !== "missing" && key !== "blend" && key !== "clip" &&
      Object.hasOwn(args, key));
    const next = editsAppearance || Object.hasOwn(args, "clip") ? semantic._withMarkConfig(layer.id, {
      ...config,
      ...(editsAppearance ? {barAppearance: appearance} : {})
    }) : semantic;
    const materialized = canMaterializeBar(next, layer)
      ? next.rematerializeBarMark({ id: layer.id })
      : next;
    return rematerializeExistingLegend(materialized);
  }
);
