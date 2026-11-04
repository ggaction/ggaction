import { chart } from 'ggaction';
import { createTransitionScene } from 'ggaction/scene';
import { planTransition, sampleTransition } from 'ggaction/animation';
import { createInteractionSession } from 'ggaction/interaction';
import { serializeProgram, deserializeProgram } from 'ggaction/persistence';
import { expectedGridNeighbors } from '../../test/oracles/inference-grid.js';
import { inferenceWorkerStage } from './inference.js';

const inferenceWorkerUrl = typeof document === 'undefined' ? undefined : URL.createObjectURL(new Blob([
  await (await fetch('./inference-worker.js')).text()
], { type: 'text/javascript' }));
const createInferenceWorker = () => {
  if (inferenceWorkerUrl === undefined) throw new Error('Inference benchmark requires a browser Worker.');
  return new Worker(inferenceWorkerUrl, { type: 'module' });
};

// These are the complete required size classes, including unsupported cells.
export const workloadSizes = Object.freeze({ points: [1000, 10000, 100000], partition: [100, 1000, 10000], geo: [1000, 10000, 100000], data: [1000, 10000, 100000], inference: [100, 1000, 10000] });
export const workloadThresholds = Object.freeze({
  points: { hitMs: [8, 12, 20], fullFrameSampleMs: [16.7, 33, 50] },
  partition: { kernelMs: [10, 50, 300], gesturePreviewMs: [33, 33, 33] },
  geo: { cameraPreviewMs: [16.7, 33, 50], hitMs: [20, 20, 20] },
  data: { loadMs: [100, 500, 3000], reviseMs: [100, 500, 3000], blockingSliceMs: [50, 50, 50] },
  inference: { inferenceMs: [null, 1000, null], workerMs: [null, null, 10000] }
});
const check = (value, message) => { if (!value) throw new Error(`Workload assertion: ${message}`); };
const close = (a, b) => check(Number.isFinite(a) && Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const canvas = () => chart().createCanvas({ width: 400, height: 400, margin: 20, plotBorder: false });
const scene = program => createTransitionScene(program, { format: 'canvas' });
const sampleOptions = { durationMs: 100, easing: 'linear' };
const time = fn => { const start = performance.now(), value = fn(); return { value, elapsed: performance.now() - start }; };
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))].map(value => value.toString(16).padStart(2, '0')).join('');
// Only documented, explicit native bounds are limits. Other exceptions are failures.
export function isNativeLimit(error) {
  return error.name === 'RangeError' && /(?:must not exceed|exceeds? (?:(?:the|its) )?(?:maximum|limit|(?:(?:work|item) )?budget)|work limit|node limit|budget exceeded)/i.test(error.message);
}
function pointRows(count) {
  const side = Math.ceil(Math.sqrt(count));
  return Array.from({ length: count }, (_, id) => ({ id, x: (id % side + 1) / (side + 1), y: (Math.floor(id / side) + 1) / (side + 1) }));
}
function pointProgram(rows) {
  return canvas().createData({ id: 'rows', keyField: 'id', values: rows }).createPointMark({ id: 'points', maxItems: 100000 })
    .encodeX({ field: 'x', scale: { id: 'x', domain: [0, 1], nice: false } })
    .encodeY({ field: 'y', scale: { id: 'y', domain: [0, 1], nice: false } });
}
function checkPoints(programOrFrame, rows, denominator = 1) {
  const nodes = (programOrFrame.scene ?? scene(programOrFrame)).nodes.filter(node => node.type === 'circle');
  check(nodes.length === rows.length, 'all point rows must be drawn');
  nodes.forEach((node, i) => { close(node.properties.x, 20 + 360 * rows[i].x / denominator); close(node.properties.y, 380 - 360 * rows[i].y); check(node.properties.radius > 0, 'point radius'); });
  return { count: nodes.length, first: nodes[0].properties, last: nodes.at(-1).properties };
}
function hitStage(program, queries, owner, rowKeys, preparation) {
  return () => {
    const session = createInteractionSession({ program, bindings: [], ...(preparation === undefined ? {} : { hitPreparation: preparation }) });
    const host = typeof document === 'undefined' ? { addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) } : document.querySelector('canvas');
    session.mount(host, { rootTransform: [1.5, 0, 0, 1.5, 7, 11] });
    let cursor = 0;
    return {
      run() { const index = cursor++ % queries.length, q = queries[index];
        const result = time(() => session.dispatch({ type: 'inspect', point: { x: q[0] * 1.5 + 7, y: q[1] * 1.5 + 11 }, slop: 0 }));
        return { metrics: { hitMs: result.elapsed }, index, hit: session.getState().hit };
      },
      validate(result) {
        check(result.hit?.candidates.some(value => value.ownerId === owner && (!rowKeys || value.rowKeys.includes(rowKeys[result.index]))), 'CSS hit must include the exact native item');
        return { queries: queries.length, cssTransform: [1.5, 0, 0, 1.5, 7, 11], candidateCount: result.hit.candidates.length, owner };
      },
      dispose() { session.destroy(); check(session.getState().destroyed, 'session disposed'); }
    };
  };
}
function samplingStage(from, to, metric, validate, options = sampleOptions) {
  return () => {
    const plan = planTransition({ from, to, options });
    check(sampleTransition(plan, 0).graphicSpec === from.graphicSpec, 'exact start graphic identity');
    check(sampleTransition(plan, 100).graphicSpec === to.graphicSpec, 'exact end graphic identity');
    return { run() { const result = time(() => sampleTransition(plan, 50)); return { metrics: { [metric]: result.elapsed }, frame: result.value }; },
      validate(result) { return validate(result.frame); } };
  };
}

export function nativeWorkloadInput(kind, count) {
  check(Object.hasOwn(workloadSizes, kind), 'unknown workload');
  check(Number.isSafeInteger(count) && count >= 3 && count <= 100000, 'invalid fixture size');
  if (kind === 'points' || kind === 'data') return pointRows(count);
  if (kind === 'inference') {
    const side = Math.ceil(Math.sqrt(count));
    return Array.from({ length: count }, (_, index) => { const id = count - index - 1; return { id, x: id % side, y: Math.floor(id / side) }; });
  }
  if (kind === 'partition') return [{ key: 'root', parent: null, value: 0 }, ...Array.from({ length: count - 1 }, (_, id) => ({ key: id, parent: 'root', value: 1 }))];
  // A non-collinear, all-front-facing LineString. No vertex filtering or sampling.
  return { type: 'FeatureCollection', features: [{ type: 'Feature', id: 'line', properties: {}, geometry: { type: 'LineString', coordinates:
    Array.from({ length: count }, (_, i) => [-30 + 60 * i / (count - 1), (i % 2 ? 1 : -1) * 5]) } }] };
}

export function prepareNativeWorkload(kind, count, input = nativeWorkloadInput(kind, count)) {
  const original = JSON.stringify(input), stages = [];
  let program, witness;
  if (kind === 'points' || kind === 'data') {
    check(input.length === count, 'point input cardinality');
    program = pointProgram(input); witness = checkPoints(program, input);
    if (kind === 'points') {
      const indices = [0, Math.floor(count / 2), count - 1], rows = program.semanticSpec.datasets.find(data => data.id === 'rows').rowKeys;
      stages.push({ name: 'css-hit', prepare: hitStage(program, indices.map(i => [20 + 360 * input[i].x, 380 - 360 * input[i].y]), 'points', indices.map(i => rows[i]), count === 100000 ? { maxSceneNodes: count + 1, maxWork: 128000000 } : undefined) });
      stages.push({ name: 'full-frame', prepare: () => samplingStage(program, program.editScale({ id: 'x', domain: [0, 2], nice: false }), 'fullFrameSampleMs', frame => {
        check(frame.decisions.filter(value => value.kernel === 'cartesian-point').length === count, 'every point must use semantic position interpolation');
        return checkPoints(frame, input, 1.5);
      }, count >= 10000 ? { ...sampleOptions, maxEndpointNodes: 2 * (count + 1), maxOutputNodes: count + 1 } : sampleOptions)() });
    } else {
      const saved = serializeProgram(program), revised = input.map(row => ({ ...row, x: row.x / 2 }));
      stages.push({ name: 'editable-load', prepare: () => ({ run() { const r = time(() => deserializeProgram(saved)); return { metrics: { loadMs: r.elapsed, blockingSliceMs: r.elapsed }, program: r.value }; }, validate: r => checkPoints(r.program, input) }) });
      stages.push({ name: 'source-revise', prepare: () => ({ run() { const r = time(() => program.reviseData({ source: 'rows', id: 'revision', values: revised })); return { metrics: { reviseMs: r.elapsed, blockingSliceMs: r.elapsed }, program: r.value }; }, validate(r) { checkPoints(program, input); return checkPoints(r.program, revised); } }) });
      witness = { ...witness, snapshotCharacters: saved.length, load: 'deserializeProgram', revise: 'reviseData with full dependent point rematerialization', blocking: 'entire synchronous public call, no yielded slice' };
    }
  } else if (kind === 'inference') {
    check(input.length === count, 'inference input cardinality');
    const expected = expectedGridNeighbors(input), definition = { id: 'neighbors', data: 'rows', nodeKey: 'id', ruleId: 'nearest',
      rule: 'knn', features: ['x', 'y'], metric: 'manhattan', options: { k: 10, symmetrize: 'directed', search: { mode: 'exact', algorithm: 'kd-tree' } },
      maxEdges: count * 10, execution: { policy: 'bounded-inference@1', maxWork: 100000000, maxBytes: 134217728 } };
    program = chart().createData({ id: 'rows', keyField: 'id', values: input });
    const baseline = JSON.stringify(program.semanticSpec), graphic = program.graphicSpec, source = program.semanticSpec.datasets.find(value => value.id === 'rows');
    witness = { nodes: count, expectedEdges: expected.length, k: 10, metric: 'manhattan', search: 'exact kd-tree',
      inputOrder: 'descending numeric ID', oracle: 'complete Manhattan shells, numeric ID ties, all rows and edges',
      execution: 'synchronous createInferredGraphData and dedicated public inference executor',
      preparation: 'source authoring and independent oracle outside inference timing', sourceRows: count,
      outputHashScope: 'complete graph resource, including the actual per-fixture allocated logical data ID; not a cross-fixture identity hash' };
    const validateInference = result => {
        const resource = result.program.semanticSpec.resources.find(value => value.kind === 'graph' && value.id === 'neighbors');
        check(resource?.inputs.length === 1 && resource.inputs[0].kind === 'data' && resource.inputs[0].id === 'rows' && resource.inputs[0].logicalId === source.logicalId && resource.inputs[0].revision === 0, 'inference exact source ref');
        const model = resource.result.model, diagnostics = resource.result.diagnostics, keys = new Map();
        check(model.nodes.length === count && model.edges.length === expected.length, 'all inference nodes and k10 edges');
        model.nodes.forEach((node, index) => {
          check(node.sourceRows.length === 1 && node.sourceRows[0] === index, 'inference node row order');
          check(node.key === source.rowKeys[index] && !keys.has(node.key), 'exact inference typed node key'); keys.set(node.key, index);
        });
        const edgeKeys = new Set();
        model.edges.forEach((edge, index) => {
          const wanted = expected[index];
          check(keys.get(edge.sourceKey) === wanted.sourceIndex && keys.get(edge.targetKey) === wanted.targetIndex && edge.weight === wanted.weight, 'exact inference pair order, ties and weight');
          check(edge.sourceRows.length === 2 && edge.sourceRows[0] === wanted.sourceIndex && edge.sourceRows[1] === wanted.targetIndex, 'exact inference edge source rows');
          check(edge.directed === true && edge.origin === 'inferred' && edge.ruleId === 'nearest' && !edgeKeys.has(edge.key), 'inference direction, provenance and unique edge key'); edgeKeys.add(edge.key);
        });
        check(resource.provenance.origin === 'inferred' && resource.provenance.sourceRows.length === count, 'complete inferred source provenance');
        resource.provenance.sourceRows.forEach((row, index) => check(row.data === source.id && row.logicalDataId === source.logicalId && row.revision === source.revision && row.rowKey === source.rowKeys[index] && row.role === 'node', 'exact inference source provenance'));
        check(diagnostics.effectiveK === 10 && diagnostics.preparation.omitted.length === 0 && diagnostics.preparation.sourceIndices.length === count, 'no inference node omitted');
        diagnostics.preparation.sourceIndices.forEach((index, i) => check(index === i, 'inference original source indexes'));
        check(diagnostics.search.mode === 'exact' && diagnostics.search.algorithm === 'kd-tree', 'exact inference search');
        check(result.program.graphicSpec === graphic && JSON.stringify(program.semanticSpec) === baseline, 'inference leaves previous program and graphics unchanged');
        return { ...witness, edges: model.edges.length, pairCount: diagnostics.pairCount, search: diagnostics.search };
      };
    stages.push({ name: 'exact-inference', prepare: () => ({
      run() { const r = time(() => program.createInferredGraphData(definition)); return { metrics: { inferenceMs: r.elapsed }, program: r.value, output: r.value.semanticSpec.resources.find(value => value.kind === 'graph' && value.id === 'neighbors') }; },
      validate: validateInference
    }) });
    if (count === 10000) stages.push({ name: 'large-worker', prepare: () => inferenceWorkerStage(program, definition, validateInference, createInferenceWorker) });
  } else if (kind === 'partition') {
    check(input.length === count, 'hierarchy input cardinality includes root');
    program = canvas().createData({ id: 'rows', keyField: 'key', values: input }).createHierarchyData({ id: 'hierarchy', key: 'key', parent: 'parent', value: 'value' });
    const layout = () => program.layoutHierarchy({ id: 'layout', method: 'partition' });
    const validateLayout = value => {
      const nodes = value.semanticSpec.resources.find(r => r.kind === 'layout' && r.id === 'layout').result.nodes;
      check(nodes.length === count, 'all partition nodes retained'); close(nodes[0].u0, 0); close(nodes[0].u1, 1); close(nodes[0].totalValue, count - 1);
      nodes.slice(1).forEach((node, i) => { close(node.u0, i / (count - 1)); close(node.u1, (i + 1) / (count - 1)); check(node.depth === 1, 'leaf depth'); });
      return { count: nodes.length, rootInterval: [nodes[0].u0, nodes[0].u1], firstLeaf: [nodes[1].u0, nodes[1].u1], lastLeaf: [nodes.at(-1).u0, nodes.at(-1).u1] };
    };
    const laidOut = layout(); witness = validateLayout(laidOut);
    stages.push({ name: 'normalized-layout', prepare: () => ({ run() { const r = time(layout); return { metrics: { kernelMs: r.elapsed }, program: r.value }; }, validate: r => validateLayout(r.program) }) });
    stages.push({ name: 'gesture-preview', prepare: () => {
      const from = laidOut.createPartitionPlot({ id: 'partition', labels: false, cells: { strokeWidth: 0 } }), to = from.editCanvas({ width: 600 });
      return samplingStage(from, to, 'gesturePreviewMs', frame => {
        const nodes = frame.scene.nodes.filter(node => node.properties.fill === '#3b82f6');
        check(nodes.length === count && frame.decisions.filter(d => d.kernel === 'partition').length === count, 'complete typed partition frame');
        nodes.forEach((node, i) => {
          const x = i === 0 ? 20 : 20 + 460 * (i - 1) / (count - 1), y = i === 0 ? 20 : 200, width = i === 0 ? 460 : 460 / (count - 1);
          const expected = [[x,y],[x+width,y],[x+width,y+180],[x,y+180]], commands = node.properties.commands;
          check(commands.length === 5 && commands[4].op === 'Z', 'closed native partition cell');
          expected.forEach(([ex,ey],j) => { close(commands[j].x,ex); close(commands[j].y,ey); });
        });
        return { count: nodes.length, rootWidth: 460, leafWidth: 460 / (count - 1) };
      }, count >= 10000 ? { ...sampleOptions, maxEndpointNodes: 2 * (count + 1), maxOutputNodes: count + 1 } : sampleOptions)();
    } });
  } else {
    check(input.features[0].geometry.coordinates.length === count, 'all source vertices');
    program = canvas().createGeometryData({ id: 'world', format: 'geojson', coordinateKind: 'geographic', featureKey: 'id', values: input })
      .createProjection({ id: 'projection', type: 'equirectangular', scalePx: 100, translatePx: [200, 200], precisionPx: 0.5 })
      .createCoordinate({ type: 'geo' }).createGeoLineMark({ id: 'coast', stroke: '#2563eb', strokeWidth: 2,
        capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 } });
    const checkGeo = (value, scale) => {
      const nodes = (value.scene ?? scene(value)).nodes.filter(node => node.type === 'path');
      check(nodes.length === 1, 'one nonempty line part');
      const commands = nodes[0].properties.commands;
      check(commands.length >= count, 'no source vertex may be omitted from this unclipped fixture');
      commands.forEach((command, i) => check(command.op === (i === 0 ? 'M' : 'L') && Number.isFinite(command.x) && Number.isFinite(command.y), 'finite native line command'));
      let cursor = 0;
      for (const [longitude, latitude] of input.features[0].geometry.coordinates) {
        const x = 200 + scale * longitude * Math.PI / 180, y = 200 - scale * latitude * Math.PI / 180;
        while (cursor < commands.length && (Math.abs(commands[cursor].x-x) > 1e-7 || Math.abs(commands[cursor].y-y) > 1e-7)) cursor++;
        check(cursor < commands.length, 'every raw projected vertex must occur in order'); cursor++;
      }
      return { vertices: count, commands: commands.length, first: commands[0], last: commands.at(-1) };
    };
    witness = checkGeo(program, 100);
    stages.push({ name: 'camera-preview', prepare: () => samplingStage(program, program.editProjection({ scalePx: 200 }), 'cameraPreviewMs', frame => {
      check(frame.decisions.some(value => value.kernel === 'native-geo'), 'native geographic projection kernel'); return checkGeo(frame, Math.sqrt(20000));
    }, { ...sampleOptions, formatVersion: 5 })() });
    const coordinates = input.features[0].geometry.coordinates, indices = [0, Math.floor((count - 1) / 2), count - 2];
    stages.push({ name: 'css-hit', prepare: hitStage(program, indices.map(i => [200 + 50 * (coordinates[i][0] + coordinates[i+1][0]) * Math.PI / 180, 200 - 50 * (coordinates[i][1] + coordinates[i+1][1]) * Math.PI / 180]), 'coast', undefined, { maxWork: 128000000,
      pathGeometry: { maxParts: 400000, maxWork: 2000000, maxIndexWork: 16000000 } }) });
  }
  check(JSON.stringify(input) === original, 'caller input unchanged');
  return { stages, witness, assertImmutable() { check(JSON.stringify(input) === original, 'caller input changed'); } };
}

export async function benchmarkWorkload(kind, count, ratio, measured = 30, warmups = 5) {
  check(workloadSizes[kind]?.includes(count), 'only original size classes may be measured');
  check(Number.isSafeInteger(measured) && measured > 0 && Number.isSafeInteger(warmups) && warmups >= 0, 'iteration counts');
  const input = nativeWorkloadInput(kind, count), inputHash = await digest(input), start = performance.now();
  const requiredStages = {points:['css-hit','full-frame'],partition:['normalized-layout','gesture-preview'],geo:['camera-preview','css-hit'],data:['editable-load','source-revise'],inference: count === 10000 ? ['exact-inference','large-worker'] : ['exact-inference']}[kind];
  const report = { kind, count, ratio, inputHash, requiredStages, status: 'measured', stages: [], sourcePreparationMs: 0 };
  const failure = (error, stage) => ({ name: stage, status: isNativeLimit(error) ? 'explicit-limit' : 'failed', successSLO: isNativeLimit(error) ? 'unsupported-not-success' : 'failed-this-fixture', warmups: 0, measured: 0, error: { name: error.name, message: error.message } });
  let fixture;
  try { fixture = prepareNativeWorkload(kind, count, input); } catch (error) { report.preparationFailure = failure(error, 'native-input-and-geometry-preparation'); report.status = report.preparationFailure.status;
    report.stages = requiredStages.map(name => ({...report.preparationFailure, name, blockedBy:'native-input-and-geometry-preparation'})); }
  report.sourcePreparationMs = performance.now() - start;
  if (fixture) {
    report.witness = fixture.witness;
    for (const stage of fixture.stages) {
      let prepared;
      try {
        const preparation = time(stage.prepare); prepared = preparation.value;
        const first = await prepared.run(), witness = prepared.validate(first);
        const output = first.output ?? first.frame?.scene ?? (first.program ? first.program.semanticSpec : first.hit);
        const outputHash = await digest(output);
        // Exercise all three distinct CSS queries before timing; no hit is inferred from an endpoint screenshot.
        if (stage.name === 'css-hit') for (let i = 0; i < 2; i++) prepared.validate(await prepared.run());
        for (let i = 0; i < warmups; i++) prepared.validate(await prepared.run());
        const samples = [];
        const diagnostics = [];
        for (let i = 0; i < measured; i++) { const value = await prepared.run(); prepared.validate(value); samples.push(value.metrics); if (value.diagnostics) diagnostics.push(value.diagnostics); }
        const p50 = {}, p95 = {}, thresholds = {}, tier = workloadSizes[kind].indexOf(count);
        for (const key of Object.keys(samples[0])) { p50[key] = percentile(samples.map(s => s[key]), .5); p95[key] = percentile(samples.map(s => s[key]), .95); thresholds[key] = workloadThresholds[kind][key][tier]; }
        report.stages.push({ name: stage.name, status: 'measured', preparationMs: preparation.elapsed, warmups, measured, samples, p50, p95, thresholds, witness, outputHash, witnessHash: await digest(witness), ...(diagnostics.length ? { diagnostics } : {}), successSLO: Object.values(thresholds).some(value => value === null) ? (kind === 'inference' && count === 10000 ? 'synchronous-not-worker-qualified' : 'no-size-slo-specified') : Object.keys(p95).every(key => p95[key] <= thresholds[key]) ? 'passed-this-fixture' : 'failed-this-fixture' });
      } catch (error) { report.stages.push(failure(error, stage.name)); report.status = report.stages.at(-1).status; }
      finally { prepared?.dispose?.(); fixture.assertImmutable(); }
    }
  }
  check(await digest(input) === inputHash, 'full input hash must remain unchanged');
  return report;
}
if (typeof document !== 'undefined') { globalThis.nativeWorkloads = { benchmarkWorkload, sizes: workloadSizes }; document.querySelector('#status').textContent = 'Ready'; }
