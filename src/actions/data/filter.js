import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze(["id", "source", "field", "oneOf"]);

export const materializeFilteredData = action(
  { op: "materializeFilteredData", description: "Materialize one filtered derived dataset." },
  function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, "materializeFilteredData");
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "filter"
    );
    const accepted = new Set(transform.oneOf);
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: source.values.filter(row => accepted.has(row[transform.field]))
    });
  }
);

export const filterData = action(
  { op: "filterData", description: "Create a named dataset filtered by accepted field values." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "filterData");
    const id = validateUserId(args.id, "Filtered dataset id");
    const source = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    if (typeof args.field !== "string" || args.field.length === 0) {
      throw new TypeError("filterData requires a non-empty field string.");
    }
    return this
      .createDerivedData({
        id,
        source,
        transform: [{ type: "filter", field: args.field, oneOf: args.oneOf }]
      })
      .materializeFilteredData({ id });
  }
);
