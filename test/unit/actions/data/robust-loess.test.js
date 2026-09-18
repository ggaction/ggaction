import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { deriveRegression } from "../../../../src/grammar/regression/derive.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
const options = { x: "x", y: "y", method: "loess", span: 0.5 };
const rows = Array.from({ length: 20 }, (_, x) => ({ x, y: 0.2*x*x + (x === 2 ? 80 : 0) }));
const derive = (values = rows, extra = {}) => deriveRegression(values, { ...options, ...extra });
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a-b) < tolerance, `${a} != ${b}`);

test("ordinary LOESS remains exact and robust passes reduce curved outlier influence", () => {
  assert.deepEqual(derive(), derive(rows, { robustIterations: 0 }));
  close(derive().values[0].y, 17.964434500763524);
  const robust = derive(rows, { robustIterations: 2 });
  close(robust.values[0].y, -4.676572328069697);
  assert.equal(robust.models[0].residualWeights[2], 0);
  const error = result => result.values.reduce((sum, row) => sum + Math.abs(row.y - 0.2*row.x*row.x), 0);
  assert.ok(error(robust) < error(derive()) / 2);
  assert.ok(error(derive(rows, { robustIterations: 5 })) < error(robust));
});

test("robust LOESS preserves affine fits, duplicates, and grouped independence", () => {
  const linear = Array.from({length: 20}, (_, x) => ({x, y: 2*x+1}));
  for (const span of [0.01, 0.5, 1]) {
    const result = derive([...linear, linear[5]], {span, robustIterations: 5});
    for (const row of result.values) close(row.y, 2*row.x+1);
  }
  const grouped = [...rows.map(row => ({...row,g:"B"})), ...linear.map(row => ({...row,g:"A"}))];
  const result = derive(grouped, {robustIterations:2, groupBy:"g"});
  assert.deepEqual(result.groups,["B","A"]);
  assert.deepEqual(result.values.filter(row=>row.g==="B").map(({g,...row})=>row),derive(rows,{robustIterations:2}).values);
  for (const row of result.values.filter(row=>row.g==="A")) close(row.y,2*row.x+1);
});

test("prediction grid uses final robust weights and retains scale equivariance", () => {
  const predict = {values:[0,0.5,1.5,19,20]};
  const robust = derive(rows,{robustIterations:2,predict});
  close(robust.values[0].y, derive(rows,{robustIterations:2}).values[0].y);
  assert.ok(Math.abs(robust.values[1].y) < Math.abs(derive(rows,{predict}).values[1].y));
  const scaled = derive(rows.map(row=>({x:row.x*1e150,y:row.y*1e150})),{
    robustIterations:2,predict:{values:predict.values.map(x=>x*1e150)}
  });
  scaled.values.forEach((row,i)=>close(row.y/1e150,robust.values[i].y));
  assert.ok(robust.values.every(row=>Number.isFinite(row.y)));
});

test("robust options validate before fitting and account for repeated work", () => {
  for (const robustIterations of [-1,0.5,33,NaN,Infinity,null,"2"]) assert.throws(()=>derive(rows,{robustIterations}),/robustIterations/);
  for (const method of ["linear","polynomial"]) assert.throws(()=>derive(rows,{method,span:undefined,robustIterations:0}),/requires the loess/);
  assert.throws(()=>derive(rows,{robustIterations:2,interval:"mean"}),/confidence intervals/);
  const large = Array.from({length:200},(_,x)=>({x,y:x%17}));
  assert.throws(()=>derive(large,{robustIterations:32}),/computation/);
  assert.ok(derive(large).values.length===200);
});

test("data edits persist robust parameters, reset them, and clean up method transitions", () => {
  const before = chart().createData({id:"raw",values:rows}).createRegressionData({id:"fit",...options,robustIterations:2});
  const fitted = p => p.semanticSpec.datasets.at(-1);
  assert.equal(fitted(before).transform[0].robustIterations,2);
  assert.deepEqual(fitted(before).values,derive(rows,{robustIterations:2}).values);
  const reset = before.editRegressionData({target:"fit",robustIterations:0});
  assert.deepEqual(fitted(reset).values,derive().values);
  assert.equal(fitted(reset).transform[0].robustIterations,undefined);
  const linear = before.editRegressionData({target:"fit",method:"linear"});
  assert.equal(fitted(linear).transform[0].robustIterations,undefined);
  assert.equal(fitted(before).transform[0].robustIterations,2);
  const restored = deserializeProgram(serializeProgram(before));
  assert.deepEqual(restored.semanticSpec,before.semanticSpec);
});

test("regression facade, edits, persistence, and SVG carry robust fitted geometry", () => {
  const before = chart().createCanvas().createData({values:rows}).createRegressionPlot({
    ...options,robustIterations:2,guides:false
  });
  const fitted = p => p.semanticSpec.datasets.findLast(d=>d.transform?.[0]?.type==="regression");
  assert.deepEqual(fitted(before).values,derive(rows,{robustIterations:2}).values);
  const changed = before.editRegression({robustIterations:3});
  assert.deepEqual(fitted(changed).values,derive(rows,{robustIterations:3}).values);
  assert.notEqual(renderToSVG(before),renderToSVG(changed));
  assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec,changed.graphicSpec);
  const linear = changed.editRegression({method:"linear"});
  assert.equal(fitted(linear).transform[0].robustIterations,undefined);
  assert.equal(fitted(before).transform[0].robustIterations,2);
});


test("zero-median residuals and empty robust neighborhoods have deterministic finite fits", () => {
  const values = [{x:0,y:100},{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}];
  const result = derive(values,{span:0.1,robustIterations:3,predict:{values:[0,0.5,1,2,3]}});
  assert.deepEqual(result.models[0].residualWeights,[0,0,1,1,1]);
  close(result.values[0].y,50);
  close(result.values[1].y,50);
  assert.ok(result.values.every(row=>Number.isFinite(row.y)));
  const tiny = derive([{x:0,y:1},{x:2,y:5}],{span:0.1,robustIterations:2,predict:{values:[0,1,2]}});
  assert.deepEqual(tiny.values,[{x:0,y:1},{x:1,y:3},{x:2,y:5}]);
});

test("robust smoothing reduces deterministic noisy outlier error", () => {
  const noisy = Array.from({length:40},(_,x)=>({x,y:Math.sin(x/10)+0.03*Math.cos(x*5)+(x===15?10:0)}));
  const error = result => result.values.reduce((sum,row)=>sum+(row.y-Math.sin(row.x/10))**2,0);
  assert.ok(error(derive(noisy,{robustIterations:3})) < error(derive(noisy)) / 4);
});


test("following source field edits retain robust fitting intent after restore", () => {
  const values = rows.map(row=>({...row,z:row.y*2+1}));
  const before = chart().createCanvas().createData({values})
    .createScatterPlot({id:"points",x:"x",y:"y",guides:false})
    .createRegression({...options,robustIterations:2,sourceBinding:"follow"});
  const after = deserializeProgram(serializeProgram(before)).encodeY({target:"points",field:"z"});
  const owner = after.markConfigs.points.regression;
  const data = after.semanticSpec.datasets.find(d=>d.id===owner.dataId);
  assert.equal(data.transform[0].robustIterations,2);
  const expected = derive(values,{y:"z",robustIterations:2});
  data.values.forEach((row,i)=>close(row.z,expected.values[i].z));
  assert.equal(before.markConfigs.points.regression.parameters.robustIterations,2);
});
