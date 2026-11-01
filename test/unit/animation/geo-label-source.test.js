import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { createInteractionSession } from "../../../src/interaction.js";
import { resolveMarkSourceItems } from "../../../src/materialization/selection/policies/index.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";
import { prepareAnimationHitFrame } from "../../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";
import { isGeoLabelSource } from "../../../src/grammar/geo/markKind.js";
import { geo, dynamicFrame } from "../../support/animation-geo-source.js";

const label = p => p.createMarkLabels({ source: "places", id: "names", field: "code" });
const seed = () => label(geo()).selectMarks({ target: "names", id: "picked", items: [], empty: "none" });
const turn = p => p.editProjection({ rotateDeg: [180, 0] });
const key = p => getMarkItems(p, { target: "names" })[0].key;
const frame = (native, picture, childPath = [], authorities = [native]) => dynamicFrame(native, picture, childPath,
  origin => ({ ...origin, ownerId: JSON.parse(origin.itemKey)[1] }), value => value, authorities);
const keyboard = (target = "names") => ({ type: "keyboard", targets: [{ target, activation: { type: "select", selection: "picked" } }] });
const accept = (session, value) => session.dispatch({ type: "frame", frame: value, version: session.getState().frameVersion + 1, generation: session.getState().generation });
const selected = p => resolveStoredSelection(p, "picked").selector.items;

for (const policy of ["keep-hidden", "drop"]) test(`painted Geo Text source activates one native key under ${policy}`, () => {
  const p = seed(), before = serializeProgram(p), picture = turn(p), itemKey = key(picture), sampled = frame(p, picture);
  assert.deepEqual(resolveMarkSourceItems(p, "names").map(item => item.fields.code), ["front", "back"]);
  const session = createInteractionSession({ program: p, selectionPolicy: policy, bindings: [keyboard()] });
  accept(session, sampled); session.dispatch({ type: "focus", target: "names", itemKey });
  const focus = session.getState().focus;
  assert.equal(focus.role, "text"); assert.ok(Number.isFinite(focus.screenPoint.x));
  session.dispatch({ type: "inspect", point: focus.screenPoint, slop: 0 });
  const hit = session.getState().hit.candidates.find(item => item.itemKey === itemKey);
  assert.equal(hit.ownerId, "names"); assert.deepEqual(hit.resourceRefs, [{ kind: "geometry", id: "world", revision: 0 }]);
  session.dispatch({ type: "activate" }); const next = session.getState().program;
  assert.deepEqual(selected(next), [itemKey]); assert.deepEqual(resolveStoredSelection(next, "picked").keys, []);
  assert.deepEqual(resolveStoredSelection(next, "picked", { membership: true }).keys, [itemKey]);
  assert.equal(session.getState().history.undoCount, 1); assert.equal(serializeProgram(p), before);
  const loaded = deserializeProgram(serializeProgram(next)); assert.deepEqual(selected(loaded), [itemKey]);
  assert.deepEqual(resolveStoredSelection(turn(loaded), "picked").keys, [itemKey]);
  session.dispatch({ type: "undo" }); assert.equal(session.getState().program, p);
  session.dispatch({ type: "redo" }); assert.equal(session.getState().program, next);
  session.destroy();
});

test("Geo Text source selection is evaluated before projection clipping but preserves explicit label selection", () => {
  const p = geo().selectMarks({ id: "source", target: "places", field: "code", op: "eq", value: "back" })
    .createMarkLabels({ source: "places", id: "names", field: "code", selection: "source" });
  assert.deepEqual(getMarkItems(p, { target: "names" }), []);
  const items = resolveMarkSourceItems(p, "names"); assert.deepEqual(items.map(item => item.fields.code), ["back"]);
  assert.equal(items[0].key, key(turn(p))); assert.deepEqual(items[0].rows, []);
  const none = p.editMarkSelection({ selection: "source", field: "code", op: "eq", value: "absent" });
  assert.deepEqual(resolveMarkSourceItems(none, "names"), []);
  const inline = geo().createMarkLabels({ source: "places", id: "names", field: "code", select: { field: "code", op: "eq", value: "front" } });
  assert.deepEqual(resolveMarkSourceItems(inline, "names").map(item => item.fields.code), ["front"]);
});

test("Geo Text source lifecycle distinguishes hidden labels, source removal and concrete-property predicates", () => {
  const p = seed(), back = key(turn(p)), chosen = p.editMarkSelection({ selection: "picked", items: [back] });
  const session = createInteractionSession({ program: chosen, selectionPolicy: "drop" }), events = [];
  session.subscribe(event => events.push(event)); session.updateProgram(chosen.editProjection({ rotateDeg: [90, 0] }));
  assert.deepEqual(selected(session.getState().program), [back]); assert.deepEqual(events.at(-1).selectionChanges, []);
  const removed = session.getState().program.editGeometryData({ target: "world", values: { type: "FeatureCollection", features: [
    { type: "Feature", properties: { code: "front" }, geometry: { type: "Point", coordinates: [0, 0] } }
  ] } });
  session.updateProgram(removed); assert.deepEqual(selected(session.getState().program), []);
  assert.deepEqual(events.at(-1).selectionChanges[0].droppedKeys, [back]); session.destroy();
  const property = p.selectMarks({ id: "property", target: "names", property: "x", op: "eq", value: 120 });
  assert.deepEqual(resolveStoredSelection(property, "property", { membership: true }).keys, [key(p)]);
});

test("Geo Text frame source and current source revisions are independently checked", () => {
  const p = seed();
  const revised = turn(p.editGeometryData({ target: "world", values: { type: "FeatureCollection", features: [{ type: "Feature", properties: { code: "front" }, geometry: { type: "Point", coordinates: [0, 0] } }, { type: "Feature", properties: { code: "back" }, geometry: { type: "Point", coordinates: [180, 0] } }] } }));
  const session = createInteractionSession({ program: p, bindings: [keyboard()] });
  accept(session, frame(revised, revised, [], [p, revised])); session.dispatch({ type: "focus", target: "names", itemKey: key(revised) });
  session.dispatch({ type: "inspect", point: session.getState().focus.screenPoint });
  assert.equal(session.getState().hit.candidates.find(item => item.ownerId === "names").resourceRefs[0].revision, 1);
  session.dispatch({ type: "activate" }); assert.deepEqual(selected(session.getState().program), [key(revised)]);
  assert.equal(session.getState().program.semanticSpec.resources.find(value => value.id === "world").revision, 0); session.destroy();
});

test("nested Geo Text authority never selects a sibling and clipped or transparent text cannot focus", () => {
  const p = seed(), target = { childPath: ["left"], id: "names" }, wrap = q => hconcat({ id: "pair", programs: [{ id: "left", program: q }, { id: "right", program: p }] });
  const native = wrap(p), picture = wrap(turn(p));
  const sampled = dynamicFrame(native, picture, ["left"], origin => ({ ...origin, ownerId: JSON.parse(origin.itemKey)[1],
    childPath: JSON.parse(origin.itemKey)[0][0] === "pair-right" ? ["right"] : ["left"] }));
  const session = createInteractionSession({ program: native, bindings: [keyboard(target)] }); accept(session, sampled);
  session.dispatch({ type: "focus", target, itemKey: getMarkItems(picture, { target })[0].key }); session.dispatch({ type: "activate" });
  assert.deepEqual(selected(session.getState().program.children.left), [key(turn(p))]); assert.equal(session.getState().program.children.right, p); session.destroy();
  for (const hidden of [turn(p).editTextMark({ target: "names", opacity: 0 }), turn(p).editGraphics({ target: "names", property: "clip", value: { x: 0, y: 0, width: 5, height: 5 } })]) {
    const current = createInteractionSession({ program: p, bindings: [keyboard()] }); accept(current, frame(p, hidden));
    assert.throws(() => current.dispatch({ type: "focus", target: "names", itemKey: key(hidden) }), /not painted/); current.destroy();
  }
});

test("dynamic Geo Text origin rejects unrelated Text owners and mismatched identity roles", () => {
  const p = seed(), picture = turn(p);
  const wrongRole = dynamicFrame(p, picture, [], origin => ({ ...origin, ownerId: "names" }));
  assert.throws(() => prepareAnimationHitFrame(wrongRole), /not owned|differs/);
  const ordinary = chart().createCanvas().createData({ values: [{ name: "back", x: 1, y: 2 }] }).createTextMark({ id: "names" }).encodeText({ field: "name" });
  assert.throws(() => prepareAnimationHitFrame(dynamicFrame(ordinary, picture, [], origin => ({ ...origin, ownerId: "names" }))), /geographic mark owner/);
  assert.equal(isGeoLabelSource(undefined), false); assert.equal(isGeoLabelSource({ mark: { type: "text" } }), false);
  assert.equal(isGeoLabelSource({ mark: { type: "geo" }, geoBinding: { mode: "annotation" } }), false);
  const bridge = createHitFrameBridge(prepareAnimationHitFrame(frame(p, picture))); assert.ok(bridge.hit({ x: 120, y: 90 }).candidates.length); bridge.dispose();
});
