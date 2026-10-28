import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createFontPrimitive } from "./primitive.program.js";
import { fonts } from "../../../examples/font-assets/fonts/manifest.js";

test("the explicit font primitive preserves literal baselines and independently hashed embedded bytes", () => {
  const program = createFontPrimitive(), title = program.graphicSpec.objects.chartTitle.items;
  assert.deepEqual(title.map(item => [item.properties.x, item.properties.y]), [[40, 30], [40, 63.6], [40, 97.2]]);
  assert.equal(program.graphicSpec.objects.chartSubtitle.properties.y, 131.2);
  for (const [index, text] of [title[0], program.graphicSpec.objects.chartSubtitle].entries()) {
    const font = text.properties.font, bytes = Buffer.from(font.payload.data, "base64");
    assert.equal(bytes.length, fonts[index].byteLength);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), fonts[index].sha256);
  }
  assert.deepEqual(program.graphicSpec.order, ["canvas"]);
  assert.deepEqual(program.graphicSpec.objects.canvas.children, ["plot-main", "chartTitle", "chartSubtitle"]);
});
