import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { describeAction } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const ROWS = Object.freeze([
  Object.freeze({ id: "a", category: "A", group: "left", value: 2 }),
  Object.freeze({ id: "b", category: "A", group: "left", value: 4 }),
  Object.freeze({ id: "c", category: "B", group: "right", value: 6 }),
  Object.freeze({ id: "d", category: "B", group: "right", value: 8 })
]);

function createProgram(rows = ROWS) {
  return chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points", data: "rows" })
    .encodeX({
      target: "points",
      field: "category",
      fieldType: "nominal",
      scale: { domain: ["A", "B"] }
    })
    .encodeY({
      target: "points",
      field: "value",
      fieldType: "quantitative",
      scale: { domain: [0, 10], zero: false }
    });
}

function propertyValues(program, property) {
  return program.graphicSpec.objects.points.items.map(
    item => item.properties[property]
  );
}

test("jitters both axes independently with one public call and unchanged semantics", () => {
  const base = createProgram(), before = JSON.stringify(base);
  const options = { maxOffset: { pixels: 8 }, seed: "two-axes", key: "id" };
  const both = base.jitterPoints({ ...options, channel: "both" });
  for (const channel of ["x", "y"]) {
    const single = base.jitterPoints({ ...options, channel });
    assert.deepEqual(propertyValues(both, channel), propertyValues(single, channel));
    assert.notDeepEqual(propertyValues(both, channel), propertyValues(base, channel));
    assert.deepEqual(both.materializationConfigs.jitters.points.resolved.axes[channel],
      single.materializationConfigs.jitters.points.resolved);
    assert.ok(propertyValues(both, channel).every((value, index) =>
      Math.abs(value - propertyValues(base, channel)[index]) <= 8));
  }
  assert.notDeepEqual(both.materializationConfigs.jitters.points.resolved.axes.x.items.map(i => i.requestedOffset),
    both.materializationConfigs.jitters.points.resolved.axes.y.items.map(i => i.requestedOffset));
  assert.deepEqual(both.semanticSpec, base.semanticSpec);
  assert.equal(both.trace.children.length, base.trace.children.length + 1);
  assert.equal(both.trace.children.at(-1).op, "jitterPoints");
  assert.equal(both.materializationConfigs.jitters.points.resolved.itemCount, ROWS.length);
  assert.equal(JSON.stringify(base), before);
  assert.ok(describeAction(base, { action: "jitterPoints" }).parameterDefinitions
    .find(p => p.path === "channel").choices.includes("both"));
});

test("replaces both-axis jitter from semantic positions, restores an omitted axis and removes both", () => {
  const base = createProgram(), options = { maxOffset: { pixels: 8 }, seed: 17, key: "id" };
  const both = base.jitterPoints({ ...options, channel: "x" }).jitterPoints({ ...options, channel: "both" });
  assert.deepEqual(both.graphicSpec, base.jitterPoints({ ...options, channel: "both" }).graphicSpec);
  const xOnly = both.jitterPoints({ ...options, channel: "x" });
  assert.deepEqual(propertyValues(xOnly, "y"), propertyValues(base, "y"));
  assert.deepEqual(both.removeJitter().graphicSpec, base.graphicSpec);
  assert.equal(both.removeJitter().materializationConfigs.jitters, undefined);
});

test("retains both-axis jitter through keyed reordering, geometry edits, filtering, facets and persistence", () => {
  const options = { channel: "both", maxOffset: { pixels: 8 }, seed: 17, key: "id" };
  const original = createProgram().jitterPoints(options);
  const reversed = createProgram([...ROWS].reverse()).jitterPoints(options);
  for (const axis of ["x", "y"]) {
    const offsets = program => new Map(program.materializationConfigs.jitters.points.resolved.axes[axis].items
      .map(item => [item.identity, item.finalOffset]));
    assert.deepEqual(offsets(original), offsets(reversed));
  }
  const edited = original.editCanvas({ width: 420 }).editPointMark({ shape: "diamond", stroke: "black", strokeWidth: 2 });
  assert.deepEqual(edited.graphicSpec, createProgram().editCanvas({ width: 420 })
    .editPointMark({ shape: "diamond", stroke: "black", strokeWidth: 2 }).jitterPoints(options).graphicSpec);
  const filtered = original.filterMarks({ target: "points", field: "value", op: "gte", value: 4 });
  assert.equal(filtered.materializationConfigs.jitters.points.resolved.itemCount, 3);
  const faceted = original.facet({ field: "group", columns: 2 });
  for (const child of Object.values(faceted.children)) {
    assert.equal(child.materializationConfigs.jitters.points.channel, "both");
    assert.equal(child.materializationConfigs.jitters.points.resolved.itemCount, 2);
  }
  const restored = deserializeProgram(serializeProgram(original));
  assert.deepEqual(restored.graphicSpec, original.graphicSpec);
  assert.deepEqual(restored.materializationConfigs.jitters, original.materializationConfigs.jitters);
  assert.deepEqual(restored.editCanvas({ width: 420 }).graphicSpec, original.editCanvas({ width: 420 }).graphicSpec);
});

test("both-axis band jitter requires categorical slots on both axes and contains each glyph", () => {
  const mixed = createProgram(), before = JSON.stringify(mixed);
  assert.throws(() => mixed.jitterPoints({ channel: "both", maxOffset: { band: .2 } }), /categorical position scale/);
  assert.equal(JSON.stringify(mixed), before);
  const base = chart().createCanvas({ width: 320, height: 240, margin: 30 }).createData({ values: ROWS })
    .createScatterPlot({ id: "points", x: { field: "category", fieldType: "nominal" },
      y: { field: "group", fieldType: "nominal" }, guides: false });
  const both = base.jitterPoints({ channel: "both", maxOffset: { band: .5 } });
  for (const axis of ["x", "y"]) {
    const resolution = both.materializationConfigs.jitters.points.resolved.axes[axis];
    assert.ok(resolution.items.every(item => Math.abs(item.finalOffset) <= resolution.maximum));
    assert.ok(resolution.items.some(item => item.finalOffset !== 0));
  }
});

test("authors deterministic x jitter without changing semantic positions", () => {
  const base = createProgram();
  const jittered = base.jitterPoints({
    channel: "x",
    maxOffset: { band: 0.16 },
    seed: "stable",
    key: "id"
  });
  assert.deepEqual(jittered.semanticSpec, base.semanticSpec);
  assert.deepEqual(propertyValues(jittered, "y"), propertyValues(base, "y"));
  assert.notDeepEqual(propertyValues(jittered, "x"), propertyValues(base, "x"));
  assert.equal(jittered.materializationConfigs.jitters.points.key, "id");
  assert.equal(
    jittered.materializationConfigs.jitters.points.resolved.itemCount,
    ROWS.length
  );
  assert.equal(Object.isFrozen(jittered.materializationConfigs.jitters), true);
  assert.deepEqual(
    jittered.trace.children.at(-1).children.map(node => node.op),
    ["rematerializePointMark"]
  );
  assert.deepEqual(base.materializationConfigs.jitters, undefined);
});

test("replaces jitter from semantic base positions and removes it exactly", () => {
  const base = createProgram();
  const first = base.jitterPoints({
    channel: "x",
    maxOffset: { band: 0.16 },
    seed: 1,
    key: "id"
  });
  const replacement = first.jitterPoints({
    channel: "x",
    maxOffset: { pixels: 0.5 },
    seed: 2,
    key: "id"
  });
  const baseX = propertyValues(base, "x");
  const replacedX = propertyValues(replacement, "x");
  assert.equal(
    replacedX.every((value, index) => Math.abs(value - baseX[index]) <= 0.5),
    true
  );
  assert.notDeepEqual(replacedX, propertyValues(first, "x"));
  const restored = replacement.removeJitter();
  assert.deepEqual(restored.graphicSpec, base.graphicSpec);
  assert.equal(restored.materializationConfigs.jitters, undefined);
  assert.deepEqual(
    restored.trace.children.at(-1).children.map(node => node.op),
    ["rematerializePointMark"]
  );
});

test("keeps keyed offsets stable across source row order", () => {
  const options = {
    channel: "x",
    maxOffset: { pixels: 8 },
    seed: "order",
    key: "id"
  };
  const originalBase = createProgram(ROWS);
  const reversedBase = createProgram([...ROWS].reverse());
  const original = originalBase.jitterPoints(options);
  const reversed = reversedBase.jitterPoints(options);
  const offsets = (program, base, rows) => new Map(rows.map((row, index) => [
    row.id,
    propertyValues(program, "x")[index] - propertyValues(base, "x")[index]
  ]));
  assert.deepEqual(
    offsets(original, originalBase, ROWS),
    offsets(reversed, reversedBase, [...ROWS].reverse())
  );
});

test("converges through Canvas, shape, selection, and highlight rematerialization", () => {
  const jittered = createProgram().jitterPoints({
    channel: "x",
    maxOffset: { band: 0.16 },
    seed: "lifecycle",
    key: "id"
  });
  const options = {
    target: "points",
    select: { field: "id", op: "eq", value: "b" },
    offset: { x: 2, y: -1 },
    dimOthers: false,
    bringToFront: false
  };
  const direct = jittered
    .editPointMark({ shape: "diamond", stroke: "black", strokeWidth: 2 })
    .editCanvas({ width: 420 })
    .highlightMarks(options);
  const reordered = jittered
    .highlightMarks(options)
    .editPointMark({ shape: "diamond", stroke: "black", strokeWidth: 2 })
    .editCanvas({ width: 420 });
  assert.deepEqual(reordered.graphicSpec, direct.graphicSpec);
  assert.deepEqual(
    reordered.materializationConfigs.jitters.points.resolved.items.map(
      item => item.identity
    ),
    ROWS.map(row => row.id)
  );
});

test("replays jitter inside facet children and after mark filtering", () => {
  const jittered = createProgram().jitterPoints({
    channel: "x",
    maxOffset: { band: 0.16 },
    key: "id"
  });
  const filtered = jittered.filterMarks({
    target: "points",
    field: "value",
    op: "gte",
    value: 4
  });
  assert.equal(
    filtered.materializationConfigs.jitters.points.resolved.itemCount,
    3
  );
  const faceted = jittered.facet({ field: "group", columns: 2 });
  assert.deepEqual(
    Object.values(faceted.children).map(child =>
      child.materializationConfigs.jitters.points.resolved.itemCount
    ),
    [2, 2]
  );
});

test("cleans jitter with its mark and validates incompatible requests", () => {
  const jittered = createProgram().jitterPoints({
    channel: "x",
    maxOffset: { pixels: 4 },
    key: "id"
  });
  assert.equal(
    jittered.removeMark({ target: "points" }).materializationConfigs.jitters,
    undefined
  );
  assert.throws(
    () => createProgram([
      { id: "same", category: "A", value: 1 },
      { id: "same", category: "A", value: 2 }
    ]).jitterPoints({
      channel: "x",
      maxOffset: { pixels: 1 },
      key: "id"
    }),
    /must be unique/
  );
  assert.throws(
    () => createProgram().jitterPoints({
      channel: "y",
      maxOffset: { band: 0.1 }
    }),
    /categorical position scale/
  );
  const polar = chart()
    .createCanvas()
    .createData({ values: [{ theta: 0, radius: 1 }] })
    .createPointMark()
    .encodeTheta({ field: "theta", fieldType: "quantitative" })
    .encodeR({ field: "radius", fieldType: "quantitative" });
  assert.throws(
    () => polar.jitterPoints({ channel: "x", maxOffset: { pixels: 1 } }),
    /requires an eligible layer/
  );
});
