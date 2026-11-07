import { normalizeRouteIntent, routeNumericOptions } from "../../grammar/graph/routes/options.js";
import { routeValueHash } from "../../grammar/graph/routes/job.js";
import { exactRouteRecord, validateRouteResult, validateRouteResultStages } from "../../grammar/graph/routes/result.js";
import { drainStages } from "../../core/stages.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { edgeRouteJob, edgeRouteJobStages, edgeRouteSourceRows } from "./routeResource.js";

function validateStored(resource) {
  if (resource.ownership.mode !== "authored" || resource.provenance.origin !== "inferred") throw new TypeError("Edge routes require authored ownership and inferred provenance.");
  exactRouteRecord(resource.options, ["method", "coordinateSpace", "options"], "Edge route intent");
  const normalized = normalizeRouteIntent(resource.options.method, resource.options.options, resource.options.coordinateSpace);
  const version = Object.hasOwn(normalized.options, "execution") ? "2" : "1";
  if (resource.algorithmVersion !== version) throw new TypeError("Edge route storage version disagrees with execution policy.");
  if (routeValueHash(resource.options) !== routeValueHash(normalized)) throw new TypeError("Edge route options must store resolved defaults.");
  const kinds = normalized.method === "hierarchical" ? ["graph", "layout", "hierarchy", "layout"] : ["graph", "layout"];
  if (resource.inputs.length !== kinds.length || resource.inputs.some((ref, index) => ref.kind !== kinds[index])) throw new TypeError("Edge route inputs require exact graph, layout and optional hierarchy roles.");
  exactRouteRecord(resource.result, ["viewport", "inputHash", "resultHash", "complete", "routes", "diagnostics"], "Edge route result");
  if (resource.result.complete !== true || ![resource.result.inputHash, resource.result.resultHash].every(value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value))) throw new TypeError("Edge route requires a complete result and canonical hashes.");
}

// A bounded route rebuilds and checks its job and result in stages; version 1
// keeps its synchronous owners.
function* validateBindingsStages(program, resource, scope) {
  const [graph, layout, hierarchy, hierarchyLayout] = resource.inputs.map(ref => resolveInputReference(program, ref));
  const bounded = resource.algorithmVersion === "2";
  const job = bounded ? yield* edgeRouteJobStages(program, graph, layout, resource.options, hierarchy, hierarchyLayout, scope)
    : edgeRouteJob(program, graph, layout, resource.options, hierarchy, hierarchyLayout, scope);
  const { viewport, inputHash, resultHash, ...result } = resource.result;
  const stale = () => new TypeError("Edge route viewport or source provenance is stale.");
  if (routeValueHash(viewport) !== routeValueHash(job.viewport)) throw stale();
  // Each large provenance digest takes its own host turn when staged.
  if (bounded) yield;
  const stored = routeValueHash(resource.provenance.sourceRows);
  if (bounded) yield;
  if (stored !== routeValueHash(edgeRouteSourceRows(graph, hierarchy))) throw stale();
  if (bounded) yield;
  const envelope = { ...(job.schemaVersion === 2 ? { schemaVersion: 2 } : {}), inputHash, resultHash, result: { ...result, options: routeNumericOptions(resource.options) } };
  const checkScope = scope === undefined ? undefined : { ...scope, includeComputation: false };
  if (job.schemaVersion === 2) yield* validateRouteResultStages(job, envelope, checkScope); else validateRouteResult(job, envelope, checkScope);
  for (const layer of program.semanticSpec.layers) if (layer.graphBinding?.routes?.id === resource.id) {
    if (layer.mark.type !== "graph" || layer.graphBinding.layout.id !== layout.id || layer.graphBinding.layout.revision !== layout.revision) throw new TypeError("Graph route consumers must bind the same exact node layout.");
  }
}

const validateBindings = (program, resource, scope) => drainStages(validateBindingsStages(program, resource, scope));

export const edgeRouteResourceHandler = Object.freeze({ validateStored, validateBindings, validateBindingsStages });
