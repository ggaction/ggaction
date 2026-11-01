import assert from "node:assert/strict";
import test from "node:test";
import { createEdgeRoutes } from "../../../examples/edge-routes/program.js";
import { createEdgeRouteRendererProgram } from "./renderer-program.js";
import { createEdgeRoutePrimitive } from "./primitive.program.js";
import { methodRoutePaths, routeMethods, routePositions } from "./reference-values.js";
import { render } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { clampedSplinePoint } from "../../oracles/edge-routes.js";

for (const method of routeMethods) test(`${method} keeps complete ordered native vectors, source rows, endpoint trimming and portable stored primitive output`, () => {
  const publicProgram = createEdgeRoutes(method), primitive = createEdgeRoutePrimitive(method), saved = serializeProgram(publicProgram);
  const route = publicProgram.semanticSpec.resources.find(resource => resource.kind === "edge-route");
  const graphics = publicProgram.graphicSpec.objects.routesPlot.items;
  const items = getMarkItems(publicProgram, { target: "routesPlot" }).filter(item => item.fields.kind === "edge");
  assert.equal(route.result.complete, true);
  assert.deepEqual(items.map(item => item.rows.filter(row => row.data === "edges").map(row => row.index)), [[0], [1], [2]]);
  assert.equal(new Set(items.map(item => item.key)).size, 3);
  assert.deepEqual(route.result.routes.map(item => item.edgeKey), items.map(item => item.fields.key));
  const rawCounts = { hierarchical: [31, 2, 2], "force-directed": [34, 34, 34], density: [1059, 756, 754], "edge-path": [4, 2, 2] };
  assert.deepEqual(route.result.routes.map(item => item.commands.length), rawCounts[method]);
  const rendererProgram = createEdgeRouteRendererProgram(method), rendererGraphics = rendererProgram.graphicSpec.objects.routesPlot.items;
  const datasetValues = program => program.semanticSpec.datasets.map(({ id, values, revision, rowKeys, schema }) => ({ id, values, revision, rowKeys, schema }));
  assert.deepEqual(datasetValues(rendererProgram), datasetValues(publicProgram));
  const itemSources = program => getMarkItems(program, { target: "routesPlot" }).map(item => [item.key, item.rows.map(({ logicalDataId, ...row }) => row), item.fields]);
  assert.deepEqual(itemSources(rendererProgram), itemSources(publicProgram));
  for (const program of [rendererProgram, publicProgram])
    for (const item of getMarkItems(program, { target: "routesPlot" }))
      for (const row of item.rows) assert.equal(row.logicalDataId, program.semanticSpec.datasets.find(data => data.id === row.data).logicalId);
  assert.deepEqual(rendererGraphics.slice(0, 3).map(item => item.properties.commands), methodRoutePaths(method));
  assert.deepEqual(rendererGraphics.map(({ type, properties }) => ({ type, properties })), primitive.graphicSpec.objects.network.items.map(({ type, properties }) => ({ type, properties })));
  assert.equal(renderToSVG(rendererProgram), renderToSVG(primitive));
  const actual = createMockCanvasContext(), expected = createMockCanvasContext();
  render(rendererProgram, actual); render(primitive, expected); assert.deepEqual(actual.calls, expected.calls);
  for (const [index, [a, b]] of [[0, 2], [0, 1], [1, 2]].entries()) {
    const commands = route.result.routes[index].commands, origin = method === "hierarchical" ? [160, 60] : [0, 0];
    assert.deepEqual([commands[0].x + origin[0], commands[0].y + origin[1]], [routePositions[a].x, routePositions[a].y]);
    assert.deepEqual([commands.at(-1).x + origin[0], commands.at(-1).y + origin[1]], [routePositions[b].x, routePositions[b].y]);
    const visible = graphics[index].properties.commands;
    function atDistance(points, distance) {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
        if (distance <= length) return [a.x + (b.x - a.x) * distance / length, a.y + (b.y - a.y) * distance / length];
        distance -= length;
      }
      throw new Error("Reference route is shorter than the trim distance");
    }
    // Six units of polyline arc distance, not the chord distance on a curved route.
    for (const [end, expected] of [[visible[0], atDistance(commands, 6)], [visible.at(-1), atDistance([...commands].reverse(), 6)]])
      assert.ok(Math.hypot(end.x - expected[0] - origin[0], end.y - expected[1] - origin[1]) < 1e-10);
  }
  if (method === "hierarchical") {
    const middle = clampedSplinePoint([{ x: -100, y: 120 }, { x: 0, y: 18 }, { x: 100, y: 120 }], .5);
    assert.deepEqual(middle, { x: 0, y: 69 });
    assert.ok(route.result.routes[0].commands.some(point => point.x === middle.x && point.y === middle.y));
  }
  if (method === "force-directed") assert.equal(route.result.diagnostics.totalIterations, 165);
  if (method === "density") assert.equal(route.result.diagnostics.iterations, 20);
  const restored = deserializeProgram(saved);
  assert.deepEqual(restored.graphicSpec, publicProgram.graphicSpec);
  assert.deepEqual(getMarkItems(restored, { target: "routesPlot" }), getMarkItems(publicProgram, { target: "routesPlot" }));
  assert.equal(serializeProgram(publicProgram), saved);
});
