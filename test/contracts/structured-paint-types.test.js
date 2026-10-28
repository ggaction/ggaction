import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("public FillPaint declarations reach every filled mark owner and preserve closed shapes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-structured-paint-"));
  try {
    const file = path.join(directory, "paint.mts");
    await writeFile(file, `
import type { ChartProgram, FillPaint, PatternPaint, RadialGradientPaint } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { PatternPaint as ExtensionPattern } from ${JSON.stringify(path.join(root, "types/extension.js"))};
import type { PatternPaint as BasicPattern } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
const pattern: PatternPaint = {type:'pattern',style:'cross',pitch:8,strokeWidth:1,phase:[0,2],foreground:'#123',background:'transparent',coordinateSpace:'plot'};
const radial: RadialGradientPaint = {type:'radial-gradient',center:{x:.5,y:.5},radius:.5,stops:[{offset:0,color:'red'},{offset:1,color:'blue'}]};
const extension:ExtensionPattern=pattern; const basic:BasicPattern=pattern;
for(const fill of [pattern,radial] satisfies FillPaint[]){
 p.createBarMark({fill});p.editBarMark({fill});p.createAreaMark({fill});p.editAreaMark({fill});
 p.createPointMark({fill});p.editPointMark({fill});p.createRectMark({fill});p.editRectMark({fill});
 p.createArcMark({fill});p.editArcMark({fill});p.createTextMark({fill});p.editTextMark({fill});
 p.createMarkLabels({fill});p.createAnnotation({text:'Label',anchor:'plot-center',fill});
}
// @ts-expect-error strokes remain solid colors
p.createPointMark({stroke:pattern});
// @ts-expect-error pattern style vocabulary is closed
p.editRectMark({fill:{type:'pattern',style:'checkerboard'}});
// @ts-expect-error radial requires radius
p.createArcMark({fill:{type:'radial-gradient',center:{x:0,y:0},stops:[{offset:0,color:'red'},{offset:1,color:'blue'}]}});
// @ts-expect-error radial requires at least two stops
p.createTextMark({fill:{...radial,stops:[{offset:0,color:'red'}]}});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
