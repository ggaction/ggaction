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
const rows=["A","B"].flatMap((series,index)=>[[1,3],[2,2],[1,1],[4,0]].map((column,x)=>({id:`${series}-${x}`,series,x,value:column[index]})));
const create=()=>chart().createCanvas({width:380,height:280,margin:40}).createData({id:"d",values:rows,keyField:"id"})
  .createAreaPlot({id:"m",x:"x",y:{field:"value",scale:{nice:false}},groupBy:"series",layout:"wiggle",color:"series",area:{opacity:1},guides:false});
export const cases=[
 {id:"stream-baselines/public-lifecycle",run(){
  assert.match(import.meta.resolve("ggaction"),/\/node_modules\/ggaction\//);
  assert.equal(basic().createAreaPlot,undefined);
  const p=create(),saved=serializeProgram(p),keys=getMarkItems(p,{target:"m"}).map(item=>item.key);
  assert.deepEqual(p.resolvedScales.y.domain,[-1,4]);
  const q=p.layoutSeries({mode:"center"}).layoutSeries({mode:"wiggle"}).reviseData({source:"d",id:"next",values:[...rows].reverse()});
  assert.deepEqual(new Set(getMarkItems(q,{target:"m"}).map(item=>item.key)),new Set(keys));
  const selected=q.selectMarks({id:"selection",target:"m",field:"series",op:"eq",value:"A"}).highlightMarks({selection:"selection",fill:"red"});
  assert.equal(selected.graphicSpec.objects.m.items.find(item=>item.identity.key===keys[0]).properties.fill,"red");
  const session=createInteractionSession({program:p});session.dispatch({type:"inspect",point:{x:40,y:100}});assert.equal(session.getState().hit.target.itemKey,keys[1]);session.destroy();
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  const shared=p.createAreaPlot({id:"shared",x:"x",y:{field:"value",scale:{nice:false}},groupBy:"series",layout:"wiggle",guides:false});
  assert.deepEqual(shared.resolvedScales.y.domain,p.resolvedScales.y.domain);
  assert.deepEqual(shared.graphicSpec.objects.shared.items.map(item=>item.properties.commands),p.graphicSpec.objects.m.items.map(item=>item.properties.commands));
  const revisedShared=deserializeProgram(serializeProgram(shared)).reviseData({source:"d",id:"shared-revised",values:rows.map(row=>({...row,value:row.value*2}))});
  assert.deepEqual(revisedShared.graphicSpec.objects.shared.items.map(item=>item.properties.commands),revisedShared.graphicSpec.objects.m.items.map(item=>item.properties.commands));
  assert.equal(serializeProgram(p),saved);
 }},
 {id:"stream-baselines/offline-scene-renderers",async run(){
  const p=create(),snapshot=deserializeGraphic(serializeGraphic(p));
  assert.equal(renderToSVG(snapshot),renderToSVG(p));
  const png=(await renderToPNGBuffer(p)).buffer;
  assert.deepEqual((await renderToPNGBuffer(snapshot)).buffer,png);
  const canvas=createCanvas(1,1);render(snapshot,canvas.getContext("2d"));assert.deepEqual(canvas.toBuffer("image/png"),png);
  const scene=createTransitionScene(snapshot,{format:"canvas"}),target=createCanvas(1,1);renderTransitionScene(scene,target.getContext("2d"));assert.deepEqual(target.toBuffer("image/png"),png);
  const pdf=await renderToPDFBuffer(snapshot);assert.deepEqual([pdf.width,pdf.height,pdf.pages],[380,280,1]);assert.match(pdf.buffer.subarray(0,8).toString(),/%PDF-/);
 }},
 {id:"stream-baselines/fresh-process-nested",run(){
  const p=create(),saved=serializeProgram(p);
  const script=`import{readFileSync}from'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';globalThis.fetch=()=>{throw Error('No network')};const p=deserializeProgram(readFileSync(0,'utf8'));process.stdout.write(serializeProgram(p.layoutSeries({mode:'center'})));`;
  const q=deserializeProgram(execFileSync(process.execPath,["--input-type=module","-e",script],{input:saved,encoding:"utf8",timeout:30000}));
  assert.equal(q.semanticSpec.layers[0].layout.mode,"center");
  const facet=p.facet({field:"series"});assert.deepEqual(Object.values(facet.children).map(child=>getMarkItems(child,{target:"m"}).length),[1,1]);
  const nested=hconcat({programs:[{id:"left",program:p},{id:"right",program:q}]}).layoutSeries({target:{childPath:["right"],id:"m"},mode:"wiggle"});
  assert.equal(nested.children.left.semanticSpec.layers[0].layout.mode,"wiggle");
  assert.equal(nested.children.right.semanticSpec.layers[0].layout.mode,"wiggle");
  assert.deepEqual(deserializeProgram(serializeProgram(nested)).graphicSpec,nested.graphicSpec);
 }}
];
