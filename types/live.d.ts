import type { ChartProgram, ThemeDefinition } from './program.js';
import type { AnimationEasing } from './animation.js';

/** Every authoring action of a program, returning the same live chart. */
type LiveProgramActions = {
  [K in keyof ChartProgram as ChartProgram[K] extends (...args: never[]) => ChartProgram ? K : never]:
    ChartProgram[K] extends (...args: infer A) => ChartProgram ? (...args: A) => LiveChart : never
};

export type LiveScreen = HTMLCanvasElement | SVGSVGElement | HTMLElement;
export type LiveSelectionMode = 'replace' | 'add' | 'toggle' | 'subtract' | 'intersect';
export interface LiveAnimationOptions { readonly duration?: number; readonly easing?: AnimationEasing; }
export interface LiveTimeline { readonly finished: Promise<void>; pause(): void; play(): void; stop(): Promise<void>; }
export type LiveFields = Readonly<Record<string, unknown>>;
export interface LiveHoverEvent { readonly item: { readonly key: string; readonly fields: LiveFields } | null; readonly hit: unknown; }
export interface LiveSelectEvent { readonly program: ChartProgram; readonly selected: Readonly<Record<string, readonly LiveFields[]>>; }
export interface LiveChangeEvent { readonly program: ChartProgram; readonly previous: ChartProgram; }
export interface LiveEvents { select: LiveSelectEvent; hover: LiveHoverEvent; change: LiveChangeEvent; error: unknown; }

/**
 * A stateful chart over the immutable engine. After `addCanvas`, every call
 * redraws immediately. A failing call throws and leaves the chart unchanged.
 */
export declare class LiveChart {
  private constructor();
  /** The current immutable program. */
  readonly program: ChartProgram;
  /** Why the current authoring state cannot be drawn or made interactive yet, if so. */
  readonly pendingError: unknown;

  addCanvas(element: LiveScreen, options?: { readonly pixelRatio?: number }): this;
  autoResize(options?: { readonly height?: number }): this;
  setTheme(theme: ThemeDefinition): this;
  /** PDF needs the Node.js renderer: use renderToPDFBuffer(chart.program) from 'ggaction/pdf'. */
  download(format?: 'png' | 'svg', filename?: string): Promise<Blob>;
  dispose(): void;

  addTooltip(options?: { readonly fields?: readonly string[]; readonly format?: (fields: LiveFields) => string; readonly target?: string }): this;
  addHover(options?: { readonly target?: string; readonly color?: string }): this;
  addClickSelect(options?: { readonly target?: string; readonly mode?: 'replace' | 'toggle'; readonly color?: string }): this;
  addBrush(options?: { readonly target?: string; readonly axis?: 'x' | 'y' | 'xy' | 'theta'; readonly mode?: LiveSelectionMode; readonly color?: string }): this;
  addLasso(options?: { readonly target?: string; readonly mode?: LiveSelectionMode; readonly color?: string }): this;
  addZoom(options?: { readonly target?: string; readonly factor?: number; readonly scaleExtent?: readonly [number, number] }): this;
  addPan(options?: { readonly target?: string; readonly scaleExtent?: readonly [number, number] }): this;
  addLegendToggle(options?: { readonly effect?: 'visibility' | 'selection'; readonly target?: string; readonly channel?: string }): this;
  addDragNodes(options?: { readonly target?: string }): this;
  on<E extends keyof LiveEvents>(event: E, handler: (event: LiveEvents[E]) => void): () => boolean;

  setData(rows: readonly LiveFields[], options?: LiveAnimationOptions & { readonly source?: string; readonly animate?: boolean }): Promise<this>;
  animateTo(next: LiveChart | ChartProgram | ((program: ChartProgram) => LiveChart | ChartProgram), options?: LiveAnimationOptions): Promise<this>;
  playOver(field: string, options?: { readonly duration?: number; readonly loop?: boolean; readonly source?: string }): LiveTimeline;
  addSlider(parameter: string, options?: { readonly container?: Element; readonly min?: number; readonly max?: number; readonly step?: number; readonly label?: string }): this;
  addDropdown(parameter: string, options: { readonly container?: Element; readonly options: readonly (string | number | boolean)[]; readonly label?: string }): this;
  linkTo(other: LiveChart, options: { readonly by: string }): this;
  undo(): this;
  redo(): this;
  reset(): this;
  /** Apply any immutable-program update; it becomes the baseline for reset. */
  edit(update: (program: ChartProgram) => ChartProgram): this;
  save(): string;
  static load(text: string, element?: LiveScreen): LiveChart;
}
export interface LiveChart extends LiveProgramActions {}

export declare function chart(): LiveChart;
export declare function playAnimation(from: LiveChart | ChartProgram, to: LiveChart | ChartProgram, element: HTMLCanvasElement,
  options?: LiveAnimationOptions & { readonly pixelRatio?: number }): Promise<void>;
