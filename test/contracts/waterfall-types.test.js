import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("Waterfall declares explicit contribution roles, scoped editing and Full-only availability", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-waterfall-types-"));
  try {
    const file = path.join(directory, "waterfall.mts");
    await writeFile(file, `
import type { ChartProgram, CreateWaterfallPlotOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const options: CreateWaterfallPlotOptions = {x:"stage",role:"role",value:"value",width:{pixels:8},labels:{content:"end"}};
p.createWaterfallPlot(options).editWaterfallPlot({target:{childPath:["a"],id:"waterfall"},reset:false,labels:false,connectors:false});
p.createWaterfallPlot({...options,yScale:{type:"symlog",constant:2}});
p.editWaterfallPlot({yScale:{type:"pow",exponent:2}});
// @ts-expect-error zero-origin cumulative geometry cannot use log position
p.createWaterfallPlot({...options,yScale:{type:"log",domain:[1,20]}});
// @ts-expect-error edits preserve the zero-origin position contract
p.editWaterfallPlot({yScale:{type:"log",domain:[1,20]}});
// @ts-expect-error explicit role and value fields are required
p.createWaterfallPlot({x:"stage"});
// @ts-expect-error width policies are mutually exclusive
p.createWaterfallPlot({...options,width:{pixels:4,band:.5}});
// @ts-expect-error stage positions are categorical
p.editWaterfallPlot({x:{field:"stage",fieldType:"quantitative"}});
// @ts-expect-error connector enablement uses an object
p.editWaterfallPlot({connectors:true});
// @ts-expect-error Waterfall is Full-only
basic.createWaterfallPlot(options);
// @ts-expect-error Waterfall editing is Full-only
basic.editWaterfallPlot({labels:false});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
