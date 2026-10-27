import {
  deriveImputedRows,
  normalizeImputeTransform
} from "../../grammar/impute.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "fields", "groupBy", "sortBy", "method", "value", "edges", "maxGap"
]);

export const materializeImputedData = /* @__PURE__ */ derivedMaterializer(
  "materializeImputedData",
  "Materialize one immutable missing-value dataset.",
  "impute",
  deriveImputedRows
);

export const createImputedData = /* @__PURE__ */ derivedCreator(
  "createImputedData",
  "Replace explicit missing cells within independent groups.",
  OPTIONS,
  "Imputed dataset id",
  "Imputed source dataset id",
  normalizeImputeTransform,
  "materializeImputedData"
);
