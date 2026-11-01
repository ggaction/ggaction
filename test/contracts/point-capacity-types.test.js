import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("point capacity reaches Full, Basic and shared point facades while sibling options stay closed", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-point-capacity-"));
  try {
    const file = path.join(directory, "capacity.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
for (const program of [p]) {
 program.createPointMark({maxItems:100000}); program.editPointMark({maxItems:75000});
 program.editPointMark({maxItems:undefined});
 program.createScatterPlot({x:'x',y:'y',point:{maxItems:100000}});
 program.createPolarScatterPlot({theta:'x',radius:'y',point:{maxItems:100000}});
 program.createStripPlot({x:'x',point:{maxItems:100000}});
}
basic.createPointMark({maxItems:100000});
basic.createScatterPlot({x:"x",y:"y",point:{maxItems:100000}});
// @ts-expect-error capacity is numeric
p.createPointMark({maxItems:'100000'});
// @ts-expect-error null is not capacity removal
p.editPointMark({maxItems:null});
// @ts-expect-error the point option does not widen other marks
p.createRectMark({maxItems:100000});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
