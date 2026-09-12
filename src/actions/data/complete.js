import {
  deriveCompleteRows,
  normalizeCompleteTransform
} from "../../grammar/complete.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "key", "groupBy", "values", "sequence", "fill", "members"
]);

export const materializeCompleteData = derivedMaterializer(
  "materializeCompleteData",
  "Materialize one immutable completed-key dataset.",
  "complete",
  deriveCompleteRows
);

export const createCompleteData = derivedCreator(
  "createCompleteData",
  "Complete one key domain independently within observed groups.",
  OPTIONS,
  "Complete dataset id",
  "Complete source dataset id",
  normalizeCompleteTransform,
  "materializeCompleteData"
);
