import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {chart as basicChart} from "../../../../src/basic.js";
import {POINT_SHAPES} from "../../../../src/grammar/pointShapes.js";
import {resolveConcreteGraphicBounds} from "../../../../src/grammar/schemas/graphicBounds.js";

const edges=["left","right","top","bottom"];
const rows=Array.from({length:6},(_,i)=>({x:i,y:i,g:String(Math.floor(i/2)),m:i}));
function base(kind,create=chart) {
  let p=create().createCanvas({width:3000,height:2400,margin:700}).createData({values:rows});
  p=kind === "line"?p.createLineMark({id:"marks"}):p.createPointMark({id:"marks"});
  p=p.encodeX({field:"x"}).encodeY({field:"y"});
  return kind === "line"?p.encodeGroup({field:"g"}).encodeStrokeDash({field:"g"})
    :kind === "shape"?p.encodeColor({field:"g"}).encodeShape({field:"g",scale:{range:["triangle-up","square","cross"]}})
      :p.encodeColor({field:"g"});
}
const union=bs=>({left:Math.min(...bs.map(b=>b.left)),right:Math.max(...bs.map(b=>b.right)),top:Math.min(...bs.map(b=>b.top)),bottom:Math.max(...bs.map(b=>b.bottom))});
const overlap=(a,b)=>a.left<b.right-1e-7&&a.right>b.left+1e-7&&a.top<b.bottom-1e-7&&a.bottom>b.top+1e-7;
function assertSpacing(p,kind,shared=false) {
  const prefix=kind === "color"?"colorLegend":"seriesLegend",objects=p.graphicSpec.objects;
  const bounds=id=>resolveConcreteGraphicBounds(p.graphicSpec,id);
  const labels=objects[prefix+"Labels"].items.map(i=>bounds(i.id));
  const symbolIds=Object.keys(objects).filter(id=>id.startsWith(prefix+"Symbol"));
  const symbols=labels.map((_,i)=>union(symbolIds.map(id=>bounds(objects[id].items[i].id))));
  const items=symbols.map((s,i)=>union([s,labels[i]])),title=objects[prefix+"Title"]?bounds(prefix+"Title"):undefined;
  const config=p.guideConfigs.legend[kind === "color"?"color":"series"];
  for(let i=0;i<items.length;i++) {
    assert.ok(labels[i].left-symbols[i].right >= config.labels.offset-1e-7,"sample violates label gap");
    if(title)assert.ok(!overlap(title,items[i]),"title overlaps item");
    for(let j=0;j<i;j++)assert.ok(!overlap(items[i],items[j]),"neighbour items overlap");
  }
  const border=objects[prefix+"Background"]?.properties;
  if(border && !shared)for(const b of [...items,...(title?[title]:[])]) {
    assert.ok(b.left>=border.x-1e-7&&b.right<=border.x+border.width+1e-7);
    assert.ok(b.top>=border.y-1e-7&&b.bottom<=border.y+border.height+1e-7);
  }
}
const recipes=[
 {kind:"color",symbol:{stroke:"black",strokeWidth:40}},
 {kind:"line",symbol:{lineWidth:60}},
 {kind:"shape",symbol:{layers:[{type:"point",size:30,stroke:"black",strokeWidth:40}]}},
 {kind:"color",symbol:{layers:[{type:"point",size:30,stroke:"black",strokeWidth:20}]}},
 {kind:"shape",symbol:{layers:[{type:"line",length:90,lineWidth:60},{type:"point",size:30,stroke:"black",strokeWidth:20},{type:"swatch",width:60,height:30,stroke:"black",strokeWidth:40}]}}
];

test("categorical recipes reserve actual shapes, strokes and typography at every edge",()=>{
  let cases=0;
  for(const create of [chart,basicChart])for(const recipe of recipes) {
    const source=base(recipe.kind,create);
    for(const position of edges)for(const titlePosition of ["top",...(["top","bottom"].includes(position)?["left"]:[])]) {
      for(const border of [false,true])for(const large of [false,true]) {
        const options={position,titlePosition,border,symbol:recipe.symbol,labels:{fontSize:large?80:12},titleStyle:{fontSize:large?80:13},
          ...(["top","bottom"].includes(position)?{columns:2,direction:"vertical"}:{})};
        const p=source.createLegend(options);assertSpacing(p,recipe.kind);
        if(create===chart) {
          const hidden=p.editLegendTitle({title:false});assertSpacing(hidden,recipe.kind);
          assert.deepEqual(hidden.editLegendTitle({fontSize:1000}).graphicSpec,hidden.graphicSpec);
          assert.deepEqual(hidden.editLegendTitle({title:"auto"}).graphicSpec,p.graphicSpec);
          assert.deepEqual(p.editCanvas({width:3200}).graphicSpec,source.editCanvas({width:3200}).createLegend(options).graphicSpec);
        }
        cases++;
      }
    }
  }
  assert.equal(cases,240);
});

test("every mapped shape includes its miter bounds and replays scale edits",()=>{
  const source=base("shape");
  for(const shape of POINT_SHAPES)for(const position of edges)for(const strokeWidth of [0,40]) {
    const options={position,border:true,symbol:{layers:[{type:"point",size:30,stroke:"black",strokeWidth}]}};
    const scale={id:"shape",range:[shape,...POINT_SHAPES.filter(value=>value!==shape).slice(0,2)]};
    const p=source.createLegend(options).editScale(scale);assertSpacing(p,"shape");
    assert.deepEqual(p.graphicSpec,source.editScale(scale).createLegend(options).graphicSpec);
  }
});

test("categorical style, content, filter and removal edits converge with creation",()=>{
  for(const recipe of recipes)for(const position of edges) {
    const source=base(recipe.kind),options={position,symbol:recipe.symbol,border:true,labels:{fontSize:40,offset:18},titleStyle:{fontSize:50}};
    const p=source.createLegend({position}).editLegend(options);
    assertSpacing(p,recipe.kind);
    assert.deepEqual(p.graphicSpec,source.createLegend(options).graphicSpec);
    const filter={target:"marks",field:"g",op:"eq",value:"1"};
    assert.deepEqual(p.filterMarks(filter).graphicSpec,source.filterMarks(filter).createLegend(options).graphicSpec);
    assert.deepEqual(p.removeLegend().createLegend(options).graphicSpec,p.graphicSpec);
    if(recipe.kind === "shape") {
      const color=p.editLegend({channels:["color"]});assertSpacing(color,"color");
      assert.deepEqual(color.editLegend({channels:["color","shape"]}).graphicSpec,p.graphicSpec);
    }
  }
});

test("categorical sample spacing survives shared opacity and combined size placement",()=>{
  for(const position of edges) {
    const source=base("shape").encodeOpacity({field:"m"}).encodeSize({field:"m",scale:{range:[4*Math.PI,100*Math.PI]}});
    const options={channels:["color","shape","size"],position,symbol:recipes[2].symbol,border:true};
    const other={channels:["opacity"],position,count:3,border:true};
    const p=source.createLegend(options).createLegend(other);assertSpacing(p,"shape",true);
    const reversed=source.createLegend(other).createLegend(options);assertSpacing(reversed,"shape",true);
    for(const id of Object.keys(p.graphicSpec.objects).filter(id=>id.includes("Legend")))assert.deepEqual(p.graphicSpec.objects[id],reversed.graphicSpec.objects[id]);
    assert.deepEqual(p.removeLegend({channels:["opacity"]}).graphicSpec,source.createLegend(options).graphicSpec);
  }
});

test("fixed legacy rows reject overlap and overflow while hidden titles release their space",()=>{
  for(const kind of ["color","line","shape"]) {
    const source=base(kind),options={position:"bottom",layout:"legacy-bottom",border:true};
    const p=source.createLegend(options),before=JSON.stringify(p);assertSpacing(p,kind);
    for(const patch of [{labels:{fontSize:80}},{titleStyle:{fontSize:80}},{border:{padding:50}},
      {symbol:kind === "line"?{lineWidth:100}:{layers:[{type:"point",size:80}]}}]) {
      assert.throws(()=>p.editLegend(patch),/space|margin/);
      assert.equal(JSON.stringify(p),before);
    }
    assert.throws(()=>p.editCanvas({margin:{bottom:20}}),/margin/);
    const hidden=p.editLegendTitle({title:false}).editLegendTitle({fontSize:1000});assertSpacing(hidden,kind);
    assert.throws(()=>hidden.editLegendTitle({title:"auto"}),/space|margin/);
    assert.deepEqual(hidden.removeLegend().createLegend(options).graphicSpec,p.graphicSpec);
    for(const align of ["left","center","right"]) {
      const q=p.editLegendLayout({align});assertSpacing(q,kind);
      assert.ok(q.graphicSpec.objects[(kind === "color"?"color":"series")+"LegendLabels"].items.every(i=>i.properties.y===2372));
    }
  }
});
