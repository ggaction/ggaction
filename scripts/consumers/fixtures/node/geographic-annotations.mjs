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

const feature = (x = 60) => ({ type: "Feature", id: "place", properties: { name: "Port" }, geometry: { type: "Point", coordinates: [x, 50] } });
const source = () => chart().createCanvas({ width: 200, height: 120, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: feature() })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoAnnotation({ id: "note", anchor: { type: "feature", geometry: "places", key: "place" }, text: "Port", dy: -10, fill: "navy" });
const properties = p => p.graphicSpec.objects.note.items[0].properties;
function streams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "geographic-annotations/feature-anchor-and-atomicity", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.equal(basic().createGeoAnnotation, undefined); assert.equal(basic().editGeoAnnotation, undefined);
    const p = source(), saved = serializeProgram(p), key = getMarkItems(p)[0].key;
    const q = p.editGeometryData({ values: feature(90) }).editGeoAnnotation({ text: "Moved" });
    assert.deepEqual([properties(q).x, properties(q).y, properties(q).text], [90, 40, "Moved"]);
    assert.equal(getMarkItems(q)[0].key, key);
    assert.throws(() => p.editGeometryData({ values: { ...feature(), id: "missing" } }));
    assert.equal(serializeProgram(p), saved);
  } },
  { id: "geographic-annotations/offline-fresh-process", run() {
    const p = source();
    const script = `import {readFileSync} from 'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};const p=deserializeProgram(readFileSync(0,'utf8'));
      process.stdout.write(serializeProgram(p.editGeoAnnotation({text:'Restored',dx:5}).editProjection({scalePx:2})));`;
    const q = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: serializeProgram(p), encoding: "utf8", timeout: 30000 }));
    assert.deepEqual([properties(q).x, properties(q).y, properties(q).text], [125, 90, "Restored"]);
    assert.equal(getMarkItems(q)[0].key, getMarkItems(p)[0].key);
    assert.equal(q.semanticSpec.layers[0].geoBinding.anchor.key, "place");
  } },
  { id: "geographic-annotations/four-renderer-native-text-parity", async run() {
    const p = source(), primitive = chart().createCanvas({ width: 200, height: 120, margin: 0 })
      .createGraphics({ id: "note", type: "collection", parent: "plot-main" })
      .editGraphics({ target: "note", property: "items", value: [{ type: "text", properties: { x: 60, y: 40, text: "Port", fill: "navy", opacity: 1,
        fontSize: 12, fontFamily: "sans-serif", fontWeight: "normal", textAlign: "left", textBaseline: "alphabetic", rotation: 0 } }] });
    assert.deepEqual(properties(p), properties(primitive));
    assert.equal(renderToSVG(p), renderToSVG(primitive));
    const a = createCanvas(1, 1), b = createCanvas(1, 1); render(p, a.getContext("2d")); render(primitive, b.getContext("2d"));
    assert.deepEqual(a.getContext("2d").getImageData(0, 0, 200, 120).data, b.getContext("2d").getImageData(0, 0, 200, 120).data);
    assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(primitive)).buffer);
    assert.deepEqual(streams((await renderToPDFBuffer(p)).buffer), streams((await renderToPDFBuffer(primitive)).buffer));
  } }
];
