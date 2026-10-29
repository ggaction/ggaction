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

const feature = (id, x, width) => ({ type: "Feature", id, properties: {}, geometry: { type: "Polygon", coordinates: [
  [[x, 20], [x + width, 20], [x + width, 80], [x, 80], [x, 20]]
] } });
const levels = [{ id: "state", geometry: "states" }, { id: "county", geometry: "counties", enterZoom: 4.2, exitZoom: 3.8,
  parents: [{ key: "a", parent: "s" }, { key: "b", parent: "s" }] }];
const source = () => chart().createCanvas({ width: 200, height: 120, margin: 0 })
  .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: feature("s", 20, 160) })
  .createGeometryData({ id: "counties", format: "geojson", coordinateKind: "planar", featureKey: "id", values: {
    type: "FeatureCollection", features: [feature("a", 20, 80), feature("b", 100, 80)] } })
  .createGeoLODData({ id: "regions", levels, zoom: 5 }).createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" });
const resource = p => p.semanticSpec.resources.find(item => item.id === "regions");
function streams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "geographic-levels/hysteresis-selection-and-atomicity", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.equal(basic().createGeoLODData, undefined); assert.equal(basic().editGeoLODData, undefined);
    const p = source().createGeoShapeMark({ id: "shape", geometry: "regions" }), [a] = getMarkItems(p), saved = serializeProgram(p);
    const selected = p.selectMarks({ id: "selected", target: "shape", items: [a.key] });
    const coarse = selected.editGeoLODData({ zoom: 3 }), [state] = getMarkItems(coarse);
    assert.equal(resource(coarse).options.activeLevel, "state"); assert.ok(state.representationKeys.includes(a.key));
    assert.deepEqual(coarse.materializationConfigs.selections.selected, selected.materializationConfigs.selections.selected);
    assert.deepEqual(getMarkItems(coarse.editGeoLODData({ zoom: 5 })).map(item => item.key), getMarkItems(p).map(item => item.key));
    assert.throws(() => p.editGeoLODData({ levels: [levels[0]] })); assert.equal(serializeProgram(p), saved);
  } },
  { id: "geographic-levels/offline-fresh-process", run() {
    const p = source().createGeoShapeMark({ id: "shape", geometry: "regions" });
    const script = `import {readFileSync} from 'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};const p=deserializeProgram(readFileSync(0,'utf8'));
      process.stdout.write(serializeProgram(p.editGeoLODData({zoom:3})));`;
    const q = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: serializeProgram(p), encoding: "utf8", timeout: 30000 }));
    assert.equal(resource(q).options.activeLevel, "state"); assert.equal(resource(q).revision, 1);
    assert.equal(getMarkItems(q).length, 1); assert.equal(getMarkItems(q)[0].representationKeys.length, 3);
  } },
  { id: "geographic-levels/four-renderer-current-level-parity", async run() {
    for (const [zoom, geometry] of [[5, "counties"], [3, "states"]]) {
      const base = source(), current = base.createGeoShapeMark({ id: "shape", geometry: "regions", fill: "#2563eb", strokeWidth: 0 }).editGeoLODData({ zoom });
      const plain = base.createGeoShapeMark({ id: "shape", geometry, fill: "#2563eb", strokeWidth: 0 });
      assert.deepEqual(current.graphicSpec.objects.shape.items.map(item => item.properties), plain.graphicSpec.objects.shape.items.map(item => item.properties));
      assert.equal(renderToSVG(current), renderToSVG(plain));
      const a = createCanvas(1, 1), b = createCanvas(1, 1); render(current, a.getContext("2d")); render(plain, b.getContext("2d"));
      assert.deepEqual(a.getContext("2d").getImageData(0, 0, 200, 120).data, b.getContext("2d").getImageData(0, 0, 200, 120).data);
      assert.deepEqual((await renderToPNGBuffer(current)).buffer, (await renderToPNGBuffer(plain)).buffer);
      assert.deepEqual(streams((await renderToPDFBuffer(current)).buffer), streams((await renderToPDFBuffer(plain)).buffer));
    }
  } }
];
