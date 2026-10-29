import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { createTransitionScene } from "../../../src/scene.js";
import { walkGraphicTreeEvents } from "../../../src/grammar/schemas/graphicTree.js";

const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
const expectedHash = createHash("sha256").update(bytes).digest("hex");
const identity = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
const host = { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }), decode: identity,
  measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
    widths: queries.map(query => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(query.text)].length * query.fontSize / 2) }) };
const rows = [{ x: 0, y: 1, group: "A", label: "AB" }, { x: 2, y: 3, group: "B", label: "BA" }];
const source = () => chart().createCanvas({ width: 700, height: 600, margin: 140 }).createData({ id: "data", values: rows });
const points = () => source().createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
async function measured(program) {
  const fonts = [];
  for (const weight of [400, 600, 700]) {
    const id = `font${weight}`; fonts.push(id);
    const prepared = await prepareFontResource(program, { kind: "create", id, uri: "fixture:font", mimeType: "font/ttf",
      expectedHash, family: "sans-serif", style: "normal", weight, metricsProviderVersion: "test-width@1" }, host);
    program = program.createFontResource({ prepared, requestToken: "current" });
  }
  const { load: _load, ...metricsHost } = host;
  return program.applyTextMetrics({ prepared: await prepareTextMetrics(program, { id: "exact", fonts }, metricsHost), requestToken: "current" });
}
function texts(program) {
  const found = [];
  walkGraphicTreeEvents(program.graphicSpec, {
    enter({ object }) { if (object.type === "text" && !object.items) found.push(object.properties); },
    item({ object, owner }) { if ((object.type ?? owner.type) === "text") found.push(object.properties); }
  });
  return found;
}
function assertBound(program) {
  const properties = texts(program); assert.ok(properties.length > 0);
  for (const p of properties) {
    assert.equal(p.font?.contentHash, expectedHash, `Missing font on ${JSON.stringify(p.text)}`);
    assert.equal(p.font.metricsProviderVersion, "test-width@1");
  }
  const restored = deserializeProgram(serializeProgram(program));
  assert.deepEqual(restored.graphicSpec, program.graphicSpec);
  const scene = createTransitionScene(restored, { format: "canvas" });
  assert.equal(scene.nodes.filter(node => node.type === "text").length, properties.length);
  assert.ok(scene.nodes.filter(node => node.type === "text").every(node => node.properties.font?.contentHash === expectedHash));
}

test("exact fonts bind Cartesian axis, title, legend and text mark owners", async () => {
  const base = points().encodeColor({ field: "group" }).createXAxis().createYAxis()
    .createLegend({ position: "bottom" }).createTitle({ text: "AB", subtitle: "BA" })
    .createMarkLabels({ source: "points", id: "labels", field: "label" });
  const program = await measured(base);
  assertBound(program);
  assertBound(program.editCanvas({ width: 720 }));
  assertBound(program.selectMarks({ target: "points", id: "chosen", field: "x", op: "max" })
    .highlightMarks({ selection: "chosen", color: "red" }));
});

test("exact fonts bind radial, angular and parallel guide families", async () => {
  const polar = source().createPointMark().encodeTheta({ field: "x" }).encodeR({ field: "y" })
    .createThetaAxis().createRadialAxis();
  const parallel = source().createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: false } });
  for (const base of [polar, parallel]) assertBound(await measured(base));
});

test("exact font bindings survive retained facet source revision and repeat replay", async () => {
  for (const base of [points().facet({ field: "group" }), points().repeatCharts({ fields: ["x", "y"], channel: "y" })]) {
    const program = await measured(base);
    assertBound(program);
    const revised = program.reviseData({ source: "data", id: "updated", values: rows.map(row => ({ ...row, y: row.y + 1 })) });
    assertBound(revised);
    for (const child of Object.values(revised.children)) assert.equal(child.materializationConfigs.textMetrics.schemaVersion, 2);
  }
});

test("nested composition replacement, font replacement and cascading removal remain coherent", async () => {
  const child = points().createTitle({ text: "AB" });
  let program = await measured(hconcat({ programs: [{ id: "left", program: child },
    { id: "right", program: hconcat({ programs: [{ id: "inner", program: child }, { id: "other", program: child }] }) }] }));
  assertBound(program);
  const prepared = await prepareFontResource(program, { kind: "replace", target: "font700", uri: "fixture:new",
    mimeType: "font/ttf", expectedHash, family: "sans-serif", style: "normal", weight: 700, metricsProviderVersion: "test-width@1" }, host);
  program = program.replaceFontResource({ prepared, requestToken: "current" });
  assertBound(program);
  assert.equal(program.children.right.children.inner.materializationConfigs.textMetrics.fonts.find(binding => binding.resource.id === "font700").resource.revision, 1);
  program = program.removeResource({ kind: "font", id: "font700", cascade: true });
  assert.equal(program.materializationConfigs.textMetrics, undefined);
  assert.ok(texts(program).every(p => p.font === undefined));
  assert.doesNotThrow(() => serializeProgram(program));
});
