import { deriveSortedRows, normalizeSortTransform } from "../../grammar/sort.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze(["id", "source", "sortBy"]);

export const materializeSortedData = /* @__PURE__ */ derivedMaterializer(
  "materializeSortedData",
  "Materialize one immutable stable sorted dataset.",
  "sort",
  deriveSortedRows
);

export const createSortedData = /* @__PURE__ */ derivedCreator(
  "createSortedData",
  "Create reusable rows in a stable explicit order.",
  OPTIONS,
  "Sorted dataset id",
  "Sorted source dataset id",
  normalizeSortTransform,
  "materializeSortedData"
);
