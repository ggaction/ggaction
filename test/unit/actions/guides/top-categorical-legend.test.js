import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import { createCarsDensityAreaValues } from
  "../../../fixtures/carsDensityAreaValues.js";
import { loadCars } from "../../../support/data.js";

function densityArea() {
  return chart()
    .createCanvas({
      width: 720,
      height: 500,
      margin: { top: 130, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .createAreaMark({ id: "densities", opacity: 0.5 })
    .encodeDensity({ field: "Acceleration", groupBy: "Origin", bandwidth: 0.6 })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } });
}

function fiveGroupArea() {
  const values = ["A", "B", "C", "D", "E"].flatMap((group, index) => [
    { value: index + 1, group },
    { value: index + 2, group }
  ]);
  return chart()
    .createCanvas({
      width: 520,
      height: 300,
      margin: { top: 150, right: 30, bottom: 40, left: 30 }
    })
    .createData({ id: "data", values })
    .createAreaMark({ id: "areas" })
    .encodeDensity({ field: "value", groupBy: "group", bandwidth: 1 })
    .encodeColor({ field: "group" });
}

test("creates the density top legend with a left title and area swatches", () => {
  const expected = createCarsDensityAreaValues(loadCars());
  const program = densityArea().createLegend({
    position: "top",
    direction: "vertical",
    columns: 3,
    titlePosition: "left",
    offset: 8
  });

  assert.deepEqual(program.semanticSpec.guides.legend.color, {
    scale: "color",
    title: "Origin"
  });
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendSymbols.children.map(child => ({
      x: child.properties.x,
      y: child.properties.y,
      width: child.properties.width,
      height: child.properties.height,
      fill: child.properties.fill
    })),
    expected.legend.items.map(item => ({
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      fill: item.color
    }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.children.map(child => ({
      x: child.properties.x,
      y: child.properties.y,
      text: child.properties.text
    })),
    expected.legend.items.map(item => ({
      x: item.labelX,
      y: item.labelY,
      text: item.group
    }))
  );
  assert.equal(program.graphicSpec.objects.colorLegendTitle.properties.x, 243);
  assert.equal(program.graphicSpec.objects.colorLegendTitle.properties.y, 116);
  assert.equal(program.graphicSpec.objects.colorLegendTitle.properties.textAlign, "left");
});

test("uses top title position by default", () => {
  const program = densityArea().createLegend({ position: "top", columns: 3 });
  const title = program.graphicSpec.objects.colorLegendTitle.properties;
  const itemY = program.graphicSpec.objects.colorLegendLabels.children[0].properties.y;

  assert.equal(title.textAlign, "center");
  assert.ok(title.y < itemY);
  assert.equal(program.guideConfigs.legend.color.titlePosition, "top");
});

test("lays out horizontal and vertical fill orders deterministically", () => {
  const horizontal = fiveGroupArea().createLegend({
    position: "top",
    columns: 2,
    direction: "horizontal"
  });
  const vertical = fiveGroupArea().createLegend({
    position: "top",
    columns: 2,
    direction: "vertical"
  });
  const h = horizontal.graphicSpec.objects.colorLegendLabels.children.map(
    child => [child.properties.x, child.properties.y]
  );
  const v = vertical.graphicSpec.objects.colorLegendLabels.children.map(
    child => [child.properties.x, child.properties.y]
  );

  assert.equal(h[0][1], h[1][1]);
  assert.equal(h[0][0], h[2][0]);
  assert.equal(v[0][0], v[1][0]);
  assert.equal(v[0][1], v[3][1]);
  assert.notDeepEqual(h, v);
});

test("rematerializes a bordered top legend after Canvas edits", () => {
  const before = densityArea().createLegend({
    position: "top",
    columns: 3,
    titlePosition: "left",
    border: true
  });
  const after = before.editCanvas({ width: 820 });

  assert.notEqual(
    after.graphicSpec.objects.colorLegendSymbols.children[0].properties.x,
    before.graphicSpec.objects.colorLegendSymbols.children[0].properties.x
  );
  assert.notEqual(
    after.graphicSpec.objects.colorLegendBackground.properties.x,
    before.graphicSpec.objects.colorLegendBackground.properties.x
  );
  assert.equal(after.graphicSpec.order.indexOf("colorLegendBackground") <
    after.graphicSpec.order.indexOf("colorLegendSymbols"), true);
});

test("validates top layout vocabulary and available margin", () => {
  assert.throws(
    () => densityArea().createLegend({ position: "top", direction: "diagonal" }),
    /Unsupported legend direction/
  );
  assert.throws(
    () => densityArea().createLegend({ position: "top", columns: 0 }),
    /positive integer/
  );
  assert.throws(
    () => densityArea().createLegend({ position: "top", offset: -1 }),
    /non-negative finite/
  );
  assert.throws(
    () => densityArea().createLegend({ position: "top", titlePosition: "right" }),
    /Unsupported legend titlePosition/
  );
  const cramped = chart()
    .createCanvas({ width: 300, height: 200, margin: 10 })
    .createData({ id: "data", values: [
      { value: 1, group: "A" }, { value: 2, group: "A" }
    ] })
    .createAreaMark({ id: "area" })
    .encodeDensity({ field: "value", groupBy: "group", bandwidth: 1 })
    .encodeColor({ field: "group" });
  assert.throws(
    () => cramped.createLegend({ position: "top" }),
    /more top-margin space/
  );
});
