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
