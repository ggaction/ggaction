import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { normalizeParameterEditOptions, normalizeParameterValue } from "../../grammar/parameter.js";
import { requireStoredResource } from "../../selectors/resources.js";
import { applyRevisionPlan, buildParameterRevisionPlan } from "../data/edit.js";
import { withGuideLayoutTransaction } from "../../materialization/guides/layout.js";

let reviseFacetParameter;
export function registerFacetParameterRevision(handler) { reviseFacetParameter = handler; }

export function reviseUnitParameter(program, { resource, value }) {
  const plan = buildParameterRevisionPlan(program, resource.id);
  let next = program.editSemantic({ property: `resource[parameter:${resource.id}]`,
    value: { ...resource, revision: resource.revision + 1, result: { value } } });
  if (plan.revisions.length) next = withGuideLayoutTransaction(next,
    candidate => applyRevisionPlan(candidate, undefined, plan, { parameterBudget: true }));
  return { program: next, plan };
}

export const editParameter = /* @__PURE__ */ closedAction(
  { op: "editParameter", description: "Revise a parameter and its dependent chart.", scope: "any" },
  ["target", "value"], function (args = {}) {
    const normalized = normalizeParameterEditOptions(args);
    if (this.compositionSpec !== undefined && this.compositionSpec.type !== "facet") {
      throw new Error("Edit a parameter in an explicit concat child scope.");
    }
    const resource = requireStoredResource(this, { kind: "parameter", id: normalized.target });
    const value = normalizeParameterValue(normalized.value, resource.options);
    if (Object.is(resource.result.value, value)) return this;
    if (!Number.isSafeInteger(resource.revision + 1)) {
      throw annotateError(new RangeError("Parameter revision exceeds the safe integer range."),
        { code: "invalid-option", resourceId: resource.id });
    }
    const apply = this.compositionSpec === undefined
      ? program => reviseUnitParameter(program, { resource, value }).program
      : program => reviseFacetParameter(program, { resource, value });
    apply(this);
    return apply(this);
  }
);

export const removeParameter = /* @__PURE__ */ closedAction(
  { op: "removeParameter", description: "Remove an unreferenced parameter." }, ["id"],
  function (args = {}) {
    const id = validateUserId(args.id, "Parameter id");
    requireStoredResource(this, { kind: "parameter", id });
    return this.editSemantic({ property: `resource[parameter:${id}]`, remove: true });
  }
);
