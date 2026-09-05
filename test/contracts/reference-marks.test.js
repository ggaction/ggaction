import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { chart } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

test("reference facade graphics equal literal primitives, lower actions, Canvas and PNG", async () => {
  const base = chart().createCanvas({ width: 480, height: 320, margin: 40 }).createData({ values: [] });
  const publicProgram = base.createReferenceBand({ space: "plot", x: [0.2, 0.6] })
    .createReferenceLine({ space: "plot", y: 0.5 });
  const lower = base.createScale({ id: "referenceBand-x", domain: [0, 1] })
    .createRectMark({ id: "referenceBand", data: "data", fill: "#94a3b8", opacity: 0.15, stroke: false })
    .encodeX({ datum: 0.2, scale: { id: "referenceBand-x" } })
    .encodeX2({ datum: 0.6, scale: { id: "referenceBand-x" } })
    .createScale({ id: "referenceLine-y", domain: [0, 1] })
    .createRuleMark({ id: "referenceLine", data: "data", stroke: "#64748b", strokeWidth: 1, strokeDash: "dashed" })
    .encodeY({ datum: 0.5, scale: { id: "referenceLine-y" } });
  assertChartProgramsEquivalent({ publicProgram, primitiveProgram: lower });
  const primitive = base.createGraphics({ id: "referenceBand", type: "rect", length: 0, parent: "plot-main" })
    .editGraphics({ target: "referenceBand", property: "items", value: [{ type: "rect", properties: {
      x: 120, y: 40, width: 160, height: 240, fill: "#94a3b8", opacity: 0.15, stroke: "transparent", strokeWidth: 0
    } }] })
    .createGraphics({ id: "referenceLine", type: "line", length: 0, parent: "plot-main" })
    .editGraphics({ target: "referenceLine", property: "items", value: [{ type: "line", properties: {
      x1: 40, y1: 160, x2: 440, y2: 160, stroke: "#64748b", strokeWidth: 1, strokeDash: [6, 4], opacity: 1
    } }] });
  assertChartProgramsEquivalent({ publicProgram, primitiveProgram: primitive, compareSemanticSpec: false });
  const artifact = { scope: "charts", capability: "references", chart: "line-and-band", variant: "plot",
    title: "Reference line and shaded plot interval", userFacingCallChain:
      'base.createReferenceBand({space:"plot",x:[0.2,0.6]}).createReferenceLine({space:"plot",y:0.5})' };
  const options = { width: 480, height: 320, colors: [{ value: "#eff1f4", tolerance: 2, minimumPixels: 1000 }],
    regions: [{ name: "band", x: 120, y: 40, width: 160, height: 240, minimumInkPixels: 1000 }] };
  const a = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
  const b = await assertRenderedPNG(publicProgram, { ...options, artifact: { ...artifact, kind: "user-facing" } });
  assert.equal(a.pixelHash, b.pixelHash);
});

test("data references retain lower-chain parity and selection after resize and style edits", () => {
  const base = chart().createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values: [{ x: 0 }, { x: 10 }] }).createPointMark().encodeX({ field: "x" }).encodeY({ field: "x" });
  const publicProgram = base.createReferenceBand({ x: [2, 6], fill: "red", opacity: 0.5 });
  const lower = base.createRectMark({ id: "referenceBand", data: "data", fill: "red", opacity: 0.5, stroke: false })
    .encodeX({ datum: 2, fieldType: "quantitative", scale: { id: "x" }, coordinate: "main" })
    .encodeX2({ datum: 6, fieldType: "quantitative", scale: { id: "x" }, coordinate: "main" });
  const edit = p => p.editCanvas({ width: 640, margin: 30 })
    .highlightMarks({ target: "referenceBand", select: { channel: "x2", op: "eq", value: 6 }, fill: "blue" });
  assertChartProgramsEquivalent({ publicProgram: edit(publicProgram), primitiveProgram: edit(lower) });
  assert.equal(edit(publicProgram).graphicSpec.objects.referenceBand.items[0].properties.fill, "blue");
});

test("Rule guide examples execute with complete Canvas setup and explicit field types", () => {
  const source = readFileSync(new URL("../../docs/api/marks/rule.md", import.meta.url), "utf8");
  const blocks = [...source.matchAll(/```javascript\n([\s\S]*?)```/g)].map(match => match[1]);
  assert.equal(blocks.length, 2);
  for (const [index, name] of ["threshold", "program"].entries()) {
    const code = blocks[index].replace('import { chart } from "ggaction";', "");
    const p = new Function("chart", `${code}\nreturn ${name};`)(chart);
    const id = index === 0 ? "rule" : "referenceLine";
    assert.equal(p.graphicSpec.objects[id].items.length, 1);
    assert.ok(renderToSVG(p).includes(index === 0 ? "#dc2626" : "Target"));
  }
});
