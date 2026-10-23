import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { describeAction } from "../../../../src/inspection.js";
import { chart as basic } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const values = [{ x: 1, y: 2, g: "A" }, { x: 2, y: 5, g: "B" }, { x: 3, y: 8, g: "A" }, { x: 4, y: 9, g: "B" }];
const base = (factory = chart) => factory().createCanvas({ width: 800, height: 600, margin: 160 })
  .createData({ values });
const point = (factory, shape = "circle") => base(factory)
  .createScatterPlot({ id: "points", x: "x", y: "y", point: { shape, stroke: "black", strokeWidth: 2 }, guides: false });
const items = p => p.graphicSpec.objects.points.items;
const area = (object, item) => (item.type ?? object.type) === "circle"
  ? Math.PI * item.properties.radius ** 2 : item.properties.width * item.properties.height;

for (const [name, factory] of [["Full", chart], ["Basic", basic]]) {
  test(`${name} color and size transition both ways in one native call`, () => {
    const original = point(factory).encodeColor({ field: "g" }).encodeSize({ field: "y" })
      .createGuides();
    for (const [method, channel, value, field] of [
      ["encodeColor", "color", "#b94b40", "g"], ["encodeSize", "size", 81, "y"]
    ]) {
      const before = serializeProgram(original);
      const fixed = original[method]({ target: "points", value });
      assert.equal(fixed.semanticSpec.layers[0].encoding[channel], undefined);
      assert.equal(fixed.trace.children.length, original.trace.children.length + 1);
      assert.equal(fixed.trace.children.at(-1).op, method);
      assert.ok(!Object.values(fixed.guideConfigs.legend).some(c => c.channel === channel || c.channels?.includes(channel) || c.kind === channel));
      assert.ok(Object.keys(fixed.guideConfigs.legend).length > 0); // Unrelated channel survives.
      if (channel === "color") assert.ok(items(fixed).every(i => i.properties.fill === value));
      else assert.ok(items(fixed).every(i => Math.abs(area(fixed.graphicSpec.objects.points, i) - value) < 1e-9));
      assert.ok(items(fixed).every(i => i.properties.stroke === "black" && i.properties.strokeWidth === 2));
      const variable = fixed[method]({ target: "points", field });
      assert.equal(variable.semanticSpec.layers[0].encoding[channel].field, field);
      assert.equal(variable.markConfigs.points[channel === "size" ? "radius" : "fill"], undefined);
      assert.equal(serializeProgram(original), before);
      assert.deepEqual(deserializeProgram(serializeProgram(fixed)).graphicSpec, fixed.graphicSpec);
      assert.ok(renderToSVG(variable).startsWith('<svg'));
    }
  });
  test(`${name} constant area is shape-independent, includes zero and survives rematerialization`, () => {
    for (const shape of ["circle", "square"]) for (const value of [0, 25, 400]) {
      const p = point(factory, shape).encodeSize({ value });
      for (const q of [p, ...(p.editCanvas ? [p.editCanvas({ width: 900 })] : []), p.encodeX({ field: "y" })]) {
        assert.ok(items(q).every(i => Math.abs(area(q.graphicSpec.objects.points, i) - value) < 1e-9));
      }
    }
  });
}

test("constant color preserves grouped bar geometry, measures and unrelated guides", () => {
  const p = base().createBarPlot({ id: "bars", x: "g", y: { field: "y", aggregate: "mean" }, guides: false })
    .encodeColor({ field: "g" }).createGuides();
  const geometry = q => q.graphicSpec.objects.bars.items.map(i => {
    const { x, y, width, height } = i.properties; return { x, y, width, height };
  });
  const fixed = p.encodeColor({ value: "#555555" });
  assert.deepEqual(geometry(fixed), geometry(p));
  assert.ok(fixed.graphicSpec.objects.bars.items.every(i => i.properties.fill === "#555555"));
  assert.ok(fixed.semanticSpec.guides.axis.x && fixed.semanticSpec.guides.axis.y);
  assert.deepEqual(geometry(fixed.encodeColor({ field: "g" })), geometry(p));
});

test("fixed color replaces continuous legends and respects all supported mark owners", () => {
  const p = point(chart).encodeColor({ field: "y", fieldType: "quantitative" }).createGuides();
  assert.ok(Object.keys(p.guideConfigs.legend).length);
  const q = p.encodeColor({ value: "red" });
  assert.equal(Object.keys(q.guideConfigs.legend ?? {}).length, 0);
  assert.ok(items(q).every(i => i.properties.fill === "red"));
  assert.ok(q.encodeColor({ field: "y", fieldType: "quantitative" }).semanticSpec.layers[0].encoding.color);
  for (const p of [
    base().createLinePlot({ id: "lines", x: "x", y: "y", guides: false }),
    base().createAreaPlot({ id: "area", x: "x", y: "y", guides: false }),
    base().createHeatmap({ id: "cells", x: { field: "g", fieldType: "nominal" }, y: { field: "x", fieldType: "ordinal" }, guides: false })
  ]) {
    const source = ["line", "area"].includes(p.semanticSpec.layers[0].mark.type) ? p.encodeGroup({ field: "g" }) : p;
    const q = source.encodeColor({ value: "#887766" });
    assert.ok(renderToSVG(q).includes('#887766'));
    assert.ok(renderToSVG(q.encodeColor({ field: "g" })).startsWith('<svg'));
  }
});

test("appearance input errors leave the original program and action tree unchanged", () => {
  const p = point(chart).encodeColor({ field: "g" }).encodeSize({ field: "y" });
  const before = serializeProgram(p);
  for (const [method, args] of [
    ["encodeColor", { value: "red", field: "g" }], ["encodeColor", { value: "red", scale: {} }],
    ["encodeColor", { value: "" }], ["encodeColor", {}],
    ["encodeSize", { value: -1 }], ["encodeSize", { value: Infinity }],
    ["encodeSize", { value: 10, field: "y" }], ["encodeSize", { value: 10, fieldType: "quantitative" }],
    ["encodeSize", { value: 10, scale: {} }], ["encodeSize", {}]
  ]) assert.throws(() => p[method](args));
  assert.equal(serializeProgram(p), before);
});


test("inspection distinguishes constant encoding values from data-field references", () => {
  const p = point(chart);
  for (const [method, value] of [["encodeColor", "#c94b40"], ["encodeSize", 100],
    ["encodeOpacity", 0], ["encodeStroke", "red"]]) {
    const descriptor = describeAction(p, { action: method, options: { target: "points", value } });
    assert.equal(descriptor.applicability, "supported", method);
    assert.notEqual(descriptor.parameterDefinitions.find(o => o.path === "value")?.kind, "field");
  }
  assert.notEqual(describeAction(p, { action: "encodeColor", target: { kind: "mark", id: "points" }, options: { field: "missing" } }).applicability, "supported");
});


test("automatic guides retain size and opacity legends after replacing field color", () => {
  const p = point(chart).encodeColor({ field: "g" }).encodeSize({ field: "y" })
    .encodeOpacity({ field: "y" }).encodeColor({ value: "red" }).createGuides();
  assert.ok(p.guideConfigs.legend.size);
  assert.ok(p.guideConfigs.legend.opacity);
  const q = p.encodeSize({ value: 80 });
  assert.ok(q.guideConfigs.legend.opacity);
  assert.equal(q.guideConfigs.legend.size, undefined);
  const r = q.encodeOpacity({ value: .5 });
  assert.equal(Object.keys(r.guideConfigs.legend ?? {}).length, 0);
  assert.ok(renderToSVG(r).startsWith('<svg'));
});


test("fixed-to-variable changes ranges and palettes without stale-scale conflicts", () => {
  for (const factory of [chart, basic]) for (const [method, field, fixedValue, scale] of [
    ["encodeColor", "g", "red", { palette: "category10" }],
    ["encodeSize", "y", 90, { range: [20, 240] }],
    ...(factory === chart ? [["encodeOpacity", "y", .5, { range: [.25, 1] }],
      ["encodeStroke", "g", "black", { palette: "category10" }]] : [])
  ]) {
    const p = point(factory)[method]({ field }).createGuides();
    const q = p[method]({ value: fixedValue })[method]({ field, scale });
    assert.ok(q.semanticSpec.layers[0].encoding[method.slice(6).toLowerCase()]);
    assert.ok(renderToSVG(q).startsWith('<svg'));
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  }
});


test("constant switches leave other consumers of a shared scale unchanged", () => {
  for (const [method, field, value] of [["encodeColor", "g", "red"], ["encodeSize", "y", 100],
    ["encodeOpacity", "y", .5], ["encodeStroke", "g", "black"]]) {
    const p = point(chart)[method]({ target: "points", field, scale: { id: "shared" } })
      .createPointMark({ id: "other" }).encodeX({ field: "x" }).encodeY({ field: "y" })
      [method]({ target: "other", field, scale: { id: "shared" } });
    const q = p[method]({ target: "points", value });
    assert.deepEqual(q.graphicSpec.objects.other, p.graphicSpec.objects.other);
    assert.deepEqual(q.semanticSpec.scales.find(s => s.id === "shared"), p.semanticSpec.scales.find(s => s.id === "shared"));
    assert.equal(q.semanticSpec.layers.find(l => l.id === "other").encoding[method.slice(6).toLowerCase()].scale, "shared");
  }
});
