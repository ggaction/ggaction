import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";

const geometry = { type: "Feature", id: "place", properties: { name: "Place" }, geometry: { type: "Point", coordinates: [80, 90] } };
const make = () => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: geometry })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoPointMark({ id: "places", geometry: "places", radiusPx: 8 })
  .selectMarks({ id: "picked", target: "places", items: [] });
const move = payload => ({ type: "setViewport", target: "map", payload });
const circle = state => state.scene.nodes.find(node => node.type === "circle").properties;

test("viewport commands apply literal native projection coordinates and preserve feature selections", () => {
  const p = make(), original = serializeProgram(p), key = getMarkItems(p, { target: "places" })[0].key;
  const selected = p.editMarkSelection({ selection: "picked", items: [key] }).highlightMarks({ selection: "picked", color: "gold", dimOthers: false, bringToFront: false });
  const s = createInteractionSession({ program: selected, bindings: [] }), events = [];
  s.subscribe(event => events.push(event));
  const initial = s.getState();
  s.dispatch({ ...move({ scalePx: 2, translatePx: [10, -20] }), transactionId: "pan-zoom" });
  const q = s.getState().program;
  assert.deepEqual([circle(s.getState()).x, circle(s.getState()).y], [170, 160]);
  assert.deepEqual(q.graphicSpec, selected.editProjection({ target: "map", scalePx: 2, translatePx: [10, -20] }).graphicSpec);
  assert.equal(q.semanticSpec.resources.find(r => r.kind === "geometry"), selected.semanticSpec.resources.find(r => r.kind === "geometry"));
  assert.equal(q.semanticSpec.resources.find(r => r.kind === "projection").revision, 1);
  assert.deepEqual(events.map(event => [event.type, event.phase, event.revision]), [["setViewport", "commit", 1], ["setViewport", "settled", 1]]);
  assert.deepEqual(events[0].selectionChanges, []);
  assert.equal(getMarkItems(deserializeProgram(serializeProgram(q)), { target: "places" })[0].properties.fill, "gold");
  assert.deepEqual(s.dispatch({ type: "frame", scene: initial.scene, generation: initial.generation, version: 100 }), { status: "stale" });
  s.dispatch({ type: "inspect", point: { x: 170, y: 160 }, slop: 0 }); assert.equal(s.getState().hit.target.itemKey, key);
  assert.equal(serializeProgram(p), original); s.destroy();
});

test("viewport transform detaches fitted geometry while angular edits retain native fitting", () => {
  const p = make().editProjection({ target: "map", fit: { geometry: "places", width: 400, height: 300, pointScale: 2 } });
  const s = createInteractionSession({ program: p, bindings: [] });
  const previous = p.semanticSpec.resources.find(r => r.kind === "projection");
  assert.equal(previous.inputs.length, 1);
  s.dispatch(move({ translatePx: [0, 0] }));
  const current = s.getState().program.semanticSpec.resources.find(r => r.kind === "projection");
  assert.deepEqual(current.inputs, []); assert.equal(current.options.scalePx, previous.result.scalePx);
  assert.equal(current.options.fit, undefined); s.destroy();
  const globe = chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createGeometryData({ id: "places", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: { ...geometry, geometry: { type: "Point", coordinates: [1, 0] } } })
    .createProjection({ id: "map", type: "equirectangular", scalePx: 180 / Math.PI, translatePx: [100, 100] })
    .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "places", geometry: "places" });
  const g = createInteractionSession({ program: globe, bindings: [] });
  assert.ok(Math.abs(circle(g.getState()).x - 101) < 1e-10);
  g.dispatch(move({ centerDeg: [1, 0] })); assert.ok(Math.abs(circle(g.getState()).x - 100) < 1e-10);
  g.dispatch(move({ rotateDeg: [1, 0] })); assert.ok(Math.abs(circle(g.getState()).x - 101) < 1e-10);
  const fitted = globe.editProjection({ target: "map", fit: { geometry: "places", width: 400, height: 300, pointScale: 2 } });
  g.updateProgram(fitted); g.dispatch(move({ centerDeg: [2, 0] }));
  const fittedResource = g.getState().program.semanticSpec.resources.find(r => r.kind === "projection");
  assert.deepEqual(fittedResource.inputs, [{ kind: "geometry", id: "places", revision: 0 }]);
  assert.deepEqual(fittedResource.options.fit, fitted.semanticSpec.resources.find(r => r.kind === "projection").options.fit);
  assert.deepEqual(g.getState().program.graphicSpec, fitted.editProjection({ target: "map", centerDeg: [2, 0] }).graphicSpec);
  g.destroy();
});

test("scoped projection edits preserve siblings and reject every invalid patch atomically", () => {
  const child = make(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const s = createInteractionSession({ program: p, bindings: [] });
  s.dispatch({ ...move({ translatePx: [10, 20] }), target: { childPath: ["left"], id: "map" } });
  assert.equal(s.getState().program.children.right, child);
  assert.deepEqual(s.getState().program.children.left.graphicSpec, child.editProjection({ target: "map", translatePx: [10, 20] }).graphicSpec);
  const before = s.getState(), bytes = serializeProgram(before.program); let calls = 0;
  for (const payload of [{}, { scalePx: 0 }, { scalePx: Infinity }, { translatePx: [1] }, { centerDeg: [0, 0] },
    { rotateDeg: [0, 0] }, { type: "mercator" }, { fit: { width: 400, height: 300 } }, { zoom: 2 }, { get scalePx() { calls++; return 2; } }]) {
    assert.throws(() => s.dispatch({ ...move(payload), target: { childPath: ["left"], id: "map" } }));
  }
  assert.throws(() => s.dispatch({ ...move({ scalePx: 2 }), target: { childPath: ["left"], id: "places" } }));
  assert.equal(calls, 0); assert.equal(s.getState().program, before.program); assert.equal(s.getState().revision, before.revision);
  assert.equal(serializeProgram(before.program), bytes); s.destroy();
  const b = createInteractionSession({ program: basic().createCanvas(), bindings: [] });
  assert.throws(() => b.dispatch(move({ scalePx: 2 })), /editProjection/); b.destroy();
});
