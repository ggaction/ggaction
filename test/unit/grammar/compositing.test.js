import assert from "node:assert/strict";
import test from "node:test";
import {compositeRGBA,quantizeRGBA,isBlendMode} from "../../../src/grammar/compositing.js";
import {blendOver} from "../../oracles/compositing.js";

const close=(actual,expected)=>actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<2e-14,`${value} ~= ${expected[i]}`));
test("anchors shared premultiplied composition with literal alpha and order",()=>{
  const red=[1,0,0,.5],blue=[0,0,1,.5];
  close(compositeRGBA(red,blue),[2/3,0,1/3,.75]);
  close(compositeRGBA(red,blue,{mode:"multiply"}),[1/3,0,1/3,.75]);
  close(compositeRGBA(red,blue,{mode:"screen"}),[2/3,0,2/3,.75]);
  close(compositeRGBA(red,blue,{mode:"difference"}),[2/3,0,2/3,.75]);
  close(compositeRGBA(blue,red),[1/3,0,2/3,.75]);
  assert.deepEqual(compositeRGBA([1,1,1,0],[.4,.2,.6,0]),[0,0,0,0]);
  assert.deepEqual(compositeRGBA(red,[0,0,0,0],{opacity:0}),[1,0,0,0]);
  assert.ok(Object.isFrozen(compositeRGBA(red,blue)));
});
test("matches an independent straight-alpha equation and bounds one quantization",()=>{
  let state=1337;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  for(const mode of["normal","multiply","screen","difference"]){
    for(let i=0;i<500;i++){
      const source=Array.from({length:4},random),backdrop=Array.from({length:4},random),opacity=random();
      const expected=blendOver(source,backdrop,mode==="normal"?"source-over":mode);expected[3]*=opacity;
      const actual=compositeRGBA(source,backdrop,{mode,opacity}),bytes=quantizeRGBA(actual);
      close(actual,expected);assert.ok(actual.every(value=>value>=0&&value<=1));
      bytes.forEach((value,channel)=>assert.ok(Math.abs(value-expected[channel]*255)<=.50000000001));
      if(mode!=="normal")close(compositeRGBA(source,backdrop,{mode}),compositeRGBA(backdrop,source,{mode}));
    }
    for(const a of[0,1])for(const b of[0,1]){
      const source=[1,0,1,a],backdrop=[0,1,0,b];
      close(compositeRGBA(source,backdrop,{mode}),blendOver(source,backdrop,mode==="normal"?"source-over":mode));
    }
  }
});
test("applies group opacity after the blend and preserves caller values",()=>{
  const source=[210/255,70/255,45/255,.39],backdrop=[40/255,150/255,200/255,.5],before=structuredClone([source,backdrop]);
  const composed=compositeRGBA(source,backdrop,{mode:"screen",opacity:.65});
  assert.equal(quantizeRGBA(composed)[3],115);
  assert.notEqual(quantizeRGBA(composed)[3],Math.round((.39*.65+.5*.65-.39*.65*.5*.65)*255));
  assert.deepEqual([source,backdrop],before);assert.deepEqual(quantizeRGBA([0,.5,1,1]),[0,128,255,255]);
  assert.ok(Object.isFrozen(quantizeRGBA(composed)));
});
test("rejects malformed channels and unsafe descriptors before reading inputs",()=>{
  const valid=[0,0,0,1];
  for(const bad of[null,{},[],[0,0,1],new Uint8Array(4),[NaN,0,0,1],[-1,0,0,1],[0,2,0,1],[0,0,0,Infinity]]){
    assert.throws(()=>compositeRGBA(bad,valid));assert.throws(()=>compositeRGBA(valid,bad));assert.throws(()=>quantizeRGBA(bad));
  }
  for(const bad of[null,[],{unknown:1},{mode:"source-over"},{mode:"unknown"},{opacity:-.1},{opacity:2},{opacity:NaN},{opacity:undefined},{mode:undefined}])assert.throws(()=>compositeRGBA(valid,valid,bad));
  let reads=0;const channels=[0,0,0,1];Object.defineProperty(channels,0,{get(){reads++;return 0;}});
  assert.throws(()=>compositeRGBA(channels,valid));assert.throws(()=>quantizeRGBA(channels));
  assert.throws(()=>compositeRGBA(valid,valid,{get mode(){reads++;return"normal";}}));assert.equal(reads,0);
  const symbol=[0,0,0,1];symbol[Symbol()]=1;assert.throws(()=>compositeRGBA(symbol,valid));
  assert.throws(()=>compositeRGBA([0,,0,1],valid));
});

test("shares the closed blend vocabulary without treating names as native aliases",()=>{
  for(const mode of ["normal","multiply","screen","difference"])assert.equal(isBlendMode(mode),true);
  for(const mode of [undefined,null,"source-over","overlay","",{},1])assert.equal(isBlendMode(mode),false);
});
