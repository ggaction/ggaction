import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render, hconcat } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { getMarkItems } from "ggaction/inspection";
import { createInteractionSession } from "ggaction/interaction";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
const rows=[{id:1,x:0,y:7,w:8,g:"A"},{id:"1",x:10,y:7,w:32,g:"A"},{id:"b0",x:0,y:3,w:28,g:"B"},{id:"b1",x:10,y:3,w:12,g:"B"}];
const create=()=>chart().createCanvas({width:420,height:240,margin:40}).createData({id:"d",values:rows,keyField:"id"}).createTrailPlot({id:"trail",x:{field:"x",scale:{domain:[0,10]}},y:{field:"y",scale:{domain:[0,10]}},width:"w",groupBy:"g",guides:false});
export const cases=[
 {id:"trail/public-lifecycle",run(){
  assert.match(import.meta.resolve("ggaction"),/\/node_modules\/ggaction\//);assert.equal(basic().createTrailPlot,undefined);assert.equal(basic().editTrailPlot,undefined);
  const p=create(),saved=serializeProgram(p),keys=getMarkItems(p,{target:"trail"}).map(item=>item.key);assert.equal(new Set(keys).size,2);
  const q=p.editTrailPlot({width:18,body:{fill:"red"}}).reviseData({source:"d",id:"next",values:[...rows].reverse()});
  assert.deepEqual(new Set(getMarkItems(q,{target:"trail"}).map(item=>item.key)),new Set(keys));
  const selected=q.selectMarks({id:"selection",target:"trail",field:"g",op:"eq",value:"A"}).highlightMarks({selection:"selection",fill:"blue"});
  assert.equal(selected.graphicSpec.objects.trail.items.find(item=>item.identity.key===keys[0]).properties.fill,"blue");
  const session=createInteractionSession({program:p});session.dispatch({type:"inspect",point:{x:200,y:88}});assert.equal(session.getState().hit.target.itemKey,keys[0]);session.destroy();
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);assert.equal(serializeProgram(p),saved);
 }},
 {id:"trail/offline-scene-renderers",async run(){
  const p=create().editTrailPlot({color:"g"}),snapshot=deserializeGraphic(serializeGraphic(p));assert.equal(renderToSVG(snapshot),renderToSVG(p));
  const png=(await renderToPNGBuffer(p)).buffer;assert.deepEqual((await renderToPNGBuffer(snapshot)).buffer,png);
  const canvas=createCanvas(1,1);render(snapshot,canvas.getContext("2d"));assert.deepEqual(canvas.toBuffer("image/png"),png);
  const scene=createTransitionScene(snapshot,{format:"canvas"}),target=createCanvas(1,1);renderTransitionScene(scene,target.getContext("2d"));assert.deepEqual(target.toBuffer("image/png"),png);
  const pdf=await renderToPDFBuffer(snapshot);assert.deepEqual([pdf.width,pdf.height,pdf.pages],[420,240,1]);assert.match(pdf.buffer.subarray(0,8).toString(),/%PDF-/);
 }},
 {id:"trail/fresh-process-and-nested",run(){
  const p=create(),saved=serializeProgram(p);
  const script=`import{readFileSync}from'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';globalThis.fetch=()=>{throw Error('No network')};const p=deserializeProgram(readFileSync(0,'utf8'));process.stdout.write(serializeProgram(p.editTrailPlot({width:18})));`;
  const q=deserializeProgram(execFileSync(process.execPath,["--input-type=module","-e",script],{input:saved,encoding:"utf8",timeout:30000}));assert.equal(q.semanticSpec.layers[0].trail.width.datum,18);
  const facet=p.facet({field:"g"});assert.deepEqual(Object.values(facet.children).map(child=>getMarkItems(child,{target:"trail"}).length),[1,1]);
  const nested=hconcat({programs:[{id:"left",program:p},{id:"right",program:q}]}).editTrailPlot({target:{childPath:["left"],id:"trail"},body:{fill:"red"}});
  assert.equal(nested.children.left.graphicSpec.objects.trail.items[0].properties.fill,"red");assert.notEqual(nested.children.right.graphicSpec.objects.trail.items[0].properties.fill,"red");
  assert.deepEqual(deserializeProgram(serializeProgram(nested)).graphicSpec,nested.graphicSpec);
 }}
];
