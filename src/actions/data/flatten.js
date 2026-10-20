import { deriveFlattenRows, normalizeFlattenTransform } from "../../grammar/flatten.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze(["id", "source", "fields", "as"]);
export const materializeFlattenData = /* @__PURE__ */ derivedMaterializer(
  "materializeFlattenData",
  "Materialize aligned array elements as immutable rows.",
  "flatten",
  deriveFlattenRows
);
export const createFlattenData = /* @__PURE__ */ derivedCreator(
  "createFlattenData",
  "Expand parallel array fields in source-row and array-index order.",
  OPTIONS,
  "Flatten dataset id",
  "Flatten source dataset id",
  normalizeFlattenTransform,
  "materializeFlattenData"
);
