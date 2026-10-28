import assert from "node:assert/strict";
import test from "node:test";
import { withoutAllocatedIdentity } from "../../support/identity-equivalence.js";

function state(namespace) {
  return { datasets: [{ id: "rows", values: [{ x: 1 }], logicalId: namespace, revision: 0,
    keySpec: { mode: "generated" }, rowKeys: [JSON.stringify(["generated", namespace, 0])] }],
  provenance: [{ data: "rows", logicalDataId: namespace, revision: 0, role: "hierarchy", rowKey: JSON.stringify(["generated", namespace, 0]) }] };
}
test("meaning comparison normalizes proven allocated row references without hiding stale lineage", () => {
  const a = state("a"), b = state("b");
  assert.deepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(b));
  for (const patch of [{ revision: 1 }, { logicalDataId: "orphan" }, { rowKey: "missing" }, { data: "absent" }]) {
    const invalid = state("b"); Object.assign(invalid.provenance[0], patch);
    assert.notDeepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(invalid));
  }
  const wrongRow = state("b"); wrongRow.datasets[0].values.push({ x: 2 }); wrongRow.datasets[0].rowKeys.push('["generated","b",1]');
  wrongRow.provenance[0].rowKey = wrongRow.datasets[0].rowKeys[1];
  const corresponding = state("a"); corresponding.datasets[0].values.push({ x: 2 }); corresponding.datasets[0].rowKeys.push('["generated","a",1]');
  assert.notDeepEqual(withoutAllocatedIdentity(corresponding), withoutAllocatedIdentity(wrongRow));
});
