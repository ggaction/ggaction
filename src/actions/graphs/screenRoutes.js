import { closedAction, actionSource } from "../../core/action.js";
import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { routeValueHash } from "../../grammar/graph/routes/job.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";
import { validateResourceGraph } from "../../materialization/resourceState.js";
import { registerCanvasResourceRevision } from "../canvas/resourceRevision.js";
import { withPreparedScreenRouteResults } from "../primitives/preparedResourceContext.js";
import { reviseEdgeRouteResource } from "./routeClosure.js";

const plans = new WeakMap(), calls = new WeakMap();

function prepare(program) {
  const viewport = resolveGraphicBounds(program), entries = [];
  for (const previous of program.semanticSpec.resources) {
    if (previous.kind !== "edge-route" || previous.options.coordinateSpace !== "screen" ||
        routeValueHash(previous.result.viewport) === routeValueHash(viewport)) continue;
    const resource = reviseEdgeRouteResource(program, previous, previous.inputs.map(ref => resolveInputReference(program, ref)));
    entries.push({ previous: { kind: "edge-route", id: previous.id, revision: previous.revision }, resource });
  }
  if (entries.length === 0) return undefined;
  const resources = new Map(entries.map(entry => [entry.resource.id, entry.resource]));
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, ref => ref.kind === "edge-route" && resources.has(ref.id)
    ? { ...ref, revision: resources.get(ref.id).revision } : ref);
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, layers,
    resources: program.semanticSpec.resources.map(resource => resource.kind === "edge-route" ? resources.get(resource.id) ?? resource : resource) } };
  validateResourceGraph(preview, program.constructor);
  for (const layer of layers) if (resources.has(layer.graphBinding?.routes?.id)) resolveGraphPlot(preview, layer, program.materializationConfigs.marks[layer.id].graphPlot);
  const handle = Object.freeze({});
  plans.set(handle, { semanticSpec: program.semanticSpec, viewport, entries });
  return handle;
}

function apply(program, handle) {
  const plan = plans.get(handle), args = Object.freeze({});
  if (plan === undefined || program.semanticSpec !== plan.semanticSpec || routeValueHash(resolveGraphicBounds(program)) !== routeValueHash(plan.viewport)) throw new TypeError("Screen route plan belongs to a different Canvas transition.");
  calls.set(args, { program, entries: plan.entries });
  try { return program.refreshScreenEdgeRoutes(args); }
  finally { calls.delete(args); plans.delete(handle); }
}

const refreshScreenEdgeRoutes = /* @__PURE__ */ closedAction(
  { op: "refreshScreenEdgeRoutes", description: "Apply preflighted screen route results for the current Canvas." }, [], function (args) {
    const plan = calls.get(args);
    if (plan === undefined || actionSource(this) !== plan.program) throw new TypeError("Screen route refresh requires its exact private Canvas plan.");
    const [first, ...rest] = plan.entries;
    return withPreparedScreenRouteResults(this, { property: `resource[edge-route:${first.resource.id}]`, value: first.resource }, rest,
      input => this.editSemantic(input));
  });

export function registerScreenRouteRevision(ProgramClass) {
  ProgramClass.prototype.refreshScreenEdgeRoutes = refreshScreenEdgeRoutes;
  registerCanvasResourceRevision(ProgramClass, { prepare, apply });
}
