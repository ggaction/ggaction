import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";

test("106 temporal area panels preserve shared data, editable state and bounded exports", async () => {
  const rows = Array.from({ length: 106 * 300 }, (_, i) => {
    const group = Math.floor(i / 300);
    return { group: `item-${group}`, series: group % 2 ? "A" : "B",
      date: Date.UTC(2020, 0, 1) + (i % 300 + group) * 86400000, value: 1 + i % 7 };
  });
  const source = chart().createCanvas({ width: 250, height: 220, margin: 50 })
    .createData({ id: "observations", values: rows })
    .createAreaPlot({ x: { field: "date", fieldType: "temporal", temporalUnit: "timestamp" },
      y: "value", groupBy: "group", color: "series", guides: { axes: false, grid: false,
        legend: { position: "bottom", direction: "horizontal", title: false } } });
  const faceted = source.facet({ field: "group", scales: { x: "independent", y: "independent" },
    guides: { legend: "shared" }, headers: { fontSize: 11 } }).createTitle({ text: "All 106 items" });
  const stored = serializeProgram(faceted);
  assert.ok(stored.length < 15_000_000, `snapshot bytes ${stored.length}`);
  const restored = deserializeProgram(stored);
  assert.equal(serializeProgram(restored), stored);
  const children = Object.values(restored.children);
  assert.equal(children.length, 106);
  const originalRows = children[0].semanticSpec.datasets.find(d => d.id === "observations").values;
  assert.equal(originalRows.length, 31800);
  for (const [index, child] of children.entries()) {
    assert.equal(child.semanticSpec.datasets.find(d => d.id === "observations").values, originalRows);
    const layer = child.semanticSpec.layers.find(l => l.mark.type === "area");
    const values = child.semanticSpec.datasets.find(d => d.id === layer.data).values;
    assert.equal(values.length, 300);
    assert.ok(values.every(row => row.group === `item-${index}`));
  }
  assert.ok(Object.isFrozen(originalRows));
  assert.ok(Object.isFrozen(originalRows[0]));
  const svg = renderToSVG(restored);
  assert.match(svg, /item-105/);
  assert.match(svg, /All 106 items/);
  assert.ok((svg.match(/<path\b/g) ?? []).length >= 106);
  const png = await renderToPNGBuffer(restored);
  assert.ok(png.width > 26000 && png.bytes > 1000);
  assert.equal(png.buffer.readUInt32BE(16), png.width);
  const edited = restored.editCompositionLayout({ gap: 12 });
  assert.equal(Object.keys(edited.children).length, 106);
  assert.notEqual(edited.graphicSpec.objects.canvas.properties.width, restored.graphicSpec.objects.canvas.properties.width);
  assert.equal(serializeProgram(restored), stored);
  assert.match(renderToSVG(edited), /item-105/);
});
