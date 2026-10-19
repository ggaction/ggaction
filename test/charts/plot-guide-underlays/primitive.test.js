import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrimitiveProgram} from './primitive.program.js';
test('literal backdrop retains two curved bars, gray axis and inset border before the bars',()=>{
  const {objects}=createPrimitiveProgram().graphicSpec;
  assert.deepEqual(objects['plot-main'].children,['horizontalGridLines','plotBorder','xAxisLine','barPlot']);
  assert.deepEqual(objects.barPlot.items.map(item=>item.properties.blend),['difference','difference']);
  assert.deepEqual(objects.barPlot.items.map(item=>item.properties.commands[0]),[{op:'M',x:50,y:68},{op:'M',x:140,y:32}]);
  assert.equal(objects.xAxisLine.properties.stroke,'#888');
  assert.deepEqual([objects.plotBorder.properties.x,objects.plotBorder.properties.y],[40.5,20.5]);
});
