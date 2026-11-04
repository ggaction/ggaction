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

import { circleBatchFixture, columns } from '../../support/circle-batch.js';
const program = (appearance, batch) => circleBatchFixture(chart, appearance, batch);
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

test('batch columns remain isolated and survive graphic and editable persistence', () => {
  const appearance = { fill: '#2184b6', opacity: .4 }, p = program(appearance);
  appearance.fill = 'red'; assert.equal(p.graphicSpec.objects.dots.properties.appearance.fill, '#2184b6');
  const edited = p.editGraphics({ target: 'dots', property: 'x', value: [1, 2, 3, 4] });
  assert.equal(Object.is(p.graphicSpec.objects.dots.properties.x[0], -0), true);
  assert.deepEqual(edited.graphicSpec.objects.dots.properties.x, [1, 2, 3, 4]);
  for (const restored of [deserializeGraphic(serializeGraphic(p)), deserializeProgram(serializeProgram(p))]) {
    assert.deepEqual(restored.graphicSpec, p.graphicSpec);
    assert.equal(renderToSVG(restored), renderToSVG(p));
  }
  assert.throws(() => chart().createGraphics({ id: 'batch', type: 'circle-batch', length: 1 }), /cannot own items/);
  assert.throws(() => p.editGraphics({ target: 'dots', property: 'length', value: 2 }), /Unknown/);
});

test('batch validation rejects sparse, accessor, nonfinite, mismatched and extra data', () => {
  const valid = { ...columns(), appearance: { fill: 'red' } };
  const getter = [1]; Object.defineProperty(getter, '0', { get() { throw new Error('invoked'); }, enumerable: true });
  for (const x of [[], Array(4), [NaN, 1, 2, 3], [Infinity, 1, 2, 3], new Float64Array(4), getter, Array(10001).fill(1), [1]]) {
    assert.throws(() => validateConcreteGraphicProperties('circle-batch', { ...valid, x }));
  }
  for (const appearance of [{ fill: 'red', x: 1 }, { radius: 1 }, { length: 4 }, { items: [] }, { opacity: 2 }, { shadow: false }]) {
    assert.throws(() => validateConcreteGraphicProperties('circle-batch', { ...valid, appearance }));
  }
  assert.throws(() => validateConcreteGraphicProperties('circle-batch', { ...valid, radius: [-1, 1, 1, 1] }));
  assert.throws(() => validateConcreteGraphicProperties('circle-batch', { ...valid, extra: 1 }));
  assert.throws(() => validateConcreteGraphicProperties('circle-batch', { x: [1], y: [1], radius: [1] }));
});

for (const appearance of [
  { fill: '#2184b6', opacity: .37 },
  { fill: '#2184b6', opacity: .37, outline: { color: '#091827', width: 4 } },
  { fill: '#2184b6', opacity: .37, blend: 'difference', stroke: '#c34220', strokeWidth: 2 }
]) test(`batch preserves ordered individual circle painting ${JSON.stringify(appearance)}`, async () => {
  const p = program(appearance), control = program(appearance, false);
  for (const ratio of [1, 2]) assert.deepEqual(pixels(p, ratio), pixels(control, ratio));
  assert.equal(renderToSVG(p, { resourceNamespace: 'test' }), renderToSVG(control, { resourceNamespace: 'test' }));
  assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(control)).buffer);
  assert.deepEqual(pdfStreams((await renderToPDFBuffer(p)).buffer), pdfStreams((await renderToPDFBuffer(control)).buffer));
});

test('batch shadow preparation keeps one glyph per row and exact circle pixels', async () => {
  const appearance = { fill: '#2184b6', opacity: .5, shadow: { color: '#172a45', offsetX: 3, offsetY: -2, blurRadius: 2 } };
  const p = program(appearance), control = program(appearance, false);
  const decode = async ({ bytes }) => { const image = await loadImage(Buffer.from(bytes)); return { image, width: image.width, height: image.height, originClean: true }; };
  const a = await prepareShadowRendering(p, { createCanvas, decode }), b = await prepareShadowRendering(control, { createCanvas, decode });
  assert.equal(a.glyphCount, 4); assert.deepEqual(pixels(p, 1, a), pixels(control, 1, b));
  assert.equal(renderToSVG(p, { shadows: a, resourceNamespace: 'test' }), renderToSVG(control, { shadows: b, resourceNamespace: 'test' }));
  a.dispose(); b.dispose();
});

test('batch bounds and scene placement use each complete circle without changing row order', () => {
  const properties = { x: [10, 30], y: [20, 40], radius: [2, 3], appearance: { fill: 'red', outline: { color: 'black', width: 2 }, shadow: { color: 'black', offsetX: 4, offsetY: 2, blurRadius: 0 } } };
  assert.deepEqual(resolvePrimitiveGraphicBounds('circle-batch', properties), { left: 7, right: 34, top: 17, bottom: 44 });
  const a = resolvePrimitiveOccupiedBounds('circle', { ...properties.appearance, x: 10, y: 20, radius: 2 });
  const b = resolvePrimitiveOccupiedBounds('circle', { ...properties.appearance, x: 30, y: 40, radius: 3 });
  assert.deepEqual(resolvePrimitiveOccupiedBounds('circle-batch', properties), { left: a.left, right: b.right, top: a.top, bottom: b.bottom });
  const scene = { version: 3, width: 100, height: 80, entries: [{ kind: 'circle-run', keys: ['a', 'b'], topology: 'circle', offset: [8, 9], clip: [0, 0, 100, 80], clips: [[0, 0, 100, 80]], properties: { ...properties, appearance: { fill: 'red' } }, decisions: null }] };
  const p = canvasSceneProgram(scene), object = p.graphicSpec.objects['animation/node/0'];
  assert.equal(object.type, 'circle-batch'); assert.deepEqual(object.properties.x, [18, 38]); assert.deepEqual(object.properties.y, [29, 49]);
  scene.entries[0].properties.x[0] = 11;
  assert.notEqual(canvasSceneProgram(scene), p); assert.equal(object.properties.x[0], 18);
});

for (const fill of [
  { type: 'pattern', style: 'cross', pitch: 8, strokeWidth: 2, phase: [1, 3], foreground: 'rgba(255,0,0,.6)', background: 'rgba(0,0,255,.3)', origin: { x: 4, y: 5 } },
  { type: 'linear-gradient', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, stops: [{ offset: 0, color: 'red' }, { offset: 1, color: 'blue' }] },
  { type: 'radial-gradient', center: { x: .5, y: .5 }, focal: { x: .25, y: .4 }, radius: .7, stops: [{ offset: 0, color: 'red' }, { offset: 1, color: 'blue' }] }
]) test(`batch retains ${fill.type} origins under fractional clipping`, () => {
  const appearance = { fill, opacity: .65 }, batch = program(appearance), control = program(appearance, false);
  const clip = { type: 'path', commands: [{ op: 'M', x: 3.5, y: 2.25 }, { op: 'L', x: 75, y: 18 }, { op: 'L', x: 42, y: 66.5 }, { op: 'Z' }] };
  const a = batch.editGraphics({ target: 'plot-main', property: 'clip', value: clip });
  const b = control.editGraphics({ target: 'plot-main', property: 'clip', value: clip });
  for (const ratio of [1, 2]) assert.deepEqual(pixels(a, ratio), pixels(b, ratio));
  assert.equal(renderToSVG(a, { resourceNamespace: 'test' }), renderToSVG(b, { resourceNamespace: 'test' }));
});

test('batch native preflight charges every row before resizing the destination', () => {
  const p = program({ fill: 'red' }).editGraphics({ target: 'dots', property: 'x', value: [1, 2, 3, 20000000] });
  const surface = createCanvas(7, 9);
  assert.throws(() => render(p, surface.getContext('2d')), /16777216/);
  assert.equal(surface.width, 7); assert.equal(surface.height, 9);
  assert.equal(resolvePrimitiveGraphicBounds('circle-batch', {}), undefined);
  const large = { x: Array(10000).fill(1), y: Array(10000).fill(2), radius: Array(10000).fill(3), appearance: { fill: 'red' } };
  validateConcreteGraphicProperties('circle-batch', large);
  assert.throws(() => program({ fill: 'red' }).createGraphics({ id: 'mixed', type: 'collection' })
    .editGraphics({ target: 'mixed', property: 'items', value: [{ type: 'circle-batch', properties: { ...large, x: [1] } }] }), /equal row counts/);
});

test('identical batch properties in distinct collection items retain separate prepared glyphs', async () => {
  const appearance = { fill: '#2184b6', opacity: .5, shadow: { color: '#172a45', offsetX: 3, offsetY: -2, blurRadius: 2 } };
  const properties = { ...columns(), appearance };
  let p = chart().createCanvas({ width: 100, height: 80, margin: 0 }).createGraphics({ id: 'group', type: 'collection', parent: 'plot-main' });
  p = p.editGraphics({ target: 'group', property: 'items', value: [{ type: 'circle-batch', properties }, { type: 'circle-batch', properties }] });
  const decode = async ({ bytes }) => { const image = await loadImage(Buffer.from(bytes)); return { image, width: image.width, height: image.height, originClean: true }; };
  const shadows = await prepareShadowRendering(p, { createCanvas, decode });
  assert.equal(shadows.glyphCount, 8);
  assert.ok(pixels(p, 1, shadows).some(value => value !== 255));
  assert.equal((renderToSVG(p, { shadows }).match(/<image /g) ?? []).length, 6); // The two zero-radius rows have empty shadow glyphs.
  shadows.dispose();
});

test('scene3 compiler rejects ambiguous row identity and retains translated path and text geometry', () => {
  const node = { key: 'path', type: 'path', properties: { commands: [{ op: 'M', x: 1, y: 2 }, { op: 'L', x: 5, y: 6 }], stroke: 'red', strokeWidth: 1 }, offset: [3, 4], clip: [0, 0, 100, 80], clips: [] };
  const text = { ...node, key: 'text', type: 'text', properties: { x: 10, y: 20, text: 'x', fontSize: 10, fill: 'red', fillBounds: { left: 10, right: 20, top: 10, bottom: 20 } } };
  const scene = { version: 3, width: 100, height: 80, entries: [{ kind: 'single', node, decision: null }, { kind: 'single', node: text, decision: null }] };
  const p = canvasSceneProgram(scene);
  assert.deepEqual(p.graphicSpec.objects['animation/node/0'].properties.commands, [{ op: 'M', x: 4, y: 6 }, { op: 'L', x: 8, y: 10 }]);
  assert.deepEqual(p.graphicSpec.objects['animation/node/1'].properties.fillBounds, { left: 13, right: 23, top: 14, bottom: 24 });
  assert.throws(() => canvasSceneProgram({ ...scene, entries: [...scene.entries, scene.entries[0]] }), /unique keys/);
  assert.throws(() => canvasSceneProgram({ ...scene, entries: [{ kind: 'unknown' }] }), /entry kind/);
  const run = { kind: 'circle-run', keys: ['a'], topology: '', properties: { x: [1, 2], y: [1, 2], radius: [1, 2], appearance: { fill: 'red' } }, offset: [0, 0], clip: [0, 0, 100, 80], clips: [], decisions: null };
  assert.throws(() => canvasSceneProgram({ ...scene, entries: [run] }), /keys must follow/);
  const batchNode = { ...node, type: 'circle-batch', properties: run.properties };
  assert.throws(() => canvasSceneProgram({ version: 2, width: 100, height: 80, nodes: [batchNode] }), /Canvas scene nodes/);
  assert.throws(() => canvasSceneProgram({ ...scene, entries: [{ kind: 'single', node: batchNode, decision: null }] }), /Canvas scene nodes/);
});

test('owned run checks are reused only for exact owned keys and whole key tuples', async () => {
  const { cloneAndFreeze } = await import('../../../src/core/immutable.js');
  const run = (keys, x) => ({ kind: 'circle-run', keys, topology: 'circle', offset: [0, 0], clip: [0, 0, 100, 80], clips: [[0, 0, 100, 80]],
    properties: { x, y: x.map(() => 5), radius: x.map(() => 1), appearance: { fill: 'red' } }, decisions: null });
  const scene = entries => cloneAndFreeze({ version: 3, width: 100, height: 80, entries });
  const a = cloneAndFreeze(['a', 'b']), b = cloneAndFreeze(['c']), clash = cloneAndFreeze(['b']);
  // Repeated owned scenes with the same arrays keep compiling the same output.
  const first = canvasSceneProgram(scene([run(a, [1, 2]), run(b, [3])])).graphicSpec;
  for (let i = 0; i < 3; i++) assert.deepEqual(canvasSceneProgram(scene([run(a, [1, 2]), run(b, [3])])).graphicSpec, first);
  // A different tuple with the same anchor still checks cross-run uniqueness.
  assert.throws(() => canvasSceneProgram(scene([run(a, [1, 2]), run(clash, [3])])), /unique keys/);
  assert.throws(() => canvasSceneProgram(scene([run(a, [1, 2]), run(b, [3]), run(clash, [4])])), /unique keys/);
  // Caller arrays and caller scenes keep every check on every call.
  const caller = ['a', 'b'];
  canvasSceneProgram({ version: 3, width: 100, height: 80, entries: [run(caller, [1, 2])] });
  Object.defineProperty(caller, 1, { get: () => 'b', enumerable: true, configurable: true });
  assert.throws(() => canvasSceneProgram({ version: 3, width: 100, height: 80, entries: [run(caller, [1, 2])] }));
  assert.throws(() => canvasSceneProgram({ version: 3, width: 100, height: 80, entries: [run(['a', 'a'], [1, 2])] }), /unique keys/);
  assert.throws(() => canvasSceneProgram({ version: 3, width: 100, height: 80, entries: [run(a, [1, 2]), run(['a'], [3])] }), /unique keys/);
  // Key count still has to follow coordinate rows for a reused owned array.
  assert.throws(() => canvasSceneProgram(scene([run(a, [1])])), /follow every coordinate row/);
});
