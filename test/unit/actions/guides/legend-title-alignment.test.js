import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {chart as basicChart} from "../../../../src/basic.js";
import {decodeValue, encodeValue} from "../../../../src/persistence/codec.js";
import {serializeProgram, deserializeProgram} from "../../../../src/persistence.js";
import {renderToSVG} from "../../../../src/renderers/svg.js";
import {render} from "../../../../src/renderers/canvas/index.js";
import {createMockCanvasContext, findCanvasCalls} from "../../../support/canvas.js";
import {resolveConcreteGraphicBounds} from "../../../../src/grammar/schemas/graphicBounds.js";

const values=[{x:1,y:2,group:"Alpha",amount:1},{x:2,y:3,group:"Longer category",amount:4}];
function source(kind, factory=chart){
  const p=factory().createCanvas({width:1400,height:1200,margin:350}).createData({values});
  if(kind==="strokeWidth")return p.createLinePlot({x:"x",y:"y",groupBy:"group",guides:false}).encodeStrokeWidth({field:"amount"});
  let q=p.createScatterPlot({x:"x",y:"y",guides:false});
  if(kind==="series")return q.encodeShape({field:"group"});
  if(kind==="size")return q.encodeSize({field:"amount"});
  if(kind==="opacity")return q.encodeOpacity({field:"amount"});
  if(kind.startsWith("stroke"))return q.encodeStroke({field:kind==="stroke"?"group":"amount",fieldType:kind==="stroke"?"nominal":"quantitative",...(kind==="strokeInterval"?{scale:{type:"quantize",range:["red","blue"]}}:{})});
  q=q.encodeColor({field:kind==="color"||kind==="combined"?"group":"amount",fieldType:kind==="color"||kind==="combined"?"nominal":"quantitative",...(kind==="interval"?{scale:{type:"quantize",range:["red","blue"]}}:{})});
  return kind==="combined"?q.encodeSize({field:"amount"}):q;
}
const kinds=["color","series","stroke","gradient","strokeGradient","interval","strokeInterval","size","opacity","strokeWidth"];
const title=(p,text="Heading")=>Object.entries(p.graphicSpec.objects).find(([,g])=>g.properties?.text===text);
const union=bs=>({left:Math.min(...bs.map(b=>b.left)),right:Math.max(...bs.map(b=>b.right))});
const bounds=(p,id)=>resolveConcreteGraphicBounds(p.graphicSpec,id);
const frame=(p,id)=>union(Object.keys(p.graphicSpec.objects).filter(k=>/(Legend|Gradient|Interval)/.test(k)&&!k.endsWith("Background")).map(k=>bounds(p,k)));

test("every top-title family aligns within its original content span on all edges",()=>{
  for(const kind of kinds)for(const position of["top","right","bottom","left"]){
    const base=source(kind).createLegend({position,title:"Heading"}),[id]=title(base),span=frame(base,id);
    // The first horizontal width sample is a 1px butt-capped line.
    // Its existing allocated slot conservatively reserves half that stroke.
    if(kind==="strokeWidth"&&["top","bottom"].includes(position))span.left-=0.5;
    for(const align of["left","center","right"]){
      const p=base.editLegendTitle({align}),g=p.graphicSpec.objects[id].properties,b=bounds(p,id);
      const bodyId=Object.keys(base.graphicSpec.objects).find(k=>/(Legend|Gradient|Interval)/.test(k)&&!/(Title|Background)$/.test(k));
      const dx=bounds(p,bodyId).left-bounds(base,bodyId).left, expected={left:span.left+dx,right:span.right+dx};
      assert.equal(g.textAlign,align,kind+position);
      assert.ok(Math.abs(g.x-(align==="left"?expected.left:align==="right"?expected.right:(expected.left+expected.right)/2))<1e-9,JSON.stringify({kind,position,align,x:g.x,span}));
      assert.ok(b.left>=expected.left-1e-9&&b.right<=expected.right+1e-9);
      assert.deepEqual(p.editLegendTitle({align:"auto"}).graphicSpec,base.graphicSpec,kind+position);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
    }
  }
});

test("long multiline titles and blank rows retain their measured reading block",()=>{
  for(const kind of["color","gradient","size","opacity"]){
    const base=source(kind).createLegend({position:"top",title:"A very long title wider than this small item group\n\nSecond"});
    const[id]=title(base,"A very long title wider than this small item group\n\nSecond"),p=base.editLegendTitle({align:"right"});
    const g=p.graphicSpec.objects[id].properties;
    assert.deepEqual(g.lines.map(x=>x.text),["A very long title wider than this small item group","","Second"]);
    assert.equal(g.textAlign,"right");
    assert.equal(bounds(p,id).right,frame(base,id).right);
    assert.deepEqual(p.editLegendTitle({align:"auto"}).graphicSpec,base.graphicSpec);
  }
});

test("whole and focused edits, nested creation and Basic agree without changing omitted defaults",()=>{
  for(const kind of kinds){const b=source(kind),p=b.createLegend({position:"top",title:"Heading",titleStyle:{align:"left"}});
    assert.deepEqual(b.createLegend({position:"top",title:"Heading"}).editLegend({titleStyle:{align:"left"}}).graphicSpec,p.graphicSpec);
    assert.deepEqual(p.editLegend({titleStyle:{align:"auto"}}).graphicSpec,b.createLegend({position:"top",title:"Heading"}).graphicSpec);
  }
  const b=source("color",basicChart),p=b.createGuides({axes:false,grid:false,legend:{position:"top",title:"Heading",titleStyle:{align:"right"}}});
  assert.equal(title(p)[1].properties.textAlign,"right");
});

test("free and corner groups retain their anchors, body geometry and border padding",()=>{
  for(const placement of[{at:{x:12,y:15}},{position:"bottom-left"},{position:"top-right"}]){
    const b=source("combined"),p=b.createLegend({...placement,title:"Heading",border:{padding:7,lineWidth:2},titleStyle:{align:"left"}});
    assert.equal(title(p)[1].properties.textAlign,"left");
    assert.deepEqual(p.editCanvas({width:1500}).graphicSpec,deserializeProgram(serializeProgram(p)).editCanvas({width:1500}).graphicSpec);
    assert.deepEqual(p.editLegendTitle({align:"auto"}).graphicSpec,b.createLegend({...placement,title:"Heading",border:{padding:7,lineWidth:2}}).graphicSpec);
  }
});

test("inline alignment conflicts and invalid creation/edit values fail atomically",()=>{
  for(const kind of["color","opacity"]){const b=source(kind),p=b.createLegend({position:"top",title:"Heading",titleStyle:{align:"left"}}),snapshot=serializeProgram(p);
    assert.throws(()=>p.editLegendLayout({titlePosition:"left"}),/Inline/);
    const inline=p.editLegend({titlePosition:"left",titleStyle:{align:"auto"}});
    assert.equal(title(inline)[1].properties.textAlign,"left");
    assert.throws(()=>inline.editLegendTitle({align:"left"}),/Inline/);
    assert.equal(serializeProgram(p),snapshot);
  }
  for(const kind of kinds)for(const align of["auto","start",null,false,0,undefined]){
    const b=source(kind);assert.throws(()=>b.createLegend({titleStyle:{align}}),/align/);
    if(align!=="auto"){const p=b.createLegend(),before=serializeProgram(p);assert.throws(()=>p.editLegendTitle({align}),/align/);assert.equal(serializeProgram(p),before);}
  }
});

test("hidden titles preserve alignment and save/load rejects forged enum or inline state",()=>{
  for(const kind of kinds){const p=source(kind).createLegend({title:false,titleStyle:{align:"right"}});const restored=p.editLegendTitle({title:"Heading"});assert.equal(title(restored)[1].properties.textAlign,"right");
    const snapshot=JSON.parse(serializeProgram(restored)),state=decodeValue(snapshot.payload);
    const visit=o=>{if(o&&typeof o==="object"){if(o.titleStyle?.align==="right")o.titleStyle.align="auto";for(const v of Object.values(o))visit(v);}};visit(state);snapshot.payload=encodeValue(state);
    assert.throws(()=>deserializeProgram(JSON.stringify(snapshot)),/align/);
  }
});

test("aligned title anchors reach SVG and Canvas with the same concrete alignment",()=>{
  const p=source("color").createLegend({position:"top",title:"Heading",titleStyle:{align:"left"}}),[id,g]=title(p);
  assert.match(renderToSVG(p),/text-anchor="start"[^>]*>Heading<\/text>/);
  const context=createMockCanvasContext();render(p,context);const calls=findCanvasCalls(context,"fillText").filter(c=>c.args[0]==="Heading");assert.equal(calls.length,1);
  assert.ok(Number.isFinite(g.properties.x));assert.equal(bounds(p,id).left,g.properties.x);
});

test("data, scale, content and font replay keep explicit title ownership",()=>{
  for(const kind of["color","gradient","size","opacity"]){
    const p=source(kind).createLegend({position:"top",title:"Heading",titleStyle:{align:"right"}}),before=serializeProgram(p);
    const changed=p.editLegendTitle({title:"Changed heading",fontSize:17}).editCanvas({width:1500});
    assert.equal(title(changed,"Changed heading")[1].properties.textAlign,"right");
    const saved=deserializeProgram(serializeProgram(p));
    assert.deepEqual(saved.editLegendTitle({title:"Changed heading",fontSize:17}).editCanvas({width:1500}).graphicSpec,changed.graphicSpec);
    const dataset=p.semanticSpec.datasets[0].id;
    const revised=p.reviseData({source:dataset,id:"revised",values:[{x:1,y:2,group:"Alpha",amount:1},{x:2,y:4,group:"Longer category",amount:5}]});
    assert.equal(title(revised)[1].properties.textAlign,"right");
    const scale=p.editXScale({domain:[0,4]});assert.equal(title(scale)[1].properties.textAlign,"right");
    assert.equal(serializeProgram(p),before);
  }
});

test("shared facet promotion retains explicit title style without adding sharing support",()=>{
  const p=source("color").createLegend({position:"top",title:"Heading",titleStyle:{align:"left"}});
  const faceted=p.facet({field:"group",guides:{legend:"shared"}});
  assert.ok(Object.values(faceted.guideConfigs.legend).every(c=>c.titleStyle.align==="left"));
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).editFacetGuides({legend:"shared"}).graphicSpec,faceted.editFacetGuides({legend:"shared"}).graphicSpec);
});

test("local edge overrides use one resolved title anchor and alignment across replay",()=>{
  for(const kind of ["color","series","stroke"]){
    const channel=kind==="series"?"shape":kind;
    const base=source(kind).createLegend({position:"right",title:"Heading"});
    for(const position of ["top","bottom","left","right"]){
      const p=base.editLegend({channel,position}),[id,g]=title(p);
      assert.equal(g.properties.textAlign,["top","bottom"].includes(position)?"center":"left",kind+position);
      if(["top","bottom"].includes(position)){
        const body=union(Object.keys(p.graphicSpec.objects)
          .filter(k=>/(Legend|Gradient|Interval)/.test(k)&&!/(Title|Background)$/.test(k)).map(k=>bounds(p,k)));
        assert.ok(Math.abs(g.properties.x-(body.left+body.right)/2)<1e-9,kind+position);
        assert.match(renderToSVG(p),/text-anchor="middle"[^>]*>Heading<\/text>/);
      }
      assert.deepEqual(p.rematerializeLegend().graphicSpec,p.graphicSpec);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
      assert.deepEqual(p.editCanvas({width:1450}).editCanvas({width:1400}).graphicSpec,p.graphicSpec);
      assert.deepEqual(p.editLegend({channel,position:"inherit"}).graphicSpec,base.graphicSpec);
    }
  }
});

test("local horizontal inline and explicit title alignment remain intentional",()=>{
  const base=source("color").createLegend({position:"right",title:"Heading"})
    .editLegend({channel:"color",position:"bottom"});
  assert.equal(title(base.editLegend({channel:"color",titlePosition:"left"}))[1].properties.textAlign,"left");
  for(const align of ["left","center","right"])
    assert.equal(title(base.editLegendTitle({channel:"color",align}))[1].properties.textAlign,align);
});
