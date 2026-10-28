import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("outline declarations reach filled marks and labels with closed full replacements", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-mark-outline-"));
  try {
    const file = path.join(directory, "outline.mts");
    await writeFile(file, `
import type { ChartProgram, MarkOutline } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { MarkOutline as ExtensionOutline } from ${JSON.stringify(path.join(root, "types/extension.js"))};
import type { MarkOutline as BasicOutline } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
const outline: MarkOutline = { color:'white', width:8 }; const e:ExtensionOutline=outline; const b:BasicOutline=outline;
p.createPointMark({outline});p.editPointMark({outline:false});p.createBarMark({outline});p.editBarMark({outline});
p.createAreaMark({outline});p.editAreaMark({outline});p.createArcMark({outline});p.editArcMark({outline});
p.createRectMark({outline});p.editRectMark({outline});p.createTextMark({outline,lineJoin:'round'});p.editTextMark({outline,lineCap:'round',miterLimit:2});
p.createMarkLabels({outline});p.createAnnotation({text:'Label',anchor:'plot-center',outline});
// @ts-expect-error an outline is a complete replacement
p.editPointMark({outline:{width:1}});
// @ts-expect-error an outline has a closed shape
p.editTextMark({outline:{color:'white',width:1,radius:2}});
// @ts-expect-error outline is not a stroke-only line option
p.editLineMark({outline});
// @ts-expect-error null is not removal
p.editRectMark({outline:null});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
