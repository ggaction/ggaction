import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";

import { requireDataset } from "../../selectors/datasets.js";
import { requireLayer } from "../../selectors/layers.js";
import { applyRevisionPlan, buildSourceRevisionPlan } from "./edit.js";
import { resolveStoredSelection } from "../../materialization/selection/state.js";
import { withGuideLayoutTransaction } from "../../materialization/guides/layout.js";

let reviseFacet;

export function registerFacetDataRevision(handler) {
  reviseFacet = handler;
}

export function reviseUnitData(program, { source, id, values }) {
  const plan = buildSourceRevisionPlan(program, source, id);
  const created = program.createData({ id, values });
  const next = withGuideLayoutTransaction(created, candidate =>
    applyRevisionPlan(candidate, undefined, plan, { retain: new Set([source]) }));
  for (const [selection, config] of Object.entries(next.materializationConfigs.selections ?? {})) {
    if (plan.replacements.has(requireLayer(program, config.target).data)) {
      resolveStoredSelection(next, selection);
    }
  }
  return { program: next, plan };
}

export const reviseData = /* @__PURE__ */ closedAction(
  { op: "reviseData", description: "Revise source data and its dependent chart.", scope: "any" }, ["source", "id", "values"],
  function (args = {}) {
    const source = validateUserId(args.source, "Source dataset id");
    const id = validateUserId(args.id, "Revision dataset id");
    if (this.compositionSpec !== undefined && this.compositionSpec.type !== "facet") {
      throw new Error("Revise an explicit child, then use replaceCompositionChild for concat.");
    }
    const original = requireDataset(this, source);
    if (original.source !== undefined || !Array.isArray(original.values)) {
      throw new Error(`Source "${source}" must be a materialized original dataset.`);
    }
    const apply = this.compositionSpec === undefined
      ? program => reviseUnitData(program, { source, id, values: args.values }).program
      : program => reviseFacet(program, { source, id, values: args.values });
    // The entire dependent materialization must succeed before returning a revision.
    apply(this);
    return apply(this);
  }
);
