import { closedAction } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { TEXT_MARK_STYLE_OPTIONS } from "../../../grammar/text.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import { resolveEligibleLayer } from "../../../selectors/layers.js";
import { validateOptionObject } from "../../../core/validation.js";
import { TEXT_LABEL_LAYOUT_OPTIONS } from "./layout.js";

const STYLE = Object.freeze(["blend", "clip", ...TEXT_MARK_STYLE_OPTIONS]);
const OPTIONS = Object.freeze(["target", "text", "format", "x", "y", "placement", "layout", ...STYLE]);

const editAnnotation = /* @__PURE__ */ closedAction({
  op: "editAnnotation",
  description: "Edit existing text content, datum anchors, offsets and label placement atomically."
}, OPTIONS, function (args = {}) {
  if (!OPTIONS.some(key => key !== "target" && Object.hasOwn(args, key))) {
    throw new Error("editAnnotation requires at least one editable property.");
  }
  const layer = resolveEligibleLayer(this, {
    target: args.target === undefined ? undefined : validateUserId(args.target, "Annotation target"),
    predicate: layer => layer.mark?.type === "text", label: "editAnnotation text mark"
  });
  const target = layer.id, axes = ["x", "y"].filter(key => Object.hasOwn(args, key));
  if (axes.length && (layer.source !== undefined || findCoordinate(this, layer.coordinate)?.type !== "cartesian" ||
    ["x", "y"].some(key => !Object.hasOwn(layer.encoding?.[key] ?? {}, "datum") ||
      layer.encoding[key].scale === undefined || layer.conditionals?.[key] !== undefined))) {
    throw new Error("Annotation positions require an existing independent Cartesian datum anchor.");
  }
  for (const key of ["dx", "dy"]) {
    if (Object.hasOwn(args, key) && (layer.encoding?.[key] !== undefined || layer.conditionals?.[key] !== undefined)) {
      throw new Error(`Annotation ${key} cannot replace an encoded offset; use its encoding action explicitly.`);
    }
  }
  const text = Object.hasOwn(args, "text"), format = Object.hasOwn(args, "format");
  if (format && !text && (!Object.hasOwn(layer.encoding?.text ?? {}, "datum") || layer.conditionals?.text !== undefined)) {
    throw new Error("Annotation format alone requires existing constant text.");
  }
  if (Object.hasOwn(args, "layout") && args.layout !== false) {
    validateOptionObject(args.layout, TEXT_LABEL_LAYOUT_OPTIONS.filter(key => key !== "target"), "Annotation layout");
  }
  const style = Object.fromEntries(STYLE.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]]));
  const apply = program => {
    let next = program;
    // Remove the previous collision policy first so a replacement placement can
    // own its leader without conflicting with a policy explicitly disabled here.
    if (args.layout === false && next.materializationConfigs.labelLayouts?.[target] !== undefined) {
      next = next.removeLabelLayout({ target });
    }
    if (text || format) next = next.encodeText({ target, value: text ? args.text : layer.encoding.text.datum,
      ...(format ? { format: args.format } : {}) });
    for (const axis of axes) {
      const binding = layer.encoding[axis];
      next = next[axis === "x" ? "encodeX" : "encodeY"]({ target, datum: args[axis],
        fieldType: binding.fieldType, scale: { id: binding.scale }, coordinate: layer.coordinate,
        ...(binding.temporalUnit === undefined ? {} : { temporalUnit: binding.temporalUnit }) });
    }
    if (Object.keys(style).length) next = next.editTextMark({ target, ...style });
    if (Object.hasOwn(args, "placement")) next = next.editMarkLabelPlacement({ target, placement: args.placement });
    if (Object.hasOwn(args, "layout") && args.layout !== false) next = next.layoutLabels({ ...args.layout, target });
    return next;
  };
  apply(this);
  return apply(this);
});

export function registerAnnotationActions(ProgramClass) {
  ProgramClass.prototype.editAnnotation = editAnnotation;
}
