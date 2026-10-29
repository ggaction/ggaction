import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("OHLC declares explicit price roles, scoped editing and Full-only availability", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-ohlc-types-"));
  try {
    const file = path.join(directory, "ohlc.mts");
    await writeFile(file, `
import type { ChartProgram, CreateOHLCPlotOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const options: CreateOHLCPlotOptions = {x:{field:"date",fieldType:"temporal"},low:"low",high:"high",open:"open",close:"close",width:{pixels:8},labels:{content:"close"}};
p.createOHLCPlot(options).editOHLCPlot({target:{childPath:["a"],id:"ohlc"},doji:"none",labels:false});
// @ts-expect-error all four explicit price fields are required
p.createOHLCPlot({x:"date",low:"low",high:"high"});
// @ts-expect-error width policies are mutually exclusive
p.createOHLCPlot({...options,width:{pixels:4,band:.5}});
// @ts-expect-error arbitrary invalid-row fallback is not supported
p.editOHLCPlot({invalid:"zero"});
// @ts-expect-error OHLC is Full-only
basic.createOHLCPlot(options);
// @ts-expect-error OHLC editing is Full-only
basic.editOHLCPlot({doji:"none"});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
