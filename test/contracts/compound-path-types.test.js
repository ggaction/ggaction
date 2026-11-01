import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("compound path types preserve multiple closed subpaths and the closed clip vocabulary", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-compound-path-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type ConcretePathCommand, type GraphicClip, type GraphicClipPath, type PathFillRule } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const commands: readonly ConcretePathCommand[] = [
 {op:'M',x:0,y:0},{op:'L',x:20,y:0},{op:'L',x:20,y:20},{op:'Z'},
 {op:'M',x:5,y:5},{op:'C',x1:6,y1:4,x2:8,y2:4,x:10,y:5},{op:'L',x:5,y:10},{op:'Z'}
];
const rule:PathFillRule='evenodd';
const clip:GraphicClipPath={type:'path',commands,fillRule:rule};
const clips:GraphicClip[]=[clip,{x:0,y:0,width:20,height:20}];
chart().createGraphics({id:'shape',type:'path'})
 .editGraphics({target:'shape',property:'commands',value:commands})
 .editGraphics({target:'shape',property:'fillRule',value:rule})
 .editGraphics({target:'shape',property:'clip',value:clip});
// @ts-expect-error Basic does not expose extension authoring primitives
basicChart().createGraphics({id:'shape',type:'path'});
// @ts-expect-error fill rule is a closed vocabulary
const badRule:PathFillRule='winding';
// @ts-expect-error close command has no coordinates
const badClose:ConcretePathCommand={op:'Z',x:1,y:2};
// @ts-expect-error raw arc commands are not concrete path grammar
const badArc:ConcretePathCommand={op:'A',x:1,y:2};
// @ts-expect-error path clip requires commands
const missing:GraphicClipPath={type:'path',fillRule:'nonzero'};
// @ts-expect-error path clip cannot invent a shape kind
const badClip:GraphicClip={type:'circle',radius:4};
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
