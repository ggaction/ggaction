import {
  deriveImputedRows,
  normalizeImputeTransform
} from "../../grammar/impute.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "fields", "groupBy", "sortBy", "method", "value", "edges", "maxGap"
]);

export const materializeImputedData = derivedMaterializer(
  "materializeImputedData",
  "Materialize one immutable missing-value dataset.",
  "impute",
  deriveImputedRows
);

export const createImputedData = derivedCreator(
  "createImputedData",
  "Replace explicit missing cells within independent groups.",
  OPTIONS,
  "Imputed dataset id",
  "Imputed source dataset id",
  normalizeImputeTransform,
  "materializeImputedData"
);
