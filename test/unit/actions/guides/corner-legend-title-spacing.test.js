import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveLegendItemLayout } from "../../../../src/layout/legendItems.js";

const corners=["top-left","top-right","bottom-left","bottom-right"];
function source(factory=chart, small=false) {
  return factory().createCanvas({width:small?350:1400,height:small?350:1400,margin:small?100:250})
    .createData({values:Array.from({length:10},(_,i)=>({x:i,y:i,g:`Group${i}`}))})
    .createLinePlot({x:"x",y:"y",guides:false}).encodeColor({field:"g"});
}
function bounds(p,id){return resolveConcreteGraphicBounds(p.graphicSpec,id);}
function firstItemTop(p) {
  const objects=p.graphicSpec.objects;
  const ids=Object.keys(objects).filter(id=>id.startsWith("seriesLegendSymbol")||id==="seriesLegendLabels");
  return Math.min(...ids.flatMap(id=>objects[id].items.map(item=>bounds(p,item.id).top)));
}

test("compact corner title packing uses painted title and item bounds with a twelve pixel gap",()=>{
  for(const factory of [chart,basicChart])for(const position of corners)for(const grouped of [false,true]) {
    const p=source(factory,true).createLegend({position,itemGap:11,
      ...(grouped?{blockLayout:"column"}:{}),title:"Energy",
      titleStyle:{fontSize:11},labels:{fontSize:7},symbol:{lineWidth:1.5,length:10}});
    assert.ok(Math.abs(firstItemTop(p)-bounds(p,"seriesLegendTitle").bottom-12)<1e-8);
    assert.equal(p.guideConfigs.legend.series.itemGap,11);
    const all=[bounds(p,"seriesLegendTitle"),...p.graphicSpec.objects.seriesLegendLabels.items.map(i=>bounds(p,i.id))];
    const top=Math.min(...all.map(b=>b.top)),bottom=Math.max(...all.map(b=>b.bottom));
    assert.ok(top>=108-1e-8&&bottom<=242+1e-8);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  }
});

test("large symbols, multiline titles and fonts reserve actual corner extents",()=>{
  for(const position of corners)for(const fontSize of [7,18,30]) {
    const p=source().createLegend({position,title:"Two\nLines",itemGap:48,
      titleStyle:{fontSize},labels:{fontSize},
      symbol:{layers:[{type:"point",shape:"circle",size:15,stroke:"black",strokeWidth:4}]}});
    assert.ok(firstItemTop(p)-bounds(p,"seriesLegendTitle").bottom>=12-1e-8);
    const without=p.editLegend({title:false});
    assert.equal(without.graphicSpec.objects.seriesLegendTitle,undefined);
    assert.deepEqual(without.editLegend({title:"Two\nLines"}).graphicSpec,p.graphicSpec);
    assertEquivalentMeaning(p.editCanvas({width:1500}).graphicSpec,source().editCanvas({width:1500}).createLegend({position,title:"Two\nLines",itemGap:48,
      titleStyle:{fontSize},labels:{fontSize},symbol:{layers:[{type:"point",shape:"circle",size:15,stroke:"black",strokeWidth:4}]}}).graphicSpec);
  }
});

test("native corner pitch and inset remain unchanged and overflow fails immutably",()=>{
  const base=source(),before=serializeProgram(base);
  for(const position of corners) {
    const p=base.createLegend({position,title:"Energy"});
    assert.equal(p.guideConfigs.legend.series.itemGap,18);
    assert.equal(p.guideConfigs.legend.series.offset,8);
    assert.throws(()=>p.editCanvas({width:200,height:200,margin:50}),/fit|space|outside|exceed/i);
    assert.deepEqual(p.editLegend({titleStyle:{fontSize:18}}).graphicSpec,
      base.createLegend({position,title:"Energy",titleStyle:{fontSize:18}}).graphicSpec);
  }
  assert.equal(serializeProgram(base),before);
});

test("outside side title and first-row centers preserve their fixed legacy geometry",()=>{
  const config={position:"right",align:"center",offset:8,columns:1,itemGap:18,title:"Energy",
    labels:{fontSize:7,fontFamily:"sans-serif",offset:10},titleStyle:{fontSize:11,fontFamily:"sans-serif"}};
  for(const position of ["left","right"]) {
    const result=resolveLegendItemLayout({x:100,y:100,width:150,height:150},{...config,position},["One","Two"],{width:10,height:1.5},{width:500,height:500});
    assert.equal(result.title.y,120);
    assert.deepEqual(result.itemY,[152,170]);
  }
});
