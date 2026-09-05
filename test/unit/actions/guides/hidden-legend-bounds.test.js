import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

function base(kind) {
  const p = chart().createCanvas({ width: 1600, height: 700, margin: { right: 1100, top: 180, bottom: 180 } })
    .createData({ values: [{ x: 1, y: 1, m: 0 }, { x: 2, y: 2, m: 10 }] }).createPointMark()
    .encodeX({ field: "x" }).encodeY({ field: "y" });
  return kind === "opacity" ? p.encodeOpacity({ field: "m" }) : p.encodeColor({ field: "m", fieldType: "quantitative",
    ...(kind === "interval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
}

test("hidden continuous titles do not reject fitting Canvas sizes or enlarge borders", () => {
  for (const kind of ["gradient", "opacity", "interval"]) {
    const long = base(kind).createLegend({ title: "Long legend title ".repeat(6), border: true }).editLegend({ title: false });
    const hidden = long.editCanvas({ width: 800, margin: { right: 300 } });
    const short = base(kind).createLegend({ title: "m", border: true }).editLegend({ title: false })
      .editCanvas({ width: 800, margin: { right: 300 } });
    assert.deepEqual(hidden.graphicSpec, short.graphicSpec);
    assert.equal(hidden.guideConfigs.legend[kind].titleVisible, false);
    const before = JSON.stringify(hidden);
    assert.throws(() => hidden.editLegend({ title: "Long legend title ".repeat(6) }), /margin|Canvas/);
    assert.equal(JSON.stringify(hidden), before);
  }
});

test("hidden inline opacity titles do not reserve text width or title gap", () => {
  for (const position of ["top", "bottom"]) {
    const source = base("opacity").editCanvas({ width: 1800, margin: { right: 100, left: 100, top: 180, bottom: 180 } });
    const options = { position, titlePosition: "left", border: true, count: 3 };
    const long = source.createLegend({ ...options, title: "Long title ".repeat(6) }).editLegend({ title: false });
    const short = source.createLegend({ ...options, title: "m" }).editLegend({ title: false });
    assert.deepEqual(long.graphicSpec, short.graphicSpec);
  }
});
