import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { loadCars } from "../../../support/data.js";

function boxPlot(horizontal) {
  const measure = { field: "Miles_per_Gallon" };
  const category = { field: "Origin", fieldType: "nominal" };
  return chart()
    .createCanvas({ plot: { width: 314, height: 314 },
      margin: { left: 170, right: 216, top: 42, bottom: 74 } })
    .createData({ id: "dataset", values: loadCars() })
    .filterData({ id: "selected", source: "dataset", field: "Miles_per_Gallon",
      noneOf: [null], nulls: "exclude" })
    .createBoxPlot({ id: "plot", data: "selected", x: horizontal ? measure : category,
      y: horizontal ? category : measure, whisker: { type: "tukey" } })
    .encodeBarWidth({ target: "plot", pixels: 24 })
    .encodeColor({ target: "plot", field: "Origin", fieldType: "nominal",
      scale: { palette: "tableau10" } })
    .encodeStroke({ target: "plot", value: "#000000" });
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
}

for (const horizontal of [true, false]) {
  for (const policy of ["shared", "independent"]) {
    for (const highlighted of [false, true]) {
      test(`${horizontal ? "horizontal" : "vertical"} box facets align all components with ${policy} scales${highlighted ? " and highlights" : ""}`, () => {
        const base = boxPlot(horizontal);
        const source = highlighted ? base.highlightMarks({ target: "plot",
          select: { field: "Origin", op: "eq", value: "USA" },
          opacity: 0.4, bringToFront: false }) : base;
        const before = JSON.stringify(source.graphicSpec);
        const result = source.facet({ field: "Origin", data: "selected", columns: 4,
          spacing: "plot", gap: 32, scales: { x: policy, y: policy },
          guides: { axes: "outer", legend: "shared" } })
          .createGuides({ legend: { target: "plot", channels: ["color"] } });
        const category = horizontal ? "y" : "x";
        const measure = horizontal ? "x" : "y";
        const thickness = horizontal ? "height" : "width";
        const extent = horizontal ? "width" : "height";
        const sourceLayer = source.semanticSpec.layers.find(layer => layer.id === "plot");
        let outlierCount = 0;
        for (const child of Object.values(result.children)) {
          const objects = child.graphicSpec.objects;
          const body = objects.plot.items[0].properties;
          const center = body[category] + body[thickness] / 2;
          near(body[thickness], 24);
          for (const id of ["plotWhisker", "plotWhiskerLowerCap", "plotWhiskerUpperCap", "plotMedian"]) {
            const rule = objects[id].items[0].properties;
            near((rule[`${category}1`] + rule[`${category}2`]) / 2, center);
          }
          const median = objects.plotMedian.items[0].properties;
          near(median[`${category}1`], body[category]);
          near(median[`${category}2`], body[category] + body[thickness]);
          assert.ok(median[`${measure}1`] >= body[measure] - 1e-8);
          assert.ok(median[`${measure}1`] <= body[measure] + body[extent] + 1e-8);
          for (const item of objects.plotOutliers.items) {
            const values = item.properties.commands.map(command => command[category])
              .filter(Number.isFinite);
            near((Math.min(...values) + Math.max(...values)) / 2, center);
            outlierCount++;
          }
          for (const channel of ["x", "y"]) {
            const id = sourceLayer.encoding[channel].scale;
            if (policy === "shared") {
              assert.deepEqual(child.resolvedScales[id].domain, source.resolvedScales[id].domain);
            } else if (channel === category) {
              assert.equal(child.resolvedScales[id].domain.length, 1);
            }
          }
        }
        assert.ok(outlierCount > 0);
        assert.equal(JSON.stringify(source.graphicSpec), before);
      });
    }
  }
}
