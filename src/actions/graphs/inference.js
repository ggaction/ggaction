import { closedAction } from "../../core/action.js";
import { INFERRED_GRAPH_FIELDS } from "../../grammar/graph/input.js";
import { createInferredGraphResource } from "../../materialization/graph/inferredResource.js";
import { normalizeInferenceRequest } from "../../materialization/graph/inferenceRequest.js";
import { readPreparedInferredGraph } from "../../resources/graphInference.js";
import { writeGraphResource } from "./layouts.js";

function preparedResource(program, args, kind) {
  if (!Object.hasOwn(args, "prepared")) {
    if (Object.hasOwn(args, "requestToken")) throw new TypeError("Inference requestToken requires prepared input.");
    return createInferredGraphResource(normalizeInferenceRequest(program, args, kind === "edit"));
  }
  if (Object.keys(args).length !== 2 || !Object.hasOwn(args, "requestToken")) throw new TypeError("Prepared inference requires only prepared and requestToken.");
  return readPreparedInferredGraph(program, args.prepared, args.requestToken, kind);
}

export const createInferredGraphData = /* @__PURE__ */ closedAction(
  { op: "createInferredGraphData", description: "Infer stable graph relationships from explicit data rules." },
  ["id", "data", "candidateGraph", ...INFERRED_GRAPH_FIELDS, "prepared", "requestToken"], function (args = {}) {
    const resource = preparedResource(this, args, "create");
    return this.editSemantic({ property: `resource[graph:${resource.id}]`, value: resource });
  });

export const editInferredGraphData = /* @__PURE__ */ closedAction(
  { op: "editInferredGraphData", description: "Revise inferred topology and refresh its dependent layouts." },
  ["target", "data", "candidateGraph", "definition", "prepared", "requestToken"], function (args = {}) {
    return writeGraphResource(this, preparedResource(this, args, "edit"));
  });
