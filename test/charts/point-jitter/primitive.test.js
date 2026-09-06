import assert from "node:assert/strict";
import test from "node:test";

import { loadCars, loadGapminder } from "../../support/data.js";
import {
  CARS_JITTER_LAYOUT,
  GAPMINDER_JITTER_LAYOUT
} from "./fixture.js";
import {
  createCarsOriginJitterPrimitiveResult,
  createGapminderClusterJitterPrimitiveResult
} from "./primitive.program.js";

function centers(program, property) {
  return program.graphicSpec.objects.observations.items.map(
    item => item.properties[property]
  );
}

test("authors a keyed vertical Cars jitter primitive without changing y meaning", () => {
  const result = createCarsOriginJitterPrimitiveResult(loadCars());
  assert.equal(result.rows.length, 78);
  assert.equal(new Set(result.rows.map(row => row.Name)).size, 78);
  assert.deepEqual(
    centers(result.program, "y"),
    centers(result.base, "y")
  );
  assert.deepEqual(centers(result.program, "x"), result.resolution.final);
  assert.equal(result.program.semanticSpec.layers[0].encoding.x.field, "Origin");
  assert.equal(result.program.semanticSpec.layers[0].encoding.y.field, "Acceleration");
  assert.equal(Math.max(...result.resolution.offsets.map(Math.abs)) <= result.maximum, true);
  assert.equal(
    result.program.trace.children.some(node => node.op === "createStripPlot"),
    false
  );
  const extent = CARS_JITTER_LAYOUT.radius;
  assert.equal(centers(result.program, "x").every(value =>
    value - extent >= CARS_JITTER_LAYOUT.plot.left &&
    value + extent <= CARS_JITTER_LAYOUT.plot.right
  ), true);
});

test("authors a keyed horizontal Gapminder jitter primitive without changing x meaning", () => {
  const result = createGapminderClusterJitterPrimitiveResult(loadGapminder());
  assert.equal(result.rows.length, 62);
  assert.equal(new Set(result.rows.map(row => row.country)).size, 62);
  assert.deepEqual(
    centers(result.program, "x"),
    centers(result.base, "x")
  );
  assert.deepEqual(centers(result.program, "y"), result.resolution.final);
  assert.equal(result.program.semanticSpec.layers[0].encoding.x.field, "life_expect");
  assert.equal(result.program.semanticSpec.layers[0].encoding.y.field, "cluster");
  assert.equal(Math.max(...result.resolution.offsets.map(Math.abs)) <= result.maximum, true);
  const extent = GAPMINDER_JITTER_LAYOUT.radius;
  assert.equal(centers(result.program, "y").every(value =>
    value - extent >= GAPMINDER_JITTER_LAYOUT.plot.top &&
    value + extent <= GAPMINDER_JITTER_LAYOUT.plot.bottom
  ), true);
});

test("keeps keyed primitive offsets stable across repeated and reordered rows", () => {
  const rows = loadGapminder();
  const first = createGapminderClusterJitterPrimitiveResult(rows);
  const second = createGapminderClusterJitterPrimitiveResult(rows);
  const reordered = createGapminderClusterJitterPrimitiveResult([...rows].reverse());
  assert.deepEqual(first.resolution.offsets, second.resolution.offsets);
  assert.deepEqual(first.program.graphicSpec, second.program.graphicSpec);
  const offsetByCountry = result => new Map(result.rows.map(
    (row, index) => [row.country, result.resolution.offsets[index]]
  ));
  assert.deepEqual(offsetByCountry(reordered), offsetByCountry(first));
});
