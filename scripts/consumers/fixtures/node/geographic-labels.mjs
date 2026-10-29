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

const feature = (x = 60, name = "Port") => ({ type: "Feature", id: "place", properties: { name }, geometry: { type: "Point", coordinates: [x, 50] } });
const source = () => chart().createCanvas({ width: 200, height: 120, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: feature() })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoPointMark({ id: "points", radiusPx: 0 })
  .createMarkLabels({ id: "labels", field: "name", dy: -10, fill: "navy" });
const properties = p => p.graphicSpec.objects.labels.items[0].properties;
const streams = buffer => [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
  const bytes = Buffer.from(match[1], "latin1");
  try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
});

export const cases = [
  { id: "geographic-labels/native-source-and-selection", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.throws(() => basic().createTextMark({ source: "points" }), /source|mark/i);
    const p = source(), saved = serializeProgram(p), item = getMarkItems(p, { target: "labels" })[0];
    assert.equal(p.semanticSpec.datasets.length, 0);
    assert.deepEqual(item.rows, []);
    assert.equal(p.graphicSpec.objects.labels.items[0].identity.lineage.resource.kind, "geometry");
    const q = p.selectMarks({ id: "chosen", target: "labels", field: "name", op: "eq", value: "Port" })
      .highlightMarks({ selection: "chosen", fill: "red" });
    assert.equal(properties(q).fill, "red");
    assert.equal(getMarkItems(q, { target: "labels" })[0].key, item.key);
    assert.throws(() => p.editGeometryData({ values: { ...feature(), properties: {} } }));
    assert.equal(serializeProgram(p), saved);
  } },
  { id: "geographic-labels/offline-restored-source-revision", run() {
    const p = source();
    const script = `import fs from 'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};const p=deserializeProgram(fs.readFileSync(0,'utf8'));
      process.stdout.write(serializeProgram(p.editGeometryData({values:${JSON.stringify(feature(80, "Moved"))}}).editProjection({scalePx:2})));`;
    const q = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: serializeProgram(p), encoding: "utf8", timeout: 30000 }));
    assert.deepEqual([properties(q).x, properties(q).y, properties(q).text], [160, 90, "Moved"]);
    assert.equal(getMarkItems(q, { target: "labels" })[0].key, getMarkItems(p, { target: "labels" })[0].key);
    assert.equal(q.graphicSpec.objects.labels.items[0].identity.lineage.resource.revision, 1);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  } },
  { id: "geographic-labels/four-renderer-native-text-parity", async run() {
    const p = source(), primitive = chart().createCanvas({ width: 200, height: 120, margin: 0 })
      .createGraphics({ id: "points", type: "collection", parent: "plot-main" })
      .editGraphics({ target: "points", property: "items", value: [{ type: "circle", properties: { x: 60, y: 50, radius: 0,
        fill: "#2563eb", stroke: "none", strokeWidth: 0, opacity: 1, lineCap: "butt", lineJoin: "miter", miterLimit: 10 } }] })
      .createGraphics({ id: "labels", type: "text", length: 0, parent: "plot-main" })
      .editGraphics({ target: "labels", property: "items", value: [{ type: "text", properties: { x: 60, y: 40, text: "Port", fill: "navy", opacity: 1,
        fontSize: 12, fontFamily: "sans-serif", fontWeight: "normal", textAlign: "center", textBaseline: "middle", rotation: 0 } }] });
    assert.deepEqual(properties(p), properties(primitive));
    assert.equal(renderToSVG(p), renderToSVG(primitive));
    const a = createCanvas(1, 1), b = createCanvas(1, 1); render(p, a.getContext("2d")); render(primitive, b.getContext("2d"));
    assert.deepEqual(a.getContext("2d").getImageData(0, 0, 200, 120).data, b.getContext("2d").getImageData(0, 0, 200, 120).data);
    assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(primitive)).buffer);
    assert.deepEqual(streams((await renderToPDFBuffer(p)).buffer), streams((await renderToPDFBuffer(primitive)).buffer));
  } }
];
