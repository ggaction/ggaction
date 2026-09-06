import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const edges = ["left", "right", "top", "bottom"];
const rows = Array.from({length:6}, (_, i) => ({x:i,y:i,m:Math.floor(i/2)*5,g:String(Math.floor(i/2))}));
function base(kind, create = chart) {
  let p = create().createCanvas({width:2400,height:2000,margin:600}).createData({values:rows});
  p = kind === "interval" ? p.createPointMark({id:"marks"}) : p.createLineMark({id:"marks"});
  p = p.encodeX({field:"x"}).encodeY({field:"y"});
  return kind === "interval" ? p.encodeColor({field:"m",fieldType:"quantitative",scale:{type:"quantize",range:["red","blue","green"]}})
    : p.encodeGroup({field:"g"}).encodeStrokeWidth({field:"m",scale:{range:[2,60]}});
}
const overlaps = (a,b) => a.left < b.right - 1e-8 && a.right > b.left + 1e-8 && a.top < b.bottom - 1e-8 && a.bottom > b.top + 1e-8;
function assertSpacing(p, kind, shared = false) {
  const prefix = kind === "interval" ? "colorLegend" : "strokeWidthLegend";
  const objects = p.graphicSpec.objects, bounds = id => resolveConcreteGraphicBounds(p.graphicSpec,id);
  const symbols = objects[prefix+"Symbols"].items.map(item=>bounds(item.id));
  const labels = objects[prefix+"Labels"].items.map(item=>bounds(item.id));
  const title = objects[prefix+"Title"] ? bounds(prefix+"Title") : undefined;
  const items = symbols.map((s,i)=>({left:Math.min(s.left,labels[i].left),right:Math.max(s.right,labels[i].right),top:Math.min(s.top,labels[i].top),bottom:Math.max(s.bottom,labels[i].bottom)}));
  const gap = p.guideConfigs.legend[kind].labels.offset;
  for(let i=0;i<items.length;i++) {
    assert.ok(labels[i].left - symbols[i].right >= gap - 1e-8, "sample encroaches on label gap");
    if(kind === "interval" && !shared) assert.ok(Math.abs(labels[i].left-symbols[i].right-gap)<1e-8);
    if(title) assert.ok(!overlaps(title,items[i]),"title overlaps item");
    for(let j=0;j<i;j++) assert.ok(!overlaps(items[i],items[j]),"neighbouring items overlap");
  }
  const border = objects[prefix+"Background"]?.properties;
  if(border) for(const b of [...items,...(title?[title]:[])]) {
    assert.ok(b.left >= border.x-1e-8 && b.right <= border.x+border.width+1e-8);
    assert.ok(b.top >= border.y-1e-8 && b.bottom <= border.y+border.height+1e-8);
  }
}

test("item samples reserve stroke extents through edge, title, border and Canvas lifecycles",()=>{
  let cases=0;
  for(const [kind,create] of [["interval",chart],["interval",basicChart],["strokeWidth",chart]]) {
    const source=base(kind,create);
    for(const position of edges) for(const titlePosition of ["top",...(["top","bottom"].includes(position)?["left"]:[])]) {
      for(const largeText of [false,true]) for(const border of [false,true]) {
        const options={position,titlePosition,border,labels:{offset:12,fontSize:largeText?80:12},titleStyle:{fontSize:largeText?80:13},
          ...(["top","bottom"].includes(position)?{columns:2,direction:"vertical"}:{}),
          ...(kind === "interval" ? {symbol:{stroke:"black",strokeWidth:40}} : {count:3})};
        const p=source.createLegend(options);
        assertSpacing(p,kind);
        if(create === chart) {
          assert.deepEqual(p.editCanvas({width:2600}).graphicSpec,source.editCanvas({width:2600}).createLegend(options).graphicSpec);
          const hidden=p.editLegendTitle({title:false});
          assertSpacing(hidden,kind);
          assert.deepEqual(hidden.editLegendTitle({fontSize:1000}).graphicSpec,hidden.graphicSpec);
          assert.deepEqual(hidden.editLegendTitle({title:"auto"}).graphicSpec,p.graphicSpec);
          assert.deepEqual(p.removeLegend().createLegend(options).graphicSpec,p.graphicSpec);
          assert.deepEqual(p.editLegend({channels:[kind === "interval"?"color":"strokeWidth"]}).graphicSpec,p.graphicSpec);
          const scale=kind === "interval"?{id:"color",range:["blue","green"]}:{id:"strokeWidth",range:[10,90]};
          const changed=p.editScale(scale);
          assertSpacing(changed,kind);
          assert.deepEqual(changed.graphicSpec,source.editScale(scale).createLegend(options).graphicSpec);
        }
        cases++;
      }
    }
  }
  assert.equal(cases,72);
});

test("item sample edits and filtering converge with direct authoring",()=>{
  for(const kind of ["interval","strokeWidth"]) for(const position of edges) {
    const source=base(kind), initial=source.createLegend({position});
    const options={position,labels:{fontSize:40,offset:18},titleStyle:{fontSize:50},...(kind === "interval"?{symbol:{stroke:"black",strokeWidth:40}}:{count:5})};
    const p=initial.editLegend(options);
    assertSpacing(p,kind);
    assert.deepEqual(p.graphicSpec,source.createLegend(options).graphicSpec);
    const filter={target:"marks",field:"m",op:"gte",value:5};
    assert.deepEqual(p.filterMarks(filter).graphicSpec,source.filterMarks(filter).createLegend(options).graphicSpec);
    const zero = kind === "interval" ? p.editLegendSymbols({symbol:{strokeWidth:0}}) : p.editScale({id:"strokeWidth",range:[0,0]});
    assertSpacing(zero,kind);
  }
});

test("large item samples preserve spacing in either shared-lane creation order",()=>{
  for(const kind of ["interval","strokeWidth"]) for(const position of edges) {
    const source=base(kind).encodeOpacity({field:"m"});
    const options={channels:[kind === "interval"?"color":"strokeWidth"],position,border:true,
      ...(kind === "interval"?{symbol:{stroke:"black",strokeWidth:40}}:{count:3})};
    const other={channels:["opacity"],position,count:3};
    const p=source.createLegend(options).createLegend(other);
    assertSpacing(p,kind,true);
    const reversed=source.createLegend(other).createLegend(options);
    assertSpacing(reversed,kind,true);
    for(const id of Object.keys(p.graphicSpec.objects).filter(id=>id.includes("Legend"))) {
      assert.deepEqual(p.graphicSpec.objects[id],reversed.graphicSpec.objects[id]);
    }
    assert.deepEqual(p.removeLegend({channels:["opacity"]}).graphicSpec,source.createLegend(options).graphicSpec);
  }
});

test("excessive item strokes reject without changing input state",()=>{
  for(const kind of ["interval","strokeWidth"]) for(const position of edges) {
    const p=base(kind).createLegend({position}), before=JSON.stringify(p);
    assert.throws(()=>kind === "interval"?p.editLegendSymbols({symbol:{strokeWidth:5000}}):p.editScale({id:"strokeWidth",range:[2,5000]}),/margin|Canvas/);
    assert.equal(JSON.stringify(p),before);
  }
});
