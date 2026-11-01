import assert from "node:assert/strict";
import test from "node:test";
import { applyOffsetPositionValues, categorySlotPixels } from "../../../src/grammar/positionOffset.js";

test("shared native offset placement preserves midpoint, direction, missing values and finite bounds",()=>{
  const offsetScale={range:[20,80]},parentScale={step:-100,range:[200,0]},base=[100,200,NaN],offset=[20,80,50];
  assert.deepEqual(applyOffsetPositionValues({base,offset,parentScale,offsetScale,channel:"x"}),[130,170,undefined]);
  assert.deepEqual(base,[100,200,NaN]);
  assert.deepEqual(applyOffsetPositionValues({base:[50],offset:[0],parentScale:{range:[0,100]},offsetScale:{range:[0,20]},channel:"x"}),[40]);
  assert.deepEqual(applyOffsetPositionValues({base:[50],offset:[NaN],parentScale:{step:0,range:[0,0]},offsetScale:{range:[0,20]},channel:"x"}),[undefined]);
  assert.deepEqual(applyOffsetPositionValues({base:[50],offset:[0],parentScale:{step:0,range:[0,0]},offsetScale:{range:[0,20]},channel:"x"}),[40]);
  assert.throws(()=>applyOffsetPositionValues({base:[],offset:[1],parentScale,offsetScale,channel:"x"}),/grain/);
  assert.throws(()=>applyOffsetPositionValues({base:[Number.MAX_VALUE],offset:[Number.MAX_VALUE],parentScale:{step:1},offsetScale:{range:[0,0]},channel:"x"}),/finite/);
});

test("shared native category slots require positive band geometry and bounded displacement",()=>{
  assert.equal(categorySlotPixels({type:"band",bandwidth:80},-.25),-20);
  for(const scale of [undefined,{type:"linear",bandwidth:80},{type:"band",bandwidth:0},{type:"band",bandwidth:Infinity}])assert.throws(()=>categorySlotPixels(scale,0),/positive band/);
  for(const band of [NaN,Infinity,-.6,.6])assert.throws(()=>categorySlotPixels({type:"band",bandwidth:80},band),/within/);
});
