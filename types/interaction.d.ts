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
export interface ClickSelectionBinding {
  readonly type: 'select';
  /** Existing authored selection on an explicit root or concat mark owner. */
  readonly target: InteractionTarget;
  readonly selection: string;
  readonly mode?: 'replace' | 'toggle';
  readonly onMiss?: 'clear' | 'ignore';
  readonly slop?: number;
  readonly hitInvisible?: boolean;
}
interface RegionSelectionBindingOptions {
  readonly target: InteractionTarget;
  readonly selection: string;
  readonly mode?: 'replace' | 'add' | 'toggle' | 'subtract' | 'intersect';
}
export type BrushSelectionBinding = RegionSelectionBindingOptions & { readonly type: 'brush' } & (
  { readonly axis?: 'xy'; readonly channels?: { readonly x?: 'x' | 'x2'; readonly y?: 'y' | 'y2' } }
  | { readonly axis: 'x'; readonly channels?: { readonly x?: 'x' | 'x2'; readonly y?: never } }
  | { readonly axis: 'y'; readonly channels?: { readonly y?: 'y' | 'y2'; readonly x?: never } }
);
export interface LassoSelectionBinding extends RegionSelectionBindingOptions {
  readonly type: 'lasso';
}
export type SelectionProjection = {
  readonly type: 'rows';
  readonly sourceData: string;
  readonly targetData: string;
} | {
  readonly type: 'fields';
  readonly sourceFields: readonly string[];
  readonly targetFields: readonly string[];
};
export interface LinkedSelectionSource {
  readonly target: InteractionTarget;
  readonly selection: string;
  readonly projection: SelectionProjection;
}
export interface LinkedSelectionBinding {
  readonly type: 'linkSelection';
  readonly id: string;
  readonly sources: readonly LinkedSelectionSource[];
  readonly target: InteractionTarget;
  readonly selection: string;
  /** global requires exactly one source owner. */
  readonly resolve: 'union' | 'intersection' | 'global';
}
export type SelectionPolicy = 'keep-hidden' | 'drop';
export interface SelectionChange {
  readonly target: Readonly<ScopedActionTarget> & { readonly id: string };
  readonly selection: string;
  readonly policy: SelectionPolicy;
  readonly ownerMissing: boolean;
  readonly hiddenKeys: readonly string[];
  readonly restoredKeys: readonly string[];
  readonly droppedKeys: readonly string[];
}
export interface LinkedSelectionState {
  readonly id: string;
  readonly target: Readonly<ScopedActionTarget> & { readonly id: string };
  readonly selection: string;
  readonly resolve: 'union' | 'intersection' | 'global';
  readonly targetAvailable: boolean;
  readonly sources: readonly {
    readonly available: boolean;
    readonly target: Readonly<ScopedActionTarget> & { readonly id: string };
    readonly selection: string;
    /** Logical keys projected into the target owner, with its child namespace. */
    readonly keys: readonly string[];
  }[];
  readonly keys: readonly string[];
}
export interface InteractionState {
  readonly program: InteractionProgram;
  /** Separate transient selection rendering. Null outside an active preview. */
  readonly previewProgram: InteractionProgram | null;
  readonly scene: CanvasTransitionScene;
  readonly frameVersion: number;
  readonly generation: number;
  /** Session-local committed program revision; inspection and frames do not increment it. */
  readonly revision: number;
  readonly hit: InteractionHit | null;
  readonly linkedSelections: readonly LinkedSelectionState[];
  readonly mounted: boolean;
  readonly destroyed: boolean;
}
export interface InteractionLifecycleEvent {
  readonly type: 'inspect' | 'leave' | 'frame' | 'mount' | 'unmount' | 'destroy';
  readonly state: InteractionState;
}
/** One explicit owner; a facet edit addresses its retained source, never a generated cell. */
export type InteractionTarget = string | (Readonly<ScopedActionTarget> & { readonly id: string });
export interface InteractionTransaction {
  readonly transactionId?: string;
  readonly origin?: 'user' | 'programmatic' | 'replay' | 'linked';
  readonly causeTransactionId?: string;
}
export type NearestSelection = {
  readonly space: 'screen';
  /** CSS-local point in the current accepted frame. */
  readonly point: InteractionPoint;
  readonly maxDistance: number;
  readonly hitInvisible?: boolean;
} | {
  readonly space: 'data';
  readonly fields: readonly string[];
  readonly values: readonly number[];
  readonly metric: 'euclidean' | 'manhattan';
  readonly maxDistance: number;
};
export type InteractionSelectionPayload = {
  readonly id: string;
  /** Creation requires replace; other modes require an existing selection. */
  readonly mode?: 'replace' | 'add' | 'toggle' | 'subtract' | 'intersect';
} & ({ readonly select: MarkSelectionSelector; readonly nearest?: never }
  | { readonly nearest: NearestSelection; readonly select?: never });
export type InteractionEditCommand = InteractionTransaction & ({
  readonly type: 'select';
  readonly target: InteractionTarget;
  readonly payload: InteractionSelectionPayload;
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
  readonly phase: 'preview' | 'commit' | 'settled' | 'cancel' | 'error';
  readonly revision: number;
  readonly affectedOwners: readonly (Readonly<ScopedActionTarget> & { readonly id: string })[];
  readonly previous: InteractionProgram;
  readonly current: InteractionProgram;
  readonly diagnostics: readonly { readonly code: string; readonly message: string }[];
  readonly selectionChanges: readonly SelectionChange[];
  readonly state: InteractionState;
}
export interface InteractionProgramEvent {
  readonly type: 'program';
  readonly state: InteractionState;
  readonly selectionChanges: readonly SelectionChange[];
}
export type InteractionEvent = InteractionLifecycleEvent | InteractionProgramEvent | InteractionTransactionEvent;
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
  /** Removed final items remain selected by default; drop snapshots surviving membership. */
  readonly selectionPolicy?: SelectionPolicy;
  /** Omission enables pointermove and click inspection; [] enables headless dispatch only. */
  readonly bindings?: readonly (InspectBinding | ClickSelectionBinding | BrushSelectionBinding | LassoSelectionBinding | LinkedSelectionBinding)[];
}): InteractionSession;
