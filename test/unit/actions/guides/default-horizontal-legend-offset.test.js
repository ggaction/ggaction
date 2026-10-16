import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basic } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveGuideCollisionBlocks } from "../../../../src/materialization/guides/resources.js";

const data = [{x:0,y:1,g:"A",v:0},{x:1,y:2,g:"B",v:25},{x:2,y:1,g:"C",v:100}];
function source(factory=chart) {
  return factory().createCanvas({width:900,height:700,margin:200}).createData({values:data})
    .createScatterPlot({id:"points",x:"x",y:"y",color:"g",guides:false});
}
const legend = position => ({position,labels:{fontSize:10},titleStyle:{fontSize:11}});
const blocks = p => resolveGuideCollisionBlocks(p.graphicSpec,p.guideConfigs,p.titleConfig,p.materializationConfigs.textMetrics);
function gap(p,position) {
  const b=blocks(p), axes=b.filter(b=>b.kind==="axis" && b.position===position), l=b.find(b=>b.kind==="legend" && b.position===position).bounds;
  return position==="bottom" ? l.top-Math.max(500,...axes.map(a=>a.bounds.bottom))
    : Math.min(200,...axes.map(a=>a.bounds.top))-l.bottom;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function axis(p,position) {
  return p.createXAxis({position,line:{},ticksAndLabels:{values:[0,1,2],ticks:{length:5},labels:{fontSize:10,offset:7}},title:{text:"X axis",fontSize:11,offset:35}});
}

test("omitted horizontal offsets leave native eight pixels after actual axis paint",()=>{
  for(const position of ["top","bottom"]) for(const factory of [chart,basic]) {
    const p=axis(source(factory),position).createLegend(legend(position));
    near(gap(p,position),8);
    assert.equal(p.guideConfigs.legend.color.offset,8);
    assert.equal(p.guideConfigs.legend.color.inferredOffset,true);
  }
});

test("axis-first and legend-first defaults converge and track edited or removed components",()=>{
  for(const position of ["top","bottom"]) {
    const p=axis(source(),position).createLegend(legend(position));
    const q=axis(source().createLegend(legend(position)),position);
    assert.deepEqual(q.graphicSpec,p.graphicSpec);
    const edited=p.editXAxisTitle({fontSize:18,offset:70}).editXAxisLabels({fontSize:22,rotation:{value:45,unit:"degrees"},offset:20});
    near(gap(edited,position),8);
    const restored=deserializeProgram(serializeProgram(edited));
    near(gap(restored.editCanvas({height:800}),position),8);
    const removed=edited.removeXAxis();
    near(gap(removed,position),8);
    assert.deepEqual(removed.graphicSpec,source().createLegend(legend(position)).graphicSpec);
  }
});

test("explicit zero, native numeric offsets and manual policies keep plot anchors",()=>{
  for(const position of ["top","bottom"]) {
    const p=source().createLegend({...legend(position),offset:0});
    near(gap(p,position),0);
    assert.equal(p.guideConfigs.legend.color.inferredOffset,false);
    const withAxis=axis(source(),position), before=serializeProgram(withAxis);
    for(const offset of [0,8]) assert.throws(()=>withAxis.createLegend({...legend(position),offset}),/overlap/);
    assert.equal(serializeProgram(withAxis),before);
    const fixed=withAxis.createLegend({...legend(position),offset:120});
    assert.equal(fixed.guideConfigs.legend.color.inferredOffset,false);
    const native=withAxis.createLegend(legend(position));
    const switched=native.editLegend({offset:120});
    assert.equal(switched.guideConfigs.legend.color.inferredOffset,false);
    assert.deepEqual(switched.graphicSpec,fixed.graphicSpec);
  }
});

test("combined and grouped default legends clear axes while explicit groups remain fixed",()=>{
  for(const position of ["top","bottom"]) {
    const base=source().encodeSize({field:"v",scale:{range:[10,40]}});
    const p=axis(base,position).createLegend({...legend(position),channels:["color","size"]});
    near(gap(p,position),8);
    const grouped=axis(source(),position).createLegend({...legend(position),blockLayout:"column"});
    near(gap(grouped,position),8);
    assert.equal(grouped.guideConfigs.legendGroups.points.inferredOffset,true);
    near(gap(grouped.editXAxisTitle({offset:80}).editXAxisLabels({fontSize:24,offset:30}),position),8);
    const fixed=source().createLegend({...legend(position),blockLayout:"column",offset:0});
    near(gap(fixed,position),0);
    assert.equal(fixed.guideConfigs.legendGroups.points.inferredOffset,false);
  }
});

test("continuous families retain native thirty-pixel gaps and transitions preserve omission",()=>{
  for(const position of ["top","bottom"]) {
    const base=source().encodeColor({field:"v",fieldType:"quantitative"});
    const p=axis(base,position).createLegend({...legend(position),gradient:{length:120}});
    near(gap(p,position),30);
    const symbols=p.editLegend({representation:"symbols",values:[0,25,100]});
    near(gap(symbols,position),30);
    assert.equal(symbols.guideConfigs.legend.gradient.inferredOffset,true);
    assert.deepEqual(deserializeProgram(serializeProgram(symbols)).graphicSpec,symbols.graphicSpec);
  }
});

test("old snapshots remain fixed and malformed private offset intent is rejected",()=>{
  const p=source().createLegend(legend("bottom")), config={...p.guideConfigs.legend.color};
  delete config.inferredOffset;
  const old=deserializeProgram(serializeProgram(p._withLegendConfig("color",config)));
  assert.throws(()=>axis(old,"bottom"),/overlap/);
  for(const inferredOffset of ["yes",0,null]) assert.throws(()=>serializeProgram(p._withLegendConfig("color",{...config,inferredOffset})),/offset inference/);
  const free=axis(source(),"bottom").createLegend({at:{x:20,y:20},blockLayout:"column",labels:{fontSize:10}});
  const corner=axis(source(),"bottom").createLegend({position:"top-left",labels:{fontSize:10}});
  assert.equal(free.guideConfigs.legendGroups.points.placement.at.x,20);
  assert.equal(corner.guideConfigs.legend.color.position,"top-left");
});

test("compact bottom margins fit a native gap after ten-pixel labels without an axis title",()=>{
  const p=chart().createCanvas({width:520,height:443,margin:{left:26,top:76,right:94,bottom:67}})
    .createData({values:data}).createScatterPlot({x:"x",y:"y",color:"g",guides:false})
    .createGuides({axes:{x:{ticksAndLabels:{labels:{fontSize:10,offset:7}},title:false},y:false},grid:false,
      legend:{position:"bottom",direction:"horizontal",labels:{fontSize:10},titleStyle:{fontSize:11,fontWeight:700}}});
  const b=blocks(p),axis=b.find(b=>b.id==="x-axis labels").bounds,l=b.find(b=>b.kind==="legend").bounds;
  near(l.top-axis.bottom,8);
  assert.ok(l.bottom<=443);
});
