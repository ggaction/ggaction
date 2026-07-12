import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";

function createEncodedMark(values = [{ value: 0 }, { value: 10 }]) {
  return chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values })
    .createPointMark({ id: "points" })
    .editSemantic({
      property: "layer[points].encoding.x.field",
      value: "value"
    })
    .editSemantic({
      property: "layer[points].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[points].encoding.x.scale",
      value: "x"
    });
}

test("creates an immutable semantic scale through nested primitives", () => {
  const original = chart();
  const program = original.createScale({ id: "x" });
  const node = program.trace.children[0];

  assert.deepEqual(original.semanticSpec.scales, []);
  assert.deepEqual(program.semanticSpec.scales, [
    { id: "x", type: "linear", domain: "auto", range: "auto" }
  ]);
  assert.equal(program.context.currentScale, "x");
  assert.equal(node.op, "createScale");
  assert.deepEqual(
    node.children.map(child => child.op),
    ["editSemantic", "editSemantic", "editSemantic"]
  );
});

test("treats equivalent scale creation as idempotent and rejects conflicts", () => {
  const program = chart().createScale({ id: "x", domain: [0, 10] });
  const repeated = program.createScale({ id: "x", domain: [0, 10] });

  assert.equal(repeated.semanticSpec, program.semanticSpec);
  assert.throws(
    () => program.createScale({ id: "x", domain: [0, 20] }),
    /different definition/
  );
});

test("materializes an automatic scale into concrete graphical values", () => {
  const before = createEncodedMark().createScale({ id: "x" });
  const program = before.rematerializeScale({ id: "x" });
  const points = program.graphicSpec.objects.points.children;
  const node = program.trace.children.at(-1);

  assert.deepEqual(program.resolvedScales.x, {
    type: "linear",
    domain: [0, 10],
    range: [10, 190]
  });
  assert.deepEqual(
    points.map(point => point.properties.x),
    [10, 190]
  );
  assert.equal(before.graphicSpec.objects.points.children[0].properties.x, undefined);
  assert.equal(node.op, "rematerializeScale");
  assert.deepEqual(node.children.map(child => child.op), ["editGraphics"]);
});

test("combines every consumer of a shared scale", () => {
  const program = createEncodedMark([{ value: 0 }, { value: 5 }])
    .createData({ id: "other", values: [{ value: 10 }, { value: 20 }] })
    .createPointMark({ id: "otherPoints" })
    .editSemantic({
      property: "layer[otherPoints].encoding.x.field",
      value: "value"
    })
    .editSemantic({
      property: "layer[otherPoints].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[otherPoints].encoding.x.scale",
      value: "x"
    })
    .createScale({ id: "x" })
    .rematerializeScale({ id: "x" });

  assert.deepEqual(program.resolvedScales.x.domain, [0, 20]);
  assert.deepEqual(
    program.graphicSpec.objects.points.children.map(point => point.properties.x),
    [10, 55]
  );
  assert.deepEqual(
    program.graphicSpec.objects.otherPoints.children.map(
      point => point.properties.x
    ),
    [100, 190]
  );
});

test("applies zero before nice only to an automatic linear domain", () => {
  const automatic = createEncodedMark([{ value: 3.7 }, { value: 18.2 }])
    .createScale({ id: "x", zero: true, nice: true })
    .rematerializeScale({ id: "x" });
  const explicit = createEncodedMark([{ value: 3.7 }, { value: 18.2 }])
    .createScale({
      id: "x",
      domain: [4, 18],
      zero: true,
      nice: true
    })
    .rematerializeScale({ id: "x" });

  assert.deepEqual(automatic.resolvedScales.x.domain, [0, 20]);
  assert.deepEqual(explicit.resolvedScales.x.domain, [4, 18]);
});

test("validates scale actions and materialization requirements", () => {
  assert.throws(() => chart().createScale({ id: "x", type: "log" }), /Unsupported/);
  assert.throws(() => chart().createScale({ id: "x", extra: true }), /Unknown/);
  assert.throws(() => chart().rematerializeScale({ id: "x" }), /Unknown scale/);
  assert.throws(
    () => chart().createScale({ id: "x" }).rematerializeScale({ id: "x" }),
    /no supported consumers/
  );
  assert.throws(
    () => chart().createScale({ id: "x", type: "time", zero: false }),
    /does not support zero/
  );
  assert.throws(
    () => chart().createScale({ id: "x", type: "ordinal", nice: true }),
    /does not support nice/
  );
  assert.throws(
    () => chart().createScale({ id: "x", nice: 1 }),
    /nice must be a boolean/
  );
});
