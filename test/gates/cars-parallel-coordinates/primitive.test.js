import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { walkGraphicDrawOrder } from
  "../../../src/grammar/schemas/graphicTree.js";
import { calculateParallelCoordinates } from
  "../../oracles/parallel-coordinates.js";
import { createMockCanvasContext, findCanvasCalls } from
  "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import { createCarsParallelPrimitiveResult } from "./primitive.program.js";
import {
  PARALLEL_COLORS,
  createCarsParallelValues
} from "./reference-values.js";

const cars = loadCars();

test("locks literal mixed-dimension projection anchors", () => {
  const result = calculateParallelCoordinates([
    { id: "a", amount: 0, grade: "high", score: 50 },
    { id: "b", amount: 10, grade: "low", score: 100 }
  ], {
    dimensions: [
      { field: "amount", scale: { domain: [0, 10] } },
      { field: "grade", fieldType: "ordinal", scale: { domain: ["low", "high"] } },
      { field: "score", scale: { domain: [0, 100] } }
    ],
    bounds: { left: 10, right: 110, top: 20, bottom: 220 },
    key: "id"
  });

  assert.deepEqual(result.axes.map(axis => [axis.field, axis.x, axis.domain]), [
    ["amount", 10, [0, 10]],
    ["grade", 60, ["low", "high"]],
    ["score", 110, [0, 100]]
  ]);
  assert.deepEqual(result.items[0].vertices.map(vertex => [vertex.x, vertex.y]), [
    [10, 220],
    [60, 20],
    [110, 120]
  ]);
  assert.deepEqual(result.items[0].commands.map(command => command.op), ["M", "L", "L"]);
});

test("defines break, drop-row, error, key and dimension boundaries independently", () => {
  const rows = [
    { id: "a", a: 0, b: null, c: 5, d: 10 },
    { id: "b", a: 10, b: 3, c: 2, d: 0 }
  ];
  const options = {
    dimensions: ["a", "b", "c", "d"],
    bounds: { left: 0, right: 90, top: 0, bottom: 100 },
    key: "id"
  };
  const broken = calculateParallelCoordinates(rows, options);
  assert.deepEqual(broken.items[0].fragments.map(fragment => fragment.length), [1, 2]);
  assert.deepEqual(broken.items[0].commands.map(command => command.op), ["M", "L"]);

  const dropped = calculateParallelCoordinates(rows, { ...options, missing: "drop-row" });
  assert.deepEqual(dropped.items.map(item => item.key), ["b"]);
  assert.throws(
    () => calculateParallelCoordinates(rows, { ...options, missing: "error" }),
    /missing dimension/
  );
  assert.throws(
    () => calculateParallelCoordinates([{ id: "a", a: 1, b: 2 }, { id: "a", a: 2, b: 3 }], {
      dimensions: ["a", "b"],
      bounds: options.bounds,
      key: "id"
    }),
    /Duplicate parallel key/
  );
  assert.throws(
    () => calculateParallelCoordinates(rows, {
      dimensions: ["a", "a"],
      bounds: options.bounds
    }),
    /unique fields/
  );
});

test("resolves the Cars axes, rows and missing fragments deterministically", () => {
  const values = createCarsParallelValues(cars);
  assert.equal(values.rows.length, 35);
  assert.deepEqual(values.axes.map(axis => axis.domain), [
    [5, 30],
    [0, 250],
    [1000, 5000],
    [6, 21]
  ]);
  assert.deepEqual(values.axes.map(axis => axis.x), [
    78,
    285.33333333333337,
    492.6666666666667,
    700
  ]);
  assert.equal(values.paths.length, 35);
  assert.equal(values.paths.filter(path => path.fragments.length > 1).length, 0);
  assert.equal(values.paths.filter(path => path.vertices[0] === undefined).length, 6);
  assert.equal(values.paths.every(path => path.commands.length >= 3), true);
  assert.deepEqual(new Set(values.paths.map(path => path.stroke)), new Set(
    Object.values(PARALLEL_COLORS)
  ));
});

test("authors a renderer-neutral primitive Parallel tree", () => {
  const input = cars.map(row => ({ ...row }));
  const before = structuredClone(input);
  const { program, values } = createCarsParallelPrimitiveResult(input);
  assert.deepEqual(input, before);
  input.find(row => row.Year === "1970-01-01").Horsepower = 999;
  assert.notEqual(program.semanticSpec.datasets[0].values[0].Horsepower, 999);

  const paths = program.graphicSpec.objects.parallelLines.items;
  assert.equal(paths.length, 35);
  assert.equal(paths.every(path =>
    path.properties.commands[0].op === "M" &&
    path.properties.commands.slice(1).every(command => ["M", "L"].includes(command.op))
  ), true);
  assert.equal(program.graphicSpec.objects.parallelAxisLines.items.length, 4);
  assert.equal(program.graphicSpec.objects.parallelAxisTitles.items.length, 4);
  assert.equal(program.graphicSpec.objects.originLegendSymbols.items.length, 3);
  assert.equal(program.trace.children.some(node =>
    ["createParallelCoordinates", "encodeParallelCoordinates"].includes(node.op)
  ), false);

  const order = [];
  walkGraphicDrawOrder(program.graphicSpec, ({ id }) => order.push(id));
  assert.ok(order.indexOf("parallelLines") < order.indexOf("parallelAxisLines"));
  assert.ok(order.indexOf("parallelAxisLines") < order.indexOf("parallelAxisLabels"));

  const context = createMockCanvasContext();
  render({
    graphicSpec: program.graphicSpec,
    get semanticSpec() {
      throw new Error("Primitive renderer must not read semanticSpec.");
    }
  }, context);
  assert.equal(context.canvas.width, values.layout.width);
  assert.equal(context.canvas.height, values.layout.height);
  assert.ok(findCanvasCalls(context, "stroke").length >= paths.length + 4);
});
