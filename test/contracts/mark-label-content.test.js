import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

const rows = [{ category: "A", series: "One", value: 1 }, { category: "A", series: "Two", value: 1 },
  { category: "B", series: "One", value: 2 }, { category: "B", series: "Two", value: 4 }];
function base() { return chart().createCanvas({ width: 480, height: 360, margin: 50 }).createData({ values: rows }); }

const cases = [
  { name: "pie-share", source: () => base().createPiePlot({ category: "category", value: "value", aggregate: "sum", guides: false }),
    style: { source: "piePlot", align: "center", baseline: "middle", fontSize: 20 },
    content: { content: "share", format: ".0%" }, expected: ["25%", "75%"] },
  { name: "stack-values", source: () => base().createBarPlot({ x: "category", y: { field: "value", aggregate: "sum" },
      color: { field: "series", layout: "stack" }, guides: false }),
    style: { source: "barPlot", align: "center", baseline: "bottom", dy: -4, fontSize: 16 },
    content: { content: "value" }, expected: ["1", "1", "2", "4"] }
];

for (const fixture of cases) test(`semantic label ${fixture.name} matches independent literal text primitives`, async () => {
  const source = fixture.source();
  const primitive = source.createTextMark({ ...fixture.style, text: "pending" })
    .editGraphics({ target: "text", property: "text", value: fixture.expected });
  const actual = source.createTextMark(fixture.style).encodeText(fixture.content);
  assert.deepEqual(actual.graphicSpec.objects.text.items.map(item => item.properties.text), fixture.expected);
  assertChartProgramsEquivalent({ publicProgram: actual, primitiveProgram: primitive, compareSemanticSpec: false });
  const artifact = { scope: "charts", capability: "labels", chart: "semantic-content", variant: fixture.name,
    title: `Final-item labels: ${fixture.name}`,
    userFacingCallChain: `source.createTextMark(${JSON.stringify(fixture.style)}).encodeText(${JSON.stringify(fixture.content)})` };
  const opts = { width: 480, height: 360, regions: [{ name: "marks", x: 40, y: 40, width: 400, height: 280, minimumInkPixels: 1000 }] };
  const a = await assertRenderedPNG(primitive, { ...opts, artifact: { ...artifact, kind: "primitive" } });
  const b = await assertRenderedPNG(actual, { ...opts, artifact: { ...artifact, kind: "user-facing" } });
  assert.equal(a.pixelHash, b.pixelHash);
});

for (const fixture of cases) test(`mark label facade ${fixture.name} matches literal primitives`, async () => {
  const source = fixture.source();
  const id = `${fixture.style.source}-labels`;
  const primitive = source.createTextMark({ id, ...fixture.style, text: "pending" })
    .editGraphics({ target: id, property: "text", value: fixture.expected });
  const actual = source.createMarkLabels({ ...fixture.style, ...fixture.content });
  assertChartProgramsEquivalent({ publicProgram: actual, primitiveProgram: primitive, compareSemanticSpec: false });
  const artifact = { scope: "charts", capability: "labels", chart: "mark-labels", variant: fixture.name,
    title: `Mark label facade: ${fixture.name}`,
    userFacingCallChain: `source.createMarkLabels(${JSON.stringify({ ...fixture.style, ...fixture.content })})` };
  const opts = { width: 480, height: 360, regions: [{ name: "marks", x: 40, y: 40, width: 400, height: 280, minimumInkPixels: 1000 }] };
  const a = await assertRenderedPNG(primitive, { ...opts, artifact: { ...artifact, kind: "primitive" } });
  const b = await assertRenderedPNG(actual, { ...opts, artifact: { ...artifact, kind: "user-facing" } });
  assert.equal(a.pixelHash, b.pixelHash);
});
