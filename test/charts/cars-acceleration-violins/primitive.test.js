import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { calculateCategoricalDensity } from
  "../../oracles/categorical-density.js";
import { createMockCanvasContext, findCanvasCalls } from
  "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import { walkGraphicDrawOrder } from
  "../../../src/grammar/schemas/graphicTree.js";
import { createCarsViolinPrimitiveResult } from "./primitive.program.js";
import {
  ERA_DOMAIN,
  ORIGIN_DOMAIN,
  VALUE_DOMAIN,
  createCarsViolinValues,
  prepareViolinCars
} from "./reference-values.js";

const cars = loadCars();

test("locks independent categorical density profiles and literal anchors", () => {
  const rows = prepareViolinCars(cars);
  const result = calculateCategoricalDensity(rows, {
    valueField: "Acceleration",
    categoryField: "Origin",
    bandwidth: 0.65,
    extent: VALUE_DOMAIN,
    steps: 80
  });

  assert.deepEqual(result.categories, ORIGIN_DOMAIN);
  assert.equal(result.eligibleCount, 406);
  assert.deepEqual(result.profiles.map(profile => profile.count), [254, 73, 79]);
  assert.equal(result.profiles.every(profile => profile.samples.length === 80), true);
  assert.deepEqual(
    result.profiles[0].samples.filter((_, index) => [0, 40, 79].includes(index))
      .map(sample => [sample.value, sample.density]),
    [
      [8, 0.009593384431583219],
      [16.60759493670886, 0.12068885855316809],
      [25, 5.666740625734379e-7]
    ]
  );
  assert.equal(result.profiles.every(profile =>
    profile.samples.every(sample => sample.density >= 0)
  ), true);
});

test("builds symmetric full violins inside their category bands", () => {
  const values = createCarsViolinValues(cars);
  assert.equal(values.paths.length, 3);
  assert.deepEqual(values.paths.map(path => path.category), ORIGIN_DOMAIN);

  for (const [pathIndex, path] of values.paths.entries()) {
    const center = values.centers[pathIndex].x;
    const left = path.points.slice(0, 80);
    const right = [...path.points.slice(80)].reverse();
    assert.equal(left.length, right.length);
    for (let index = 0; index < left.length; index += 1) {
      assert.ok(Math.abs((center - left[index].x) - (right[index].x - center)) < 1e-9);
      assert.equal(left[index].y, right[index].y);
    }
    assert.equal(path.points.every(point =>
      point.x >= values.bounds.left && point.x <= values.bounds.right &&
      point.y >= values.bounds.top && point.y <= values.bounds.bottom
    ), true);
  }
});

test("builds six split halves with deterministic era sides and counts", () => {
  const values = createCarsViolinValues(cars, { split: true });
  assert.equal(values.paths.length, 6);
  assert.deepEqual(values.density.splitDomain, ERA_DOMAIN);
  assert.deepEqual(
    values.paths.map(path => [path.category, path.split, path.count]),
    [
      ["USA", ERA_DOMAIN[0], 151],
      ["USA", ERA_DOMAIN[1], 103],
      ["Europe", ERA_DOMAIN[0], 43],
      ["Europe", ERA_DOMAIN[1], 30],
      ["Japan", ERA_DOMAIN[0], 29],
      ["Japan", ERA_DOMAIN[1], 50]
    ]
  );

  for (const path of values.paths) {
    const center = values.centers.find(item => item.category === path.category).x;
    assert.equal(path.points.every(point => path.side === "left"
      ? point.x <= center
      : point.x >= center
    ), true);
  }
});

test("keeps one-sided vertical profiles on their requested physical side", () => {
  for (const side of ["left", "right"]) {
    const values = createCarsViolinValues(cars, { side });
    for (const path of values.paths) {
      const center = values.centers.find(item => item.category === path.category).x;
      assert.equal(path.points.every(point => side === "left"
        ? point.x <= center
        : point.x >= center
      ), true);
    }
  }
});

test("resolves width maxima and count normalization deterministically", () => {
  const shared = createCarsViolinValues(cars, { resolve: "shared" });
  const independent = createCarsViolinValues(cars, { resolve: "independent" });
  const halfBand = independent.bounds.width / ORIGIN_DOMAIN.length * 0.8 / 2;
  const maximumWidth = (path, center) => Math.max(
    ...path.points.map(point => Math.abs(point.x - center))
  );

  assert.equal(independent.paths.every((path, index) =>
    Math.abs(maximumWidth(path, independent.centers[index].x) - halfBand) < 1e-9
  ), true);
  assert.equal(shared.paths.some((path, index) =>
    maximumWidth(path, shared.centers[index].x) < halfBand - 1
  ), true);

  const rows = prepareViolinCars(cars);
  const unit = calculateCategoricalDensity(rows, {
    valueField: "Acceleration",
    categoryField: "Origin",
    bandwidth: 0.65,
    extent: VALUE_DOMAIN,
    steps: 20,
    normalization: "unit"
  });
  const count = calculateCategoricalDensity(rows, {
    valueField: "Acceleration",
    categoryField: "Origin",
    bandwidth: 0.65,
    extent: VALUE_DOMAIN,
    steps: 20,
    normalization: "count"
  });
  assert.equal(unit.profiles.every((profile, profileIndex) =>
    profile.samples.every((sample, sampleIndex) => Math.abs(
      count.profiles[profileIndex].samples[sampleIndex].density -
      sample.density * profile.count
    ) < 1e-9)
  ), true);
});

test("authors complete primitive trees and renders from graphicSpec alone", () => {
  for (const split of [false, true]) {
    const { program, values } = createCarsViolinPrimitiveResult(cars, { split });
    const paths = program.graphicSpec.objects.violins.items;
    assert.equal(paths.length, split ? 6 : 3);
    assert.equal(paths.every(path =>
      path.properties.commands[0].op === "M" &&
      path.properties.commands.at(-1).op === "Z"
    ), true);
    assert.equal(program.trace.children.some(node =>
      ["createViolinPlot", "encodeDensity"].includes(node.op)
    ), false);

    const order = [];
    walkGraphicDrawOrder(program.graphicSpec, ({ id }) => order.push(id));
    assert.ok(order.indexOf("horizontalGridLines") < order.indexOf("violins"));
    assert.ok(order.indexOf("violins") < order.indexOf("xAxisLine"));
    assert.ok(order.indexOf("violins") < order.indexOf("yAxisLine"));
    assert.equal(order.includes("colorLegendSymbols"), split);
    assert.equal(
      program.graphicSpec.objects.yAxisTitle.properties.rotation,
      -Math.PI / 2
    );

    const context = createMockCanvasContext();
    render({
      graphicSpec: program.graphicSpec,
      get semanticSpec() {
        throw new Error("Primitive renderer must not read semanticSpec.");
      }
    }, context);
    assert.equal(findCanvasCalls(context, "fill").length, values.paths.length);
    assert.equal(context.canvas.width, values.layout.width);
    assert.equal(context.canvas.height, values.layout.height);
  }
});

test("owns Cars rows and rejects invalid categorical-density contracts", () => {
  const input = cars.map(row => ({ ...row }));
  const before = structuredClone(input);
  const { program } = createCarsViolinPrimitiveResult(input, { split: true });
  assert.deepEqual(input, before);
  input[0].Acceleration = 999;
  assert.notEqual(program.semanticSpec.datasets[0].values[0].Acceleration, 999);

  assert.throws(
    () => calculateCategoricalDensity([], { valueField: "value" }),
    /at least one finite value/
  );
  assert.throws(
    () => calculateCategoricalDensity(
      [{ value: 1, split: "A" }, { value: 2, split: "B" }, { value: 3, split: "C" }],
      { valueField: "value", splitField: "split", bandwidth: 1 }
    ),
    /exactly two/
  );
  assert.throws(
    () => createCarsViolinValues(cars, { band: 1.1 }),
    /band/
  );
  assert.throws(
    () => createCarsViolinValues(cars, { resolve: "local" }),
    /resolve/
  );
  assert.throws(
    () => createCarsViolinValues(cars, { split: true, side: "left" }),
    /cannot also request/
  );
});
