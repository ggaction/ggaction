import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { DEFAULT_TEXT_MARK } from "../../../src/grammar/text.js";
import { concreteTextItem } from "../../../src/materialization/textItem.js";

test("native Text construction omits absent content and invalid anchors before font resolution", () => {
  const p = chart(), before = p.graphicSpec;
  for (const [position, content] of [[{ x: 1, y: 2 }, undefined], [{ x: NaN, y: 2 }, "A"], [{ x: 1, y: Infinity }, "A"]]) {
    assert.equal(concreteTextItem(p, DEFAULT_TEXT_MARK, position, content), undefined);
  }
  assert.equal(p.graphicSpec, before);
});

test("resolved label placement suppresses a second offset while retaining native multiline layout", () => {
  const p = chart(), config = { ...DEFAULT_TEXT_MARK, dx: 8, dy: -3, lineHeight: 20, blockAlign: "first" };
  const ordinary = concreteTextItem(p, config, { x: 10, y: 30 }, "A\nB");
  const placed = concreteTextItem(p, config, { x: 18, y: 27 }, "A\nB", { offsets: false });
  assert.deepEqual(ordinary, placed);
  assert.deepEqual(placed.properties.lines, [{ text: "A", x: 0, y: 0 }, { text: "B", x: 0, y: 20 }]);
  assert.deepEqual([config.dx, config.dy], [8, -3]);
});
