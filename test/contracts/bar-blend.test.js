import assert from "node:assert/strict";
import test from "node:test";
import {createCanvas} from "@napi-rs/canvas";
import {chart, render} from "../../src/index.js";
import {renderToSVG} from "../../src/renderers/svg.js";
import {renderToPNGBuffer} from "../../src/renderers/png.js";
import {renderToPDFBuffer} from "../../src/renderers/pdf.js";
import {serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic} from "../../src/persistence.js";
import {createTransitionScene,renderTransitionScene} from "../../src/scene.js";
import {createMockCanvasContext} from "../support/canvas.js";
import {differenceOver,blendOver} from "../oracles/compositing.js";

function bars() {
  return chart().createCanvas({width:200,height:200,margin:40})
    .createData({values:[{category:"a",value:1}]})
    .createBarPlot({x:"category", y:{field:"value",aggregate:"sum"}, guides:false});
}
function pixel(context,x,y) { return [...context.getImageData(x,y,1,1).data]; }
function paint(program,pixelRatio=1) {
  const canvas=createCanvas(1,1),context=canvas.getContext("2d");
  render(program,context,{pixelRatio});return context;
}

test("anchors the independent difference equation with opaque and transparent colors",()=>{
  assert.deepEqual(differenceOver([1,0,0,1],[1,1,1,1]),[0,1,1,1]);
  assert.deepEqual(differenceOver([1,0,0,.4],[1,1,1,1]),[.6,1,1,1]);
  assert.deepEqual(differenceOver([.2,.4,.6,1],[0,0,0,0]),[.2,.4,.6,1]);
  assert.deepEqual(differenceOver([0,0,0,0],[0,0,0,0]),[0,0,0,0]);
});

for(const mode of ["difference","multiply","screen"])test(`bar blend is a single optional semantic intent with exact normal reset (${mode})`,()=>{
  const p=bars(),before=serializeProgram(p),q=p.editBarMark({blend:mode});
  assert.equal(q.semanticSpec.layers[0].mark.blend,mode);
  assert.equal(q.markConfigs.barPlot?.barAppearance?.blend,undefined);
  assert.equal(q.graphicSpec.objects.barPlot.items[0].properties.blend,mode);
  const reset=q.editBarMark({blend:"normal"});
  assert.deepEqual(reset.semanticSpec,p.semanticSpec);assert.deepEqual(reset.graphicSpec,p.graphicSpec);
  assert.deepEqual(reset.markConfigs,p.markConfigs);assert.deepEqual(p.editBarMark({blend:"normal"}).markConfigs,p.markConfigs);
  assert.equal(renderToSVG(reset),renderToSVG(p));assert.equal(serializeProgram(p),before);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  assert.deepEqual(q.editBarMark({fill:"red"}).semanticSpec,q.semanticSpec);
  assert.match(renderToSVG(q),new RegExp(`mix-blend-mode:${mode}`));assert.match(renderToSVG(q),/isolation:isolate/);
  assert.doesNotMatch(renderToSVG(p),/isolation:|mix-blend/);
});

test("difference combines one bar fill and outline before applying mark opacity",()=>{
  for(const opacity of [0,.4,1]){
    const q=bars().editBarMark({blend:"difference",fill:"red",stroke:"blue",strokeWidth:8,opacity});
    const c=paint(q);
    const fill=differenceOver([1,0,0,opacity],[1,1,1,1]).map(v=>Math.round(v*255));
    const outline=differenceOver([0,0,1,opacity],[1,1,1,1]).map(v=>Math.round(v*255));
    assert.deepEqual(pixel(c,100,100),fill);
    assert.deepEqual(pixel(c,100,42),outline,"fill/outline intersection composites once");
    assert.deepEqual(pixel(c,100,37),outline,"outer outline keeps the same source opacity");
  }
});

for(const mode of ["difference","multiply","screen"])test(`rounded, gradient and transparent bars preserve concrete blend through replay (${mode})`,async()=>{
  const q=bars().editBarMark({blend:mode,cornerRadius:12,stroke:false,fill:{type:"linear-gradient",from:{x:0,y:0},to:{x:1,y:0},stops:[{offset:0,color:"red"},{offset:1,color:"blue"}]}});
  assert.equal(q.graphicSpec.objects.barPlot.type,"collection");
  assert.equal(q.graphicSpec.objects.barPlot.items[0].type,"path");
  for(const replay of [q.editCanvas({width:240}),q.editBarMark({opacity:.4}),q.editYScale({domain:[0,2]})]){
    assert.equal(replay.graphicSpec.objects.barPlot.items[0].properties.blend,mode);
    assert.ok((await renderToPNGBuffer(replay)).buffer.length>100);
    assert.deepEqual(deserializeProgram(serializeProgram(replay)).graphicSpec,replay.graphicSpec);
  }
  assert.ok((await renderToPDFBuffer(q)).buffer.length>100);
  const transparent=bars().editCanvas({background:"none"}).editBarMark({blend:mode,fill:"red",stroke:false});
  assert.deepEqual(pixel(paint(transparent),100,100),[255,0,0,255]);
  assert.deepEqual(pixel(paint(transparent,2),200,200),[255,0,0,255]);
});

test("blend rejects invalid inputs and unsupported concrete types atomically",()=>{
  const p=bars(),before=serializeProgram(p);
  for(const blend of ["overlay","source-over","",null,undefined,1])assert.throws(()=>p.editBarMark({blend}),/blend/);
  assert.throws(()=>p.createBarMark({id:"second",blend:"difference"}),/blend/);
  assert.equal(p.editGraphics({target:p.graphicSpec.objects.barPlot.items[0].id,property:"blend",value:"normal"}).graphicSpec.objects.barPlot.items[0].properties.blend,"normal");
  const points=chart().createCanvas().createData({values:[{x:1,y:2}]}).createScatterPlot({x:"x",y:"y",guides:false});
  assert.throws(()=>points.editGraphics({target:points.graphicSpec.objects.scatterPlot.items[0].id,property:"blend",value:"difference"}),/blend/);
  assert.throws(()=>points.editSemantic({property:"layer[scatterPlot].mark.blend",value:"difference"}),/blend/);
  assert.equal(serializeProgram(p),before);
});

test("missing isolated surface capability is rejected before clear or canvas resize",()=>{
  const unsupported=createMockCanvasContext();
  assert.throws(()=>render(bars().editBarMark({blend:"difference"}),unsupported),/drawImage and compositing/);
  assert.deepEqual(unsupported.calls,[]);
  const mock=createMockCanvasContext();mock.globalCompositeOperation="source-over";mock.drawImage=()=>{};
  const original={...mock.canvas};
  assert.throws(()=>render(bars().editBarMark({blend:"difference"}),mock),/compatible Canvas surface/);
  assert.deepEqual(mock.calls,[]);assert.deepEqual(mock.canvas,original);
  const invalid=structuredClone(bars().editBarMark({blend:"difference"}).graphicSpec);
  invalid.objects.barPlot.items[0].properties.blend="overlay";
  assert.throws(()=>render({graphicSpec:invalid},mock),/blend/);assert.deepEqual(mock.calls,[]);
});

test("independent bar sources preserve painter order and caller composite state",()=>{
  const p=bars().encodeBarWidth({pixels:80}).editBarMark({blend:"difference",fill:"red",stroke:false})
    .createBarMark({id:"front"}).encodeBarWidth({pixels:80})
    .editBarMark({blend:"difference",fill:"blue",stroke:false});
  const context=paint(p);
  assert.deepEqual(pixel(context,100,100),[0,255,0,255]);
  assert.equal(context.globalCompositeOperation,"source-over");
});

test("nested fractional clipping, shared paint objects and pixel ratios keep source coordinates",()=>{
  const paint={x:0,y:0,width:30,height:30,fill:"red",stroke:"none",strokeWidth:0,blend:"difference"};
  const scene={graphicSpec:{objects:{
    canvas:{type:"canvas",properties:{width:100,height:100,background:"white"},children:["left","right","outside"]},
    left:{type:"canvas",properties:{x:10.25,y:10.5,width:20,height:20},children:["one"]},
    right:{type:"canvas",properties:{x:60.25,y:60.5,width:20,height:20},children:["two"]},
    outside:{type:"canvas",properties:{x:300,y:300,width:20,height:20},children:["hidden"]},
    one:{type:"rect",properties:paint},two:{type:"rect",properties:paint},hidden:{type:"rect",properties:paint}
  },order:["canvas"]}};
  for(const ratio of [1,2]){
    const c=paintCanvas(scene,ratio);
    for(const [x,y,expected] of [[15,15,[0,255,255,255]],[65,65,[0,255,255,255]],[35,35,[255,255,255,255]],[85,85,[255,255,255,255]]])
      assert.deepEqual(pixel(c,x*ratio,y*ratio),expected);
  }
  function paintCanvas(program,ratio){const canvas=createCanvas(1,1),c=canvas.getContext("2d");render(program,c,{pixelRatio:ratio});return c;}
});

test("DOM-compatible surface creation remains backend neutral",()=>{
  const canvas=createCanvas(1,1);canvas.ownerDocument={createElement:()=>createCanvas(1,1)};
  const c=canvas.getContext("2d");render(bars().editBarMark({blend:"difference",fill:"red",stroke:false}),c);
  assert.deepEqual(pixel(c,100,100),[0,255,255,255]);
});

test("isolated sources preflight dimensions, pixel budgets and incompatible surfaces",async()=>{
  const {prepareIsolatedGlyphs,drawIsolatedGlyph}=await import("../../src/renderers/canvas/isolated.js");
  const {resolveGraphicRenderTarget}=await import("../../src/renderers/canvas/index.js");
  const target=(width,height,properties={})=>resolveGraphicRenderTarget({objects:{
    canvas:{type:"canvas",properties:{width,height},children:["glyph"]},
    glyph:{type:"rect",properties:{x:0,y:0,width,height,fill:"red",stroke:"none",strokeWidth:0,blend:"difference",...properties}}
  },order:["canvas"]});
  const c=createCanvas(1,1).getContext("2d");
  for(const [width,height] of [[40_000,1],[5_000,4_000]])assert.throws(()=>prepareIsolatedGlyphs(target(width,height),c),/raster allocation/);
  assert.throws(()=>prepareIsolatedGlyphs(target(20,20,{x:NaN}),c),/finite isolated paint bounds/);
  assert.throws(()=>drawIsolatedGlyph(c,"absent",{properties:{}},()=>{}),/no prepared/);
  const supplied={};assert.throws(()=>prepareIsolatedGlyphs(target(20,20),c,{createCanvas:()=>supplied}),/compatible Canvas surface/);
  const mock=createMockCanvasContext();mock.drawImage=()=>{};mock.canvas.ownerDocument={createElement:()=>createCanvas(1,1)};
  Object.defineProperty(mock,"globalCompositeOperation",{get:()=>"source-over",set:()=>{}});
  assert.throws(()=>prepareIsolatedGlyphs(target(20,20),mock),/does not support difference/);
  assert.deepEqual(mock.calls.map(call=>call.op),["save","restore"]);
  const gradient={type:"linear-gradient",from:{x:0,y:0},to:{x:1,y:0},stops:[{offset:0,color:"red"},{offset:1,color:"blue"}]};
  const source=createCanvas(1,1),native=source.getContext("2d");
  Object.defineProperty(native,"createLinearGradient",{value:undefined});
  assert.throws(()=>prepareIsolatedGlyphs(target(20,20,{fill:gradient}),c,{createCanvas:()=>source}),/compatible Canvas surface/);
});

test("malformed stored blend is rejected by shared graphic and semantic validation",async()=>{
  const {decodeValue,encodeValue}=await import("../../src/persistence/codec.js");
  const p=bars().editBarMark({blend:"difference"});
  for(const mutate of [
    state=>{state.semanticSpec.layers[0].mark.blend="normal";},
    state=>{state.graphicSpec.objects.barPlot.items[0].properties.blend="overlay";},
    state=>{state.semanticSpec.layers[0].mark.type="point";}
  ]){
    const envelope=JSON.parse(serializeProgram(p)),state=decodeValue(envelope.payload);mutate(state);envelope.payload=encodeValue(state);
    assert.throws(()=>deserializeProgram(JSON.stringify(envelope)),/blend/);
  }
});

for(const mode of ["difference","multiply","screen"])test(`ranged horizontal and vertical bars retain blend through data, themes, highlights and facets (${mode})`,async()=>{
  const rows=[{category:"a",group:"east",lower:1,upper:4},{category:"b",group:"west",lower:2,upper:6}];
  for(const horizontal of [false,true]){
    const p=chart().createCanvas({width:360,height:300,margin:60}).createData({values:rows})
      .createBarPlot(horizontal?{x:{lower:"lower",upper:"upper"},y:"category",guides:false}:{x:"category",y:{lower:"lower",upper:"upper"},guides:false})
      .editBarMark({blend:mode});
    const variants=[p.applyTheme({theme:"dark"}),p.reviseData({source:"data",id:"revised",values:rows.map(row=>({...row,upper:row.upper+1}))}),p.highlightMarks({target:"barPlot",select:{grain:"item",field:"category",op:"eq",value:"a"},color:"blue"}),p.editCanvas({width:400})];
    for(const q of variants){
      assert.ok(q.graphicSpec.objects.barPlot.items.every(item=>item.properties.blend===mode));
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
      assert.ok((await renderToPNGBuffer(q)).buffer.length>100);
    }
    const facet=p.facet({field:"group"});
    for(const child of Object.values(facet.children))assert.ok(child.graphicSpec.objects.barPlot.items.every(item=>item.properties.blend===mode));
    assert.ok((await renderToPNGBuffer(facet)).buffer.length>100);
  }
});

for(const mode of ["multiply","screen"])test(`${mode} applies opacity once after fill and outline composition`,()=>{
  const backdrop=[.2,.4,.6,1];
  for(const opacity of [0,.4,1]){
    const q=bars().editCanvas({background:"#336699"})
      .editBarMark({blend:mode,fill:"red",stroke:"blue",strokeWidth:8,opacity});
    const c=paint(q);
    for(const [x,y,color] of [[100,100,[1,0,0]],[100,42,[0,0,1]],[100,37,[0,0,1]]]){
      const expected=blendOver([...color,opacity],backdrop,mode).map(value=>Math.round(value*255));
      const actual=pixel(c,x,y);
      actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<=(i===3?0:1),JSON.stringify({mode,opacity,actual,expected})));
    }
  }
});

for(const mode of ["difference","multiply","screen"])test(`${mode} survives graphic-only restore and scene endpoint rendering`,()=>{
  const before=bars().editBarMark({fill:"#f00000",stroke:"#ffff00",strokeWidth:8,opacity:.5});
  const program=before.editCanvas({background:"#336699"}).editBarMark({blend:mode});
  const restored=deserializeGraphic(serializeGraphic(program));
  assert.equal(renderToSVG(restored),renderToSVG(program));
  const scene=createTransitionScene(restored,{format:"canvas"});
  assert.deepEqual(scene.nodes.map(node=>node.key),createTransitionScene(before,{format:"canvas"}).nodes.map(node=>node.key));
  assert.equal(scene.nodes.filter(node=>node.properties.blend===mode).length,1);
  assert.equal(createTransitionScene(restored).nodes.filter(node=>node.svg.includes(`mix-blend-mode:${mode}`)).length,1);
  for(const pixelRatio of [1,2]){
    const surface=createCanvas(1,1),context=surface.getContext("2d");
    renderTransitionScene(scene,context,{pixelRatio});
    const expected=paint(program,pixelRatio),size=200*pixelRatio;
    assert.deepEqual(context.getImageData(0,0,size,size).data,expected.getImageData(0,0,size,size).data);
  }
});
