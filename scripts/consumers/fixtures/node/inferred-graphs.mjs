import assert from "node:assert/strict";
import { chart, hconcat } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { getMarkItems } from "ggaction/inspection";
import { exportAccessibleData } from "ggaction/accessibility";
import { renderToSVG } from "ggaction/svg";

const values = [{ id: "a", x: 0 }, { id: "b", x: 1 }, { id: "c", x: 3 }, { id: "d", x: 10 }];
const graph = (program, id = "network") => program.semanticSpec.resources.find(resource => resource.kind === "graph" && resource.id === id);
export const cases = [{ id: "data/inferred-graph-lifecycle", run() {
  const source = chart().createData({ id: "points", values, keyField: "id" }).createInferredGraphData({
    id: "network", nodeKey: "id", ruleId: "nearest", rule: "knn", features: ["x"], metric: "euclidean", options: { symmetrize: "union", search: { algorithm: "kd-tree" } }
  }).layoutGraph({ id: "placement", method: "circular" }).createCanvas({ width: 320, height: 240 }).createGraphPlot({ labels: {} });
  assert.deepEqual(graph(source).result.model.edges.map(edge => edge.weight), [1, 2, 7]);
  const restored = deserializeProgram(serializeProgram(source));
  assert.equal(renderToSVG(restored), renderToSVG(source));
  const items = getMarkItems(source);
  assert.equal(items.length, 7); assert.ok(items.every(item => item.fields.origin === "inferred" && item.fields.rule === "knn" && item.fields.metric === "euclidean"));
  const accessible = exportAccessibleData(source).views[0];
  assert.equal(accessible.rows.length, 7);
  const filtered = source.filterMarks({ field: "key", op: "oneOf", values: ["a", "b"] });
  assert.equal(graph(filtered), graph(source));
  assert.equal(getMarkItems(filtered).length, 3);
  assert.equal(exportAccessibleData(filtered).views[0].rows.length, 3);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(filtered))), renderToSVG(filtered));
  assert.deepEqual(filtered.removeMarkFilter().graphicSpec, source.graphicSpec);
  const recomputed = source.filterMarks({ recompute: true, field: "key", op: "oneOf", values: ["a", "c", "d"] });
  assert.equal(graph(recomputed).revision, 1);
  assert.deepEqual(graph(recomputed).result.model.edges.map(edge => edge.weight), [3, 7]);
  const reloaded = deserializeProgram(serializeProgram(recomputed));
  assert.equal(renderToSVG(reloaded), renderToSVG(recomputed));
  assert.deepEqual(graph(reloaded.removeMarkFilter()).result.model, graph(source).result.model);
  const reselected = reloaded.filterMarks({ mode: "replace", field: "key", op: "oneOf", values: ["a", "b"] });
  assert.equal(graph(reselected).result.model.nodes.length, 2);
  assert.equal(reselected.semanticSpec.datasets.length, 2);
  assert.ok(accessible.rows.every(row => row.values["graphPlot:origin"] === "inferred" && row.values["graphPlot:rule"] === "knn"));
  const changed = source.reviseData({ source: "points", id: "updated", values: values.map(row => ({ ...row, x: row.x * 2 })) });
  assert.equal(graph(changed).revision, 1); assert.deepEqual(graph(changed).result.model.edges.map(edge => edge.weight), [2, 4, 14]);
  assert.deepEqual(graph(changed).result.model.edges.map(edge => edge.key), graph(source).result.model.edges.map(edge => edge.key));
  const compound = hconcat({ programs: [{ id: "left", program: source }, { id: "right", program: source }] });
  const edited = compound.editInferredGraphData({ target: { childPath: ["left"], id: "network" }, definition: { options: { k: 2 } } });
  assert.equal(graph(edited.children.left).revision, 1); assert.equal(edited.children.right, source);
  const backbone = source.createInferredGraphData({ id: "backbone", data: "points", nodeKey: "id", ruleId: "minimum", rule: "mst", candidateGraph: "network" });
  assert.equal(graph(backbone, "backbone").result.diagnostics.cost, 10);
  for (const method of ["fixed", "force"]) {
    const positions = values.map((row, index) => ({ key: row.id, x: index * 20, y: index * 10 }));
    const laidOut = chart().createData({ id: "points", values, keyField: "id" }).createInferredGraphData({
      id: "network", nodeKey: "id", ruleId: "nearest", rule: "knn", features: ["x"], metric: "euclidean"
    }).layoutGraph({ id: "placement", method, options: method === "fixed" ? { positions }
      : { initialPositions: positions, iterations: 0, pinned: [{ key: "b", fx: 20, fy: 10 }] } });
    const reduced = laidOut.reviseData({ source: "points", id: "reduced", values: [values[0], values[2]] });
    const returning = deserializeProgram(serializeProgram(reduced)).reviseData({ source: "reduced", id: "returned", values });
    const layout = p => p.semanticSpec.resources.find(resource => resource.kind === "layout");
    assert.deepEqual(layout(reduced).options, layout(laidOut).options);
    assert.deepEqual(layout(returning).result, layout(laidOut).result);
  }
  assert.equal(typeof basicChart().createInferredGraphData, "undefined");
  assert.equal(typeof basicChart().editInferredGraphData, "undefined");
} }];
