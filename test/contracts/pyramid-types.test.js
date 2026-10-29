import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("Pyramid declares explicit stage meaning, scoped editing and Full-only availability", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-pyramid-types-"));
  try {
    const file = path.join(directory, "pyramid.mts");
    await writeFile(file, `
import type { ChartProgram, CreatePyramidPlotOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const options: CreatePyramidPlotOptions = {stage:"stage",value:"value",encoding:"area",taperRatio:.5,labels:{content:"percent",format:".1%"},percentBase:"total"};
p.createPyramidPlot(options).editPyramidPlot({target:"pyramid",encoding:"width",lastStage:"point",color:{field:"amount",fieldType:"quantitative"}});
p.editPyramidPlot({target:{childPath:["a"],id:"pyramid"},labels:false,clip:false});
// @ts-expect-error stage field is required
p.createPyramidPlot({value:"value"});
// @ts-expect-error only four explicit directions
p.createPyramidPlot({stage:"s",value:"v",orientation:"diagonal"});
// @ts-expect-error area mode does not accept a last-stage width policy
p.createPyramidPlot({stage:"s",value:"v",encoding:"area",lastStage:"point"});
// @ts-expect-error percentages use an explicit named denominator
p.createPyramidPlot({stage:"s",value:"v",percentBase:100});
// @ts-expect-error Pyramid is Full-only
basic.createPyramidPlot(options);
// @ts-expect-error Pyramid editing is Full-only
basic.editPyramidPlot({labels:false});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
