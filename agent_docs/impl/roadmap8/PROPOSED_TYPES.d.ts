/** Roadmap 8 revision 2: REVIEW-ONLY declarations. Not a published package API. */
import type {
  ChartProgram,
  ConfidenceIntervalMethod,
  RegressionOptions as CurrentRegressionOptions,
  RegressionBandOptions,
  SummaryDataOptions as CurrentSummaryDataOptions,
  BinDataOptions as CurrentBinDataOptions,
  DensityDataOptions as CurrentDensityDataOptions,
  IntervalDataOptions as CurrentIntervalDataOptions
} from "../../../types/program.js";
import type { BasicChartProgram } from "../../../types/basic.js";

export type Scalar = string | number | boolean | null;
export type StorageType = "number" | "string" | "boolean" | "array" | "object" | "unknown" | "mixed";
export interface SourceFieldInput {
  readonly name: string;
  readonly storageType: Exclude<StorageType, "unknown" | "mixed">;
  readonly nullable?: boolean;
  readonly optional?: boolean;
}
export interface SourceSchemaInput { readonly fields: readonly SourceFieldInput[] }
export interface FieldLineage {
  readonly inputs: readonly { readonly data: string; readonly field: string }[];
  readonly owner: string;
  readonly role: string;
}
export interface FieldSchema {
  readonly name: string;
  readonly storageType: StorageType;
  readonly nullable: boolean;
  readonly optional: boolean;
  readonly lineage?: FieldLineage;
}
export interface DatasetSchema {
  readonly version: 1;
  readonly completeness: "known" | "unknown";
  readonly origin: "declared" | "inferred" | "derived";
  readonly fields: readonly FieldSchema[];
}
export interface CreateDataOptions {
  readonly id?: string;
  readonly values: readonly Readonly<Record<string, unknown>>[];
  readonly schema?: SourceSchemaInput;
}
export interface ReviseDataOptions extends Omit<CreateDataOptions, "id"> {
  readonly source: string;
  readonly id: string;
}
export interface EmptyDomainOptions { readonly emptyDomain?: "preserve" | "require-explicit" }
/** New skip applies only to independent item families; path break remains distinct. */
export type ItemMissingPolicy = "error" | "skip";
export type PathMissingPolicy = "error" | "break";
export type StatisticalMissing = "error" | "drop";
export interface StatisticalPolicyOptions { readonly missing?: StatisticalMissing }
export interface SummaryPolicyOptions extends StatisticalPolicyOptions {
  readonly empty?: "null" | "identity";
}
export type SummaryDataOptions = CurrentSummaryDataOptions & SummaryPolicyOptions;
export type BinDataOptions = CurrentBinDataOptions & StatisticalPolicyOptions;
export type DensityDataOptions = CurrentDensityDataOptions & StatisticalPolicyOptions;
export type IntervalDataOptions = CurrentIntervalDataOptions & StatisticalPolicyOptions;

export type Bound = number | string;
type RangeBounds =
  | { readonly min: Bound; readonly max?: Bound }
  | { readonly min?: Bound; readonly max: Bound };
type RangeClosure =
  | { readonly inclusive?: boolean; readonly minInclusive?: never; readonly maxInclusive?: never }
  | { readonly inclusive?: never; readonly minInclusive?: boolean; readonly maxInclusive?: boolean };
/** Runtime also checks that a closure flag has its corresponding bound. */
export type FilterRange = RangeBounds & RangeClosure;
export type FilterComparison =
  | { readonly op: "eq" | "neq"; readonly value: unknown }
  | { readonly op: "lt" | "lte" | "gt" | "gte"; readonly value: Bound };
export type FilterMode =
  | { readonly oneOf: readonly [Scalar, ...Scalar[]]; readonly noneOf?: never; readonly predicate?: never; readonly range?: never }
  | { readonly noneOf: readonly [Scalar, ...Scalar[]]; readonly oneOf?: never; readonly predicate?: never; readonly range?: never }
  | { readonly predicate: FilterComparison; readonly oneOf?: never; readonly noneOf?: never; readonly range?: never }
  | { readonly range: FilterRange; readonly oneOf?: never; readonly noneOf?: never; readonly predicate?: never };
export type FilterDataOptions = FilterMode & {
  readonly id: string;
  readonly source?: string;
  readonly field: string;
  readonly nulls?: "include" | "exclude";
};
export type FilterRangePatch = RangeClosure & {
  readonly min?: Bound | false;
  readonly max?: Bound | false;
};
export type FilterModePatch =
  | { readonly oneOf: readonly [Scalar, ...Scalar[]]; readonly noneOf?: never; readonly predicate?: never; readonly range?: never }
  | { readonly noneOf: readonly [Scalar, ...Scalar[]]; readonly oneOf?: never; readonly predicate?: never; readonly range?: never }
  | { readonly predicate: FilterComparison; readonly oneOf?: never; readonly noneOf?: never; readonly range?: never }
  | { readonly range: FilterRangePatch; readonly oneOf?: never; readonly noneOf?: never; readonly predicate?: never }
  | { readonly oneOf?: never; readonly noneOf?: never; readonly predicate?: never; readonly range?: never };
/** Runtime requires a complete new mode if field changes, and rejects an empty edit. */
export type EditFilteredDataOptions = FilterModePatch & {
  readonly target: string;
  readonly field?: string;
  readonly nulls?: "include" | "exclude" | false;
  readonly dependents?: "reject" | "recompute";
};
export type PredictOptions =
  | { readonly values: readonly [number, ...number[]]; readonly domain?: never; readonly steps?: never }
  | { readonly values?: never; readonly domain: readonly [number, number]; readonly steps: number };
type IntervalOff = {
  readonly interval: false;
  readonly confidenceMethod?: never;
  readonly level?: never;
  readonly confidence?: never;
};
type IntervalOn = {
  readonly interval?: "mean" | "prediction";
  readonly confidenceMethod?: ConfidenceIntervalMethod;
  readonly level?: number;
  readonly confidence?: number;
};
type ParametricModel =
  | { readonly method?: "linear"; readonly degree?: never; readonly span?: never }
  | { readonly method: "polynomial"; readonly degree?: number; readonly span?: never };
type LoessModel = {
  readonly method: "loess";
  readonly span?: number;
  readonly degree?: never;
  readonly interval?: never;
  readonly confidenceMethod?: never;
  readonly level?: never;
  readonly confidence?: never;
};
export type RegressionParameters = ((ParametricModel & (IntervalOff | IntervalOn)) | LoessModel) & {
  readonly predict?: PredictOptions;
  readonly missing?: StatisticalMissing;
};
export type RegressionDataOptions = RegressionParameters & {
  readonly id: string;
  readonly source?: string;
  readonly x: string;
  readonly y: string;
  readonly groupBy?: string;
};
type RegressionAppearance = {
  readonly target?: string;
  readonly x?: string;
  readonly y?: string;
  readonly groupBy?: string | false;
  readonly sourceBinding?: "fixed" | "follow";
  readonly line?: CurrentRegressionOptions["line"];
  readonly predict?: PredictOptions;
  readonly missing?: StatisticalMissing;
};
export type RegressionOptions = RegressionAppearance & (
  | (ParametricModel & IntervalOff & { readonly band?: false })
  | (ParametricModel & IntervalOn & { readonly band?: false | RegressionBandOptions })
  | (LoessModel & { readonly band?: false })
);
/** Patch-specific validation distinguishes explicit conflict from inherited metadata. */
export type EditRegressionOptions = Omit<RegressionAppearance, "predict"> & {
  readonly data?: string;
  readonly method?: "linear" | "polynomial" | "loess";
  readonly degree?: number;
  readonly span?: number;
  readonly predict?: PredictOptions | false;
} & (
  | (IntervalOff & { readonly band?: false })
  | (IntervalOn & { readonly band?: false | RegressionBandOptions })
);
export interface FollowingRegressionBinding {
  readonly mode: "follow";
  readonly roles: readonly ["data", "x", "y"];
}
export interface SortKey {
  readonly field: string;
  readonly order?: "ascending" | "descending";
  readonly nulls?: "first" | "last";
  readonly temporalUnit?: "year" | "timestamp";
}
export interface SortedDataOptions {
  readonly id: string;
  readonly source?: string;
  readonly sortBy: readonly [SortKey, ...SortKey[]];
}
export interface EditSortedDataOptions {
  readonly target: string;
  readonly sortBy: readonly [SortKey, ...SortKey[]];
  readonly dependents?: "reject" | "recompute";
}
export interface DatasetSortTransform {
  readonly type: "sort";
  readonly sortBy: readonly {
    readonly field: string;
    readonly order: "ascending" | "descending";
    readonly nulls: "first" | "last";
    readonly temporalUnit?: "year" | "timestamp";
  }[];
}
export interface ResourceRef {
  readonly kind: "data" | "mark" | "scale" | "coordinate" | "guide";
  readonly id: string;
  readonly childPath?: readonly string[];
}
export interface Finding {
  readonly severity: "error" | "warning" | "info";
  readonly code: string;
  readonly reason: string;
  readonly message: string;
  readonly resource?: ResourceRef;
  readonly optionPath?: string;
}
export type CheckStatus = "not_run" | "passed" | "failed" | "not_applicable";
export interface CheckResult {
  readonly name: string;
  readonly status: CheckStatus;
  readonly evidencePaths: readonly string[];
  readonly findings: readonly Finding[];
}
export interface ParameterDefinition {
  readonly path: string;
  readonly kind: "field" | "enum" | "number" | "string" | "boolean" | "range" | "array" | "object" | "resource";
  readonly required: boolean;
  readonly active: boolean;
  readonly choices?: readonly Scalar[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly unit?: string;
  readonly fieldRole?: string;
}
export interface ActionDescription {
  readonly version: 1;
  readonly action: string;
  readonly applicability: "supported" | "needs-input" | "incompatible" | "unsupported" | "unverified";
  readonly parameterDefinitions: readonly ParameterDefinition[];
  readonly requirements: readonly { readonly reason: string; readonly optionPath?: string }[];
  readonly checks: readonly CheckResult[];
  readonly findings: readonly Finding[];
}
export interface CalculationUnit {
  readonly role: string;
  readonly group: Readonly<Record<string, Scalar>>;
  readonly inputRows: number;
  readonly usedRows: number;
  readonly excludedRows: number;
  readonly excludedByReason: Readonly<Partial<Record<"missing-value" | "missing-weight" | "outside-domain", number>>>;
  readonly zeroWeightRows?: number;
}
export interface CalculationReport {
  readonly version: 1;
  readonly owner: ResourceRef;
  readonly inputs: readonly ResourceRef[];
  readonly units: readonly CalculationUnit[];
}
export interface Change {
  readonly resource: ResourceRef;
  readonly operation: "add" | "remove" | "modify";
  readonly effect: "data" | "binding" | "structure" | "scale" | "guide" | "style";
  readonly roles: readonly string[];
}
export interface ProgramComparison {
  readonly version: 1;
  readonly equivalence: "equal" | "different" | "unknown";
  readonly completeProgramComparison: boolean;
  readonly changes: readonly Change[];
  readonly affected: readonly ResourceRef[];
  readonly findings: readonly Finding[];
}
export interface OwnerInspection {
  readonly owner: ResourceRef;
  readonly grain: "item" | "series" | "composite" | "unknown";
  readonly rawRows: number | null;
  readonly logicalDataItems: number | null;
  readonly drawablePrimitives: number | null;
  readonly visibleCandidates: number | null;
  readonly flags: readonly {
    readonly reason: "opacity-zero" | "zero-size" | "outside-clip" | "missing-skipped";
    readonly count: number | null;
  }[];
  readonly bounds: Readonly<{ x: number; y: number; width: number; height: number }> | null;
  readonly sourceRefs: readonly ResourceRef[];
  readonly checks: readonly CheckResult[];
}
export interface ProgramInspection {
  readonly version: 1;
  readonly views: readonly OwnerInspection[];
  readonly calculations: readonly CalculationReport[];
  readonly checks: readonly CheckResult[];
  readonly findings: readonly Finding[];
  readonly coverage: Readonly<{ partial: boolean; unsupported: readonly ResourceRef[] }>;
}
/** The following signatures are review-only and do not resolve from ggaction 0.0.16. */
export type ProgramInput = ChartProgram | BasicChartProgram;
export declare function getDatasetSchema(program: ProgramInput, options: { readonly data: string; readonly childPath?: readonly string[] }): Readonly<{ data: string; schema: DatasetSchema }>;
export declare function describeAction(program: ProgramInput, options: { readonly action: string; readonly target?: ResourceRef; readonly options?: Readonly<Record<string, unknown>> }): ActionDescription;
export declare function comparePrograms(before: ProgramInput, after: ProgramInput, options?: { readonly target?: ResourceRef }): ProgramComparison;
export declare function inspectProgram(program: ProgramInput, options?: { readonly target?: ResourceRef }): ProgramInspection;
