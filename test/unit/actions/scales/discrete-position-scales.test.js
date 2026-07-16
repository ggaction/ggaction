import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { category: "A", value: 2 },
  { category: "B", value: 5 },
  { category: "C", value: 3 }
];

function base() {
  return chart()
    .createCanvas({
      width: 360,
      height: 260,
      margin: { top: 20, right: 20, bottom: 40, left: 50 }
    })
    .createData({ id: "rows", values: rows });
}

test("uses point scales for categorical points and rematerializes padding edits", () => {
  const program = base()
    .createPointMark({ id: "points" })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" })
    .encodeRadius({ value: 4 });
  const before = program.graphicSpec.objects.points.children.map(
    child => child.properties.x
  );
  const edited = program.editScale({ id: "x", padding: 0, align: 0 });
  const after = edited.graphicSpec.objects.points.children.map(
    child => child.properties.x
  );

  assert.deepEqual(program.semanticSpec.scales.find(scale => scale.id === "x"), {
    id: "x",
    type: "point",
    domain: "auto",
    range: "auto",
    padding: 0.5,
    align: 0.5
  });
  assert.notDeepEqual(after, before);
  assert.equal(edited.semanticSpec.scales.find(scale => scale.id === "x").padding, 0);
});

test("shares one editable band scale across bars and inferred point centers", () => {
  const program = base()
    .createBarMark({ id: "bars" })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({
      field: "value",
      aggregate: "mean",
      scale: { nice: true, zero: true }
    })
    .encodeBarWidth({ band: 0.72 })
    .createPointMark({ id: "centers" })
    .encodeRadius({ value: 4 });
  const edited = program.editScale({
    id: "x",
    paddingInner: 0.4,
    paddingOuter: 0.2,
    align: 0
  });
  const bars = edited.graphicSpec.objects.bars.children;
  const points = edited.graphicSpec.objects.centers.children;

  assert.equal(edited.semanticSpec.scales.find(scale => scale.id === "x").type, "band");
  assert.ok(points.every((child, index) =>
    Math.abs(
      child.properties.x -
      (bars[index].properties.x + bars[index].properties.width / 2)
    ) < 1e-9
  ));
  assert.throws(
    () => edited.editScale({ id: "x", type: "point" }),
    /cannot provide bar bandwidth/
  );
});

test("rejects a point scale for a categorical bar position", () => {
  assert.throws(
    () => base()
      .createBarMark({ id: "bars" })
      .encodeX({
        field: "category",
        fieldType: "nominal",
        scale: { type: "point" }
      }),
    /require a band scale/
  );
});
