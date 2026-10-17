import assert from "node:assert/strict";
import test from "node:test";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { namespaceGraphicId, resolveGraphicItemCapacity } from "../../../src/selectors/graphicCapacity.js";

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
