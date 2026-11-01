import { prepareGeoResourceRevisions } from "../geo/closure.js";
import { withPreparedResourceResults } from "../primitives/preparedResourceContext.js";
import { materializeEdgeRouteConsumers } from "./routeClosure.js";
import { closedAction } from "../../core/action.js";
import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { createEdgeRouteResource } from "../../materialization/graph/routeResource.js";
import { normalizeEdgeRouteRequest } from "../../materialization/graph/routeRequest.js";
import { validateResourceGraph } from "../../materialization/resourceState.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";
import { registerScreenRouteRevision } from "./screenRoutes.js";
import { readPreparedGraphEdgeRoutes } from "../../resources/graphRoutes.js";
import { findStoredResource } from "../../selectors/resources.js";


function previewResource(program, resource, previous) {
  const resources = previous === undefined ? [...program.semanticSpec.resources, resource]
    : program.semanticSpec.resources.map(candidate => candidate === previous ? resource : candidate);
  const geo = prepareGeoResourceRevisions(program, resources);
  const layers = mapLayerResourceBindings(geo.preview.semanticSpec.layers, ref => ref.kind === "edge-route" && ref.id === resource.id
    ? { ...ref, revision: resource.revision } : ref);
  const preview = { ...geo.preview, semanticSpec: { ...geo.preview.semanticSpec, layers } };
  validateResourceGraph(preview, program.constructor);
  for (const layer of layers) if (layer.graphBinding?.routes?.id === resource.id) resolveGraphPlot(preview, layer, program.markConfigs[layer.id].graphPlot);
  return geo.entries;
}

function facade(editing) {
  const op = editing ? "editEdgeRoute" : "bundleGraphEdges";
  return closedAction({ op, description: editing ? "Recompute a stored edge route." : "Bundle graph edges without changing topology." },
    [editing ? "target" : "id", "graph", "layout", "method", "options", "coordinateSpace", "prepared", "requestToken"], function (args = {}) {
      this._assertUnitProgram(op);
      let previous, resource;
      if (Object.hasOwn(args, "prepared")) {
        if (Object.keys(args).some(key => key !== "prepared" && key !== "requestToken")) throw new TypeError("Prepared edge route application accepts only prepared and requestToken.");
        resource = readPreparedGraphEdgeRoutes(this, args.prepared, args.requestToken, editing ? "edit" : "create");
        previous = editing ? findStoredResource(this, "edge-route", resource.id) : undefined;
      } else {
        const request = normalizeEdgeRouteRequest(this, args, editing);
        previous = request.previous; resource = createEdgeRouteResource(request.resolved);
      }
      const entries = previewResource(this, resource, previous);
      const next = withPreparedResourceResults(this, { property: `resource[edge-route:${resource.id}]`, value: resource }, entries,
        input => this.editSemantic(input));
      return materializeEdgeRouteConsumers(next, new Set([resource.id]));
    });
}
export const bundleGraphEdges = /* @__PURE__ */ facade(false);
export const editEdgeRoute = /* @__PURE__ */ facade(true);
export function registerEdgeRouteActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { bundleGraphEdges, editEdgeRoute });
  registerScreenRouteRevision(ProgramClass);
}
