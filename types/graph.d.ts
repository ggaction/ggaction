import type { ChartProgram, BundleGraphEdgesOptions, EditEdgeRouteOptions, PreparedGraphEdgeRoutes, PreparedGraphEdgeRoutesUpdate, EditLayoutOptions, EdgeRouteResult, InputRef } from "./program.js";
export type { PreparedGraphEdgeRoutes, PreparedGraphEdgeRoutesUpdate } from "./program.js";

declare const graphRouteJob: unique symbol;
/** Immutable structured-clone job supplied to the worker by prepareGraphEdgeRoutes. */
export interface GraphRouteJob {
  readonly [graphRouteJob]: true; readonly schemaVersion: 1; readonly algorithmVersion: string;
  readonly inputHash: string; readonly inputs: readonly InputRef[];
}
export interface GraphRouteCompletion {
  readonly inputHash: string; readonly resultHash: string;
  readonly result: EdgeRouteResult & { readonly options: Readonly<Record<string, unknown>> };
}
export interface GraphRouteJobV2 extends Omit<GraphRouteJob, "schemaVersion"> {
  readonly schemaVersion: 2;
}
export interface GraphRouteCompletionV2 extends GraphRouteCompletion {
  readonly schemaVersion: 2;
  readonly result: GraphRouteCompletion["result"] & { readonly diagnostics: EdgeRouteResult["diagnostics"] & { readonly peakBufferBytes: number } };
}
/** A browser Worker satisfies this protocol. One request owns one worker until completion, error or cancellation. */
export interface GraphRouteWorker {
  postMessage(message: { readonly job: GraphRouteJob | GraphRouteJobV2 }): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  addEventListener(type: "error", listener: (event: { readonly error: unknown }) => void): void;
  removeEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  removeEventListener(type: "error", listener: (event: { readonly error: unknown }) => void): void;
  terminate(): void;
}
export interface GraphRouteExecutor {
  compute(job: GraphRouteJob, options?: { readonly signal?: AbortSignal }): Promise<GraphRouteCompletion>;
  compute(job: GraphRouteJobV2, options: { readonly signal?: AbortSignal; readonly deadlineMs: number }): Promise<GraphRouteCompletionV2>;
  evict(inputHash?: string): void;
  dispose(): void;
}
export type GraphEdgeRoutesAuthoringRequest = ({ readonly kind: "create" } & BundleGraphEdgesOptions)
  | ({ readonly kind: "edit" } & EditEdgeRouteOptions);
export interface GraphEdgeRoutesUpdateRequest { readonly kind: "update"; readonly edit: { readonly action: "editLayout"; readonly args: EditLayoutOptions }; }
export type GraphEdgeRoutesRequest = GraphEdgeRoutesAuthoringRequest | GraphEdgeRoutesUpdateRequest;
export type GraphEdgeRoutesHost = { readonly requestToken: string; readonly signal?: AbortSignal } & (
  { readonly executor?: GraphRouteExecutor; readonly deadlineMs?: never }
  | { readonly executor: GraphRouteExecutor; readonly deadlineMs: number }
);
export function createGraphRouteExecutor(options?: { readonly createWorker?: () => GraphRouteWorker }): GraphRouteExecutor;
export function computeGraphEdgeRoutes(job: GraphRouteJob, signal?: AbortSignal): GraphRouteCompletion;
export function computeGraphEdgeRoutesAsync(job: GraphRouteJobV2, signal?: AbortSignal): Promise<GraphRouteCompletionV2>;
export function prepareGraphEdgeRoutes(program: ChartProgram, request: GraphEdgeRoutesAuthoringRequest, host: GraphEdgeRoutesHost): Promise<PreparedGraphEdgeRoutes>;
export function prepareGraphEdgeRoutes(program: ChartProgram, request: GraphEdgeRoutesUpdateRequest, host: { readonly requestToken: string; readonly signal?: AbortSignal; readonly executor: GraphRouteExecutor; readonly deadlineMs: number }): Promise<PreparedGraphEdgeRoutesUpdate>;

import type { CreateInferredGraphDataOptions, EditInferredGraphDataOptions, PreparedInferredGraphData, GraphModel, GraphInferenceDiagnostics } from "./program.js";
export type { PreparedInferredGraphData } from "./program.js";
declare const graphInferenceJob: unique symbol;
/** Deep-owned job supplied by preparation; send it to the trusted inference worker unchanged. */
export interface GraphInferenceJob {
  readonly [graphInferenceJob]: true; readonly schemaVersion: 1; readonly algorithmVersion: "1";
  readonly inputHash: string; readonly inputs: readonly InputRef[];
}
export interface GraphInferenceCompletion {
  readonly schemaVersion: 1; readonly complete: true; readonly inputHash: string; readonly resultHash: string;
  readonly result: { readonly model: GraphModel<"inferred">; readonly diagnostics: GraphInferenceDiagnostics };
}
/** Each request owns a fresh worker. No cache or implicit queue is retained. */
export interface GraphInferenceWorker {
  postMessage(message: { readonly job: GraphInferenceJob }): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  addEventListener(type: "error", listener: (event: { readonly error: unknown }) => void): void;
  removeEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  removeEventListener(type: "error", listener: (event: { readonly error: unknown }) => void): void;
  terminate(): void;
}
export interface GraphInferenceExecutor {
  compute(job: GraphInferenceJob, options?: { readonly signal?: AbortSignal }): Promise<GraphInferenceCompletion>;
  dispose(): void;
}
export type InferredGraphRequest = ({ readonly kind: "create" } & CreateInferredGraphDataOptions)
  | ({ readonly kind: "edit" } & EditInferredGraphDataOptions);
export interface InferredGraphHost {
  readonly executor: GraphInferenceExecutor; readonly requestToken: string; readonly signal?: AbortSignal;
}
export function createGraphInferenceExecutor(options: { readonly createWorker: () => GraphInferenceWorker }): GraphInferenceExecutor;
export function computeGraphInference(job: GraphInferenceJob, signal?: AbortSignal): GraphInferenceCompletion;
export function prepareInferredGraphData(program: ChartProgram, request: InferredGraphRequest, host: InferredGraphHost): Promise<PreparedInferredGraphData>;
