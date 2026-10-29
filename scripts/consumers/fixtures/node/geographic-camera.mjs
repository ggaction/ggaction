import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { getProjectionView, getMarkItems } from "ggaction/inspection";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
const source = () => chart().createCanvas({ width: 240, height: 120, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", values: { type: "MultiPoint", coordinates: [[60, 60], [140, 60]] } })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points", radiusPx: 4, fill: "red" });
const zoom = p => p.navigateProjection({ operation: { type: "zoom", anchorPx: [60, 60], factor: 2, scaleExtent: [.5, 4] } });
const properties = p => p.graphicSpec.objects.points.items.map(item => item.properties);
const streams = buffer => [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
  const bytes = Buffer.from(match[1], "latin1"); try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
});
export const cases = [
  { id: "geographic-camera/explicit-native-view-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//); assert.equal(basic().navigateProjection, undefined);
    const p = source(), initial = getProjectionView(p), saved = serializeProgram(p), q = zoom(p);
    assert.deepEqual(properties(q).map(item => [item.x, item.y, item.radius]), [[60, 60, 4], [220, 60, 4]]);
    assert.equal(getProjectionView(q).projection.revision, 1); assert.ok(Object.isFrozen(initial.parameters.translatePx));
    assert.deepEqual(getMarkItems(q).map(item => item.key), getMarkItems(p).map(item => item.key));
    assert.deepEqual(q.navigateProjection({ operation: { type: "reset", initial: initial.parameters } }).graphicSpec, p.graphicSpec);
    assert.throws(() => p.navigateProjection({ operation: { type: "resize", canvas: { width: 0 }, scaling: "fit" } }));
    assert.equal(serializeProgram(p), saved);
  } },
  { id: "geographic-camera/fresh-process-restored-native-navigation", run() {
    const p = zoom(source());
    const script = `import fs from'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};const p=deserializeProgram(fs.readFileSync(0,'utf8'));
      process.stdout.write(serializeProgram(p.navigateProjection({operation:{type:'pan',deltaPx:[-20,10]}})));`;
    const q = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: serializeProgram(p), encoding: "utf8", timeout: 30000 }));
    assert.deepEqual(properties(q).map(item => [item.x, item.y]), [[40, 70], [200, 70]]);
    assert.deepEqual(getMarkItems(q).map(item => item.key), getMarkItems(p).map(item => item.key));
    const sized = q.navigateProjection({ operation: { type: "resize", canvas: { width: 480, height: 240 }, scaling: "fit" } });
    assert.equal(getProjectionView(sized).parameters.scalePx, 4); assert.equal(getProjectionView(sized).projection.revision, 3);
  } },
  { id: "geographic-camera/four-renderer-anchored-view-parity", async run() {
    const p = zoom(source()), native = { stroke: "none", strokeWidth: 0, opacity: 1, lineCap: "butt", lineJoin: "miter", miterLimit: 10, radius: 4, fill: "red" };
    const primitive = chart().createCanvas({ width: 240, height: 120, margin: 0 })
      .createGraphics({ id: "points", type: "collection", parent: "plot-main" })
      .editGraphics({ target: "points", property: "items", value: [
        { type: "circle", properties: { ...native, x: 60, y: 60 } }, { type: "circle", properties: { ...native, x: 220, y: 60 } }
      ] });
    assert.deepEqual(properties(p), properties(primitive)); assert.equal(renderToSVG(p), renderToSVG(primitive));
    const a = createCanvas(1, 1), b = createCanvas(1, 1); render(p, a.getContext("2d")); render(primitive, b.getContext("2d"));
    assert.deepEqual(a.getContext("2d").getImageData(0, 0, 240, 120).data, b.getContext("2d").getImageData(0, 0, 240, 120).data);
    assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(primitive)).buffer);
    assert.deepEqual(streams((await renderToPDFBuffer(p)).buffer), streams((await renderToPDFBuffer(primitive)).buffer));
  } }
];
