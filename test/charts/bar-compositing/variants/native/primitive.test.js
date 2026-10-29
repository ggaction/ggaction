import assert from "node:assert/strict";import test from "node:test";
import {blendOver,sourceOverStraight,differenceOver} from "../../../../oracles/compositing.js";
import {inflateSync} from "node:zlib";
import {encodeGroupPNG} from "./group-png.js";
import {prepareBlendGroup} from "./lowered-group.js";
import {variants} from "./manifest.js";
import {expectedGroup,expectedColor,samplePoints} from "./reference.js";
const close=(a,b)=>a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<1e-12));
test("anchors blend alpha, transparent backdrops and order with literal values",()=>{
 const red=[1,0,0,.5],blue=[0,0,1,.5];
 close(blendOver(red,blue,"multiply"),[1/3,0,1/3,.75]);close(blendOver(red,blue,"screen"),[2/3,0,2/3,.75]);
 close(blendOver(red,blue,"source-over"),[2/3,0,1/3,.75]);close(blendOver(blue,red,"source-over"),[1/3,0,2/3,.75]);
 for(const mode of["source-over","multiply","screen","difference"]){
  close(blendOver([.2,.4,.6,1],[0,0,0,0],mode),[.2,.4,.6,1]);assert.deepEqual(blendOver([0,0,0,0],[0,0,0,0],mode),[0,0,0,0]);
  for(const alpha of[0,.25,.6,1])for(const beta of[0,.25,.6,1]){
   const s=[.2,.4,.6,alpha],b=[.7,.3,.1,beta],result=blendOver(s,b,mode);assert.ok(result.every(x=>x>=0&&x<=1));assert.equal(result[3],alpha+beta*(1-alpha));
   if(mode==="source-over")close(result,sourceOverStraight(s,b));else close(result,blendOver(b,s,mode));
  }
 }
 close(differenceOver(red,blue),blendOver(red,blue,"difference"));assert.throws(()=>blendOver(red,blue,"unknown"));
});
test("makes isolated grouping observable and preserves a closed primitive manifest",()=>{
 for(const variant of variants){assert.match(variant.callChain,/drawBlendPrimitive/);assert.match(variant.svg(variant.fixture),/isolation:isolate/);
  for(const panel of variant.fixture.panels)for(const [x,y]of samplePoints)assert.ok(expectedColor(variant.fixture,panel,x,y).every(v=>Number.isInteger(v)&&v>=0&&v<=255));
 }
 const screen=variants.find(v=>v.variant==="screen").fixture;
 assert.notDeepEqual(expectedGroup(screen,120,50,true),expectedGroup(screen,120,50,false));
});

test("bounds the shared isolated group and quantizes once after group opacity",()=>{
 for(const variant of variants){
  const fixture=variant.fixture,group=prepareBlendGroup(fixture);
  assert.equal(group.rgba.length,93600);
  for(let y=0;y<group.height;y++)for(let x=0;x<group.width;x++){
   const expected=expectedGroup(fixture,x,y,true),offset=(y*group.width+x)*4;
   expected.forEach((value,c)=>assert.ok(Math.abs(group.rgba[offset+c]-value*255)<=.500000001,`${variant.variant} (${x},${y}) channel ${c}`));
  }
 }
 const fixture=variants.find(v=>v.variant==="group-opacity").fixture;
 const group=prepareBlendGroup(fixture),alpha=group.rgba[(50*260+120)*4+3];
 assert.equal(alpha,115);
 assert.deepEqual(expectedColor(fixture,fixture.panels[1],200,70),[222,191,190,255]); // (.39 + .5 - .39*.5) * .65 * 255, rounded once.
 assert.notEqual(alpha,Math.round((.39*.65+.5*.65-.39*.65*.5*.65)*255));
 assert.throws(()=>prepareBlendGroup({...fixture,group:{width:261,height:90}}),/fixed/);
 assert.throws(()=>prepareBlendGroup({...fixture,mode:"unsupported"}),/Unknown/);
});

test("stores every final RGBA byte in PNG without a premultiplication roundtrip",()=>{
 const group=prepareBlendGroup(variants.find(v=>v.variant==="group-opacity").fixture),png=encodeGroupPNG(group);
 const chunks=[];for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset);chunks.push({type:png.toString("ascii",offset+4,offset+8),data:png.subarray(offset+8,offset+8+length)});offset+=length+12;}
 assert.deepEqual(chunks.map(c=>c.type),["IHDR","IDAT","IEND"]);
 const bytes=inflateSync(chunks[1].data);assert.equal(bytes.length,93690);
 for(let y=0;y<group.height;y++){assert.equal(bytes[y*1041],0);assert.deepEqual(bytes.subarray(y*1041+1,(y+1)*1041),Buffer.from(group.rgba.subarray(y*1040,(y+1)*1040)));}
 assert.throws(()=>encodeGroupPNG({...group,width:300}),/bounded/);
});
