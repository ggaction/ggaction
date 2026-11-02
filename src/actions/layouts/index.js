import { editCalendarLayout } from "../calendar/resources.js";
import { closedAction } from "../../core/action.js";
import { resolveLayoutResource } from "../../selectors/layouts.js";
import { editHierarchyLayout, planHierarchyLayoutStages, applyHierarchyLayoutPlan } from "../hierarchy/resources.js";
import { editGraphLayout, planGraphLayoutStages, applyGraphLayoutPlan } from "../graphs/layouts.js";
import { validateKeys } from "../../core/validation.js";
import { readNativeGraphRouteUpdatePlan } from "../../resources/graphRoutes.js";

const OPTIONS = ["target", "order", "options", "node"];
function resolveEdit(program, args) {
  const previous = resolveLayoutResource(program, args.target);
  if (Object.keys(args).every(key => key === "target")) throw new TypeError("Layout edits require a nonempty patch.");
  if (Object.values(args).some(value => value === undefined)) throw new TypeError("Layout edits cannot contain undefined; omission preserves intent.");
  if (Object.hasOwn(args, "node") && (previous.inputs[0].kind !== "graph" || Object.hasOwn(args, "order"))) throw new TypeError("Node movement requires a graph layout and no hierarchy order.");
  return previous;
}

export function* prepareLayoutRouteUpdate(program, args, scope) {
  validateKeys(args, OPTIONS, "editLayout");
  const previous = resolveEdit(program, args);
  if (previous.options.method === "calendar") throw new TypeError("This layout has no bounded edge route update; use editLayout directly.");
  const hierarchy = previous.inputs[0].kind === "hierarchy";
  const plan = yield* (hierarchy ? planHierarchyLayoutStages : planGraphLayoutStages)(program, args, previous, scope);
  return { previous, hierarchy, plan };
}

export function resolveLayoutRouteUpdate(program, args) {
  validateKeys(args, OPTIONS, "editLayout");
  return resolveEdit(program, args);
}

export const editLayout = /* @__PURE__ */ closedAction(
  { op: "editLayout", description: "Revise a stored layout and its consumers." }, OPTIONS, function (args = {}) {
    const previous = resolveEdit(this, args);
    const prepared = readNativeGraphRouteUpdatePlan(this, args, editLayout);
    if (prepared !== undefined) {
      if (prepared.plan.previous !== previous) throw new TypeError("Prepared layout input is stale.");
      return (prepared.plan.hierarchy ? applyHierarchyLayoutPlan : applyGraphLayoutPlan)(this, prepared.plan.plan, prepared.scope);
    }
    if (previous.options.method === "calendar") return editCalendarLayout(this, args, previous);
    return previous.inputs[0].kind === "hierarchy" ? editHierarchyLayout(this, args, previous) : editGraphLayout(this, args, previous);
  });

export function registerLayoutActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { editLayout });
}
