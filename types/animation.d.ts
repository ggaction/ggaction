import type { ChartProgram } from './program.js';
import type { BasicChartProgram } from './basic.js';
import type { CanvasTransitionScene, BatchedTransitionScene } from './scene.js';

declare const transitionPlan: unique symbol;
declare const transitionFrame: unique symbol;
export type AnimationProgram = ChartProgram | BasicChartProgram;
export type AnimationEasing = 'linear' | 'cubic-in-out';
export interface AnimationKeyframe<Value> {
  readonly timeMs: number;
  readonly value: Value;
  readonly easingToNext?: AnimationEasing;
}
export type AnimationStyleTarget =
  | { readonly itemKey: string; readonly role?: string; readonly guideKey?: never }
  | { readonly guideKey: string; readonly itemKey?: never; readonly role?: never };
export type AnimationTrack =
  | { readonly target: { readonly ownerKey: string }; readonly property: 'geometry'; readonly kernel: 'native-progress';
      readonly keyframes: readonly AnimationKeyframe<number>[]; readonly priority?: number }
  | { readonly target: AnimationStyleTarget; readonly property: 'fill' | 'stroke'; readonly kernel: 'color';
      readonly keyframes: readonly AnimationKeyframe<string>[]; readonly priority?: number }
  | { readonly target: AnimationStyleTarget; readonly property: 'opacity' | 'strokeWidth'; readonly kernel: 'number' | 'positive-scale';
      readonly keyframes: readonly AnimationKeyframe<number>[]; readonly priority?: number };
export interface AnimationMarker { readonly id: string; readonly timeMs: number; }
export interface TransitionOptions {
  readonly durationMs: number;
  /** Explicit lossless numeric transport and native geographic capacity. */
  readonly formatVersion?: 5 | 6;
  readonly easing?: AnimationEasing;
  readonly tracks?: readonly AnimationTrack[];
  readonly markers?: readonly AnimationMarker[];
  readonly composite?: 'reject' | 'priority';
  /** Explicit endpoint sum; safe integer 1..200002. Omission keeps 10000. */
  readonly maxEndpointNodes?: number;
  /** Explicit endpoint/sample count; safe integer 1..100001. Omission keeps 10000. */
  readonly maxOutputNodes?: number;
}
/** Created only by planTransition or deserializeAnimation. */
export interface TransitionPlan {
  readonly [transitionPlan]: true;
  readonly kind: 'transition-plan';
  readonly version: 3 | 4 | 5;
  readonly durationMs: number;
  readonly easing: AnimationEasing;
}
export interface BatchedTransitionPlan extends Omit<TransitionPlan, 'version'> { readonly version: 6; }
export type AnyTransitionPlan = TransitionPlan | BatchedTransitionPlan;
/** Semantic kernels report cartesian-point, cartesian-geometry, polar-geometry, guide-geometry, partition, or completed-graph.
 * Guide geometry includes explicit native titles, band boundaries, field-keyed Parallel axes,
 * single-edge gradient and continuous-size legends with exact raw samples, categorical native symbols with
 * typed category/recipe roles and explicit offsets, explicit native legend groups with
 * row/column/wrap packing, implicit edge lanes using current measured bounds and exact current
 * Cartesian axis ink at its own timeline progress, and fixed
 * Cartesian label flush/rotation/edge layout with retained exact text measurements.
 * Cartesian geometry includes selected conditional values, native offsets/spans/category slots,
 * completed density samples, and compatible source-follow overlays.
 * Geo Text content/layout expressions follow the current native camera.
 * Native Cartesian maxWidth/responsive labels emit current raw-value/line identities,
 * including newly visible lines without fabricated endpoint indices.
 * Inferred and label-relative Cartesian titles replay the same current fixed or dynamic native label ink dependency.
 * Dynamic dependencies retain exact axis owners, current clips and prepared font metrics.
 * Unsupported policies retain an explicit crossfade reason. */
export type TransitionDecision =
  | { readonly kind: 'guide'; readonly kernel: 'native-axis-label'; readonly ownerKey: string;
      readonly guideKey: string; readonly role: 'guide-labels' }
  | { readonly kind: 'geographic'; readonly kernel: 'native-geo' | 'native-geo-text'; readonly ownerKey: string;
      readonly itemKey: string; readonly role: string }
  | { readonly kind: 'enter'; readonly targetIndex: number; readonly ownerKey?: string; readonly reason?: 'guide-ambiguity' }
  | { readonly kind: 'exit'; readonly sourceIndex: number; readonly ownerKey?: string; readonly reason?: 'guide-ambiguity' }
  | { readonly kind: 'exact' | 'semantic-kernel' | 'crossfade'; readonly sourceIndex: number;
      readonly targetIndex: number; readonly itemKey?: string; readonly guideKey?: string; readonly owner?: string; readonly ownerKey?: string;
      readonly role: string; readonly kernel?: string; readonly reason?: string };
/** An authentic immutable sample, directly accepted by all four renderers. */
export interface TransitionFrame extends Readonly<Pick<ChartProgram, 'graphicSpec'>> {
  readonly [transitionFrame]: true;
  readonly scene: CanvasTransitionScene;
  readonly progress: number;
  readonly decisions: readonly TransitionDecision[];
}
export interface BatchedTransitionFrame extends Omit<TransitionFrame, 'scene' | 'decisions'> { readonly scene: BatchedTransitionScene; }
export type AnyTransitionFrame = TransitionFrame | BatchedTransitionFrame;
export interface ExportedAnimationFrame extends TransitionFrame { readonly timeMs: number; }
export interface ExportedBatchedAnimationFrame extends BatchedTransitionFrame { readonly timeMs: number; }
export type AnyExportedAnimationFrame = ExportedAnimationFrame | ExportedBatchedAnimationFrame;
export interface PlaybackOptions {
  readonly rate?: number;
  /** Additional repetitions; Infinity repeats until cancelled. */
  readonly repeat?: number;
  readonly reducedMotion?: boolean;
}
export interface AnimationPlayback {
  readonly rate: number;
  readonly repeat: number;
  readonly reducedMotion: boolean;
}
export interface RestoredAnimation {
  readonly plan: AnyTransitionPlan;
  readonly playback: AnimationPlayback;
}
export type AnimationFrameOptions =
  | { readonly timesMs: readonly number[]; readonly fps?: never }
  | { readonly fps: number; readonly timesMs?: never };
export type LegacyTransitionOptions = Omit<TransitionOptions, 'formatVersion'> & { readonly formatVersion?: 5 };
export type BatchedTransitionOptions = Omit<TransitionOptions, 'formatVersion'> & { readonly formatVersion: 6 };
type LegacyEndpoint = AnimationProgram | TransitionFrame;
type AnyEndpoint = LegacyEndpoint | BatchedTransitionFrame;
type TransitionRequest<Options, Endpoint = LegacyEndpoint> = { readonly from: Endpoint; readonly to: Endpoint; readonly options: Options };
export declare function planTransition(input: TransitionRequest<BatchedTransitionOptions, AnyEndpoint>): BatchedTransitionPlan;
export declare function planTransition(input: TransitionRequest<LegacyTransitionOptions & {
  readonly formatVersion?: never; readonly maxEndpointNodes?: never; readonly maxOutputNodes?: never;
}>): TransitionPlan & { readonly version: 3 };
export declare function planTransition(input: TransitionRequest<LegacyTransitionOptions & { readonly formatVersion?: never } & (
  { readonly maxEndpointNodes: number } | { readonly maxOutputNodes: number }
)>): TransitionPlan & { readonly version: 4 };
export declare function planTransition(input: TransitionRequest<LegacyTransitionOptions & { readonly formatVersion: 5 }>): TransitionPlan & { readonly version: 5 };
export declare function planTransition(input: TransitionRequest<LegacyTransitionOptions>): TransitionPlan;
export declare function planTransition(input: TransitionRequest<TransitionOptions> | TransitionRequest<BatchedTransitionOptions, AnyEndpoint>): AnyTransitionPlan;
export declare function sampleTransition(plan: BatchedTransitionPlan, timeMs: number): BatchedTransitionFrame;
export declare function sampleTransition(plan: TransitionPlan, timeMs: number): TransitionFrame;
export declare function sampleTransition(plan: AnyTransitionPlan, timeMs: number): AnyTransitionFrame;
export declare function serializeAnimation(plan: AnyTransitionPlan, playback?: PlaybackOptions): string;
export declare function deserializeAnimation(text: string): RestoredAnimation;
export declare function exportAnimationFrames(plan: BatchedTransitionPlan, options: AnimationFrameOptions): readonly ExportedBatchedAnimationFrame[];
export declare function exportAnimationFrames(plan: TransitionPlan, options: AnimationFrameOptions): readonly ExportedAnimationFrame[];
export declare function exportAnimationFrames(plan: AnyTransitionPlan, options: AnimationFrameOptions): readonly AnyExportedAnimationFrame[];

export interface AnimationClock<Handle = number> {
  now(): number;
  requestFrame(callback: () => void): Handle;
  cancelFrame(handle: Handle): void;
}
export interface AnimationPlayerState {
  readonly status: 'idle' | 'playing' | 'paused' | 'finished' | 'cancelled' | 'disposed';
  readonly timeMs: number;
  readonly durationMs: number;
  readonly rate: number;
  readonly iteration: number;
  readonly repeat: number;
}
export interface AnimationSettlement {
  readonly reason: 'completed' | 'cancelled' | 'disposed' | 'interrupted';
  readonly timeMs: number;
  readonly iteration: number;
}
export interface AnimationMarkerEvent<Frame = TransitionFrame> extends AnimationMarker {
  readonly iteration: number;
  readonly frame: Frame;
}
export interface AnimationPlayer<Frame = TransitionFrame, Options = LegacyTransitionOptions, Endpoint = LegacyEndpoint> {
  play(): AnimationPlayer<Frame, Options, Endpoint>;
  pause(): AnimationPlayer<Frame, Options, Endpoint>;
  seek(timeMs: number, options?: { readonly emit?: boolean }): AnimationPlayer<Frame, Options, Endpoint>;
  reverse(): AnimationPlayer<Frame, Options, Endpoint>;
  setRate(rate: number): AnimationPlayer<Frame, Options, Endpoint>;
  setRepeat(repeat: number): AnimationPlayer<Frame, Options, Endpoint>;
  cancel(): AnimationPlayer<Frame, Options, Endpoint>;
  interrupt(input: PlaybackOptions & { readonly to: Endpoint; readonly options: Options }): AnimationPlayer<Frame, Options, Endpoint>;
  dispose(): void;
  getState(): AnimationPlayerState;
  getFrame(): Frame | undefined;
  readonly finished: Promise<AnimationSettlement>;
}
type AnimationPlayerInput<Plan, Frame, Handle> = PlaybackOptions & {
  readonly plan: Plan;
  readonly clock: AnimationClock<Handle>;
  readonly render: (frame: Frame) => void;
  readonly commit?: (frame: Frame) => void;
  readonly onMarker?: (event: AnimationMarkerEvent<Frame>) => void;
};
export declare function createAnimationPlayer<Handle>(input: AnimationPlayerInput<BatchedTransitionPlan, BatchedTransitionFrame, Handle>): AnimationPlayer<BatchedTransitionFrame, BatchedTransitionOptions, AnyEndpoint>;
export declare function createAnimationPlayer<Handle>(input: AnimationPlayerInput<TransitionPlan, TransitionFrame, Handle>): AnimationPlayer;
export declare function createAnimationPlayer<Handle>(input: AnimationPlayerInput<AnyTransitionPlan, AnyTransitionFrame, Handle>): AnimationPlayer<AnyTransitionFrame, TransitionOptions, AnyEndpoint>;
