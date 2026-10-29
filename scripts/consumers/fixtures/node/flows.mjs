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
const edges = [{ id: "ab", from: "a", to: "b", value: 3 }, { id: "ac", from: "a", to: "c", value: 1 }];
function program(method = "dag") {
  return chart().createCanvas({ width: 260, height: 200, margin: 20 })
    .createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }, { id: "c" }], keyField: "id" })
    .createData({ id: "edges", values: method === "cyclic" ? [...edges, { id: "ba", from: "b", to: "a", value: 1 }] : edges, keyField: "id" })
    .createFlowData({ id: "flow", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", edgeKey: "id", value: "value" })
    .layoutFlow({ id: "layout", method, options: { iterations: 2 } })
    .createFlowLinks().createFlowNodes({ labels: { content: "value" } });
}
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "flow/full-basic-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    for (const name of ["createFlowData", "editFlowData", "layoutFlow", "createFlowNodes", "editFlowNodes", "createFlowLinks", "editFlowLinks"]) {
      assert.equal(typeof chart()[name], "function"); assert.equal(basicChart()[name], undefined);
    }
    const p = program(), saved = serializeProgram(p);
    const highlighted = p.highlightMarks({ target: "flowNodes", select: { field: "value", op: "gt", value: 0 }, stroke: "red", strokeWidth: 3 });
    assert.ok(highlighted.graphicSpec.objects.flowNodes.items.filter(item => item.identity.role === "body")
      .every(item => item.properties.stroke === "red"));
    assert.ok(highlighted.graphicSpec.objects.flowNodes.items.filter(item => item.identity.role === "label")
      .every(item => !Object.hasOwn(item.properties, "stroke") && !Object.hasOwn(item.properties, "strokeWidth")));
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(highlighted))), renderToSVG(highlighted));
    const q = p.editFlowNodes({ labels: false, nodes: { opacity: 0 } })
      .editFlowLinks({ links: { overrides: [{ key: "ac", fill: "red" }] } })
      .editFlowData({ definition: { balance: "strict" } }).editLayout({ options: { orientation: "vertical" } });
    assert.equal(q.semanticSpec.resources.find(r => r.kind === "layout").revision, 2);
    assert.deepEqual(getMarkItems(q, { target: "flowLinks" }).map(item => item.fields.value), [3, 1]);
    assert.deepEqual(inspectProgram(q).views.find(view => view.owner.id === "flowNodes").sourceRefs.map(ref => ref.kind), ["layout", "graph", "data"]);
    assert.equal(exportAccessibleData(q, { target: "flowLinks" }).views[0].rows.length, 2);
    assert.throws(() => q.removeResource({ kind: "layout", id: "layout", cascade: true }), /mark|referenc|consum/i);
    const removed = q.removeMark({ target: "flowLinks" }).removeMark({ target: "flowNodes" })
      .removeResource({ kind: "layout", id: "layout" }).removeResource({ kind: "graph", id: "flow" });
    assert.deepEqual(removed.semanticSpec.resources, []); assert.equal(serializeProgram(p), saved);
  } },
  { id: "flow/fresh-process-source-revision", run() {
    const p = program(), saved = serializeProgram(p);
    const script = `import { readFileSync } from 'node:fs'; import { deserializeProgram, serializeProgram } from 'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('No network');};
      const p=deserializeProgram(readFileSync(0,'utf8'));const q=p.reviseData({source:'edges',id:'next',values:[{id:'ab',from:'a',to:'b',value:5},{id:'ac',from:'a',to:'c',value:2}]});
      process.stdout.write(serializeProgram(q));`;
    const result = execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30_000 });
    const q = deserializeProgram(result);
    assert.deepEqual(getMarkItems(q, { target: "flowLinks" }).map(item => item.fields.value), [5, 2]);
    assert.equal(q.semanticSpec.resources.find(r => r.kind === "layout").revision, 1);
    assert.equal(serializeProgram(p), saved); assert.equal(serializeProgram(q), result);
    assert.throws(() => p.reviseData({ source: "edges", id: "bad", values: [{ id: "ab", from: "a", to: "b", value: -1 }] }));
  } },
  { id: "flow/renderers-scene-codec", async run() {
    for (const method of ["dag", "cyclic"]) {
      const p = program(method), graphic = deserializeGraphic(serializeGraphic(p));
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
      const changed = p.editLayout({ options: { orientation: "vertical" } });
      assert.deepEqual(createTransitionScene(changed, { format: "canvas" }).nodes.map(node => node.key), scene.nodes.map(node => node.key));
    }
  } }
];
