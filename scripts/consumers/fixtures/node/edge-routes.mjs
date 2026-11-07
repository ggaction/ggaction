import assert from "node:assert/strict";
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
import { execFileWithInput } from "./consumer-input.js";

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
  { id: "edge-routes/packed-density-samples", async run() {
    const base = chart().createCanvas({ width: 320, height: 240, margin: 0 })
      .createData({ id: "nodes", keyField: "id", values: [0, 1, 2, 3].map(id => ({ id })) })
      .createData({ id: "edges", keyField: "id", values: [{ id: 10, source: 0, target: 1 }, { id: 2, source: 3, target: 2 }] })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target", directed: true })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: -0, y: 0 }, { key: 1, x: 300, y: 0 }, { key: 2, x: 0, y: 6 }, { key: 3, x: 300, y: 6 }] } });
    const before = serializeProgram(base), direct = base.bundleGraphEdges({ id: "routes", method: "density" }), result = route(direct).result;
    const prepared = await prepareGraphEdgeRoutes(base, { kind: "create", id: "routes", method: "density" }, { requestToken: "density" });
    assert.deepEqual(route(base.bundleGraphEdges({ prepared, requestToken: "density" })).result, result);
    assert.equal(result.diagnostics.iterations, 20); assert.equal(result.diagnostics.schedule.length, 20);
    assert.deepEqual(result.routes.map(item => [item.commands[0], item.commands.at(-1)]), [
      [{ op: "M", x: -0, y: 0 }, { op: "L", x: 300, y: 0 }], [{ op: "M", x: 300, y: 6 }, { op: "L", x: 0, y: 6 }]
    ]);
    assert.ok(result.routes.every(item => item.commands.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))));
    assert.deepEqual(route(deserializeProgram(serializeProgram(direct))).result, result);
    const edited = direct.editEdgeRoute({ target: "routes", options: { zeroLength: "point" } });
    assert.equal(route(edited).revision, 1); assert.deepEqual(route(edited).result, result); assert.equal(serializeProgram(base), before);
  } },
  { id: "edge-routes/ordered-force-storage", async run() {
    const count = 100, nodes = Array.from({ length: count }, (_, id) => ({ id }));
    const edges = nodes.map(({ id }) => ({ id, source: id, target: (id + Math.floor(count / 3)) % count }));
    const positions = nodes.map(({ id }) => ({ key: id, x: 200 + 150 * Math.cos(2 * Math.PI * id / count), y: 200 + 150 * Math.sin(2 * Math.PI * id / count) }));
    const base = chart().createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target", directed: false })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions } });
    const original = serializeProgram(base), direct = base.bundleGraphEdges({ id: "routes", method: "force-directed" });
    const result = route(direct).result, prepared = await prepareGraphEdgeRoutes(base, { kind: "create", id: "routes", method: "force-directed" }, { requestToken: "ordered" });
    assert.deepEqual(route(base.bundleGraphEdges({ prepared, requestToken: "ordered" })).result, result);
    assert.deepEqual([result.diagnostics.work, result.diagnostics.candidatePairs, result.diagnostics.peakSamples, result.diagnostics.compatibilityPairs, result.diagnostics.totalIterations], [1264670, 4950, 7000, 750, 165]);
    assert.equal(result.routes.length, count);
    result.routes.forEach((item, i) => {
      const source = positions[i], target = positions[(i + Math.floor(count / 3)) % count];
      assert.deepEqual(item.commands[0], { op: "M", x: source.x, y: source.y });
      assert.deepEqual(item.commands.at(-1), { op: "L", x: target.x, y: target.y });
      assert.equal(item.commands.length, 34); assert.equal(item.controlPoints.length, 34);
      assert.ok(item.commands.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
    });
    assert.deepEqual(route(deserializeProgram(serializeProgram(direct))).result, result);
    assert.equal(serializeProgram(base), original);
  } },
  { id: "edge-routes/symmetric-force-pairs", async run() {
    const base = chart().createCanvas({ width: 320, height: 240, margin: 0 })
      .createData({ id: "nodes", keyField: "id", values: ["a", "b", "c", "d"].map(id => ({ id })) })
      .createData({ id: "edges", keyField: "id", values: [{ id: 10, source: "a", target: "b" }, { id: 2, source: "d", target: "c" }] })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target", directed: false })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions: [
        { key: "a", x: 20, y: 100 }, { key: "b", x: 300, y: 100 }, { key: "c", x: 20, y: 120 }, { key: "d", x: 300, y: 120 }
      ] } });
    const before = serializeProgram(base), direct = base.bundleGraphEdges({ id: "routes", method: "force-directed" });
    const executor = createGraphRouteExecutor();
    try {
      const prepared = await prepareGraphEdgeRoutes(base, { kind: "create", id: "routes", method: "force-directed" }, { requestToken: "pairs", executor });
      const applied = base.bundleGraphEdges({ prepared, requestToken: "pairs" }), result = route(applied).result;
      assert.deepEqual(result, route(direct).result);
      assert.equal(result.diagnostics.compatibilityPairs, 1); assert.equal(result.diagnostics.totalIterations, 165);
      assert.deepEqual(result.routes.map(r => r.commands.length), [34, 34]);
      assert.deepEqual(result.routes.map(r => [r.commands[0], r.commands.at(-1)]), [
        [{ op: "M", x: 20, y: 100 }, { op: "L", x: 300, y: 100 }],
        [{ op: "M", x: 300, y: 120 }, { op: "L", x: 20, y: 120 }]
      ]);
      assert.ok(result.routes.every(r => r.commands.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))));
      const complete = plot(applied);
      assert.deepEqual(deserializeProgram(serializeProgram(complete)).graphicSpec, complete.graphicSpec);
      assert.deepEqual(route(deserializeProgram(serializeProgram(complete))).result, result);
      assert.equal(serializeProgram(base), before);
    } finally { executor.dispose(); }
  } },
  { id: "edge-routes/bounded-hierarchy-spans", run() {
    const count = 9999, edgeCount = 10000;
    const nodes = Array.from({ length: count }, (_, id) => ({ id }));
    const edges = Array.from({ length: edgeCount }, (_, id) => ({ id, source: id % count, target: (id + 3333) % count }));
    let base = chart().createData({ id: "tree", values: [{ key: "root", parent: null, value: 0 },
      ...nodes.map(({ id }) => ({ key: id, parent: "root", value: 1 }))] })
      .createHierarchyData({ id: "hierarchy", data: "tree", key: "key", parent: "parent", value: "value" })
      .layoutHierarchy({ id: "tree-layout", method: "tree", options: { nodeSize: [1, 1], siblingGap: 1, depthGap: 100, orientation: "vertical" } });
    const hierarchy = base.semanticSpec.resources.find(r => r.kind === "hierarchy");
    const anchors = new Map(base.semanticSpec.resources.find(r => r.kind === "layout").result.nodes.map(n => [n.key, n]));
    const positions = hierarchy.result.nodes.filter(n => n.depth === 1)
      .map(n => ({ key: nodes[n.sourceRows[0] - 1].id, x: anchors.get(n.key).x, y: anchors.get(n.key).y }));
    const byKey = new Map(positions.map(p => [p.key, p]));
    base = base.createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions } });
    const saved = serializeProgram(base);
    const routed = base.bundleGraphEdges({ id: "routes", graph: "graph", layout: "layout", method: "hierarchical",
      options: { hierarchy: "hierarchy", hierarchyLayout: "tree-layout", mapping: nodes.map(({ id }) => ({ nodeKey: id, hierarchyKey: id })) } });
    const result = route(routed).result;
    assert.equal(result.routes.length, edgeCount); assert.ok(result.diagnostics.work <= 10_000_000);
    assert.ok(result.diagnostics.peakSamples < 10_000_000);
    result.routes.forEach((item, i) => {
      const from = byKey.get(edges[i].source), to = byKey.get(edges[i].target);
      assert.deepEqual(item.commands[0], { op: "M", x: from.x, y: from.y });
      assert.deepEqual(item.commands.at(-1), { op: "L", x: to.x, y: to.y });
      assert.equal(item.controlPoints.length, 3); assert.equal(item.provenance.hierarchyKeys.length, 3);
      assert.equal(item.provenance.splineVersion, "clamped-uniform@1"); assert.equal(item.provenance.degree, 2);
    });
    assert.deepEqual(route(deserializeProgram(serializeProgram(routed))).result, result);
    assert.equal(serializeProgram(base), saved);
  } },
  { id: "edge-routes/bounded-long-paths", run() {
    const count = 10000, nodes = Array.from({ length: count }, (_, id) => ({ id }));
    const edges = nodes.map(({ id }) => ({ id, source: id, target: (id + 3333) % count }));
    const positions = nodes.map(({ id }) => ({ key: id, x: 200 + 150 * Math.cos(2 * Math.PI * id / count), y: 200 + 150 * Math.sin(2 * Math.PI * id / count) }));
    const base = chart().createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target", directed: false })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions } });
    const saved = serializeProgram(base), routed = base.bundleGraphEdges({ id: "routes", method: "edge-path" }), result = route(routed).result;
    assert.equal(result.routes.length, count);
    assert.ok(result.diagnostics.work <= 10_000_000);
    assert.deepEqual(result.diagnostics.lockedEdges, []); assert.deepEqual(result.diagnostics.bundledEdges, []);
    result.routes.forEach((item, index) => {
      const source = positions[index], target = positions[(index + 3333) % count];
      assert.equal(item.provenance.reason, "stretch");
      assert.deepEqual(item.commands, [{ op: "M", x: source.x, y: source.y }, { op: "L", x: target.x, y: target.y }]);
    });
    const restored = deserializeProgram(serializeProgram(routed));
    assert.deepEqual(route(restored).result, result);
    assert.equal(serializeProgram(base), saved);
  } },
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
    const reference = await prepareGraphEdgeRoutes(base, request, { requestToken: "defaults" });
    for (const key of ["zeroLength", "exponent", "maxStretch", "mapping", "limits", "hierarchy", "hierarchyLayout"]) {
      let reads = 0;
      const previous = Object.getOwnPropertyDescriptor(Object.prototype, key);
      Object.defineProperty(Object.prototype, key, { configurable: true, get() { reads++; throw new Error(`Inherited ${key} evaluated`); } });
      try {
        const prepared = await prepareGraphEdgeRoutes(base, request, { requestToken: "numeric" });
        assert.equal(prepared.inputHash, reference.inputHash);
        assert.equal(reads, 0, key);
      } finally {
        if (previous === undefined) delete Object.prototype[key];
        else Object.defineProperty(Object.prototype, key, previous);
      }
    }
    const routed = base.bundleGraphEdges({ id: "routes", method: "edge-path" });
    let reads = 0;
    await assert.rejects(prepareGraphEdgeRoutes(routed, { kind: "edit", target: "routes", options: {
      limits: { get maxSamples() { reads++; return 1000; } }
    } }, { requestToken: "accessor" }), /accessors/);
    assert.equal(reads, 0);
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
    const updated = deserializeProgram(execFileWithInput(process.execPath, ["--input-type=module", "-e", code], { input: saved, encoding: "utf8", timeout: 30000 }));
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
