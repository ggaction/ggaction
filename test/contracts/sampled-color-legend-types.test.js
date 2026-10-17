import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("continuous color representation is declared through supported creation and edit surfaces", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-color-symbol-types-"));
  try {
    const file = path.join(directory, "legend.mts");
    await writeFile(file, `
import type { ChartProgram, LegendOptions, CreateScatterPlotOptions, CreateHeatmapOptions, CreateLinePlotOptions, PieLegendOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
const options: LegendOptions = { representation: "symbols", values: [2,4,6,8], position: "top-left" };
p.createLegend(options);
p.createLegend({ combine: "color-size", values: [0,5,10], symbol: { type: "point", opacity: 0.7, strokeWidth: 1 } });
p.editLegend({ combine: "color-size" });
basic().createLegend({ combine: "color-size" });
// @ts-expect-error Combined modes have a closed vocabulary.
p.createLegend({ combine: "color-opacity" });
p.editLegend({ representation: "symbols", values: [2,4] });
p.editLegend({ representation: "gradient" });
p.editLegend({ values: "auto", count: 5 });
p.editLegendBlock({ target: "points", channel: "color", values: [2,4], symbol: { size: 25, strokeWidth: 1.5 } });
p.createGuides({ legend: options });
basic().createLegend(options);
const colorSize: CreateScatterPlotOptions = { x: "x", y: "y", color: {field:"v",fieldType:"quantitative"}, size: "v", guides: {legend: {combine:"color-size",symbol:{opacity:0.7}}} };
// @ts-expect-error A fused facade cannot override mapped sample radius.
const colorSizeRadius: CreateScatterPlotOptions = { x: "x", y: "y", guides: {legend: {combine:"color-size",symbol:{radius:5}}} };
const scatter: CreateScatterPlotOptions = { x: "x", y: "y", guides: { legend: { representation: "symbols", values: [2,4], symbol: { type: "point", radius: 5 } } } };
const heatmap: CreateHeatmapOptions = { x: "x", y: "y", color: "value", guides: { legend: { representation: "symbols", values: [2,4] } } };
p.createPolarScatterPlot({ theta: "x", radius: "y", guides: { legend: { representation: "symbols", symbol: { radius: 5 } } } });
// @ts-expect-error Flat point recipes require an explicit symbols representation in a facade.
const defaultScatter: CreateScatterPlotOptions = { x: "x", y: "y", guides: { legend: { symbol: { type: "point", radius: 5 } } } };
// @ts-expect-error Representation has a closed vocabulary.
p.createLegend({ representation: "circles" });
// @ts-expect-error Exact samples are numeric.
p.createLegend({ representation: "symbols", values: ["2"] });
// @ts-expect-error Representation selection belongs to content, not layout.
p.editLegendLayout({ representation: "symbols" });
// @ts-expect-error Basic retains its existing creation-only boundary.
basic().editLegend({ representation: "symbols" });
// @ts-expect-error Categorical path guides do not gain continuous-color options.
const line: CreateLinePlotOptions = { x: "x", y: "y", guides: { legend: { representation: "symbols" } } };
// @ts-expect-error Pie legends remain categorical.
const pie: PieLegendOptions = { representation: "symbols" };
// @ts-expect-error Pie does not gain the sampled-color point recipe.
const pieRadius: PieLegendOptions = { symbol: { radius: 5 } };
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
