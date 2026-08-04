import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  deriveTimeUnitRows,
  normalizeTimeUnitTransform
} from "../../grammar/timeUnit.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze(["id", "source", "field", "unit", "as"]);

export const materializeTimeUnitData = action(
  {
    op: "materializeTimeUnitData",
    description: "Materialize one immutable UTC time-unit dataset."
  },
  function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, "materializeTimeUnitData");
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "timeUnit"
    );
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: deriveTimeUnitRows(source.values, transform)
    });
  }
);

export const createTimeUnitData = action(
  {
    op: "createTimeUnitData",
    description: "Create immutable UTC calendar bucket values."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createTimeUnitData");
    const id = validateUserId(args.id, "Time-unit dataset id");
    const source = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    const transform = normalizeTimeUnitTransform(args);
    return this
      .createDerivedData({ id, source, transform: [transform] })
      .materializeTimeUnitData({ id });
  }
);
