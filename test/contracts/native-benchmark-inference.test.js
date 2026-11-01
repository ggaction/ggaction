import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedGridNeighbors } from '../oracles/inference-grid.js';
import { nativeWorkloadInput, prepareNativeWorkload, workloadSizes, workloadThresholds, benchmarkWorkload } from '../../scripts/benchmarks/workloads.browser.js';

// Deliberately exhaustive, unlike the shell oracle and the product kd-tree.
function allPairs(rows, k) {
  return rows.map((row, sourceIndex) => ({ ...row, sourceIndex })).sort((a, b) => a.id - b.id).flatMap(source =>
    rows.map((target, targetIndex) => ({ id: target.id, sourceIndex: source.sourceIndex, targetIndex,
      weight: Math.abs(source.x - target.x) + Math.abs(source.y - target.y) }))
      .filter(target => target.id !== source.id).sort((a, b) => a.weight - b.weight || a.id - b.id)
      .slice(0, k).sort((a, b) => a.id - b.id).map(({ id: _, ...edge }) => edge));
}

test('inference benchmark shell oracle is anchored by literal ties and exhaustive independent distances', () => {
  const rows = nativeWorkloadInput('inference', 16);
  assert.deepEqual(expectedGridNeighbors(rows, 3).slice(0, 3), [
    { sourceIndex: 15, targetIndex: 14, weight: 1 },
    { sourceIndex: 15, targetIndex: 13, weight: 2 },
    { sourceIndex: 15, targetIndex: 11, weight: 1 }
  ]);
  for (const count of [11, 16, 31, 100, 1000]) {
    const input = nativeWorkloadInput('inference', count);
    assert.deepEqual(expectedGridNeighbors(input), allPairs(input, 10));
    assert.deepEqual(expectedGridNeighbors(input.slice().reverse()), allPairs(input.slice().reverse(), 10));
  }
});

test('inference benchmark preserves all original fixed nodes and k10 edges without invented small or sync-large SLOs', () => {
  assert.deepEqual(workloadSizes.inference, [100, 1000, 10000]);
  assert.deepEqual(workloadThresholds.inference, { inferenceMs: [null, 1000, null], workerMs: [null, null, 10000] });
  for (const count of workloadSizes.inference) {
    const rows = nativeWorkloadInput('inference', count), expected = expectedGridNeighbors(rows);
    assert.equal(rows.length, count); assert.equal(expected.length, count * 10);
    assert.equal(new Set(rows.map(row => row.id)).size, count);
    assert.equal(new Set(expected.map(edge => edge.sourceIndex)).size, count);
    for (let offset = 0; offset < expected.length; offset += 10) {
      const group = expected.slice(offset, offset + 10);
      assert.equal(new Set(group.map(edge => edge.targetIndex)).size, 10);
      assert.ok(group.every(edge => edge.sourceIndex === group[0].sourceIndex && edge.sourceIndex !== edge.targetIndex && edge.weight > 0));
    }
  }
  for (const invalid of [rows => rows.slice(0, -1), rows => rows.map((row, i) => i ? row : { ...row, x: row.x + 1 }),
    rows => rows.map((row, i) => i ? row : { ...rows[1] })]) {
    assert.throws(() => expectedGridNeighbors(invalid(nativeWorkloadInput('inference', 100))), /every original/);
  }
});

test('inference public benchmark validates every pair, typed ordering, direction and original row provenance', () => {
  const fixture = prepareNativeWorkload('inference', 100), prepared = fixture.stages[0].prepare(), result = prepared.run();
  const witness = prepared.validate(result);
  assert.equal(witness.nodes, 100); assert.equal(witness.edges, 1000); assert.equal(witness.k, 10);
  assert.ok(result.metrics.inferenceMs >= 0);
  const resource = result.program.semanticSpec.resources.find(value => value.id === 'neighbors');
  for (const mutate of [r => r.result.model.nodes.pop(), r => r.result.model.edges.pop(),
    r => { r.result.model.edges[0].weight += 1; }, r => { r.result.model.edges[0].directed = false; },
    r => { r.result.model.edges[0].sourceRows.reverse(); }, r => { r.result.model.edges.reverse(); },
    r => { r.result.model.edges[0].sourceKey = r.result.model.edges[0].targetKey; },
    r => { r.inputs[0].revision += 1; }, r => { r.inputs[0].logicalId = 'unrelated'; },
    r => { r.provenance.sourceRows[0].rowKey = 'forged'; }, r => { r.result.diagnostics.preparation.sourceIndices[0] = 1; }]) {
    const changed = structuredClone(resource); mutate(changed);
    const program = { graphicSpec: result.program.graphicSpec, semanticSpec: { resources: [changed] } };
    assert.throws(() => prepared.validate({ ...result, program }), /Workload assertion/);
  }
  fixture.assertImmutable();
});

test('inference large diagnostic keeps the full input, explicit edge budget and absent public worker distinct', async () => {
  const report = await benchmarkWorkload('inference', 10000, 1, 1, 0);
  assert.deepEqual(report.requiredStages, ['exact-inference', 'large-worker']);
  assert.equal(report.witness.nodes, 10000); assert.equal(report.witness.expectedEdges, 100000);
  assert.equal(report.stages[0].status, 'explicit-limit');
  assert.match(report.stages[0].error.message, /Graph neighbor edges must not exceed 10000/);
  assert.equal(report.stages[0].successSLO, 'unsupported-not-success');
  assert.equal(report.stages[1].status, 'required-worker-unavailable');
  assert.equal(report.stages[1].successSLO, 'unsupported-not-success');
  assert.deepEqual(report.stages[1].thresholds, { workerMs: 10000 });
  assert.equal(report.stages[1].measured, 0);
});
