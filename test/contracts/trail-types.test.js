import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("Trail declares sample widths, Polar restrictions and scoped editing and Full-only availability", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-trail-types-"));
  try {
    const file = path.join(directory, "trail.mts");
    await writeFile(file, `
import type { ChartProgram, CreateTrailPlotOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const options: CreateTrailPlotOptions = {x:"time",y:"signal",width:"width",groupBy:["region","channel"],curve:"cardinal",tension:.5};
p.createTrailPlot(options).editTrailPlot({target:{childPath:["a"],id:"trail"},width:12,groupBy:false,order:false,color:false});
p.createTrailPlot({theta:{field:"month",fieldType:"nominal"},radius:"signal",width:4,closed:true,curve:"linear"});
p.editTrailPlot({body:{fill:{type:"pattern",style:"dots",pitch:8,strokeWidth:2,foreground:"#000",background:"#fff",coordinateSpace:"plot"},outline:false,shadow:false},blend:"screen"});
// @ts-expect-error sample width is required
p.createTrailPlot({x:"x",y:"y"});
// @ts-expect-error positions cannot mix coordinate families
p.createTrailPlot({x:"x",y:"y",theta:"a",radius:"r",width:8});
// @ts-expect-error Polar Trail uses projected linear segments
p.createTrailPlot({theta:"a",radius:"r",width:8,curve:"cardinal"});
// @ts-expect-error row aggregation would change sample widths
p.createTrailPlot({x:{field:"x",aggregate:"mean"},y:"y",width:8});
// @ts-expect-error width is not a point size scale
p.createTrailPlot({...options,width:{field:"w",scale:{type:"sqrt"}}});
// @ts-expect-error Trail is Full-only
basic.createTrailPlot(options);
// @ts-expect-error Trail editing is Full-only
basic.editTrailPlot({width:2});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
