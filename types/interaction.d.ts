import type { ChartProgram, InputRef } from './program.js';
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
  readonly hit: InteractionHit | null;
  readonly mounted: boolean;
  readonly destroyed: boolean;
}
export interface InteractionEvent {
  readonly type: 'inspect' | 'leave' | 'frame' | 'program' | 'mount' | 'unmount' | 'destroy';
  readonly state: InteractionState;
}
export type InteractionCommand = {
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
export interface InteractionDispatchResult { readonly status: 'applied' | 'queued' | 'stale'; }
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
