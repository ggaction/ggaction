import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

function source(factory, kind) {
  let p = factory().createCanvas({ width: 1800, height: 1400, margin: 450 })
    .createData({ values: [{ x: 0, y: 0, g: "A" }, { x: 1, y: 1, g: "A" },
      { x: 2, y: 2, g: "B" }, { x: 3, y: 3, g: "B" }] });
  p = kind === "line" ? p.createLineMark().encodeGroup({ field: "g" }) : p.createPointMark();
  p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
  return kind === "shape" ? p.encodeShape({ field: "g" }) : p.encodeColor({ field: "g" });
}

test("categorical sides use vertical one-column top-title options in Full and Basic", () => {
  for (const factory of [chart, basicChart]) for (const kind of ["color", "line", "shape"]) {
    const base = source(factory, kind), key = kind === "color" ? "color" : "series";
    for (const position of ["left", "right"]) {
      const p = base.createLegend({ position });
      assert.equal(p.guideConfigs.legend[key].direction, "vertical");
      const options = { position, direction: "vertical", columns: 1, titlePosition: "top" };
      assert.deepEqual(base.createLegend(options).graphicSpec, p.graphicSpec);
      const guides = base.createGuides({ axes: false, grid: false, legend: options });
      assert.deepEqual(guides.graphicSpec, p.graphicSpec);
      for (const patch of [{ direction: "horizontal" }, { columns: 2 }, { titlePosition: "left" }]) {
        const before = JSON.stringify(base);
        assert.throws(() => base.createLegend({ position, ...patch }), /Side legends require/);
        assert.equal(JSON.stringify(base), before);
        if (factory === chart) {
          const snapshot = JSON.stringify(p);
          assert.throws(() => p.editLegendLayout(patch), /Side legends require/);
          assert.equal(JSON.stringify(p), snapshot);
        }
      }
    }
  }
});

test("categorical grids move to either side with explicit compatible options", () => {
  for (const kind of ["color", "line", "shape"]) for (const from of ["top", "bottom"]) {
    const base = source(chart, kind);
    const p = base.createLegend({ position: from, columns: 2, titlePosition: "left", itemGap: 24 });
    for (const position of ["left", "right"]) {
      const patch = { position, columns: 1, titlePosition: "top" };
      const moved = p.editLegendLayout(patch);
      assert.deepEqual(moved.graphicSpec, base.createLegend({ ...patch, itemGap: 24 }).graphicSpec);
      assert.deepEqual(moved.editCanvas({ width: 1900 }).graphicSpec,
        base.editCanvas({ width: 1900 }).createLegend({ ...patch, itemGap: 24 }).graphicSpec);
    }
  }
});
