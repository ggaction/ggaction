import type { ChartProgram, GraphicObject, GraphicClipPath, CanvasRenderOptions, PreparedShadowRendering } from './program.js';
export interface TransitionNode {
  readonly key: string;
  readonly type: string;
  readonly topology: string;
  readonly svg: string;
  readonly offset: readonly [number, number];
  readonly clip: readonly [number, number, number, number];
}
export interface TransitionScene {
  readonly version: 1;
  readonly width: number;
  readonly height: number;
  readonly definitions: string;
  readonly nodes: readonly TransitionNode[];
}
export interface CanvasTransitionNode {
  readonly key: string;
  readonly type: 'circle' | 'rect' | 'line' | 'path' | 'text' | 'image' | 'weighted-blend';
  readonly topology: string;
  readonly properties: Readonly<NonNullable<GraphicObject['properties']>>;
  /** Explicit outer-to-inner global clip frames; the root physical viewport is implicit. */
  readonly clips?: readonly (readonly [number, number, number, number] | GraphicClipPath)[];
  readonly offset: readonly [number, number];
  readonly clip: readonly [number, number, number, number];
}
export interface CanvasTransitionScene {
  readonly version: 2;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly CanvasTransitionNode[];
}
export declare function createTransitionScene(program: ChartProgram, options?: {format?: 'svg'; shadows?: PreparedShadowRendering}): TransitionScene;
export declare function createTransitionScene(program: ChartProgram, options: {format: 'canvas'}): CanvasTransitionScene;
export declare function renderTransitionScene(scene: CanvasTransitionScene, context: CanvasRenderingContext2D, options?: CanvasRenderOptions): void;
