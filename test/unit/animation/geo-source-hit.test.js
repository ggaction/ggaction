import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, vconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { createInteractionSession } from "../../../src/interaction.js";
import { prepareAnimationHitFrame, requireAnimationFrameProgram } from "../../../src/interaction/hitProgram.js";
import { geo, dynamicFrame } from "../../support/animation-geo-source.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";

const at = node => ({ x: node.properties.x + node.offset[0], y: node.properties.y + node.offset[1] });
function hits(frame, point, options) {
  const bridge = createHitFrameBridge(prepareAnimationHitFrame(frame));
  try { return bridge.hit(point, { slop: 0, ...options }); } finally { bridge.dispose(); }
}

test("a newly projected source feature has exact native resource metadata without an endpoint node", () => {
  const native = geo(), before = JSON.stringify(native), picture = native.editProjection({ rotateDeg: [180, 0] });
  assert.deepEqual(getMarkItems(native, { target: "places" }).map(item => item.fields.code), ["front"]);
  const frame = dynamicFrame(native, picture), circles = frame.scene.nodes.filter(node => node.type === "circle");
  assert.equal(circles.length, 2);
  const result = hits(frame, { x: 120, y: 90 });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.target.itemKey, getMarkItems(picture, { target: "places" })[0].key);
  assert.deepEqual({ ownerId: result.target.ownerId, role: result.target.role, childPath: result.target.childPath, rowKeys: result.target.rowKeys, resourceRefs: result.target.resourceRefs },
    { ownerId: "places", role: "geo", childPath: [], rowKeys: [], resourceRefs: [{ kind: "geometry", id: "world", revision: 0 }] });
  requireAnimationFrameProgram(frame, native);
  assert.throws(() => requireAnimationFrameProgram(frame, picture), /not owned/);
  const session = createInteractionSession({ program: native, bindings: [{ type: "keyboard", targets: [{ target: "places" }] }] });
  session.dispatch({ type: "frame", frame, version: 1, generation: session.getState().generation });
  session.dispatch({ type: "inspect", point: { x: 120, y: 90 } });
  assert.equal(session.getState().hit.target.itemKey, result.target.itemKey);
  session.dispatch({ type: "focus", move: "first" });
  assert.equal(session.getState().focus.itemKey, result.target.itemKey);
  session.dispatch({ type: "focus", target: "places", itemKey: result.target.itemKey });
  assert.equal(session.getState().program, native); assert.equal(session.getState().history.undoCount, 0);
  session.destroy(); assert.equal(JSON.stringify(native), before);
});

test("new Geo source parts retain nested actual child paths and independent scoped identities", () => {
  const native = geo(), turned = native.editProjection({ rotateDeg: [180, 0] });
  const blank = chart().createCanvas({ width: 240, height: 180 });
  const wrap = p => vconcat({ id: "outer", programs: [{ id: "row", program: hconcat({ id: "inner", programs: [{ id: "map", program: p }, { id: "empty", program: blank }] }) }, { id: "empty", program: blank }] });
  const from = wrap(native), picture = wrap(turned), frame = dynamicFrame(from, picture, ["row", "map"]);
  const node = frame.scene.nodes.find(node => node.type === "circle"), result = hits(frame, at(node));
  assert.deepEqual(result.target.childPath, ["row", "map"]);
  assert.deepEqual(JSON.parse(result.target.itemKey)[0], ["outer-row", "inner-map"]);
  assert.equal(result.candidates.length, 1);
  assert.throws(() => prepareAnimationHitFrame(dynamicFrame(from, picture, ["outer-row", "inner-map"])), /unknown child path/);
});

test("dynamic Geo source proof rejects unknown owners, keys, revisions and source kinds atomically", () => {
  const native = geo(), picture = native.editProjection({ rotateDeg: [180, 0] });
  for (const [patch, error] of [
    [{ kind: "other" }, /Unsupported/], [{ ownerId: "missing" }, /does not exist/],
    [{ itemKey: "unknown" }, /not owned/], [{ childPath: ["unknown"] }, /unknown child path/],
    [{ childPath: [1] }, /explicit IDs/], [{ childPath: Array(1025).fill("x") }, /bounded child path/],
    [{ ownerId: "" }, /owner and item key/], [{ program: picture }, /exact authorized program/],
    [{ index: 1 }, /unsupported or missing/], [{ itemKey: "x".repeat(10_000_001) }, /work budget/]
  ]) assert.throws(() => prepareAnimationHitFrame(dynamicFrame(native, picture, [], origin => ({ ...origin, ...patch }))), error);
  const revised = picture.editGeometryData({ target: "world", values: { type: "FeatureCollection", features: [{ type: "Feature", properties: { code: "back" }, geometry: { type: "Point", coordinates: [180, 0] } }] } });
  assert.throws(() => prepareAnimationHitFrame(dynamicFrame(native, revised)), /differs from its exact native source/);
  assert.throws(() => prepareAnimationHitFrame(dynamicFrame(native, picture, [], value => value, () => undefined)), /exact sampled identity/);
  const pointOwner = chart().createCanvas({ width: 240, height: 180 }).createData({ values: [{ x: 1, y: 2 }] }).createPointMark({ id: "places" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  assert.throws(() => prepareAnimationHitFrame(dynamicFrame(pointOwner, picture)), /geographic mark owner/);
  let reads = 0;
  const accessed = dynamicFrame(native, picture, [], origin => Object.defineProperty({ ...origin }, "itemKey", { enumerable: true, get() { reads++; return origin.itemKey; } }));
  assert.throws(() => prepareAnimationHitFrame(accessed), /accessors/); assert.equal(reads, 0);
  const good = dynamicFrame(native, picture); assert.equal(hits(good, { x: 120, y: 90 }).candidates.length, 1);
});

test("dynamic source metadata preserves current opacity and clip admission", () => {
  const native = geo(), picture = native.editProjection({ rotateDeg: [180, 0] });
  const invisible = picture.editGeoPointMark({ target: "places", opacity: 0 });
  const frame = dynamicFrame(native, invisible);
  assert.equal(hits(frame, { x: 120, y: 90 }).target, null);
  assert.equal(hits(frame, { x: 120, y: 90 }, { hitInvisible: true }).candidates.length, 1);
  const clipped = picture.editGraphics({ target: "places", property: "clip", value: { x: 0, y: 0, width: 120, height: 180 } });
  const clippedFrame = dynamicFrame(native, clipped);
  assert.equal(hits(clippedFrame, { x: 115, y: 90 }).candidates.length, 1);
  assert.equal(hits(clippedFrame, { x: 125, y: 90 }).target, null);
});
