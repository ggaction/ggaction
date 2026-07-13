import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";

const OPTIONS = Object.freeze(["id", "values"]);

export const createData = action(
  { op: "createData", description: "Create an immutable named dataset." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createData");
    const id = validateUserId(args.id, "Dataset id");
    if (!Array.isArray(args.values)) {
      throw new TypeError("createData requires values to be an array.");
    }
    if (!args.values.every(isPlainObject)) {
      throw new TypeError("createData requires every row to be a plain object.");
    }
    if (this.semanticSpec.datasets.some(dataset => dataset.id === id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: args.values
    });
  }
);
