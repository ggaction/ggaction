import assert from "node:assert/strict";
import test from "node:test";
import { createEdgeRoutes } from "../../../examples/edge-routes/program.js";
import { createEdgeRoutePrimitive } from "./primitive.program.js";
import { routePositions, routePaths } from "./reference-values.js";
import { render } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../support/canvas.js";

test("public edge routes match the explicit primitive in concrete order, SVG and Canvas calls", () => {
  const program = createEdgeRoutes(), primitive = createEdgeRoutePrimitive();
  const flatten = (p, id) => p.graphicSpec.objects[id].items.map(({ type, properties }) => ({ type, properties }));
  assert.deepEqual(flatten(program, "routesPlot"), flatten(primitive, "network"));
  assert.equal(renderToSVG(program), renderToSVG(primitive));
  const actual = createMockCanvasContext(), expected = createMockCanvasContext(); render(program, actual); render(primitive, expected);
  assert.deepEqual(actual.calls, expected.calls);
  const route = program.semanticSpec.resources.find(resource => resource.kind === "edge-route");
  assert.deepEqual(route.result.routes[0].commands.slice(1, -1), [{ op: "L", x: 135, y: 90 }, { op: "L", x: 185, y: 90 }]);
  assert.equal(new Set(program.graphicSpec.objects.routesPlot.items.filter(i => i.type === "path").map(i => i.identity.key)).size, 3);
});

test("route reference endpoints lie on the six-unit node boundary and preserve the two straight edge directions", () => {
  for (const [index, [source, target]] of [[0, 2], [0, 1], [1, 2]].entries()) {
    const points = routePaths[index];
    for (const [p, anchor] of [[points[0], routePositions[source]], [points.at(-1), routePositions[target]]]) {
      assert.ok(Math.abs(Math.hypot(p.x - anchor.x, p.y - anchor.y) - 6) < 1e-12);
    }
  }
  assert.deepEqual(routePaths[0].slice(1, -1).map(({ x, y }) => [x, y]), [[135, 90], [185, 90]]);
});
