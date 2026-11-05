import { planEdgeRouteApplication, applyEdgeRouteApplication } from "./routePlan.js";
import { closedAction, bindActionInvocationScope } from "../../core/action.js";
import { createEdgeRouteResource, isPreparedRouteRequirement } from "../../materialization/graph/routeResource.js";
import { normalizeEdgeRouteRequest } from "../../materialization/graph/routeRequest.js";
import { registerScreenRouteRevision } from "./screenRoutes.js";
import { readPreparedGraphEdgeRoutes, registerGraphRoutePlanner, enterGraphRouteUpdateInvocation, applyPreparedGraphRouteUpdate, readGraphRouteUpdateTheme, readNativeRouteRevisionIdentity, nativeRouteInvocationBase } from "../../resources/graphRoutes.js";
import { registerPreparedDataUpdateBase } from "../../resources/dataUpdate.js";
import { snapshotNativeRouteEdit, resolveNativeRouteUpdate, prepareNativeRouteUpdate } from "./nativeUpdate.js";
import { registerNativeRouteThemeReader } from "../theme/nativeRouteUpdate.js";
import { registerNativeRevisionIdentityReader } from "../data/revise.js";
import { registerFitContinuationCheck } from "../canvas/fitting.js";
import { activeRouteReplay } from "../../materialization/graph/routeReplay.js";
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
export const applyGraphEdgeRoutesUpdate = /* @__PURE__ */ bindActionInvocationScope(closedAction(
  { op: "applyGraphEdgeRoutesUpdate", description: "Apply a prepared native edit and its edge routes.", scope: "any" },
  ["prepared", "requestToken"], function (args) { return applyPreparedGraphRouteUpdate(this, args); }
), enterGraphRouteUpdateInvocation);
// A fit probe may absorb an ordinary geometry failure, never a route
// continuation, its mismatch, quota, deadline or abort, nor the requirement.
export function checkFitContinuation(error) {
  const replay = activeRouteReplay();
  if (replay === undefined) { if (isPreparedRouteRequirement(error)) throw error; return; }
  if (replay.owns(error)) throw error;
  replay.scope.ledger.check();
  if (replay.scope.signal !== undefined) AbortSignal.prototype.throwIfAborted.call(replay.scope.signal);
}
export function registerEdgeRouteActions(ProgramClass) {
  registerGraphRoutePlanner(ProgramClass, planEdgeRouteApplication, { snapshot: snapshotNativeRouteEdit, resolve: resolveNativeRouteUpdate, prepare: prepareNativeRouteUpdate, apply: applyGraphEdgeRoutesUpdate });
  Object.assign(ProgramClass.prototype, { bundleGraphEdges, editEdgeRoute, applyGraphEdgeRoutesUpdate });
  registerNativeRouteThemeReader(ProgramClass, readGraphRouteUpdateTheme);
  registerNativeRevisionIdentityReader(ProgramClass, readNativeRouteRevisionIdentity);
  registerFitContinuationCheck(ProgramClass, checkFitContinuation);
  registerPreparedDataUpdateBase(ProgramClass, nativeRouteInvocationBase);
  registerScreenRouteRevision(ProgramClass);
}
