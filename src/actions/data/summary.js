import {
  deriveSummaryRows,
  normalizeSummaryTransform
} from "../../grammar/summary.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "groupBy", "aggregates", "members", "weight", "missing", "empty"
]);

export const materializeSummaryData = /* @__PURE__ */ derivedMaterializer(
  "materializeSummaryData",
  "Materialize one immutable grouped summary dataset.",
  "summary",
  deriveSummaryRows
);

export const createSummaryData = /* @__PURE__ */ derivedCreator(
  "createSummaryData",
  "Create reusable grouped aggregate values and provenance.",
  OPTIONS,
  "Summary dataset id",
  "Summary source dataset id",
  normalizeSummaryTransform,
  "materializeSummaryData"
);
