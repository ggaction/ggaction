import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { inflateSync } from 'node:zlib';
import { chart, render } from '../../../src/index.js';
import { renderToSVG } from '../../../src/renderers/svg.js';
import { renderToPNGBuffer } from '../../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../../src/renderers/pdf.js';
import { prepareShadowRendering } from '../../../src/renderers/shadowRendering.js';
import { serializeGraphic, deserializeGraphic, serializeProgram, deserializeProgram } from '../../../src/persistence.js';
import { validateConcreteGraphicProperties } from '../../../src/grammar/schemas/concreteGraphic.js';
import { resolvePrimitiveGraphicBounds, resolvePrimitiveOccupiedBounds } from '../../../src/grammar/schemas/graphicBounds.js';
import { canvasSceneProgram } from '../../../src/renderers/canvasScene.js';
import { pathBatchFixture, pathColumns, pathRows } from '../../support/path-batch.js';

const program = (appearance, batch) => pathBatchFixture(chart, appearance, batch);
function pixels(p, pixelRatio = 1, shadows) {
  const surface = createCanvas(1, 1); render(p, surface.getContext('2d'), { pixelRatio, shadows });
  return surface.getContext('2d').getImageData(0, 0, surface.width, surface.height).data;
}
function pdfStreams(buffer) {
  const streams = [];
  for (const match of buffer.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try { streams.push(inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1')); } catch {}
  }
  return streams;
}

test('path batch columns remain isolated and survive graphic and editable persistence', () => {
  const appearance = { fill: '#2184b6', opacity: .4 }, p = program(appearance);
  appearance.fill = 'red'; assert.equal(p.graphicSpec.objects.cells.properties.appearance.fill, '#2184b6');
  const x = pathColumns().x.map(value => value + 1), edited = p.editGraphics({ target: 'cells', property: 'x', value: x });
  assert.deepEqual(edited.graphicSpec.objects.cells.properties.x, x);
  assert.deepEqual(p.graphicSpec.objects.cells.properties.x, pathColumns().x);
  for (const restored of [deserializeGraphic(serializeGraphic(p)), deserializeProgram(serializeProgram(p))]) {
    assert.deepEqual(restored.graphicSpec, p.graphicSpec);
    assert.equal(renderToSVG(restored), renderToSVG(p));
  }
  assert.throws(() => chart().createGraphics({ id: 'batch', type: 'path-batch', length: 1 }), /cannot own items/);
  assert.throws(() => p.editGraphics({ target: 'cells', property: 'commands', value: [] }), /Unknown/);
});

test('path batch validation rejects malformed columns, rows and appearance', () => {
  const valid = { ...pathColumns(), closed: true, appearance: { fill: 'red' } };
  validateConcreteGraphicProperties('path-batch', valid);
  const getter = [0, 0]; Object.defineProperty(getter, '0', { get() { throw new Error('invoked'); }, enumerable: true });
  for (const x of [[], Array(valid.x.length), [NaN, ...valid.x.slice(1)], new Float64Array(valid.x.length), getter, valid.x.slice(1)]) {
    assert.throws(() => validateConcreteGraphicProperties('path-batch', { ...valid, x }));
  }
  for (const starts of [[], [1, 4], [0, 1], [0, 4, 4], [0, 4, 3], [0, 4.5], [0, valid.x.length - 1], ['0', 4]]) {
    assert.throws(() => validateConcreteGraphicProperties('path-batch', { ...valid, starts }), JSON.stringify(starts));
  }
  for (const appearance of [{ commands: [] }, { maxCommands: 10 }, { length: 2 }, { x: 1 }, { opacity: 2 }, { shadow: false }]) {
    assert.throws(() => validateConcreteGraphicProperties('path-batch', { ...valid, appearance }), JSON.stringify(appearance));
  }
  for (const closed of [1, 'true', undefined]) assert.throws(() => validateConcreteGraphicProperties('path-batch', { ...valid, closed }));
  assert.throws(() => validateConcreteGraphicProperties('path-batch', { ...valid, extra: 1 }));
  const rows = Array.from({ length: 10001 }, (_, index) => index * 2);
  assert.throws(() => validateConcreteGraphicProperties('path-batch', { x: Array(20002).fill(1), y: Array(20002).fill(1), starts: rows, closed: false, appearance: {} }), /1\.\.10000/);
});

for (const appearance of [
  { fill: '#2184b6', opacity: .37 },
  { fill: '#2184b6', stroke: '#091827', strokeWidth: 3, lineJoin: 'round', opacity: .6 },
  { fill: '#2184b6', fillRule: 'evenodd', opacity: .37, blend: 'difference', stroke: '#c34220', strokeWidth: 2, strokeDash: [3, 2] }
]) test(`path batch preserves ordered individual path painting ${JSON.stringify(appearance)}`, async () => {
  const p = program(appearance), control = program(appearance, false);
  for (const ratio of [1, 2]) assert.deepEqual(pixels(p, ratio), pixels(control, ratio));
  assert.equal(renderToSVG(p, { resourceNamespace: 'test' }), renderToSVG(control, { resourceNamespace: 'test' }));
  assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(control)).buffer);
  assert.deepEqual(pdfStreams((await renderToPDFBuffer(p)).buffer), pdfStreams((await renderToPDFBuffer(control)).buffer));
});

test('path batch shadow preparation keeps one glyph per row and exact path pixels', async () => {
  const appearance = { fill: '#2184b6', opacity: .5, shadow: { color: '#172a45', offsetX: 3, offsetY: -2, blurRadius: 2 } };
  const p = program(appearance), control = program(appearance, false);
  const decode = async ({ bytes }) => { const image = await loadImage(Buffer.from(bytes)); return { image, width: image.width, height: image.height, originClean: true }; };
  const a = await prepareShadowRendering(p, { createCanvas, decode }), b = await prepareShadowRendering(control, { createCanvas, decode });
  assert.equal(a.glyphCount, pathRows().length); assert.deepEqual(pixels(p, 1, a), pixels(control, 1, b));
  a.dispose(); b.dispose();
});

test('path batch bounds and scene placement use each complete row', () => {
  const properties = { ...pathColumns(), closed: true, appearance: { fill: 'red', stroke: 'black', strokeWidth: 2 } };
  const rows = pathRows().map(commands => ({ ...properties.appearance, commands }));
  const union = list => ({ left: Math.min(...list.map(b => b.left)), right: Math.max(...list.map(b => b.right)), top: Math.min(...list.map(b => b.top)), bottom: Math.max(...list.map(b => b.bottom)) });
  assert.deepEqual(resolvePrimitiveGraphicBounds('path-batch', properties), union(rows.map(row => resolvePrimitiveGraphicBounds('path', row))));
  assert.deepEqual(resolvePrimitiveOccupiedBounds('path-batch', properties), union(rows.map(row => resolvePrimitiveOccupiedBounds('path', row))));
  assert.equal(resolvePrimitiveGraphicBounds('path-batch', {}), undefined);
  const keys = pathRows().map((_, index) => `cell-${index}`);
  const scene = { version: 3, width: 100, height: 80, entries: [{ kind: 'path-run', keys, topology: '', offset: [8, 9], clip: [0, 0, 100, 80], clips: [[0, 0, 100, 80]], properties, decisions: null }] };
  const p = canvasSceneProgram(scene), object = p.graphicSpec.objects['animation/node/0'];
  assert.equal(object.type, 'path-batch'); assert.deepEqual(object.properties.x, properties.x.map(value => value + 8));
  assert.deepEqual(object.properties.starts, properties.starts);
  assert.throws(() => canvasSceneProgram({ ...scene, entries: [{ ...scene.entries[0], keys: keys.slice(1) }] }), /keys must follow/);
  assert.throws(() => canvasSceneProgram({ version: 2, width: 100, height: 80, nodes: [{ key: 'a', type: 'path-batch', properties, offset: [0, 0], clip: [0, 0, 100, 80], clips: [] }] }), /Canvas scene nodes/);
});
