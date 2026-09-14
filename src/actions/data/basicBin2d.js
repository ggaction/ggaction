import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  deriveBin2DRows,
  normalizeBin2DTransform
} from "../../grammar/bin2d.js";
import { findDataset } from "../../selectors/datasets.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "bins", "extent", "includeEmpty", "members", "as"
]);

export const createBasicBin2DData = /* @__PURE__ */ action(
  {
    op: "createBin2DData",
    description: "Create immutable rectangular 2D-bin values."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createBin2DData");
    const owner = validateUserId(args.id, "2D bin dataset id");
    if (this.materializationConfigs.data?.bin2d?.[owner] !== undefined) {
      throw new Error(`2D bin owner "${owner}" already exists.`);
    }
    const source = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    const dataset = findDataset(this, source);
    if (dataset?.values === undefined) {
      throw new Error(`Source dataset "${source}" has no values.`);
    }
    const transform = normalizeBin2DTransform({ ...args, id: owner });
    deriveBin2DRows(dataset.values, transform);
    return this
      .createDerivedData({ id: owner, source, transform: [transform] })
      .materializeBin2DData({ id: owner })
      ._withMaterializationConfig(
        ["data", "bin2d", owner],
        { current: owner }
      );
  }
);
