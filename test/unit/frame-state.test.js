import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, vconcat } from "../../src/index.js";
import { assertProgramSingleY, collectCartesianFrames } from "../../src/materialization/frameState.js";
import { namespaceGraphicId } from "../../src/selectors/graphicCapacity.js";

const base = () => chart().createCanvas({ width: 400, height: 300, margin: 60 })
  .createData({ id: "rows", values: [{ x: 1, y: 2, group: "a" }, { x: 2, y: 3, group: "b" }] })
  .createScatterPlot({ x: "x", y: "y", guides: false });
const semantic = (p, patch) => ({ ...p, semanticSpec: { ...p.semanticSpec, ...patch }, guideConfigs: p.guideConfigs });

test("collects literal plot bounds, shared endpoints and every conditional branch without mutation", () => {
  const p = base(), saved = JSON.stringify(p);
  const [frame] = collectCartesianFrames(p);
  assert.deepEqual(frame.region, { x: 60, y: 60, width: 280, height: 180 });
  assert.deepEqual(frame.bindings, [{ owner: "scatterPlot.y", scale: '["y"]' }]);
  const layer = p.semanticSpec.layers[0];
  const range = semantic(p, { layers: [{ ...layer, encoding: { ...layer.encoding, y2: layer.encoding.y } }] });
  assert.doesNotThrow(() => assertProgramSingleY(range));
  const conditional = semantic(p, { layers: [{ ...layer, conditionals: { y: {
    conditions: [{ value: layer.encoding.y }], otherwise: { ...layer.encoding.y, scale: "independent" }
  } } }] });
  assert.throws(() => assertProgramSingleY(conditional), /requires one Y scale/);
  assert.equal(JSON.stringify(p), saved);
});

test("hidden guides retain scale identity while mirrored visible owners are rejected", () => {
  const p = base().createYAxis().createYAxis({ id: "right", position: "right" });
  assert.throws(() => assertProgramSingleY(p), /one visible Y guide/);
  const hidden = p.editYAxis({ target: "right", visible: false });
  assert.doesNotThrow(() => assertProgramSingleY(hidden));
  const wrong = semantic(hidden, { guides: { ...hidden.semanticSpec.guides, axis: {
    ...hidden.semanticSpec.guides.axis, right: { ...hidden.semanticSpec.guides.axis.right, scale: "other" }
  } } });
  assert.throws(() => assertProgramSingleY(wrong), /requires one Y scale/);
});

test("accepts separated nested panels with local scale identities and rejects concrete overlap", () => {
  const leaf = base();
  const row = hconcat({ id: "row", programs: [{ id: "a", program: leaf }, { id: "b", program: leaf }] });
  const grid = vconcat({ id: "grid", programs: [{ id: "top", program: row }, { id: "bottom", program: leaf }] });
  for (const p of [row, grid]) {
    assert.doesNotThrow(() => assertProgramSingleY(p));
    assert.doesNotThrow(() => assertProgramSingleY(p, { materialized: true }));
  }
  const id = namespaceGraphicId("row-b", "canvas");
  const bad = { ...row, graphicSpec: { ...row.graphicSpec, objects: { ...row.graphicSpec.objects,
    [id]: { ...row.graphicSpec.objects[id], properties: { ...row.graphicSpec.objects[id].properties, x: 0, y: 0 } }
  } } };
  assert.throws(() => assertProgramSingleY(bad, { materialized: true }), /overlaps an independent/);
  assert.doesNotThrow(() => assertProgramSingleY(bad));
  assert.equal(new Set(collectCartesianFrames(grid).map(frame => frame.id)).size, 3);
});

test("facet templates are not counted as additional overlapping frames", () => {
  const p = base().facet({ field: "group" });
  assert.equal(collectCartesianFrames(p).length, 2);
  assert.doesNotThrow(() => assertProgramSingleY(p, { materialized: true }));
});

test("rejects missing identities and malformed composition while ignoring non-Cartesian geometry", () => {
  const p = base(), layer = p.semanticSpec.layers[0];
  assert.throws(() => collectCartesianFrames(semantic(p, { layers: [{ ...layer, coordinate: undefined }] })), /requires a coordinate/);
  assert.throws(() => collectCartesianFrames(semantic(p, { layers: [{ ...layer, coordinate: "missing" }] })), /Unknown coordinate/);
  const polar = semantic(p, { coordinates: [{ id: "main", type: "polar" }] });
  assert.deepEqual(collectCartesianFrames(polar), []);
  assert.deepEqual(collectCartesianFrames(chart()), []);
  const noCanvas = { ...p, graphicSpec: { objects: {}, order: [] }, materializationConfigs: {}, guideConfigs: {} };
  assert.deepEqual(collectCartesianFrames(noCanvas)[0].region, { x: 0, y: 0, width: 0, height: 0 });
  const cyclic = { compositionSpec: { id: "bad", children: ["self"] }, children: {} };
  cyclic.children.self = cyclic;
  assert.throws(() => collectCartesianFrames(cyclic), /cycle/);
  assert.throws(() => collectCartesianFrames({ ...cyclic, children: {} }), /is missing/);
});

test("resolves a unique standalone guide coordinate and rejects ambiguous or incomplete snapshots", () => {
  const p = base().createYAxis();
  const guide = semantic(p, { layers: [], guides: { axis: { y: { scale: "y" } } } });
  assert.doesNotThrow(() => assertProgramSingleY(guide));
  const ambiguous = semantic(guide, { coordinates: [...guide.semanticSpec.coordinates, { id: "second", type: "cartesian" }] });
  assert.throws(() => assertProgramSingleY(ambiguous), /explicit Cartesian coordinate/);
  const other = semantic(p, { coordinates: [{ id: "main", type: "polar" }] });
  assert.deepEqual(collectCartesianFrames(other), []);
  const noScale = semantic(p, { layers: [], guides: { axis: { y: {} } } });
  assert.deepEqual(collectCartesianFrames(noScale), []);
  const pair = hconcat({ id: "pair", programs: [{ id: "a", program: p }, { id: "b", program: p }] });
  const bad = { ...pair, graphicSpec: { objects: {}, order: [] } };
  assert.throws(() => assertProgramSingleY(bad, { materialized: true }), /requires Canvas/);
  const layers = p.semanticSpec.layers.map(layer => ({ ...layer, encoding: { ...layer.encoding, y2: { datum: 0 } } }));
  assert.doesNotThrow(() => assertProgramSingleY(semantic(p, { layers })));
});
