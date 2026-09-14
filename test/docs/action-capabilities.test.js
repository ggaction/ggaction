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
  const troubleshooting = await readFile(
    new URL("../../docs/troubleshooting.md", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(troubleshooting, /Point color legends are currently\s+unsupported/);
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
    "arc", "area", "bar", "line", "point", "rect", "rule", "tick"
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

function strokeConsumer(kind) {
  const base = chart().createCanvas({ width: 600, height: 420, margin: 130 })
    .createData({ values: [
      { x: 1, y: 2, x2: 2, y2: 3, category: "A", mass: 1, tone: "one", weight: 2 },
      { x: 2, y: 3, x2: 3, y2: 4, category: "B", mass: 2, tone: "one", weight: 2 }
    ] });
  if (kind === "point") return base.createScatterPlot({ id: "mark", x: "x", y: "y", guides: false });
  if (kind === "line") return base.createLinePlot({ id: "mark", x: "x", y: "y", guides: false });
  if (kind === "area") return base.createAreaPlot({ id: "mark", x: "x", y: "y", guides: false });
  if (kind === "bar") return base.createBarPlot({ id: "mark", x: "category", y: { field: "y", aggregate: "sum" }, guides: false });
  if (kind === "arc") return base.createArcMark({ id: "mark" }).encodeTheta({ field: "mass" });
  const create = { rect: "createRectMark", rule: "createRuleMark", tick: "createTickMark" }[kind];
  let program = base[create]({ id: "mark" })
    .encodeX({ field: "x", fieldType: "quantitative" })
    .encodeY({ field: "y", fieldType: "quantitative" });
  if (kind === "rect") program = program.encodeX2({ field: "x2" }).encodeY2({ field: "y2" });
  if (kind === "rule") program = program.encodeY2({ datum: 0, fieldType: "quantitative" });
  return program;
}

test("verifies independent stroke and legend support for every documented mark", () => {
  const supported = ["point", "line", "area", "bar", "rect", "arc", "rule", "tick"];
  for (const row of registry.stroke) assert.deepEqual(Object.keys(row.support), supported);
  for (const kind of supported) {
    const base = strokeConsumer(kind);
    for (const fieldType of ["nominal", "quantitative"]) {
      const encoded = base.encodeStroke({ target: "mark", fieldType,
        field: fieldType === "nominal" ? "tone" : "weight" });
      const legend = encoded.createLegend({ target: "mark", channels: ["stroke"], position: "bottom" });
      assert.ok(legend.semanticSpec.layers.find(layer => layer.id === "mark").encoding.stroke);
      assert.ok(Object.keys(legend.graphicSpec.objects).length > Object.keys(encoded.graphicSpec.objects).length);
      assert.equal(base.semanticSpec.layers.find(layer => layer.id === "mark").encoding.stroke, undefined);
    }
  }
  for (const kind of ["line", "area"]) {
    const base = strokeConsumer(kind);
    const before = JSON.stringify(base);
    assert.throws(() => base.encodeStroke({ target: "mark", field: "x", fieldType: "quantitative" }), /series/);
    assert.equal(JSON.stringify(base), before);
  }
});

test("uses point opacity samples for line consumers and rejects rule opacity legends", () => {
  const rule = strokeConsumer("rule").encodeOpacity({ target: "mark", field: "weight" });
  assert.throws(() => rule.createLegend({ target: "mark", channels: ["opacity"] }), /opacity legend target/);
  for (const kind of ["line"]) {
    const program = strokeConsumer(kind).encodeOpacity({ target: "mark", field: "weight" })
      .createLegend({ target: "mark", channels: ["opacity"], position: "bottom", values: [2] });
    assert.ok(Object.values(program.graphicSpec.objects).some(object =>
      object.type === "circle" || object.items?.some(item => item.type === "circle")));
  }
});
