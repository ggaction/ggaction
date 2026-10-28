import { closedAction } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { requireStoredResource } from "../../../selectors/resources.js";
import { resolveEligibleLayer } from "../../../selectors/layers.js";
import { assertMarkAvailable, resolveMarkId } from "../shared.js";
import { imagePlacement } from "../../../materialization/image.js";
import { concreteImageValue, validateImageBinding } from "../../../materialization/imageState.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { resolveMarkGraphicPlacement } from "../../../materialization/graphicHierarchy.js";
import { IMAGE_MARK_CONFIG_KEYS, imageClipOwner, imageItemKey, normalizeImageMarkConfig } from "../../../grammar/imageMark.js";
import { translateGraphicClip } from "../../../grammar/schemas/graphicClip.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";

function resource(program, requested) {
  if (requested !== undefined) return requireStoredResource(program, { kind: "image", id: validateUserId(requested, "Image resource id") });
  const candidates = program.semanticSpec.resources.filter(value => value.kind === "image");
  if (candidates.length !== 1) throw new Error("Image resource is missing or ambiguous; provide image.");
  return candidates[0];
}
function resolveLayer(program, target) {
  if (target !== undefined) return resolveEligibleLayer(program, { target, predicate: layer => layer.mark?.type === "image", label: "image mark" });
  const layers = program.semanticSpec.layers.filter(layer => layer.mark?.type === "image");
  if (layers.length !== 1) throw new Error("Image mark is missing or ambiguous; provide target.");
  return layers[0];
}
export function resolveImageMarkGeometry(program, image, config) {
  const plot = resolveGraphicBounds(program);
  const view = config.viewport === "auto" ? plot : { ...config.viewport, x: plot.x + config.viewport.x, y: plot.y + config.viewport.y };
  return { placement: imagePlacement({ width: image.result.width, height: image.result.height }, view, { fit: config.fit, align: config.align }),
    clip: config.clip === false ? false : translateGraphicClip(config.clip, plot.x, plot.y) };
}
function alt(value) {
  if (typeof value !== "string") throw new TypeError("Image alternative text must be a string.");
  return value;
}
const createImageMark = /* @__PURE__ */ closedAction(
  { op: "createImageMark", description: "Create one image mark from a named image resource." },
  ["id", "image", "alt", ...IMAGE_MARK_CONFIG_KEYS], function (args = {}) {
    const id = resolveMarkId(this, args.id, { defaultId: "image", label: "Image mark id", markType: "image", operation: "createImageMark" });
    assertMarkAvailable(this, id);
    const owner = imageClipOwner(id);
    if (this.graphicSpec.objects[owner] !== undefined) throw new Error(`Image graphic owner "${owner}" already exists.`);
    const image = resource(this, args.image), config = normalizeImageMarkConfig(args);
    const text = Object.hasOwn(args, "alt") ? alt(args.alt) : "";
    resolveImageMarkGeometry(this, image, config);
    return this.editSemantic({ property: `layer[${id}].mark.type`, value: "image" })
      .editSemantic({ property: `layer[${id}].image`, value: { kind: "image", id: image.id, revision: image.revision } })
      .editSemantic({ property: `layer[${id}].alt`, value: text })
      ._withMarkConfig(id, config)
      .createGraphics({ id: owner, type: "collection", ...resolveMarkGraphicPlacement(this, { markType: "image" }) })
      .createGraphics({ id, type: "image", length: 0, parent: owner })
      .rematerializeImageMark({ id });
  }
);
const editImageMark = /* @__PURE__ */ closedAction(
  { op: "editImageMark", description: "Edit image placement, resource binding and alternative text." },
  ["target", "image", "alt", ...IMAGE_MARK_CONFIG_KEYS], function (args = {}) {
    if (Object.keys(args).every(key => key === "target")) throw new Error("editImageMark requires an image edit.");
    const layer = resolveLayer(this, args.target), config = normalizeImageMarkConfig(args, this.markConfigs[layer.id]);
    const image = Object.hasOwn(args, "image") ? resource(this, args.image) : requireStoredResource(this, layer.image);
    const text = Object.hasOwn(args, "alt") ? alt(args.alt) : layer.alt;
    resolveImageMarkGeometry(this, image, config);
    return this.editSemantic({ property: `layer[${layer.id}].image`, value: { kind: "image", id: image.id, revision: image.revision } })
      .editSemantic({ property: `layer[${layer.id}].alt`, value: text })._withMarkConfig(layer.id, config)
      .rematerializeImageMark({ id: layer.id });
  }
);
const rematerializeImageMark = /* @__PURE__ */ closedAction(
  { op: "rematerializeImageMark", description: "Materialize image placement, clipping and stable item identity." },
  ["id"], function ({ id } = {}) {
    const layer = resolveLayer(this, id); validateImageBinding(this, layer);
    const baseline = rematerializeHighlightBaseline(this, { target: layer.id, operation: "rematerializeImageMark", resetProperty: "length", resetValue: 0 });
    if (baseline !== undefined) return baseline;
    const image = requireStoredResource(this, layer.image), config = normalizeImageMarkConfig({}, this.markConfigs[layer.id]);
    const { placement, clip } = resolveImageMarkGeometry(this, image, config);
    const { x, y, width, height } = placement;
    return this.editGraphics({ target: imageClipOwner(layer.id), property: "clip", value: clip })
      .editGraphics({ target: layer.id, property: "clip", value: placement.clip })
      .editGraphics({ target: layer.id, property: "items", value: [{ type: "image", properties: {
        image: concreteImageValue(image), x, y, width, height, opacity: config.opacity
      }, identity: { key: imageItemKey(layer.id), topology: "", role: "body", lineage: { kind: "resource", resource: layer.image } } }] });
  }
);
export function registerImageMarkActions(ProgramClass) {
  ProgramClass.prototype.createImageMark = createImageMark;
  ProgramClass.prototype.editImageMark = editImageMark;
  ProgramClass.prototype.rematerializeImageMark = rematerializeImageMark;
}
