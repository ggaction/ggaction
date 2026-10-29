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
const rows = [{id:1,x:"A",r:"delta",v:5,group:"one"},{id:"1",x:"B",r:"delta",v:-2,group:"two"},{id:"total",x:"C",r:"total",group:"one"}];
const create = () => chart().createCanvas({width:340,height:240,margin:20}).createData({id:"d",values:rows,keyField:"id"}).createWaterfallPlot({id:"steps",x:"x",role:"r",value:"v",width:{pixels:20},yScale:{domain:[-5,10]},guides:false});
export const cases = [
  { id:"waterfall/public-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.equal(basic().createWaterfallPlot,undefined); assert.equal(basic().editWaterfallPlot,undefined);
    const p=create(), saved=serializeProgram(p), keys=getMarkItems(p,{target:"steps"}).map(item=>item.key);
    assert.equal(new Set(keys).size,3); assert.equal(p.graphicSpec.objects.steps.items.length,5);
    const q=p.editWaterfallPlot({connectors:false,labels:{content:"end"}}).reviseData({source:"d",id:"next",values:[...rows].reverse()});
    assert.deepEqual(getMarkItems(q,{target:"steps"}).map(item=>item.key), [...keys].reverse());
    const selected=q.selectMarks({id:"selection",target:"steps",field:"id",op:"eq",value:1}).highlightMarks({selection:"selection",fill:"red"});
    assert.equal(selected.graphicSpec.objects.steps.items.find(item=>item.identity.key===keys[0]&&item.identity.role==="bar").properties.fill,"red");
    const session=createInteractionSession({program:p}); session.dispatch({type:"inspect",point:{x:70,y:130}});
    assert.equal(session.getState().hit.target.itemKey,keys[0]); session.destroy();
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec); assert.equal(serializeProgram(p),saved);
  } },
  { id:"waterfall/offline-scene-renderers", async run() {
    const p=create().editWaterfallPlot({color:"group"}), snapshot=deserializeGraphic(serializeGraphic(p));
    assert.equal(renderToSVG(snapshot),renderToSVG(p));
    const png=(await renderToPNGBuffer(p)).buffer; assert.deepEqual((await renderToPNGBuffer(snapshot)).buffer,png);
    const canvas=createCanvas(1,1); render(snapshot,canvas.getContext("2d")); assert.deepEqual(canvas.toBuffer("image/png"),png);
    const scene=createTransitionScene(snapshot,{format:"canvas"}), target=createCanvas(1,1); renderTransitionScene(scene,target.getContext("2d")); assert.deepEqual(target.toBuffer("image/png"),png);
    const pdf=await renderToPDFBuffer(snapshot); assert.deepEqual([pdf.width,pdf.height,pdf.pages],[340,240,1]); assert.match(pdf.buffer.subarray(0,8).toString(),/%PDF-/);
  } },
  { id:"waterfall/fresh-process-and-nested", run() {
    const p=create(), saved=serializeProgram(p);
    const script=`import {readFileSync} from 'node:fs';import {deserializeProgram,serializeProgram} from 'ggaction/persistence';globalThis.fetch=()=>{throw Error('No network')};const p=deserializeProgram(readFileSync(0,'utf8'));process.stdout.write(serializeProgram(p.editWaterfallPlot({connectors:false})));`;
    const q=deserializeProgram(execFileSync(process.execPath,["--input-type=module","-e",script],{input:saved,encoding:"utf8",timeout:30000}));
    assert.equal(q.graphicSpec.objects.steps.items.length,3);
    const facet=p.facet({field:"group"}); assert.deepEqual(Object.values(facet.children).map(child=>getMarkItems(child,{target:"steps"}).length),[2,1]);
    const nested=hconcat({programs:[{id:"left",program:p},{id:"right",program:q}]}).editWaterfallPlot({target:{childPath:["left"],id:"steps"},labels:{}});
    assert.equal(nested.children.left.graphicSpec.objects.steps.items.length,8); assert.equal(nested.children.right.graphicSpec.objects.steps.items.length,3);
    assert.deepEqual(deserializeProgram(serializeProgram(nested)).graphicSpec,nested.graphicSpec);
  } }
];
