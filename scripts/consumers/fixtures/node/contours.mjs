import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { getMarkItems, inspectProgram } from "ggaction/inspection";
import { exportAccessibleData } from "ggaction/accessibility";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
const grid = { origin: [0, 0], dx: 1, dy: 1, width: 3, height: 3, values: [0, 0, 0, 0, 2, 0, 0, 0, 0] };
function program(mode = "filled") {
  return chart().createCanvas({ width: 260, height: 200, margin: 20 })
    .createData({ id: "samples", values: [{ id: "center", x: 1, y: 1, weight: 2 }], keyField: "id" })
    .createDensityContourData({ id: "density", data: "samples", x: "x", y: "y", weight: "weight",
      grid: { origin: [0, 0], dx: 1, dy: 1, width: 3, height: 3 }, estimator: "histogram", normalization: "count", thresholds: [0, 1, 2] })
    .createContourMark({ mode });
}
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "contour/full-basic-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    for (const name of ["createContourData", "createDensityContourData", "editContourData", "createContourMark", "editContourMark"]) {
      assert.equal(typeof chart()[name], "function"); assert.equal(basicChart()[name], undefined);
    }
    const p = program(), saved = serializeProgram(p);
    const q = p.createContourData({ id: "inline", grid, thresholds: [0, 1, 2] })
      .editContourData({ target: "inline", thresholds: [.5, 1, 2] })
      .editContourMark({ geometry: "inline", color: false, fill: "purple", opacity: 0 });
    assert.equal(q.semanticSpec.resources.find(r => r.id === "inline").revision, 1);
    assert.equal(getMarkItems(q, { target: "contour" }).length, 2);
    assert.deepEqual(inspectProgram(q).views.find(view => view.owner.id === "contour").sourceRefs.map(ref => ref.kind), ["geometry"]);
    assert.equal(exportAccessibleData(q, { target: "contour" }).views[0].rows.length, 2);
    assert.throws(() => q.removeResource({ kind: "geometry", id: "inline", cascade: true }), /mark|referenc|consum/i);
    const removed = q.removeMark({ target: "contour" }).removeResource({ kind: "geometry", id: "inline" }).removeResource({ kind: "geometry", id: "density" });
    assert.deepEqual(removed.semanticSpec.resources, []); assert.equal(serializeProgram(p), saved);
  } },
  { id: "contour/fresh-process-source-revision", run() {
    const p = program(), saved = serializeProgram(p);
    const script = `import { readFileSync } from 'node:fs'; import { deserializeProgram, serializeProgram } from 'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('No network');};
      const p=deserializeProgram(readFileSync(0,'utf8'));const q=p.reviseData({source:'samples',id:'next',values:[{id:'center',x:1,y:1,weight:4}]});
      process.stdout.write(serializeProgram(q));`;
    const result = execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30_000 });
    const q = deserializeProgram(result), resource = q.semanticSpec.resources.find(r => r.id === "density");
    assert.equal(resource.revision, 1); assert.equal(resource.result.contours.grid.values[4], 4);
    assert.equal(resource.inputs[0].id, "next");
    assert.equal(serializeProgram(p), saved); assert.equal(serializeProgram(q), result);
    assert.throws(() => p.reviseData({ source: "samples", id: "bad", values: [{ id: "center", x: 1, y: 1, weight: -1 }] }));
  } },
  { id: "contour/renderers-scene-codec", async run() {
    for (const mode of ["line", "filled"]) {
      const p = program(mode), graphic = deserializeGraphic(serializeGraphic(p));
      assert.equal(graphic.semanticSpec, undefined); assert.equal(renderToSVG(graphic), renderToSVG(p));
      const png = await renderToPNGBuffer(p), restoredPNG = await renderToPNGBuffer(graphic);
      assert.deepEqual(restoredPNG.buffer, png.buffer);
      const canvas = createCanvas(1, 1), ctx = canvas.getContext("2d"); render(graphic, ctx);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const decoded = createCanvas(png.width, png.height); decoded.getContext("2d").drawImage(await loadImage(png.buffer), 0, 0);
      assert.deepEqual(decoded.getContext("2d").getImageData(0, 0, png.width, png.height).data, pixels);
      const pdf = await renderToPDFBuffer(p), restoredPDF = await renderToPDFBuffer(graphic);
      assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(restoredPDF.buffer));
      assert.deepEqual([pdf.width, pdf.height, pdf.pages], [260, 200, 1]);
      const scene = createTransitionScene(p, { format: "canvas" });
      assert.deepEqual(createTransitionScene(graphic, { format: "canvas" }), scene);
      const sceneCanvas = createCanvas(1, 1), sceneContext = sceneCanvas.getContext("2d"); renderTransitionScene(scene, sceneContext);
      assert.deepEqual(sceneContext.getImageData(0, 0, sceneCanvas.width, sceneCanvas.height).data, pixels);
      const changed = p.editContourMark({ x: { reverse: true } });
      assert.deepEqual(createTransitionScene(changed, { format: "canvas" }).nodes.map(node => node.key), scene.nodes.map(node => node.key));
    }
  } }
];
