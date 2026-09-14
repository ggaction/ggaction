import type { ChartProgram } from "./program.js";
import type { BasicChartProgram } from "./basic.js";

export function serializeProgram(program: ChartProgram | BasicChartProgram): string;
export function deserializeProgram(text: string): ChartProgram;
export function serializeGraphic(program: Pick<ChartProgram, "graphicSpec">): string;
export function deserializeGraphic(text: string): Readonly<Pick<ChartProgram, "graphicSpec">>;
