import type { ChartProgram } from "./program.js";
import type { BasicChartProgram } from "./basic.js";

export function serializeProgram(program: ChartProgram | BasicChartProgram): string;
export function deserializeProgram(text: string): ChartProgram;
export interface SliceOptions {
  /** Longest intended synchronous slice in milliseconds, 1..1000 (default 40). */
  readonly sliceMs?: number;
  /** Aborting rejects with the signal's reason; no program is returned. */
  readonly signal?: AbortSignal;
}
/** Same result and errors as deserializeProgram, run in bounded host turns. */
export function loadProgramInSlices(text: string, options?: SliceOptions): Promise<ChartProgram>;
export function serializeGraphic(program: Pick<ChartProgram, "graphicSpec">): string;
export function deserializeGraphic(text: string): Readonly<Pick<ChartProgram, "graphicSpec">>;
