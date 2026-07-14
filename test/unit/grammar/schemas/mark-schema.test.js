import assert from "node:assert/strict";
import test from "node:test";

import {
  getPointGraphicType,
  validatePointShape
} from "../../../../src/grammar/schemas/mark.js";
import {
  POINT_SHAPES,
  createPointShapeGraphic
} from "../../../../src/grammar/pointShapes.js";

function polygonArea(points) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function graphicArea(graphic) {
  if (graphic.type === "circle") {
    return Math.PI * graphic.properties.radius ** 2;
  }
  if (graphic.type === "rect") {
    return graphic.properties.width * graphic.properties.height;
  }
  return polygonArea(graphic.properties.points);
}

test("maps the supported point shape to its graphic primitive", () => {
  assert.equal(validatePointShape("circle"), "circle");
  assert.equal(getPointGraphicType("circle"), "circle");
  assert.equal(validatePointShape("square"), "square");
  assert.equal(getPointGraphicType("square"), "rect");
  for (const shape of POINT_SHAPES.slice(2)) {
    assert.equal(validatePointShape(shape), shape);
    assert.equal(getPointGraphicType(shape), "path");
  }
});

test("normalizes every point-shape recipe to one target area", () => {
  const area = 144;
  const graphics = POINT_SHAPES.map(shape => createPointShapeGraphic({
    shape,
    x: 20,
    y: 30,
    area,
    fill: "#123456"
  }));

  assert.deepEqual(
    graphics.map(graphic => graphic.type),
    ["circle", "rect", ...Array(10).fill("path")]
  );
  assert.equal(
    graphics.every(graphic => Math.abs(graphicArea(graphic) - area) < 1e-9),
    true
  );
  assert.equal(
    graphics.slice(2).every(graphic => graphic.properties.closed === true),
    true
  );
});

test("rejects unsupported point shapes", () => {
  assert.throws(() => validatePointShape("triangle"), /Unsupported point shape/);
  assert.throws(() => validatePointShape(undefined), /Unsupported point shape/);
  assert.throws(
    () => createPointShapeGraphic({
      shape: "circle", x: 0, y: 0, area: -1, fill: "red"
    }),
    /non-negative area/
  );
});
