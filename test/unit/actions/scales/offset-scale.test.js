import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveOffsetScalePolicy } from "../../../../src/materialization/scales/policies/offset.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

const rows = Object.freeze([
  Object.freeze({ category: "A", subgroup: "u", value: 1 }),
  Object.freeze({ category: "A", subgroup: "v", value: 2 }),
  Object.freeze({ category: "B", subgroup: "u", value: 3 }),
  Object.freeze({ category: "B", subgroup: "v", value: 4 })
]);

function vertical(id = "bars", offsetScale = "xOffset") {
  return chart()
    .createCanvas({ width: 260, height: 220, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createBarMark({ id, data: "rows" })
    .encodeX({ target: id, field: "category", fieldType: "nominal" })
    .encodeY({ target: id, field: "value" })
    .encodeXOffset({
      target: id,
      field: "subgroup",
      scale: { id: offsetScale }
    })
    .encodeColor({ target: id, field: "subgroup" })
    .encodeBarWidth({ target: id });
}

function horizontal() {
  return chart()
    .createCanvas({ width: 260, height: 260, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createBarMark({ id: "bars", data: "rows" })
    .encodeY({ target: "bars", field: "category", fieldType: "nominal" })
    .encodeX({ target: "bars", field: "value" })
    .encodeYOffset({ target: "bars", field: "subgroup" })
    .encodeBarWidth({ target: "bars" });
}

function semanticScale(program, id) {
  return program.semanticSpec.scales.find(scale => scale.id === id);
}

test("owns offset spacing on the semantic scale and satisfies the fixed band math", () => {
  const before = vertical();
  const options = Object.freeze({
    target: "bars",
    paddingInner: 0.2,
    paddingOuter: 0.1,
    align: 0.5
  });
  const after = before.editXOffsetScale(options);

  assert.deepEqual(before.resolvedScales.xOffset, {
    type: "ordinal",
    domain: ["u", "v"],
    range: [0, 100],
    step: 50,
    start: 0,
    bandwidth: 50,
    paddingInner: 0,
    paddingOuter: 0,
    align: 0.5
  });
  assert.deepEqual(after.resolvedScales.xOffset, {
    type: "ordinal",
    domain: ["u", "v"],
    range: [0, 100],
    step: 50,
    start: 5,
    bandwidth: 40,
    paddingInner: 0.2,
    paddingOuter: 0.1,
    align: 0.5
  });
  assert.deepEqual(semanticScale(after, "xOffset"), {
    id: "xOffset",
    type: "ordinal",
    domain: "auto",
    range: "auto",
    paddingInner: 0.2,
    paddingOuter: 0.1,
    align: 0.5
  });
  assert.equal(after.markConfigs.bars.xOffset, undefined);
  assert.equal(before.resolvedScales.xOffset.bandwidth, 50);
  assert.equal(after.trace.children.at(-1).op, "editXOffsetScale");
  assert.deepEqual(
    after.trace.children.at(-1).children.map(child => child.op),
    ["editScale"]
  );
});

test("keeps semantic spacing through parent resize and supports shorthand and align", () => {
  const source = vertical().editXOffsetScale({
    target: "bars", padding: 0.2, align: 0
  });
  const resized = source.editCanvas({ width: 460 });

  assert.deepEqual(
    (({ paddingInner, paddingOuter, align }) => ({
      paddingInner, paddingOuter, align
    }))(semanticScale(source, "xOffset")),
    { paddingInner: 0.2, paddingOuter: 0.2, align: 0 }
  );
  assert.equal(source.resolvedScales.xOffset.start, 0);
  assert.equal(source.resolvedScales.xOffset.bandwidth, 36.36363636363637);
  assert.deepEqual(resized.resolvedScales.xOffset.range, [0, 200]);
  assert.equal(resized.resolvedScales.xOffset.start, 0);
  assert.equal(resized.resolvedScales.xOffset.bandwidth, 72.72727272727273);
});

test("reorders only subgroup positions and preserves parent and color domains", () => {
  const before = vertical();
  const xDomain = before.resolvedScales.x.domain;
  const colorDomain = before.resolvedScales.color.domain;
  const beforeGeometry = before.graphicSpec.objects.bars.items.map(
    item => [item.properties.x, item.properties.height]
  );
  const after = before.editXOffsetScale({
    target: "bars", domain: ["v", "u"]
  });
  const afterGeometry = after.graphicSpec.objects.bars.items.map(
    item => [item.properties.x, item.properties.height]
  );

  assert.deepEqual(after.resolvedScales.x.domain, xDomain);
  assert.deepEqual(after.resolvedScales.color.domain, colorDomain);
  assert.deepEqual(after.resolvedScales.xOffset.domain, ["v", "u"]);
  assert.deepEqual(afterGeometry, [
    [beforeGeometry[0][0], beforeGeometry[1][1]],
    [beforeGeometry[1][0], beforeGeometry[0][1]],
    [beforeGeometry[2][0], beforeGeometry[3][1]],
    [beforeGeometry[3][0], beforeGeometry[2][1]]
  ]);
  assert.deepEqual(before.resolvedScales.xOffset.domain, ["u", "v"]);
});

test("edits yOffset with the same policy and reverses identity positions", () => {
  const before = horizontal();
  const after = before.editYOffsetScale({
    target: "bars", paddingInner: 0.2, paddingOuter: 0.1, reverse: true
  });

  assert.deepEqual(after.resolvedScales.yOffset.range, [100, 0]);
  assert.equal(after.resolvedScales.yOffset.step, -50);
  assert.equal(after.resolvedScales.yOffset.bandwidth, 40);
  assert.equal(after.resolvedScales.yOffset.start, 95);
  assert.equal(semanticScale(after, "yOffset").reverse, true);
  assert.equal(after.markConfigs.bars.yOffset, undefined);
});

test("updates every consumer of a shared offset scale", () => {
  let source = vertical("left", "slots")
    .createBarMark({ id: "right", data: "rows" })
    .encodeX({
      target: "right", field: "category", fieldType: "nominal", scale: { id: "x" }
    })
    .encodeY({ target: "right", field: "value", scale: { id: "rightY" } })
    .encodeXOffset({ target: "right", field: "subgroup", scale: { id: "slots" } })
    .encodeBarWidth({ target: "right" });
  const beforeRight = source.graphicSpec.objects.right.items.map(
    item => item.properties.width
  );
  const after = source.editXOffsetScale({ target: "left", padding: 0.25 });

  assert.equal(semanticScale(after, "slots").paddingInner, 0.25);
  assert.equal(after.resolvedScales.slots.paddingOuter, 0.25);
  assert.notDeepEqual(
    after.graphicSpec.objects.right.items.map(item => item.properties.width),
    beforeRight
  );
  assert.equal(after.markConfigs.left.xOffset, undefined);
  assert.equal(after.markConfigs.right.xOffset, undefined);
});

test("uses a point parent step as the focused offset slot", () => {
  const source = chart()
    .createCanvas({ width: 260, height: 220, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points", data: "rows" })
    .encodeX({
      target: "points",
      field: "category",
      fieldType: "nominal",
      scale: { type: "point" }
    })
    .encodeY({ target: "points", field: "value" })
    .encodeXOffset({ target: "points", field: "subgroup" });
  const after = source.editXOffsetScale({
    target: "points", paddingInner: 0.2, paddingOuter: 0.1
  });

  assert.deepEqual(after.resolvedScales.xOffset.range, [
    0,
    Math.abs(after.resolvedScales.x.step)
  ]);
  assert.equal(
    after.resolvedScales.xOffset.bandwidth,
    Math.abs(after.resolvedScales.x.step) * 0.4
  );
});

test("preserves binned parent slots and rejects shared-slot mismatches", () => {
  const scale = {
    id: "slots",
    type: "ordinal",
    paddingInner: 0.2,
    paddingOuter: 0.1,
    align: 0.5
  };
  const binned = {
    layer: { id: "hist", encoding: { x: { bin: {} } } }
  };
  const banded = {
    layer: { id: "bars", encoding: { x: { scale: "x" } } }
  };

  assert.deepEqual(resolveOffsetScalePolicy({
    scale,
    consumers: [binned],
    resolvedScales: {},
    markConfigs: {},
    id: "slots",
    channel: "xOffset"
  }), {
    parentBandwidth: 1,
    paddingInner: 0.2,
    paddingOuter: 0.1,
    align: 0.5
  });
  assert.throws(() => resolveOffsetScalePolicy({
    scale,
    consumers: [binned, banded],
    resolvedScales: { x: { type: "band", bandwidth: 2 } },
    markConfigs: {},
    id: "slots",
    channel: "xOffset"
  }), /one shared resolved x categorical slot/);
});

test("migrates one consistent legacy mark policy and rejects conflicting owners", () => {
  const canonical = vertical("left", "slots")
    .createBarMark({ id: "right", data: "rows" })
    .encodeX({
      target: "right", field: "category", fieldType: "nominal", scale: { id: "x" }
    })
    .encodeY({ target: "right", field: "value", scale: { id: "rightY" } })
    .encodeXOffset({ target: "right", field: "subgroup", scale: { id: "slots" } })
    .encodeBarWidth({ target: "right" });
  let legacy = canonical;
  for (const property of ["paddingInner", "paddingOuter", "align"]) {
    legacy = legacy.editSemantic({
      property: `scale[slots].${property}`, remove: true
    });
  }
  legacy = legacy
    ._withMarkConfig("left", {
      ...legacy.markConfigs.left,
      xOffset: { paddingInner: 0.2, paddingOuter: 0.1 }
    })
    ._withMarkConfig("right", {
      ...legacy.markConfigs.right,
      xOffset: { paddingInner: 0.2, paddingOuter: 0.1 }
    });
  const migrated = legacy.editXOffsetScale({ target: "left", align: 1 });

  assert.deepEqual(
    (({ paddingInner, paddingOuter, align }) => ({
      paddingInner, paddingOuter, align
    }))(semanticScale(migrated, "slots")),
    { paddingInner: 0.2, paddingOuter: 0.1, align: 1 }
  );
  assert.equal(migrated.markConfigs.left.xOffset, undefined);
  assert.equal(migrated.markConfigs.right.xOffset, undefined);

  const conflicting = legacy._withMarkConfig("right", {
    ...legacy.markConfigs.right,
    xOffset: { paddingInner: 0.3, paddingOuter: 0.1 }
  });
  assertAtomicFailures(conflicting, [{
    operation: () => conflicting.editXOffsetScale({
      target: "left", align: 0
    }),
    error: /one shared padding policy/
  }]);
});

test("rejects invalid and unsupported focused offset edits atomically", () => {
  const source = vertical();
  const noOffset = chart()
    .createCanvas()
    .createData({ values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "category", fieldType: "nominal" })
    .encodeY({ target: "points", field: "value" });

  assertAtomicFailures(source, [
    { operation: () => source.editXOffsetScale({ target: "bars" }), error: /at least one/ },
    { operation: () => source.editXOffsetScale({ target: "bars", range: [0, 50] }), error: /Unknown.*range/ },
    { operation: () => source.editXOffsetScale({ target: "bars", order: ["v", "u"] }), error: /Unknown.*order/ },
    { operation: () => source.editXOffsetScale({ target: "bars", type: "linear" }), error: /Unknown.*type/ },
    { operation: () => source.editXOffsetScale({ target: "bars", paddingInner: 1 }), error: /paddingInner/ },
    { operation: () => source.editXOffsetScale({ target: "bars", paddingOuter: -1 }), error: /paddingOuter/ },
    { operation: () => source.editXOffsetScale({ target: "bars", align: 2 }), error: /align/ },
    { operation: () => source.editXOffsetScale({ target: "bars", padding: 0.2, paddingInner: 0.1 }), error: /cannot be combined/ },
    { operation: () => source.editXOffsetScale({ target: "bars", domain: ["u"] }), error: /outside the ordinal domain/ },
    { operation: () => source.editScale({ id: "xOffset", range: [0, 50] }), error: /derived from its parent/ }
  ]);
  assertAtomicFailures(noOffset, [{
    operation: () => noOffset.editXOffsetScale({ target: "points", reverse: true }),
    error: /has no xOffset scale/
  }]);
});
