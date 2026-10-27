import {
  deriveNormalizedRows,
  normalizeNormalizeTransform
} from "../../grammar/normalize.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "field", "as", "groupBy", "method",
  "variance", "zeroDenominator", "baseline", "sortBy"
]);

export const materializeNormalizedData = /* @__PURE__ */ derivedMaterializer(
  "materializeNormalizedData",
  "Materialize one immutable grouped normalization dataset.",
  "normalize",
  deriveNormalizedRows
);

export const createNormalizedData = /* @__PURE__ */ derivedCreator(
  "createNormalizedData",
  "Create a row-preserving grouped normalization dataset.",
  OPTIONS,
  "Normalized dataset id",
  "Normalized source dataset id",
  normalizeNormalizeTransform,
  "materializeNormalizedData"
);
