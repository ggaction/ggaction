import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { country: "A", value: 20 },
  { country: "B", value: 45 },
  { country: "C", value: 30 }
];

function bars() {
  return chart()
    .createCanvas({
      width: 360,
      height: 260,
      margin: { top: 20, right: 20, bottom: 40, left: 50 }
    })
    .createData({ id: "rows", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({
      field: "country",
      fieldType: "nominal",
      scale: { paddingInner: 0.2, paddingOuter: 0.1 }
    })
    .encodeY({
      field: "value",
      aggregate: "mean",
      scale: { nice: true, zero: true }
    })
    .encodeBarWidth({ band: 0.72 });
}

test("inherits compatible layered point positions without repeated encodings", () => {
  const source = bars();
  const program = source
    .createPointMark({ id: "centers" })
    .encodeRadius({ value: 4 });
  const point = program.semanticSpec.layers.find(layer => layer.id === "centers");
  const barChildren = program.graphicSpec.objects.bars.children;
  const pointChildren = program.graphicSpec.objects.centers.children;

  assert.equal(point.data, "rows");
  assert.equal(point.coordinate, "main");
  assert.deepEqual(point.encoding, {
    x: {
      field: "country",
      fieldType: "nominal",
      scale: "x"
    },
    y: {
      field: "value",
      fieldType: "quantitative",
      scale: "y"
    }
  });
  assert.equal(point.encoding.y.aggregate, undefined);
  assert.ok(pointChildren.every((child, index) =>
    Math.abs(
      child.properties.x -
      (barChildren[index].properties.x + barChildren[index].properties.width / 2)
    ) < 1e-9
  ));
  assert.deepEqual(
    pointChildren.map(child => child.properties.y),
    barChildren.map(child => child.properties.y)
  );
  assert.equal(source.semanticSpec.layers.some(layer => layer.id === "centers"), false);
});

test("prefers the current eligible layer and rejects an ambiguous fallback", () => {
  const twoSources = bars()
    .createPointMark({ id: "firstOverlay" })
    .encodeRadius({ value: 3 });
  const current = twoSources.createPointMark({ id: "secondOverlay" });
  assert.deepEqual(
    current.semanticSpec.layers.find(layer => layer.id === "secondOverlay").encoding,
    twoSources.semanticSpec.layers.find(layer => layer.id === "firstOverlay").encoding
  );

  const withoutEligibleCurrent = twoSources.createLineMark({ id: "pendingLine" });
  assert.throws(
    () => withoutEligibleCurrent.createPointMark({ id: "ambiguousOverlay" }),
    /Layered mark inference is ambiguous/
  );
});
