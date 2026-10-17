import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
const source=()=>chart().createCanvas({width:500,height:400,margin:100})
 .createData({values:[{x:1,y:2},{x:2,y:3},{x:3,y:4},{x:4,y:5}]});
const options=axes=>({x:"x",y:"y",bin:{bins:2},guides:{axes,legend:false}});
test("binned heatmap can omit each axis title while retaining its line, ticks and labels",()=>{
 for(const channels of [["x"],["y"],["x","y"]]){
  const base=source(),before=JSON.stringify(base);
  const axes=Object.fromEntries(channels.map(channel=>[channel,{title:false}]));
  const p=base.createHeatmap(options(axes));
  for(const channel of ["x","y"]){
   assert.ok(p.graphicSpec.objects[channel+"AxisLine"]);
   assert.ok(p.graphicSpec.objects[channel+"AxisTicks"]);
   assert.ok(p.graphicSpec.objects[channel+"AxisLabels"]);
   assert.equal(p.graphicSpec.objects[channel+"AxisTitle"]===undefined,channels.includes(channel));
  }
  assert.equal(JSON.stringify(base),before);
 }
});
test("binned heatmap retains default and explicit titles and whole-axis omission",()=>{
 const inferred=source().createHeatmap(options({}));
 assert.equal(inferred.graphicSpec.objects.xAxisTitle.properties.text,"x");
 assert.equal(inferred.graphicSpec.objects.yAxisTitle.properties.text,"y");
 const explicit=source().createHeatmap(options({x:{title:{text:"Horizontal interval"}},y:false}));
 assert.equal(explicit.graphicSpec.objects.xAxisTitle.properties.text,"Horizontal interval");
 assert.equal(explicit.graphicSpec.objects.yAxisLine,undefined);
});
test("binned heatmap forwards named axis arrays and per-owner title decisions",()=>{
 const axes={x:[{id:"horizontal",title:false}],y:[{id:"vertical",title:{text:"Vertical interval"}}]};
 const before=JSON.stringify(axes),p=source().createHeatmap(options(axes));
 assert.equal(p.graphicSpec.objects.axis_horizontal__Title,undefined);
 assert.ok(p.graphicSpec.objects.axis_horizontal__Line);
 assert.equal(p.graphicSpec.objects.axis_vertical__Title.properties.text,"Vertical interval");
 assert.equal(JSON.stringify(axes),before);
});
test("invalid binned title declarations and named entries fail atomically",()=>{
 const base=source(),before=JSON.stringify(base);
 for(const title of [null,true,"hidden",17,[]])assert.throws(()=>base.createHeatmap(options({x:{title}})),/title/);
 assert.throws(()=>base.createHeatmap(options({x:[]})));
 assert.throws(()=>base.createHeatmap(options({x:[false]})));
 assert.equal(JSON.stringify(base),before);
});
