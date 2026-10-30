import assert from "node:assert/strict";
import test from "node:test";
import { hconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { createInteractionSession } from "../../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";
import { prepareAnimationHitFrame } from "../../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";
import { normalizeClickSelection, clickSelectionCommand } from "../../../src/interaction/clickSelection.js";
import { geo, dynamicFrame } from "../../support/animation-geo-source.js";

const seed = () => geo().selectMarks({ id: "picked", target: "places", items: [], empty: "none" });
const keyboard = (target = "places") => ({ type: "keyboard", targets: [{ target, activation: { type: "select", selection: "picked" } }] });
const accept = (session, frame) => session.dispatch({ type: "frame", frame, version: session.getState().frameVersion + 1, generation: session.getState().generation });
const selected = p => resolveStoredSelection(p, "picked").selector.items;
const featureData = codes => ({ type: "FeatureCollection", features: codes.map(code => ({ type: "Feature", properties: { code }, geometry: { type: "Point", coordinates: code === "front" ? [0, 0] : [180, 0] } })) });
function surface(width = 240) {
  const listeners = new Map(); return { getBoundingClientRect: () => ({ left: 0, top: 0, width, height: 180 }),
    addEventListener(type, fn) { const list = listeners.get(type) ?? new Set(); list.add(fn); listeners.set(type, list); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    click(x = 120, y = 90) { for (const fn of listeners.get("click") ?? []) fn({ clientX: x, clientY: y }); },
    count() { return [...listeners.values()].reduce((count, list) => count + list.size, 0); } };
}

for (const policy of ["keep-hidden", "drop"]) test(`current Geo keyboard activation retains source intent under ${policy}`, () => {
  const p = seed(), before = serializeProgram(p), picture = p.editProjection({ rotateDeg: [180, 0] });
  const key = getMarkItems(picture, { target: "places" })[0].key, frame = dynamicFrame(p, picture);
  const session = createInteractionSession({ program: p, bindings: [keyboard()], selectionPolicy: policy }), events = [];
  session.subscribe(event => events.push(event)); accept(session, frame);
  assert.throws(() => session.dispatch({ type: "focus", target: "places", itemKey: getMarkItems(p)[0].key }), /not painted/);
  session.dispatch({ type: "focus", target: "places", itemKey: key });
  assert.deepEqual(session.getState().focus.screenPoint, { x: 120, y: 90 });
  session.dispatch({ type: "activate" });
  const next = session.getState().program;
  assert.deepEqual(selected(next), [key]); assert.deepEqual(resolveStoredSelection(next, "picked").keys, []);
  assert.deepEqual(resolveStoredSelection(next, "picked", { membership: true }).keys, [key]);
  assert.equal(session.getState().history.undoCount, 1); assert.equal(session.getState().animationFrame, null);
  assert.deepEqual(events.slice(-2).map(e => [e.type, e.phase, e.selectionChanges]), [["select", "commit", []], ["select", "settled", []]]);
  assert.equal(serializeProgram(p), before);
  const loaded = deserializeProgram(serializeProgram(next)); assert.deepEqual(selected(loaded), [key]);
  assert.deepEqual(resolveStoredSelection(loaded.editProjection({ rotateDeg: [180, 0] }), "picked").keys, [key]);
  assert.equal(session.dispatch({ type: "frame", frame, version: 100, generation: 0 }).status, "stale");
  assert.throws(() => accept(session, frame), /current native program/);
  session.dispatch({ type: "undo" }); assert.equal(session.getState().program, p);
  session.dispatch({ type: "redo" }); assert.equal(session.getState().program, next); session.destroy();
});

test("mounted current Geo click commits one key despite multiple painted parts", () => {
  const p = seed(), picture = p.editProjection({ rotateDeg: [180, 0] }), key = getMarkItems(picture)[0].key;
  const session = createInteractionSession({ program: p, bindings: [{ type: "select", target: "places", selection: "picked", onMiss: "ignore" }], selectionPolicy: "drop" });
  const host = surface(), events = []; session.mount(host); accept(session, dynamicFrame(p, picture)); session.subscribe(e => events.push(e));
  host.click(); assert.deepEqual(selected(session.getState().program), [key]); assert.equal(session.getState().history.undoCount, 1);
  assert.deepEqual(events.map(e => [e.type, e.phase]), [["select", "commit"], ["select", "settled"]]);
  session.destroy(); assert.equal(host.count(), 0);
});

test("current source and frame source revisions are checked independently", () => {
  const p = seed(), revised = p.editGeometryData({ target: "world", values: featureData(["front", "back"]) }).editProjection({ rotateDeg: [180, 0] });
  const frame = dynamicFrame(revised, revised, [], value => value, value => value, [p, revised]);
  const session = createInteractionSession({ program: p, bindings: [keyboard()] }); accept(session, frame);
  session.dispatch({ type: "inspect", point: { x: 120, y: 90 }, slop: 0 });
  assert.equal(session.getState().hit.target.resourceRefs[0].revision, 1);
  session.dispatch({ type: "focus", move: "first" }); session.dispatch({ type: "activate" });
  assert.equal(session.getState().program.semanticSpec.resources.find(r => r.id === "world").revision, 0);
  assert.deepEqual(selected(session.getState().program), [getMarkItems(revised)[0].key]); session.destroy();
});

test("a frame source key missing from the current native revision is inspectable but cannot activate", () => {
  const p = seed().editGeometryData({ target: "world", values: featureData(["front"]) });
  const revised = p.editGeometryData({ target: "world", values: featureData(["front", "back"]) }).editProjection({ rotateDeg: [180, 0] });
  const frame = dynamicFrame(revised, revised, [], value => value, value => value, [p, revised]), key = getMarkItems(revised)[0].key;
  const session = createInteractionSession({ program: p, bindings: [keyboard(), { type: "select", target: "places", selection: "picked", onMiss: "ignore" }] });
  const host = surface(); session.mount(host); accept(session, frame);
  assert.throws(() => session.dispatch({ type: "focus", target: "places", itemKey: key }), /not painted/);
  host.click(); assert.equal(session.getState().program, p); assert.equal(session.getState().history.undoCount, 0); session.destroy();
});

test("Geo source activation keeps actual child scope and never selects a sibling", () => {
  const p = seed(), turned = p.editProjection({ rotateDeg: [180, 0] });
  const wrap = left => hconcat({ id: "pair", programs: [{ id: "left", program: left }, { id: "right", program: p }] });
  const combined = wrap(p), picture = wrap(turned), target = { childPath: ["left"], id: "places" }, other = { childPath: ["right"], id: "places" };
  const frame = dynamicFrame(combined, picture, ["left"], origin => JSON.parse(origin.itemKey)[0][0] === "pair-right" ? { ...origin, childPath: ["right"] } : origin);
  const session = createInteractionSession({ program: combined, bindings: [keyboard(target)] }); accept(session, frame);
  const key = getMarkItems(picture, { target })[0].key;
  assert.throws(() => session.dispatch({ type: "focus", target: other, itemKey: key }), /configured keyboard/);
  session.dispatch({ type: "focus", target, itemKey: key }); session.dispatch({ type: "activate" });
  assert.deepEqual(selected(session.getState().program.children.left), [getMarkItems(turned)[0].key]);
  assert.equal(session.getState().program.children.right, p); assert.deepEqual(selected(p), []); session.destroy();
});

test("dynamic Geo keyboard and clicks reject opacity zero and fully clipped source parts", () => {
  const p = seed(), picture = p.editProjection({ rotateDeg: [180, 0] });
  const invisible = picture.editGeoPointMark({ target: "places", opacity: 0 });
  const clipped = picture.editGraphics({ target: "places", property: "clip", value: { x: 0, y: 0, width: 20, height: 20 } });
  for (const view of [invisible, clipped]) {
    const frame = dynamicFrame(p, view), prepared = prepareAnimationHitFrame(frame), bridge = createHitFrameBridge(prepared);
    const binding = normalizeClickSelection(p, { type: "select", target: "places", selection: "picked", onMiss: "ignore", hitInvisible: true }, []);
    assert.equal(clickSelectionCommand(p, binding, bridge.hit({ x: 120, y: 90 }, { slop: 0, hitInvisible: true }), prepared), null);
    bridge.dispose();
    const session = createInteractionSession({ program: p, bindings: [keyboard()] }); accept(session, frame);
    session.dispatch({ type: "focus", move: "first" }); assert.equal(session.getState().focus, null); session.destroy();
  }
});

for (const policy of ["keep-hidden", "drop"]) test(`Geo projection clipping and original removal have distinct ${policy} lifecycle`, () => {
  const p = seed(), back = getMarkItems(p.editProjection({ rotateDeg: [180, 0] }))[0].key;
  const selectedProgram = p.editMarkSelection({ selection: "picked", items: [back] });
  const session = createInteractionSession({ program: selectedProgram, selectionPolicy: policy }), events = [];
  session.subscribe(e => events.push(e)); session.updateProgram(selectedProgram.editProjection({ rotateDeg: [90, 0] }));
  assert.deepEqual(events.at(-1).selectionChanges, []); assert.deepEqual(selected(session.getState().program), [back]);
  const removed = session.getState().program.editGeometryData({ target: "world", values: featureData(["front"]) }); session.updateProgram(removed);
  const change = events.at(-1).selectionChanges[0];
  assert.deepEqual(policy === "drop" ? change.droppedKeys : change.hiddenKeys, [back]);
  assert.deepEqual(selected(session.getState().program), policy === "drop" ? [] : [back]); session.destroy();
});

test("matching feature keys never cross a different geometry resource owner", () => {
  const p = seed(), world = p.semanticSpec.resources.find(resource => resource.id === "world");
  // Explicit extension authoring keeps the logical feature identity while
  // changing the named resource: key equality alone cannot grant activation.
  const other = p.editSemantic({ property: "resource[geometry:other]", value: { ...world, id: "other" } })
    .editGeoPointMark({ target: "places", geometry: "other" }).editProjection({ rotateDeg: [180, 0] });
  const frame = dynamicFrame(other, other, [], value => value, value => value, [p, other]);
  const key = getMarkItems(other)[0].key, session = createInteractionSession({ program: p, bindings: [keyboard()] });
  accept(session, frame); session.dispatch({ type: "inspect", point: { x: 120, y: 90 }, slop: 0 });
  assert.equal(session.getState().hit.target.resourceRefs[0].id, "other");
  assert.throws(() => session.dispatch({ type: "focus", target: "places", itemKey: key }), /not painted/);
  assert.equal(session.getState().program, p); assert.equal(session.getState().history.undoCount, 0); session.destroy();
});

test("Geo lifecycle preserves source predicates while concrete property predicates read actual graphics", () => {
  const p = geo().selectMarks({ id: "field", target: "places", field: "code", op: "eq", value: "back" })
    .selectMarks({ id: "property", target: "places", property: "x", op: "eq", value: 120 });
  const field = resolveStoredSelection(p, "field", { membership: true }), property = resolveStoredSelection(p, "property", { membership: true });
  assert.deepEqual(field.items.filter(item => field.keys.includes(item.key)).map(item => item.fields.code), ["back"]);
  assert.deepEqual(property.items.filter(item => property.keys.includes(item.key)).map(item => item.fields.code), ["front"]);
  assert.deepEqual(resolveStoredSelection(p, "field").keys, []);
});
