import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { inspectProgram, getMarkItems, comparePrograms } from "ggaction/inspection";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

const values = [{ id: "root", parent: null, value: 10 }, { id: "a", parent: "root", value: 6 }, { id: "b", parent: "root", value: 4 }];
function program(method = "tree") {
  const p = chart().createCanvas({ width: 260, height: 200, margin: 20 }).createData({ id: "rows", values, keyField: "id" })
    .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", method, options: method === "tree" ?
      { nodeSize: [24, 10], siblingGap: 30, depthGap: 40, orientation: "vertical" } :
      { size: [200, 140], padding: 10, method: "squarify" } });
  return method === "tree" ? p.createTreePlot({ id: "plot", labels: {} }) : p.createTreemapPlot({ id: "plot", labels: {} });
}
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "hierarchy/full-basic-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    for (const name of ["createHierarchyData", "editHierarchyData", "layoutHierarchy", "editLayout", "removeResource", "createTreePlot", "editTreePlot", "createTreemapPlot", "editTreemapPlot"]) {
      assert.equal(typeof chart()[name], "function"); assert.equal(basicChart()[name], undefined);
    }
    const p = program(), before = serializeProgram(p);
    const q = p.editHierarchyData({ target: "h", valueMode: "inclusive" }).editLayout({ options: { orientation: "horizontal" } })
      .editTreePlot({ nodes: { radius: 9 }, labels: { overrides: [{ key: "a", text: "Branch A" }] } });
    assert.equal(q.semanticSpec.resources.find(r => r.id === "layout").revision, 2);
    assert.deepEqual(getMarkItems(q, { target: "plot" }).map(item => item.fields.value), [10, 6, 4]);
    assert.deepEqual(inspectProgram(q).views[0].sourceRefs.map(ref => ref.kind), ["layout", "hierarchy", "data"]);
    assert.ok(comparePrograms(p, q).changes.some(change => change.resource.kind === "layout"));
    assert.throws(() => q.removeResource({ kind: "layout", id: "layout", cascade: true }), /referenc|consum|use/i);
    const removed = q.removeMark({ target: "plot" }).removeResource({ kind: "layout", id: "layout" }).removeResource({ kind: "hierarchy", id: "h" });
    assert.deepEqual(removed.semanticSpec.resources, []); assert.equal(serializeProgram(p), before);
    const map = program("treemap").editTreemapPlot({ cells: { opacity: .8 } });
    assert.equal(map.graphicSpec.objects.plot.items[0].properties.opacity, .8);
  } },
  { id: "hierarchy/fresh-process-edit-revise", run() {
    const p = program(), saved = serializeProgram(p);
    const script = `
      import { readFileSync } from "node:fs";
      import { serializeProgram, deserializeProgram } from "ggaction/persistence";
      globalThis.fetch = () => { throw new Error("No network"); };
      const restored = deserializeProgram(readFileSync(0,"utf8"));
      const edited = restored.editLayout({ target:"layout", options:{siblingGap:40} });
      const revised = edited.reviseData({ source:"rows", id:"next", values:[{id:"root",parent:null,value:7},{id:"a",parent:"root",value:7}] });
      process.stdout.write(serializeProgram(revised));
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30_000 });
    const q = deserializeProgram(output);
    assert.deepEqual(getMarkItems(q, { target: "plot" }).map(item => item.fields.value), [7, 7]);
    assert.equal(q.semanticSpec.resources[0].inputs[0].id, "next");
    assert.equal(q.semanticSpec.resources[1].revision, 2);
    assert.equal(serializeProgram(q), output); assert.equal(serializeProgram(p), saved);
  } },
  { id: "hierarchy/renderers-and-scene", async run() {
    for (const method of ["tree", "treemap"]) {
      const p = program(method), graphic = deserializeGraphic(serializeGraphic(p));
      assert.equal(graphic.semanticSpec, undefined); assert.equal(renderToSVG(graphic), renderToSVG(p));
      const png = await renderToPNGBuffer(p), restoredPNG = await renderToPNGBuffer(graphic);
      assert.deepEqual(restoredPNG.buffer, png.buffer);
      const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(graphic, context);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const image = await loadImage(png.buffer), decoded = createCanvas(png.width, png.height);
      decoded.getContext("2d").drawImage(image, 0, 0);
      assert.deepEqual(decoded.getContext("2d").getImageData(0, 0, png.width, png.height).data, pixels);
      const pdf = await renderToPDFBuffer(p), restoredPDF = await renderToPDFBuffer(graphic);
      assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(restoredPDF.buffer));
      assert.deepEqual([pdf.width, pdf.height, pdf.pages], [260, 200, 1]);
      const scene = createTransitionScene(p, { format: "canvas" });
      assert.deepEqual(createTransitionScene(graphic, { format: "canvas" }), scene);
      const sceneCanvas = createCanvas(1, 1), sceneContext = sceneCanvas.getContext("2d"); renderTransitionScene(scene, sceneContext);
      assert.deepEqual(sceneContext.getImageData(0, 0, sceneCanvas.width, sceneCanvas.height).data, pixels);
      const shifted = p.editLayout({ options: method === "tree" ? { orientation: "horizontal" } : { method: "slice-dice" } });
      assert.deepEqual(createTransitionScene(shifted, { format: "canvas" }).nodes.map(node => node.key), scene.nodes.map(node => node.key));
    }
  } }
];
