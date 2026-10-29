import assert from "node:assert/strict";
import test from "node:test";
import { findDataset, findDatasetConsumer, hasDataset, hasDatasetOwner, requireDataset, requireMaterializedDataset, resolveDatasetReference, resolveMaterializedDataset } from "../../../src/selectors/datasets.js";

const table = { id: "rows", values: [{ value: 1 }] };
const pending = { id: "summary", source: "rows", definition: { type: "aggregate" } };
const program = (datasets, currentData) => ({ semanticSpec: { datasets }, materializationConfigs: {}, context: { currentData } });

test("data consumers infer only one materialized dataset and honor explicit or current choices", () => {
  const p = program([table, pending]);
  assert.equal(resolveMaterializedDataset(p), table);
  assert.equal(resolveMaterializedDataset(p, "rows"), table);
  assert.equal(resolveMaterializedDataset(program([table], "rows")), table);
  assert.throws(() => resolveMaterializedDataset(program([pending])), /one materialized dataset/);
  assert.throws(() => resolveMaterializedDataset(program([table, { id: "other", values: [] }])), /explicit/);
  assert.throws(() => resolveMaterializedDataset(p, "summary"), /requires materialized values/);
  assert.throws(() => resolveMaterializedDataset(program([table], "missing")), /does not exist/);
  assert.equal(findDataset(p, "rows"), table);
  assert.equal(findDatasetConsumer(p, "rows"), pending);
  assert.equal(findDatasetConsumer(p, "absent"), undefined);
  assert.equal(hasDataset(p, "rows"), true);
  assert.equal(hasDataset(p, "absent"), false);
  assert.equal(requireDataset(p, "rows"), table);
  assert.throws(() => requireDataset(p, "absent"), /does not exist/);
  assert.equal(requireMaterializedDataset(p, "rows"), table);
});

test("logical data owners resolve their exact current snapshot and reject ambiguous families", () => {
  const p = program([table]);
  assert.equal(hasDatasetOwner(p, "source"), false);
  p.materializationConfigs.data = { source: { source: { current: "rows" }, pending: {} }, empty: null };
  assert.equal(hasDatasetOwner(p, "source"), true);
  assert.equal(resolveDatasetReference(p, "source"), table);
  assert.throws(() => resolveDatasetReference(p, "missing", "Source"), /source dataset/);
  p.materializationConfigs.data.computed = { source: { current: "other" } };
  assert.throws(() => resolveDatasetReference(p, "source"), /logical owner "source" is ambiguous/);
  assert.equal(p.semanticSpec.datasets[0], table);
  assert.deepEqual(table.values, [{ value: 1 }]);
});
