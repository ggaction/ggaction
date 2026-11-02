import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "../../../src/index.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { resolvePrimitiveGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";

const streams = buffer => [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
  const bytes = Buffer.from(match[1], "latin1");
  try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
});
const pixels = program => {
  const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(program, context);
  return context.getImageData(0, 0, 100, 100).data;
};

test("declared Geo capacity preserves independent native/primitive four-backend output and concrete scenes", async () => {
  const p = chart().createCanvas({ width: 100, height: 100, margin: 0 })
    .createGeometryData({ id: "shape", coordinateKind: "planar", format: "geojson", values: { type: "Polygon", coordinates: [
      [[10, 10], [90, 10], [90, 90], [10, 90], [10, 10]], [[30, 30], [30, 70], [70, 70], [70, 30], [30, 30]]
    ] } }).createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
    .createGeoShapeMark({ fill: "red", strokeWidth: 0, capacity: { maxProjectedPoints: 10, maxPathCommands: 10 } });
  const commands = [
    { op: "M", x: 10, y: 10 }, { op: "L", x: 90, y: 10 }, { op: "L", x: 90, y: 90 }, { op: "L", x: 10, y: 90 }, { op: "Z" },
    { op: "M", x: 30, y: 30 }, { op: "L", x: 30, y: 70 }, { op: "L", x: 70, y: 70 }, { op: "L", x: 70, y: 30 }, { op: "Z" }
  ];
  assert.deepEqual(p.graphicSpec.objects["geo-shape"].items[0].properties.commands, commands);
  const primitive = chart().createCanvas({ width: 100, height: 100, margin: 0 }).createGraphics({ id: "path", type: "path" })
    .editGraphics({ target: "path", property: "maxCommands", value: 10 }).editGraphics({ target: "path", property: "commands", value: commands })
    .editGraphics({ target: "path", property: "stroke", value: "#1f2937" }).editGraphics({ target: "path", property: "strokeWidth", value: 0 })
    .editGraphics({ target: "path", property: "fill", value: "red" }).editGraphics({ target: "path", property: "fillRule", value: "evenodd" });
  const graphic = deserializeGraphic(serializeGraphic(p)), expected = pixels(primitive);
  assert.deepEqual(pixels(p), expected); assert.deepEqual(pixels(graphic), expected);
  assert.deepEqual([...expected.slice((20 * 100 + 20) * 4, (20 * 100 + 20) * 4 + 4)], [255, 0, 0, 255]);
  assert.deepEqual([...expected.slice((50 * 100 + 50) * 4, (50 * 100 + 50) * 4 + 4)], [255, 255, 255, 255]);
  const png = await renderToPNGBuffer(p), restored = await renderToPNGBuffer(graphic), literal = await renderToPNGBuffer(primitive);
  assert.deepEqual(png.buffer, restored.buffer); assert.deepEqual(png.buffer, literal.buffer);
  const svg = renderToSVG(p); assert.equal(svg, renderToSVG(graphic));
  const svgCanvas = createCanvas(100, 100), svgContext = svgCanvas.getContext("2d"); svgContext.drawImage(await loadImage(Buffer.from(svg)), 0, 0);
  const literalSVG = createCanvas(100, 100), literalContext = literalSVG.getContext("2d");
  literalContext.drawImage(await loadImage(Buffer.from(renderToSVG(primitive))), 0, 0);
  assert.deepEqual(Buffer.from(svgContext.getImageData(0, 0, 100, 100).data), Buffer.from(literalContext.getImageData(0, 0, 100, 100).data));
  const pdf = await renderToPDFBuffer(p), primitivePDF = await renderToPDFBuffer(primitive);
  assert.deepEqual(streams(pdf.buffer), streams(primitivePDF.buffer)); assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image/);
  const scene = createTransitionScene(graphic, { format: "canvas" }), canvas = createCanvas(1, 1), context = canvas.getContext("2d");
  assert.equal(scene.nodes.find(node => node.type === "path").properties.maxCommands, 10);
  renderTransitionScene(scene, context); assert.deepEqual(context.getImageData(0, 0, 100, 100).data, expected);
});

test("weighted sources keep independent path capacity and the same pixels in four backends", async () => {
  const properties = { commands: [{ op: "M", x: 10, y: 10 }, { op: "L", x: 90, y: 10 }, { op: "L", x: 90, y: 90 }, { op: "Z" }], maxCommands: 4, fill: "red" };
  const sources = ["red", "blue"].map(fill => ({ type: "path", weight: .5, properties: { ...properties, fill }, offset: [0, 0], clip: { x: 0, y: 0, width: 100, height: 100 }, clips: [] }));
  const p = chart().createCanvas({ width: 100, height: 100, margin: 0 }).createGraphics({ id: "blend", type: "weighted-blend" })
    .editGraphics({ target: "blend", property: "sources", value: sources });
  const q = deserializeGraphic(serializeGraphic(p)), before = serializeGraphic(p);
  assert.deepEqual(resolvePrimitiveGraphicBounds("weighted-blend", p.graphicSpec.objects.blend.properties), { left: 10, right: 90, top: 10, bottom: 90 });
  assert.deepEqual(pixels(q), pixels(p)); assert.equal(renderToSVG(q), renderToSVG(p));
  assert.deepEqual((await renderToPNGBuffer(q)).buffer, (await renderToPNGBuffer(p)).buffer);
  assert.deepEqual(streams((await renderToPDFBuffer(q)).buffer), streams((await renderToPDFBuffer(p)).buffer));
  const forged = structuredClone(sources); forged[0].properties.maxCommands = 3;
  assert.throws(() => p.editGraphics({ target: "blend", property: "sources", value: forged }), /must not exceed 3/);
  assert.equal(serializeGraphic(p), before);
});
