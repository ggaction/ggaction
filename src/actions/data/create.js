import { closedAction } from "../../core/action.js";
import { resolveOptionalUserId } from "../../core/identifiers.js";
import { validateDataRows } from "../../core/validation.js";
import { hasDataset, hasDatasetOwner } from "../../selectors/index.js";
import { sourceIdentityFor, writeSourceValues } from "../primitives/datasetIdentity.js";
import {
  inferDatasetSchema,
  normalizeSourceSchema,
  validateRowsAgainstSchema
} from "../../grammar/datasetSchema.js";

const OPTIONS = Object.freeze(["id", "values", "schema", "keyField", "keyFields", "keys"]);

export const createData = /* @__PURE__ */ closedAction(
  { op: "createData", description: "Create an immutable named dataset." }, OPTIONS,
  function (args = {}) {
    const id = resolveOptionalUserId(args.id, {
      defaultId: "data",
      label: "Dataset id",
      operation: "createData",
      ambiguous: this.semanticSpec.datasets.length > 0
    });
    validateDataRows(args.values, "createData");
    const schema = args.schema === undefined
      ? inferDatasetSchema(args.values)
      : normalizeSourceSchema(args.schema);
    validateRowsAgainstSchema(args.values, schema, "createData");
    if (hasDataset(this, id) || hasDatasetOwner(this, id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    const identity = sourceIdentityFor(args, args.values, args);
    const prepared = args.schema === undefined ? this
      : this.editSemantic({ property: `dataset[${id}].schema`, value: schema });
    return writeSourceValues(prepared, id, args.values, identity);
  }
);
