import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { resolveTextBounds } from "../../../../src/core/textMetrics.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { render } from "../../../../src/renderers/canvas/index.js";
import { createMockCanvasContext, findCanvasCalls } from "../../../support/canvas.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
function label(options = {}, text = "A\nB") {
 return chart().createCanvas({width:400,height:300,margin:50}).createData({values:[{}]})
  .createAnnotation({id:"label",text,space:"plot",x:.5,y:.5,fontSize:10,align:"center",baseline:"middle",lineHeight:13,...options});
}
function props(p){return p.graphicSpec.objects.label.items[0].properties;}
test("multiline labels retain one item, explicit spacing, and empty lines",()=>{
 const p=label({},"A\n\nB"), v=props(p);
 assert.equal(p.graphicSpec.objects.label.items.length,1);
 assert.deepEqual(v.lines,[{text:"A",x:0,y:0},{text:"",x:0,y:13},{text:"B",x:0,y:26}]);
 assert.equal(props(label({},"single")).lines,undefined);
 assert.deepEqual(props(label({},"A\r\nB")).lines,props(label()).lines);
 assert.throws(()=>label({},null),/non-empty text/);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
});
test("block middle and rotation use the full multiline bounds",()=>{
 const single=resolveTextBounds(props(label({blockAlign:"middle",baseline:"alphabetic"},"A")));
 assert.equal((single.top+single.bottom)/2,150);
 const first=resolveTextBounds(props(label()));
 assert.equal(first.top,145);assert.equal(first.bottom,168);
 const centered=props(label({blockAlign:"middle"}));
 assert.deepEqual(centered.lines.map(l=>l.y),[-6.5,6.5]);
 const middle=resolveTextBounds(centered);assert.equal(middle.top,138.5);assert.equal(middle.bottom,161.5);
 const rotated=resolveTextBounds(props(label({blockAlign:"middle",rotation:Math.PI/2})));
 assert.equal(rotated.left,188.5);assert.equal(rotated.right,211.5);
 const measured=resolveTextBounds(centered,{measurements:[{text:"A",fontFamily:"sans-serif",fontSize:10,fontWeight:400,width:80},{text:"B",fontFamily:"sans-serif",fontSize:10,fontWeight:400,width:20}]});
 assert.equal(measured.left,160);assert.equal(measured.right,240);
});
test("Canvas and SVG consume the resolved lines without splitting in the renderer",()=>{
 const p=label(), c=createMockCanvasContext();render(p,c);
 assert.deepEqual(findCanvasCalls(c,"fillText").map(call=>call.args),[["A",0,0],["B",0,13]]);
 const svg=renderToSVG(p);
 assert.match(svg,/<tspan x="200" y="150">A<\/tspan><tspan x="200" y="163">B<\/tspan>/);
});
test("multiline collision layout moves whole blocks and preserves local offsets",()=>{
 const p=chart().createCanvas({width:400,height:300,margin:50}).createData({values:[{x:1,y:1,t:"A\nB"},{x:1,y:1,t:"C\nD"}]})
  .createTextMark({id:"labels",align:"center",baseline:"middle",lineHeight:13})
  .encodeChannels({target:"labels",channels:{x:{field:"x"},y:{field:"y"},text:{field:"t"}}});
 const q=p.layoutLabels({target:"labels",maxDisplacement:80});
 assert.equal(q.materializationConfigs.labelLayouts.labels.resolution.overlapAfter,0);
 assert.deepEqual(q.graphicSpec.objects.labels.items.map(i=>i.properties.lines),p.graphicSpec.objects.labels.items.map(i=>i.properties.lines));
});
test("line style edits are immutable and invalid styles reject",()=>{
 const p=label(), q=p.editTextMark({target:"label",lineHeight:20});
 assert.equal(props(q).lines[1].y,20);assert.equal(props(p).lines[1].y,13);
 assert.throws(()=>p.editTextMark({lineHeight:0}),/positive/);
 assert.throws(()=>p.editTextMark({blockAlign:"bottom"}),/blockAlign/);
});
test("multiline PNG matches explicit line primitives and PDF exports",async()=>{
 const {renderToPNGBuffer}=await import("../../../../src/renderers/png.js");
 const {renderToPDFBuffer}=await import("../../../../src/renderers/pdf.js");
 const p=label(), {lines,...style}=props(p);
 const reference=p.editGraphics({target:"label",property:"items",value:[
  {type:"text",properties:{...style,text:"A",x:200,y:150}},
  {type:"text",properties:{...style,text:"B",x:200,y:163}}
 ]});
 const actual=await renderToPNGBuffer(p), expected=await renderToPNGBuffer(reference);
 assert.deepEqual(actual.buffer,expected.buffer);
 const pdf=await renderToPDFBuffer(p);assert.equal(pdf.pages,1);assert.ok(pdf.bytes>100);
});
test("source labels, facets, content replacement and schema edits preserve logical item counts",()=>{
 const p=chart().createCanvas({width:400,height:300,margin:50}).createData({values:[
 {g:"one",x:1,y:1,t:"A\nB"},{g:"two",x:2,y:2,t:null},{g:"two",x:3,y:3,t:"C\n\nD"}]})
 .createScatterPlot({id:"points",x:"x",y:"y",guides:false})
 .createMarkLabels({id:"labels",field:"t",lineHeight:13,blockAlign:"middle"});
 assert.equal(p.graphicSpec.objects.labels.items.length,2);
 assert.deepEqual(Object.values(p.facet({field:"g"}).children).map(c=>c.graphicSpec.objects.labels.items.length),[1,1]);
 const q=p.encodeText({target:"labels",value:"single"});
 assert.ok(q.graphicSpec.objects.labels.items.every(i=>i.properties.lines.length===1));
 assert.throws(()=>p.editGraphics({target:"labels:0",property:"lines",value:[{text:"x",x:0,y:Infinity}]}),/resolved text/);
});
