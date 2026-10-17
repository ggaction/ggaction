import assert from "node:assert/strict";
import test from "node:test";
import {
  datasetTransformOutputRoles,
  normalizeDatasetTransformEdit,
  requestedDatasetTransform
} from "../../../../src/grammar/transforms.js";

test("regression statistics exposes fixed output roles and independent role records", () => {
  const transform=Object.freeze({type:"regressionStatistics"});
  const roles=datasetTransformOutputRoles(transform);
  assert.deepEqual(roles,{count:"count",intercept:"intercept",slope:"slope",rSquared:"rSquared"});
  roles.count="modified";
  assert.equal(datasetTransformOutputRoles(transform).count,"count");
  assert.deepEqual(transform,{type:"regressionStatistics"});
});

test("regression statistics generic editing retains its closed transform and rejects aliases", () => {
  const transform=Object.freeze({type:"regressionStatistics"});
  const patch=Object.freeze({});
  assert.deepEqual(normalizeDatasetTransformEdit(transform,patch),transform);
  assert.deepEqual(requestedDatasetTransform(transform),transform);
  for(const invalid of [{as:{count:"n"}},{source:"raw"},{type:"linear"}]) {
    const snapshot=JSON.stringify(invalid);
    assert.throws(()=>normalizeDatasetTransformEdit(transform,invalid),/Unknown|statistics/i);
    assert.equal(JSON.stringify(invalid),snapshot);
    assert.deepEqual(transform,{type:"regressionStatistics"});
  }
});
