import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadImdbTop1000 } from "../../support/data.js";
import { createAnnotatedImdbPrimitives } from "./primitive.program.js";
import { createAnnotatedImdbScatterplot } from "./public.program.js";
import { createAnnotatedImdbValues } from "./reference-values.js";

test("matches the approved annotated IMDb primitive exactly", () => {
  const rows = loadImdbTop1000();
  const primitive = createAnnotatedImdbPrimitives(rows);
  const program = createAnnotatedImdbScatterplot(
    createAnnotatedImdbValues(rows).rows
  );
  const primitiveContext = createMockCanvasContext();
  const programContext = createMockCanvasContext();
  render(primitive, primitiveContext);
  render(program, programContext);

  assert.deepEqual(program.graphicSpec, primitive.graphicSpec);
  assert.deepEqual(programContext.calls, primitiveContext.calls);
  assert.equal(program.semanticSpec.layers[1].source, "point");
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createPointMark",
    "encodeX",
    "encodeY",
    "encodeRadius",
    "createTextMark",
    "encodeText",
    "createGuides",
    "createTitle"
  ]);
});
