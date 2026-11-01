import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { wrapText } from "../../../src/layout/text.js";
import { measureTextWidth } from "../../../src/core/textMetrics.js";
import { prepareAxisLabelReflowQueries } from "../../../src/materialization/axisLabelQueries.js";

const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
const family = "ggaction Metric Fixture", style = { fontFamily: family, fontSize: 10, fontWeight: 400 };
const source = { kind: "create", id: "font", uri: "fixture:font", mimeType: "font/ttf",
  expectedHash: createHash("sha256").update(bytes).digest("hex"), family, style: "normal", weight: 400, metricsProviderVersion: "literal-widths@1" };
const identity = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
const width = text => Array.from(text).length * 5;
const host = (extra = {}) => ({ requestToken: "current", decode: identity,
  measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
    widths: queries.map(query => width(query.text)) }), ...extra });
async function withFont(program) {
  const prepared = await prepareFontResource(program, source, { ...host(), load: () => ({ bytes, mimeType: "font/ttf" }) });
  return program.createFontResource({ prepared, requestToken: "current" });
}
function axis(text = "AB CD EF", options = {}) {
  return chart().createCanvas({ width: 900, height: 1200, margin: 300 })
    .createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 2 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false })
    .createXAxis({ title: false, ticksAndLabels: { values: [0], labels: { ...style,
      maxWidth: 100, wrap: "word", lineHeight: 12, labelMap: [{ value: 0, label: text }], ...options } } });
}
const lines = program => program.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text);
async function measured(program, extra = {}, callbacks = {}) {
  const prepared = await prepareTextMetrics(program, { id: "m", fonts: ["font"], ...extra }, host(callbacks));
  return program.applyTextMetrics({ prepared, requestToken: "current" });
}

test("omitted and false requests preserve the native query batches and exact profile", async () => {
  const base = await withFont(axis()), snapshots = [];
  for (const extra of [{}, { axisLabelReflow: false }]) {
    const batches = [], callbacks = host();
    const value = await measured(base, extra, { measure(input) { batches.push(input.queries); return callbacks.measure(input); } });
    snapshots.push({ batches, profile: value.materializationConfigs.textMetrics, graphics: value.graphicSpec });
  }
  assert.deepEqual(snapshots[0], snapshots[1]);
  assert.equal(snapshots[0].profile.measurements.some(query => query.text === "CD EF"), false);
});

test("explicit closure supports new native word widths offline without a host or input mutation", async () => {
  const base = await withFont(axis()), before = serializeProgram(base);
  const result = await measured(base, { axisLabelReflow: true });
  const restored = deserializeProgram(serializeProgram(result));
  for (const [maxWidth, expected] of [[10, ["AB", "CD", "EF"]], [25, ["AB CD", "EF"]], [40, ["AB CD EF"]]]) {
    assert.deepEqual(lines(restored.editXAxisLabels({ maxWidth })), expected);
  }
  assert.equal(result.materializationConfigs.textMetrics.measurements.find(query => query.text === "CD EF").width, 25);
  assert.equal(serializeProgram(base), before);
  assert.throws(() => restored.editXAxisLabels({ labelMap: [{ value: 0, label: "NEW" }] }), error => error.assetCode === "metrics-required");
  assert.equal(result.materializationConfigs.textMetrics.axisLabelReflow, undefined);
});

test("closure covers native whitespace folding, long-word fragments and complete grapheme hard lines", async () => {
  const clusters = ["e\u0301", "👩🏽‍💻", "🇩🇰", "1️⃣"];
  for (const wrap of ["word", "character"]) {
    const text = `${clusters.join("")}\r\n\rAB\t CD   EF`;
    const result = await measured(await withFont(axis(text, { wrap })), { axisLabelReflow: true });
    const profile = result.materializationConfigs.textMetrics;
    const all = profile.measurements.map(query => query.text);
    assert.ok(clusters.every(cluster => all.includes(cluster)));
    assert.ok(!all.includes("👩")); assert.ok(!all.includes("\u0301"));
    for (const maxWidth of [1, 10, 25, 45, 75]) {
      const actual = wrapText(text, { maxWidth, mode: wrap, style, profile });
      for (const line of actual) assert.equal(measureTextWidth(line, style, profile), width(line));
    }
    if (wrap === "word") assert.deepEqual(wrapText("ABCDE FG", { maxWidth: 15, mode: wrap, style,
      profile: (await measured(await withFont(axis("ABCDE FG")), { axisLabelReflow: true })).materializationConfigs.textMetrics }), ["ABC", "DE", "FG"]);
  }
});

test("nested repeated axes deduplicate exact queries while hidden and unwrapped labels add no closure", async () => {
  const single = await measured(await withFont(axis()), { axisLabelReflow: true });
  const nested = hconcat({ programs: [{ id: "left", program: axis() }, { id: "right", program: axis() }] });
  const result = await measured(await withFont(nested), { axisLabelReflow: true });
  assert.deepEqual(result.materializationConfigs.textMetrics.measurements, single.materializationConfigs.textMetrics.measurements);
  const profile = result.materializationConfigs.textMetrics;
  assert.deepEqual(prepareAxisLabelReflowQueries(axis(""), profile), []);
  assert.deepEqual(prepareAxisLabelReflowQueries(axis().editXAxisLabels({ maxWidth: false }), profile), []);
  const responsive = axis("AB").editCanvas({ responsive: { minPlotSize: { width: 40, height: 40 } } })
    .editXAxisLabels({ maxWidth: false }).editXAxisLabels({ responsive: { maxLines: 2 } });
  assert.ok(prepareAxisLabelReflowQueries(responsive, profile).some(item => item.query.text === "B"));
});

test("option shape and inherited getters are checked without invoking host callbacks", async () => {
  const base = await withFont(axis()); let reads = 0, calls = 0;
  const callbacks = host({ decode() { calls++; }, measure() { calls++; } });
  for (const value of [null, undefined, 1, "true", {}]) {
    await assert.rejects(prepareTextMetrics(base, { id: "m", fonts: ["font"], axisLabelReflow: value }, callbacks), /boolean/);
  }
  await assert.rejects(prepareTextMetrics(base, { id: "m", fonts: ["font"], get axisLabelReflow() { reads++; return true; } }, callbacks), /accessors/);
  assert.equal(calls, 0); assert.equal(reads, 0);
  Object.defineProperty(Object.prototype, "axisLabelReflow", { configurable: true, get() { reads++; return true; } });
  try { await measured(base); } finally { delete Object.prototype.axisLabelReflow; }
  assert.equal(reads, 0);
});

test("unique query, text and work limits reject before decode or measurement", async () => {
  const base = await withFont(axis()); let calls = 0;
  const callbacks = host({ decode() { calls++; }, measure() { calls++; } });
  for (const text of [Array.from({ length: 150 }, (_, i) => String.fromCodePoint(0x5000 + i)).join(""),
    Array.from({ length: 100 }, (_, i) => String.fromCodePoint(0x5000 + i) + "\u0301".repeat(10)).join(""), "A".repeat(500)]) {
    // One original hard line fits; the requested future-width closure is what exceeds its budget.
    const candidate = base.editCanvas({ width: 30000, height: 1200, margin: { left: 10000, right: 300, top: 300, bottom: 300 } })
      .editXAxisLabels({ maxWidth: 100000, labelMap: [{ value: 0, label: text }] });
    await assert.rejects(prepareTextMetrics(candidate, { id: "m", fonts: ["font"], axisLabelReflow: true }, callbacks), /budget|work must not exceed/i);
  }
  assert.equal(calls, 0);
});

test("exact binding, token, receiver and abort authority remain unchanged for the opt-in", async () => {
  const base = await withFont(axis()), before = serializeProgram(base), controller = new AbortController();
  const prepared = await prepareTextMetrics(base, { id: "m", fonts: ["font"], axisLabelReflow: true }, host({ signal: controller.signal }));
  assert.throws(() => base.applyTextMetrics({ prepared: { ...prepared }, requestToken: "current" }), /authentic/);
  assert.throws(() => base.applyTextMetrics({ prepared, requestToken: "old" }), error => error.assetCode === "stale-result");
  assert.throws(() => base.editCanvas({ width: 901 }).editCanvas({ width: 900 }).applyTextMetrics({ prepared, requestToken: "current" }), error => error.assetCode === "stale-result");
  controller.abort();
  assert.throws(() => base.applyTextMetrics({ prepared, requestToken: "current" }), error => error.assetCode === "aborted");
  let calls = 0;
  await assert.rejects(prepareTextMetrics(base.editXAxisLabels({ fontFamily: "Unbound" }),
    { id: "m", fonts: ["font"], axisLabelReflow: true }, host({ decode() { calls++; } })), error => error.assetCode === "unresolved-font");
  assert.equal(calls, 0); assert.equal(serializeProgram(base), before);
  assert.doesNotThrow(() => axis().applyTextMetrics({ profile: { schemaVersion: 1, id: "estimate", measurements: [] } }).editXAxisLabels({ maxWidth: 10 }));
});

test("font replacement prepares its native layout and the new revision can explicitly rebuild reflow queries", async () => {
  const base = await measured(await withFont(axis()), { axisLabelReflow: true });
  const { id: _id, ...replacement } = source;
  const prepared = await prepareFontResource(base, { ...replacement, kind: "replace", target: "font", metricsProviderVersion: "literal-widths@2" },
    { ...host(), load: () => ({ bytes, mimeType: "font/ttf" }) });
  const replaced = base.replaceFontResource({ prepared, requestToken: "current" });
  assert.equal(replaced.materializationConfigs.textMetrics.fonts[0].resource.revision, 1);
  assert.equal(replaced.materializationConfigs.textMetrics.measurements.some(query => query.text === "CD EF"), false);
  const result = await measured(replaced, { axisLabelReflow: true });
  assert.equal(result.materializationConfigs.textMetrics.measurements.find(query => query.text === "CD EF").width, 25);
  assert.deepEqual(lines(result.editXAxisLabels({ maxWidth: 25 })), ["AB CD", "EF"]);
});
