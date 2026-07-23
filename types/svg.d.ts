import type { ChartProgram } from "./program.js";

export interface SVGRenderOptions {
  readonly title?: string;
  readonly description?: string;
}

export function renderToSVG(
  program: Pick<ChartProgram, "graphicSpec">,
  options?: SVGRenderOptions
): string;
