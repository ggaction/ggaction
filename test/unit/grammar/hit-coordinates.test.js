import assert from "node:assert/strict";
import test from "node:test";
import { MAX_HIT_TRANSFORMS, resolveHitCoordinates, transformHitPoint } from "../../../src/grammar/hitCoordinates.js";
import { pathFillContains } from "../../../src/grammar/pathGeometry.js";

const identity = [1, 0, 0, 1, 0, 0];
const options = overrides => ({ point: { x: 120, y: 80 }, rect: { left: 30, top: 40, width: 200, height: 120 },
  rootTransform: [0, 2, -2, 0, 100, 20], childTransforms: [[-1, 0, 0, 1, 12, 4]], ...overrides });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test("client translation, rotation and a negative child scale resolve a literal CSS point", () => {
  const actual = resolveHitCoordinates(options());
  assert.deepEqual(actual, { screenPoint: { x: 90, y: 40 }, localPoint: { x: 2, y: 1 }, diagnostics: [] });
  assert.deepEqual(transformHitPoint(options().rootTransform, { x: 10, y: 5 }), actual.screenPoint);
  assert.deepEqual(transformHitPoint(options().childTransforms[0], actual.localPoint), { x: 10, y: 5 });
  for (const pixelRatio of [1, 2, 3]) {
    const backing = { width: 200 * pixelRatio, height: 120 * pixelRatio };
    assert.equal(backing.width / pixelRatio, 200);
    assert.deepEqual(resolveHitCoordinates(options()), actual, "backing pixels do not enter the CSS calculation");
  }
  assert.throws(() => resolveHitCoordinates({ ...options(), pixelRatio: 2 }), /exactly/);
});

test("nested child transforms invert in the stored parent-to-child order", () => {
  const actual = resolveHitCoordinates(options({ point: { x: 116, y: 86 },
    childTransforms: [[-1, 0, 0, 1, 12, 4], [1, 0, 0, 1, -3, 2]] }));
  assert.deepEqual(actual.localPoint, { x: 2, y: 1 });
  const reflected = resolveHitCoordinates(options({ point: { x: 20, y: 10 },
    rect: { left: 0, top: 0, width: 100, height: 100 }, rootTransform: [-2, 0, 0, -5, 30, 35], childTransforms: [] }));
  assert.deepEqual(reflected.localPoint, { x: 5, y: 5 });
});

test("transformed clip queries preserve literal holes, islands and outside points", () => {
  const ring = values => values.map(([x, y], i) => ({ op: i === 0 ? "M" : "L", x, y })).concat({ op: "Z" });
  const clip = [...ring([[0, 0], [10, 0], [10, 10], [0, 10]]),
    ...ring([[3, 3], [7, 3], [7, 7], [3, 7]]), ...ring([[12, 0], [14, 0], [14, 2], [12, 2]])];
  for (const [client, local, expected] of [
    [{ x: 120, y: 80 }, { x: 2, y: 1 }, true],
    [{ x: 112, y: 74 }, { x: 5, y: 5 }, false],
    [{ x: 120, y: 58 }, { x: 13, y: 1 }, true],
    [{ x: 120, y: 48 }, { x: 18, y: 1 }, false]
  ]) {
    const result = resolveHitCoordinates(options({ point: client }));
    assert.deepEqual(result.localPoint, local);
    assert.equal(pathFillContains(clip, result.localPoint, { fillRule: "evenodd" }), expected);
  }
});

test("rotation/scale/translation inverses round-trip independently generated trigonometric points", () => {
  for (let i = 1; i <= 100; i++) {
    const theta = i * Math.PI / 29, cosine = Math.cos(theta), sine = Math.sin(theta);
    const x = i - 50, y = i % 13 - 6, scaleX = i % 2 ? -2 : 3, scaleY = i % 3 ? 4 : -5;
    const px = cosine * (scaleX * x) - sine * (scaleY * y) + 40;
    const py = sine * (scaleX * x) + cosine * (scaleY * y) - 10;
    const actual = resolveHitCoordinates({ point: { x: px + 30, y: py + 20 },
      rect: { left: 30, top: 20, width: 200, height: 200 },
      rootTransform: [cosine * scaleX, sine * scaleX, -sine * scaleY, cosine * scaleY, 40, -10], childTransforms: [] });
    assert.deepEqual(actual.diagnostics, []); near(actual.localPoint.x, x); near(actual.localPoint.y, y);
  }
});

test("row-conditioned inverses accept large, tiny and unequal finite axes", () => {
  for (const [matrix, point, expected] of [
    [[1e308, 0, 0, 1e308, 0, 0], { x: 1e308, y: -1e308 }, { x: 1, y: -1 }],
    [[1e-308, 0, 0, 1e-308, 0, 0], { x: 1e-308, y: -1e-308 }, { x: 1, y: -1 }],
    [[1e308, 0, 0, 1e-308, 0, 0], { x: 1e308, y: 1e-308 }, { x: 1, y: 1 }],
    [[1e308, 0, 0, 1e308, -1e308, -1e308], { x: 1e308, y: 1e308 }, { x: 2, y: 2 }]
  ]) {
    const result = resolveHitCoordinates(options({ point, rect: { left: 0, top: 0, width: 1, height: 1 }, rootTransform: matrix, childTransforms: [] }));
    assert.deepEqual(result, { screenPoint: point, localPoint: expected, diagnostics: [] });
  }
});

test("singular, empty and non-finite numerical results return explicit no-hit diagnostics", () => {
  for (const matrix of [[0, 0, 0, 1, 0, 0], [1, 0, 0, 0, 0, 0], [1, 2, 2, 4, 0, 0]]) {
    const actual = resolveHitCoordinates(options({ rootTransform: matrix }));
    assert.equal(actual.localPoint, null); assert.deepEqual(actual.diagnostics, [{ code: "hit-transform-singular", transformIndex: 0 }]);
  }
  const child = resolveHitCoordinates(options({ childTransforms: [identity, [1, 2, 2, 4, 0, 0]] }));
  assert.deepEqual(child.diagnostics, [{ code: "hit-transform-singular", transformIndex: 2 }]);
  for (const rect of [{ left: 0, top: 0, width: 0, height: 1 }, { left: 0, top: 0, width: 1, height: 0 }]) {
    assert.deepEqual(resolveHitCoordinates(options({ rect })).diagnostics, [{ code: "hit-empty-viewport", transformIndex: -1 }]);
  }
  const overflow = resolveHitCoordinates(options({ rootTransform: [Number.MIN_VALUE, 0, 0, 1, 0, 0] }));
  assert.equal(overflow.localPoint, null); assert.equal(overflow.diagnostics[0].code, "hit-coordinate-overflow");
  const clientOverflow = resolveHitCoordinates(options({ point: { x: 1e308, y: 0 }, rect: { left: -1e308, top: 0, width: 1, height: 1 } }));
  assert.deepEqual(clientOverflow, { screenPoint: null, localPoint: null, diagnostics: [{ code: "hit-coordinate-overflow", transformIndex: -1 }] });
  assert.throws(() => transformHitPoint([1e308, 0, 0, 1, 0, 0], { x: 2, y: 0 }), /overflow/);
});

test("explicit own-data boundaries reject invalid inputs without invoking getters", () => {
  for (const point of [null, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: 0 }, { x: 0, y: 0, z: 1 }]) {
    assert.throws(() => resolveHitCoordinates(options({ point })));
  }
  for (const rootTransform of [null, [1], [1, 0, 0, 1, 0, NaN], [1, 0, 0, 1, 0, Infinity], [1, , 0, 1, 0, 0]]) {
    assert.throws(() => resolveHitCoordinates(options({ rootTransform })));
  }
  for (const rect of [{ left: 0, top: 0, width: -1, height: 1 }, { left: 0, top: NaN, width: 1, height: 1 },
    { left: 1e308, top: 0, width: 1e308, height: 1 }, { left: 0, top: 1e308, width: 1, height: 1e308 }]) {
    assert.throws(() => resolveHitCoordinates(options({ rect })), /rectangle/);
  }
  let calls = 0;
  const point = { x: 1, get y() { calls++; return 1; } };
  const transform = [1, 0, 0, 1, 0, 0]; Object.defineProperty(transform, "2", { get() { calls++; return 0; } });
  const inherited = Object.create({ get x() { calls++; return 1; } }); inherited.y = 1;
  for (const input of [options({ point }), options({ point: inherited }), options({ rootTransform: transform }),
    options({ rootTransform: [0, 0, 0, 0, 0, 0], childTransforms: [transform] })]) assert.throws(() => resolveHitCoordinates(input));
  assert.equal(calls, 0, "all branches validate before attempting inverses");
  assert.throws(() => resolveHitCoordinates({ ...options(), unknown: true }), /exactly/);
  assert.throws(() => resolveHitCoordinates(options({ childTransforms: [identity, , identity] })), /dense/);
});

test("work is bounded and caller input and frozen results remain independent", () => {
  for (const childTransforms of [null, new Array(MAX_HIT_TRANSFORMS + 1)]) {
    assert.throws(() => resolveHitCoordinates(options({ childTransforms })), /at most/);
  }
  const input = options({ childTransforms: Array.from({ length: MAX_HIT_TRANSFORMS }, () => [...identity]) });
  const before = structuredClone(input), result = resolveHitCoordinates(input);
  assert.deepEqual(input, before); assert.deepEqual(result.localPoint, { x: 10, y: 5 });
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.screenPoint) && Object.isFrozen(result.localPoint) && Object.isFrozen(result.diagnostics));
  input.point.x = 1; input.rootTransform[4] = 3; assert.deepEqual(result.localPoint, { x: 10, y: 5 });
  const failed = resolveHitCoordinates(options({ rootTransform: [0, 0, 0, 0, 0, 0] }));
  assert.ok(Object.isFrozen(failed.diagnostics[0]));
  assert.deepEqual(transformHitPoint(identity, { x: -0, y: -0 }), { x: 0, y: 0 });
});
