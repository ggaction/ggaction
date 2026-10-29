import type { ChartProgram } from './program.js';
import type { BasicChartProgram } from './basic.js';
import type { CanvasTransitionScene } from './scene.js';

declare const transitionPlan: unique symbol;
declare const transitionFrame: unique symbol;
export type AnimationProgram = ChartProgram | BasicChartProgram;
export type AnimationEasing = 'linear' | 'cubic-in-out';
export interface TransitionOptions {
  readonly durationMs: number;
  readonly easing?: AnimationEasing;
}
/** Created only by planTransition or deserializeAnimation. */
export interface TransitionPlan {
  readonly [transitionPlan]: true;
  readonly kind: 'transition-plan';
  readonly version: 1;
  readonly durationMs: number;
  readonly easing: AnimationEasing;
}
/** Semantic kernels report cartesian-point, cartesian-geometry, or completed-graph.
 * Unsupported policies retain an explicit crossfade reason. */
export type TransitionDecision =
  | { readonly kind: 'enter'; readonly targetIndex: number }
  | { readonly kind: 'exit'; readonly sourceIndex: number }
  | { readonly kind: 'exact' | 'semantic-kernel' | 'crossfade'; readonly sourceIndex: number;
      readonly targetIndex: number; readonly itemKey?: string; readonly owner?: string;
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
export interface AnimationPlayer {
  play(): AnimationPlayer;
  pause(): AnimationPlayer;
  seek(timeMs: number): AnimationPlayer;
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
}): AnimationPlayer;
