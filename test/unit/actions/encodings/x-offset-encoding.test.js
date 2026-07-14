import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = [
  { year: 1850, perc: 2, sex: "men" },
  { year: 1850, perc: 4, sex: "women" },
  { year: 1860, perc: 8, sex: "men" },
  { year: 1860, perc: 10, sex: "women" }
];

function aggregateBarProgram() {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc" });
}

test("encodes a nominal xOffset inside each ordinal x band", () => {
  const before = aggregateBarProgram();
  const program = before.encodeXOffset({ field: "sex" });

  assert.deepEqual(program.semanticSpec.layers[0].encoding.xOffset, {
    field: "sex",
    fieldType: "nominal",
    scale: "xOffset"
  });
  assert.deepEqual(program.semanticSpec.scales[2], {
    id: "xOffset",
    type: "ordinal",
    domain: "auto",
    range: "auto"
  });
  assert.deepEqual(program.resolvedScales.xOffset, {
    type: "ordinal",
    domain: ["men", "women"],
    range: [0, 160],
    step: 80,
    bandwidth: 80
  });
  assert.deepEqual(program.graphicSpec.objects.bars.children, []);
  assert.equal(before.semanticSpec.layers[0].encoding.xOffset, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeXOffset");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeScale"
  ]);
});

test("supports explicit xOffset domain order and reversed range", () => {
  const program = aggregateBarProgram().encodeXOffset({
    field: "sex",
    scale: {
      id: "group",
      domain: ["women", "men"],
      range: [100, 0]
    }
  });

  assert.deepEqual(program.resolvedScales.group, {
    type: "ordinal",
    domain: ["women", "men"],
    range: [100, 0],
    step: -50,
    bandwidth: 50
  });
});

test("rematerializes an automatic xOffset range after Canvas edits", () => {
  const program = aggregateBarProgram().encodeXOffset({ field: "sex" });
  const edited = program.editCanvas({ width: 620 });

  assert.deepEqual(edited.resolvedScales.x.range, [60, 580]);
  assert.deepEqual(edited.resolvedScales.xOffset.range, [0, 260]);
  assert.equal(edited.resolvedScales.xOffset.bandwidth, 130);
  assert.deepEqual(program.resolvedScales.xOffset.range, [0, 160]);
});

test("validates xOffset prerequisites, fields, and scale options", () => {
  const program = aggregateBarProgram();

  assert.throws(() => program.encodeXOffset(), /non-empty string/i);
  assert.throws(
    () => program.encodeXOffset({ field: "missing" }),
    /nominal value/
  );
  assert.throws(
    () => program.encodeXOffset({ field: "sex", fieldType: "quantitative" }),
    /Unsupported color field type/
  );
  assert.throws(
    () => program.encodeXOffset({ field: "sex", scale: { type: "linear" } }),
    /Unsupported color scale type/
  );
  assert.throws(
    () => program.encodeXOffset({ field: "sex", scale: { domain: ["men"] } }),
    /outside the ordinal domain/
  );

  const incomplete = chart()
    .createCanvas({ width: 200, height: 200 })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" });
  assert.throws(
    () => incomplete.encodeXOffset({ field: "sex" }),
    /aggregate\/non-stacked y/
  );
  assert.equal(program.semanticSpec.layers[0].encoding.xOffset, undefined);
});
