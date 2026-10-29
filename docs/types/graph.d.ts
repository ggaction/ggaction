import type { ChartProgram, BundleGraphEdgesOptions, EditEdgeRouteOptions, PreparedGraphEdgeRoutes, EdgeRouteResult, InputRef } from "./program.js";
export type { PreparedGraphEdgeRoutes } from "./program.js";

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
/** A browser Worker satisfies this protocol. One request owns one worker until completion, error or cancellation. */
export interface GraphRouteWorker {
  postMessage(message: { readonly job: GraphRouteJob }): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  addEventListener(type: "error", listener: (event: { readonly error: unknown }) => void): void;
  removeEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  removeEventListener(type: "error", listener: (event: { readonly error: unknown }) => void): void;
  terminate(): void;
}
export interface GraphRouteExecutor {
  compute(job: GraphRouteJob, options?: { readonly signal?: AbortSignal }): Promise<GraphRouteCompletion>;
  evict(inputHash?: string): void;
  dispose(): void;
}
export type GraphEdgeRoutesRequest = ({ readonly kind: "create" } & BundleGraphEdgesOptions)
  | ({ readonly kind: "edit" } & EditEdgeRouteOptions);
export interface GraphEdgeRoutesHost { readonly requestToken: string; readonly signal?: AbortSignal; readonly executor?: GraphRouteExecutor; }
export function createGraphRouteExecutor(options?: { readonly createWorker?: () => GraphRouteWorker }): GraphRouteExecutor;
export function computeGraphEdgeRoutes(job: GraphRouteJob, signal?: AbortSignal): GraphRouteCompletion;
export function prepareGraphEdgeRoutes(program: ChartProgram, request: GraphEdgeRoutesRequest, host: GraphEdgeRoutesHost): Promise<PreparedGraphEdgeRoutes>;
