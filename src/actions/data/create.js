import { action } from "../../core/action.js";
import { resolveOptionalUserId } from "../../core/identifiers.js";
import { validateDataRows, validateKeys } from "../../core/validation.js";
import { hasDataset, hasDatasetOwner } from "../../selectors/index.js";

const OPTIONS = Object.freeze(["id", "values"]);

export const createData = /* @__PURE__ */ action(
  { op: "createData", description: "Create an immutable named dataset." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createData");
    const id = resolveOptionalUserId(args.id, {
      defaultId: "data",
      label: "Dataset id",
      operation: "createData",
      ambiguous: this.semanticSpec.datasets.length > 0
    });
    validateDataRows(args.values, "createData");
    if (hasDataset(this, id) || hasDatasetOwner(this, id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: args.values
    });
  }
);
