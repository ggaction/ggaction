import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { Worker } from "node:worker_threads";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { prepareGraphEdgeRoutes, createGraphRouteExecutor } from "ggaction/graph";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

const source = () => chart().createCanvas({ width: 320, height: 240, margin: 0, background: "white" })
  .createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }, { id: "c" }], keyField: "id" })
  .createData({ id: "edges", values: [{ id: "ac", s: "a", t: "c" }, { id: "ab", s: "a", t: "b" }, { id: "bc", s: "b", t: "c" }], keyField: "id" })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", source: "s", target: "t", edgeKey: "id" })
  .layoutGraph({ id: "placement", method: "fixed", options: { positions: [{ key: "a", x: 60, y: 180 }, { key: "b", x: 160, y: 60 }, { key: "c", x: 260, y: 180 }] } });
const route = program => program.semanticSpec.resources.find(value => value.kind === "edge-route");
const plot = program => program.createGraphPlot({ id: "network", routes: "routes", nodes: { radius: 6 }, edges: { arrows: false, stroke: "#2563eb" } });
const streams = buffer => [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
  const bytes = Buffer.from(match[1], "latin1");
  try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
});

export const cases = [
  { id: "edge-routes/own-host-options", async run() {
    const base = source(), saved = serializeProgram(base);
    const request = { kind: "create", id: "routes", method: "edge-path" };
    for (const key of ["createWorker", "signal", "executor", "requestToken", "kind"]) {
      let reads = 0, executor;
      const previous = Object.getOwnPropertyDescriptor(Object.prototype, key);
      Object.defineProperty(Object.prototype, key, { configurable: true, get() {
        reads++; throw new Error(`Inherited ${key} evaluated`);
      } });
      try {
        executor = createGraphRouteExecutor({});
        if (key === "requestToken") await assert.rejects(prepareGraphEdgeRoutes(base, request, {}), /nonempty requestToken/);
        else if (key === "kind") await assert.rejects(prepareGraphEdgeRoutes(base, { id: "routes", method: "edge-path" }, { requestToken: "own" }), /kind must be/);
        else {
          const prepared = await prepareGraphEdgeRoutes(base, request, { requestToken: "own" });
          const cached = await prepareGraphEdgeRoutes(base, request, { requestToken: "owned", executor });
          assert.equal(prepared.inputHash, cached.inputHash);
        }
        assert.equal(reads, 0, key);
      } finally {
        executor?.dispose();
        if (previous === undefined) delete Object.prototype[key];
        else Object.defineProperty(Object.prototype, key, previous);
      }
    }
    assert.equal(serializeProgram(base), saved);
  } },
  { id: "edge-routes/responsive-source-and-guide-closure", run() {
    const rows = [{ id: "a", x: 0, y: 1000 }, { id: "b", x: 1, y: 2000 }, { id: "c", x: 2, y: 3000 }];
    const initial = source().editCanvas({ width: 1000, height: 700, margin: 100 })
      .reviseData({ source: "nodes", id: "observations", values: rows });
    const p = plot(initial.bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "screen" }))
      .createScatterPlot({ id: "points", data: "observations", x: "x", y: "y", guides: false })
      .createYAxis({ title: false }).editCanvas({ responsive: {} }).editYAxisLabels({ fontSize: 32 })
      .createGraphData({ id: "other-graph", nodes: "nodes", edges: "edges", nodeKey: "id", source: "s", target: "t", edgeKey: "id" })
      .layoutGraph({ id: "other-layout", graph: "other-graph", method: "circular" })
      .bundleGraphEdges({ id: "other-routes", graph: "other-graph", layout: "other-layout", method: "edge-path", coordinateSpace: "screen" });
    const bounds = program => {
      const plot = program.materializationConfigs.canvas.responsiveResult.snapshot.plot;
      return { x: plot.left, y: plot.top, width: plot.right - plot.left, height: plot.bottom - plot.top };
    };
    const saved = serializeProgram(p);
    const next = p.reviseData({ source: "observations", id: "updated", values: rows.map(row => ({ ...row, y: row.y * 100000 })) });
    assert.notDeepEqual(bounds(next), bounds(p));
    for (const resource of next.semanticSpec.resources.filter(resource => resource.kind === "edge-route")) {
      assert.deepEqual(resource.result.viewport, bounds(next));
      assert.equal(resource.revision, p.semanticSpec.resources.find(previous => previous.kind === "edge-route" && previous.id === resource.id).revision + 1);
    }
    const guides = p.editYAxisLabels({ fontSize: 64 });
    assert.deepEqual(route(guides).result.viewport, bounds(guides));
    assert.equal(route(guides).revision, route(p).revision + 1);
    const resized = guides.editCanvas({ width: 900, height: 650 });
    assert.deepEqual(route(resized).result.viewport, bounds(resized));
    assert.equal(route(resized).revision, route(guides).revision + 1);
    assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
    assert.equal(serializeProgram(p), saved);
  } },
  { id: "edge-routes/worker-authority-and-cache", async run() {
    const base = source(), saved = serializeProgram(base); let created = 0, terminated = 0;
    const executor = createGraphRouteExecutor({ createWorker() {
      created++;
      const code = `import {parentPort} from 'node:worker_threads'; import {computeGraphEdgeRoutes} from ${JSON.stringify(import.meta.resolve("ggaction/graph"))}; parentPort.on('message',({job})=>parentPort.postMessage(computeGraphEdgeRoutes(job)));`;
      const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(code)}`)), listeners = new Map();
      return {
        postMessage: value => worker.postMessage(value),
        addEventListener(type, listener) { const adapted = type === "message" ? data => listener({ data }) : error => listener({ error }); listeners.set(listener, adapted); worker.on(type, adapted); },
        removeEventListener(type, listener) { worker.off(type, listeners.get(listener)); listeners.delete(listener); },
        terminate() { terminated++; void worker.terminate(); }
      };
    } });
    const request = { kind: "create", id: "routes", method: "edge-path" };
    try {
      const prepared = await prepareGraphEdgeRoutes(base, request, { requestToken: "first", executor });
      const program = base.bundleGraphEdges({ prepared, requestToken: "first" });
      assert.deepEqual(program.semanticSpec, base.bundleGraphEdges({ id: "routes", method: "edge-path" }).semanticSpec);
      assert.equal(created, 1); assert.equal(terminated, 1);
      await prepareGraphEdgeRoutes(base, request, { requestToken: "cached", executor }); assert.equal(created, 1);
      executor.evict(prepared.inputHash);
      await prepareGraphEdgeRoutes(base, request, { requestToken: "fresh", executor }); assert.equal(created, 2);
      for (const receiver of [base.editCanvas({ background: "red" }), deserializeProgram(saved), program]) {
        assert.throws(() => receiver.bundleGraphEdges({ prepared, requestToken: "first" }), /different receiver/);
      }
      assert.throws(() => base.bundleGraphEdges({ prepared, requestToken: "wrong" }), /token/);
      assert.throws(() => base.bundleGraphEdges({ prepared: { ...prepared }, requestToken: "first" }), /authentic/);
      const abort = new AbortController(); abort.abort();
      await assert.rejects(prepareGraphEdgeRoutes(base, request, { requestToken: "cancelled", executor, signal: abort.signal }), { name: "AbortError" });
      await assert.rejects(prepareGraphEdgeRoutes(basicChart(), request, { requestToken: "basic" }), /Full/);
      assert.equal(basicChart().bundleGraphEdges, undefined); assert.equal(serializeProgram(base), saved);
    } finally { executor.dispose(); }
    assert.equal(created, terminated);
  } },
  { id: "edge-routes/offline-restore-and-revision", async run() {
    const original = plot(source().bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "screen" }));
    const saved = serializeProgram(original);
    const code = `import {readFileSync} from 'node:fs'; import {deserializeProgram,serializeProgram} from 'ggaction/persistence'; globalThis.fetch=()=>{throw Error('offline')}; const p=deserializeProgram(readFileSync(0,'utf8')); process.stdout.write(serializeProgram(p.editCanvas({width:360})));`;
    const updated = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", code], { input: saved, encoding: "utf8", timeout: 30000 }));
    assert.equal(route(updated).revision, 1); assert.equal(updated.graphicSpec.objects.canvas.properties.width, 360);
    assert.deepEqual(route(updated).result.routes.map(item => item.edgeKey), route(original).result.routes.map(item => item.edgeKey));
    const edited = updated.editEdgeRoute({ target: "routes", options: { exponent: 3 } });
    assert.equal(route(edited).revision, 2);
    const revised = edited.reviseData({ source: "edges", id: "edges2", values: [{ id: "ac", s: "a", t: "c" }] });
    assert.equal(route(revised).revision, 3); assert.equal(route(revised).result.routes.length, 1);
    assert.equal(serializeProgram(original), saved);
    assert.throws(() => original.removeResource({ kind: "edge-route", id: "routes" }), /depend|referenc|consumer/i);
    assert.equal(original.editGraphPlot({ routes: false }).removeResource({ kind: "edge-route", id: "routes" }).semanticSpec.resources.some(value => value.kind === "edge-route"), false);
  } },
  { id: "edge-routes/four-renderers-and-scene", async run() {
    const program = plot(source().bundleGraphEdges({ id: "routes", method: "edge-path" }));
    const graphic = deserializeGraphic(serializeGraphic(program));
    assert.equal(graphic.semanticSpec, undefined); assert.equal(renderToSVG(graphic), renderToSVG(program));
    const png = await renderToPNGBuffer(program), restored = await renderToPNGBuffer(graphic); assert.deepEqual(png.buffer, restored.buffer);
    const canvas = createCanvas(1, 1); render(graphic, canvas.getContext("2d"));
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const image = await loadImage(png.buffer), raster = createCanvas(png.width, png.height); raster.getContext("2d").drawImage(image, 0, 0);
    assert.deepEqual(raster.getContext("2d").getImageData(0, 0, png.width, png.height).data, pixels);
    const pdf = await renderToPDFBuffer(program), restoredPDF = await renderToPDFBuffer(graphic); assert.deepEqual(streams(pdf.buffer), streams(restoredPDF.buffer));
    assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image/);
    const scene = createTransitionScene(program, { format: "canvas" }); assert.deepEqual(createTransitionScene(graphic, { format: "canvas" }), scene);
    const frame = createCanvas(1, 1); renderTransitionScene(scene, frame.getContext("2d"));
    assert.deepEqual(frame.getContext("2d").getImageData(0, 0, frame.width, frame.height).data, pixels);
    assert.equal(new Set(scene.nodes.map(node => node.key)).size, scene.nodes.length);
  } }
];
