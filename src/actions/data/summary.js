import {
  deriveSummaryRows,
  normalizeSummaryTransform
} from "../../grammar/summary.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "groupBy", "aggregates", "members"
]);

export const materializeSummaryData = derivedMaterializer(
  "materializeSummaryData",
  "Materialize one immutable grouped summary dataset.",
  "summary",
  deriveSummaryRows
);

export const createSummaryData = derivedCreator(
  "createSummaryData",
  "Create reusable grouped aggregate values and provenance.",
  OPTIONS,
  "Summary dataset id",
  "Summary source dataset id",
  normalizeSummaryTransform,
  "materializeSummaryData"
);
