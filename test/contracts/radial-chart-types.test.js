import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares complete measured radial charts with count/sum and Polar guide constraints", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-radial-types-"));
  try {
    const file = path.join(directory, "radius.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createRosePlot({ category: "category" });
p.createRadialBarPlot({ category: "category", value: "value", aggregate: "sum", radiusScale: { range: [70, 140] } });
p.createRosePlot({ category: { field: "category", scale: { reverse: true } }, color: false, arc: { padAngle: 0, fill: "red" }, guides: false });
p.createRosePlot({ category: "category", guides: { axes: { radius: { angle: 45, title: false } }, grid: { theta: { values: ["A", "C"] } } } });
// @ts-expect-error categorical theta axes use exact values instead of numeric tick counts
p.createRosePlot({ category: "category", guides: { axes: { theta: { ticksAndLabels: { count: 4 } } } } });
// @ts-expect-error categorical theta labels accept auto formatting only
p.createRadialBarPlot({ category: "category", guides: { axes: { theta: { ticksAndLabels: { labels: { format: ".1f" } } } } } });
// @ts-expect-error categorical theta grids use exact values instead of numeric tick counts
p.createRosePlot({ category: "category", guides: { grid: { theta: { count: 4 } } } });
// @ts-expect-error radial color legends are categorical and accept auto formatting only
p.createRadialBarPlot({ category: "category", guides: { legend: { labels: { format: ".1f" } } } });
// @ts-expect-error category is required
p.createRosePlot({});
// @ts-expect-error sum must be explicit when a value is present
p.createRadialBarPlot({ category: "category", value: "value" });
// @ts-expect-error count does not consume value
p.createRosePlot({ category: "category", value: "value", aggregate: "count" });
// @ts-expect-error sum needs value
p.createRosePlot({ category: "category", aggregate: "sum" });
// @ts-expect-error measured padding is zero
p.createRosePlot({ category: "category", arc: { padAngle: 1 } });
// @ts-expect-error measured scales are linear
p.createRosePlot({ category: "category", radiusScale: { type: "sqrt" } });
// @ts-expect-error Cartesian axes are not owned by Polar facades
p.createRosePlot({ category: "category", guides: { axes: { x: {} } } });
// @ts-expect-error mapping is fixed by the chart action
p.createRadialBarPlot({ category: "category", mapping: "area" });
// @ts-expect-error Full only
basic.createRosePlot({ category: "category" });
// @ts-expect-error Full only
basic.createRadialBarPlot({ category: "category" });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
