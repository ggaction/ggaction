import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { getMarkItems } from "ggaction/inspection";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

const features = ["west", "east"].map((id, i) => ({ type: "Feature", id, properties: { code: id },
  geometry: { type: "Polygon", coordinates: [[[20 + i * 80, 20], [70 + i * 80, 20], [70 + i * 80, 80], [20 + i * 80, 80], [20 + i * 80, 20]]] } }));
const source = () => chart().createCanvas({ width: 200, height: 120, margin: 0 })
  .createData({ id: "table", values: [{ code: "west", value: 0 }] })
  .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar", featureKey: "id", values: { type: "FeatureCollection", features } })
  .createGeoJoinData({ id: "joined", geometryKey: "id", dataKey: "code" })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" });
const resource = p => p.semanticSpec.resources.find(item => item.id === "joined");
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "geographic-join/typed-fields-and-atomic-revision", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.equal(basic().createGeoJoinData, undefined); assert.equal(basic().editGeoJoinData, undefined);
    const p = source().createGeoShapeMark({ id: "regions", geometry: "joined" }), saved = serializeProgram(p);
    assert.deepEqual(resource(p).result.rowMap, [0, null]);
    assert.deepEqual(getMarkItems(p).map(item => item.fields.value), [0, undefined]);
    const q = p.editGeoJoinData({ geometryKey: ["properties", "code"] }).reviseData({ source: "table", id: "updated", values: [{ code: "east", value: 12 }] });
    assert.equal(resource(q).revision, 2); assert.deepEqual(resource(q).result.rowMap, [null, 0]);
    assert.throws(() => p.reviseData({ source: "table", id: "invalid", values: [{ code: "west" }, { code: "west" }] }));
    assert.equal(serializeProgram(p), saved);
  } },
  { id: "geographic-join/offline-fresh-process", run() {
    const p = source().createGeoShapeMark({ id: "regions", geometry: "joined" }), saved = serializeProgram(p);
    const script = `import {readFileSync} from 'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};const p=deserializeProgram(readFileSync(0,'utf8'));
      process.stdout.write(serializeProgram(p.editGeoJoinData({dataKey:'code'})));`;
    const q = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30000 }));
    assert.equal(resource(q).revision, 1); assert.deepEqual(resource(q).result.rowMap, [0, null]);
    assert.deepEqual(getMarkItems(q).map(item => item.key), getMarkItems(p).map(item => item.key));
  } },
  { id: "geographic-join/four-renderer-source-geometry-parity", async run() {
    const p = source(), joined = p.createGeoShapeMark({ id: "shape", geometry: "joined", fill: "#2563eb", strokeWidth: 0 });
    const plain = p.createGeoShapeMark({ id: "shape", geometry: "regions", fill: "#2563eb", strokeWidth: 0 });
    assert.deepEqual(joined.graphicSpec.objects.shape.items.map(item => item.properties), plain.graphicSpec.objects.shape.items.map(item => item.properties));
    assert.equal(renderToSVG(joined), renderToSVG(plain));
    const a = createCanvas(1, 1), b = createCanvas(1, 1); render(joined, a.getContext("2d")); render(plain, b.getContext("2d"));
    assert.deepEqual(a.getContext("2d").getImageData(0, 0, 200, 120).data, b.getContext("2d").getImageData(0, 0, 200, 120).data);
    assert.deepEqual((await renderToPNGBuffer(joined)).buffer, (await renderToPNGBuffer(plain)).buffer);
    const pdf = await renderToPDFBuffer(joined), baseline = await renderToPDFBuffer(plain);
    assert.equal(pdf.buffer.subarray(0, 5).toString(), "%PDF-");
    assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(baseline.buffer));
  } }
];
