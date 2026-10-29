import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createCanvas } from "@napi-rs/canvas";
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
const rows=[{id:1,name:"Alpha",v:4,g:"a",trend:[{x:0,y:1},{x:1,y:3}]},{id:"1",name:"Beta",v:8,g:"b",trend:[{x:0,y:3},{x:1,y:2}]}];
const create=()=>chart().createCanvas({width:420,height:240,margin:20}).createData({id:"d",values:rows,keyField:"id"})
  .createTablePlot({id:"table",columns:["name",{field:"v",cell:"bar",footer:"sum",align:"right"},{field:"trend",cell:{type:"sparkline",x:"x",y:"y"}}]});
const items=p=>getMarkItems(p,{target:"table"});
export const cases=[
  {id:"table/public-lifecycle",run(){
    assert.match(import.meta.resolve("ggaction"),/\/node_modules\/ggaction\//);
    assert.equal(basic().createTablePlot,undefined);
    const p=create(),saved=serializeProgram(p),keys=items(p).map(item=>item.key);
    assert.equal(new Set(keys).size,12);
    const q=p.editTablePlot({sortBy:[{field:"v",order:"descending"}]}).reviseData({source:"d",id:"next",values:[...rows].reverse()});
    assert.deepEqual(new Set(items(q).map(item=>item.key)),new Set(keys));
    const selected=q.selectMarks({id:"s",target:"table",field:"id",op:"eq",value:1}).highlightMarks({selection:"s",fill:"red",bringToFront:true});
    assert.ok(items(selected).filter(item=>item.fields.id===1).every(item=>item.properties.fill==="red"));
    const session=createInteractionSession({program:p});session.dispatch({type:"inspect",point:{x:30,y:60}});
    assert.equal(session.getState().hit.target.itemKey,keys[3]);session.destroy();
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
    assert.equal(serializeProgram(p),saved);
  }},
  {id:"table/offline-clipped-scene-renderers",async run(){
    const p=create().editTablePlot({rowLimit:1}),snapshot=deserializeGraphic(serializeGraphic(p));
    assert.equal(renderToSVG(snapshot),renderToSVG(p));
    const png=(await renderToPNGBuffer(p)).buffer;
    assert.deepEqual((await renderToPNGBuffer(snapshot)).buffer,png);
    const canvas=createCanvas(1,1);render(snapshot,canvas.getContext("2d"));
    assert.deepEqual(canvas.toBuffer("image/png"),png);
    const scene=createTransitionScene(snapshot,{format:"canvas"}),target=createCanvas(1,1);renderTransitionScene(scene,target.getContext("2d"));
    assert.deepEqual(target.toBuffer("image/png"),png);
    const pdf=await renderToPDFBuffer(snapshot);
    assert.deepEqual([pdf.width,pdf.height,pdf.pages],[420,240,1]);
    assert.match(pdf.buffer.subarray(0,8).toString(),/%PDF-/);
    const footer=exportAccessibleData(p,{target:"table"}).views[0].rows.find(row=>row.values["table:inputRows"]===2);
    assert.equal(footer.values["table:value"],12);
  }},
  {id:"table/fresh-process-and-nested",run(){
    const p=create(),saved=serializeProgram(p);
    const script=`import{readFileSync}from'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';globalThis.fetch=()=>{throw Error('No network')};const p=deserializeProgram(readFileSync(0,'utf8'));process.stdout.write(serializeProgram(p.editTablePlot({rowLimit:1})));`;
    const q=deserializeProgram(execFileSync(process.execPath,["--input-type=module","-e",script],{input:saved,encoding:"utf8",timeout:30000}));
    assert.equal(q.graphicSpec.objects.table.items[0].properties.text,"1 of 2 rows shown");
    const facets=p.facet({field:"g"});
    assert.deepEqual(Object.values(facets.children).map(child=>items(child).filter(item=>item.channels.role==="body").length),[3,3]);
    const nested=hconcat({programs:[{id:"left",program:p},{id:"right",program:q}]}).editTablePlot({target:{childPath:["left"],id:"table"},cells:{fill:"red"}});
    assert.ok(items(nested.children.left).filter(item=>item.channels.role==="body").every(item=>item.properties.fill==="red"));
    assert.deepEqual(deserializeProgram(serializeProgram(nested)).graphicSpec,nested.graphicSpec);
    assert.equal(serializeProgram(p),saved);
  }}
];
