import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chart, render, prepareImageResource, prepareImageRendering } from "ggaction";
import { createHash } from "node:crypto";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { chart as basicChart } from "ggaction/basic";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createCanvas, loadImage } from "@napi-rs/canvas";
const outline = { color: "white", width: 8 };
const seed = factory => factory().createCanvas({ width: 240, height: 180, margin: 30 })
  .createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 2 }] });
export const cases = [
  { id: "paint/outline-basic-and-codec", async run() {
    for (const factory of [chart, basicChart]) {
      const p = seed(factory).createPointMark({ outline }).encodeX({ field: "x" }).encodeY({ field: "y" });
      assert.ok(p.graphicSpec.objects.point.items.every(item => item.properties.outline.width === 8));
      const restored = deserializeGraphic(serializeGraphic(p));
      assert.equal(renderToSVG(restored), renderToSVG(p));
      render(restored, createCanvas(1, 1).getContext("2d"));
      assert.ok((await renderToPNGBuffer(restored)).buffer.length > 100);
      assert.ok((await renderToPDFBuffer(restored)).buffer.length > 100);
    }
  } },
  { id: "paint/outline-text-and-fresh-edit", async run() {
    const p = seed(chart).createTextMark({ outline, opacity: .5, fontSize: 26, lineJoin: "round" })
      .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ value: "AB\nCD" });
    assert.match(renderToSVG(p), /paint-order="stroke fill"/);
    const restored = deserializeProgram(serializeProgram(p));
    assert.deepEqual((await renderToPNGBuffer(restored)).buffer, (await renderToPNGBuffer(p)).buffer);
    assert.ok((await renderToPDFBuffer(restored)).buffer.length > 100);
    const code = `import {readFileSync} from 'node:fs'; import {deserializeProgram} from 'ggaction/persistence'; import {renderToSVG} from 'ggaction/svg'; const p=deserializeProgram(readFileSync(0,'utf8')); console.log(renderToSVG(p.editTextMark({outline:false})));`;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], { input: serializeProgram(p), encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout.trim(), renderToSVG(p.editTextMark({ outline: false })));
  } }
  , { id: "paint/outline-image-hierarchy-composition", async run() {
    const values = [{id:"root",parent:null,value:10,x:20,y:150},{id:"a",parent:"root",value:6,x:50,y:150},{id:"b",parent:"root",value:4,x:80,y:150}];
    const base = chart().createCanvas({width:260,height:200,margin:0}).createData({id:"rows",values,keyField:"id"})
      .createHierarchyData({id:"h",key:"id",parent:"parent",value:"value"})
      .layoutHierarchy({id:"layout",method:"treemap",options:{size:[160,90],padding:5,method:"squarify"}})
      .createTreemapPlot({id:"map",labels:{}})
      .createPointMark({id:"dots",data:"rows",outline,fill:"blue"}).encodeX({field:"x"}).encodeY({field:"y"});
    const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>');
    const prepared = await prepareImageResource(base,{kind:"create",id:"logo",uri:"fixture:logo",mimeType:"image/svg+xml",expectedHash:createHash("sha256").update(bytes).digest("hex")},
      {requestToken:"now",load:()=>({bytes,mimeType:"image/svg+xml"}),decode:()=>({width:20,height:10,originClean:true})});
    const p=base.createImageResource({prepared,requestToken:"now"}).createImageMark({image:"logo",viewport:{x:220,y:160,width:20,height:10}});
    const q=deserializeProgram(serializeProgram(p)).reviseData({source:"rows",id:"next",values:values.map(row=>({...row,value:row.value*2}))});
    assert.equal(q.semanticSpec.resources.find(resource=>resource.kind==="hierarchy").revision,1);
    assert.equal(q.semanticSpec.resources.find(resource=>resource.kind==="image").revision,0);
    assert.ok(q.graphicSpec.objects.dots.items.every(item=>item.properties.outline.width===8));
    const decode=async({bytes})=>{const image=await loadImage(bytes);return{image,width:image.width,height:image.height,originClean:true};};
    const canvas=createCanvas(1,1);render(q,canvas.getContext("2d"),{images:await prepareImageRendering(q,{decode})});
    const scene=createTransitionScene(q,{format:"canvas"}),sceneCanvas=createCanvas(1,1);
    renderTransitionScene(scene,sceneCanvas.getContext("2d"),{images:await prepareImageRendering(scene,{decode})});
    assert.deepEqual(sceneCanvas.toBuffer("image/png"),canvas.toBuffer("image/png"));
    assert.deepEqual((await renderToPNGBuffer(q)).buffer,canvas.toBuffer("image/png"));
    assert.equal((await renderToPDFBuffer(q)).buffer.subarray(0,4).toString(),"%PDF");
    assert.match(renderToSVG(q),/paint-order="stroke fill"/);
    assert.match(renderToSVG(q),/data:image\/svg\+xml;base64,/);
  } }
];
