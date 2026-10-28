import { closedAction, withActionArgumentSummary } from "../../core/action.js";
import { resolveImageMarkGeometry } from "../marks/image/index.js";
import { readPreparedImageResource } from "../../resources/imageResource.js";

function writeImageResource(program, resource) {
  const args = { property: `resource[image:${resource.id}]`, value: resource };
  return withActionArgumentSummary(args, { property: args.property, value: {
    kind: resource.kind, id: resource.id, revision: resource.revision,
    contentHash: resource.options.expectedHash, mimeType: resource.options.mimeType,
    width: resource.result.width, height: resource.result.height, byteLength: resource.result.byteLength
  } }, value => program.editSemantic(value));
}

const createImageResource = /* @__PURE__ */ closedAction(
  { op: "createImageResource", description: "Create an explicitly prepared image resource." },
  ["prepared", "requestToken"], function (args = {}) {
    return writeImageResource(this, readPreparedImageResource(this, args.prepared, args.requestToken, "create"));
  }
);
const replaceImageResource = /* @__PURE__ */ closedAction(
  { op: "replaceImageResource", description: "Replace a prepared image and rematerialize its marks." },
  ["prepared", "requestToken"], function (args = {}) {
    const resource = readPreparedImageResource(this, args.prepared, args.requestToken, "replace");
    const targets = this.semanticSpec.layers.filter(layer => layer.image?.id === resource.id).map(layer => layer.id);
    for (const id of targets) resolveImageMarkGeometry(this, resource, this.markConfigs[id]);
    let next = writeImageResource(this, resource);
    for (const id of targets) next = next.rematerializeImageMark({ id });
    return next;
  }
);
export function registerImageResourceActions(ProgramClass) {
  ProgramClass.prototype.createImageResource = createImageResource;
  ProgramClass.prototype.replaceImageResource = replaceImageResource;
}
