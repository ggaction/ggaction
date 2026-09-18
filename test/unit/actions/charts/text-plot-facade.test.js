import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const values = [
  { x: 1, y: 2, label: "first\nline", group: "A", date: "2024-01-01", amount: 10 },
  { x: 2, y: 3, label: "second", group: "B", date: "2024-01-02", amount: 100 }
];
const base = () => chart().createCanvas({ width: 800, height: 500, margin: 150 })
  .createData({ id: "rows", values });

test("text plot has three required options and preserves explicit child semantics", () => {
  const source = base();
  const before = serializeProgram(source);
  const result = source.createTextPlot({ x: "x", y: "y", text: "label" });
  const reference = source.createTextMark({ id: "textPlot", data: "rows" })
    .encodeX({ target: "textPlot", field: "x" })
    .encodeY({ target: "textPlot", field: "y" })
    .encodeText({ target: "textPlot", field: "label" })
    .createGuides();
  assert.deepEqual(result.semanticSpec, reference.semanticSpec);
  assert.deepEqual(result.graphicSpec, reference.graphicSpec);
  assert.deepEqual(result.trace.children.at(-1).children.map(child => child.op),
    ["createTextMark", "encodeX", "encodeY", "encodeText", "createGuides"]);
  assert.equal(serializeProgram(source), before);
  assert.equal(typeof basicChart().createTextPlot, "undefined");
});

test("text plot preserves field, constant and formatted content with positions and color", () => {
  for (const [x, y] of [[{ field: "x", scale: { type: "log" } }, { field: "y" }],
    [{ field: "group", fieldType: "nominal" }, { field: "y" }],
    [{ field: "date", fieldType: "temporal" }, { datum: 2 }]]) {
    for (const text of [{ field: "label" }, { value: "constant" }, { field: "amount", format: ".1f" }]) {
      const style = { fontSize: 12, align: "center", lineHeight: 18, blockAlign: "middle" };
      const color = { field: "amount", fieldType: "quantitative", scale: { type: "log" } };
      const source = base();
      const result = source.createTextPlot({ x, y, text, color, style, guides: false });
      const reference = source.createTextMark({ id: "textPlot", data: "rows", ...style })
        .encodeX({ target: "textPlot", ...x }).encodeY({ target: "textPlot", ...y })
        .encodeText({ target: "textPlot", ...text }).encodeColor({ target: "textPlot", ...color });
      assert.deepEqual(result.semanticSpec, reference.semanticSpec);
      assert.deepEqual(result.graphicSpec, reference.graphicSpec);
      assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
      assert.match(renderToSVG(result), /<text/);
    }
  }
});

test("text plot supports guide reuse, independent data, edits, resize and facets", () => {
  const source = base().createScatterPlot({ x: "x", y: "y" });
  const result = source.createTextPlot({ x: "x", y: "y", text: "label", color: "group" });
  assert.equal(result.semanticSpec.layers[1].data, "rows");
  assert.equal(result.semanticSpec.layers[1].source, undefined);
  const edited = result.editTextMark({ target: "textPlot", fontSize: 20 })
    .encodeText({ target: "textPlot", value: "updated" }).editCanvas({ width: 900 });
  assert.match(renderToSVG(edited), /updated/);
  assert.doesNotMatch(renderToSVG(result), /updated/);
  const faceted = base().createTextPlot({ x: "x", y: "y", text: "label", guides: false })
    .facet({ field: "group", columns: 2 });
  const svg = renderToSVG(faceted);
  assert.match(svg, /first/);
  assert.match(svg, /second/);
});

test("text plot rejects unsupported options atomically", () => {
  const source = base();
  const before = serializeProgram(source);
  const valid = { x: "x", y: "y", text: "label", guides: false };
  for (const patch of [{ text: undefined }, { text: { content: "share" } }, { x: { field: "x", target: "foreign" } },
    { y: { field: "y", coordinate: "foreign" } }, { style: { source: "foreign" } },
    { style: { inheritColor: "fill" } }, { style: { fontSize: -1 } },
    { text: { field: "label", value: "both" } }, { text: "absent" },
    { color: { field: "group", target: "foreign" } }, { x: { field: "x", aggregate: "mean" } }]) {
    assert.throws(() => source.createTextPlot({ ...valid, ...patch }));
    assert.equal(serializeProgram(source), before);
  }
  const complete = source.createTextPlot(valid);
  assert.throws(() => complete.createTextPlot(valid), /id|exists|occupied/i);
});
