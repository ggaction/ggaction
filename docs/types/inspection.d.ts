import type { BasicChartProgram } from "./basic.js";
import type { ChartProgram, DatasetSchema, InputRowRef, StoredResourceKind, PartitionViewState } from "./program.js";
export type ProgramInput = ChartProgram | BasicChartProgram;
export interface ResourceRef { readonly kind: "data" | "mark" | "scale" | "coordinate" | "guide" | "canvas" | "composition" | StoredResourceKind; readonly id: string; readonly childPath?: readonly string[]; }
export interface InspectionTarget { readonly kind: "data" | "mark" | "scale" | "coordinate" | "guide" | StoredResourceKind; readonly id: string; readonly childPath?: readonly string[]; }
export interface Finding { readonly severity: "error" | "warning" | "info"; readonly code: string; readonly reason: string; readonly message: string; readonly resource?: ResourceRef; readonly optionPath?: string; }
export interface CheckResult { readonly name: string; readonly status: "not_run" | "passed" | "failed" | "not_applicable"; readonly evidencePaths: readonly string[]; readonly findings: readonly Finding[]; }
export interface ParameterDefinition { readonly path: string; readonly kind: "field" | "enum" | "number" | "string" | "boolean" | "range" | "array" | "object" | "resource"; readonly required: boolean; readonly active: boolean; readonly choices?: readonly (string | number | boolean | null)[]; readonly minimum?: number; readonly maximum?: number; readonly unit?: string; readonly fieldRole?: string; }
export interface ActionDescription { readonly version: 1; readonly action: string; readonly applicability: "supported" | "needs-input" | "incompatible" | "unsupported" | "unverified"; readonly parameterDefinitions: readonly ParameterDefinition[]; readonly requirements: readonly { readonly reason: string; readonly optionPath?: string }[]; readonly checks: readonly CheckResult[]; readonly findings: readonly Finding[]; }
export interface Change { readonly resource: ResourceRef; readonly operation: "add" | "remove" | "modify"; readonly effect: "data" | "binding" | "structure" | "scale" | "guide" | "style"; readonly roles: readonly string[]; }
export interface ProgramComparison { readonly version: 1; readonly equivalence: "equal" | "different" | "unknown"; readonly completeProgramComparison: boolean; readonly changes: readonly Change[]; readonly affected: readonly ResourceRef[]; readonly findings: readonly Finding[]; }
export interface PartitionInspection {
  readonly focusKey: string | null; readonly breadcrumbKeys: readonly string[]; readonly levels: number;
  readonly diagnostics: Readonly<{emptyHierarchy:boolean;emptyValue:boolean;emptyChildrenView:boolean}>;
  readonly recovery?: PartitionViewState["recovery"];
}
export interface PartitionNavigation {
  readonly key: string; readonly parent: string | null; readonly firstChild: string | null;
  readonly previousSibling: string | null; readonly nextSibling: string | null; readonly root: string | null;
}
export interface OwnerInspection { readonly partition?: PartitionInspection; readonly owner: ResourceRef; readonly grain: "item" | "series" | "composite" | "unknown"; readonly rawRows: number | null; readonly logicalDataItems: number | null; readonly drawablePrimitives: number | null; readonly visibleCandidates: number | null; readonly flags: readonly { readonly reason: "opacity-zero" | "zero-size" | "outside-clip" | "missing-skipped"; readonly count: number | null }[]; readonly bounds: Readonly<{x:number;y:number;width:number;height:number}> | null; readonly sourceRefs: readonly ResourceRef[]; readonly checks: readonly CheckResult[]; }
export interface ProgramInspection { readonly version: 1; readonly views: readonly OwnerInspection[]; readonly calculations: readonly unknown[]; readonly checks: readonly CheckResult[]; readonly findings: readonly Finding[]; readonly coverage: Readonly<{partial:boolean;unsupported:readonly ResourceRef[]}>; }
export function getDatasetSchema(program: ProgramInput, options: {readonly data:string;readonly childPath?:readonly string[]}): Readonly<{data:string;schema:DatasetSchema}>;
export function describeAction(program: ProgramInput, options: {readonly action:string;readonly target?:InspectionTarget;readonly options?:Readonly<Record<string,unknown>>}): ActionDescription;
export function comparePrograms(before: ProgramInput, after: ProgramInput, options?: {readonly target?:InspectionTarget}): ProgramComparison;
export function inspectProgram(program: ProgramInput, options?: {readonly target?:InspectionTarget}): ProgramInspection;

export interface PlotCompositionChannel {
  readonly field?: string;
  readonly fields?: readonly string[];
  readonly fieldType: string;
  readonly scale: string;
  readonly data: string;
  readonly measurement: Readonly<{ unit: string; operations: readonly string[]; parameters?: Readonly<Record<string, unknown>> }>;
  readonly bin?: Readonly<Record<string, unknown>>;
  readonly temporalUnit?: string;
}
export interface PlotComposition {
  readonly version: 1;
  readonly owner: string;
  readonly ownedMarks: readonly string[];
  readonly data: string;
  readonly coordinate?: Readonly<{ id: string; type: string }>;
  readonly mark: string;
  readonly channels: Readonly<Record<string, PlotCompositionChannel>>;
  readonly dimensions?: readonly PlotCompositionChannel[];
  readonly role?: string;
  readonly groupBy?: string | readonly string[];
}
export function getPlotComposition(program: ProgramInput, options?: { readonly target?: string | { readonly childPath: readonly string[]; readonly id: string }; readonly childPath?: readonly string[] }): PlotComposition;

export interface MarkItemInspection {
  readonly visible?: boolean; readonly navigation?: PartitionNavigation;
  readonly key: string; readonly target: string; readonly markType: string; readonly grain: "item" | "stack";
  readonly fields: Readonly<Record<string, unknown>>; readonly channels: Readonly<Record<string, unknown>>;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly geometry: readonly {readonly type: string; readonly properties: Readonly<Record<string, unknown>>}[];
  readonly rows: readonly (InputRowRef & { readonly index: number })[];
  readonly bounds: Readonly<{left:number;top:number;right:number;bottom:number}> | null;
}
export function getMarkItems(program: ProgramInput, options?: {target?: string | {childPath?:readonly string[];id:string};grain?:"item"|"stack"}): readonly MarkItemInspection[];
export interface ExpressionFunctionDescriptor {
  readonly name: import("./program.js").ExpressionCall["name"];
  readonly min: number;
  readonly max: number;
  readonly inputs: readonly ("number" | "string" | "boolean" | "array")[];
  readonly output: "number" | "string" | "boolean" | "unknown";
  readonly options?: "angle" | "parse" | "part" | "floor";
  readonly lazy?: true;
}
export function getExpressionFunctions(options?: { readonly registry?: "standard@1" }): readonly ExpressionFunctionDescriptor[];
