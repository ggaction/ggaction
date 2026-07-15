import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { hasDataset } from "../../selectors/index.js";
import { findDataset } from "../../selectors/datasets.js";

const OPTIONS = Object.freeze(["id", "source", "transform"]);
const RELEASE_OPTIONS = Object.freeze(["id"]);

export const createDerivedData = action(
  { op: "createDerivedData", description: "Create an immutable derived dataset definition." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createDerivedData");
    const id = validateUserId(args.id, "Derived dataset id");
    const source = validateUserId(args.source, "Source dataset id");
    if (hasDataset(this, id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    if (!hasDataset(this, source)) {
      throw new Error(`Unknown source dataset "${source}".`);
    }
    return this
      .editSemantic({ property: `dataset[${id}].source`, value: source })
      .editSemantic({ property: `dataset[${id}].transform`, value: args.transform });
  }
);

export const releaseDerivedData = action(
  {
    op: "releaseDerivedData",
    description: "Release one unreferenced derived dataset."
  },
  function (args = {}) {
    validateKeys(args, RELEASE_OPTIONS, "releaseDerivedData");
    const validatedId = validateUserId(args.id, "Derived dataset id");
    const dataset = findDataset(this, validatedId);
    if (dataset === undefined || dataset.source === undefined) {
      throw new Error(`Unknown derived dataset "${validatedId}".`);
    }
    const referenced = this.semanticSpec.layers.some(
      layer => layer.data === validatedId
    ) || this.semanticSpec.datasets.some(
      candidate => candidate.source === validatedId
    );
    return referenced
      ? this
      : this.editSemantic({
          property: `dataset[${validatedId}]`,
          remove: true
        });
  }
);
