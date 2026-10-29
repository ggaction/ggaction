import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { getMarkItems } from "ggaction/inspection";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
const values = (a = 1, b = 4) => ({ type: "FeatureCollection", features: [["west", a, 60], ["east", b, 140]].map(([id, value, x]) => ({ type: "Feature", id,
  properties: { value, region: id }, geometry: { type: "Point", coordinates: [x, 60] } })) });
const source = () => chart().createCanvas({ width: 240, height: 120, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values() })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points" })
  .encodeColor({ field: "region", scale: { id: "color", range: ["red", "blue"] } })
  .encodeSize({ field: "value", scale: { id: "area", domain: [1, 4], range: [4 * Math.PI, 16 * Math.PI] } });
const properties = p => p.graphicSpec.objects.points.items.map(item => item.properties);
const streams = buffer => [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
  const bytes = Buffer.from(match[1], "latin1"); try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
});
const conditional = () => source().createParameter({ id: "on", value: true })
  .selectMarks({ id: "chosen", field: "value", op: "gte", value: 4 })
  .encodeColor({ conditions: [{ when: { version: 2, registry: "standard@1", root: { type: "parameter", id: "on" } }, value: { value: "green" } }], otherwise: { value: "gray" } })
  .encodeSize({ conditions: [{ when: { selection: "chosen" }, value: { field: "value", scale: { id: "area", domain: [1, 4], range: [4 * Math.PI, 16 * Math.PI] } } }], otherwise: { value: 0 } });
export const cases = [
  { id: "geographic-encodings/conditional-references-and-atomicity", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    const p = conditional(), saved = serializeProgram(p), keys = getMarkItems(p).map(item => item.key);
    assert.deepEqual(properties(p).map(item => [item.fill, item.radius]), [["green", 0], ["green", 4]]);
    const q = p.editParameter({ target: "on", value: false }).editMarkSelection({ selection: "chosen", field: "value", op: "gte", value: 1 });
    assert.deepEqual(properties(q).map(item => [item.fill, item.radius]), [["gray", 2], ["gray", 4]]);
    assert.deepEqual(getMarkItems(q).map(item => item.key), keys);
    assert.throws(() => p.editGeometryData({ values: values("bad", 4) })); assert.equal(serializeProgram(p), saved);
    assert.throws(() => p.removeParameter({ id: "on" }), /referenced/);
  } },
  { id: "geographic-encodings/fresh-process-conditional-source-revision", run() {
    const p = conditional();
    const script = `import fs from'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};const p=deserializeProgram(fs.readFileSync(0,'utf8'));
      process.stdout.write(serializeProgram(p.editParameter({target:'on',value:false}).editGeometryData({values:${JSON.stringify(values(4, 1))}})));`;
    const q = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: serializeProgram(p), encoding: "utf8", timeout: 30000 }));
    assert.deepEqual(properties(q).map(item => [item.fill, item.radius]), [["gray", 4], ["gray", 0]]);
    assert.deepEqual(getMarkItems(q).map(item => item.key), getMarkItems(p).map(item => item.key));
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  } },
  { id: "geographic-encodings/four-renderer-conditional-parity", async run() {
    const p = conditional(), native = { stroke: "none", strokeWidth: 0, opacity: 1, lineCap: "butt", lineJoin: "miter", miterLimit: 10 };
    const primitive = chart().createCanvas({ width: 240, height: 120, margin: 0 })
      .createGraphics({ id: "points", type: "collection", parent: "plot-main" })
      .editGraphics({ target: "points", property: "items", value: [
        { type: "circle", properties: { ...native, x: 60, y: 60, radius: 0, fill: "green" } },
        { type: "circle", properties: { ...native, x: 140, y: 60, radius: 4, fill: "green" } }
      ] });
    assert.deepEqual(properties(p), properties(primitive)); assert.equal(renderToSVG(p), renderToSVG(primitive));
    const a = createCanvas(1, 1), b = createCanvas(1, 1); render(p, a.getContext("2d")); render(primitive, b.getContext("2d"));
    assert.deepEqual(a.getContext("2d").getImageData(0, 0, 240, 120).data, b.getContext("2d").getImageData(0, 0, 240, 120).data);
    assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(primitive)).buffer);
    assert.deepEqual(streams((await renderToPDFBuffer(p)).buffer), streams((await renderToPDFBuffer(primitive)).buffer));
  } },
  { id: "geographic-encodings/fields-guides-and-atomic-edits", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    const p = source(), saved = serializeProgram(p), keys = getMarkItems(p).map(item => item.key);
    assert.deepEqual(properties(p).map(item => [item.fill, item.radius]), [["red", 2], ["blue", 4]]);
    assert.throws(() => p.editGeoPointMark({ radiusPx: 8 }), /field-bound/); assert.equal(serializeProgram(p), saved);
    const q = p.editCanvas({ width: 500, height: 360, margin: { left: 0, right: 200, top: 0, bottom: 0 } }).createLegend();
    assert.ok(q.semanticSpec.guides.legend.color); assert.ok(q.semanticSpec.guides.legend.size);
    const r = q.encodeColor({ value: "green" }); assert.equal(r.semanticSpec.guides.legend.color, undefined); assert.ok(r.semanticSpec.guides.legend.size);
    assert.deepEqual(getMarkItems(r).map(item => item.key), keys); assert.deepEqual(properties(r).map(item => item.fill), ["green", "green"]);
  } },
  { id: "geographic-encodings/fresh-process-field-source-revision", run() {
    const p = source();
    const script = `import fs from'node:fs';import{deserializeProgram,serializeProgram}from'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};const p=deserializeProgram(fs.readFileSync(0,'utf8'));
      process.stdout.write(serializeProgram(p.editColorScale({id:'color',range:['green','purple']}).encodeSize({value:9*Math.PI})));`;
    const q = deserializeProgram(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: serializeProgram(p), encoding: "utf8", timeout: 30000 }));
    assert.deepEqual(properties(q).map(item => [item.fill, item.radius]), [["green", 3], ["purple", 3]]);
    assert.deepEqual(getMarkItems(q).map(item => item.key), getMarkItems(p).map(item => item.key));
    const r = p.editGeometryData({ values: values(4, 1) }); assert.deepEqual(properties(r).map(item => item.radius), [4, 2]);
  } },
  { id: "geographic-encodings/four-renderer-feature-area-parity", async run() {
    const p = source(), native = { stroke: "none", strokeWidth: 0, opacity: 1, lineCap: "butt", lineJoin: "miter", miterLimit: 10 };
    const primitive = chart().createCanvas({ width: 240, height: 120, margin: 0 })
      .createGraphics({ id: "points", type: "collection", parent: "plot-main" })
      .editGraphics({ target: "points", property: "items", value: [
        { type: "circle", properties: { ...native, x: 60, y: 60, radius: 2, fill: "red" } },
        { type: "circle", properties: { ...native, x: 140, y: 60, radius: 4, fill: "blue" } }
      ] });
    assert.deepEqual(properties(p), properties(primitive)); assert.equal(renderToSVG(p), renderToSVG(primitive));
    const a = createCanvas(1, 1), b = createCanvas(1, 1); render(p, a.getContext("2d")); render(primitive, b.getContext("2d"));
    assert.deepEqual(a.getContext("2d").getImageData(0, 0, 240, 120).data, b.getContext("2d").getImageData(0, 0, 240, 120).data);
    assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(primitive)).buffer);
    assert.deepEqual(streams((await renderToPDFBuffer(p)).buffer), streams((await renderToPDFBuffer(primitive)).buffer));
  } }
];
