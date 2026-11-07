import assert from "node:assert/strict";
import test from "node:test";
import { createEdgeRouteComparison, reviseEdgeRouteComparison } from "../../../examples/edge-routes/comparison.js";
import { routeMethods } from "../../../examples/edge-routes/data.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
const points = p => getMarkItems(p.children.analysis, { target: "values" });
const edges = p => getMarkItems(p.children.routes, { target: "routesPlot" }).filter(item => item.fields.kind === "edge");
const labels = p => p.children.analysis.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text);
const ticks = p => p.children.analysis.graphicSpec.objects.xAxisTicks.items.map(item => item.properties.x1);

for (const method of routeMethods) test(`${method} pairs original edge values with isolated encodings, scale and guides through explicit revision`, () => {
  const p = createEdgeRouteComparison(method), before = serializeProgram(p), native = p.children.routes;
  assert.deepEqual(points(p).map(item => item.fields.amount), [8, 3, 5]);
  assert.deepEqual(points(p).map(item => item.properties.x), [280, 130, 190]);
  assert.deepEqual(edges(p).map(item => item.rows.find(row => row.data === "edges").rowKey), points(p).map(item => item.rows[0].rowKey));
  const colored = p.encodeColor({ target: { childPath: ["analysis"], id: "values" }, field: "alternative" });
  assert.deepEqual(labels(colored), ["long", "short"]);
  assert.deepEqual(points(colored).map(item => item.properties.fill), ["#dc2626", "#2563eb", "#dc2626"]);
  const scaled = colored.editScale({ target: { childPath: ["analysis"] }, id: "measure", domain: [0, 20] });
  assert.deepEqual(points(scaled).map(item => item.properties.x), [160, 85, 115]);
  assert.deepEqual(ticks(p), [40, 190, 340]); assert.deepEqual(ticks(scaled), [40, 115, 190]);
  for (const q of [colored, scaled]) {
    assert.equal(q.children.routes, native); assert.equal(q.children.routes.graphicSpec, native.graphicSpec);
    assert.equal(q.children.routes.semanticSpec.resources, native.semanticSpec.resources);
  }
  const revised = reviseEdgeRouteComparison(scaled);
  assert.deepEqual(points(revised).map(item => item.properties.x), [280, 130, 190]);
  for (const id of ["network", "placement", "routes"])
    assert.equal(revised.children.routes.semanticSpec.resources.find(resource => resource.id === id).revision, 1);
  if (method === "hierarchical") for (const id of ["hierarchy", "branches"])
    assert.equal(revised.children.routes.semanticSpec.resources.find(resource => resource.id === id).revision, 0);
  assert.deepEqual(edges(revised).map(item => item.key), edges(p).map(item => item.key));
  assert.deepEqual(edges(revised).map(item => item.rows.find(row => row.data === "revised").revision), [1, 1, 1]);
  assert.deepEqual(points(revised).map(item => item.rows[0].revision), [1, 1, 1]);
  assert.deepEqual(revised.children.routes.graphicSpec.objects.routesPlot.items.map(item => item.properties), native.graphicSpec.objects.routesPlot.items.map(item => item.properties));
  const restored = deserializeProgram(serializeProgram(revised));
  assert.deepEqual(restored.graphicSpec, revised.graphicSpec); assert.deepEqual(edges(restored), edges(revised));
  const values = points(p).map(item => ({ ...item.fields, target: "missing" }));
  assert.doesNotThrow(() => p.children.analysis.reviseData({ source: "edges", id: "candidate", values }));
  assert.throws(() => p.reviseData({ target: [{ childPath: ["analysis"] }, { childPath: ["routes"] }], source: "edges", id: "candidate", values }), /endpoint/);
  assert.equal(serializeProgram(p), before);
});
