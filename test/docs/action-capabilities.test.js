import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { chart } from "../../src/index.js";
import { POSITION_FIELD_COMPATIBILITY } from
  "../../src/grammar/positionCompatibility.js";
import { findSelectionPolicy } from
  "../../src/materialization/selection/policies/index.js";
import { generateDocCapabilities } from
  "../../scripts/generate-doc-capabilities.js";

const registry = JSON.parse(await readFile(
  new URL("../../docs/_data/action_capabilities.json", import.meta.url),
  "utf8"
));

function positionSupport(channel) {
  return Object.fromEntries(Object.entries(POSITION_FIELD_COMPATIBILITY)
    .filter(([, channels]) => channels[channel] !== undefined)
    .map(([mark, channels]) => [mark, [...channels[channel]]]));
}

function row(action) {
  return registry.position.find(candidate => candidate.action === action);
}

function aggregateBars() {
  return chart()
    .createCanvas({
      width: 520,
      height: 280,
      margin: { top: 40, right: 170, bottom: 50, left: 60 }
    })
    .createData({ values: [
      { category: "A", value: 2 },
      { category: "A", value: 4 },
      { category: "B", value: 7 },
      { category: "B", value: 9 }
    ] })
    .createBarMark()
    .encodeX({ field: "category", fieldType: "ordinal" })
    .encodeY({ field: "value", aggregate: "mean", stack: null });
}

test("keeps the generated capability pages synchronized", async () => {
  await generateDocCapabilities({ check: true });
  for (const file of [
    "../../docs/api/appearance.md",
    "../../docs/api/legends.md",
    "../../docs/advanced/axis-components.md"
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /supports points only|limited to point marks|aggregate edit actions are not implemented/);
  }
});

test("matches primary position capability rows to runtime compatibility", () => {
  assert.deepEqual(row("encodeX").support, positionSupport("x"));
  assert.deepEqual(row("encodeY").support, positionSupport("y"));
  assert.deepEqual(row("encodeTheta").support, positionSupport("theta"));
  assert.deepEqual(row("encodeR").support, positionSupport("radius"));
});

test("matches documented highlight marks to runtime policies", () => {
  const marks = registry.highlight[0].marks;
  assert.deepEqual([...marks].sort(), [
    "arc", "area", "bar", "line", "point", "rect", "rule"
  ]);
  for (const mark of marks) assert.notEqual(findSelectionPolicy(mark), undefined, mark);
});

test("smokes rect and arc position-color capabilities", () => {
  const discreteRect = chart()
    .createCanvas({ width: 260, height: 220, margin: 35 })
    .createData({ values: [{ column: "A", row: "one", value: 3 }] })
    .createRectMark()
    .encodeX({ field: "column", fieldType: "ordinal" })
    .encodeY({ field: "row", fieldType: "nominal" })
    .encodeColor({ field: "value", fieldType: "quantitative" });
  assert.equal(discreteRect.graphicSpec.objects.rect.items.length, 1);

  const rangedRect = chart()
    .createCanvas({ width: 260, height: 220, margin: 35 })
    .createData({ values: [{ x1: 1, x2: 2, y1: 3, y2: 5 }] })
    .createRectMark()
    .encodeX({ field: "x1" })
    .encodeX2({ field: "x2", fieldType: "quantitative" })
    .encodeY({ field: "y1" })
    .encodeY2({ field: "y2", fieldType: "quantitative" });
  assert.equal(rangedRect.graphicSpec.objects.rect.items.length, 1);

  const arc = chart()
    .createCanvas({ width: 240, height: 240, margin: 30 })
    .createData({ values: [{ group: "A" }, { group: "A" }, { group: "B" }] })
    .createArcMark({ innerRadius: 0.4 })
    .encodeTheta({ field: "group", aggregate: "count" })
    .encodeColor({ field: "group" });
  assert.equal(arc.graphicSpec.objects.arc.items.length, 2);
});

test("smokes bar highlight and continuous legend capabilities", () => {
  const highlighted = aggregateBars().highlightMarks({
    select: { channel: "y2", op: "max" },
    fill: "#dc2626"
  });
  assert.equal(
    highlighted.graphicSpec.objects.bar.items.filter(
      item => item.properties.fill === "#dc2626"
    ).length,
    1
  );

  const legend = aggregateBars()
    .encodeColor({
      field: "value",
      fieldType: "quantitative",
      scale: { palette: "viridis" }
    })
    .createLegend({ channels: ["color"] });
  assert.equal(legend.semanticSpec.scales.find(scale => scale.id === "color").type, "sequential");
  assert.notEqual(legend.graphicSpec.objects.colorGradientStrips, undefined);
});

test("smokes complete Cartesian axis editing", () => {
  const edited = chart()
    .createCanvas({ width: 360, height: 260, margin: 60 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createAxes()
    .editXAxis({
      line: { color: "#dc2626", lineWidth: 2 },
      title: { text: "Edited X" }
    })
    .editYAxis({
      line: { color: "#2563eb", lineWidth: 2 },
      title: { text: "Edited Y" }
    });
  assert.equal(edited.graphicSpec.objects.xAxisLine.properties.stroke, "#dc2626");
  assert.equal(edited.graphicSpec.objects.yAxisLine.properties.stroke, "#2563eb");
  assert.equal(edited.semanticSpec.guides.axis.x.title, "Edited X");
  assert.equal(edited.semanticSpec.guides.axis.y.title, "Edited Y");
});
