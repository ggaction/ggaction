import type { ChartProgram } from "./program.js";

export interface PNGRenderResult {
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly bytes: number;
}

export function renderToPNG(
  program: Pick<ChartProgram, "graphicSpec">,
  options: { output: string; pixelRatio?: number }
): Promise<PNGRenderResult>;

export interface PNGBufferResult extends Omit<PNGRenderResult, "output"> {
  readonly buffer: Uint8Array;
}

export function renderToPNGBuffer(
  program: Pick<ChartProgram, "graphicSpec">,
  options?: { pixelRatio?: number }
): Promise<PNGBufferResult>;
