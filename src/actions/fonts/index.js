import { closedAction, withActionArgumentSummary } from "../../core/action.js";
import { readPreparedFontResource } from "../../resources/fontResource.js";
import { fontResourceWriteBase } from "../../materialization/fontState.js";
import { applyTextMetricProfile } from "../textMetrics/index.js";

function writeFontResource(program, prepared) {
  const { resource, previous, metrics } = prepared;
  // The primitive sees the new resource and metric vector in one validation
  // candidate. No returned program contains a stale measured font revision.
  let next = fontResourceWriteBase(program, resource, previous);
  if (metrics !== undefined) next = next._withMaterializationConfig(["textMetrics"], metrics);
  const args = { property: `resource[font:${resource.id}]`, value: resource };
  next = withActionArgumentSummary(args, { property: args.property, value: {
    kind: resource.kind, id: resource.id, revision: resource.revision,
    contentHash: resource.options.expectedHash, byteLength: resource.result.byteLength
  } }, value => next.editSemantic(value));
  return metrics === undefined ? next : applyTextMetricProfile(next, metrics);
}

const createFontResource = /* @__PURE__ */ closedAction(
  { op: "createFontResource", description: "Create an explicitly prepared font resource.", scope: "any" },
  ["prepared", "requestToken"], function (args = {}) {
    return writeFontResource(this, readPreparedFontResource(this, args.prepared, args.requestToken, "create"));
  }
);
const replaceFontResource = /* @__PURE__ */ closedAction(
  { op: "replaceFontResource", description: "Replace a prepared font and its exact text measurements.", scope: "any" },
  ["prepared", "requestToken"], function (args = {}) {
    const prepared = readPreparedFontResource(this, args.prepared, args.requestToken, "replace");
    writeFontResource(this, prepared);
    return writeFontResource(this, prepared);
  }
);
export function registerFontResourceActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createFontResource, replaceFontResource });
}
