import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { translateGraphic, translatedProperties } from "../../../src/materialization/graphicTranslation.js";
import { serializeProgram } from "../../../src/persistence.js";

test("graphic translation moves a nested Canvas once and preserves its local descendants", () => {
  const p = chart().createCanvas({ width: 400, height: 300 })
    .createGraphics({ id: "clip", type: "canvas", parent: "canvas" })
    .editGraphics({ target: "clip", property: "x", value: 20 })
    .editGraphics({ target: "clip", property: "y", value: 30 })
    .editGraphics({ target: "clip", property: "width", value: 100 })
    .editGraphics({ target: "clip", property: "height", value: 80 })
    .createGraphics({ id: "dot", type: "circle", parent: "clip" })
    .editGraphics({ target: "dot", property: "x", value: 10 })
    .editGraphics({ target: "dot", property: "y", value: 15 });
  const before = serializeProgram(p), q = translateGraphic(p, "clip", 45, -12);
  assert.equal(q.graphicSpec.objects.clip.properties.x, 65);
  assert.equal(q.graphicSpec.objects.clip.properties.y, 18);
  assert.deepEqual(q.graphicSpec.objects.dot, p.graphicSpec.objects.dot);
  assert.equal(serializeProgram(p), before);
  assert.equal(translateGraphic(p, "clip", 0, 0), p);
});

test("graphic translation traverses collections but leaves the local frame of each nested Canvas intact", () => {
  const p = chart().createCanvas({ width: 400, height: 300 })
    .createGraphics({ id: "group", type: "collection", parent: "canvas" })
    .createGraphics({ id: "clip", type: "canvas", parent: "group" })
    .editGraphics({ target: "clip", property: "width", value: 100 })
    .editGraphics({ target: "clip", property: "height", value: 80 })
    .createGraphics({ id: "dot", type: "circle", parent: "clip" })
    .createGraphics({ id: "direct", type: "circle", parent: "group" });
  const q = translateGraphic(p, "group", 7, 9);
  assert.equal(q.graphicSpec.objects.clip.properties.x, 7);
  assert.equal(q.graphicSpec.objects.clip.properties.y, 9);
  assert.deepEqual(q.graphicSpec.objects.dot, p.graphicSpec.objects.dot);
  assert.equal(q.graphicSpec.objects.direct.properties.x, 7);
  assert.equal(q.graphicSpec.objects.direct.properties.y, 9);
});

test("property translation copies path controls and primitive positions without changing caller input", () => {
  const properties = { commands: [{ op: "M", x: 1, y: 2 },
    { op: "C", x1: 3, y1: 4, x2: 5, y2: 6, x: 7, y: 8 }, { op: "Z" }], fill: "none" };
  const before = structuredClone(properties), translated = translatedProperties("path", properties, 10, -2);
  assert.deepEqual(translated.commands, [{ op: "M", x: 11, y: 0 },
    { op: "C", x1: 13, y1: 2, x2: 15, y2: 4, x: 17, y: 6 }, { op: "Z" }]);
  assert.deepEqual(properties, before);
  assert.deepEqual(translatedProperties("line", { x1: 1, x2: 2, y1: 3, y2: 4 }, 10, -2),
    { x1: 11, x2: 12, y1: 1, y2: 2 });
});
