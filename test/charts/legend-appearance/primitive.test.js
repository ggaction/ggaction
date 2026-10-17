import assert from 'node:assert/strict';import test from 'node:test';
import {createPrimitiveProgram} from './primitive.program.js';
test('literal composite uses one opacity source for complete fill and stroke',()=>{const p=createPrimitiveProgram();assert.equal(p.graphicSpec.objects.colorLegendSymbolPoints.items[0].properties.blend,'normal');});
