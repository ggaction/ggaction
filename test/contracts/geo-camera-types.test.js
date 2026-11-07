import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("camera types expose explicit operations, immutable snapshots and the Full authoring boundary", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-camera-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import {chart,type GeoCameraOperation} from ${JSON.stringify(path.join(root, "types/index.js"))};
import {chart as basic} from ${JSON.stringify(path.join(root, "types/basic.js"))};
import {getProjectionView,type ProjectionView} from ${JSON.stringify(path.join(root, "types/inspection.js"))};
const p=chart().createProjection({id:'map',type:'identity'});
const view:ProjectionView=getProjectionView(p,{target:'map',childPath:[]});
const scale:number=view.parameters.scalePx;
const operations:readonly GeoCameraOperation[]=[
 {type:'pan',deltaPx:[1,2]}, {type:'zoom',anchorPx:[20,30],factor:2,scaleExtent:[1,100]},
 {type:'pinch',fromPx:[[0,0],[1,1]],toPx:[[0,0],[2,2]],scaleExtent:[1,100]},
 {type:'rotate',rotateDeg:[20,30,40]}, {type:'reset',initial:view.parameters},
 {type:'fit',fit:{geometry:'shape',width:400,height:300}},
 {type:'resize',canvas:{width:800,plot:false},scaling:'fit'},
 {type:'resize',canvas:{plot:{width:400,height:300}},scaling:'preserve'}];
for(const operation of operations)p.navigateProjection({target:{childPath:['left'],id:'map'},operation});
// @ts-expect-error Zoom requires an explicit scale interval.
p.navigateProjection({operation:{type:'zoom',anchorPx:[0,0],factor:2}});
// @ts-expect-error Resize has an explicit scale policy.
p.navigateProjection({operation:{type:'resize',canvas:{width:400},scaling:'auto'}});
// @ts-expect-error Camera operations have closed payloads.
p.navigateProjection({operation:{type:'pan',deltaPx:[1,2],factor:2}});
// @ts-expect-error Reset uses explicit projection parameters.
p.navigateProjection({operation:{type:'reset'}});
// @ts-expect-error Snapshots are immutable.
view.parameters.translatePx[0]=20;
// @ts-expect-error Camera authoring is Full only.
basic().navigateProjection({operation:{type:'pan',deltaPx:[1,2]}});
void scale;
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
