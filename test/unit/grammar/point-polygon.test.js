import assert from "node:assert/strict";
import test from "node:test";
import { normalizePointPolygon, pointPolygonArea } from "../../../src/grammar/pointPolygon.js";
import { createPointShapeGraphic, resolvePointShapeExtent, validatePointShape } from "../../../src/grammar/pointShapes.js";

const polygon = pairs => ({ polygon: pairs.map(([x, y]) => ({ x, y })) });
const triangle = polygon([[-1.5, -1.5], [1.5, -1.5], [0, 1.5]]);
const plus = polygon([[-.5, -1.5], [.5, -1.5], [.5, -.5], [1.5, -.5], [1.5, .5], [.5, .5], [.5, 1.5], [-.5, 1.5], [-.5, .5], [-1.5, .5], [-1.5, -.5], [-.5, -.5]]);

test("simple concave polygons and either winding preserve independent literal areas", () => {
  assert.equal(pointPolygonArea(triangle.polygon), 4.5);
  assert.equal(pointPolygonArea(plus.polygon), 5);
  for (const shape of [triangle, plus]) {
    assert.deepEqual(normalizePointPolygon(shape), shape);
    assert.equal(pointPolygonArea(normalizePointPolygon({ polygon: [...shape.polygon].reverse() }).polygon), pointPolygonArea(shape.polygon));
  }
});

test("canonical closing vertex and immutable ownership never cache caller mutation", () => {
  const input = polygon([[0, 0], [2, 0], [0, 1], [0, 0]]);
  const normalized = normalizePointPolygon(input);
  assert.equal(normalized.polygon.length, 3);
  input.polygon[1].x = 4;
  assert.equal(normalized.polygon[1].x, 2);
  assert.equal(normalizePointPolygon(input).polygon[1].x, 4);
  assert.strictEqual(normalizePointPolygon(normalized), normalized);
  assert(Object.isFrozen(normalized) && Object.isFrozen(normalized.polygon[0]));
  const shallow = Object.freeze(polygon([[0, 0], [2, 0], [0, 1]]));
  normalizePointPolygon(shallow);
  shallow.polygon[1].x = 8;
  assert.equal(normalizePointPolygon(shallow).polygon[1].x, 8);
});

test("polygon area normalization preserves the original anchor and clockwise rotation", () => {
  for (const area of [0, 4.5, 18]) for (const angle of [0, 90, 270]) {
    const g = createPointShapeGraphic({ shape: triangle, x: 10, y: 20, area, angle, fill: "blue", stroke: "red", strokeWidth: 2, opacity: .6 });
    assert.equal(g.type, "path");
    assert.equal(g.properties.commands.length, 4);
    assert.equal(g.properties.commands[3].op, "Z");
    const scale = Math.sqrt(area / 4.5), r = angle * Math.PI / 180;
    triangle.polygon.forEach((p, i) => {
      assert.equal(g.properties.commands[i].op, i === 0 ? "M" : "L");
      assert.equal(g.properties.commands[i].x, 10 + (p.x * Math.cos(r) - p.y * Math.sin(r)) * scale);
      assert.equal(g.properties.commands[i].y, 20 + (p.x * Math.sin(r) + p.y * Math.cos(r)) * scale);
    });
    const extent = resolvePointShapeExtent({ shape: triangle, area, angle, strokeWidth: 2 });
    assert.equal(extent.x, Math.max(...g.properties.commands.slice(0, -1).map(p => Math.abs(p.x - 10))) + 1);
    assert.equal(extent.y, Math.max(...g.properties.commands.slice(0, -1).map(p => Math.abs(p.y - 20))) + 1);
  }
  const offCenter = createPointShapeGraphic({ shape: polygon([[0, 0], [2, 0], [0, 1]]), x: 10, y: 20, area: 1, fill: "blue" });
  assert.deepEqual(offCenter.properties.commands[0], { op: "M", x: 10, y: 20 });
});

test("polygon validation rejects invalid edges, topology and unbounded inputs", () => {
  const bad = [
    {}, { polygon: [] }, { polygon: [0, 1, 2] }, { ...triangle, unknown: 1 },
    { ...triangle, normalization: "auto" },
    { polygon: [...triangle.polygon, { x: 1, y: 2, z: 3 }] },
    polygon([[0, 0], [1, 0], [2, 0]]), polygon([[0, 0], [1, 1], [0, 1], [1, 0]]),
    polygon([[0, 0], [2, 0], [2, 2], [1, 0], [0, 2]]),
    polygon([[0, 0], [2, 0], [1, 0], [2, 2], [0, 2]]),
    polygon([[0, 0], [2, 0], [2, 0], [0, 2]]),
    polygon([[0, 0], [1_000_001, 0], [0, 1]]),
    polygon([[0, 0], [NaN, 0], [0, 1]]),
    { polygon: Array.from({ length: 1026 }, (_, i) => ({ x: i, y: i })) }
  ];
  for (const shape of bad) assert.throws(() => validatePointShape(shape));
});

test("explicit radius units retain literal glyph geometry in marks and legend-sized samples", () => {
  for (const radius of [0, Math.sqrt(30) / 2, 5]) {
    const g = createPointShapeGraphic({ shape: { ...triangle, normalization: "radius" },
      x: 10, y: 20, area: Math.PI * radius ** 2, fill: "blue" });
    triangle.polygon.forEach((p, i) => {
      assert.equal(g.properties.commands[i].x, 10 + p.x * radius);
      assert.equal(g.properties.commands[i].y, 20 + p.y * radius);
    });
  }
});

test("polygon vertex boundary and zero-area glyphs remain bounded and deterministic", () => {
  const shape = { polygon: Array.from({ length: 1024 }, (_, i) => ({ x: Math.cos(i * 2 * Math.PI / 1024), y: Math.sin(i * 2 * Math.PI / 1024) })) };
  assert.equal(normalizePointPolygon(shape).polygon.length, 1024);
  assert.throws(() => normalizePointPolygon({ polygon: [...shape.polygon, { x: 2, y: 2 }] }));
  const zero = createPointShapeGraphic({ shape, x: 2, y: 3, area: 0, fill: "blue" });
  assert(zero.properties.commands.slice(0, -1).every(c => c.x === 2 && c.y === 3));
  assert.throws(() => createPointShapeGraphic({ shape: polygon([[0, 0], [1e-100, 0], [0, 1e-100]]), x: 0, y: 0, area: 1e308, fill: "blue" }), /finite geometry/);
});
