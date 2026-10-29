import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeFlowBalance, summarizeFlow } from "../../grammar/flow/model.js";
import { createObservedGraphResource } from "../graph/resources.js";

export const FLOW_SOURCE_FIELDS = Object.freeze(["nodeKey", "source", "target", "edgeKey", "value", "attributes", "selfLoops", "balance", "maxNodes", "maxEdges"]);

export function flowSourceDefinition(resource) {
  const { weight, directed: _directed, ...definition } = resource.options.definition;
  return { ...definition, value: weight, balance: resource.options.flow.balance };
}

export function createFlowResource({ id, revision = 0, nodes, edges, definition }) {
  ownRecord(definition, "Flow source definition");
  rejectUnknownProperties(definition, FLOW_SOURCE_FIELDS, "flow source");
  if (!Object.hasOwn(definition, "value") || definition.value === undefined) throw new TypeError("Flow source requires a value field.");
  if (Object.values(definition).some(value => value === undefined)) throw new TypeError("Flow source options cannot be undefined.");
  const { value, balance, ...observed } = definition;
  const flow = normalizeFlowBalance(Object.hasOwn(definition, "balance") ? { balance } : {});
  const graph = createObservedGraphResource({ id, revision, nodes, edges, definition: { ...observed, directed: true, weight: value } });
  return cloneAndFreeze({ ...graph, options: { ...graph.options, flow },
    result: { model: graph.result.model, diagnostics: { flow: summarizeFlow(graph.result.model, flow) } } });
}
