import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
const values=[{x:0,y:1},{x:1,y:3},{x:2,y:2},{x:3,y:4}];
const base=()=>chart().createCanvas({width:400,height:300,margin:50})
  .createData({id:"raw",values}).createScatterPlot({id:"points",x:"x",y:"y",guides:false})
  .createLinePlot({id:"other",x:"x",y:"y",guides:false});
const children=p=>p.graphicSpec.objects["plot-main"].children;
const order=p=>children(p).filter(id=>["points","other","pointsRegressionLines","pointsRegressionBands"].includes(id));

test("plot-last regression preserves source defaults and immutable source/band/fit painter order",()=>{
  const source=base(),saved=serializeProgram(source);
  assert.deepEqual(order(source.createRegression()),["pointsRegressionBands","points","pointsRegressionLines","other"]);
  const p=source.createRegression({placement:"plot-last",line:{strokeWidth:7}});
  assert.deepEqual(order(p),["points","other","pointsRegressionBands","pointsRegressionLines"]);
  assert.equal(p.markConfigs.points.regression.placement,"plot-last");
  assert.deepEqual(order(p.editRegression({placement:"source"})),order(source.createRegression()));
  assert.equal(serializeProgram(source),saved);
  for(const placement of ["last",false,0,null]) assert.throws(()=>source.createRegression({placement}),/placement/);
  const svg=renderToSVG(p);
  assert.ok(svg.includes('stroke-width="7"'));
  assert.ok(svg.indexOf('stroke-width="2"')<svg.indexOf('stroke-width="7"'));
});

test("regression placement survives geometry, model, interval and restored edits",()=>{
  const p=base().createRegression({placement:"plot-last"});
  for(const edited of [p.editCanvas({width:500}),p.editXScale({domain:[-1,5]}),
    p.editRegression({line:{strokeWidth:5}}),p.editRegression({method:"polynomial",degree:2}),
    p.editRegression({interval:false}),deserializeProgram(serializeProgram(p)).editRegression({level:0.9})]){
    const ids=order(edited);assert.ok(ids.indexOf("pointsRegressionLines")>ids.indexOf("other"));
    assert.equal(edited.markConfigs.points.regression.placement,"plot-last");
  }
  const again=p.editRegression({interval:false}).editRegression({interval:"mean",band:{}});
  assert.deepEqual(order(again),order(p));
});

test("plot-last fits stay below owned axis and frame overlays and above grid underlays",()=>{
  for(const underlay of [false,true]){
    const source=base().createGuides().editCanvas({plotBorder:{underlay}});
    const p=source.createRegression({placement:"plot-last"}),ids=children(p);
    assert.ok(ids.indexOf("horizontalGridLines")<ids.indexOf("pointsRegressionBands"));
    assert.ok(ids.indexOf("pointsRegressionLines")<ids.indexOf("xAxisLine"));
    if(underlay)assert.ok(ids.indexOf("plotBorder")<ids.indexOf("points"));
    else assert.ok(ids.indexOf("pointsRegressionLines")<ids.indexOf("plotBorder"));
  }
});

test("following regression and facade retain explicit plot-last ownership",()=>{
  const p=base().createRegression({placement:"plot-last",sourceBinding:"follow"});
  const revised=p.reviseData({source:"raw",id:"revision",values:values.map(r=>({...r,y:r.y+1}))});
  assert.deepEqual(order(revised),order(p));
  assert.equal(revised.markConfigs.points.regression.placement,"plot-last");
  const facade=chart().createCanvas().createData({values}).createRegressionPlot({x:"x",y:"y",placement:"plot-last",guides:false});
  assert.equal(facade.markConfigs.regressionPlot.regression.placement,"plot-last");
  assert.throws(()=>deserializeProgram(serializeProgram(p).replaceAll("plot-last","unknown")),/placement/);
  const before=serializeProgram(p);
  assert.throws(()=>p.editRegression({placement:"unknown"}),/placement/);
  assert.equal(serializeProgram(p),before);
});
