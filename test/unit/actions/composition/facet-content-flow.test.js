import assert from "node:assert/strict";
import test from "node:test";
import { decodeValue, encodeSharedValue } from "../../../../src/persistence/codec.js";
import { chart, hconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { namespaceGraphicId } from "../../../../src/materialization/compositionSnapshot.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../src/renderers/pdf.js";
import { assertAnalyticPixels } from "../../../support/analytic-pixels.js";
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const values=[3,7,11,2].flatMap((r,i)=>[{g:String(i),row:i<2?'a':'b',x:0,y:0,s:r*r},{g:String(i),row:i<2?'a':'b',x:100,y:100,s:r*r}]);
function source(rows=values){return chart().createCanvas({plot:{width:100,height:100},margin:50})
  .createData({id:"raw",values:rows}).createScatterPlot({id:"points",x:{field:"x",scale:{domain:[0,100]}},
    y:{field:"y",scale:{domain:[0,100]}},guides:false})
  .encodeSize({field:"s",scale:{type:"linear",domain:[0,121],range:[0,121*Math.PI]}}).editPointMark({stroke:false});}
const options={field:"g",columns:2,spacing:"content",gap:16,headers:{labelMap:[0,1,2,3].map(i=>({value:String(i),label:""}))}};
function origins(p){const {layout,plots}=resolveFacetProgramLayout(p);return layout.children.map((c,i)=>[c.x+plots[i].x,c.y+plots[i].y]);}
function graphic(p,child,id){return namespaceGraphicId(`${p.compositionSpec.id}-${child}`,id);}

test("native content flow matches independent circle-bound arithmetic without aligned row tracks",()=>{
  const base=source(),saved=serializeProgram(base),p=base.facet(options),xy=origins(p);
  // Radii 3,7,11,2 => column right extents 111/107, first-row bottom 107.
  // Each leading extent is added independently with the 16px content gap.
  const expected=[[0,0],[134,0],[0,134],[129,125]];
  xy.forEach(([x,y],i)=>{close(x-xy[0][0],expected[i][0]);close(y-xy[0][1],expected[i][1]);});
  assert.deepEqual(p.compositionSpec.facet.values,["0","1","2","3"]);
  assert.ok(xy[3][1]<xy[2][1]);
  assert.equal(serializeProgram(base),saved);
  const widened=origins(p.editCompositionLayout({gap:26}));
  close(widened[1][0]-widened[0][0],144);close(widened[2][1]-widened[0][1],144);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  assert.deepEqual(p.editCompositionLayout({spacing:"canvas"}).editCompositionLayout({spacing:"content"}).graphicSpec,p.graphicSpec);
});

test("per-channel outer policy keeps every Y owner and one common bottom footer per occupied column",()=>{
  for(const count of [3,4]){
    const p=source(values.slice(0,count*2)).createAxes().facet({...options,headers:{anchor:"view"},guides:{axes:{x:"outer",y:"each"}}});
    const ids=p.compositionSpec.children,ys=[];
    for(let i=0;i<ids.length;i++){
      assert.ok(p.graphicSpec.objects[graphic(p,ids[i],"yAxisLine")]);
      const id=graphic(p,ids[i],"xAxisLine");
      if(i+2<ids.length)assert.equal(p.graphicSpec.objects[id],undefined);
      else {assert.ok(p.graphicSpec.objects[id]);ys.push(resolveConcreteGraphicBounds(p.graphicSpec,id).top);}
    }
    assert.equal(ys.length,2);close(ys[0],ys[1]);
    const edited=p.editFacetGuides({axes:{y:"outer"}});
    assert.deepEqual(edited.compositionSpec.facet.guides.axes,{x:"outer",y:"outer"});
    assert.deepEqual(p.editFacetGuides({axes:"each"}).compositionSpec.facet.guides.axes,"each");
    assert.deepEqual(deserializeProgram(serializeProgram(p)).editFacetGuides({axes:{y:"each"}}).graphicSpec,p.graphicSpec);
  }
});

test("content layout retains headers, four-edge titles, legends, edits and backend output",async()=>{
  for(const position of ["top","bottom","left","right"]){
    const p=source().encodeColor({field:"g"}).createAxes().facet({...options,
      headers:{anchor:"view"},guides:{axes:{x:"outer",y:"each"},legend:{channels:["color"],position}}})
      .createTitle({text:"Packed",position});
    assert.ok(assertAnalyticPixels(p)>0);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
    const changed=p.editCompositionLayout({gap:28}).editFacetHeaders({fontSize:14}).editTitle({text:"Edited"});
    assert.ok(changed.graphicSpec.objects.canvas.properties.height>0);
    const snapshot=deserializeGraphic(serializeGraphic(p));
    assert.equal(renderToSVG(p),renderToSVG(snapshot));
    const a=await renderToPNGBuffer(p),b=await renderToPNGBuffer(snapshot);assert.deepEqual(a.buffer,b.buffer);
    assert.equal((await renderToPDFBuffer(p)).pages,1);
  }
});

test("axis policy objects work in keyed grids while unsupported content grids fail atomically",()=>{
  const base=source().createAxes(),saved=serializeProgram(base);
  const grid=base.facetGrid({rows:{field:"row"},columns:{field:"g"},guides:{axes:{y:"outer"}}});
  assert.deepEqual(grid.compositionSpec.facet.guides.axes,{x:"each",y:"outer"});
  for(const axes of [{},{x:"bad"},{z:"each"},{x:undefined},null])assert.throws(()=>base.facet({...options,guides:{axes}}),/axes/);
  assert.throws(()=>base.facetGrid({rows:{field:"row"},columns:{field:"g"},spacing:"content"}),/wrapped/);
  assert.throws(()=>base.facet({...options,topLane:"shared"}),/plot/);
  assert.equal(serializeProgram(base),saved);
  const p=base.facet({...options,guides:{axes:{x:"outer"}}});
  const snapshot=JSON.parse(serializeProgram(p));
  const state=decodeValue(snapshot.payload);
  state.compositionSpec.facet.guides.axes.x="bogus";
  snapshot.payload=encodeSharedValue(state);
  assert.throws(()=>deserializeProgram(JSON.stringify(snapshot)),/axes/);
});


test("content flow recomputes source, scale, theme and text edits and survives nesting",()=>{
  const base=source().createAxes().facet({...options,headers:{anchor:"view"},guides:{axes:{x:"outer",y:"each"}}});
  const before=serializeProgram(base);
  const updates=[p=>p.editFacetSource({action:{method:"encodeSize",options:{target:"points",value:81*Math.PI}}}),
    p=>p.editFacetScales({y:"independent"}),p=>p.applyTheme({theme:"light"}),
    p=>p.applyTextMetrics({profile:{schemaVersion:1,id:"content",measurements:[
      {text:"100",fontFamily:"sans-serif",fontSize:12,fontWeight:400,width:25}]}})];
  for(const update of updates){
    const next=update(base);
    assert.equal(next.compositionSpec.spacing,"content");
    assert.deepEqual(next.compositionSpec.facet.guides.axes,{x:"outer",y:"each"});
    assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec,next.graphicSpec);
    const nested=hconcat({programs:[next,next]});
    assert.deepEqual(deserializeProgram(serializeProgram(nested)).graphicSpec,nested.graphicSpec);
    assert.match(renderToSVG(nested),/<svg/);
  }
  assert.equal(serializeProgram(base),before);
  const repeat=source().createAxes().repeatCharts({channel:"y",fields:["y","s"],spacing:"content",guides:{axes:{x:"each"}}});
  assert.deepEqual(repeat.compositionSpec.facet.guides.axes,{x:"each",y:"each"});
  assert.throws(()=>repeat.editFacetGuides({axes:{x:"outer"}}),/repeated fields/);
});

test("channel policies use named axis channels and component sides on ragged content flows",()=>{
  const p=source(values.slice(0,6)).createXAxis({id:"time",position:"top"})
    .createYAxis({id:"amount",position:"right"}).facet({...options,headers:{anchor:"view"},guides:{axes:{x:"outer",y:"each"}}});
  p.compositionSpec.children.forEach((id,i)=>{
    assert.equal(Boolean(p.graphicSpec.objects[graphic(p,id,"axis_time__Line")]),i<2);
    assert.ok(p.graphicSpec.objects[graphic(p,id,"axis_amount__Line")]);
  });
  assert.deepEqual(deserializeProgram(serializeProgram(p)).editCompositionLayout({gap:16}).graphicSpec,p.graphicSpec);
});
