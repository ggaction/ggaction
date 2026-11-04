import assert from "node:assert/strict";
import { execFileWithInput } from "./consumer-input.js";
import { inflateSync } from "node:zlib";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { getMarkItems } from "ggaction/inspection";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

const source = () => chart().createCanvas({ width: 240, height: 180, margin: 0, background: "white" })
  .createData({ id: "nodes", values: [{ k: "a" }, { k: "b" }, { k: "c" }], keyField: "k" })
  .createData({ id: "edges", values: [{ k: 1, s: "a", t: "b" }, { k: "1", s: "b", t: "c" }], keyField: "k" })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "k", edgeKey: "k", source: "s", target: "t" })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 170, y: 10 }, { key: "b", x: -170, y: 20 }, { key: "c", x: -140, y: 40 }] } })
  .bundleGraphEdges({ id: "routes", method: "edge-path" })
  .createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: "geographic" });
const plotted = () => source().createProjection({ id: "map", type: "equirectangular", scalePx: 30, translatePx: [120, 90] })
  .createCoordinate({ id: "geo", type: "geo" }).createGeoLineMark({ id: "lines", stroke: "#2563eb", strokeWidth: 3, interpolation: "great-circle" });
const resource = (p, id) => p.semanticSpec.resources.find(r => r.id === id);
const streams = buffer => [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
  const bytes = Buffer.from(match[1], "latin1"); try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
});
export const cases = [
  { id: "geographic-routes/source-and-atomic-revision", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.equal(basic().createGeoRouteData, undefined); assert.equal(basic().editGeoRouteData, undefined);
    const p = plotted(), saved = serializeProgram(p), keys = getMarkItems(p).map(i => i.key);
    const q = p.editGeoRouteData({ target: "mapped", routes: "routes" }).editLayout({ target: "layout", node: { key: "b", x: -160, y: 25 } });
    assert.equal(resource(q, "mapped").revision, 2); assert.deepEqual(getMarkItems(q).map(i => i.key), keys);
    assert.deepEqual(getMarkItems(q).map(i => i.rows.map(r => [r.data, r.index])), [[["edges", 0]], [["edges", 1]]]);
    assert.throws(() => p.editLayout({ target: "layout", node: { key: "b", x: 0, y: 91 } }), /latitude/);
    assert.equal(serializeProgram(p), saved);
  } },
  { id: "geographic-routes/offline-restored-edit", run() {
    const p = plotted(), saved = serializeProgram(p);
    const script = `import {readFileSync} from 'node:fs';import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';
      const fail=()=>{throw Error('Unexpected network')};globalThis.fetch=fail;http.request=http.get=https.request=https.get=net.connect=net.createConnection=tls.connect=fail;
      const {deserializeProgram,serializeProgram}=await import('ggaction/persistence');const p=deserializeProgram(readFileSync(0,'utf8'));
      process.stdout.write(serializeProgram(p.editEdgeRoute({target:'routes',options:{exponent:3}})));`;
    const q = deserializeProgram(execFileWithInput(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30000 }));
    assert.equal(resource(q, "mapped").revision, 1); assert.deepEqual(getMarkItems(q).map(i => i.key), getMarkItems(p).map(i => i.key));
  } },
  { id: "geographic-routes/four-renderer-native-line-parity", async run() {
    const p = plotted(), routes = resource(p, "routes").result.routes;
    const plain = source().createGeometryData({ id: "literal", coordinateKind: "geographic", format: "geojson", featureKey: "id", values: {
      type: "FeatureCollection", features: routes.map(route => ({ type: "Feature", id: route.edgeKey, properties: {}, geometry: { type: "LineString", coordinates: route.commands.map(c => [c.x, c.y]) } })) } })
      .createProjection({ id: "map", type: "equirectangular", scalePx: 30, translatePx: [120, 90] }).createCoordinate({ id: "geo", type: "geo" })
      .createGeoLineMark({ id: "lines", geometry: "literal", stroke: "#2563eb", strokeWidth: 3, interpolation: "great-circle" });
    assert.deepEqual(p.graphicSpec.objects.lines.items.map(i => i.properties), plain.graphicSpec.objects.lines.items.map(i => i.properties));
    assert.equal(renderToSVG(p), renderToSVG(plain));
    const a = createCanvas(1, 1), b = createCanvas(1, 1), scene = createCanvas(1, 1);
    render(p, a.getContext("2d")); render(plain, b.getContext("2d")); renderTransitionScene(createTransitionScene(p, { format: "canvas" }), scene.getContext("2d"));
    const pixels = c => c.getContext("2d").getImageData(0, 0, 240, 180).data;
    assert.deepEqual(pixels(a), pixels(b)); assert.deepEqual(pixels(a), pixels(scene));
    assert.ok(pixels(a).some((v, i) => i % 4 === 0 && v < 100));
    assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(plain)).buffer);
    assert.deepEqual(streams((await renderToPDFBuffer(p)).buffer), streams((await renderToPDFBuffer(plain)).buffer));
  } }
];
