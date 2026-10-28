import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { normalizeParameterEditOptions, normalizeParameterValue } from "../../grammar/parameter.js";
import { requireStoredResource } from "../../selectors/resources.js";
import { applyRevisionPlan, buildParameterRevisionPlan } from "../data/edit.js";
import { withGuideLayoutTransaction } from "../../materialization/guides/layout.js";
import { createDataSourceResource } from "../../materialization/dataSourceState.js";
import { requireDataset } from "../../selectors/datasets.js";
import { withPreparedSourceResources } from "../primitives/dataSourceContext.js";
import { createPreparedSource } from "../data/sourceCreate.js";
import { preparedSourceUpdate } from "../data/sourceContext.js";

let reviseFacetParameter;
export function registerFacetParameterRevision(handler) { reviseFacetParameter = handler; }

export function reviseUnitParameter(program, { resource, value, preparedPlan }) {
  const plan = preparedPlan?.revisionPlan ?? buildParameterRevisionPlan(program, resource.id);
  let next = program;
  const replacements = [], retain = new Set();
  for (const source of preparedPlan?.sources ?? []) {
    next = createPreparedSource(next, { id: source.id, prepared: source.prepared,
      identity: source.identity, sourceId: source.resource.id });
    const updated = createDataSourceResource({ id: source.resource.id,
      revision: source.resource.revision + 1, options: source.resource.options,
      prepared: source.prepared, dataset: requireDataset(next, source.id) });
    replacements.push({ previous: { kind: "data-source", id: source.resource.id,
      revision: source.resource.revision }, resource: updated });
    retain.add(source.old);
  }
  next = withPreparedSourceResources({ property: `resource[parameter:${resource.id}]`,
    value: { ...resource, revision: resource.revision + 1, result: { value } } },
  replacements, args => next.editSemantic(args));
  if (plan.revisions.length) next = withGuideLayoutTransaction(next,
    candidate => applyRevisionPlan(candidate, undefined, plan, { parameterBudget: true, retain }));
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
    const preparedPlan = preparedSourceUpdate(args)?.plan;
    if (preparedPlan === undefined && this.semanticSpec.resources.some(candidate =>
      candidate.kind === "data-source" && candidate.inputs.some(ref => ref.kind === "parameter" && ref.id === resource.id))) {
      throw annotateError(new Error("Parameter data sources require a prepared data update."), {
        code: "prepared-data-required", resourceId: resource.id
      });
    }
    const apply = this.compositionSpec === undefined
      ? program => reviseUnitParameter(program, { resource, value, preparedPlan }).program
      : program => reviseFacetParameter(program, { resource, value, preparedPlan });
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
