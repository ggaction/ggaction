import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { inspectProgram, getMarkItems } from "ggaction/inspection";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createNestedResponsive, nestedRows } from "./nested-responsive-public.js";
export const cases = [
  { id: "nested/shared-layout-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    const program = createNestedResponsive(), saved = serializeProgram(program), panels = program.children.panels;
    for (const child of Object.values(panels.children)) assert.deepEqual(child.resolvedScales.y.domain, [0,20]);
    const path = { childPath: ["panels"], facetSource: true };
    const resized = program.editCanvas({ target: path, width: 420 });
    assert.equal(resized.children.overview, program.children.overview);
    const changed = program.reviseData({ target: { childPath: ["panels"] }, source: "rows", id: "changed", values: nestedRows.map(row => ({ ...row, value: row.value * 2 })) });
    for (const child of Object.values(changed.children.panels.children)) assert.deepEqual(child.resolvedScales.y.domain, [0,40]);
    assert.ok(inspectProgram(changed).layouts.length > 0);
    assert.equal(getMarkItems(changed, { target: { childPath: ["panels", panels.compositionSpec.children[0]], id: "bars" } }).length, 4);
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
    assert.throws(() => program.editCanvas({ target: path, width: 100 }), /unsatisfied/);
    assert.equal(serializeProgram(program), saved);
  } },
  { id: "nested/projected-graph-source", run() {
    const source = chart().createCanvas().createData({ id: "rows", values: [{ id: "a", x: 1, y: 1, g: "a" }, { id: "b", x: 2, y: 2, g: "b" }] })
      .createInferredGraphData({ id: "network", data: "rows", nodeKey: "id", ruleId: "seq", rule: "sequence", options: { orderField: "x" } })
      .layoutGraph({ id: "layout", method: "circular" })
      .createPointMark({ id: "points", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "y" });
    const panels = source.facet({ field: "g" });
    for (const child of Object.values(panels.children)) {
      const graph = child.semanticSpec.resources.find(resource => resource.kind === "graph");
      const dataset = child.semanticSpec.datasets.find(dataset => dataset.id === graph.inputs[0].id);
      assert.equal(graph.inputs[0].logicalId, dataset.logicalId);
      assert.equal(graph.result.model.nodes.length, 1);
      assert.equal(graph.revision, 1);
    }
    assert.deepEqual(deserializeProgram(serializeProgram(panels)).graphicSpec, panels.graphicSpec);
    assert.equal(source.semanticSpec.resources.find(resource => resource.kind === "graph").revision, 0);
  } },
  { id: "nested/renderers-scene-codec", async run() {
    const program = deserializeProgram(serializeProgram(createNestedResponsive()));
    const canvas = createCanvas(1, 1); render(program, canvas.getContext("2d"));
    const png = (await renderToPNGBuffer(program)).buffer; assert.deepEqual(canvas.toBuffer("image/png"), png);
    assert.match(renderToSVG(program), /Regional detail/);
    const scene = createTransitionScene(deserializeGraphic(serializeGraphic(program)), { format: "canvas" });
    renderTransitionScene(scene, canvas.getContext("2d")); assert.deepEqual(canvas.toBuffer("image/png"), png);
    assert.match((await renderToPDFBuffer(program)).buffer.toString("latin1"), /%PDF/);
  } }
];
