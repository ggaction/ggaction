/** Compile-only proposal examples. Do not execute: these APIs are not implemented. */
import type {
  CreateDataOptions, FilterDataOptions, EditFilteredDataOptions,
  RegressionOptions, RegressionDataOptions, SortedDataOptions,
  DatasetSchema, ProgramInspection
} from "./PROPOSED_TYPES.js";

export const declaredEmpty = {
  id: "data", values: [],
  schema: { fields: [
    { name: "x", storageType: "number" },
    { name: "y", storageType: "number", nullable: true }
  ] }
} satisfies CreateDataOptions;
export const halfOpen = {
  id: "filtered", source: "data", field: "x",
  range: { min: 1, max: 3, minInclusive: true, maxInclusive: false }
} satisfies FilterDataOptions;
export const removeUpper = {
  target: "filtered", range: { max: false }, dependents: "recompute"
} satisfies EditFilteredDataOptions;
export const noIntervalFit = {
  id: "fit", source: "data", x: "x", y: "y",
  interval: false, predict: { values: [1, 1.5, 2] }
} satisfies RegressionDataOptions;
export const following = {
  target: "points", groupBy: false, sourceBinding: "follow",
  interval: false, band: false
} satisfies RegressionOptions;
export const sorted = {
  id: "sorted", source: "data",
  sortBy: [{ field: "group" }, { field: "x", order: "descending", nulls: "last" }]
} satisfies SortedDataOptions;
export const unknownSchema = {
  version: 1, origin: "inferred", completeness: "unknown", fields: []
} satisfies DatasetSchema;

// @ts-expect-error interval false cannot explicitly request a confidence level
export const badInterval: RegressionDataOptions = { id: "fit", x: "x", y: "y", interval: false, level: 0.95 };
// @ts-expect-error interval false cannot explicitly create a band
export const badBand: RegressionOptions = { target: "points", interval: false, band: {} };
// @ts-expect-error empty sortBy has no defined ordering contract
export const badSort: SortedDataOptions = { id: "sorted", sortBy: [] };
// @ts-expect-error legacy inclusive cannot be mixed with endpoint flags
export const badRange: FilterDataOptions = { id: "f", field: "x", range: { min: 1, inclusive: true, maxInclusive: false } };
// @ts-expect-error min false is an edit-only sentinel
export const badCreateRange: FilterDataOptions = { id: "f", field: "x", range: { min: false, max: 3 } };
// @ts-expect-error oneOf and noneOf cannot coexist
export const badModes: FilterDataOptions = { id: "f", field: "x", oneOf: [1], noneOf: [2] };
// @ts-expect-error inspection does not decide whether the host may commit
export const noCommitPolicy = (report: ProgramInspection): boolean => report.mayCommit;
