import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { getMarkItems, inspectProgram } from "ggaction/inspection";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
const values = { type: "Feature", id: "region", properties: { name: "District" }, geometry: { type: "Polygon", coordinates: [
  [[20, 20], [180, 20], [180, 160], [20, 160], [20, 20]], [[60, 60], [60, 100], [100, 100], [100, 60], [60, 60]]
] } };
const program = () => chart().createCanvas({ width: 240, height: 200, margin: 0 })
  .createGeometryData({ id: "shape", format: "geojson", coordinateKind: "planar", featureKey: "id", values })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoShapeMark({ fill: "#93c5fd", stroke: "#1e40af" });
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "geographic-marks/full-basic-coordinates-and-consumers", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    for (const method of ["createGeoShapeMark", "editGeoShapeMark", "createGeoPointMark", "editGeoPointMark", "createGeoLineMark", "editGeoLineMark", "createGraticule", "editGraticule"]) {
      assert.equal(typeof chart()[method], "function"); assert.equal(basic()[method], undefined);
    }
    assert.throws(() => basic().createCoordinate({ type: "geo" }));
    const p = program(), before = serializeProgram(p);
    const q = p.createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: { type: "Feature", id: "city", properties: {}, geometry: { type: "Point", coordinates: [120, 100] } } })
      .createGeoPointMark({ geometry: "places" }).editGeoPointMark({ radiusPx: 7 })
      .createGeometryData({ id: "line", format: "geojson", coordinateKind: "planar", values: { type: "LineString", coordinates: [[10, 10], [50, 100]] } })
      .createGeoLineMark({ geometry: "line" }).editGeoLineMark({ stroke: "red" })
      .editGeoShapeMark({ target: "geo-shape", opacity: .5 })
      .createProjection({ id: "globe", type: "orthographic", scalePx: 60, translatePx: [120, 100] })
      .createCoordinate({ id: "globe", type: "geo" }).createGraticule({ stepDeg: [90, 45], precisionDeg: 5 })
      .editGraticule({ opacity: .3 });
    assert.equal(getMarkItems(q, { target: "geo-point" })[0].properties.radius, 7);
    assert.ok(inspectProgram(q, { target: { kind: "projection", id: "map" } }).views.some(view => view.owner.id === "geo-shape"));
    assert.throws(() => q.removeResource({ kind: "projection", id: "map", cascade: true }), /coordinate/);
    assert.equal(serializeProgram(p), before);
  } },
  { id: "geographic-marks/fresh-process-offline-edit", run() {
    const p = program(), before = serializeProgram(p), key = getMarkItems(p, { target: "geo-shape" })[0].key;
    const script = `import {readFileSync} from 'node:fs';import {deserializeProgram,serializeProgram} from 'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};
      const p=deserializeProgram(readFileSync(0,'utf8'));process.stdout.write(serializeProgram(p.editProjection({translatePx:[10,20]}).editGeoShapeMark({fill:'orange'})));`;
    const q = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: before, encoding: "utf8", timeout: 30000 }));
    assert.equal(getMarkItems(q, { target: "geo-shape" })[0].key, key);
    assert.deepEqual(q.semanticSpec.coordinates[0].projection, { kind: "projection", id: "map", revision: 1 });
    assert.deepEqual(q.graphicSpec.objects["geo-shape"].items[0].properties.commands[0], { op: "M", x: 30, y: 40 });
    assert.equal(serializeProgram(p), before);
  } },
  { id: "geographic-marks/four-renderers-scene-and-holes", async run() {
    const p = program(), graphic = deserializeGraphic(serializeGraphic(p));
    assert.equal(graphic.semanticSpec, undefined);
    assert.equal(renderToSVG(graphic), renderToSVG(p));
    const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(graphic, context);
    const pixel = (x, y) => [...context.getImageData(x, y, 1, 1).data];
    assert.deepEqual(pixel(80, 80), [255, 255, 255, 255]);
    assert.deepEqual(pixel(40, 40), [147, 197, 253, 255]);
    const pixels = context.getImageData(0, 0, 240, 200).data;
    const png = await renderToPNGBuffer(p), decoded = createCanvas(240, 200); decoded.getContext("2d").drawImage(await loadImage(png.buffer), 0, 0);
    assert.deepEqual(decoded.getContext("2d").getImageData(0, 0, 240, 200).data, pixels);
    const pdf = await renderToPDFBuffer(p), restored = await renderToPDFBuffer(graphic);
    assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(restored.buffer));
    const scene = createTransitionScene(p, { format: "canvas" }), sceneCanvas = createCanvas(1, 1), sceneContext = sceneCanvas.getContext("2d");
    renderTransitionScene(scene, sceneContext);
    assert.deepEqual(sceneContext.getImageData(0, 0, 240, 200).data, pixels);
  } }
];
