import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { normalizeParameterOptions } from "../../grammar/parameter.js";
import { findStoredResource } from "../../selectors/resources.js";

export const createParameter = /* @__PURE__ */ closedAction(
  { op: "createParameter", description: "Create an authored scalar parameter." },
  ["id", "value", "type", "nullable"], function (args = {}) {
    const { id, value, type, nullable } = normalizeParameterOptions(args);
    if (findStoredResource(this, "parameter", id) !== undefined) {
      throw annotateError(new Error(`Parameter "${id}" already exists.`), { code: "duplicate-id", resourceId: id });
    }
    return this.editSemantic({ property: `resource[parameter:${id}]`, value: {
      kind: "parameter", id, revision: 0, algorithmVersion: "1",
      ownership: { mode: "authored" }, inputs: [], options: { type, nullable },
      result: { value }, provenance: { origin: "authored" }
    } });
  }
);
