import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { prepareHitShape, hitShape, normalizeHitQuery, MAX_HIT_CLIPS, MAX_HIT_SHAPE_PARTS } from "../../../src/grammar/hitShapes.js";

const identity = [1, 0, 0, 1, 0, 0];
const rectangle = { type: "rect", rect: { x: 10, y: 20, width: 20, height: 10 } };
const circle = { type: "circle", x: 20, y: 20, radius: 10 };
const line = { type: "line", from: { x: 10, y: 20 }, to: { x: 30, y: 20 } };
const config = (geometry, overrides = {}) => ({ geometry, paint: { fill: true, stroke: null, opacity: 1 }, transform: [...identity], clips: [], ...overrides });
const prepare = (geometry, overrides) => prepareHitShape(config(geometry, overrides));
const query = (shape, x, y, options) => hitShape(shape, { x, y }, options);
const ring = points => points.map(([x, y], i) => ({ op: i ? "L" : "M", x, y })).concat({ op: "Z" });
const outer = ring([[0, 0], [10, 0], [10, 10], [0, 10]]), hole = ring([[3, 3], [7, 3], [7, 7], [3, 7]]);
const path = { type: "path", commands: [...outer, ...hole, ...ring([[12, 0], [14, 0], [14, 2], [12, 2]])], fillRule: "evenodd" };

test("filled circle and rectangle hit exact geometry without expanding holes by stroke slop", () => {
  const a = prepare(rectangle), b = prepare(circle);
  assert.equal(query(a, 10, 20).hit, true); assert.equal(query(a, 30, 30).hit, true);
  assert.equal(query(a, 9, 25).hit, false); assert.equal(query(a, 31, 25, { pointerType: "touch" }).hit, false);
  assert.equal(query(b, 20, 20).hit, true); assert.equal(query(b, 30, 20).hit, true);
  assert.equal(query(b, 29, 29).hit, false); assert.equal(query(b, 31, 20).hit, false);
  assert.equal(query(prepare({ ...circle, radius: 0 }), 20, 20).hit, false);
  assert.equal(query(prepare({ ...rectangle, rect: { x: 10, y: 20, width: 0, height: 10 } }), 10, 25).hit, false);
});

test("closed stroke, dash gaps and pointer/touch slop refer to painted CSS footprints", () => {
  const stroke = { width: 4 }, paint = { fill: false, stroke, opacity: 1 };
  const a = prepare(rectangle, { paint }), b = prepare(circle, { paint });
  assert.equal(query(a, 20, 25, { slop: 0 }).hit, false);
  assert.equal(query(a, 10, 25, { slop: 0 }).hit, true);
  assert.equal(query(b, 20, 20).hit, false); assert.equal(query(b, 31, 20, { slop: 0 }).hit, true);
  assert.equal(query(b, 36, 20).hit, false); assert.equal(query(b, 36, 20, { pointerType: "touch" }).hit, true);
  const dashed = prepare(line, { paint: { fill: false, stroke: { width: 2, dash: [4, 8] }, opacity: 1 } });
  assert.equal(query(dashed, 12, 20, { slop: 0 }).hit, true);
  assert.equal(query(dashed, 18, 20).hit, false); assert.equal(query(dashed, 18, 20, { pointerType: "touch" }).hit, true);
});

test("compound paths retain evenodd/nonzero holes, islands, open closure and curve tolerance", () => {
  const shape = prepare(path);
  for (const [x, y, hit] of [[2, 1, true], [5, 5, false], [13, 1, true], [18, 1, false]]) assert.equal(query(shape, x, y).hit, hit);
  assert.equal(query(prepare({ ...path, fillRule: "nonzero" }), 5, 5).hit, true);
  const open = { type: "path", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 10, y: 0 }, { op: "L", x: 5, y: 10 }], fillRule: "nonzero" };
  assert.equal(query(prepare(open), 5, 2).hit, true);
  const curved = { type: "path", commands: [{ op: "M", x: 0, y: 0 }, { op: "C", x1: 0, y1: 10, x2: 10, y2: 10, x: 10, y: 0 }, { op: "Z" }], fillRule: "nonzero" };
  assert.equal(query(prepare(curved), 5, 5).hit, true); assert.equal(query(prepare(curved), 5, 9).hit, false);
});

test("nested transformed clips intersect exact geometry before any stroke slop", () => {
  const transform = [0, 2, -2, 0, 100, 20];
  const clips = [{ geometry: path, transform }, { geometry: { type: "rect", rect: { x: 0, y: 0, width: 15, height: 8 } }, transform }];
  const shape = prepare({ type: "rect", rect: { x: -10, y: -10, width: 40, height: 40 } }, { transform, clips });
  assert.equal(query(shape, 98, 24).hit, true); assert.equal(query(shape, 90, 30).hit, false);
  assert.equal(query(shape, 98, 46).hit, true); assert.equal(query(shape, 82, 24).hit, false);
  const stroke = prepare(line, { paint: { fill: false, stroke: { width: 4 }, opacity: 1 },
    clips: [{ geometry: rectangle, transform: identity }] });
  assert.equal(query(stroke, 9, 20, { slop: 100 }).hit, false);
  assert.equal(query(stroke, 11, 20).hit, true);
});

test("text uses individual explicit metric boxes and image uses its transformed viewport", () => {
  const text = { type: "text", boxes: [{ x: 10, y: 10, width: 10, height: 5 }, { x: 10, y: 25, width: 10, height: 5 }] };
  const rotated = prepare(text, { transform: [0, 1, -1, 0, 100, 0] });
  assert.equal(query(rotated, 88, 15).hit, true); assert.equal(query(rotated, 80, 15).hit, false);
  assert.equal(query(rotated, 72, 15).hit, true);
  assert.equal(prepare({ type: "text", boxes: [] }).bounds, null);
  assert.throws(() => prepare({ type: "text" }), /exactly/);
  const image = prepare({ type: "image", rect: { x: 0, y: 0, width: 10, height: 20 } }, { transform: [-2, 0, 0, 3, 50, 10] });
  assert.equal(query(image, 40, 40).hit, true); assert.equal(query(image, 29, 40).hit, false);
});

test("transparent fill remains hittable, absent fill is not, and invisible shapes remain clipped", () => {
  // The adapter resolves transparent paint to fill:true and the none sentinel to fill:false.
  assert.equal(query(prepare(rectangle), 20, 25).hit, true);
  const none = prepare(rectangle, { paint: { fill: false, stroke: null, opacity: 1 } });
  assert.equal(none.bounds, null); assert.equal(query(none, 20, 25).hit, false);
  const invisible = prepare(rectangle, { paint: { fill: true, stroke: null, opacity: 0 },
    clips: [{ geometry: { type: "rect", rect: { x: 10, y: 20, width: 5, height: 5 } }, transform: identity }] });
  assert.equal(query(invisible, 12, 22).hit, false); assert.equal(query(invisible, 12, 22, { hitInvisible: true }).hit, true);
  assert.equal(query(invisible, 25, 25, { hitInvisible: true }).hit, false);
});

test("native pixels independently confirm transformed fill/stroke/cap/clip interiors", () => {
  const transform = [-1.5, 0.5, 0.25, 1.2, 70, 8], geometries = [rectangle, circle, line];
  let checked = 0;
  for (const geometry of geometries) {
    const paint = { fill: geometry.type !== "line", stroke: { width: 4, lineCap: "square", lineJoin: "miter", dash: geometry.type === "line" ? [6, 8] : [] }, opacity: 1 };
    const shape = prepare(geometry, { transform, paint }), canvas = createCanvas(100, 100), context = canvas.getContext("2d");
    context.setTransform(...transform); context.fillStyle = "black"; context.strokeStyle = "black"; context.lineWidth = 4;
    context.lineCap = "square"; context.lineJoin = "miter"; context.setLineDash(paint.stroke.dash); context.beginPath();
    if (geometry.type === "rect") { const r = geometry.rect; context.rect(r.x, r.y, r.width, r.height); }
    else if (geometry.type === "circle") context.arc(geometry.x, geometry.y, geometry.radius, 0, 2 * Math.PI);
    else { context.moveTo(geometry.from.x, geometry.from.y); context.lineTo(geometry.to.x, geometry.to.y); }
    if (paint.fill) context.fill(); context.stroke();
    for (let y = 5; y < 75; y += 7) for (let x = 10; x < 85; x += 7) {
      const alpha = context.getImageData(x, y, 1, 1).data[3]; if (alpha !== 0 && alpha !== 255) continue;
      assert.equal(query(shape, x + 0.5, y + 0.5, { slop: 0 }).hit, alpha === 255, `${geometry.type}/${x}/${y}`); checked++;
    }
  }
  assert.ok(checked > 250);
});

test("singular transforms are diagnosed and malformed inactive inputs remain errors", () => {
  const singular = prepare(circle, { transform: [0, 0, 0, 1, 0, 0] });
  assert.equal(query(singular, 0, 20, { hitInvisible: true }).hit, false);
  assert.equal(singular.diagnostics[0].code, "hit-transform-singular");
  const clipSingular = prepare(rectangle, { clips: [{ geometry: rectangle, transform: [0, 0, 0, 0, 0, 0] }] });
  assert.equal(query(clipSingular, 20, 25).hit, false);
  for (const geometry of [{ type: "unknown" }, { type: "circle", x: 0, y: 0, radius: -1 },
    { type: "rect", rect: { x: 0, y: 0, width: Infinity, height: 1 } }, { type: "line", from: { x: NaN, y: 0 }, to: { x: 1, y: 1 } }]) {
    assert.throws(() => prepare(geometry, { paint: { fill: false, stroke: null, opacity: 0 } }));
  }
  assert.throws(() => prepare({ type: "text", boxes: [] }, { paint: { fill: true, stroke: { width: -1 }, opacity: 0 } }));
  assert.throws(() => prepare(rectangle, { paint: { fill: 1, stroke: null, opacity: 1 } }));
  assert.throws(() => prepare(rectangle, { paint: { fill: true, stroke: null, opacity: 2 } }));
  assert.throws(() => prepare(rectangle, { clips: [{ geometry: circle, transform: identity }] }), /rect or path/);
  assert.throws(() => hitShape({}, { x: 0, y: 0 }), /prepared/);
});

test("query defaults and closed options reject invalid values and never execute getters", () => {
  assert.deepEqual(normalizeHitQuery(), { pointerType: "mouse", slop: 3, hitInvisible: false });
  assert.equal(normalizeHitQuery({ pointerType: "touch" }).slop, 6); assert.equal(normalizeHitQuery({ pointerType: "pen" }).slop, 3);
  for (const options of [{ slop: -1 }, { slop: NaN }, { pointerType: "wheel" }, { hitInvisible: 1 }, { unknown: 1 }]) assert.throws(() => query(prepare(rectangle), 20, 25, options));
  let calls = 0;
  assert.throws(() => prepareHitShape({ ...config(rectangle), get transform() { calls++; return identity; } }));
  assert.throws(() => prepare({ type: "text", boxes: [{ x: 0, y: 0, get width() { calls++; return 10; }, height: 1 }] }));
  assert.throws(() => normalizeHitQuery({ get slop() { calls++; return 3; } }));
  assert.equal(calls, 0);
});

test("shape preparation bounds work, preserves inputs and freezes cached geometry", () => {
  assert.throws(() => prepare(rectangle, { clips: new Array(MAX_HIT_CLIPS + 1) }), /budget/);
  assert.throws(() => prepare({ type: "text", boxes: new Array(MAX_HIT_SHAPE_PARTS + 1) }), /budget/);
  assert.throws(() => prepare(rectangle, { transform: [1e308, 1e308, 1e308, 1e308, 0, 0] }), /precision/);
  const input = config(structuredClone(rectangle)), before = structuredClone(input), prepared = prepareHitShape(input);
  assert.deepEqual(input, before); assert.ok(Object.isFrozen(prepared) && Object.isFrozen(prepared.bounds) && Object.isFrozen(prepared.diagnostics));
  input.transform[4] = 100; input.geometry.rect.x = 100;
  assert.equal(query(prepared, 20, 25).hit, true);
});
