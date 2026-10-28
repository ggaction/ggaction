import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { chart, prepareFontResource, prepareTextMetrics, prepareFontRendering, render } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { nativeFontRegistrar } from "../../../src/renderers/nativeBackend.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";

const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
const expectedHash = createHash("sha256").update(bytes).digest("hex"), family = "ggaction Metric Fixture";
const identity = request => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, request[key]]));
const source = { uri: "fixture:resource-labels", expectedHash, mimeType: "font/ttf", family, style: "normal", weight: 400, metricsProviderVersion: "fixture@1" };
const queried = [];
const measure = ({ asset, queries }) => {
  queried.push(...queries.map(query => query.text));
  return { contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
    widths: queries.map(({ text, fontSize }) => [...text].reduce((sum, value) => sum + ({ A: 600, B: 800 }[value] ?? 0), 0) * fontSize / 1000) };
};
const host = { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }), decode: identity, measure };
const labelProperties = program => program.graphicSpec.objects.plot.items.filter(item => item.type === "text").map(item => item.properties);
function plot(kind) {
  const p = chart().createCanvas({ width: 240, height: 160, margin: 0, background: "white" });
  const labels = { fontFamily: family, fontSize: 20, fontWeight: 400 };
  if (["graph", "inferredGraph"].includes(kind)) {
    const graph = p.createData({ id: "nodes", keyField: "id", values: [{ id: "r", label: "AB" }, { id: "a", label: "AB" }] })
      .createData({ id: "edges", values: [{ from: "r", to: "a" }] });
    const withGraph = kind === "graph"
      ? graph.createGraphData({ id: "source", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", attributes: ["label"] })
      : graph.createInferredGraphData({ id: "source", data: "nodes", nodeKey: "id", ruleId: "sameLabel", rule: "group", attributes: ["label"], options: { fields: ["label"] } });
    return withGraph.layoutGraph({ id: "layout", method: "force", options: { seed: 3, iterations: 2 } })
    .createGraphPlot({ id: "plot", labels: { ...labels, field: "label" } });
  }
  return p.createData({ id: "nodes", keyField: "id", values: [{ id: "r", parent: null, value: 2 }, { id: "a", parent: "r", value: 1 }] })
    .createHierarchyData({ id: "source", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", method: kind, options: kind === "partition" ? {} : kind === "tree" ? { nodeSize: [20, 20], siblingGap: 30, depthGap: 40, orientation: "vertical" }
      : { size: [180, 100], padding: 5, method: "slice-dice" } })
    [{ tree: "createTreePlot", treemap: "createTreemapPlot", partition: "createPartitionPlot" }[kind]]({ id: "plot", labels: { ...labels, overrides: [{ key: "r", text: "AB" }, { key: "a", text: "AB" }] } });
}
async function bound(kind) {
  const base = plot(kind), prepared = await prepareFontResource(base, { kind: "create", id: "font", ...source }, host);
  const p = base.createFontResource({ prepared, requestToken: "current" });
  queried.length = 0;
  const metrics = await prepareTextMetrics(p, { id: "exact", fonts: ["font"] }, { requestToken: "current", decode: identity, measure });
  assert.ok(queried.includes("AB"), "Resource labels participate in exact width query preparation");
  return p.applyTextMetrics({ prepared: metrics, requestToken: "current" });
}
for (const kind of ["graph", "inferredGraph", "tree", "treemap", "partition"]) {
  test(`${kind} labels bind exact fonts without recalculating their resource layout`, async () => {
    const p = await bound(kind), before = serializeProgram(p), layout = p.semanticSpec.resources.find(resource => resource.kind === "layout");
    const coordinates = structuredClone(layout.result);
    assert.ok(labelProperties(p).length > 0);
    assert.ok(labelProperties(p).every(properties => properties.font.contentHash === expectedHash));
    const edit = { graph: "editGraphPlot", inferredGraph: "editGraphPlot", tree: "editTreePlot", treemap: "editTreemapPlot", partition: "editPartitionPlot" }[kind];
    assert.throws(() => p[edit]({ target: "plot", labels: { overrides: [{ key: "a", text: "BBBB" }] } }), error => error.assetCode === "metrics-required");
    assert.equal(serializeProgram(p), before);
    if (kind === "inferredGraph") {
      assert.throws(() => p.reviseData({ source: "nodes", id: "nextNodes", values: [{ id: "r", label: "BBBB" }, { id: "a", label: "AB" }] }), error => error.assetCode === "metrics-required");
      assert.equal(serializeProgram(p), before);
    }
    const replacement = await prepareFontResource(p, { kind: "replace", target: "font", ...source, metricsProviderVersion: "fixture@2" }, host);
    const q = p.replaceFontResource({ prepared: replacement, requestToken: "current" });
    assert.equal(q.semanticSpec.resources.find(resource => resource.kind === "layout"), layout);
    assert.deepEqual(layout.result, coordinates);
    assert.ok(labelProperties(q).every(properties => properties.font.metricsProviderVersion === "fixture@2"));
    const removed = q.removeTextMetrics();
    assert.ok(labelProperties(removed).every(properties => properties.font === undefined));
    assert.equal(removed.semanticSpec.resources.find(resource => resource.kind === "layout"), layout);
    assert.equal(serializeProgram(p), before);
  });
  test(`${kind} exact label bytes survive snapshots and all native renderer consumers`, async () => {
    const p = await bound(kind), restored = deserializeProgram(serializeProgram(p));
    assert.deepEqual(restored.graphicSpec, p.graphicSpec);
    assert.match(renderToSVG(restored), /font-family="ggaction-font-/);
    const fonts = await prepareFontRendering(restored, { register: nativeFontRegistrar(GlobalFonts) });
    try {
      const canvas = createCanvas(1, 1); render(restored, canvas.getContext("2d"), { fonts });
      const png = await renderToPNGBuffer(restored);
      assert.deepEqual(canvas.toBuffer("image/png"), png.buffer);
      assert.match((await renderToPDFBuffer(restored)).buffer.toString("latin1"), /\/ToUnicode/);
      const scene = createTransitionScene(restored, { format: "canvas" });
      const sceneFonts = await prepareFontRendering(scene, { register: nativeFontRegistrar(GlobalFonts) });
      try { renderTransitionScene(scene, canvas.getContext("2d"), { fonts: sceneFonts }); assert.deepEqual(canvas.toBuffer("image/png"), png.buffer); }
      finally { sceneFonts.dispose(); }
    } finally { fonts.dispose(); }
  });
}
