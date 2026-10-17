import assert from 'node:assert/strict';import test from 'node:test';
import {createPrimitiveProgram} from './primitive.program.js';
test('literal shared list has exact black/midgray/white radii1/2/3',()=>{
 const p=createPrimitiveProgram(),items=p.graphicSpec.objects.colorSizeLegendSymbols.items;
 assert.deepEqual(items.map(i=>i.properties.radius),[1,2,3]);
 assert.deepEqual(items.map(i=>i.properties.fill),['#000000','#808080','#ffffff']);
 assert.equal(p.graphicSpec.objects.colorSizeLegendLabels.items.length,3);
});
