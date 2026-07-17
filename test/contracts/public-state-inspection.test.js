import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { chart } from "../../src/index.js";

function base(values) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 30 })
    .createData({ id: "data", values });
}

test("inspects semantic layers and final point items through public state", () => {
  const program = base([{ x: 1, y: 2 }, { x: 2, y: 4 }])
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });

  const layer = program.semanticSpec.layers.find(item => item.id === "points");
  const graphic = program.graphicSpec.objects.points;
  assert.equal(layer?.mark.type, "point");
  assert.equal(graphic.type, "circle");
  assert.equal(graphic.items.length, 2);
  assert.equal(program.trace.children.at(-1).op, "encodeY");
});

test("uses the same public item path for final bars and line series", () => {
  const bars = base([
    { category: "A", value: 2 },
    { category: "B", value: 5 }
  ])
    .createBarMark({ id: "bars" })
    .encodeX({ field: "category", fieldType: "ordinal" })
    .encodeY({ field: "value", aggregate: "mean" });
  assert.equal(bars.graphicSpec.objects.bars.items.length, 2);

  const lines = base([
    { year: "2000-01-01", y: 2 },
    { year: "2001-01-01", y: 4 },
    { year: "2002-01-01", y: 3 }
  ])
    .createLineMark({ id: "lines" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "y", aggregate: "mean" });
  const series = lines.graphicSpec.objects.lines.items;
  assert.equal(series.length, 1);
  assert.ok(series[0].properties.commands.length >= 2);
});

test("keeps canonical public state paths discoverable in documentation", async () => {
  const concept = await readFile(
    new URL("../../docs/concepts/chart-program.md", import.meta.url),
    "utf8"
  );
  const troubleshooting = await readFile(
    new URL("../../docs/troubleshooting.md", import.meta.url),
    "utf8"
  );
  for (const path of [
    "program.semanticSpec.datasets",
    "program.semanticSpec.layers",
    "program.graphicSpec.objects",
    "program.graphicSpec.order",
    "program.trace.children"
  ]) {
    assert.match(concept, new RegExp(path.replaceAll(".", "\\.")));
  }
  assert.match(troubleshooting, /graphicSpec\.objects\[markId\]\.items/);
  assert.doesNotMatch(concept, /graphicSpec\.graphics/);
});
