import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chart,prepareShadowRendering,prepareFontResource,prepareTextMetrics,prepareFontRendering,render } from "ggaction";
import { chart as basic,prepareShadowRendering as basicPrepare } from "ggaction/basic";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { serializeProgram,deserializeProgram,serializeGraphic,deserializeGraphic } from "ggaction/persistence";
import { createTransitionScene,renderTransitionScene } from "ggaction/scene";
import { createCanvas,loadImage } from "@napi-rs/canvas";
import { installedFontSource,installedFontHost,registerInstalledFont } from "./fonts.mjs";
const base=factory=>factory().createCanvas({width:160,height:120,margin:0}).createData({id:"rows",values:[{x:50,y:45,text:"AB"}]});
const shadow={color:"rgba(0,0,255,.8)",offsetX:15,offsetY:15,blurRadius:3};
const scale={domain:[0,200],range:[0,200]};
const decode=async({bytes})=>{const image=await loadImage(bytes);return{image,width:image.width,height:image.height,originClean:true};};
export const cases=[
 {id:"paint/shadow-basic-codec-scene",async run(){
  for(const factory of [chart,basic]){
   const p=base(factory).createPointMark({shadow,fill:"red"}).encodeX({field:"x",scale}).encodeY({field:"y",scale}).encodePointRadius({value:15});
   const original=serializeProgram(p),shadows=await basicPrepare(p,{createCanvas,decode}),canvas=createCanvas(1,1);
   try{render(p,canvas.getContext("2d"),{shadows});assert.deepEqual(canvas.toBuffer("image/png"),(await renderToPNGBuffer(p)).buffer);assert.match(renderToSVG(p,{shadows}),/data:image\/png;base64/);}
   finally{shadows.dispose();}
   assert.throws(()=>render(p,canvas.getContext("2d"),{shadows}),e=>e.assetCode==="disposed");
   const restored=deserializeGraphic(serializeGraphic(p)),scene=createTransitionScene(restored,{format:"canvas"});
   const sceneShadows=await basicPrepare(scene,{createCanvas,decode});
   try{renderTransitionScene(scene,canvas.getContext("2d"),{shadows:sceneShadows});assert.deepEqual(canvas.toBuffer("image/png"),(await renderToPNGBuffer(restored)).buffer);}finally{sceneShadows.dispose();}
   assert.equal(serializeProgram(p),original);assert.equal(deserializeProgram(original).editPointMark({shadow:false}).graphicSpec.objects.point.items[0].properties.shadow,undefined);
  }
 }},
 {id:"paint/shadow-text-font-outline-native",async run(){
  let p=base(chart).createTextMark({shadow,outline:{color:"green",width:2},lineJoin:"round",fill:"red",opacity:.5,fontFamily:installedFontSource.family,fontWeight:400,fontSize:20})
   .encodeX({field:"x",scale}).encodeY({field:"y",scale}).encodeText({field:"text"});
  p=p.createFontResource({prepared:await prepareFontResource(p,{kind:"create",id:"font",...installedFontSource},installedFontHost),requestToken:"current"});
  p=p.applyTextMetrics({prepared:await prepareTextMetrics(p,{id:"exact",fonts:["font"]},{requestToken:installedFontHost.requestToken,decode:installedFontHost.decode,measure:installedFontHost.measure}),requestToken:"current"});
  const fonts=await prepareFontRendering(p,{register:registerInstalledFont}),shadows=await prepareShadowRendering(p,{fonts,createCanvas,decode}),canvas=createCanvas(1,1);
  try{render(p,canvas.getContext("2d"),{fonts,shadows});assert.deepEqual(canvas.toBuffer("image/png"),(await renderToPNGBuffer(p)).buffer);assert.match(renderToSVG(p,{shadows}),/<image/);}
  finally{shadows.dispose();fonts.dispose();}
  assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0,4).toString(),"%PDF");
  assert.deepEqual((await renderToPNGBuffer(deserializeGraphic(serializeGraphic(p)))).buffer,canvas.toBuffer("image/png"));
 }},
 {id:"paint/shadow-stale-density-fresh-process",async run(){
  const p=base(chart).createRectMark({shadow}).encodeX({field:"text",fieldType:"nominal"}).encodeY({field:"text",fieldType:"nominal"});
  const canvas=createCanvas(10,10),context=canvas.getContext("2d"),shadows=await prepareShadowRendering(p,{createCanvas,decode});
  try{
   assert.throws(()=>render(p.editRectMark({fill:"red"}),context,{shadows}),e=>e.assetCode==="stale-result");
   assert.throws(()=>render(p,context,{shadows,pixelRatio:2}),e=>e.assetCode==="density-mismatch");assert.equal(canvas.width,10);
   const code=`import{readFileSync}from'node:fs';import{deserializeProgram}from'ggaction/persistence';import{renderToPNGBuffer}from'ggaction/png';const p=deserializeProgram(readFileSync(0,'utf8'));console.log((await renderToPNGBuffer(p)).buffer.toString('base64'));`;
   const child=spawnSync(process.execPath,["--input-type=module","-e",code],{input:serializeProgram(p),encoding:"utf8"});assert.equal(child.status,0,child.stderr);
   assert.equal(child.stdout.trim(),(await renderToPNGBuffer(p)).buffer.toString("base64"));
  }finally{shadows.dispose();}
 }}
];
