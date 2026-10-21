import assert from "node:assert/strict";
import test from "node:test";
import {mapSequentialColors} from "../../../../src/grammar/scales/color.js";
import {referenceLabColor,referenceSignedPower,referenceGreyGamma,referenceCubehelixColor} from "../../../oracles/color-interpolation.js";

test("D50 and unchanged D65 Lab colors match independent adapted-matrix witnesses",()=>{
 assert.equal(referenceLabColor([1,0,0],[0,0,1],.5,"d50"),"#c10088");
 assert.equal(referenceLabColor([1,0,0],[0,0,1],.5,"d65"),"#ca0088");
 for(const whitePoint of ["d65","d50"]) {
  const values=[0,.125,.25,.375,.5,.625,.75,.875,1];
  const expected=values.map(t=>referenceLabColor([1,0,0],[0,0,1],t,whitePoint));
  assert.deepEqual(mapSequentialColors(values,[0,1],["red","blue"],{interpolation:"lab",whitePoint}),expected);
 }
 assert.deepEqual(mapSequentialColors([8,12,17.5,20.5,24.8],[8,24.8],["yellow","red"],{interpolation:"hcl",whitePoint:"d50"}),["#ffff00","#ffd300","#ff9300","#ff6b00","#ff0000"]);
 for(const interpolation of ["lab","hcl","hcl-long"]) {
  const ordinary=mapSequentialColors([0,.2,.5,.8,1],[0,1],["#808080","red"],{interpolation});
  assert.deepEqual(mapSequentialColors([0,.2,.5,.8,1],[0,1],["#808080","red"],{interpolation,whitePoint:"d65"}),ordinary);
 }
});
test("positive cubehelix gamma affects lightness and preserves gamma-one defaults",()=>{
 for(const interpolation of ["cubehelix","cubehelix-long"]) {
  const values=[0,.125,.25,.5,.75,1];
  for(const gamma of [.5,1,2.2,3]) assert.deepEqual(mapSequentialColors(values,[0,1],["black","white"],{interpolation,gamma}),values.map(t=>referenceGreyGamma(t,gamma)));
  assert.deepEqual(mapSequentialColors(values,[0,1],["yellow","red"],{interpolation,gamma:1}),mapSequentialColors(values,[0,1],["yellow","red"],{interpolation}));
 }
 assert.throws(()=>mapSequentialColors([-1],[0,1],["black","white"],{interpolation:"cubehelix",gamma:.5}),/nonfinite/);
 assert.deepEqual(mapSequentialColors([-1,2],[0,1],["black","white"],{interpolation:"cubehelix",gamma:.5,clamp:true}),["#000000","#ffffff"]);
 for(const gamma of [Infinity,-Infinity,NaN,"2"])assert.throws(()=>mapSequentialColors([.5],[0,1],["black","white"],{interpolation:"cubehelix",gamma}));
 for(const options of [{whitePoint:"d55",interpolation:"lab"},{whitePoint:"d50",interpolation:"rgb"},{gamma:2,interpolation:"hcl"}])assert.throws(()=>mapSequentialColors([.5],[0,1],["red","blue"],options));
});
test("cubehelix gamma matches independently decoded quantized chromatic endpoints",()=>{
 const values=Array.from({length:9},(_,i)=>i/8);
 assert.equal(referenceCubehelixColor([117,25,11],[144,242,164],.125,2.2),"#6e2300");
 assert.equal(referenceCubehelixColor([117,25,11],[144,242,164],.75,1),"#79cf43");
 for(const gamma of [1,2.2])assert.deepEqual(mapSequentialColors(values,[0,1],["#75190b","#90f2a4"],{interpolation:"cubehelix",gamma}),values.map(t=>referenceCubehelixColor([117,25,11],[144,242,164],t,gamma)));
});
test("signed power color uses the original domain and agrees with sequential at exponent one",()=>{
 for(const domain of [[8,24.8],[-2,2],[-8,-1],[2,-2]]) {
  const values=Array.from({length:9},(_,i)=>domain[0]+(domain[1]-domain[0])*i/8);
  const expected=values.map(value=>{
   const t=referenceSignedPower(value,domain,3);
   return "#"+[Math.round(255*(1-t)),0,Math.round(255*t)].map(v=>v.toString(16).padStart(2,"0")).join("");
  });
  assert.deepEqual(mapSequentialColors(values,domain,["red","blue"],{type:"pow",exponent:3}),expected);
  assert.deepEqual(mapSequentialColors(values,domain,["red","blue"],{type:"pow",exponent:1}),mapSequentialColors(values,domain,["red","blue"]));
 }
 assert.throws(()=>mapSequentialColors([1],[0,2],["red","blue"],{type:"pow",exponent:0}));
 assert.throws(()=>mapSequentialColors([1],[0,2],["red","blue"],{type:"pow",exponent:3,midpoint:1}),/midpoint/);
});

test("multi-stop interpolation controls apply per segment and preserve direction and clamp",()=>{
 const values=[0,.125,.25,.375,.5,.625,.75,.875,1];
 const controls=[{interpolation:"lab",whitePoint:"d50"},{interpolation:"cubehelix",gamma:2.2}];
 for(const options of controls) {
  const colors=mapSequentialColors(values,[0,1],["red","blue","white"],options);
  const first=mapSequentialColors(values.slice(0,5).map(t=>t*2),[0,1],["red","blue"],options);
  const second=mapSequentialColors(values.slice(5).map(t=>(t-.5)*2),[0,1],["blue","white"],options);
  assert.deepEqual(colors,[...first,...second]);
  assert.deepEqual(mapSequentialColors(values,[1,0],["red","blue","white"],options),colors.toReversed());
  assert.deepEqual(mapSequentialColors([-2,3],[0,1],["red","blue","white"],{...options,clamp:true}),["#ff0000","#ffffff"]);
 }
});

