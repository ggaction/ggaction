import assert from "node:assert/strict";
import test from "node:test";
import { createCalendarPrimitive } from "./primitive.program.js";

for (const id of ["year", "monday", "omitted"]) {
  test(`calendar primitive ${id} preserves leap-year cells and closed month outlines`, () => {
    const p = createCalendarPrimitive(id), graphic = p.graphicSpec.objects.days;
    const cells = graphic.items.filter(item => item.type === "rect");
    const outlines = graphic.items.filter(item => item.type === "path");
    assert.equal(cells.length, id === "omitted" ? 292 : 366);
    assert.equal(cells.filter(item => item.properties.fill === "#2563eb").length, 292);
    assert.equal(outlines.length, id === "omitted" ? 0 : 12);
    for (const item of cells) {
      const { x, y, width, height } = item.properties;
      assert.ok(width > 0 && height === width);
      assert.ok(x >= 40 && x + width <= 1040 && y >= 80 && y + height <= 320);
    }
    assert.ok(outlines.every(item => item.properties.commands[0].op === "M" && item.properties.commands.at(-1).op === "Z"));
    assert.deepEqual(graphic.clip, { x: 40, y: 80, width: 1000, height: 240 });
    assert.equal(graphic.items.filter(item => item.type === "text").length, 20);
  });
}

test("calendar primitive rejects unknown variants", () => assert.throws(() => createCalendarPrimitive("unknown")));
