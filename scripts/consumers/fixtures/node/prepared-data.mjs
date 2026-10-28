import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, prepareDataUpdate, render } from "ggaction";
import { chart as basicChart, prepareDataUpdate as prepareBasicDataUpdate } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

const csv = text => ({ text, mimeType: "text/csv", encoding: "utf-8" });
const current = program => {
  const binding = program.semanticSpec.resources.find(resource => resource.kind === "data-source" && resource.id === "rows");
  return program.semanticSpec.datasets.find(dataset => dataset.id === binding.result.data.id);
};
const circles = scene => scene.nodes.filter(node => node.type === "circle");
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}

export const cases = [
  { id: "prepared-data/full-and-basic-create", async run() {
    for (const [create, prepare] of [[chart, prepareDataUpdate], [basicChart, prepareBasicDataUpdate]]) {
      const before = create(), saved = serializeProgram(before);
      const prepared = await prepare(before, { kind: "create", id: "rows", keyField: "id",
        source: { kind: "inline", values: [{ id: "a", value: -0 }, { id: "b", value: 3 }] } },
      { requestToken: "create" });
      assert.ok(Object.isFrozen(prepared));
      const program = before.applyDataUpdate({ prepared, requestToken: "create" });
      assert.equal(serializeProgram(before), saved);
      assert.deepEqual(current(program).values.map(row => row.id), ["a", "b"]);
      assert.ok(Object.is(current(program).values[0].value, -0));
      assert.equal(current(program).sourceReceipt.provenance.hashKind, "encoded-rows");
      assert.equal(program.trace.children.at(-1).op, "applyDataUpdate");
      assert.equal(program.trace.children.at(-1).children[0].op, "createData");
      assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
      const named = await prepare(program, { kind: "create", id: "named",
        source: { kind: "named", name: "table", format: "json" } }, { requestToken: "named",
        resolveNamed: async input => {
          assert.deepEqual(input, { name: "table" });
          return { bytes: new TextEncoder().encode('[{"value":false}]'), mimeType: "application/json", encoding: "utf-8" };
        } });
      const withNamed = program.applyDataUpdate({ prepared: named, requestToken: "named" });
      assert.deepEqual(withNamed.semanticSpec.datasets.at(-1).values, [{ value: false }]);
      if (create === basicChart) {
        await assert.rejects(prepare(withNamed, { kind: "revise", target: "rows", id: "next" }, { requestToken: "edit" }), /Basic/);
      }
    }
  } },
  { id: "prepared-data/fresh-process-offline-refresh", async run() {
    let program = chart();
    const prepared = await prepareDataUpdate(program, { kind: "create", id: "rows", keyField: "id",
      source: { kind: "url", url: "./rows.csv", format: "csv", parse: { value: { type: "number" } } } },
    { requestToken: "first", baseURL: "https://example.test/data/", load: async ({ url }) => {
      assert.equal(url, "https://example.test/data/rows.csv");
      return csv("id,value\na,1\nb,2\n");
    } });
    program = program.applyDataUpdate({ prepared, requestToken: "first" });
    const saved = serializeProgram(program), keys = current(program).rowKeys;
    const script = `
      import assert from "node:assert/strict";
      import { readFileSync } from "node:fs";
      import { prepareDataUpdate } from "ggaction";
      import { deserializeProgram, serializeProgram } from "ggaction/persistence";
      globalThis.fetch = () => { throw new Error("Network is unavailable"); };
      const saved = readFileSync(0, "utf8"), restored = deserializeProgram(saved);
      assert.equal(serializeProgram(restored), saved);
      let calls = 0;
      const prepared = await prepareDataUpdate(restored, { kind: "revise", target: "rows", id: "fresh" }, {
        requestToken: "fresh", load: async ({ url }) => {
          calls++;
          assert.equal(url, "https://example.test/data/rows.csv");
          return { bytes: new TextEncoder().encode("id,value\\na,7\\nb,9\\n"), mimeType: "text/csv", encoding: "utf-8" };
        }
      });
      const refreshed = restored.applyDataUpdate({ prepared, requestToken: "fresh" });
      assert.equal(calls, 1);
      assert.equal(serializeProgram(restored), saved);
      assert.throws(() => deserializeProgram(saved).applyDataUpdate({ prepared, requestToken: "fresh" }), /stale/);
      process.stdout.write(serializeProgram(refreshed));
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      input: saved, encoding: "utf8", timeout: 30_000
    });
    const restored = deserializeProgram(output), dataset = current(restored);
    assert.equal(dataset.id, "fresh");
    assert.deepEqual(dataset.values, [{ id: "a", value: 7 }, { id: "b", value: 9 }]);
    assert.deepEqual(dataset.rowKeys, keys);
    assert.equal(dataset.sourceReceipt.original.text, "id,value\na,7\nb,9\n");
    assert.equal(restored.semanticSpec.datasets[0].sourceReceipt.original.text, "id,value\na,1\nb,2\n");
    assert.equal(serializeProgram(restored), output);
    assert.equal(serializeProgram(program), saved);
  } },
  { id: "prepared-data/authenticity-and-freshness", async run() {
    const before = chart(), saved = serializeProgram(before);
    const request = { kind: "create", id: "rows", source: { kind: "inline", values: [{ value: 1 }] } };
    const first = await prepareDataUpdate(before, request, { requestToken: "first" });
    const second = await prepareDataUpdate(before, request, { requestToken: "second" });
    assert.throws(() => before.applyDataUpdate({ prepared: first, requestToken: "second" }), /stale/);
    assert.throws(() => before.applyDataUpdate({ prepared: { ...second }, requestToken: "second" }), /authentic/);
    assert.throws(() => before.applyDataUpdate({ prepared: JSON.parse(JSON.stringify(second)), requestToken: "second" }), /authentic/);
    assert.throws(() => deserializeProgram(saved).applyDataUpdate({ prepared: second, requestToken: "second" }), /stale/);
    const changed = before.createParameter({ id: "unrelated", value: 1 });
    assert.throws(() => changed.applyDataUpdate({ prepared: second, requestToken: "second" }), /stale/);
    const next = before.applyDataUpdate({ prepared: second, requestToken: "second" });
    assert.throws(() => next.applyDataUpdate({ prepared: first, requestToken: "first" }), /stale/);
    assert.equal(serializeProgram(before), saved);
    const abort = new AbortController();
    const pending = await prepareDataUpdate(before, request, { requestToken: "abort", signal: abort.signal });
    abort.abort();
    assert.throws(() => before.applyDataUpdate({ prepared: pending, requestToken: "abort" }), { name: "AbortError" });
    assert.equal(serializeProgram(before), saved);
  } },
  { id: "prepared-data/renderers-and-scene", async run() {
    let program = chart().createCanvas({ width: 200, height: 140, margin: 20 })
      .createParameter({ id: "region", value: "north" });
    const url = { version: 2, registry: "standard@1", root: { type: "call", name: "concat", args: [
      { type: "literal", value: "https://example.test/" }, { type: "parameter", id: "region" }, { type: "literal", value: ".csv" }
    ] } };
    let calls = 0;
    const initial = await prepareDataUpdate(program, { kind: "create", id: "rows", keyField: "id",
      source: { kind: "url", url, format: "csv", parse: { x: { type: "number" }, y: { type: "number" } } } },
    { requestToken: "initial", load: async () => { calls++; return csv("id,x,y\na,1,1\nb,3,3\n"); } });
    const original = program.applyDataUpdate({ prepared: initial, requestToken: "initial" })
      .createScatterPlot({ id: "points", x: { field: "x", scale: { domain: [0, 4], nice: false } },
        y: { field: "y", scale: { domain: [0, 12], nice: false } }, guides: false })
      .encodeColor({ target: "points", value: "#e63946" }).encodePointRadius({ target: "points", value: 6 });
    const update = await prepareDataUpdate(original, { kind: "parameter", target: "region", value: "south" }, {
      requestToken: "update", load: async ({ url: resolved }) => {
        calls++; assert.equal(resolved, "https://example.test/south.csv");
        return csv("id,x,y\na,1,3\nb,3,9\n");
      }
    });
    program = original.applyDataUpdate({ prepared: update, requestToken: "update" });
    assert.deepEqual(current(program).values.map(row => row.y), [3, 9]);
    const serialized = serializeGraphic(program), graphic = deserializeGraphic(serialized);
    assert.equal(graphic.semanticSpec, undefined);
    assert.equal(serialized.includes("sourceReceipt"), false);
    assert.equal(serialized.includes("https://example.test"), false);
    assert.equal(renderToSVG(graphic), renderToSVG(program));
    assert.notEqual(renderToSVG(program), renderToSVG(original));
    const png = await renderToPNGBuffer(program), restoredPNG = await renderToPNGBuffer(graphic);
    assert.deepEqual(png.buffer, restoredPNG.buffer);
    const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(graphic, context);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const image = await loadImage(png.buffer), pngCanvas = createCanvas(png.width, png.height);
    pngCanvas.getContext("2d").drawImage(image, 0, 0);
    assert.deepEqual(pngCanvas.getContext("2d").getImageData(0, 0, png.width, png.height).data, pixels);
    const pdf = await renderToPDFBuffer(program), restoredPDF = await renderToPDFBuffer(graphic);
    assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(restoredPDF.buffer));
    assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image/);
    assert.deepEqual([pdf.width, pdf.height, pdf.pages], [200, 140, 1]);
    const scene = createTransitionScene(program, { format: "canvas" });
    assert.deepEqual(createTransitionScene(graphic, { format: "canvas" }), scene);
    assert.deepEqual(circles(scene).map(node => [node.properties.x, node.properties.y]), [[60, 95], [140, 45]]);
    assert.deepEqual(circles(scene).map(node => node.key), circles(createTransitionScene(original, { format: "canvas" })).map(node => node.key));
    const sceneCanvas = createCanvas(1, 1), sceneContext = sceneCanvas.getContext("2d"); renderTransitionScene(scene, sceneContext);
    assert.deepEqual(sceneContext.getImageData(0, 0, sceneCanvas.width, sceneCanvas.height).data, pixels);
    assert.equal(calls, 2);
  } }
];
