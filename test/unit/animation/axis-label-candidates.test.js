import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { resolveAxisLabelCandidates } from "../../../src/materialization/axisLabelCandidates.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { valuesFromTickConfig } from "../../../src/materialization/guides/tickValues.js";
import { resolveCartesianAxisFrameBounds } from "../../../src/materialization/coordinateBounds.js";
import { serializeProgram } from "../../../src/persistence.js";

const style = { fontSize: 10, fontFamily: "Fixture", fontWeight: 400 };
const policy = { sequence: ["wrap", "skip", "rotate"], maxLines: 2, skipStride: 2, rotationCandidates: [-Math.PI / 2] };
function input(extra = {}) {
  const values = [0, 1, 2];
  return {
    values, channel: "x", axisId: "x", bounds: { x: 50, y: 40, width: 60, height: 80 },
    scale: { type: "linear", domain: [0, 2], range: [50, 110] },
    canvas: { width: 300, height: 300 }, responsive: { minPlotSize: { width: 40, height: 40 } }, margin: { left: 20, right: 30 },
    config: { ...style, position: "bottom", offset: 8, rotation: 0, overlap: "error", format: "auto", responsive: policy,
      labelMap: values.map(value => ({ value, label: "AAAA BBBB" })) },
    profile: { schemaVersion: 1, measurements: ["AAAA BBBB", "AAAA", "BBBB"].map(text => ({ ...style, text, width: text.length * 5 })) },
    ...extra
  };
}
const reason = name => error => { assert.equal(getErrorDetails(error)?.reason, name); return true; };

test("native responsive wrapping uses literal widths and keeps each raw tick with its lines", () => {
  const args = input(), before = structuredClone(args), result = resolveAxisLabelCandidates(args);
  assert.equal(result.responsiveResult.stage, "wrap");
  assert.equal(result.responsiveResult.reason, "label-overlap");
  assert.equal(result.responsiveResult.maxWidth, 30);
  assert.deepEqual(result.text, ["AAAA", "BBBB", "AAAA", "BBBB", "AAAA", "BBBB"]);
  assert.deepEqual(result.indices, [0, 1, 2]);
  assert.deepEqual(result.groups, [0, 0, 1, 1, 2, 2]);
  assert.deepEqual(result.x, [50, 50, 80, 80, 110, 110]);
  assert.deepEqual(result.y, [128, 140, 128, 140, 128, 140]);
  assert.deepEqual(result.requiredBounds, { left: 40, right: 120, top: 128, bottom: 150 });
  assert.deepEqual(args, before);
});

test("line limits trigger raw-index skipping without truncating labels or changing ticks", () => {
  const args = input(); args.config = { ...args.config, responsive: { ...policy, maxLines: 1 } };
  const result = resolveAxisLabelCandidates(args);
  assert.equal(result.responsiveResult.stage, "skip");
  assert.equal(result.responsiveResult.reason, "label-lines");
  assert.equal(result.responsiveResult.maxWidth, 60);
  assert.deepEqual(result.text, ["AAAA BBBB", "AAAA BBBB"]);
  assert.deepEqual(result.values, [0, 2]);
  assert.deepEqual(result.indices, [0, 2]);
  assert.deepEqual(result.x, [50, 110]);
  assert.deepEqual(args.values, [0, 1, 2]);
});

test("explicit widths survive fallback and rotation occurs only after native wrap and skip", () => {
  const args = input(); args.scale.range = [50, 70]; args.bounds.width = 20;
  args.config = { ...args.config, maxWidth: 200, wrap: "word", responsive: { ...policy, maxLines: 1 } };
  const result = resolveAxisLabelCandidates(args);
  assert.equal(result.responsiveResult.stage, "rotate");
  assert.equal(result.responsiveResult.maxWidth, 200);
  assert.equal(result.responsiveResult.rotation, -Math.PI / 2);
  assert.deepEqual(result.indices, [0, 2]);
  assert.deepEqual(result.text, ["AAAA BBBB", "AAAA BBBB"]);
  assert.deepEqual(result.x, [50, 70]);
  assert.equal(result.textAlign, "right");
  assert.equal(result.textBaseline, "middle");
});

test("hidden raw values and empty collections remain valid in native and dormant policy modes", () => {
  for (const responsive of [undefined, input().responsive]) {
    const args = input({ responsive }); args.config = { ...args.config, labelMap: args.values.map(value => ({ value, label: "" })) };
    const result = resolveAxisLabelCandidates(args);
    assert.deepEqual(result.text, []); assert.deepEqual(result.indices, []);
    assert.deepEqual(result.labelBounds, []); assert.equal(result.requiredBounds, undefined);
    assert.equal(result.responsiveResult?.stage, responsive === undefined ? undefined : "native");
  }
  const args = input(); delete args.config.responsive; args.config.overlap = "allow";
  assert.equal(resolveAxisLabelCandidates(args).responsiveResult, undefined);
});

test("automatic Y width respects the opposite margin while mapped ordinal X uses actual anchor gaps", () => {
  for (const position of ["left", "right"]) {
    const args = input({ channel: "y", canvas: { width: 100, height: 300 }, bounds: { x: 50, y: 50, width: 10, height: 60 },
      scale: { type: "linear", domain: [0, 2], range: [50, 60] }, measuring: true });
    args.config = { ...args.config, position, responsive: { ...policy, maxLines: 4, skipStride: 3 }, maxWidth: undefined };
    const result = resolveAxisLabelCandidates(args);
    assert.equal(result.responsiveResult.stage, "skip");
    assert.equal(result.responsiveResult.maxWidth, position === "left" ? 22 : 32);
    assert.deepEqual(result.indices, [0]);
  }
  const args = input({ values: ["a", "b", "c"], scale: { type: "ordinal", domain: ["a", "b", "c"], range: [35, 125], step: 30 } });
  args.config.labelMap = args.values.map(value => ({ value, label: "AAAA BBBB" }));
  assert.equal(resolveAxisLabelCandidates(args).responsiveResult.maxWidth, 30);
});

test("Canvas and title constraints remain terminal while fallback exhaustion retains its native reason", () => {
  const args = input(); args.config.overlap = "allow";
  assert.throws(() => resolveAxisLabelCandidates({ ...args, canvas: undefined }), /Canvas margin/);
  assert.throws(() => resolveAxisLabelCandidates({ ...args, canvas: { width: 5, height: 5 } }), /Canvas margin/);
  assert.throws(() => resolveAxisLabelCandidates({ ...args, titleBounds: { left: 0, right: 300, top: 0, bottom: 300 } }), /axis title/);
  const tooLarge = { ...args, measuring: true, canvas: { width: 1, height: 1 } };
  assert.throws(() => resolveAxisLabelCandidates(tooLarge), error => {
    const details = getErrorDetails(error);
    assert.equal(details.reason, "layout-unsatisfied"); assert.equal(details.layout.reason, "label-size");
    assert.deepEqual(details.layout.requiredPlotSize, { width: 40, height: 40 });
    assert.ok(details.layout.requiredBounds); return true;
  });
  const flush = input(); flush.config = { ...flush.config, flush: true, responsive: { ...policy, maxLines: 1 },
    labelMap: flush.values.map(value => ({ value, label: "AAAA\nBBBB" })) };
  assert.throws(() => resolveAxisLabelCandidates(flush), reason("layout-unsatisfied"));
});

test("candidate work and missing exact font measurements reject before a fallback estimate", () => {
  const args = input({ values: Array(10000).fill(0) });
  args.config = { ...args.config, responsive: { ...policy, rotationCandidates: Array(10000).fill(0) } };
  assert.throws(() => resolveAxisLabelCandidates(args), /candidate work/);
  const exact = input(); exact.profile = { schemaVersion: 2, fonts: [{ identity: { family: "Fixture", style: "normal", weight: 400 },
    resource: { kind: "font", id: "font", revision: 0 } }], measurements: [] };
  assert.throws(() => resolveAxisLabelCandidates(exact), /exact prepared measurement/);
});

test("public responsive axes use the same current candidate without changing source state", () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({ x: `Long category ${i}`, y: i + 1 }));
  for (const width of [800, 400, 220]) {
    const p = chart().createCanvas({ width, height: 600, margin: 10, responsive: { minPlotSize: { width: 40, height: 40 } } })
      .createData({ values: rows }).createBarPlot({ x: "x", y: "y", guides: { axes: { x: { title: false,
        ticksAndLabels: { labels: { responsive: { maxLines: 1 }, maxWidth: 300 } } }, y: { title: false } }, legend: false } });
    const before = serializeProgram(p), stored = p.guideConfigs.axis.x.labels, config = { ...stored }; delete config.responsiveResult;
    const result = resolveAxisLabelCandidates({ channel: "x", axisId: "x", config, values: valuesFromTickConfig(p, config),
      scale: p.resolvedScales[config.scale], bounds: resolveCartesianAxisFrameBounds(p, "x", config.position, config.scale, "x"),
      canvas: p.graphicSpec.objects.canvas.properties, responsive: p.materializationConfigs.canvas.responsive,
      margin: p.materializationConfigs.canvas.margin, profile: p.materializationConfigs.textMetrics, edgeAligned: true, measuring: true });
    assert.deepEqual(result.responsiveResult, stored.responsiveResult);
    const items = p.graphicSpec.objects.xAxisLabels.items;
    assert.equal(items.length, result.text.length);
    for (let i = 0; i < items.length; i++) for (const key of ["x", "y", "text", "textAlign", "textBaseline"]) {
      assert.deepEqual(items[i].properties[key], Array.isArray(result[key]) ? result[key][i] : result[key]);
    }
    assert.equal(serializeProgram(p), before);
  }
});
