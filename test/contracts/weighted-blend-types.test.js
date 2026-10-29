import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("weighted concrete types preserve flat sources in extension, Basic and scene entries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-weighted-types-"));
  try {
    const file = path.join(directory, "blend.mts");
    await writeFile(file, `
import { ChartProgram, type GraphicBlendSource, type GraphicWeightedBlendProperties } from ${JSON.stringify(path.join(root, "types/extension.js"))};
import type { GraphicBlendSource as BasicSource } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import type { GraphicWeightedBlendProperties as FullProperties } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { CanvasTransitionScene } from ${JSON.stringify(path.join(root, "types/scene.js"))};
const source: GraphicBlendSource = {weight:.5,type:'rect',properties:{x:0,y:0,width:4,height:4,fill:'red',stroke:'none',strokeWidth:0},offset:[0,0],clip:{x:0,y:0,width:10,height:10},clips:[]};
const basic:BasicSource=source;
const value:GraphicWeightedBlendProperties={sources:[source,basic],opacity:.5,blend:'normal'};
const full:FullProperties=value;
new ChartProgram().createGraphics({id:'blend',type:'weighted-blend'}).editGraphics({target:'blend',property:'sources',value:full.sources});
const scene:CanvasTransitionScene={version:2,width:10,height:10,nodes:[{key:'a',type:'weighted-blend',topology:'a',properties:{sources:value.sources},offset:[0,0],clip:[0,0,10,10]}]};
// @ts-expect-error blends cannot recurse
const nested:GraphicBlendSource={...source,type:'weighted-blend'};
// @ts-expect-error source viewport is required
const noClip:GraphicBlendSource={weight:1,type:'rect',properties:{},offset:[0,0],clips:[]};
// @ts-expect-error at least two sources
const one:GraphicWeightedBlendProperties={sources:[source]};
// @ts-expect-error offset has two coordinates
const badOffset:GraphicBlendSource={...source,offset:[0]};
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
