import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function lineProgram() {
  return chart()
    .createCanvas({
      width: 420,
      height: 220,
      margin: { top: 20, right: 140, bottom: 40, left: 50 }
    })
    .createData({
      id: "values",
      values: [
        { year: 2020, value: 4, group: "A", weight: 2 },
        { year: 2021, value: 7, group: "A", weight: 2 },
        { year: 2020, value: 3, group: "B", weight: 8 },
        { year: 2021, value: 9, group: "B", weight: 8 }
      ]
    })
    .createLineMark({ id: "lines" })
    .encodeX({ field: "year" })
    .encodeY({ field: "value" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({ field: "weight", scale: { range: [1, 7] } });
}

test("creates and rematerializes a quantitative stroke-width legend", () => {
  const encoded = lineProgram();
  const program = encoded.createLegend({
    target: "lines",
    channels: ["strokeWidth"],
    count: 3
  });

  assert.deepEqual(program.semanticSpec.guides.legend.strokeWidth, {
    scale: "strokeWidth",
    title: "weight"
  });
  assert.deepEqual(
    program.graphicSpec.objects.strokeWidthLegendSymbols.items.map(
      item => item.properties.strokeWidth
    ),
    [1, 4, 7]
  );
  assert.deepEqual(
    program.graphicSpec.objects.strokeWidthLegendLabels.items.map(
      item => item.properties.text
    ),
    ["2", "5", "8"]
  );
  assert.equal(
    program.trace.children.at(-1).children.at(-1).op,
    "createStrokeWidthLegend"
  );

  const edited = program.editScale({ id: "strokeWidth", range: [2, 10] });
  assert.deepEqual(
    edited.graphicSpec.objects.strokeWidthLegendSymbols.items.map(
      item => item.properties.strokeWidth
    ),
    [2, 6, 10]
  );
  assert.deepEqual(
    program.graphicSpec.objects.strokeWidthLegendSymbols.items.map(
      item => item.properties.strokeWidth
    ),
    [1, 4, 7]
  );
});

test("removes a stroke-width legend by its owning mark", () => {
  const withLegend = lineProgram().createLegend({ channels: ["strokeWidth"] });
  const removed = withLegend.removeLegend({ target: "lines" });

  assert.equal(removed.semanticSpec.guides.legend, undefined);
  assert.equal(removed.guideConfigs.legend, undefined);
  assert.equal(removed.graphicSpec.objects.strokeWidthLegendSymbols, undefined);
  assert.notEqual(withLegend.graphicSpec.objects.strokeWidthLegendSymbols, undefined);
});

test("edits the bounded stroke-width legend surface", () => {
  const program = lineProgram().createLegend({ channels: ["strokeWidth"] });
  const edited = program.editLegend({
    count: 3,
    title: "Line weight",
    labels: { color: "#123456", offset: 18 },
    titleStyle: { color: "#654321", fontSize: 15 }
  });

  assert.equal(edited.guideConfigs.legend.strokeWidth.count, 3);
  assert.equal(edited.semanticSpec.guides.legend.strokeWidth.title, "Line weight");
  assert.equal(edited.graphicSpec.objects.strokeWidthLegendSymbols.items.length, 3);
  assert.equal(
    edited.graphicSpec.objects.strokeWidthLegendLabels.items[0].properties.fill,
    "#123456"
  );
  assert.equal(
    edited.graphicSpec.objects.strokeWidthLegendTitle.properties.fill,
    "#654321"
  );
  assert.equal(
    edited.graphicSpec.objects.strokeWidthLegendTitle.properties.fontSize,
    15
  );
  assert.equal(program.guideConfigs.legend.strokeWidth.count, 5);
});
