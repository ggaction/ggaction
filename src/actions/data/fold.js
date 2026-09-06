import {
  deriveFoldRows,
  normalizeFoldTransform
} from "../../grammar/fold.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze(["id", "source", "fields", "as"]);

export const materializeFoldData = derivedMaterializer(
  "materializeFoldData",
  "Materialize one immutable wide-to-long dataset.",
  "fold",
  deriveFoldRows
);

export const createFoldData = derivedCreator(
  "createFoldData",
  "Create reusable key/value rows from selected wide fields.",
  OPTIONS,
  "Fold dataset id",
  "Fold source dataset id",
  normalizeFoldTransform,
  "materializeFoldData"
);
