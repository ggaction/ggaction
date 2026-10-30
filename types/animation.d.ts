import type { ChartProgram } from './program.js';
import type { BasicChartProgram } from './basic.js';
import type { CanvasTransitionScene } from './scene.js';

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
  readonly easing?: AnimationEasing;
  readonly tracks?: readonly AnimationTrack[];
  readonly markers?: readonly AnimationMarker[];
  readonly composite?: 'reject' | 'priority';
}
/** Created only by planTransition or deserializeAnimation. */
export interface TransitionPlan {
  readonly [transitionPlan]: true;
  readonly kind: 'transition-plan';
  readonly version: 3;
  readonly durationMs: number;
  readonly easing: AnimationEasing;
}
/** Semantic kernels report cartesian-point, cartesian-geometry, polar-geometry, guide-geometry, partition, or completed-graph.
 * Guide geometry includes explicit native titles, band boundaries, and field-keyed Parallel axes.
 * Unsupported policies retain an explicit crossfade reason. */
export type TransitionDecision =
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
export interface ExportedAnimationFrame extends TransitionFrame { readonly timeMs: number; }
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
  readonly plan: TransitionPlan;
  readonly playback: AnimationPlayback;
}
export type AnimationFrameOptions =
  | { readonly timesMs: readonly number[]; readonly fps?: never }
  | { readonly fps: number; readonly timesMs?: never };
export declare function planTransition(input: {
  readonly from: AnimationProgram | TransitionFrame;
  readonly to: AnimationProgram | TransitionFrame;
  readonly options: TransitionOptions;
}): TransitionPlan;
export declare function sampleTransition(plan: TransitionPlan, timeMs: number): TransitionFrame;
export declare function serializeAnimation(plan: TransitionPlan, playback?: PlaybackOptions): string;
export declare function deserializeAnimation(text: string): RestoredAnimation;
export declare function exportAnimationFrames(plan: TransitionPlan, options: AnimationFrameOptions): readonly ExportedAnimationFrame[];

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
export interface AnimationMarkerEvent extends AnimationMarker {
  readonly iteration: number;
  readonly frame: TransitionFrame;
}
export interface AnimationPlayer {
  play(): AnimationPlayer;
  pause(): AnimationPlayer;
  seek(timeMs: number, options?: { readonly emit?: boolean }): AnimationPlayer;
  reverse(): AnimationPlayer;
  setRate(rate: number): AnimationPlayer;
  setRepeat(repeat: number): AnimationPlayer;
  cancel(): AnimationPlayer;
  interrupt(input: PlaybackOptions & { readonly to: AnimationProgram | TransitionFrame; readonly options: TransitionOptions }): AnimationPlayer;
  dispose(): void;
  getState(): AnimationPlayerState;
  getFrame(): TransitionFrame | undefined;
  readonly finished: Promise<AnimationSettlement>;
}
export declare function createAnimationPlayer<Handle>(input: PlaybackOptions & {
  readonly plan: TransitionPlan;
  readonly clock: AnimationClock<Handle>;
  readonly render: (frame: TransitionFrame) => void;
  readonly commit?: (frame: TransitionFrame) => void;
  readonly onMarker?: (event: AnimationMarkerEvent) => void;
}): AnimationPlayer;
