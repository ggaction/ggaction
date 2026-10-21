import test from "node:test";
import assert from "node:assert/strict";
import { render } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { createLookupExample } from "../../../examples/lookup-data/program.js";
import { people, groups } from "../../../examples/lookup-data/data.js";
import { createLookupPrimitives } from "./primitive.program.js";

test("named lookup matches independent prejoined graphics, drawing order and renderer calls", () => {
  const actual = createLookupExample(), expected = createLookupPrimitives();
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.deepEqual(actual.graphicSpec.order, expected.graphicSpec.order);
  const a = createMockCanvasContext(), b = createMockCanvasContext();
  render(actual, a); render(expected, b); assert.deepEqual(a.calls, b.calls);
  assert.equal(renderToSVG(actual), renderToSVG(expected));
  assert.deepEqual(actual.semanticSpec.datasets.find(d => d.id === "people").values, people);
  assert.deepEqual(actual.semanticSpec.datasets.find(d => d.id === "groups").values, groups);
  assert.deepEqual(actual.semanticSpec.datasets.find(d => d.id === "ages").values,
    expected.semanticSpec.datasets.find(d => d.id === "ages").values);
  assert.deepEqual(actual.graphicSpec.objects.barPlot.items.map(item => item.properties.height), [96, 86, 168]);
  assert.equal(actual.semanticSpec.layers[0].encoding.y.aggregate, "mean");
});
