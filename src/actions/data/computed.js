import {
  deriveComputedRows,
  normalizeComputedTransform
} from "../../grammar/computed.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze(["id", "source", "as", "expression"]);

export const materializeComputedData = derivedMaterializer(
  "materializeComputedData",
  "Materialize one immutable row-level arithmetic dataset.",
  "computed",
  deriveComputedRows
);

export const createComputedData = derivedCreator(
  "createComputedData",
  "Create a finite computed field from a closed arithmetic expression.",
  OPTIONS,
  "Computed dataset id",
  "Computed source dataset id",
  normalizeComputedTransform,
  "materializeComputedData"
);
