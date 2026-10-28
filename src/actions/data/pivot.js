import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { derivePivotRows, normalizePivotTransform } from "../../grammar/pivot.js";
import { resolveDatasetReference } from "../../selectors/datasets.js";
import { derivedMaterializer } from "./shared.js";

export const materializePivotData = /* @__PURE__ */ derivedMaterializer(
  "materializePivotData",
  "Materialize one immutable grouped pivot dataset.",
  "pivot",
  derivePivotRows
);

export const createPivotData = /* @__PURE__ */ closedAction(
  { op: "createPivotData", description: "Create numeric columns from explicitly grouped category cells." },
  ["id", "source", "field", "value", "groupBy", "columns", "op", "fill"],
  function(args = {}) {
    const id = validateUserId(args.id, "Pivot dataset id");
    const source = resolveDatasetReference(this,
      validateUserId(args.source ?? this.context.currentData, "Pivot source dataset id"),
      "Pivot source dataset");
    const { id: _id, source: _source, ...options } = args;
    const transform = normalizePivotTransform(options, source.values);
    const standalone = this.actionStack.length === 1;
    const next = this.createDerivedData({ id, source: source.id, transform: [transform] })
      .materializePivotData({ id });
    return standalone ? next._withMaterializationConfig(["data", "pivot", id], { current: id }) : next;
  }
);
