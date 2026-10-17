import assert from 'node:assert/strict';
import test from 'node:test';
import {createPublicProgram} from './manifest.js';
test('public sample window retains area and all imported source rows',()=>{
 const p=createPublicProgram();assert.equal(p.graphicSpec.objects['sizeLegendSymbols:0'].properties.radius,Math.sqrt(5000/Math.PI));
 assert.equal(p.semanticSpec.datasets[0].values.length,2);
 assert.equal(p.guideConfigs.legend.size.clipHeight,30);
});
