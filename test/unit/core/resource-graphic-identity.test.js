import test from "node:test";
import assert from "node:assert/strict";
import { validateGraphicIdentity, namespaceItemKey } from "../../../src/grammar/schemas/graphicIdentity.js";
import { resolveGraphicLineage } from "../../../src/selectors/resources.js";

const identity = { key: JSON.stringify([[], "logo", "item", ["resource", "logo"]]), topology: "", role: "body",
  lineage: { kind: "resource", resource: { kind: "image", id: "asset", revision: 1 } } };
test("resource graphics preserve stable owner keys with exact live resource lineage", () => {
  assert.equal(validateGraphicIdentity(identity), identity);
  const resource = { kind: "image", id: "asset", revision: 1 };
  assert.equal(resolveGraphicLineage({ semanticSpec: { resources: [resource] } }, identity), resource);
  assert.throws(() => resolveGraphicLineage({ semanticSpec: { resources: [{ ...resource, revision: 2 }] } }, identity), /stale/);
  const child = { semanticSpec: { resources: [resource] } }, parent = { compositionSpec: { id: "row", children: ["left"] }, children: { left: child } };
  assert.equal(resolveGraphicLineage(parent, { ...identity, key: namespaceItemKey(identity.key, "row-left") }), resource);
  for (const kind of ["image", "hierarchy", "layout"]) assert.doesNotThrow(() => validateGraphicIdentity({ ...identity, lineage: { kind: "resource", resource: { ...resource, kind } } }));
});
test("resource graphics reject forged lineage fields and keep the existing dataset union exact", () => {
  for (const lineage of [{ ...identity.lineage, data: "fake" }, { kind: "resource" },
    { kind: "resource", resource: { kind: "parameter", id: "asset", revision: 1 } },
    { kind: "resource", resource: { kind: "image", id: "asset", revision: -1 } },
    { data: "data", logicalDataId: "logical", revision: 0, rowKeys: [], kind: "dataset" }]) {
    assert.throws(() => validateGraphicIdentity({ ...identity, lineage }));
  }
  assert.doesNotThrow(() => validateGraphicIdentity({ ...identity, lineage: { data: "data", logicalDataId: "logical", revision: 0, rowKeys: [] } }));
});
