import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrimitiveProgram} from './primitive.program.js';
test('literal sample window keeps area5000 in a height30 clip',()=>{
 const p=createPrimitiveProgram();assert.equal(p.graphicSpec.objects.sample.properties.radius,Math.sqrt(5000/Math.PI));
 assert.equal(p.graphicSpec.objects.sampleWindow.properties.height,30);
});
