import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";

const OPTIONS = Object.freeze(["id", "source", "transform"]);

export const createDerivedData = action(
  { op: "createDerivedData", description: "Create an immutable derived dataset definition." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createDerivedData");
    const id = validateUserId(args.id, "Derived dataset id");
    const source = validateUserId(args.source, "Source dataset id");
    if (this.semanticSpec.datasets.some(dataset => dataset.id === id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    if (!this.semanticSpec.datasets.some(dataset => dataset.id === source)) {
      throw new Error(`Unknown source dataset "${source}".`);
    }
    return this
      .editSemantic({ property: `dataset[${id}].source`, value: source })
      .editSemantic({ property: `dataset[${id}].transform`, value: args.transform });
  }
);
