import { ownRecord } from "../../core/ownData.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { GRAPH_LAYOUT_METHODS } from "../../core/vocabulary.js";
import { normalizeRouteIntent } from "../../grammar/graph/routes/options.js";
import { resolveLayoutResource } from "../../selectors/layouts.js";
import { resolveGraphResource } from "../../selectors/graphs.js";
import { resolveInputReference, findStoredResource } from "../../selectors/resources.js";
import { resolveEdgeRouteResource } from "../../selectors/edgeRoutes.js";

export function normalizeEdgeRouteRequest(program, args, editing) {
  if (program.compositionSpec !== undefined) throw new TypeError("Edge routes require an explicit unit chart scope.");
  ownRecord(args, "Edge route request");
  rejectUnknownProperties(args, [editing ? "target" : "id", "graph", "layout", "method", "options", "coordinateSpace"], "edge route request");
  if (Object.values(args).some(value => value === undefined || value === null)) throw new TypeError("Edge route arguments cannot contain null or undefined.");
  if (editing && !Object.keys(args).some(key => key !== "target" && (key !== "options" || Object.keys(ownRecord(args.options, "Edge route options")).length))) throw new TypeError("Edge route edits require a nonempty patch.");
  const previous = editing ? resolveEdgeRouteResource(program, args.target) : undefined;
  if (!editing) {
    validateUserId(args.id, "Edge route id");
    if (findStoredResource(program, "edge-route", args.id)) throw annotateError(new Error("Edge route already exists."), { code: "duplicate-id", resourceId: args.id });
  }
  if (previous?.revision === Number.MAX_SAFE_INTEGER) throw new RangeError("Edge route revision limit exceeded.");
  return { previous, resolved: resolveEdgeRouteRequest(program, args, previous) };
}

export function resolveEdgeRouteRequest(program, args, previous) {
  const graphId = args.graph ?? (args.layout === undefined ? previous?.inputs[0].id : undefined);
  const explicitGraph = graphId === undefined ? undefined : resolveGraphResource(program, graphId);
  const layout = resolveLayoutResource(program, args.layout ?? previous?.inputs[1].id, "graph", GRAPH_LAYOUT_METHODS, explicitGraph?.id);
  const graph = resolveInputReference(program, layout.inputs[0]);
  const method = args.method ?? previous?.options.method;
  if (Object.hasOwn(args, "options")) ownRecord(args.options, "Edge route options");
  const preserve = previous !== undefined && method === previous.options.method;
  const input = { ...(preserve ? previous.options.options : {}), ...args.options };
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError("Edge route options cannot contain null or undefined.");
  if (preserve && args.options?.limits) input.limits = { ...previous.options.options.limits, ...args.options.limits };
  const { hierarchy: hierarchyId, hierarchyLayout: hierarchyLayoutId, ...options } = input;
  let hierarchy, hierarchyLayout;
  if (method === "hierarchical") {
    hierarchyLayout = resolveLayoutResource(program, hierarchyLayoutId ?? (preserve ? previous?.inputs[3]?.id : undefined), "hierarchy", ["tree", "treemap"],
      hierarchyId ?? (preserve ? previous?.inputs[2]?.id : undefined));
    hierarchy = resolveInputReference(program, hierarchyLayout.inputs[0]);
  } else if (hierarchyId !== undefined || hierarchyLayoutId !== undefined) throw new TypeError("Only hierarchical routes use hierarchy bindings.");
  const intent = normalizeRouteIntent(method, options, args.coordinateSpace ?? previous?.options.coordinateSpace);
  return { id: previous?.id ?? args.id, revision: previous === undefined ? 0 : previous.revision + 1,
    program, graph, layout, hierarchy, hierarchyLayout, intent };
}

