import { comparableSVG } from "../../../support/identity-equivalence.js";
import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const rows = [1, 2, 4, 5, 8, 10].map((value, i) => ({ group: i < 3 ? "A" : "B", value }));
const base = () => chart().createCanvas({ width: 500, height: 400, margin: 60 })
  .createData({ values: rows });
const x = { field: "group", fieldType: "nominal" };
const y = { field: "value", fieldType: "quantitative" };

for (const method of ["createBoxPlot", "createGradientPlot"]) {
  test(`${method} initial color matches the native followup with deferred position parity`, () => {
    const color = { field: "group", fieldType: "nominal",
      scale: { domain: ["B", "A"], range: ["#cc0000", "#0000cc"] } };
    const p = base(), before = serializeProgram(p);
    const initial = p[method]({ id: "plot", x, y, color, guides: false });
    const followup = p[method]({ id: "plot", x, y, guides: false })
      .encodeColor({ target: "plot", ...color });
    const deferred = p[method]({ id: "plot", color, guides: false })
      .encodeX({ target: "plot", ...x }).encodeY({ target: "plot", ...y });
    assert.equal(comparableSVG(initial), comparableSVG(followup));
    assert.equal(comparableSVG(initial), comparableSVG(deferred));
    assert.equal(renderToSVG(initial), renderToSVG(deserializeProgram(serializeProgram(initial))));
    assert.equal(serializeProgram(p), before);
    assert.equal(initial.semanticSpec.layers.find(layer => layer.id === "plot").encoding.color.field, "group");
  });
  test(`${method} accepts fixed color and creates guides after color materialization`, () => {
    const p = base()[method]({ id: "plot", x, y, color: { value: "#e45756" }, guides: false });
    const q = base()[method]({ id: "plot", x, y, color: "group", guides: {} });
    const fixedFollowup = base()[method]({ id: "plot", x, y, guides: false })
      .encodeColor({ target: "plot", value: "#e45756" });
    assert.equal(comparableSVG(p), comparableSVG(fixedFollowup));
    assert.ok(q.semanticSpec.guides.axis);
    assert.doesNotThrow(() => q.editCanvas({ width: 600, height: 450 }));
    const pending = base()[method]({ id: "plot", color: { field: "missing" } });
    const before = serializeProgram(pending);
    assert.throws(() => pending.encodeX({ target: "plot", ...x }).encodeY({ target: "plot", ...y }));
    assert.equal(serializeProgram(pending), before);
  });
}

test("box facade rejects simultaneous explicit body fill and color encoding", () => {
  const p = base(), before = serializeProgram(p);
  assert.throws(() => p.createBoxPlot({ x, y, color: "group", box: { fill: "red" } }), /cannot be combined/);
  assert.equal(serializeProgram(p), before);
});
