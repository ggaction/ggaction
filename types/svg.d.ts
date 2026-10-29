import type { ChartProgram, PreparedShadowRendering } from "./program.js";

export interface SVGRenderOptions {
  readonly shadows?: PreparedShadowRendering;
  readonly title?: string;
  readonly description?: string;
  readonly resourceNamespace?: string;
}

export function renderToSVG(
  program: Pick<ChartProgram, "graphicSpec">,
  options?: SVGRenderOptions
): string;
