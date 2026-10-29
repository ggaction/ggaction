import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const seed = () => chart().createCanvas({ width: 600, height: 240, margin: 20 })
  .createData({ id: "days", values: [{ day: "2024-02-29", value: 2 }] })
  .createCalendarLayout({ date: "day", value: "value", start: "2024-02-28", end: "2024-02-29", timeZone: "UTC", weekStartsOn: 1, aggregate: "sum", missing: "empty" });
const base = (p = seed(), options = {}) => p.createCalendarPlot({ color: false, ...options });
const children = p => p.graphicSpec.objects.calendar.items;
const config = p => p.markConfigs.calendar.calendarPlot;
const walk = node => [node, ...(node.children ?? []).flatMap(walk)];

test("calendar theme roles affect observed and empty cells, boundaries and all label roles without recomputing layout", () => {
  const p = base(), before = serializeProgram(p);
  const q = p.applyTheme({ theme: { base: "dark", tokens: { fontSize: 18, fontWeight: 700 } } });
  assert.equal(config(q).cells.fill, "#60a5fa"); assert.equal(config(q).cells.emptyFill, "#0f172a");
  assert.equal(config(q).cells.stroke, "none"); assert.equal(config(q).monthBoundary.stroke, "#94a3b8");
  assert.deepEqual(children(q).filter(item => item.identity.role === "body").map(item => item.properties.fill), ["#0f172a", "#60a5fa"]);
  for (const role of ["month", "weekday", "week", "year"]) {
    assert.equal(config(q).labels[role].fill, "#e2e8f0"); assert.equal(config(q).labels[role].fontSize, 18); assert.equal(config(q).labels[role].fontWeight, 700);
  }
  assert.equal(q.semanticSpec.resources, p.semanticSpec.resources);
  assert.equal(walk(q.trace.children.at(-1)).filter(node => node.op === "materializeCalendarPlot").length, 1);
  for (const themed of [q, deserializeProgram(serializeProgram(q)), base(seed().applyTheme({ theme: "dark" }))]) assert.deepEqual(themed.removeTheme().graphicSpec, p.graphicSpec);
  assert.equal(serializeProgram(p), before);
});

test("calendar explicit nested styles remain authored while disabled roles reset their theme precedence", () => {
  const p = base(seed(), { cells: { fill: "#2563eb", emptyFill: "pink", opacity: 0 }, monthBoundary: { stroke: "orange" },
    labels: { month: { fill: "purple", fontSize: 10 }, weekday: false } }).applyTheme({ theme: "dark" });
  assert.equal(config(p).cells.fill, "#2563eb"); assert.equal(config(p).cells.emptyFill, "pink");
  assert.equal(config(p).cells.opacity, 0); assert.equal(config(p).monthBoundary.stroke, "orange");
  assert.equal(config(p).labels.month.fill, "purple"); assert.equal(config(p).labels.weekday, undefined);
  const q = p.editCalendarPlot({ labels: { month: false }, monthBoundary: false })
    .editCalendarPlot({ labels: { month: {}, weekday: { fontWeight: 0 } }, monthBoundary: {} });
  assert.equal(config(q).labels.month.fill, "#e2e8f0"); assert.equal(config(q).labels.weekday.fontWeight, 0);
  assert.equal(config(q).monthBoundary.stroke, "#94a3b8");
  const reset = q.editCalendarPlot({ labels: false }).editCalendarPlot({ labels: { month: {}, weekday: {}, week: {}, year: {} } });
  assert.equal(Object.keys(config(reset).labels).length, 4);
  assert.ok(Object.values(config(reset).labels).every(style => style.fill === "#e2e8f0"));
  assert.deepEqual(deserializeProgram(serializeProgram(reset)).graphicSpec, reset.graphicSpec);
});

test("calendar theme snapshots in concat remain scoped and later source revisions retain current styles", () => {
  const p = base().applyTheme({ theme: "dark" }), q = p.reviseData({ source: "days", id: "next", values: [{ day: "2024-02-29", value: 4 }] });
  assert.equal(config(q).cells.emptyFill, "#0f172a");
  const combined = hconcat({ programs: [{ id: "one", program: p }, { id: "two", program: q }] });
  const edited = combined.replaceCompositionChild({ target: "one", program: p.removeTheme() });
  assert.equal(config(edited.children.one).cells.emptyFill, "#f1f5f9");
  assert.equal(config(edited.children.two).cells.emptyFill, "#0f172a");
});

test("calendar exact font metrics retain labels and reject unprepared typography atomically", async () => {
  const p = base(), bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const prepared = await prepareFontResource(p, { kind: "create", id: "font", uri: "fixture:calendar", expectedHash,
    mimeType: "font/ttf", family: "sans-serif", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" },
  { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }), decode });
  const bound = p.createFontResource({ prepared, requestToken: "current" });
  const metrics = await prepareTextMetrics(bound, { id: "exact", fonts: ["font"] }, { requestToken: "current", decode,
    measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(({ text, fontSize }) => text.length * fontSize * .6) }) });
  const exact = bound.applyTextMetrics({ prepared: metrics, requestToken: "current" });
  const saved = serializeProgram(exact), trace = exact.trace;
  for (const [tokens, code] of [[{ fontSize: 20 }, "metrics-required"], [{ fontWeight: 700 }, "unresolved-font"]]) {
    assert.throws(() => exact.applyTheme({ theme: { base: "dark", tokens } }), error => error.assetCode === code);
    assert.equal(serializeProgram(exact), saved); assert.equal(exact.trace, trace);
  }
  assert.ok(children(exact).filter(item => item.type === "text").every(item => item.properties.font?.contentHash === expectedHash));
});
