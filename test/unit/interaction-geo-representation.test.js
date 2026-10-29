import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";

const features = (ids, hidden = false) => ({ type: "FeatureCollection", features: ids.map((id, index) => ({
  type: "Feature", id, properties: {}, geometry: hidden ? null : { type: "Point", coordinates: [40 + 60 * index, 60] }
})) });
const base = (zoom = 5) => chart().createCanvas({ width: 240, height: 180, margin: 0 })
  .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: features(["state"]) })
  .createGeometryData({ id: "counties", format: "geojson", coordinateKind: "planar", featureKey: "id", values: features([1, "1"]) })
  .createGeoLODData({ id: "regions", levels: [{ id: "state", geometry: "states" }, { id: "county", geometry: "counties",
    parents: [{ key: 1, parent: "state" }, { key: "1", parent: "state" }], enterZoom: 4.2, exitZoom: 3.8 }], zoom })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoPointMark({ id: "points", geometry: "regions", radiusPx: 9 });
const select = (p, key) => p.selectMarks({ id: "picked", target: "points", items: [key], empty: "none" })
  .highlightMarks({ selection: "picked", color: "red", dimOthers: false });
const intent = p => p.semanticSpec.resources.find(resource => resource.id === "picked").options;

test("LOD replacement keeps original typed county selections under both lifecycle policies and hits the current state", () => {
  for (const selectionPolicy of ["keep-hidden", "drop"]) {
    const p = base(), [a, b] = getMarkItems(p, { target: "points" }); assert.notEqual(a.key, b.key);
    const selected = select(p, a.key), before = serializeProgram(selected), originalIntent = intent(selected);
    const session = createInteractionSession({ program: selected, selectionPolicy, bindings: [] }), events = []; session.subscribe(event => events.push(event));
    const coarse = selected.editGeoLODData({ target: "regions", zoom: 3 }); session.updateProgram(coarse);
    assert.equal(session.getState().program, coarse); assert.deepEqual(events[0].selectionChanges, []);
    const [state] = getMarkItems(coarse, { target: "points" }); assert.deepEqual(resolveStoredSelection(coarse, "picked").keys, [state.key]);
    assert.deepEqual(intent(coarse), originalIntent); session.dispatch({ type: "inspect", point: { x: 40, y: 60 }, slop: 0 });
    assert.equal(session.getState().hit.target.itemKey, state.key); assert.notEqual(state.key, a.key);
    const fine = deserializeProgram(serializeProgram(coarse)).editGeoLODData({ target: "regions", zoom: 5 }); session.updateProgram(fine);
    assert.deepEqual(events.at(-1).selectionChanges, []); assert.deepEqual(resolveStoredSelection(fine, "picked").keys, [a.key]);
    assert.deepEqual(intent(fine), originalIntent); assert.equal(serializeProgram(selected), before); session.destroy();
  }
});

test("coarse authored keys stay logical through scoped finer representations and sibling identity is preserved", () => {
  const p = base(0), [state] = getMarkItems(p), selected = select(p, state.key);
  const parent = hconcat({ programs: [{ id: "left", program: selected }, { id: "right", program: selected }] });
  for (const selectionPolicy of ["keep-hidden", "drop"]) {
    const session = createInteractionSession({ program: parent, selectionPolicy, bindings: [] }), events = []; session.subscribe(e => events.push(e));
    session.updateProgram(parent.editGeoLODData({ target: { childPath: ["left"], id: "regions" }, zoom: 5 }));
    const next = session.getState().program; assert.equal(next.children.right, selected); assert.deepEqual(events[0].selectionChanges, []);
    assert.deepEqual(resolveStoredSelection(next.children.left, "picked").keys, getMarkItems(next.children.left).map(item => item.key));
    assert.deepEqual(intent(next.children.left), intent(selected)); session.destroy();
  }
});

test("genuinely missing geometry reports and restores the authored county key through a different representation", () => {
  const p = base(), [a] = getMarkItems(p), selected = select(p, a.key), session = createInteractionSession({ program: selected, bindings: [] }), events = [];
  session.subscribe(event => events.push(event));
  const hidden = selected.editGeoLODData({ target: "regions", zoom: 3 }).editGeometryData({ target: "states", values: features(["state"], true) });
  session.updateProgram(hidden); assert.deepEqual(events[0].selectionChanges[0].hiddenKeys, [a.key]);
  const restored = deserializeProgram(serializeProgram(hidden)).editGeometryData({ target: "states", values: features(["state"]) });
  session.updateProgram(restored); assert.deepEqual(events[1].selectionChanges[0].restoredKeys, [a.key]);
  assert.deepEqual(events[1].selectionChanges[0].hiddenKeys, []); assert.deepEqual(intent(restored), intent(selected)); session.destroy();
});

test("drop prunes only genuinely missing authored keys and does not resurrect them when representations return", () => {
  const p = base(), [a] = getMarkItems(p), selected = select(p, a.key), session = createInteractionSession({ program: selected, selectionPolicy: "drop", bindings: [] }), events = [];
  session.subscribe(event => events.push(event));
  const hidden = selected.editGeoLODData({ target: "regions", zoom: 3 }).editGeometryData({ target: "states", values: features(["state"], true) });
  session.updateProgram(hidden); assert.deepEqual(events[0].selectionChanges[0].droppedKeys, [a.key]);
  const next = session.getState().program; assert.deepEqual(resolveStoredSelection(next, "picked").selector.items, []);
  session.updateProgram(next.editGeoLODData({ target: "regions", zoom: 5 }));
  assert.deepEqual(resolveStoredSelection(session.getState().program, "picked").keys, []); session.destroy();
});


test("ordinary selected keys keep their existing final-item order when explicit request order differs", () => {
  const p = chart().createCanvas().createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1 }, { id: "b", x: 2 }] })
    .createScatterPlot({ id: "points", x: "x", y: "x", guides: false });
  const [a, b] = getMarkItems(p), selected = select(p, b.key).editMarkSelection({ selection: "picked", items: [b.key, a.key] });
  const session = createInteractionSession({ program: selected, bindings: [] }), events = []; session.subscribe(event => events.push(event));
  session.updateProgram(selected.removeMark({ target: "points" }));
  assert.deepEqual(events[0].selectionChanges[0].hiddenKeys, [a.key, b.key]); session.destroy();
});
