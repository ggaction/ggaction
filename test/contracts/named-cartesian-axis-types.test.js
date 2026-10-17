import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("Cartesian named identities, owner targets and nonempty aggregate arrays remain closed contracts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-named-axis-types-"));
  try {
    const file = path.join(directory, "axes.mts");
    await writeFile(file, `
import type { ChartProgram, NamedCompleteAxis, YAxisPosition } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
const right: NamedCompleteAxis<YAxisPosition> = {id:"share",position:"right",scale:"percent"};
p.createLinePlot({x:"x",y:"y",guides:{axes:{y:[{id:"share",position:"right"}]}}});
p.createYAxis(right).editYAxis({target:"share",position:"left",offset:10});
p.createAxes({x:false,y:[right,{id:"count",position:"left"}]}).createGuides({axes:{x:[{id:"top",position:"top"}],y:false},grid:false,legend:false});
p.createYAxisLine({target:"share",color:"red"}).editYAxisLine({target:"share",lineWidth:2});
p.createYAxisTicks({target:"share",count:3}).editYAxisTicks({target:"share",length:4});
p.createYAxisLabels({target:"share",align:"right"}).editYAxisLabels({target:"share",color:"red"});
p.createYAxisTitle({target:"share",text:"Share"}).editYAxisTitle({target:"share",alongOffset:3});
p.createYAxisTicksAndLabels({target:"share",count:3}).editYAxisTicksAndLabels({target:"share",labels:{fontSize:10}});
p.removeYAxis({target:"share",scale:"percent",coordinate:"main"});
basic().createAxes({x:false,y:[right]}).createYAxisTitle({target:"share",text:"Share"});
// @ts-expect-error Aggregate arrays are nonempty.
p.createAxes({y:[]});
// @ts-expect-error Every array descriptor has an explicit identity.
p.createAxes({y:[{position:"right"}]});
// @ts-expect-error Complete creators use id, not target.
p.createYAxis({target:"share"});
// @ts-expect-error Focused editors use target, not id.
p.editYAxisLabels({id:"share",color:"red"});
// @ts-expect-error Selectors belong to the whole axis, not nested title appearance.
p.editYAxis({target:"share",title:{target:"other",text:"Share"}});
// @ts-expect-error Nested tick groups cannot override the selected owner.
p.createYAxis({id:"share",ticksAndLabels:{target:"other",count:3}});
// @ts-expect-error Cartesian identities do not extend polar creator contracts.
p.createThetaAxis({id:"angle"});
// @ts-expect-error Cartesian selectors do not extend polar remover contracts.
p.removeThetaAxis({target:"angle"});
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
