import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

function source(method = "dag", before = chart()) {
  return before.createCanvas({ width: 400, height: 260, margin: 30 })
    .createData({ id: "nodes", keyField: "id", values: [{ id: "A" }, { id: "B" }] })
    .createData({ id: "edges", keyField: "id", values: [{ id: "ab", s: "A", t: "B", value: 3 },
      ...(method === "cyclic" ? [{ id: "ba", s: "B", t: "A", value: 1 }] : [])] })
    .createFlowData({ id: "flow", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "s", target: "t", value: "value" })
    .layoutFlow({ id: "layout", method, options: { width: 240, height: 140, iterations: 0 } });
}
const plot = (p, nodes = {}, links = {}) => p.createFlowLinks(links).createFlowNodes({ labels: {}, ...nodes });
const children = (p, id = "flowNodes", role = "body") => p.graphicSpec.objects[id].items.filter(item => item.identity.role === role);
const ops = node => [node.op, ...(node.children ?? []).flatMap(ops)];
const fills = (p, id, role) => children(p, id, role).map(item => item.properties.fill);
const geometry = p => Object.fromEntries(["flowNodes", "flowLinks"].map(id => [id, {
  clip: p.graphicSpec.objects[id].clip,
  items: p.graphicSpec.objects[id].items.map(({ identity, properties }) => ({ identity,
    properties: Object.fromEntries(Object.entries(properties).filter(([key]) => !["fill", "stroke", "fontFamily", "fontSize", "fontWeight"].includes(key))) }))
}]));

for (const method of ["dag", "cyclic"]) {
  test(`${method} flow theme colors preserve stored layouts, identities and geometry`, () => {
    const seed = source(method), p = plot(seed), saved = serializeProgram(p);
    const q = p.applyTheme({ theme: "dark" });
    assert.deepEqual(fills(q, "flowNodes"), ["#60a5fa", "#60a5fa"]);
    assert.ok(fills(q, "flowLinks").every(value => value === "#94a3b8"));
    assert.deepEqual(fills(q, "flowNodes", "label"), ["#e2e8f0", "#e2e8f0"]);
    assert.ok(children(q).every(item => item.properties.stroke === "#0f172a"));
    assert.equal(q.semanticSpec.resources, p.semanticSpec.resources);
    assert.deepEqual(geometry(q), geometry(p));
    assert.ok(!ops(q.trace.children.at(-1)).some(op => ["createFlowData", "editFlowData", "layoutFlow", "editLayout"].includes(op)));
    for (const themed of [q, q.applyTheme({ theme: "light" }), deserializeProgram(serializeProgram(q)), plot(seed.applyTheme({ theme: "dark" }))]) {
      assert.deepEqual(themed.removeTheme().graphicSpec, p.graphicSpec);
    }
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
    assert.equal(serializeProgram(p), saved);
  });
}

test("flow authored styles and per-item paints stay explicit even at native default values", () => {
  const p = plot(source(), { nodes: { fill: "#2563eb", stroke: "#ffffff", opacity: 0, strokeWidth: 0,
    overrides: [{ key: "B", fill: "orange" }] }, labels: { fill: "#0f172a", fontSize: 12, fontWeight: 0 } },
  { links: { fill: "#64748b", opacity: 0 } });
  const q = p.applyTheme({ theme: { base: "dark", tokens: { fontSize: 20, fontWeight: 700 } } });
  assert.deepEqual(fills(q, "flowNodes"), ["#2563eb", "orange"]);
  assert.ok(children(q).every(item => item.properties.stroke === "#ffffff" && item.properties.opacity === 0 && item.properties.strokeWidth === 0));
  assert.deepEqual(fills(q, "flowLinks"), ["#64748b"]);
  assert.ok(children(q, "flowNodes", "label").every(item => item.properties.fill === "#0f172a" && item.properties.fontSize === 12 && item.properties.fontWeight === 0));
  const edited = q.editFlowLinks({ links: { fill: "purple" } }).applyTheme({ theme: "light" });
  assert.deepEqual(fills(edited, "flowLinks"), ["purple"]);
  assert.deepEqual(q.removeTheme().graphicSpec, p.graphicSpec);
});

test("flow typography changes rematerialize each node and link owner exactly once", () => {
  for (const labels of [{}, false]) {
    const p = plot(source(), { labels });
    const q = p.applyTheme({ theme: { base: "dark", tokens: { fontSize: 20, fontWeight: 700 } } });
    assert.deepEqual(fills(q, "flowNodes"), ["#60a5fa", "#60a5fa"]);
    assert.deepEqual(fills(q, "flowLinks"), ["#94a3b8"]);
    for (const op of ["materializeFlowNodes", "materializeFlowLinks"]) assert.equal(ops(q.trace.children.at(-1)).filter(value => value === op).length, 1, op);
    assert.equal(q.semanticSpec.resources, p.semanticSpec.resources);
    assert.equal(children(q, "flowNodes", "label").length, labels === false ? 0 : 2);
    assert.ok(children(q, "flowNodes", "label").every(item => item.properties.fontSize === 20 && item.properties.fontWeight === 700));
  }
});

test("flow label reset clears authored precedence and named highlights replay on the new baseline", () => {
  const p = plot(source(), { labels: { fill: "orange", fontSize: 12 } }).applyTheme({ theme: "dark" });
  const reset = p.editFlowNodes({ labels: false }).editFlowNodes({ labels: {} });
  assert.deepEqual(fills(reset, "flowNodes", "label"), ["#e2e8f0", "#e2e8f0"]);
  const selected = reset.highlightMarks({ id: "picked", target: "flowNodes", select: { field: "id", op: "eq", value: "B" }, fill: "red" });
  const changed = selected.applyTheme({ theme: { base: "light", tokens: { mark: "green", text: "blue" } } });
  assert.equal(changed.graphicSpec.objects.flowNodes.items.filter(item => item.properties.fill === "red").length, 2);
  const bare = changed.removeMarkHighlight({ selection: "picked" });
  assert.deepEqual(fills(bare, "flowNodes"), ["green", "green"]);
  assert.deepEqual(fills(bare, "flowNodes", "label"), ["blue", "blue"]);
  assert.deepEqual(getMarkItems(bare, { target: "flowNodes" }).map(item => item.key), getMarkItems(reset, { target: "flowNodes" }).map(item => item.key));
});

test("nested flow themes restore child-local frames and preserve role effects", () => {
  const outline = { color: "white", width: 4 }, shadow = { color: "#1238", offsetX: 3, offsetY: 2, blurRadius: 1 };
  const a = plot(source(), { nodes: { outline, shadow }, labels: { outline } }).applyTheme({ theme: { base: "light", tokens: { mark: "green" } } });
  const b = plot(source("cyclic"));
  const p = hconcat({ programs: [{ id: "left", program: a }, { id: "right", program: b }] });
  const q = p.applyTheme({ theme: "dark", scope: "descendants" });
  assert.deepEqual(fills(q.children.left, "flowNodes"), ["#60a5fa", "#60a5fa"]);
  assert.ok(children(q.children.left).every(item => item.properties.shadow.color === "#1238" && item.properties.outline.color === "white"));
  assert.deepEqual(deserializeProgram(serializeProgram(q)).removeTheme().graphicSpec, p.graphicSpec);
});

test("exact Flow label fonts reject unprepared theme changes atomically", async () => {
  const p = plot(source());
  const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const prepared = await prepareFontResource(p, { kind: "create", id: "font", uri: "fixture:flow", expectedHash,
    mimeType: "font/ttf", family: "sans-serif", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" },
  { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }), decode });
  const bound = p.createFontResource({ prepared, requestToken: "current" });
  const metrics = await prepareTextMetrics(bound, { id: "exact", fonts: ["font"] }, { requestToken: "current", decode,
    measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(({ text, fontSize }) => [...text].reduce((sum, character) => sum + ({ A: .6, B: .8 }[character] ?? 0), 0) * fontSize) }) });
  const exact = bound.applyTextMetrics({ prepared: metrics, requestToken: "current" });
  const saved = serializeProgram(exact), trace = exact.trace;
  for (const [tokens, code] of [[{ fontSize: 20 }, "metrics-required"], [{ fontWeight: 700 }, "unresolved-font"]]) {
    assert.throws(() => exact.applyTheme({ theme: { base: "dark", tokens } }), error => error.assetCode === code);
    assert.equal(serializeProgram(exact), saved);
    assert.equal(exact.trace, trace);
  }
});
