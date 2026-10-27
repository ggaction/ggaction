import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../src/persistence.js';
import { renderToSVG } from '../../src/renderers/svg.js';
import { resolveStrokeDetails } from '../../src/grammar/strokeStyle.js';

function countSceneSerializations(graphicSpec, run) {
  const stringify = JSON.stringify;
  let count = 0;
  JSON.stringify = function (value, ...args) {
    if (value === graphicSpec || value?.graphicSpec === graphicSpec && value.canvas) count++;
    return Reflect.apply(stringify, this, [value, ...args]);
  };
  try { return { value: run(), get count() { return count; } }; }
  finally { JSON.stringify = stringify; }
}

const solidSpec = () => ({ objects: {
  canvas: { type: 'canvas', properties: { width: 80, height: 60 }, children: ['points'] },
  points: { type: 'circle', items: [{ id: 'point', properties: { x: 20, y: 30, radius: 4, fill: '#123456' } }] },
}, order: ['canvas'] });

function namespaceFor(graphicSpec) {
  let hash = 0xcbf29ce484222325n;
  const source = JSON.stringify(graphicSpec);
  for (let index = 0; index < source.length; index++) hash = BigInt.asUintN(64, (hash ^ BigInt(source.charCodeAt(index))) * 0x100000001b3n);
  return hash.toString(36);
}

test('solid SVG rendering does not serialize the whole scene to allocate unused resources', () => {
  const graphicSpec = solidSpec();
  const first = countSceneSerializations(graphicSpec, () => renderToSVG({ graphicSpec }));
  assert.equal(first.count, 0);
  assert.equal(first.value, '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60" viewBox="0 0 80 60"><circle cx="20" cy="30" r="4" fill="#123456" opacity="1"/></svg>');
  graphicSpec.objects.points.items[0].properties.x = 35;
  assert.match(renderToSVG({ graphicSpec }), /cx="35"/);
  graphicSpec.objects.points.items[0].properties.radius = -1;
  assert.throws(() => renderToSVG({ graphicSpec }), /radius must not be negative/);
});

test('SVG clip resources hash once per render and retain their exact existing IDs for mutable inputs', () => {
  const graphicSpec = solidSpec();
  graphicSpec.objects.points.clip = { x: 0, y: 0, width: 40, height: 50 };
  graphicSpec.objects.extra = { type: 'circle', properties: { x: 50, y: 20, radius: 3, fill: 'red' },
    clip: { x: 40, y: 0, width: 30, height: 40 } };
  graphicSpec.objects.canvas.children.push('extra');
  const render = () => {
    const measured = countSceneSerializations(graphicSpec, () => renderToSVG({ graphicSpec }));
    assert.equal(measured.count, 1, 'multiple resources share one content hash in each render');
    const explicit = renderToSVG({ graphicSpec }, { resourceNamespace: 'expected' });
    assert.equal(measured.value, explicit.replaceAll('-expected-', `-${namespaceFor(graphicSpec)}-`));
    return measured.value;
  };
  const first = render();
  graphicSpec.objects.extra.properties.x = 45;
  assert.notEqual(render(), first, 'caller mutation must invalidate the namespace and geometry');
});

test('common stroke styles reuse immutable results while every request still validates', () => {
  const common = new Set();
  for (const lineCap of ['butt', 'round', 'square']) for (const lineJoin of ['miter', 'round', 'bevel']) {
    const args = { lineCap, lineJoin }, resolved = resolveStrokeDetails(args);
    assert.deepEqual(resolved, { lineCap, lineJoin, miterLimit: 10 });
    assert.equal(resolveStrokeDetails({ ...args, miterLimit: 10 }), resolved);
    assert.ok(Object.isFrozen(resolved));
    common.add(resolved);
    args.lineCap = 'invalid';
    assert.throws(() => resolveStrokeDetails(args), /lineCap/);
  }
  assert.equal(common.size, 9);
  assert.equal(resolveStrokeDetails(), resolveStrokeDetails({ lineCap: 'butt', lineJoin: 'miter' }));
  assert.deepEqual(resolveStrokeDetails({ miterLimit: 2 }), { lineCap: 'butt', lineJoin: 'miter', miterLimit: 2 });
  for (const args of [null, [], { lineCap: 1 }, { lineJoin: 'invalid' }, { miterLimit: 0 }, { miterLimit: NaN }]) {
    assert.throws(() => resolveStrokeDetails(args));
  }
});

test('repeated fitting reuses unchanged scene fingerprints and invalidates actual edits and restored states', () => {
  const source = chart().createCanvas({ plot: { width: 240, height: 180 }, margin: 70 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
    .createScatterPlot({ id: 'p', x: 'x', y: 'y' });
  const policy = { padding: 4, minPlotWidth: 1, minPlotHeight: 1, align: 'center' };
  const fitted = source.fitCanvas(policy);
  const warm = countSceneSerializations(fitted.graphicSpec, () => fitted.fitCanvas(policy));
  assert.equal(warm.count, 0, 'a repeated fit must not rehash every graphic item');
  assert.deepEqual(warm.value.materializationConfigs, fitted.materializationConfigs);
  assert.deepEqual(warm.value.graphicSpec, fitted.graphicSpec);
  const changed = fitted.encodeColor({ target: 'p', value: 'red' }).fitCanvas(policy);
  assert.notEqual(changed.materializationConfigs.fitting.result.signature, fitted.materializationConfigs.fitting.result.signature);
  const restored = deserializeProgram(serializeProgram(changed));
  const cold = countSceneSerializations(restored.graphicSpec, () => restored.fitCanvas(policy));
  assert.equal(cold.count, 1, 'restoration must validate the persisted fingerprint against its current content');
  assert.deepEqual(cold.value.graphicSpec, changed.graphicSpec);
  assert.equal(countSceneSerializations(restored.graphicSpec, () => restored.fitCanvas(policy)).count, 0);
});
