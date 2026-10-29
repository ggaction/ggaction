import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render, prepareShadowRendering } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { getMarkItems, inspectProgram } from "ggaction/inspection";
import { exportAccessibleData } from "ggaction/accessibility";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
const rows = [{ id: "a", day: "2024-02-28", value: 0 }, { id: "b", day: "2024-02-29", value: 3 }, { id: "c", day: "2024-02-29", value: 4 }];
function program(missing = "empty") {
  return chart().createCanvas({ width: 400, height: 220, margin: 20 }).createData({ id: "days", values: rows, keyField: "id" })
    .createCalendarLayout({ id: "layout", date: "day", value: "value", start: "2024-02-01", end: "2024-02-29", timeZone: "UTC", weekStartsOn: 1, aggregate: "sum", missing })
    .createCalendarPlot({ color: false, labels: { week: false } });
}
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "calendar/full-basic-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    for (const name of ["createCalendarLayout", "createCalendarPlot", "editCalendarPlot"]) {
      assert.equal(typeof chart()[name], "function"); assert.equal(basicChart()[name], undefined);
    }
    const p = program(), saved = serializeProgram(p), items = getMarkItems(p, { target: "calendar" });
    assert.equal(items.length, 29); assert.equal(items[0].fields.empty, true); assert.equal(items.at(-1).fields.value, 7);
    const q = p.editLayout({ options: { missing: "omit", aggregate: "mean" } })
      .editCalendarPlot({ cells: { opacity: 0 }, monthBoundary: false, labels: false });
    assert.equal(getMarkItems(q, { target: "calendar" }).length, 2);
    assert.equal(getMarkItems(q, { target: "calendar" }).at(-1).fields.value, 3.5);
    assert.deepEqual(inspectProgram(q).views.find(view => view.owner.id === "calendar").sourceRefs.map(ref => ref.kind), ["layout"]);
    assert.equal(exportAccessibleData(q, { target: "calendar" }).views[0].rows.length, 2);
    assert.throws(() => q.removeResource({ kind: "layout", id: "layout", cascade: true }), /mark|referenc|consum/i);
    const removed = q.removeMark({ target: "calendar" }).removeResource({ kind: "layout", id: "layout" });
    assert.deepEqual(removed.semanticSpec.resources, []); assert.equal(serializeProgram(p), saved);
  } },
  { id: "calendar/fresh-process-source-revision", run() {
    const p = program(), saved = serializeProgram(p), keys = getMarkItems(p, { target: "calendar" }).map(item => item.key);
    const script = `import { readFileSync } from 'node:fs'; import { deserializeProgram, serializeProgram } from 'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('No network');};
      const p=deserializeProgram(readFileSync(0,'utf8'));const q=p.reviseData({source:'days',id:'next',values:[{id:'b',day:'2024-02-29',value:9}]});
      process.stdout.write(serializeProgram(q));`;
    const result = execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30_000 });
    const q = deserializeProgram(result), resource = q.semanticSpec.resources.find(r => r.id === "layout");
    assert.equal(resource.revision, 1); assert.equal(resource.result.cells.at(-1).value, 9); assert.equal(resource.inputs[0].id, "next");
    assert.deepEqual(getMarkItems(q, { target: "calendar" }).map(item => item.key), keys);
    assert.equal(serializeProgram(p), saved); assert.equal(serializeProgram(q), result);
    assert.throws(() => p.reviseData({ source: "days", id: "bad", values: [{ id: "a", day: "2024-03-01", value: 1 }] }));
  } },
  { id: "calendar/shared-resource-source-union", run() {
    const p = program().editCalendarPlot({ color: { id: "shared" } }).applyTheme({ theme: "dark" })
      .createDensityContourData({ id: "density", data: "days", x: "value", y: "value", weight: "value",
        grid: { origin: [0, 0], dx: 2, dy: 2, width: 4, height: 4 }, estimator: "histogram", normalization: "count", thresholds: [0, 1, 2, 4] })
      .createContourMark({ color: { id: "shared" } })
      .createInferredGraphData({ id: "graph", data: "days", nodeKey: "id", ruleId: "sequence", rule: "sequence", options: { orderField: "value" } })
      .layoutGraph({ id: "graphLayout", method: "circular" }).createGraphPlot()
      .filterMarks({ target: "graphPlot", field: "key", op: "neq", value: "b", recompute: true });
    const saved = serializeProgram(p), q = p.reviseData({ source: "days", id: "next", values: rows.map((row, i) => ({ ...row, value: i + 5 })) });
    const walk = node => [node, ...(node.children ?? []).flatMap(walk)], trace = walk(q.trace.children.at(-1));
    for (const op of ["materializeCalendarPlot", "materializeContourMark", "materializeGraphPlot"]) assert.equal(trace.filter(node => node.op === op).length, 1, op);
    assert.equal(trace.filter(node => node.op === "rematerializeScale" && node.args.id === "shared").length, 1);
    assert.equal(getMarkItems(q, { target: "calendar" }).at(-1).fields.value, 13);
    assert.equal(q.markConfigs.calendar.calendarPlot.cells.emptyFill, "#0f172a");
    assert.deepEqual(getMarkItems(q, { target: "graphPlot" }).filter(item => item.fields.kind === "node").map(item => item.fields.key), ["a", "c"]);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
    assert.equal(serializeProgram(p), saved);
  } },
  { id: "calendar/renderers-scene-codec", async run() {
    for (const missing of ["empty", "omit"]) {
      const p = program(missing).editCalendarPlot({ cells: { outline: { color: "white", width: 1 }, shadow: { color: "#1238", offsetX: 1 } } });
      const graphic = deserializeGraphic(serializeGraphic(p));
      const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
      const shadows = await prepareShadowRendering(p, { createCanvas, decode }), graphicShadows = await prepareShadowRendering(graphic, { createCanvas, decode });
      assert.equal(graphic.semanticSpec, undefined); assert.equal(renderToSVG(graphic, { shadows: graphicShadows }), renderToSVG(p, { shadows }));
      const png = await renderToPNGBuffer(p), restoredPNG = await renderToPNGBuffer(graphic); assert.deepEqual(restoredPNG.buffer, png.buffer);
      const canvas = createCanvas(1, 1), ctx = canvas.getContext("2d"); render(graphic, ctx, { shadows: graphicShadows });
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const decoded = createCanvas(png.width, png.height); decoded.getContext("2d").drawImage(await loadImage(png.buffer), 0, 0);
      assert.deepEqual(decoded.getContext("2d").getImageData(0, 0, png.width, png.height).data, pixels);
      const pdf = await renderToPDFBuffer(p), restoredPDF = await renderToPDFBuffer(graphic); assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(restoredPDF.buffer));
      assert.deepEqual([pdf.width, pdf.height, pdf.pages], [400, 220, 1]);
      const scene = createTransitionScene(p, { format: "canvas" }); assert.deepEqual(createTransitionScene(graphic, { format: "canvas" }), scene);
      const sceneShadows = await prepareShadowRendering(scene, { createCanvas, decode });
      const sceneCanvas = createCanvas(1, 1), sceneContext = sceneCanvas.getContext("2d"); renderTransitionScene(scene, sceneContext, { shadows: sceneShadows });
      assert.deepEqual(sceneContext.getImageData(0, 0, sceneCanvas.width, sceneCanvas.height).data, pixels);
      assert.deepEqual(createTransitionScene(p.editCalendarPlot({ cells: { gap: .25 } }), { format: "canvas" }).nodes.map(node => node.key), scene.nodes.map(node => node.key));
      sceneShadows.dispose(); graphicShadows.dispose(); shadows.dispose();
    }
  } }
];
