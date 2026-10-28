import assert from "node:assert/strict";
import test from "node:test";
import { createGraph } from "../../../examples/graph-plots/program.js";
import { createGraphPrimitive } from "./primitive.program.js";
import { variants } from "./reference-values.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";

const flatten = (program, ids) => ids.flatMap(id => { const graphic = program.graphicSpec.objects[id]; return graphic.items.map(item => ({ type: item.type ?? graphic.type, properties: item.properties })); });
for (const variant of variants) test(`public graph ${variant.id} preserves primitive order and concrete geometry`, () => {
  const program = createGraph(variant.id), primitive = createGraphPrimitive(variant.id);
  assert.deepEqual(flatten(program, ["networkPlot"]), flatten(primitive, ["network"]));
  assert.equal(renderToSVG(program), renderToSVG(primitive));
  const actual = createMockCanvasContext(), expected = createMockCanvasContext();
  render(program, actual); render(primitive, expected);
  assert.deepEqual(actual.calls, expected.calls);
  const identities = program.graphicSpec.objects.networkPlot.items.map(item => JSON.stringify([item.identity.key, item.identity.role]));
  assert.equal(new Set(identities).size, identities.length);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(program))), renderToSVG(program));
});
