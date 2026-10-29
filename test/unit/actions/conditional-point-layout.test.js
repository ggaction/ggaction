import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";

const expression = root => ({ version: 2, registry: "standard@1", root });
const selected = expression({ type: "field", name: "selected" });
const rows = [
  { id: "a", selected: true, left: "A", right: "C", value: 5, alternate: 2, chosenCategory: "A", chosenValue: 5 },
  { id: "b", selected: false, left: "C", right: "A", value: 2, alternate: 5, chosenCategory: "A", chosenValue: 5 },
  { id: "c", selected: true, left: "B", right: "C", value: 8, alternate: 2, chosenCategory: "B", chosenValue: 8 }
];
const category = field => ({ field, fieldType: "nominal", scale: { id: "category", type: "point", padding: 0, domain: ["A", "B", "C"], range: [60, 240] } });
const measure = field => ({ field, fieldType: "quantitative", scale: { id: "measure", domain: [0, 10], range: [160, 40] } });
const x = { conditions: [{ when: selected, value: category("left") }], otherwise: category("right") };
const y = { conditions: [{ when: selected, value: measure("value") }], otherwise: measure("alternate") };
const radius = { conditions: [{ when: selected, value: { value: 10 } }], otherwise: { value: 4 } };
const base = () => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "data", values: rows }).createPointMark({ id: "points", data: "data" });
const conditional = () => base().encodeX(x).encodeY(y).encodePointRadius(radius);
const direct = () => base().encodeX(category("chosenCategory")).encodeY(measure("chosenValue")).encodePointRadius(radius);
const properties = program => program.graphicSpec.objects.points.items.map(item => item.properties);
const coordinates = program => properties(program).map(item => [item.x, item.y]);
const methods = [
  { apply: "jitterPoints", remove: "removeJitter", options: { channel: "x", maxOffset: { band: 0.4 }, key: "id", seed: "conditional" } },
  { apply: "packPoints", remove: "removePointPacking", options: { channel: "x", key: "id", padding: 2 } }
];

for (const { apply, remove, options } of methods) {
  test(`conditional positions reuse common scale geometry before and after ${apply}`, () => {
    const original = conditional(), saved = serializeProgram(original);
    assert.deepEqual(coordinates(original), [[60, 100], [60, 100], [150, 64]]);
    const result = original[apply](options);
    assert.deepEqual(properties(result), properties(direct()[apply](options)));
    const assignedFirst = base().encodeX(category("left")).encodeY(measure("value"))
      [apply](options).encodeX(x).encodeY(y).encodePointRadius(radius);
    assert.deepEqual(properties(result), properties(assignedFirst));
    assert.deepEqual(properties(result).map(item => item.radius), [10, 4, 10]);
    assert.deepEqual(properties(result).map(item => item.y), [100, 100, 64]);
    assert.deepEqual(getMarkItems(result, { target: "points" }).map(item => item.channels.x), ["A", "A", "B"]);
    assert.deepEqual(result[remove]().graphicSpec, original.graphicSpec);
    assert.equal(serializeProgram(original), saved);
    assert.equal(serializeProgram(deserializeProgram(serializeProgram(result))), serializeProgram(result));
    assert.deepEqual(result.editCanvas({ width: 360 }).graphicSpec,
      original.editCanvas({ width: 360 })[apply](options).graphicSpec);
    assert.deepEqual(result.editScale({ id: "category", reverse: true }).graphicSpec,
      original.editScale({ id: "category", reverse: true })[apply](options).graphicSpec);
  });

  test(`${apply} recomputes selected fields after data revision and mark filtering`, () => {
    const original = conditional(), result = original[apply](options);
    const revise = { source: "data", id: "next", rowMap: [0, 1, 2], values: rows.map(row => ({ ...row, selected: !row.selected })) };
    assert.deepEqual(result.reviseData(revise).graphicSpec, original.reviseData(revise)[apply](options).graphicSpec);
    const filter = { target: "points", field: "id", op: "oneOf", values: ["a", "b"] };
    assert.deepEqual(result.filterMarks(filter).graphicSpec, original.filterMarks(filter)[apply](options).graphicSpec);
    assert.deepEqual(result.filterMarks(filter).removeMarkFilter({ target: "points" }).graphicSpec, result.graphicSpec);
  });
}

test("packing retains common-scale selected category and radius bounds independently of field names", () => {
  const result = conditional().packPoints({ channel: "x", key: "id", padding: 2 });
  const items = properties(result);
  assert.deepEqual(items.map(item => item.x), [60, 44, 150]);
  assert.ok(Math.abs(items[0].x - items[1].x) >= items[0].radius + items[1].radius + 2);
  for (let index = 0; index < items.length; index += 1) {
    const baseX = [60, 60, 150][index], item = items[index];
    assert.ok(item.x - item.radius >= Math.max(20, baseX - 45));
    assert.ok(item.x + item.radius <= Math.min(280, baseX + 45));
  }
});

const mixedX = {
  conditions: [{ when: selected, value: { ...category("left"), scale: { id: "narrow", type: "point", padding: 0, domain: ["A", "B", "C"], range: [100, 180] } } }],
  otherwise: { ...category("right"), scale: { id: "wide", type: "point", padding: 0, domain: ["A", "B", "C"], range: [100, 420] } }
};
const mixed = () => base().editCanvas({ width: 500 }).encodeX(mixedX).encodeY(y).encodePointRadius(radius);

for (const { apply, remove, options } of methods) {
  test(`${apply} uses each selected scale slot without partitioning colliding points`, () => {
    const original = mixed(), result = original[apply](options);
    const resolved = apply === "jitterPoints" ? result.materializationConfigs.jitters.points.resolved
      : result.materializationConfigs.pointPacking.points.resolved;
    assert.deepEqual(coordinates(original), [[100, 100], [100, 100], [140, 64]]);
    for (let index = 0; index < rows.length; index += 1) {
      const item = properties(result)[index], width = [40, 160, 40][index], center = [100, 100, 140][index];
      assert.ok(item.x - item.radius >= Math.max(20, center - width / 2));
      assert.ok(item.x + item.radius <= Math.min(480, center + width / 2));
      assert.equal(item.y, [100, 100, 64][index]);
    }
    if (apply === "jitterPoints") {
      assert.equal(resolved.maximum, 64);
      assert.ok(Math.abs(resolved.items[0].requestedOffset) <= 16);
      assert.ok(Math.abs(resolved.items[1].requestedOffset) <= 64);
    } else {
      assert.equal(resolved.slotWidth, 160);
      assert.equal(resolved.maximumOffset, 80);
      assert.deepEqual(properties(result).map(item => item.x), [100, 84, 140]);
      assert.equal(resolved.unresolvedItemCount, 0);
    }
    assert.deepEqual(result[remove]().graphicSpec, original.graphicSpec);
    assert.deepEqual(result.editScale({ id: "wide", range: [100, 300] }).graphicSpec,
      original.editScale({ id: "wide", range: [100, 300] })[apply](options).graphicSpec);
    assert.equal(serializeProgram(deserializeProgram(serializeProgram(result))), serializeProgram(result));
    assert.equal(resolved.items.some(item => Object.hasOwn(item, "scale")), false);
  });

  test(`${apply} replays parameter, selection and facet changes from selected values`, () => {
    const start = base().createParameter({ id: "on", value: true });
    const conditionalX = { ...x, conditions: [{ ...x.conditions[0], when: expression({ type: "parameter", id: "on" }) }] };
    const original = start.encodeX(conditionalX).encodeY(y).encodePointRadius(radius);
    const result = original[apply](options);
    assert.deepEqual(result.editParameter({ target: "on", value: false }).graphicSpec,
      original.editParameter({ target: "on", value: false })[apply](options).graphicSpec);
    const selection = original.selectMarks({ id: "chosen", target: "points", field: "id", op: "eq", value: "a" })
      .encodeX({ ...x, conditions: [{ ...x.conditions[0], when: { selection: "chosen" } }] });
    const selectionEdit = { selection: "chosen", field: "id", op: "eq", value: "b" };
    assert.deepEqual(selection[apply](options).editMarkSelection(selectionEdit).graphicSpec,
      selection.editMarkSelection(selectionEdit)[apply](options).graphicSpec);
    const facet = result.facet({ field: "id", columns: 3 });
    for (const child of Object.values(facet.children)) {
      assert.deepEqual(child[remove]()[apply](options).graphicSpec, child.graphicSpec);
    }
  });
}

test("jitter supports both selected axes and packing preserves the opposite conditional measure", () => {
  const original = conditional();
  const options = { channel: "both", maxOffset: { pixels: 12 }, key: "id", seed: "conditional" };
  const both = original.jitterPoints(options);
  assert.deepEqual(properties(both).map(item => item.x), properties(original.jitterPoints({ ...options, channel: "x" })).map(item => item.x));
  assert.deepEqual(properties(both).map(item => item.y), properties(original.jitterPoints({ ...options, channel: "y" })).map(item => item.y));
  const flipped = base().encodeX(y).encodeY(x).encodePointRadius(radius);
  const packed = flipped.packPoints({ channel: "y", key: "id", padding: 2 });
  assert.deepEqual(properties(packed).map(item => item.x), [100, 100, 64]);
  assert.deepEqual(properties(packed).map(item => item.y), [60, 44, 150]);
});

test("inactive incompatible slots reject point layout atomically", () => {
  const numeric = { ...measure("value"), scale: { id: "numericX", domain: [0, 10] } };
  const original = base().encodeY(y).encodeX({ conditions: [{ when: expression({ type: "literal", value: false }), value: numeric }], otherwise: category("right") });
  const saved = serializeProgram(original);
  assert.throws(() => original.jitterPoints({ channel: "x", maxOffset: { band: 0.1 } }), /categorical.*slot/);
  assert.throws(() => original.packPoints({ channel: "x" }), /eligible layer/);
  assert.equal(serializeProgram(original), saved);
  const packed = conditional().packPoints({ channel: "x", key: "id" });
  const packedSaved = serializeProgram(packed);
  assert.throws(() => packed.encodeX({ conditions: [{ when: expression({ type: "literal", value: false }), value: numeric }], otherwise: category("right") }), /categorical position/);
  assert.equal(serializeProgram(packed), packedSaved);
});


test("stored packing revalidates all opposite-axis branch types on later encoding edits", () => {
  const original = base().encodeX(y).encodeY(x).packPoints({ channel: "y", key: "id" });
  const saved = serializeProgram(original);
  assert.throws(() => original.encodeX({ conditions: [{ when: expression({ type: "literal", value: false }),
    value: { field: "left", fieldType: "nominal", scale: { id: "wrongX" } } }], otherwise: measure("value") }), /quantitative or temporal opposite position/);
  assert.equal(serializeProgram(original), saved);
});

test("conditional stroke extents participate in packing and jitter before appearance is applied", () => {
  const original = conditional().encodeStroke({ conditions: [{ when: selected, value: { value: "black" } }], otherwise: { value: "gray" } })
    .encodeStrokeWidth({ conditions: [{ when: selected, value: { value: 20 } }], otherwise: { value: 0 } });
  const packed = original.packPoints({ channel: "x", key: "id", padding: 2 });
  assert.deepEqual(properties(packed).map(item => [item.x, item.strokeWidth]), [[60, 20], [34, 0], [150, 20]]);
  const jittered = original.jitterPoints({ channel: "x", key: "id", maxOffset: { pixels: 100 }, seed: "extent" });
  for (let index = 0; index < rows.length; index += 1) {
    const item = properties(jittered)[index], halfExtent = item.radius + item.strokeWidth / 2, baseX = [60, 60, 150][index];
    assert.ok(item.x - halfExtent >= Math.max(20, baseX - 45));
    assert.ok(item.x + halfExtent <= Math.min(280, baseX + 45));
  }
});


test("layout coordinate selections reject radius and stroke feedback before slot computation", () => {
  for (const { apply, options } of methods) {
    const original = direct()[apply](options).selectMarks({ id: "leftmost", target: "points", property: "x", op: "lt", value: 100 });
    const selected = value => ({ conditions: [{ when: { selection: "leftmost" }, value }], otherwise: { value: 2 } });
    assert.throws(() => original.encodePointRadius(selected({ value: 10 })), /Cyclic conditional/);
    assert.throws(() => original.encodeStrokeWidth(selected({ value: 10 })), /Cyclic conditional/);
    assert.doesNotThrow(() => original.encodeColor({ conditions: [{ when: { selection: "leftmost" }, value: { value: "red" } }], otherwise: { value: "blue" } }));
  }
});
