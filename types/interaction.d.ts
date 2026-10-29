import type { ChartProgram, InputRef, MarkSelectionSelector, ScopedActionTarget } from './program.js';
import type { BasicChartProgram } from './basic.js';
export type InteractionProgram = ChartProgram | BasicChartProgram;
import type { CanvasTransitionScene } from './scene.js';
export interface InteractionPoint { readonly x: number; readonly y: number; }
/** Explicit local-to-CSS affine matrix [a,b,c,d,e,f]; no device pixel ratio. */
export type InteractionTransform = readonly [number, number, number, number, number, number];
export interface HitCandidate {
  readonly itemKey: string;
  readonly ownerId: string;
  readonly role: string;
  readonly childPath: readonly string[];
  readonly rowKeys: readonly string[];
  readonly resourceRefs: readonly InputRef[];
  readonly screenPoint: InteractionPoint;
  readonly localPoint: InteractionPoint;
  readonly distance: number;
  readonly zIndex: number;
}
export interface InteractionHit {
  readonly target: HitCandidate | null;
  readonly candidates: readonly HitCandidate[];
  readonly diagnostics: readonly { readonly code: string; readonly transformIndex?: number; readonly itemKey?: string }[];
  readonly statistics: { readonly visited: number; readonly tested: number; readonly work: number };
  readonly frameVersion: number;
}
export interface InspectBinding {
  readonly type: 'inspect';
  readonly events?: readonly ('pointermove' | 'click')[];
  readonly slop?: number;
  readonly hitInvisible?: boolean;
}
export interface InteractionState {
  readonly program: InteractionProgram;
  readonly scene: CanvasTransitionScene;
  readonly frameVersion: number;
  readonly generation: number;
  /** Session-local committed program revision; inspection and frames do not increment it. */
  readonly revision: number;
  readonly hit: InteractionHit | null;
  readonly mounted: boolean;
  readonly destroyed: boolean;
}
export interface InteractionLifecycleEvent {
  readonly type: 'inspect' | 'leave' | 'frame' | 'program' | 'mount' | 'unmount' | 'destroy';
  readonly state: InteractionState;
}
/** One explicit owner; a facet edit addresses its retained source, never a generated cell. */
export type InteractionTarget = string | (Readonly<ScopedActionTarget> & { readonly id: string });
export interface InteractionTransaction {
  readonly transactionId?: string;
  readonly origin?: 'user' | 'programmatic' | 'replay' | 'linked';
  readonly causeTransactionId?: string;
}
export type InteractionEditCommand = InteractionTransaction & ({
  readonly type: 'select';
  readonly target: InteractionTarget;
  readonly payload: {
    readonly id: string;
    readonly select: MarkSelectionSelector;
    /** Creation requires replace; other modes require an existing selection. */
    readonly mode?: 'replace' | 'add' | 'toggle' | 'subtract' | 'intersect';
  };
} | {
  readonly type: 'clearSelection';
  readonly target: InteractionTarget;
  readonly payload: { readonly id: string };
} | {
  readonly type: 'setParameter';
  readonly target: InteractionTarget;
  readonly payload: { readonly value: number | string | boolean | null };
});
export interface InteractionTransactionEvent {
  readonly type: 'select' | 'clearSelection' | 'setParameter';
  readonly transactionId: string;
  readonly origin: 'user' | 'programmatic' | 'replay' | 'linked';
  readonly causeTransactionId?: string;
  readonly phase: 'commit' | 'settled' | 'error';
  readonly revision: number;
  readonly affectedOwners: readonly (Readonly<ScopedActionTarget> & { readonly id: string })[];
  readonly previous: InteractionProgram;
  readonly current: InteractionProgram;
  readonly diagnostics: readonly { readonly code: string; readonly message: string }[];
  readonly state: InteractionState;
}
export type InteractionEvent = InteractionLifecycleEvent | InteractionTransactionEvent;
export type InteractionCommand = InteractionEditCommand | {
  readonly type: 'inspect';
  /** CSS-local point, after subtracting the host client rectangle. */
  readonly point: InteractionPoint;
  readonly pointerType?: 'mouse' | 'pen' | 'touch';
  readonly slop?: number;
  readonly hitInvisible?: boolean;
} | { readonly type: 'leave' } | {
  readonly type: 'frame';
  /** Sampled scene containing only current program node keys and unchanged topology. */
  readonly scene: CanvasTransitionScene;
  readonly version: number;
  readonly generation: number;
};
export interface InteractionDispatchResult { readonly status: 'applied' | 'queued' | 'stale' | 'unchanged'; }
export interface InteractionSession {
  mount(element: Element, options?: { readonly rootTransform?: InteractionTransform }): () => boolean;
  updateProgram(program: InteractionProgram): InteractionDispatchResult;
  dispatch(command: InteractionCommand): InteractionDispatchResult;
  subscribe(listener: (event: InteractionEvent) => void): () => boolean;
  getState(): InteractionState;
  destroy(): boolean;
}
export declare function createInteractionSession(options: {
  readonly program: InteractionProgram;
  /** Omission enables pointermove and click inspection; [] enables headless dispatch only. */
  readonly bindings?: readonly InspectBinding[];
}): InteractionSession;
