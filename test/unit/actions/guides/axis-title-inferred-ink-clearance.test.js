import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {serializeProgram, deserializeProgram} from "../../../../src/persistence.js";
function base(left=51){return chart().createCanvas({width:400+left,height:300,margin:{left,top:20,right:60,bottom:80}}).createData({values:[{x:0,y:0},{x:100,y:140}]}).createScatterPlot({x:"x",y:"y",guides:false});}
function titled(left=51){return base(left).createAxes({x:{title:false},y:{title:{text:"Vertical total",fontSize:14,fontWeight:700}}});}
test("inferred tight-margin rotated title reserves ink clearance beyond its one-em box",()=>{const p=titled();assert.equal(p.graphicSpec.objects.yAxisTitle.properties.x,10.5);assert.equal(p.guideConfigs.axis.y.title.inferredOffset,true);assert.equal(p.guideConfigs.axis.y.title.offset,40.5);});
test("larger margins retain ordinary preferred offsets and explicit offsets stay exact",()=>{const spacious=titled(100);assert.equal(spacious.guideConfigs.axis.y.title.offset,52);const explicit=base().createAxes({x:{title:false},y:{title:{text:"Vertical total",fontSize:14,fontWeight:700,offset:44}}});assert.equal(explicit.graphicSpec.objects.yAxisTitle.properties.x,7);assert.equal(explicit.guideConfigs.axis.y.title.inferredOffset,false);});
test("font edits, Canvas replay and persistence preserve inferred clearance without mutating earlier state",()=>{const old=titled(),edited=old.editYAxisTitle({fontSize:18}),restored=deserializeProgram(serializeProgram(edited));assert.equal(old.graphicSpec.objects.yAxisTitle.properties.x,10.5);assert.equal(edited.graphicSpec.objects.yAxisTitle.properties.x,13.5);assert.deepEqual(restored.graphicSpec,edited.graphicSpec);const resized=restored.editCanvas({width:454,margin:{left:54,top:20,right:60,bottom:80}});assert.equal(resized.graphicSpec.objects.yAxisTitle.properties.x,13.5);});
test("inferred title edges remain mirrored for left and right axis placement",()=>{const left=titled(),right=base().createAxes({x:{title:false},y:{position:"right",title:{text:"Vertical total",fontSize:14,fontWeight:700}}});assert(left.graphicSpec.objects.yAxisTitle.properties.x>=10.5);const p=right.graphicSpec.objects.yAxisTitle.properties;assert(p.x<=451-10.5);assert.equal(p.rotation,Math.PI/2);});

for (const fontSize of [11, 13, 14, 18]) {
  test(`edge-clamped ${fontSize}px Y titles reserve ink clearance without changing explicit or spacious placement`, () => {
    const options = {text:"Vertical total", fontSize, fontWeight:700};
    const left = base().createAxes({x:{title:false}, y:{title:options}});
    assert.equal(left.graphicSpec.objects.yAxisTitle.properties.x, fontSize * .75);
    const right = base(51).editCanvas({margin:{left:51,top:20,right:51,bottom:80}})
      .createAxes({x:{title:false}, y:{position:"right",title:options}});
    assert.equal(right.graphicSpec.objects.yAxisTitle.properties.x, 451 - fontSize * .75);
    const spacious = base(100).createAxes({x:{title:false},y:{title:options}});
    assert.equal(spacious.guideConfigs.axis.y.title.offset, 52);
    const explicit = base(100).createAxes({x:{title:false},y:{title:{...options,offset:44}}});
    assert.equal(explicit.graphicSpec.objects.yAxisTitle.properties.x, 56);
    const restored = deserializeProgram(serializeProgram(left));
    assert.deepEqual(restored.graphicSpec, left.graphicSpec);
    const resized = restored.editCanvas({width:454,margin:{left:54,top:20,right:60,bottom:80}});
    assert.equal(resized.graphicSpec.objects.yAxisTitle.properties.x, fontSize * .75);
  });
}

function constrained(position = "left") {
  return chart()
    .createCanvas({width:488,height:244,margin:{left:44,top:5,right:44,bottom:39}})
    .createData({values:[{x:0,y:0},{x:19,y:240}]})
    .createScatterPlot({x:"x",y:"y",guides:false})
    .editYScale({domain:[0,240]})
    .createYAxis({
      position,
      ticksAndLabels:{values:[0,50,100,150,200],labels:{fontSize:10}},
      title:{text:"Aggregate value",fontSize:11,fontWeight:700}
    });
}

test("optional edge ink reserve cannot collide with nearby label rows", () => {
  const left = constrained(), right = constrained("right");
  assert.equal(left.graphicSpec.objects.yAxisTitle.properties.x, 5.5);
  assert.equal(right.graphicSpec.objects.yAxisTitle.properties.x, 482.5);
  assert.equal(left.guideConfigs.axis.y.title.inferredOffset, true);
  assert.equal(left.guideConfigs.axis.y.title.offset, 38.5);
  const restored = deserializeProgram(serializeProgram(left));
  assert.deepEqual(restored.graphicSpec, left.graphicSpec);
  const resized = restored.editCanvas({width:489,margin:{left:44,top:5,right:45,bottom:39}});
  assert.equal(resized.graphicSpec.objects.yAxisTitle.properties.x, 5.5);
});

test("later explicit axis clearance remains exact and independent of inferred placement", () => {
  const original = constrained();
  const edited = original.editYAxis({
    title:{offset:32.1064453125},ticksAndLabels:{labels:{offset:6.5}}
  });
  assert.equal(original.graphicSpec.objects.yAxisTitle.properties.x, 5.5);
  assert.equal(edited.graphicSpec.objects.yAxisTitle.properties.x, 11.8935546875);
  assert.equal(edited.guideConfigs.axis.y.title.inferredOffset, false);
  assert.equal(edited.guideConfigs.axis.y.title.offset, 32.1064453125);
});

test("automatic margin fitting keeps room for inferred title ink", () => {
  const before = titled(100), fitted = before.fitCanvas();
  assert.equal(fitted.graphicSpec.objects.yAxisTitle.properties.x, 10.5);
  assert.equal(fitted.guideConfigs.axis.y.title.inferredOffset, true);
  assert.equal(before.materializationConfigs.canvas.margin.left, 100);
  assert.deepEqual(deserializeProgram(serializeProgram(fitted)).graphicSpec, fitted.graphicSpec);
});
