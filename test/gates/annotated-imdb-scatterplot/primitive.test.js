import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadImdbTop1000 } from "../../support/data.js";
import { createAnnotatedImdbPrimitives } from "./primitive.program.js";

test("authors the Gate J-B IMDb annotation only through primitives", () => {
  const program = createAnnotatedImdbPrimitives(loadImdbTop1000());
  const context = createMockCanvasContext();
  render(program, context);

  assert.equal(program.graphicSpec.objects.point.items.length, 8);
  assert.equal(program.graphicSpec.objects.text.items.length, 8);
  assert.equal(
    program.graphicSpec.objects.text.items[4].properties.text,
    "Star Wars: Episode V - The Empire Strikes Back"
  );
  assert.deepEqual(program.graphicSpec.objects["plot-main"].children.slice(0, 3), [
    "horizontalGridLines", "point", "text"
  ]);
  assert.equal(context.calls.some(call => call.op === "fillText"), true);
  assert.equal(program.trace.children.some(node => node.op === "createTextMark"), false);
  assert.equal(program.trace.children.some(node => node.op === "encodeText"), false);
});

test("keeps graphical annotation alignment, rotation, and offsets explicit", () => {
  const baseline = createAnnotatedImdbPrimitives(loadImdbTop1000());
  const baselineItems = baseline.graphicSpec.objects.text.items;
  const revised = baseline
    .editGraphics({
      target: "text",
      property: "x",
      value: baselineItems.map(item => item.properties.x - 14)
    })
    .editGraphics({ target: "text", property: "textAlign", value: "right" })
    .editGraphics({ target: "text", property: "rotation", value: -Math.PI / 12 });

  assert.equal(
    revised.graphicSpec.objects.text.items.every((item, index) =>
      item.properties.x === baselineItems[index].properties.x - 14 &&
      item.properties.textAlign === "right" &&
      item.properties.rotation === -Math.PI / 12
    ),
    true
  );
  assert.equal(baseline.graphicSpec.objects.text.items[0].properties.rotation, 0);
});
