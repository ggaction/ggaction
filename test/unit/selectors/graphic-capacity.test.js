import assert from "node:assert/strict";
import test from "node:test";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { namespaceGraphicId, resolveGraphicItemCapacity, resolveGraphicGeoBinding } from "../../../src/selectors/graphicCapacity.js";

function pointProgram(id, count) {
  return {
    semanticSpec: {
      datasets: [{ id: "raw", values: Array.from({ length: count }, (_, x) => ({ x })) }],
      layers: [{ id, data: "raw", mark: { type: "point" } }]
    },
    graphicSpec: { objects: { [id]: { type: "circle" } } }
  };
}

test("composed point capacities resolve the matching raw owner and reject ambiguous ownership", () => {
  const id = namespaceGraphicId("layout-cell", "points");
  const child = pointProgram("points", 3);
  const parent = pointProgram(id, 2);
  parent.compositionSpec = { id: "layout", children: ["cell"] };
  parent.children = { cell: child };
  const before = structuredClone(parent);
  assert.throws(() => resolveGraphicItemCapacity(parent, { id, label: "Point samples" }), error => {
    assert.match(error.message, /ownership is ambiguous/);
    assert.deepEqual(getErrorDetails(error), {
      code: "ambiguous-resource", resourceId: id, candidates: [id, "points"]
    });
    return true;
  });
  assert.deepEqual(parent, before);
  const unambiguous = { ...parent, semanticSpec: { datasets: [], layers: [] } };
  assert.deepEqual(resolveGraphicItemCapacity(unambiguous, { id, label: "Point samples" }), {
    pointOwned: true, rawCount: 3, graphicType: "circle", label: "Point samples"
  });
  assert.equal(namespaceGraphicId("😀", "points"), "g01f600_points");
});


test("retained point capacity comes from the exact child rather than parent configuration", () => {
  const id = namespaceGraphicId("layout-cell", "points");
  const child = pointProgram("points", 3);
  child.markConfigs = { points: { maxItems: 3 } };
  const parent = { semanticSpec: { datasets: [], layers: [] },
    graphicSpec: { objects: { [id]: { type: "circle" } } },
    compositionSpec: { id: "layout", children: ["cell"] }, children: { cell: child },
    markConfigs: { [id]: { maxItems: 100000 } } };
  assert.deepEqual(resolveGraphicItemCapacity(parent, { id, label: "Point samples" }), {
    pointOwned: true, rawCount: 3, maxItems: 3, graphicType: "circle", label: "Point samples"
  });
});


test("geographic declarations resolve exact scoped owners and reject ambiguous ownership", () => {
  const local = "coast", id = namespaceGraphicId("layout-cell", local), binding = { mode: "line", capacity: { maxProjectedPoints: 4, maxPathCommands: 4 } };
  const child = { semanticSpec: { layers: [{ id: local, mark: { type: "geo" }, geoBinding: binding }] }, graphicSpec: { objects: { [local]: {} } } };
  const parent = { semanticSpec: { layers: [] }, compositionSpec: { id: "layout", children: ["cell", "absent"] }, children: { cell: child } };
  assert.equal(resolveGraphicGeoBinding(parent, id), binding);
  assert.equal(resolveGraphicGeoBinding(parent, "other"), undefined);
  parent.semanticSpec.layers.push({ id, mark: { type: "geo" }, geoBinding: binding });
  assert.throws(() => resolveGraphicGeoBinding(parent, id), /ambiguous/);
});
