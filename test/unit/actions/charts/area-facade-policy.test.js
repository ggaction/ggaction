import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { getWrappedActionMetadata } from "../../../../src/core/action.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { getMarkItems } from "../../../../src/inspection.js";

const rows = ["a", "b"].flatMap((series, group) => [2, 4, 3].map((value, x) => ({
  id: `${series}:${x}`, x, series, value: value + group
})));
const options = { x: "x", y: "value", groupBy: "series", guides: false };
function capturing(values = rows) {
  const Base = chart().constructor, calls = [];
  let armed = false;
  class CapturingProgram extends Base {}
  for (let prototype = Base.prototype; prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype)) {
    for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(prototype))) {
      if (!getWrappedActionMetadata(descriptor.value) || Object.hasOwn(CapturingProgram.prototype, name)) continue;
      CapturingProgram.prototype[name] = function (args) {
        if (armed && this.actionStack.length > 0) calls.push(name);
        return descriptor.value.call(this, args);
      };
    }
  }
  const program = new CapturingProgram().createCanvas({ width: 500, height: 300, margin: 40 })
    .createData({ id: "source", values, keyField: "id" });
  return { program, calls, arm() { armed = true; } };
}

for (const mode of ["stack", "fill", "center", "wiggle"]) test(`Area ${mode} shares its final value policy through creation, revision and restore`, () => {
  const program = chart().createCanvas({ width: 500, height: 300, margin: 40 })
    .createData({ id: "source", values: rows, keyField: "id" });
  const first = program.createAreaPlot({ id: "first", ...options, layout: mode });
  const before = serializeProgram(first);
  const second = first.createAreaPlot({ id: "second", ...options, layout: mode });
  assert.deepEqual(second.resolvedScales.y.domain, first.resolvedScales.y.domain);
  assert.deepEqual(second.graphicSpec.objects.first.items.map(item => item.properties.commands),
    second.graphicSpec.objects.second.items.map(item => item.properties.commands));
  assert.deepEqual(second.semanticSpec.layers.map(layer => layer.layout), [{ mode }, { mode }]);
  const keys = getMarkItems(second, { target: "second" }).map(item => item.key);
  const revised = deserializeProgram(serializeProgram(second)).reviseData({ source: "source", id: "revised",
    values: rows.map(row => ({ ...row, value: row.value * 2 })) });
  assert.deepEqual(getMarkItems(revised, { target: "second" }).map(item => item.key), keys);
  assert.deepEqual(revised.graphicSpec.objects.first.items.map(item => item.properties.commands),
    revised.graphicSpec.objects.second.items.map(item => item.properties.commands));
  assert.equal(serializeProgram(first), before);
});

test("Area final layout rejects incompatible shared policies and invalid grids before every child", () => {
  for (const layout of ["fill", "center", "wiggle"]) {
    const state = capturing();
    const p = state.program.createAreaPlot({ id: "first", ...options, layout: "wiggle" });
    const request = layout === "wiggle" ? { ...options, y: { field: "value", scale: { domain: [0, 1] } }, layout }
      : { ...options, layout };
    const before = JSON.stringify(p); state.arm();
    assert.throws(() => p.createAreaPlot({ id: "other", ...request }), /layout policy|every resolved bound/);
    assert.deepEqual(state.calls, []);
    assert.equal(JSON.stringify(p), before);
  }
  for (const patch of [{ layout: "group" }, { layout: "wiggle", baseline: 1 }, { layout: "center", valueChannel: "x", x: "value", y: "x" }]) {
    const state = capturing(); state.arm();
    assert.throws(() => state.program.createAreaPlot({ id: "other", ...options, ...patch }));
    assert.deepEqual(state.calls, []);
  }
});

test("Area and an ordinary point keep incompatible shared scale policy rejection before children", () => {
  const state = capturing();
  const p = state.program.createScatterPlot({ id: "point", x: "x", y: "value", guides: false });
  const before = JSON.stringify(p); state.arm();
  assert.throws(() => p.createAreaPlot({ id: "area", ...options, layout: "wiggle" }), /another policy/);
  assert.deepEqual(state.calls, []);
  assert.equal(JSON.stringify(p), before);
});

test("Direct layoutSeries still requires complete Area positions", () => {
  const state = capturing(), p = state.program.createAreaMark({ id: "area" });
  state.arm();
  assert.throws(() => p.layoutSeries({ target: "area", mode: "wiggle" }), /complete positions/);
  assert.deepEqual(state.calls, []);
});


test("Area final grid and nonnegative-value constraints reject before mark creation", () => {
  for (const values of [rows.slice(1), [...rows, { ...rows[0], id: "duplicate-position" }],
    rows.map((row, index) => index ? row : { ...row, value: -1 })]) {
    const state = capturing(values), before = JSON.stringify(state.program);
    state.arm();
    assert.throws(() => state.program.createAreaPlot({ ...options, layout: "wiggle" }),
      /aligned|unique|non-?negative/);
    assert.deepEqual(state.calls, []);
    assert.equal(JSON.stringify(state.program), before);
  }
});
