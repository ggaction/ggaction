import {
  deriveComputedRows,
  normalizeComputedTransform
} from "../../grammar/computed.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze(["id", "source", "as", "expression"]);

export const materializeComputedData = /* @__PURE__ */ derivedMaterializer(
  "materializeComputedData",
  "Materialize one immutable row-level typed expression dataset.",
  "computed",
  deriveComputedRows
);

export const createComputedData = /* @__PURE__ */ derivedCreator(
  "createComputedData",
  "Create a typed computed field from a closed expression.",
  OPTIONS,
  "Computed dataset id",
  "Computed source dataset id",
  normalizeComputedTransform,
  "materializeComputedData"
);
