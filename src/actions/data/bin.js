import {
  deriveBinRows,
  normalizeBinTransform,
  resolveBinTransform
} from "../../grammar/bin.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "field", "maxBins", "step", "boundaries", "extent",
  "nice", "zero", "includeEmpty", "members", "as"
]);

export const materializeBinData = derivedMaterializer(
  "materializeBinData",
  "Materialize one immutable one-dimensional bin dataset.",
  "bin",
  deriveBinRows,
  resolveBinTransform
);

export const createBinData = derivedCreator(
  "createBinData",
  "Create reusable one-dimensional bin bounds, counts, and members.",
  OPTIONS,
  "Bin dataset id",
  "Bin source dataset id",
  normalizeBinTransform,
  "materializeBinData"
);
