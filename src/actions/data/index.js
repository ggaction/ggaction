import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";

const DATA_OPTIONS = Object.freeze(["id", "values"]);

function validateOptions(args) {
  for (const key of Object.keys(args)) {
    if (!DATA_OPTIONS.includes(key)) {
      throw new Error(`Unknown createData option "${key}".`);
    }
  }
}

function validateValues(values) {
  if (!Array.isArray(values)) {
    throw new TypeError("createData requires values to be an array.");
  }

  if (!values.every(isPlainObject)) {
    throw new TypeError("createData requires every row to be a plain object.");
  }
}

const createData = action(
  {
    op: "createData",
    description: "Create an immutable named dataset."
  },
  function (args = {}) {
    validateOptions(args);
    const id = validateUserId(args.id, "Dataset id");
    validateValues(args.values);

    if (this.semanticSpec.datasets.some(dataset => dataset.id === id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }

    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: args.values
    });
  }
);

export function registerDataActions(ProgramClass) {
  ProgramClass.prototype.createData = createData;
}
