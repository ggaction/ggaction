import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { chart, hconcat, vconcat } from "../../src/index.js";

const matrixUrl = new URL(
  "../../agent_docs/impl/roadmap3/phase10/INTEGRATION_MATRIX.json",
  import.meta.url
);
const plannedContract = readFileSync(new URL(
  "../../agent_docs/contract/planned/ROADMAP3_EDITING.md",
  import.meta.url
), "utf8");

const rows = Object.freeze([
  Object.freeze({ angle: "A", radius: 1, group: "one" }),
  Object.freeze({ angle: "B", radius: 2, group: "one" }),
  Object.freeze({ angle: "A", radius: 2, group: "two" }),
  Object.freeze({ angle: "B", radius: 3, group: "two" })
]);

function polarProgram() {
  return chart()
    .createCanvas({ width: 220, height: 220, margin: 30 })
    .createData({ values: rows })
    .createPointMark()
    .encodeTheta({ field: "angle", fieldType: "nominal" })
    .encodeR({ field: "radius" })
    .encodeRadius({ value: 3 });
}

test("keeps the Phase 10 integration matrix valid and evidence-addressable", () => {
  const matrix = JSON.parse(readFileSync(matrixUrl, "utf8"));
  const statuses = new Set([
    "current-pass", "current-explicit-error", "gate-pending", "audit-pending"
  ]);

  assert.equal(matrix.schemaVersion, 1);
  assert.equal(matrix.phase, "phase10");
  assert.equal(new Set(matrix.cases.map(entry => entry.id)).size, matrix.cases.length);
  for (const entry of matrix.cases) {
    assert.equal(statuses.has(entry.status), true, `${entry.id} status`);
    if (entry.status === "audit-pending") {
      assert.equal(entry.evidence, null);
    } else {
      assert.equal(existsSync(new URL(`../../${entry.evidence}`, import.meta.url)), true);
    }
  }
  assert.match(plannedContract, /Shared position scale resolution/);
  assert.match(plannedContract, /Cross feature integration/);
});

test("retains Polar children in horizontal and nested concat compositions", () => {
  const polar = polarProgram();
  const horizontal = hconcat({ programs: [polar, polar] });
  const nested = vconcat({ programs: [horizontal, polar] });

  assert.deepEqual(horizontal.graphicSpec.objects.canvas.properties, {
    width: 456,
    height: 220,
    background: "white"
  });
  assert.deepEqual(nested.graphicSpec.objects.canvas.properties, {
    width: 456,
    height: 456,
    background: "white"
  });
  assert.equal(Object.keys(horizontal.children).length, 2);
  assert.equal(Object.keys(nested.children).length, 2);
  assert.equal(polar.compositionSpec, undefined);
});

test("rejects unsupported Polar facet before changing the source program", () => {
  const polar = polarProgram();
  const graphics = polar.graphicSpec;
  const trace = polar.trace;

  assert.throws(
    () => polar.facet({ field: "group" }),
    /must be a complete materializable Cartesian mark/
  );
  assert.equal(polar.graphicSpec, graphics);
  assert.equal(polar.trace, trace);
  assert.equal(polar.compositionSpec, undefined);
});

test("records the current temporal bar-line conflict until Gate K-A approval", () => {
  const values = Object.freeze([
    Object.freeze({ Year: "1970-01-01", Acceleration: 12 }),
    Object.freeze({ Year: "1971-01-01", Acceleration: 15 })
  ]);
  const layered = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "Year", fieldType: "temporal" })
    .encodeY({ field: "Acceleration", aggregate: "mean" })
    .createLineMark({ id: "trend" });

  assert.throws(
    () => layered.encodeY({
      target: "trend",
      field: "Acceleration",
      aggregate: "mean",
      scale: { id: "y" }
    }),
    /temporal bar position scale cannot share a non-bar layout policy/
  );
});
