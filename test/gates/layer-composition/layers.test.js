import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeProgram, deserializeProgram } from '../../../src/persistence.js';
import { createTransitionScene } from '../../../src/scene.js';
import { build, variants, rows } from './manifest.js';

for (const variant of variants) test(`${variant.id}: common measurement, editable owners, replay and resize`, () => {
  const program = build(variant);
  const before = serializeProgram(program);
  assert.ok(program.semanticSpec.layers.length >= 6);
  for (const layer of program.semanticSpec.layers) {
    assert.equal(layer.coordinate, 'main');
    assert.equal(layer.encoding.x.scale, 'category');
    assert.equal(layer.encoding.y.scale, 'value');
  }
  assert.equal(program.markConfigs.summary.boxPlot.source, 'observations');
  const sampleId = variant.id === 'beeswarm-box' ? 'observations' : 'samples';
  assert.equal(program.graphicSpec.objects[sampleId].items.length, rows.length);
  const restored = deserializeProgram(before);
  assert.deepEqual(createTransitionScene(restored,{format:'canvas'}), createTransitionScene(program,{format:'canvas'}));
  const resized = program.editCanvas({plot:{width:460,height:240}});
  assert.equal(resized.graphicSpec.objects[sampleId].items.length, rows.length);
  assert.equal(serializeProgram(program),before);
  const edited = program.encodeOpacity({target:sampleId,value:.2});
  assert.equal(edited.markConfigs[sampleId].opacity,.2);
  assert.equal(edited.markConfigs.summary.opacity,program.markConfigs.summary.opacity);
  for (const node of createTransitionScene(resized,{format:'canvas'}).nodes) {
    assert.ok(node.clip.every(Number.isFinite));
  }
});
