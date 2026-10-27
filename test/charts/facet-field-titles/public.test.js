import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
import test from "node:test";
import assert from "node:assert/strict";
import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { createFacetFieldTitles } from "../../../examples/facet-field-titles/program.js";
import { createFacetFieldTitlesPrimitives } from "./primitive.program.js";

test("one field title matches the explicit primitive scene and renderer calls", () => {
  const actual = createFacetFieldTitles(), expected = createFacetFieldTitlesPrimitives();
  assertEquivalentMeaning(actual.graphicSpec, expected.graphicSpec);
  const a = createMockCanvasContext(), b = createMockCanvasContext();
  render(actual, a); render(expected, b);
  assert.deepEqual(a.calls, b.calls);
  assert.deepEqual(actual.graphicSpec.objects.canvas.properties, { width: 215, height: 195, background: "white" });
  assert.deepEqual(actual.graphicSpec.objects["facet-headers"].items.map(x => [x.properties.x, x.properties.y]),
    [[39, 50], [39, 135], [10, 92.5]]);
});
