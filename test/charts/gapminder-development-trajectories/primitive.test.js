import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext, findCanvasCalls } from "../../support/canvas.js";
import { loadGapminder } from "../../support/data.js";
import { graphicDrawOrder } from "../../support/graphic-tree.js";
import { linearCommandPoints } from "../../support/path.js";
import {
  TRAJECTORY_COUNTRIES,
  TRAJECTORY_YEARS
} from "./fixture.js";
import {
  createDevelopmentTrajectoryPrimitiveResult,
  createDevelopmentTrajectoryPrimitives
} from "./primitive.program.js";

test("authors three chronological development paths from explicit primitives", () => {
  const result = createDevelopmentTrajectoryPrimitiveResult(loadGapminder());
  const paths = result.program.graphicSpec.objects.trajectories.items;

  assert.equal(paths.length, 3);
  assert.deepEqual(paths.map(path => path.properties.commands.length), [11, 11, 11]);
  assert.deepEqual(
    result.series.map(item => item.key.country),
    TRAJECTORY_COUNTRIES
  );
  assert.deepEqual(
    result.series.map(item => item.orderValues),
    TRAJECTORY_COUNTRIES.map(() => TRAJECTORY_YEARS)
  );
  assert.deepEqual(
    paths.map(path => linearCommandPoints(path.properties.commands)),
    result.commands.map(linearCommandPoints)
  );
  assert.notDeepEqual(result.automaticCommands[0], result.commands[0]);
});

test("stores the approved semantic order through explicit primitives", () => {
  const program = createDevelopmentTrajectoryPrimitives(loadGapminder());
  const layer = program.semanticSpec.layers.find(item => item.id === "trajectories");

  assert.deepEqual(layer.encoding.pathOrder, {
    field: "year",
    fieldType: "quantitative",
    order: "ascending"
  });
  assert.equal(program.trace.children.some(node => node.op === "encodePathOrder"), false);
  assert.deepEqual(layer.encoding.x.field, "fertility");
  assert.deepEqual(layer.encoding.y.field, "life_expect");
  assert.deepEqual(layer.encoding.color.field, "country");
});

test("draws grids behind chronological paths and guides above them", () => {
  const program = createDevelopmentTrajectoryPrimitives(loadGapminder());
  const order = graphicDrawOrder(program);
  const context = createMockCanvasContext();

  assert.ok(order.indexOf("horizontalGridLines") < order.indexOf("trajectories"));
  assert.ok(order.indexOf("verticalGridLines") < order.indexOf("trajectories"));
  assert.ok(order.indexOf("trajectories") < order.indexOf("xAxisLine"));
  assert.ok(order.indexOf("trajectories") < order.indexOf("seriesLegendSymbols"));
  assert.doesNotThrow(() => render(program, context));
  assert.equal(findCanvasCalls(context, "stroke").length > 3, true);
});

test("preserves caller rows and earlier primitive programs", () => {
  const gapminder = loadGapminder();
  const previous = createDevelopmentTrajectoryPrimitives(gapminder);
  const next = previous.editGraphics({
    target: "trajectories",
    property: "strokeWidth",
    value: 5
  });

  gapminder[0].fertility = -100;
  assert.deepEqual(
    previous.graphicSpec.objects.trajectories.items.map(item => item.properties.strokeWidth),
    [3, 3, 3]
  );
  assert.deepEqual(
    next.graphicSpec.objects.trajectories.items.map(item => item.properties.strokeWidth),
    [5, 5, 5]
  );
  assert.notEqual(previous.semanticSpec.datasets[0].values[0].fertility, -100);
});
