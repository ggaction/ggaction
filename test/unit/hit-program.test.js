import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { chart, hconcat } from "../../src/index.js";
import { ChartProgram } from "../../src/ChartProgram.js";
import { chart as basic } from "../../src/basic.js";
import { createTransitionScene, renderTransitionScene } from "../../src/scene.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { prepareProgramHitFrame, programHitOwnerPlacement } from "../../src/interaction/hitProgram.js";
import { prepareConcreteHitShape } from "../../src/interaction/hitConcrete.js";
import { createHitFrameBridge } from "../../src/interaction/hitFrame.js";
import { hitShape } from "../../src/grammar/hitShapes.js";

const pointProgram = (factory = chart) => factory().createCanvas({ width: 300, height: 200 })
  .createData({ id: "source", values: [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 3 }], keyField: "id" })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const nodePoint = node => ({ x: node.properties.x + node.offset[0], y: node.properties.y + node.offset[1] });
const hit = (frame, point, options) => createHitFrameBridge(frame).hit(point, { slop: 0, ...options });

test("actual Full and Basic points share scene identity and preserve exact final row grain", () => {
  for (const make of [chart, basic]) {
    const p = pointProgram(make), before = serializeProgram(p), frame = prepareProgramHitFrame(p, 4);
    assert.equal(frame.scene, createTransitionScene(p, { format: "canvas" }));
    assert.equal(prepareProgramHitFrame(p).scene, frame.scene);
    const node = frame.scene.nodes.find(n => n.type === "circle"), target = hit(frame, nodePoint(node)).target;
    const item = getMarkItems(p, { target: { kind: "mark", id: "points" } })[0];
    assert.equal(target.itemKey, item.key); assert.deepEqual(target.rowKeys, [p.semanticSpec.datasets[0].rowKeys[0]]);
    assert.equal(target.ownerId, "points"); assert.equal(target.role, "point"); assert.deepEqual(target.childPath, []);
    const data = p.semanticSpec.datasets[0];
    assert.deepEqual(target.resourceRefs, [{ kind: "data", id: "source", logicalId: data.logicalId, revision: 0 }]);
    assert.equal(serializeProgram(p), before); assert.equal(p.trace.children.at(-1).op, "encodeY");
    assert.ok(Object.isFrozen(frame)); assert.ok(Object.isFrozen(frame.entries[0]));
  }
});

test("nested composition uses exact child path and local coordinates without double translation", () => {
  const unit = pointProgram(), nested = hconcat({ id: "inner", programs: [{ id: "one", program: unit }, { id: "two", program: unit }] });
  const p = hconcat({ id: "outer", programs: [{ id: "left", program: unit }, { id: "right", program: nested }] });
  const frame = prepareProgramHitFrame(p), nodes = frame.scene.nodes.filter(n => n.type === "circle");
  assert.equal(nodes.length, 6);
  const expected = [["left"], ["left"], ["right", "one"], ["right", "one"], ["right", "two"], ["right", "two"]];
  nodes.forEach((node, index) => {
    const target = hit(frame, nodePoint(node)).target;
    assert.deepEqual(target.childPath, expected[index]);
    assert.deepEqual(target.localPoint, { x: node.properties.x, y: node.properties.y });
    assert.equal(target.itemKey, getMarkItems(p, { target: { kind: "mark", id: "points", childPath: expected[index] } })[index % 2].key);
  });
  assert.equal(new Set(frame.entries.map(e => e.metadata.itemKey)).size, 6);
});

test("revisions and editable codec restoration retain current lineage and previous immutable targets", () => {
  const p = pointProgram(), first = prepareProgramHitFrame(p), node = first.scene.nodes.find(n => n.type === "circle");
  const changed = p.reviseData({ source: "source", id: "revised", values: [{ id: "b", x: 2, y: 3 }, { id: "a", x: 1, y: 2 }] });
  const restored = deserializeProgram(serializeProgram(changed)), next = prepareProgramHitFrame(restored);
  const result = hit(next, nodePoint(node)).target;
  assert.equal(result.itemKey, hit(first, nodePoint(node)).target.itemKey);
  assert.equal(result.resourceRefs[0].id, "revised"); assert.equal(result.resourceRefs[0].revision, 1);
  assert.equal(hit(first, nodePoint(node)).target.resourceRefs[0].revision, 0);
  assert.deepEqual(next.entries.map(e => e.metadata), prepareProgramHitFrame(changed).entries.map(e => e.metadata));
});

test("resource node labels collapse with their body while distinct overlapping owners remain", () => {
  const p = chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createData({ id: "d", values: [{ id: "r", parent: null, v: 10 }, { id: "a", parent: "r", v: 6 }, { id: "b", parent: "r", v: 4 }], keyField: "id" })
    .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "v" })
    .layoutHierarchy({ id: "l", method: "tree", options: { nodeSize: [20, 20], siblingGap: 40, depthGap: 60, orientation: "vertical" } })
    .createTreePlot({ id: "tree", labels: { offset: [0, 0] } }).createTreePlot({ id: "other", layout: "l", labels: { offset: [0, 0] } });
  const frame = prepareProgramHitFrame(p), node = frame.scene.nodes.find(n => n.type === "circle");
  const result = hit(frame, nodePoint(node));
  assert.deepEqual(result.candidates.filter(c => c.role === "node").map(c => c.ownerId), ["other", "tree"]);
  assert.equal(result.candidates.filter(c => c.role === "link").length, 2);
  assert.equal(result.candidates.length, 4); assert.deepEqual(result.target.rowKeys, []);
  assert.deepEqual(result.target.resourceRefs, [{ kind: "layout", id: "l", revision: 0 }]);
  assert.equal(frame.entries.length, 16);
  assert.equal(frame.scene.nodes[result.target.zIndex].type, "text");
});

const concrete = (type, properties, options = {}) => ({ type, properties, offset: options.offset ?? [0, 0],
  clip: options.clip ?? [0, 0, 400, 300], clips: options.clips ?? [] });
const at = (node, x, y, metrics) => hitShape(prepareConcreteHitShape(node, metrics), { x, y }, { slop: 0 }).hit;

test("concrete adapter uses painted dash runs, outline and filled path holes with actual clipping", () => {
  const line = concrete("line", { x1: 10, y1: 20, x2: 100, y2: 20, stroke: "red", strokeWidth: 2, strokeDash: [10, 10] });
  assert.equal(at(line, 15, 20), true); assert.equal(at(line, 25, 20), false);
  const rect = concrete("rect", { x: 20, y: 30, width: 40, height: 20, fill: "none", stroke: "blue", strokeWidth: 20,
    outline: { color: { space: "srgb", channels: [1, 0, 0], alpha: 1 }, width: 2 } });
  assert.equal(at(rect, 19.5, 40), true); assert.equal(at(rect, 15, 40), false); assert.equal(at(rect, 40, 40), false);
  const commands = [{ op: "M", x: 10, y: 10 }, { op: "L", x: 90, y: 10 }, { op: "L", x: 90, y: 90 }, { op: "L", x: 10, y: 90 }, { op: "Z" },
    { op: "M", x: 30, y: 30 }, { op: "L", x: 70, y: 30 }, { op: "L", x: 70, y: 70 }, { op: "L", x: 30, y: 70 }, { op: "Z" }];
  const path = concrete("path", { commands, fillRule: "evenodd", fill: "red" }, { offset: [10, 20], clips: [
    { type: "path", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 150, y: 0 }, { op: "L", x: 0, y: 150 }, { op: "Z" }] }] });
  assert.equal(at(path, 30, 40), true); assert.equal(at(path, 60, 70), false); assert.equal(at(path, 90, 100), false);
});

test("rotated multiline Text uses each metric line box and keeps the gap empty", () => {
  const text = concrete("text", { x: 100, y: 100, text: "ignored", lines: [{ text: "WW", x: 0, y: 0 }, { text: "", x: 0, y: 20 }, { text: "i", x: 0, y: 40 }],
    fontSize: 10, textAlign: "left", textBaseline: "top", fill: "black", rotation: Math.PI / 2 });
  assert.equal(at(text, 95, 110), true); assert.equal(at(text, 75, 101), false); assert.equal(at(text, 55, 101), true);
  assert.equal(at(text, 55, 110), false);
  const target = hitShape(prepareConcreteHitShape(text), { x: 95, y: 110 }, { slop: 0 });
  assert.deepEqual(target.localPoint, { x: 95, y: 110 });
  assert.equal(at(concrete("text", { x: 10, y: 10, text: "", fontSize: 10, fill: "black" }), 10, 10), false);
  const profile = { schemaVersion: 1, measurements: [{ text: "WW", fontFamily: "sans-serif", fontSize: 10, fontWeight: 400, fontStyle: "normal", width: 40 }] };
  assert.equal(at(concrete("text", { x: 10, y: 10, text: "WW", fontSize: 10, textBaseline: "top", fill: "black" }), 40, 15, profile), true);
});

test("Image viewport, opacity, nested clip and shadow exclusion consume only source geometry", () => {
  const image = concrete("image", { x: 10, y: 10, width: 80, height: 60, opacity: 1,
    shadow: { offsetX: 100, offsetY: 100, blur: 20 } }, { offset: [5, 10], clip: [0, 0, 50, 60], clips: [[20, 30, 100, 100]] });
  assert.equal(at(image, 25, 35), true); assert.equal(at(image, 17, 35), false); assert.equal(at(image, 65, 35), false);
  assert.equal(at(image, 125, 135), false);
  const invisible = { ...image, properties: { ...image.properties, opacity: 0 } };
  assert.equal(at(invisible, 25, 35), false);
  assert.equal(hitShape(prepareConcreteHitShape(invisible), { x: 25, y: 35 }, { hitInvisible: true, slop: 0 }).hit, true);
});

test("unsupported, open-stack, forged namespace and malformed concrete inputs fail without a partial frame", () => {
  assert.throws(() => prepareProgramHitFrame({}), /immutable/);
  const p = pointProgram(), before = serializeProgram(p);
  let reads = 0;
  const forged = Object.create(Object.getPrototypeOf(p));
  Object.defineProperty(forged, "graphicSpec", { get() { reads++; return p.graphicSpec; } });
  Object.freeze(forged);
  assert.throws(() => prepareProgramHitFrame(forged), /own program state/);
  assert.equal(reads, 0);
  for (const version of [-1, NaN, 0.5, Infinity]) assert.throws(() => prepareProgramHitFrame(p, version), /version/);
  const open = new ChartProgram({ ...p, actionStack: ["active"] });
  assert.throws(() => prepareProgramHitFrame(open), /closed/);
  const objects = structuredClone(p.graphicSpec.objects), item = objects.points.items[0], key = JSON.parse(item.identity.key);
  key[0] = ["forged"]; item.identity.key = JSON.stringify(key);
  assert.throws(() => prepareProgramHitFrame(new ChartProgram({ ...p, graphicSpec: { ...p.graphicSpec, objects } })), /namespace/);
  assert.throws(() => prepareConcreteHitShape(concrete("unsupported", {})), /supported/);
  assert.throws(() => prepareConcreteHitShape(concrete("rect", { x: NaN, y: 0, width: 10, height: 10, fill: "red" })));
  assert.equal(serializeProgram(p), before);
});

test("preparation rejects excessive item and namespace work before scene allocation", () => {
  const p = pointProgram(), objects = p.graphicSpec.objects;
  const many = new ChartProgram({ ...p, graphicSpec: { objects: { ...objects, extra: { type: "collection", items: Array(100001).fill({ id: "unvisited", type: "circle", properties: {} }) } }, order: p.graphicSpec.order } });
  assert.throws(() => prepareProgramHitFrame(many), /item budget/);
  const long = "x".repeat(10_000_001);
  const expensive = new ChartProgram({ ...p, graphicSpec: { objects: { ...objects, [long]: { type: "collection", items: [] } }, order: p.graphicSpec.order } });
  assert.throws(() => prepareProgramHitFrame(expensive), /preparation work budget/);
  assert.equal(prepareProgramHitFrame(p).entries.length, 2);
});

test("ordinary concrete variants, source-only objects and scene format cache retain their behavior", () => {
  const p = pointProgram();
  assert.equal(createTransitionScene(p), createTransitionScene(p, { format: "svg" }));
  const normal = createTransitionScene(p, { format: "canvas" }), uncached = createTransitionScene(p, { format: "canvas", shadows: {} });
  assert.notEqual(normal, uncached); assert.deepEqual(normal, uncached);
  assert.throws(() => createTransitionScene(p, { format: "other" }), /Unknown/);
  assert.throws(() => createTransitionScene(null), /ChartProgram/);
  assert.equal(at(concrete("circle", { x: 20, y: 20, radius: 5, fill: "red" }), 20, 20), true);
  assert.equal(at(concrete("path", { commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 30, y: 0 }, { op: "L", x: 0, y: 30 }, { op: "Z" }], fill: "red" }), 5, 5), true);
  const label = concrete("text", { x: 50, y: 50, text: "W", fontSize: 10, textBaseline: "top", fill: "none", outline: { width: 4, color: "black" } });
  assert.equal(at(label, 49, 55), true);
  assert.equal(at(concrete("text", { ...label.properties, outline: undefined }), 55, 55), false);
  const plain = new ChartProgram({ graphicSpec: { objects: {
    canvas: { type: "canvas", properties: { width: 100, height: 100 } },
    extension: { type: "circle", properties: { x: 50, y: 50, radius: 10, fill: "red", stroke: "none", strokeWidth: 0 } }
  }, order: ["canvas", "extension"] } });
  assert.equal(prepareProgramHitFrame(plain).entries.length, 0);
});


test("actual materialized point scenes hit the same CSS targets at DPR1, DPR2 and DPR3", () => {
  const p = pointProgram(), frame = prepareProgramHitFrame(p), bridge = createHitFrameBridge(frame);
  const samples = [{ x: 70, y: 140, expected: true }, { x: 170, y: 90, expected: false }];
  for (const pixelRatio of [1, 2, 3]) {
    const canvas = createCanvas(300 * pixelRatio, 200 * pixelRatio), context = canvas.getContext("2d");
    renderTransitionScene(frame.scene, context, { pixelRatio });
    for (const { x, y, expected } of samples) {
      const rgba = context.getImageData(x * pixelRatio, y * pixelRatio, 1, 1).data;
      assert.equal(rgba[2] > rgba[0], expected);
      assert.equal(bridge.hit({ x, y }, { slop: 0 }).target !== null, expected);
    }
  }
});


test("owner placement uses the authentic empty scene and exact nested path", () => {
  const p = pointProgram().filterMarks({target: "points", field: "id", op: "eq", value: "absent"});
  const nested = hconcat({programs:[{id:"one", program:p}, {id:"two", program:p}]}), frame = prepareProgramHitFrame(nested);
  assert.equal(frame.entries.length, 0);
  assert.deepEqual(programHitOwnerPlacement(frame,["one"]).offset,[0,0]);
  assert.ok(programHitOwnerPlacement(frame,["two"]).offset[0] >= 300);
  assert.throws(() => programHitOwnerPlacement({...frame},["one"]), /authentic/);
  assert.throws(() => programHitOwnerPlacement(frame,["absent"]), /no materialized Canvas/);
});
