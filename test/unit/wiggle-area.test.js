import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { ChartProgram } from "../../src/ChartProgram.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { deriveAreaSeries, deriveDensityAreaSeries, layoutDensityAreaSeries } from "../../src/grammar/areaSeries.js";
import { layoutSeriesPartition, resolveSeriesLayoutDomainValues } from "../../src/grammar/seriesLayout.js";
import { createInteractionSession } from "../../src/interaction.js";
const columns = [[1,3],[2,2],[1,1],[4,0]];
const rows = ["A","B"].flatMap((series,i)=>columns.map((column,x)=>({id:`${series}-${x}`,series,x,value:column[i]})));
const base = (values=rows,entry=chart)=>entry().createCanvas({width:600,height:360,margin:60}).createData({id:"data",keyField:"id",values});
const build = (values=rows,options={})=>base(values).createAreaPlot({id:"m",x:"x",y:{field:"value",scale:{nice:false}},groupBy:"series",guides:false,layout:"wiggle",...options});
const layer=p=>p.semanticSpec.layers.find(layer=>layer.id==="m");
const derive=p=>deriveAreaSeries(p.semanticSpec.datasets.find(data=>data.id===layer(p).data).values,layer(p));
const graphics=p=>p.graphicSpec.objects.m.items;
const items=p=>getMarkItems(p,{target:"m"});

test("wiggle Area rejects an overlapping independent Y frame before children",()=>{
  const source=base().createScatterPlot({id:"points",x:"x",y:"value",guides:false});
  const options={id:"other",x:"x",y:{field:"value",scale:{id:"other-y"}},groupBy:"series",layout:"wiggle",guides:false};
  const calls=[];
  class Capturing extends ChartProgram {
    editSemantic(args){calls.push("editSemantic");return super.editSemantic(args);}
    createGraphics(args){calls.push("createGraphics");return super.createGraphics(args);}
    editGraphics(args){calls.push("editGraphics");return super.editGraphics(args);}
  }
  const before=serializeProgram(source);
  assert.throws(()=>new Capturing({...source}).createAreaPlot(options),/requires one Y scale|overlaps an independent/);
  assert.deepEqual(calls,[]);
  assert.equal(serializeProgram(source),before);
});

test("wiggle raw Area has literal moving bounds, preserved thickness and one semantic owner",()=>{
  const p=build();
  assert.deepEqual(derive(p).series.map(series=>series.values.map(v=>[v.y,v.y2])),[
    [[0,1],[-.5,1.5],[.5,1.5],[-1,3]], [[1,4],[1.5,3.5],[1.5,2.5],[3,3]]]);
  assert.deepEqual(p.resolvedScales.y.domain,[-1,4]);
  assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
  assert.deepEqual(layer(p).layout,{mode:"wiggle"});
  assert.equal(layer(p).encoding.y.stack,undefined);
  const q=build(rows,{layout:"overlay"}).encodeColor({field:"series",layout:"wiggle"});
  assert.deepEqual(derive(q),derive(p)); assert.equal(layer(q).encoding.color.layout,undefined);
  assert.deepEqual(derive(q.removeEncoding({channel:"color"})),derive(p));
  assert.throws(()=>layoutSeriesPartition([1,3],"wiggle"),/aligned series columns/);
  assert.deepEqual(resolveSeriesLayoutDomainValues(columns,"wiggle"),[0,1,1,4,-.5,1.5,1.5,3.5,.5,1.5,1.5,2.5,-1,3,3,3]);
});

test("wiggle source revision, layout switching, scale and Canvas use the same final geometry",()=>{
  const p=build(), snapshot=serializeProgram(p), keys=items(p).map(item=>item.key);
  const q=p.reviseData({source:"data",id:"next",values:rows.map(row=>({...row,value:row.value*2}))});
  assert.deepEqual(q.resolvedScales.y.domain,[-2,8]); assert.deepEqual(items(q).map(item=>item.key),keys);
  assert.deepEqual(derive(q).series[0].values.map(v=>v.y),[0,-1,1,-2]);
  assert.deepEqual(p.layoutSeries({mode:"center"}).resolvedScales.y.domain,[-2,2]);
  assert.deepEqual(p.layoutSeries({mode:"stack"}).layoutSeries({mode:"wiggle"}).graphicSpec,p.graphicSpec);
  assert.notDeepEqual(graphics(p.editCanvas({width:800}))[0].properties.commands,graphics(p)[0].properties.commands);
  assert.notDeepEqual(graphics(p.editScale({id:"y",domain:[-2,8]})),graphics(p));
  assert.equal(serializeProgram(p),snapshot);
  assert.deepEqual(deserializeProgram(snapshot).graphicSpec,p.graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(p)).graphicSpec,p.graphicSpec);
});

test("wiggle gaps restart together while zero columns retain their moving baseline",()=>{
  const values=["A","B"].flatMap((series,i)=>[1,2,3,4,5,6,7].map((_,x)=>({id:`${series}-${x}`,series,x,value:x===2?0:x===3&&i===1?null:columns[x%4][i]})));
  const p=build(values,{missing:"break"}), series=derive(p).series;
  assert.deepEqual(series.map(s=>s.values.map(v=>v.x)),[[0,1,2],[4,5,6],[0,1,2],[4,5,6]]);
  assert.equal(series[0].values[2].x,2);
  assert.ok(Math.abs(series[0].values[2].y+.5)<=Number.EPSILON);
  assert.equal(series[0].values[2].y2,series[0].values[2].y);
  assert.equal(series[1].values[0].y,0);
  assert.deepEqual(items(p).map(item=>item.rows.length),[6,6]);
  const zero=build(rows.map(row=>({...row,value:0})));
  assert.ok(derive(zero).series.every(s=>s.values.every(v=>v.y===0&&v.y2===0)));
  assert.ok(zero.resolvedScales.y.domain.every(Number.isFinite));
});

test("wiggle rejects unsupported topology and domains before state-changing layout children",()=>{
  const calls=[];
  class Capturing extends ChartProgram {
    editSemantic(args){calls.push(args);return super.editSemantic(args);}
    createGraphics(args){calls.push(args);return super.createGraphics(args);}
    editGraphics(args){calls.push(args);return super.editGraphics(args);}
  }
  const bad=[
    build(rows,{layout:"overlay",x:{field:"x",fieldType:"nominal"}}),
    build(rows,{layout:"overlay",x:"value",y:"x",valueChannel:"x"}),
    build(rows,{layout:"overlay"}).encodePathOrder({field:"x"}),
    build(rows.map(row=>({...row,value:-row.value})),{layout:"overlay"}),
    build(rows,{layout:"overlay",y:{field:"value",scale:{domain:[0,4]}}}),
    base().createBarPlot({id:"m",x:{field:"x",fieldType:"nominal"},y:{field:"value",aggregate:"sum"},guides:false})
  ];
  for(const p of bad){const old=serializeProgram(p);assert.throws(()=>new Capturing({...p}).layoutSeries({mode:"wiggle"}));assert.deepEqual(calls,[]);assert.equal(serializeProgram(p),old);}
  const bar=base(rows,basic).createBarPlot({x:{field:"x",fieldType:"nominal"},y:{field:"value",aggregate:"sum"},guides:false});
  assert.throws(()=>bar.layoutSeries({mode:"wiggle"}),/vertical area/);
  assert.throws(()=>bar.encodeColor({field:"series",layout:"wiggle"}),/vertical area/);
  assert.throws(()=>build(rows,{y:{field:"value",scale:{type:"log"}}}),/log|zero|positive/i);
  assert.throws(()=>build(rows.slice(1)),/aligned/);
  assert.throws(()=>build([...rows, {...rows[0],id:"duplicate"}]),/unique/);
  const p=build(); assert.throws(()=>p.editScale({id:"y",domain:[0,4]}),/every resolved bound/);
});

test("wiggle temporal positions, source selection, hit and nested facets preserve source grain",()=>{
  const p=build(), selected=p.selectMarks({id:"b",target:"m",field:"series",op:"eq",value:"B"}).highlightMarks({selection:"b",fill:"#ff0000"});
  assert.equal(graphics(selected).find(item=>item.identity.key===items(p)[1].key).properties.fill,"#ff0000");
  assert.deepEqual(items(selected).map(item=>item.key).sort(),items(p).map(item=>item.key).sort());
  const session=createInteractionSession({program:p});session.dispatch({type:"inspect",point:{x:60,y:150}});
  assert.equal(session.getState().hit.target.itemKey,items(p)[1].key);session.destroy();
  const temporal=build(rows,{x:{field:"x",fieldType:"temporal",temporalUnit:"timestamp"}});
  assert.deepEqual(derive(temporal),derive(p));
  const faceted=p.facet({field:"series"});assert.deepEqual(Object.values(faceted.children).map(child=>items(child).length),[1,1]);
  const joined=hconcat({programs:[{id:"left",program:p},{id:"right",program:p}]});
  const changed=joined.layoutSeries({target:{id:"m",childPath:["left"]},mode:"center"});
  assert.deepEqual(changed.children.right.graphicSpec,joined.children.right.graphicSpec);
  assert.notDeepEqual(changed.children.left.graphicSpec,joined.children.left.graphicSpec);
});

test("wiggle density layout shares its aligned numerical bounds with domain resolution",()=>{
  const p=base().createDensityPlot({id:"m",field:"value",groupBy:"series",bandwidth:1,extent:[-1,5],steps:12,guides:false}).layoutSeries({mode:"wiggle"});
  const l=layer(p), data=p.semanticSpec.datasets.find(d=>d.id===l.data), transform=data.transform.find(t=>t.type==="density");
  const derived=deriveDensityAreaSeries(data.values,l,transform), resolved=layoutDensityAreaSeries(derived,"wiggle");
  const bounds=resolved.series.flatMap(series=>series.values.flatMap(v=>[v.lower,v.upper]));
  const domain=p.resolvedScales[l.encoding.y.scale].domain;
  assert.ok(domain[0]<=Math.min(...bounds)&&domain[1]>=Math.max(...bounds));
  assert.throws(()=>layoutDensityAreaSeries({mode:"y-density",series:Array.from({length:10001},()=>({values:[{x:0,y:1}]}))},"wiggle"),/must not exceed/);
  assert.equal(graphics(p).length,2);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  assert.throws(()=>layoutDensityAreaSeries({...derived,series:[derived.series[0],{...derived.series[1],values:derived.series[1].values.map((v,i)=>({...v,x:v.x+(i===1?1:0)}))} ]},"wiggle"),/shared sample grid/);
});

test("wiggle supports zero-crossing transformed scales and rejects conflicting shared layouts",()=>{
  const p=build();
  const transformed=p.editScale({id:"y",type:"symlog",constant:1});
  assert.equal(transformed.resolvedScales.y.type,"symlog");
  assert.deepEqual(derive(transformed),derive(p));
  assert.deepEqual(deserializeProgram(serializeProgram(transformed)).graphicSpec,transformed.graphicSpec);
  assert.throws(()=>p.createAreaPlot({id:"other",data:"data",x:{field:"x",scale:{id:"x"}},y:{field:"value",scale:{id:"y"}},groupBy:"series",layout:"center",guides:false}),/another policy|one layout policy/);
});
