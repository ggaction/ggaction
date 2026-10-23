import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrimitiveProgram} from './primitive.program.js';
test('literal seven-panel target retains bars, nested translation, headers and endpoint text',()=>{
  const {objects}=createPrimitiveProgram().graphicSpec;
  const children=objects.canvas.children.map(id=>objects[id]);
  assert.deepEqual(children.filter(o=>o.type==='canvas').map(o=>o.properties.y),Array(8).fill(0));
  const bars=Object.entries(objects).filter(([id,o])=>id.endsWith('_barPlot')&&o.items?.length===2);
  assert.equal(bars.length,7);
  assert.equal(Object.values(objects).filter(o=>o.type==='text').flatMap(o=>o.items??[o])
    .filter(o=>o.properties.text==='50').length,1);
  assert.equal(objects.chartTitle.properties.text,'Grouped Bar Chart');
});
