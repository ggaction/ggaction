import { planEdgeRouteApplication, applyEdgeRouteApplication } from "./routePlan.js";
import { closedAction } from "../../core/action.js";
import { createEdgeRouteResource } from "../../materialization/graph/routeResource.js";
import { normalizeEdgeRouteRequest } from "../../materialization/graph/routeRequest.js";
import { registerScreenRouteRevision } from "./screenRoutes.js";
import { readPreparedGraphEdgeRoutes, registerGraphRoutePlanner } from "../../resources/graphRoutes.js";
import { findStoredResource } from "../../selectors/resources.js";


function facade(editing) {
  const op = editing ? "editEdgeRoute" : "bundleGraphEdges";
  return closedAction({ op, description: editing ? "Recompute a stored edge route." : "Bundle graph edges without changing topology." },
    [editing ? "target" : "id", "graph", "layout", "method", "options", "coordinateSpace", "prepared", "requestToken"], function (args = {}) {
      this._assertUnitProgram(op);
      let previous, resource, plan, scope;
      if (Object.hasOwn(args, "prepared")) {
        if (Object.keys(args).some(key => key !== "prepared" && key !== "requestToken")) throw new TypeError("Prepared edge route application accepts only prepared and requestToken.");
        ({ resource, plan, scope } = readPreparedGraphEdgeRoutes(this, args.prepared, args.requestToken, editing ? "edit" : "create"));
        previous = editing ? findStoredResource(this, "edge-route", resource.id) : undefined;
      } else {
        const request = normalizeEdgeRouteRequest(this, args, editing);
        previous = request.previous; resource = createEdgeRouteResource(request.resolved);
      }
      plan ??= planEdgeRouteApplication(this, resource, previous);
      return applyEdgeRouteApplication(this, resource, plan, scope);
    });
}
export const bundleGraphEdges = /* @__PURE__ */ facade(false);
export const editEdgeRoute = /* @__PURE__ */ facade(true);
export function registerEdgeRouteActions(ProgramClass) {
  registerGraphRoutePlanner(ProgramClass, planEdgeRouteApplication);
  Object.assign(ProgramClass.prototype, { bundleGraphEdges, editEdgeRoute });
  registerScreenRouteRevision(ProgramClass);
}
