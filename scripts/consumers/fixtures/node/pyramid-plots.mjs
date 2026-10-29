import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render, hconcat } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { getMarkItems } from "ggaction/inspection";
import { exportAccessibleData } from "ggaction/accessibility";
import { createInteractionSession } from "ggaction/interaction";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
const rows = [{id:"a",stage:"Visit",value:100,group:"a"},{id:"b",stage:"Try",value:60,group:"a"},{id:"c",stage:"Return",value:20,group:"b"}];
const create = () => chart().createCanvas({width:300,height:240,margin:20}).createData({id:"d",values:rows,keyField:"id"}).createPyramidPlot({stage:"stage",value:"value"});
export const cases = [
  { id:"pyramid/public-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.equal(basic().createPyramidPlot,undefined); assert.equal(basic().editPyramidPlot,undefined);
    const p=create(), saved=serializeProgram(p), keys=getMarkItems(p,{target:"pyramid"}).map(item=>item.key);
    const q=p.editPyramidPlot({encoding:"area",orientation:"left",labels:false}).reviseData({source:"d",id:"next",values:[...rows].reverse()});
    assert.deepEqual(getMarkItems(q,{target:"pyramid"}).map(item=>item.key), [...keys].reverse());
    assert.equal(exportAccessibleData(q,{target:"pyramid"}).views[0].rows.length,3);
    const selected=q.selectMarks({id:"selection",target:"pyramid",field:"id",op:"eq",value:"b"}).highlightMarks({selection:"selection",fill:"red"});
    assert.equal(selected.graphicSpec.objects.pyramid.items.find(item=>item.identity.key===keys[1]).properties.fill,"red");
    const session=createInteractionSession({program:p}); session.dispatch({type:"inspect",point:{x:150,y:120}});
    assert.equal(session.getState().hit.target.itemKey,keys[1]); session.destroy();
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
    assert.equal(serializeProgram(p),saved);
  } },
  { id:"pyramid/offline-scene-renderers", async run() {
    const p=create().editPyramidPlot({color:"group"}), snapshot=deserializeGraphic(serializeGraphic(p));
    assert.equal(renderToSVG(snapshot),renderToSVG(p));
    const png=(await renderToPNGBuffer(p)).buffer; assert.deepEqual((await renderToPNGBuffer(snapshot)).buffer,png);
    const canvas=createCanvas(1,1); render(snapshot,canvas.getContext("2d")); assert.deepEqual(canvas.toBuffer("image/png"),png);
    const scene=createTransitionScene(snapshot,{format:"canvas"}), target=createCanvas(1,1); renderTransitionScene(scene,target.getContext("2d"));
    assert.deepEqual(target.toBuffer("image/png"),png);
    const pdf=await renderToPDFBuffer(snapshot); assert.deepEqual([pdf.width,pdf.height,pdf.pages],[300,240,1]); assert.match(pdf.buffer.subarray(0,8).toString(),/%PDF-/);
    assert.ok((await loadImage(png)).width===300);
  } },
  { id:"pyramid/fresh-process-and-nested", run() {
    const p=create(), saved=serializeProgram(p);
    const script=`import {readFileSync} from 'node:fs';import {deserializeProgram,serializeProgram} from 'ggaction/persistence';globalThis.fetch=()=>{throw Error('No network')};const p=deserializeProgram(readFileSync(0,'utf8'));process.stdout.write(serializeProgram(p.editPyramidPlot({orientation:'right',encoding:'area'})));`;
    const q=deserializeProgram(execFileSync(process.execPath,["--input-type=module","-e",script],{input:saved,encoding:"utf8",timeout:30000}));
    assert.equal(q.semanticSpec.layers[0].pyramid.options.orientation,"right");
    const facet=p.facet({field:"group"}); assert.deepEqual(Object.values(facet.children).map(child=>getMarkItems(child,{target:"pyramid"}).length),[2,1]);
    const nested=hconcat({programs:[{id:"left",program:p},{id:"right",program:q}]}).editPyramidPlot({target:{childPath:["left"],id:"pyramid"},labels:false});
    assert.equal(nested.children.left.graphicSpec.objects.pyramid.items.length,3); assert.equal(nested.children.right.graphicSpec.objects.pyramid.items.length,6);
    assert.deepEqual(deserializeProgram(serializeProgram(nested)).graphicSpec,nested.graphicSpec);
  } }
];
