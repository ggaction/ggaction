import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { deriveArcSectors } from "../../../../src/grammar/arcs.js";
import { resolveArcItems } from "../../../../src/materialization/selection/items/arc.js";
import { mapPolarGuideValues } from "../../../../src/actions/guides/polar/resolve.js";

const rows = [{ category: "A", value: 1 }, { category: "A", value: 1 },
  { category: "B", value: 3 }, { category: "C", value: 4 }, { category: "Z", value: 0 }];
function primitive({ mapping = "area", count = false, innerRadius, range = "auto" } = {}) {
  let p = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ id: "source", values: rows })
    .createArcMark({ id: "sectors", ...(innerRadius === undefined ? {} : { innerRadius }) })
    .encodeTheta({ field: "category", fieldType: "nominal" })
    .createScale({ id: "radius", type: "linear", domain: "auto", range })
    .editSemantic({ property: "scale[radius].radialMapping", value: mapping })
    .editSemantic({ property: "layer[sectors].encoding.radius.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[sectors].encoding.radius.aggregate", value: count ? "count" : "sum" });
  if (!count) p = p.editSemantic({ property: "layer[sectors].encoding.radius.field", value: "value" });
  return p.editSemantic({ property: "layer[sectors].encoding.radius.scale", value: "radius" })
    .rematerializeArcMark({ id: "sectors" })
    .encodeColor({ target: "sectors", field: "category" });
}
function sectors(p) {
  return deriveArcSectors(rows, p.semanticSpec.layers[0], { thetaScale: p.resolvedScales.theta, radiusScale: p.resolvedScales.radius }).sectors;
}
function reject(p, run, pattern) {
  const before = JSON.stringify(p);
  assert.throws(() => run(p), pattern);
  assert.equal(JSON.stringify(p), before);
}

test("materializes category aggregates and uses the same radius mapper for marks, ticks, and grids", () => {
  const p = primitive({ innerRadius: 0.5, range: [70, 140] }).createRadialAxis({ ticksAndLabels: { values: [0, 2, 3, 4] } })
    .createRadialGrid({ values: [0, 2, 3, 4] }).createLegend();
  assert.deepEqual(p.resolvedScales.radius.domain, [0, 4]);
  assert.equal(p.graphicSpec.objects.sectors.items.length, 3);
  assert.deepEqual(p.resolvedScales.theta.domain, ["A", "B", "C", "Z"]);
  const actual = sectors(p);
  assert.deepEqual(actual.map(s => s.radius), [2, 3, 4]);
  assert.deepEqual(actual.map(s => s.sourceIndices), [[0, 1], [2], [3]]);
  const guide = mapPolarGuideValues(p, p.guideConfigs.axis.radius.ticks);
  assert.deepEqual(guide.positions.slice(1), actual.map(s => s.outerRadius));
  assert.equal(guide.positions[0], 70);
  assert.equal(p.graphicSpec.objects.radialAxisTitle.properties.text, "sum(value)");
  assert.equal(resolveArcItems(p, p.semanticSpec.layers[0], p.semanticSpec.datasets[0]).length, 3);
});

test("supports count without a fake measurement field and preserves category members", () => {
  const p = primitive({ count: true, mapping: "radius-length" }).createRadialAxis();
  assert.equal(p.graphicSpec.objects.radialAxisTitle.properties.text, "count");
  assert.equal(Object.hasOwn(p.semanticSpec.layers[0].encoding.radius, "field"), false);
  assert.deepEqual(p.resolvedScales.radius.domain, [0, 2]);
  assert.deepEqual(sectors(p).map(s => s.radius), [2, 1, 1, 1]);
  assert.equal(p.graphicSpec.objects.sectors.items.length, 4);
});

test("updates measured scale and sectors on Canvas, inner-radius, range, and domain edits", () => {
  const p = primitive({ innerRadius: 0.5 });
  assert.deepEqual(p.resolvedScales.radius.range, [100, 200]);
  assert.deepEqual(p.editCanvas({ height: 800 }).resolvedScales.radius.range, [125, 250]);
  const changed = p.editArcMark({ innerRadius: 0.25 });
  assert.deepEqual(changed.resolvedScales.radius.range, [50, 200]);
  assert.notDeepEqual(changed.graphicSpec.objects.sectors, p.graphicSpec.objects.sectors);
  assert.deepEqual(p.editScale({ id: "radius", domain: [0, 8] }).resolvedScales.radius.domain, [0, 8]);
  const explicit = primitive({ range: [70, 140] });
  assert.deepEqual(explicit.resolvedScales.radius.range, [70, 140]);
  assert.equal(sectors(explicit)[0].innerRadius, 70);
  reject(explicit, q => q.editArcMark({ innerRadius: 0.2 }), /innerRadius/);
  assert.equal(sectors(explicit.editArcMark({ innerRadius: 0.5 }))[0].innerRadius, 70);
  const auto = explicit.editScale({ id: "radius", range: "auto" }).editArcMark({ innerRadius: 0.2 });
  assert.deepEqual(auto.resolvedScales.radius.range, [40, 200]);
});

test("rejects invalid measured scale, geometry, and mixed consumers atomically", () => {
  const p = primitive();
  for (const patch of [{ domain: [1, 4] }, { domain: [0, 3] }, { zero: false }, { nice: true },
    { reverse: true }, { type: "sqrt" }, { range: [100, 50] }]) {
    reject(p, q => q.editScale({ id: "radius", ...patch }), /Measured|measured/);
  }
  reject(p, q => q.editArcMark({ padAngle: 1 }), /padAngle/);
  reject(p, q => q.editScale({ id: "theta", paddingInner: 0.2 }), /equal-angle/);
  const point = p.createPointMark({ id: "point", data: "source" }).encodeTheta({ field: "category", fieldType: "nominal", scale: { id: "pointTheta" } });
  reject(point, q => q.editSemantic({ property: "layer[point].encoding.radius.field", value: "value" })
    .editSemantic({ property: "layer[point].encoding.radius.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[point].encoding.radius.scale", value: "radius" })
    .rematerializeScale({ id: "radius" }), /equal-angle/);
});
