import { normalizeRouteIntent, routeNumericOptions } from "../../grammar/graph/routes/options.js";
import { routeValueHash } from "../../grammar/graph/routes/job.js";
import { exactRouteRecord, validateRouteResult } from "../../grammar/graph/routes/result.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { edgeRouteJob, edgeRouteSourceRows } from "./routeResource.js";

function validateStored(resource) {
  if (resource.ownership.mode !== "authored" || resource.provenance.origin !== "inferred") throw new TypeError("Edge routes require authored ownership and inferred provenance.");
  exactRouteRecord(resource.options, ["method", "coordinateSpace", "options"], "Edge route intent");
  const normalized = normalizeRouteIntent(resource.options.method, resource.options.options, resource.options.coordinateSpace);
  if (routeValueHash(resource.options) !== routeValueHash(normalized)) throw new TypeError("Edge route options must store resolved defaults.");
  const kinds = normalized.method === "hierarchical" ? ["graph", "layout", "hierarchy", "layout"] : ["graph", "layout"];
  if (resource.inputs.length !== kinds.length || resource.inputs.some((ref, index) => ref.kind !== kinds[index])) throw new TypeError("Edge route inputs require exact graph, layout and optional hierarchy roles.");
  exactRouteRecord(resource.result, ["viewport", "inputHash", "resultHash", "complete", "routes", "diagnostics"], "Edge route result");
  if (resource.result.complete !== true || ![resource.result.inputHash, resource.result.resultHash].every(value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value))) throw new TypeError("Edge route requires a complete result and canonical hashes.");
}

function validateBindings(program, resource) {
  const [graph, layout, hierarchy, hierarchyLayout] = resource.inputs.map(ref => resolveInputReference(program, ref));
  const job = edgeRouteJob(program, graph, layout, resource.options, hierarchy, hierarchyLayout);
  const { viewport, inputHash, resultHash, ...result } = resource.result;
  if (routeValueHash(viewport) !== routeValueHash(job.viewport) ||
      routeValueHash(resource.provenance.sourceRows) !== routeValueHash(edgeRouteSourceRows(graph, hierarchy))) throw new TypeError("Edge route viewport or source provenance is stale.");
  validateRouteResult(job, { inputHash, resultHash, result: { ...result, options: routeNumericOptions(resource.options) } });
  for (const layer of program.semanticSpec.layers) if (layer.graphBinding?.routes?.id === resource.id) {
    if (layer.mark.type !== "graph" || layer.graphBinding.layout.id !== layout.id || layer.graphBinding.layout.revision !== layout.revision) throw new TypeError("Graph route consumers must bind the same exact node layout.");
  }
}

export const edgeRouteResourceHandler = Object.freeze({ validateStored, validateBindings });
