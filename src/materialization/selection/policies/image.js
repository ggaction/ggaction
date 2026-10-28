import { imageItemKey } from "../../../grammar/imageMark.js";
import { concreteProperties } from "../items/common.js";
import { validateUnitInterval } from "../../../core/validation.js";

function resolveItems(program, layer) {
  const graphic = program.graphicSpec.objects[layer.id];
  if (!Array.isArray(graphic?.items) || graphic.items.length !== 1) throw new Error("Image selection requires one materialized image item.");
  return [Object.freeze({ key: imageItemKey(layer.id), topology: "", role: "body", graphicRoles: Object.freeze(["body"]),
    lineage: { kind: "resource", resource: layer.image }, layer: layer.id, markType: "image",
    fields: Object.freeze({ alt: layer.alt }), channels: Object.freeze({}), properties: Object.freeze(concreteProperties(graphic.items[0].properties)),
    members: Object.freeze([]), rows: Object.freeze([]), rowKeys: Object.freeze([]), graphicIds: Object.freeze([graphic.items[0].id]) })];
}
export const imageSelectionPolicy = Object.freeze({
  resourceBacked: true, supportedGrains: Object.freeze(["item"]), resolveItems,
  normalizeHighlightStyle(args) {
    for (const key of ["color", "fill", "stroke", "strokeWidth", "strokeDash", "shape", "size", "fontSize", "offset"]) {
      if (args[key] !== undefined) throw new TypeError(`Image highlight does not support ${key}.`);
    }
    return { opacity: args.opacity === undefined ? 1 : validateUnitInterval(args.opacity, "Image highlight opacity") };
  },
  applyHighlightOp: "applyPathHighlight", rematerializeOp: "rematerializeImageMark"
});
