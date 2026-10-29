import type { ChartProgram, CreatePyramidPlotOptions } from "ggaction";
import type { BasicChartProgram } from "ggaction/basic";
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const options: CreatePyramidPlotOptions = { stage: "stage", value: "value", encoding: "area", taperRatio: .8, percentBase: "total", labels: { content: "percent", format: ".1%" } };
p.createPyramidPlot(options).editPyramidPlot({ target: { childPath: ["left"], id: "pyramid" }, encoding: "width", lastStage: "point", color: false });
// @ts-expect-error value is required
p.createPyramidPlot({ stage: "stage" });
// @ts-expect-error width and area have exclusive policies
p.createPyramidPlot({ stage: "stage", value: "value", encoding: "area", lastStage: "flat" });
// @ts-expect-error Full only
basic.createPyramidPlot(options);
