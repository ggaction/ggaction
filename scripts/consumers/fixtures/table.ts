import type { ChartProgram, CreateTablePlotOptions, TableColumn } from "ggaction";
import type { BasicChartProgram } from "ggaction/basic";
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const columns: readonly TableColumn[] = ["name", { key: [1, "amount"], field: "amount", cell: { type: "bar", domain: [-5,10] }, footer: { op: "sum", missing: "drop" }, align: "right", width: 90 },
  { key: new Date(0), field: "trend", cell: { type: "sparkline", x: "time", y: "value", xType: "temporal", temporalUnit: "year", resolveY: "independent" }, footer: "count" }];
const options: CreateTablePlotOptions = { columns, rowLimit: 20, headerStyle: { fontWeight: 700 } };
p.createTablePlot(options).editTablePlot({ target: { childPath: ["a"], id: "table" }, sortBy: [{ field: "amount", order: "descending" }], rowLimit: false, color: false });
p.editTablePlot({ cells: { fill: { type: "pattern", style: "dots", pitch: 8, strokeWidth: 2, foreground: "#000", background: "#fff", coordinateSpace: "plot" }, shadow: false }, labels: { outline: false } });
// @ts-expect-error columns are required
p.createTablePlot({});
// @ts-expect-error independent Y does not accept a shared explicit domain
p.createTablePlot({ columns: [{ field: "trend", cell: { type: "sparkline", x: "x", y: "y", resolveY: "independent", yDomain: [0,1] } }] });
// @ts-expect-error nested arrays do not have scalar means
p.createTablePlot({ columns: [{ field: "trend", cell: { type: "sparkline", x: "x", y: "y" }, footer: "mean" }] });
// @ts-expect-error Table has cell layout, not Cartesian position encoding
p.createTablePlot({ columns, x: "value" });
// @ts-expect-error Table is Full-only
basic.createTablePlot(options);
// @ts-expect-error Table editing is Full-only
basic.editTablePlot({ rowLimit: 1 });
