import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

export const cases = [{ id: "theme/resource-plot-renderer-lifecycle", async run() {
  assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
  for (const kind of ["graph", "tree", "treemap"]) {
    let base = chart().createCanvas({ width: 240, height: 160, margin: 0 })
      .createData({ id: "nodes", keyField: "id", values: [{ id: "a", parent: null, value: 2 }, { id: "b", parent: "a", value: 1 }] });
    base = kind === "graph" ? base.createData({ id: "edges", values: [{ from: "a", to: "b" }] })
      .createGraphData({ id: "source", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to" })
      .layoutGraph({ id: "layout", method: "force", options: { seed: 7, iterations: 2 } })
      .createGraphPlot({ id: "plot", labels: {} }) : base
      .createHierarchyData({ id: "source", key: "id", parent: "parent", value: "value" })
      .layoutHierarchy({ id: "layout", method: kind, options: kind === "tree"
        ? { nodeSize: [20, 20], siblingGap: 30, depthGap: 40, orientation: "vertical" }
        : { size: [180, 100], padding: 5, method: "slice-dice" } })
      [kind === "tree" ? "createTreePlot" : "createTreemapPlot"]({ id: "plot", labels: {} });
    const themed = base.applyTheme({ theme: { base: "dark", tokens: { fontSize: 17, fontWeight: 700 } } });
    assert.equal(themed.semanticSpec.resources, base.semanticSpec.resources);
    assert.ok(themed.graphicSpec.objects.plot.items.filter(item => item.type === "text")
      .every(item => item.properties.fontSize === 17 && item.properties.fontWeight === 700));
    assert.deepEqual(themed.removeTheme().graphicSpec, base.graphicSpec);
    const restored = deserializeProgram(serializeProgram(themed));
    assert.deepEqual(restored.graphicSpec, themed.graphicSpec);
    assert.match(renderToSVG(restored), /#60a5fa/);
    const canvas = createCanvas(1, 1);
    render(restored, canvas.getContext("2d"));
    const png = (await renderToPNGBuffer(restored)).buffer;
    assert.deepEqual(canvas.toBuffer("image/png"), png);
    const scene = createTransitionScene(deserializeGraphic(serializeGraphic(restored)), { format: "canvas" });
    renderTransitionScene(scene, canvas.getContext("2d"));
    assert.deepEqual(canvas.toBuffer("image/png"), png);
    assert.match((await renderToPDFBuffer(restored)).buffer.toString("latin1"), /%PDF/);
  }
} }];
