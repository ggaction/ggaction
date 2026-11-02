import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

const coordinates = n => Array.from({ length: n }, (_, i) => [-30 + 60 * i / (n - 1), (i % 2 ? 1 : -1) * 5]);
const create = n => chart().createCanvas({ width: 400, height: 400, margin: 20, plotBorder: false })
  .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", values: { type: "FeatureCollection", features: [{ type: "Feature", id: "line", properties: {}, geometry: { type: "LineString", coordinates: coordinates(n) } }] } })
  .createProjection({ id: "map", type: "equirectangular", scalePx: 100, translatePx: [200, 200], precisionPx: .5 }).createCoordinate({ type: "geo" });
function expected(p, n, scale) {
  const paths = p.graphicSpec.objects.coast.items;
  assert.equal(paths.length, 1); assert.equal(paths[0].properties.commands.length, 2 * n - 1);
  assert.equal(paths[0].properties.maxCommands, 200000);
  for (const [i, command] of paths[0].properties.commands.entries()) {
    const lon = -30 + 60 * (i / 2) / (n - 1), lat = i % 2 ? 0 : ((i / 2) % 2 ? 5 : -5);
    assert.equal(command.op, i ? "L" : "M");
    assert.ok(Math.abs(command.x - (200 + scale * lon * Math.PI / 180)) < 1e-9);
    assert.ok(Math.abs(command.y - (200 - scale * lat * Math.PI / 180)) < 1e-9);
  }
}
const streams = buffer => [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
  const bytes = Buffer.from(match[1], "latin1");
  try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
});

export const cases = [
  { id: "geographic-capacity/all-original-vertices-and-atomic-native-closure", run() {
    for (const n of [1000, 10000, 100000]) {
      const source = create(n), sourceBefore = serializeProgram(source);
      if (n > 1000) assert.throws(() => source.createGeoLineMark({ id: "coast" }), /must not exceed (10000|30000)/);
      const p = source.createGeoLineMark({ id: "coast", stroke: "#2563eb", strokeWidth: 2, capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 } });
      expected(p, n, 100); const q = p.editProjection({ scalePx: 200 }); expected(q, n, 200);
      const scene = createTransitionScene(q, { format: "canvas" });
      assert.equal(scene.nodes.filter(node => node.type === "path").length, 1);
      assert.equal(scene.nodes.find(node => node.type === "path").properties.commands.length, 2 * n - 1);
      assert.throws(() => p.editGeoLineMark({ capacity: { maxProjectedPoints: 2 * n - 2, maxPathCommands: 200000 } }), /must not exceed/);
      assert.equal(serializeProgram(source), sourceBefore);
      if (n === 1000) {
        const encoded = serializeProgram(p), replay = `import {readFileSync} from 'node:fs';import {deserializeProgram,serializeProgram} from 'ggaction/persistence';import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import{syncBuiltinESMExports}from'node:module';let network=0;const deny=()=>{network++;throw Error('Network forbidden');};globalThis.fetch=deny;for(const m of[http,https]){m.get=deny;m.request=deny;}net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();process.stdout.write(serializeProgram(deserializeProgram(readFileSync(0,'utf8')).editProjection({scalePx:200})));if(network!==0)throw Error('Unexpected network access');`;
        const restored = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", replay], { input: encoded, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
        expected(restored, n, 200); assert.deepEqual(restored.graphicSpec, q.graphicSpec);
      }
    }
  } },
  { id: "geographic-capacity/source-free-four-backend-and-scene", async run() {
    const p = create(1000).createGeoLineMark({ id: "coast", stroke: "#2563eb", strokeWidth: 2, capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 } });
    const graphic = deserializeGraphic(serializeGraphic(p)), before = serializeGraphic(p);
    assert.equal(graphic.semanticSpec, undefined); assert.equal(renderToSVG(graphic), renderToSVG(p));
    const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(p, context);
    const expectedPixels = Buffer.from(context.getImageData(0, 0, 400, 400).data);
    assert.ok(expectedPixels.some((value, i) => i % 4 !== 3 && value < 200));
    const png = await renderToPNGBuffer(graphic), decoded = createCanvas(400, 400), decodedContext = decoded.getContext("2d");
    decodedContext.drawImage(await loadImage(png.buffer), 0, 0);
    assert.deepEqual(Buffer.from(decodedContext.getImageData(0, 0, 400, 400).data), expectedPixels);
    const scene = createTransitionScene(graphic, { format: "canvas" }), output = createCanvas(1, 1), outputContext = output.getContext("2d");
    renderTransitionScene(scene, outputContext); assert.deepEqual(Buffer.from(outputContext.getImageData(0, 0, 400, 400).data), expectedPixels);
    const pdf = await renderToPDFBuffer(p), concretePDF = await renderToPDFBuffer(graphic);
    assert.deepEqual(streams(pdf.buffer), streams(concretePDF.buffer)); assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image/);
    assert.equal(serializeGraphic(p), before);
  } }
];
