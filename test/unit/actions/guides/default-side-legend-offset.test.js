import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basic } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveGuideCollisionBlocks } from "../../../../src/materialization/guides/resources.js";

const data = [{x:0,y:0,g:"A",v:0},{x:1,y:2,g:"B",v:25},{x:2,y:1,g:"C",v:100}];
function source(factory=chart) {
  return factory().createCanvas({width:1000,height:800,margin:{left:250,right:250,top:200,bottom:200}})
    .createData({values:data}).createScatterPlot({id:"points",x:"x",y:"y",color:"g",guides:false});
}
const legend = position => ({position,labels:{fontSize:10},titleStyle:{fontSize:11}});
const blocks = p => resolveGuideCollisionBlocks(p.graphicSpec,p.guideConfigs,p.titleConfig,p.materializationConfigs.textMetrics);
function occupiedGap(p,position) {
  const b=blocks(p), axes=b.filter(b=>b.kind==="axis"&&b.position===position);
  const l=b.find(b=>b.kind==="legend"&&b.position===position).bounds;
  return position==="right" ? l.left-Math.max(750,...axes.map(a=>a.bounds.right))
    : Math.min(250,...axes.map(a=>a.bounds.left))-l.right;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function axis(p,position) {
  return p.createYAxis({id:"sideAxis",scale:"y",position,line:{},
    ticksAndLabels:{values:[0,1,2],ticks:{length:5},labels:{fontSize:10,offset:7}},
    title:{text:"Y axis",fontSize:11,offset:35}});
}

for(const position of ["left","right"]) {
  test(`${position} omitted categorical offset clears actual axis paint in Full and Basic`,()=>{
    for(const factory of [chart,basic]) {
      const p=axis(source(factory),position).createLegend(legend(position));
      near(occupiedGap(p,position),8);
      assert.equal(p.guideConfigs.legend.color.offset,8);
      assert.equal(p.guideConfigs.legend.color.inferredOffset,true);
    }
  });
  test(`${position} axis-first and legend-first converge and follow edits/removal`,()=>{
    const p=axis(source(),position).createLegend(legend(position));
    assert.deepEqual(axis(source().createLegend(legend(position)),position).graphicSpec,p.graphicSpec);
    const edited=p.editYAxisTitle({target:"sideAxis",fontSize:18,offset:70})
      .editYAxisLabels({target:"sideAxis",fontSize:22,offset:20});
    near(occupiedGap(edited,position),8);
    near(occupiedGap(deserializeProgram(serializeProgram(edited)).editCanvas({height:900}),position),8);
    const removed=edited.removeYAxis({target:"sideAxis"});
    assert.deepEqual(removed.graphicSpec,source().createLegend(legend(position)).graphicSpec);
  });
  test(`${position} explicit zero/eight anchors retain collision rejection and immutability`,()=>{
    const base=axis(source(),position),before=serializeProgram(base);
    for(const offset of [0,8]) assert.throws(()=>base.createLegend({...legend(position),offset}),/overlap/);
    assert.equal(serializeProgram(base),before);
    const fixed=base.createLegend({...legend(position),offset:120});
    assert.equal(fixed.guideConfigs.legend.color.inferredOffset,false);
    assert.deepEqual(base.createLegend(legend(position)).editLegend({offset:120}).graphicSpec,fixed.graphicSpec);
  });
  test(`${position} occupied border/stroke clears the axis with unchanged stored intent`,()=>{
    const p=axis(source(),position).createLegend({...legend(position),border:{padding:12,lineWidth:4}});
    near(occupiedGap(p,position),8);
    assert.equal(p.guideConfigs.legend.color.offset,8);
    near(occupiedGap(p.editLegend({border:{padding:20,lineWidth:6}}),position),8);
  });
  test(`${position} gradient and size families retain their own default gaps`,()=>{
    const base=source().encodeColor({field:"v",fieldType:"quantitative"});
    const gradient=axis(base,position).createLegend({...legend(position),gradient:{length:120}});
    near(occupiedGap(gradient,position),30);
    assert.equal(gradient.guideConfigs.legend.gradient.offset,30);
    const sized=axis(source().encodeSize({field:"v",scale:{range:[4,20]}}),position)
      .createLegend({...legend(position),channels:["size"]});
    near(occupiedGap(sized,position),30);
    assert.equal(sized.guideConfigs.legend.size.offset,30);
  });
  test(`${position} combined side lane and target group clear the axis`,()=>{
    const base=source().encodeSize({field:"v",scale:{range:[4,20]}});
    const p=axis(base,position).createLegend({...legend(position),channels:["color","size"]});
    near(occupiedGap(p,position),8);
    const grouped=axis(source(),position).createLegend({...legend(position),blockLayout:"column"});
    near(occupiedGap(grouped,position),8);
    assert.equal(grouped.guideConfigs.legendGroups.points.inferredOffset,true);
    near(occupiedGap(grouped.editYAxisTitle({target:"sideAxis",offset:80}),position),8);
    assert.throws(()=>axis(source(),position).createLegend({...legend(position),blockLayout:"column",offset:8}),/overlap/);
  });
  test(`${position} explicit-offset target gives identical concrete output`,()=>{
    const base=axis(source(),position),auto=base.createLegend(legend(position)),offset=position==="right"
      ? Math.max(750,...blocks(base).filter(b=>b.kind==="axis"&&b.position===position).map(b=>b.bounds.right))-750+8
      : 250-Math.min(250,...blocks(base).filter(b=>b.kind==="axis"&&b.position===position).map(b=>b.bounds.left))+8;
    const target=base.createLegend({...legend(position),offset});
    assert.deepEqual(auto.graphicSpec,target.graphicSpec);
    assert.deepEqual(auto.semanticSpec,target.semanticSpec);
  });
  test(`${position} no same-edge axis keeps the explicit native numeric output`,()=>{
    const base=source(),a=base.createLegend(legend(position)),b=base.createLegend({...legend(position),offset:8});
    assert.deepEqual(a.graphicSpec,b.graphicSpec);
    const opposite=axis(source(),position==="left"?"right":"left");
    assert.deepEqual(opposite.createLegend(legend(position)).graphicSpec,
      opposite.createLegend({...legend(position),offset:8}).graphicSpec);
  });
}

for(const position of ["left","right"]) {
  test(`${position} opacity samples use native thirty-pixel clearance`,()=>{
    const p=axis(source().encodeOpacity({field:"v",scale:{range:[0.2,1]}}),position)
      .createLegend({...legend(position),channels:["opacity"]});
    near(occupiedGap(p,position),30);
    assert.equal(p.guideConfigs.legend.opacity.offset,30);
  });
  test(`${position} group authoring order, label edits and hidden components converge`,()=>{
    const p=axis(source(),position).createLegend({...legend(position),blockLayout:"column"});
    const q=axis(source().createLegend({...legend(position),blockLayout:"column"}),position);
    assert.deepEqual(p.graphicSpec,q.graphicSpec);
    const labels=p.editYAxisLabels({target:"sideAxis",labelMap:[{value:2,label:"Wider upper tick label"}]});
    near(occupiedGap(labels,position),8);
    const hidden=labels.editYAxis({target:"sideAxis",labels:false,title:false});
    near(occupiedGap(hidden,position),8);
    assert.deepEqual(hidden.removeYAxis({target:"sideAxis"}).graphicSpec,
      source().createLegend({...legend(position),blockLayout:"column"}).graphicSpec);
  });
  test(`${position} data and scale replay keep the current side clearance`,()=>{
    const p=axis(source(),position).createLegend(legend(position));
    near(occupiedGap(p.editYScale({domain:[0,4]}),position),8);
    const changed=p.reviseData({source:"data",id:"revised",values:data.map(row=>({...row,y:row.y*4}))});
    near(occupiedGap(changed,position),8);
  });
}

test("free and in-plot anchors remain independent of outside side axes",()=>{
  for(const placement of [{at:{x:20,y:20}},{position:"top-right"}]) {
    const p=source().createLegend({...placement,blockLayout:"column"});
    const prior=blocks(p).find(b=>b.kind==="legend").bounds;
    const after=axis(p,"right");
    assert.deepEqual(blocks(after).find(b=>b.kind==="legend").bounds,prior);
  }
});
