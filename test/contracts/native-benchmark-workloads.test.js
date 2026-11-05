import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeWorkloadInput, prepareNativeWorkload, workloadSizes, workloadThresholds, isNativeLimit, benchmarkWorkload } from '../../scripts/benchmarks/workloads.browser.js';

for (const kind of ['points', 'partition', 'geo', 'data']) test(`native benchmark ${kind} performs complete public work with independent numeric witnesses`, async () => {
  const input = nativeWorkloadInput(kind, 5), original = JSON.stringify(input), fixture = prepareNativeWorkload(kind, 5, input);
  assert.equal(fixture.stages.length, 2);
  for (const stage of fixture.stages) {
    const prepared = stage.prepare();
    try {
      for (let i = 0; i < 3; i++) {
        const result = await prepared.run(), witness = prepared.validate(result);
        assert.ok(Object.values(result.metrics).every(value => Number.isFinite(value) && value >= 0));
        assert.ok(witness.count === 5 || witness.vertices === 5 || witness.queries === 3);
        // The sliced load reports its longest host-turn interval; revise is still one synchronous call.
        if (kind === 'data' && stage.name === 'editable-load') assert.ok(result.metrics.blockingSliceMs <= result.metrics.loadMs);
        if (kind === 'data' && stage.name === 'source-revise') assert.equal(result.metrics.blockingSliceMs, result.metrics.reviseMs);
      }
    } finally { prepared.dispose?.(); }
  }
  fixture.assertImmutable(); assert.equal(JSON.stringify(input), original);
});

test('native benchmark preserves every required size and SLO including unsupported cells', () => {
  assert.deepEqual(workloadSizes, { points: [1000,10000,100000], partition: [100,1000,10000], geo: [1000,10000,100000], data: [1000,10000,100000], inference: [100,1000,10000] });
  assert.deepEqual(workloadThresholds.points, {hitMs:[8,12,20],fullFrameSampleMs:[16.7,33,50]});
  assert.deepEqual(workloadThresholds.partition,{kernelMs:[10,50,300],gesturePreviewMs:[33,33,33]});
  assert.deepEqual(workloadThresholds.geo,{cameraPreviewMs:[16.7,33,50],hitMs:[20,20,20]});
  assert.deepEqual(workloadThresholds.data,{loadMs:[100,500,3000],reviseMs:[100,500,3000],blockingSliceMs:[50,50,50]});
  for(const [kind,sizes] of Object.entries(workloadSizes)) for(const size of sizes) {
    const input=nativeWorkloadInput(kind,size);
    assert.equal(kind==='geo'?input.features[0].geometry.coordinates.length:input.length,size);
  }
});

test('native benchmark rejects omitted data and distinguishes native bounds from failures', async () => {
  for(const kind of Object.keys(workloadSizes)) {
    assert.throws(()=>nativeWorkloadInput(kind,0),/fixture size/);
    const wrong=nativeWorkloadInput(kind,4);
    assert.throws(()=>prepareNativeWorkload(kind,5,wrong),/cardinality|vertices/);
    await assert.rejects(benchmarkWorkload(kind,5,1,1,0),/original size classes/);
  }
  assert.equal(isNativeLimit(new RangeError('Animation nodes must not exceed 10000.')),true);
  assert.equal(isNativeLimit(new RangeError('Hit index exceeds its work budget.')),true);
  assert.equal(isNativeLimit(new RangeError('Hit program exceeds its item budget.')),true);
  assert.equal(isNativeLimit(new Error('Hit program exceeds its item budget.')),false);
  assert.equal(isNativeLimit(new Error('Workload assertion: missing source vertex')),false);
  assert.equal(isNativeLimit(new Error('unexpected limit message must not exceed')),false);
  assert.equal(isNativeLimit(new TypeError('unknown projection type')),false);
});

test('point and geographic oracle reject altered concrete geometry', () => {
  for (const kind of ['points','geo','partition']) {
    const fixture=prepareNativeWorkload(kind,5),stage=fixture.stages.find(s=>/preview|full-frame/.test(s.name)),p=stage.prepare(),result=p.run();
    const corrupted=structuredClone(result);
    const node=corrupted.frame.scene.nodes.find(n=>n.type==='circle'||n.type==='path');
    if(node.type==='circle') node.properties.x+=1; else node.properties.commands[0].x+=1;
    assert.throws(()=>p.validate(corrupted),/Workload assertion/);
    const missing=structuredClone(result);missing.frame.scene.nodes.splice(1,1);
    assert.throws(()=>p.validate(missing),/Workload assertion/);
  }
});
