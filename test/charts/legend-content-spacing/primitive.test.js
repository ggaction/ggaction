import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrimitiveProgram} from './primitive.program.js';

test('literal spacing target retains three plot points and independent painted-edge gaps',()=>{
  const {objects}=createPrimitiveProgram().graphicSpec;
  const points=objects.scatterPlot.items.map(item=>item.properties);
  assert.deepEqual(points.map(p=>[p.x,p.y,p.radius]),[[40,190,8],[110,110,12],[180,30,20]]);
  const samples=objects.sizeLegendSymbols.items.map(item=>item.properties);
  assert.deepEqual(samples.map(p=>[p.x,p.y,p.radius]),[[231,73,8],[231,102,12],[231,143,20]]);
  assert.equal(samples[1].y-13-(samples[0].y+9),7);
  assert.equal(samples[2].y-21-(samples[1].y+13),7);
  assert.equal(samples[0].y-9-(objects.sizeLegendTitle.properties.y+14),20);
  assert.deepEqual(objects.sizeLegendLabels.items.map(i=>[i.properties.text,i.properties.y]),[['0',68],['80',97],['336',138]]);
});
