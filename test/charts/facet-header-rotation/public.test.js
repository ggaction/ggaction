import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
import test from "node:test";
import assert from "node:assert/strict";
import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { createFacetHeaderRotation } from "../../../examples/facet-header-rotation/program.js";
import { createFacetHeaderRotationPrimitives } from "./primitive.program.js";

test("rotated headers match the explicit primitive collection and renderer calls", () => {
  const actual = createFacetHeaderRotation(), expected = createFacetHeaderRotationPrimitives();
  assertEquivalentMeaning(actual.graphicSpec, expected.graphicSpec);
  assert.deepEqual(actual.graphicSpec.order, expected.graphicSpec.order);
  const a = createMockCanvasContext(), b = createMockCanvasContext();
  render(actual, a); render(expected, b);
  assert.deepEqual(a.calls, b.calls);
  assert.deepEqual(actual.graphicSpec.objects.canvas.properties, { width: 185, height: 195, background: "white" });
  const headers = actual.graphicSpec.objects["facet-headers"].items;
  assert.deepEqual(headers.map(x => [x.properties.x, x.properties.y, x.properties.rotation]), [[9, 50, -Math.PI / 2], [9, 135, -Math.PI / 2]]);
});
