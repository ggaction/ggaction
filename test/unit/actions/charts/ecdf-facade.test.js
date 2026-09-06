import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { findDataset } from "../../../../src/selectors/datasets.js";
import { findLayer } from "../../../../src/selectors/layers.js";

function base(values = [{ value: 1 }, { value: 1 }, { value: 2 }, { value: 4 }]) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 50 })
    .createData({ id: "source", values });
}

test("creates the shortest ECDF as a right-continuous ordinary step line", () => {
  const program = base().createECDFPlot({ field: "value", guides: false });
  const layer = findLayer(program, "ecdfPlot");
  const transform = findDataset(program, "ecdfPlotECDFData").transform[0];
  assert.equal(layer.mark.type, "line");
  assert.equal(program.markConfigs.ecdfPlot.curve, "step-after");
  assert.equal(layer.encoding.x.field, transform.as.value);
  assert.equal(layer.encoding.y.field, transform.as.probability);
  assert.deepEqual(program.resolvedScales.ecdfPlotProbability.domain, [0, 1]);
  assert.deepEqual(program.graphicSpec.objects.ecdfPlot.items[0].properties.commands, [
    { op: "M", x: 50, y: 270 },
    { op: "L", x: 50, y: 270 },
    { op: "L", x: 50, y: 160 },
    { op: "L", x: 176.66666666666666, y: 160 },
    { op: "L", x: 176.66666666666666, y: 105 },
    { op: "L", x: 430, y: 105 },
    { op: "L", x: 430, y: 50 }
  ]);
});

test("groups paths independently, constrains color to statistical grouping, and labels final probability", () => {
  const program = base([
    { group: "A", value: 1 }, { group: "B", value: 2 },
    { group: "A", value: 3 }, { group: "B", value: 4 }
  ]).createECDFPlot({
    id: "grouped", field: "value", groupBy: "group", color: "group",
    labels: { dx: 8 }, guides: false
  });
  assert.equal(program.graphicSpec.objects.grouped.items.length, 2);
  assert.deepEqual(findLayer(program, "grouped").encoding.group, {
    field: "group", fieldType: "nominal"
  });
  assert.equal(program.graphicSpec.objects.groupedLabel.items.length, 2);
  assert.deepEqual(
    program.graphicSpec.objects.groupedLabel.items.map(item => item.properties.text),
    ["1", "1"]
  );
  assert.throws(
    () => base([{ group: "A", other: "x", value: 1 }]).createECDFPlot({
      field: "value", groupBy: "group", color: "other"
    }),
    /included in groupBy/
  );
});

test("atomically revises source, field, grouping, weight, and output names", () => {
  const source = base()
    .createData({ id: "replacement", values: [
      { group: "A", next: 2, weight: 2 }, { group: "A", next: 6, weight: 1 }
    ] })
    .createECDFPlot({ id: "dist", data: "source", field: "value", guides: false });
  const edited = source.editECDFPlot({
    target: "dist", data: "replacement", field: "next", groupBy: "group",
    weight: "weight", as: { value: "x", cumulative: "total", probability: "p" }
  });
  const dataset = findDataset(edited, "distECDFData");
  assert.equal(dataset.source, "replacement");
  assert.deepEqual(dataset.values.at(-1), { group: "A", x: 6, total: 3, p: 1 });
  assert.equal(findLayer(edited, "dist").encoding.x.field, "x");
  assert.deepEqual(edited.trace.children.at(-1).children.map(node => node.op), [
    "removeMark", "createECDFPlot"
  ]);
  assert.equal(findDataset(edited, "source").values.length, 4);
});

test("owns derived data and rejects invalid edits without changing prior programs", () => {
  const program = base().createECDFPlot({ field: "value", labels: {}, guides: false });
  const before = JSON.stringify(program);
  assert.throws(() => program.bindMarkData({ target: "ecdfPlot", data: "source" }), /lifecycle/);
  assert.throws(() => program.editECDFPlot({ weight: "missing" }));
  assert.equal(JSON.stringify(program), before);
  const removed = program.removeMark({ target: "ecdfPlot" });
  assert.equal(findDataset(removed, "ecdfPlotECDFData"), undefined);
  assert.equal(findLayer(removed, "ecdfPlotLabel"), undefined);
  assert.deepEqual(removed.semanticSpec.datasets.map(dataset => dataset.id), ["source"]);
});

test("removes coupled color when explicit ungrouping changes path identity", () => {
  const grouped = base([
    { group: "A", value: 1 }, { group: "B", value: 2 }
  ]).createECDFPlot({ field: "value", groupBy: "group", color: "group", guides: false });
  const ungrouped = grouped.editECDFPlot({ groupBy: false });
  assert.equal(findLayer(ungrouped, "ecdfPlot").encoding.group, undefined);
  assert.equal(findLayer(ungrouped, "ecdfPlot").encoding.color, undefined);
  assert.equal(ungrouped.graphicSpec.objects.ecdfPlot.items.length, 1);
});

test("recomputes denominators, steps, and endpoint labels after a raw source filter", () => {
  const program = base()
    .createECDFPlot({ id: "dist", field: "value", labels: {}, guides: false })
    .filterData({
      id: "aboveOne", source: "source", field: "value",
      predicate: { op: "gt", value: 1 }
    })
    .editECDFPlot({ target: "dist", data: "aboveOne" });
  const dataset = findDataset(program, "distECDFData");
  assert.equal(dataset.transform[0].resolved.groups[0].denominator, 2);
  assert.deepEqual(dataset.values.map(row => row.__distECDFData_probability), [0, 0.5, 1]);
  assert.deepEqual(
    program.graphicSpec.objects.distLabel.items.map(item => item.properties.text),
    ["1"]
  );
  assert.equal(program.graphicSpec.objects.dist.items[0].properties.commands.at(-1).y, 50);
});
