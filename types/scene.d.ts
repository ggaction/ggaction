import type { ChartProgram } from './program.js';
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
export declare function createTransitionScene(program: ChartProgram): TransitionScene;
