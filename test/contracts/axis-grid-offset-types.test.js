import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("Cartesian complete, focused and grid declarations expose finite numeric offset vocabulary", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ggaction-guide-offset-types-"));
  try {
    const file = path.join(dir, "offset.mts");
    await writeFile(file, `
import type {ChartProgram} from ${JSON.stringify(path.join(root, "types/program.js"))};
declare const p: ChartProgram;
p.createXAxis({ticksAndLabels:{ticks:{alongOffset:10},labels:{alongOffset:20,offset:7,flush:true,labelMap:[{value:20,label:'0.2'}]}}});
p.createAxes({y:{ticksAndLabels:{ticks:{alongOffset:-10},labels:{alongOffset:-20}}}});
p.editXAxis({ticksAndLabels:{ticks:{alongOffset:5},labels:{alongOffset:0}}});
p.editYAxis({ticks:{alongOffset:10},labels:{alongOffset:20}});
p.createXAxisTicks({alongOffset:10});p.editXAxisTicks({alongOffset:-10});
p.createYAxisLabels({alongOffset:20});p.editYAxisLabels({alongOffset:-20});
p.createGrid({vertical:{alongOffset:10}});p.editGrid({horizontal:{alongOffset:-10}});
p.createVerticalGrid({alongOffset:10});p.editHorizontalGrid({alongOffset:-10});
p.createLinePlot({x:'x',y:'y',guides:{axes:{x:{ticksAndLabels:{labels:{alongOffset:20,flush:true,labelMap:[{value:20,label:'0.2'}]}}}},grid:{vertical:{alongOffset:10}}}});
p.editXAxis({labels:{flush:true,colorMap:[{value:20,color:'green'}]}});
p.createXAxisLabels({color:'red',colorMap:[{value:'2',color:'green'}]});
p.editYAxisLabels({colorMap:'auto'});
// @ts-expect-error color overrides require string colors
p.editXAxisLabels({colorMap:[{value:1,color:2}]});
// @ts-expect-error Cartesian label color maps do not apply to polar labels
p.createThetaAxisLabels({colorMap:[{value:1,color:'green'}]});p.editYAxisTicksAndLabels({labels:{flush:false}});
// @ts-expect-error boolean containment policy
p.editXAxisLabels({flush:'true'});
// @ts-expect-error Cartesian containment does not apply to polar labels
p.createThetaAxisLabels({flush:true});
// @ts-expect-error numeric logical pixels only
p.editXAxisTicks({alongOffset:'10'});
// @ts-expect-error Cartesian displacement does not apply to polar ticks
p.createThetaAxisTicks({alongOffset:10});
// @ts-expect-error Cartesian displacement does not apply to parallel labels
p.editParallelAxisLabels({alongOffset:10});
// @ts-expect-error Cartesian displacement does not apply to polar grids
p.editRadialGrid({alongOffset:10});
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
