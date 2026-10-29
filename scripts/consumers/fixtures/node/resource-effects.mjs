import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, prepareImageResource, prepareImageRendering, prepareShadowRendering, render } from "ggaction";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
const shadow = { color: "#0008", offsetX: 2, offsetY: 2, blurRadius: 0 }, outline = { color: "white", width: 4 };
const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
function resourcePlot(kind) {
  let p = chart().createCanvas({ width: 160, height: 120, margin: 0 }).createData({ id: "rows", keyField: "id", values: [{ id: "a", parent: null, value: 2 }, { id: "b", parent: "a", value: 1 }] });
  if (["graph", "flow-node", "flow-link"].includes(kind)) {
    p = p.createData({ id: "edges", values: [{ from: "a", to: "b", value: 1 }] });
    if (kind === "graph") return p.createGraphData({ id: "graph", nodes: "rows", edges: "edges", nodeKey: "id", source: "from", target: "to" })
      .layoutGraph({ id: "layout", method: "circular", options: { radius: 25 } }).createGraphPlot({ id: "plot", nodes: { outline, shadow }, edges: { shadow } });
    p = p.createFlowData({ id: "flow", nodes: "rows", edges: "edges", nodeKey: "id", source: "from", target: "to", value: "value" }).layoutFlow({ id: "layout", method: "dag" });
    return kind === "flow-node" ? p.createFlowNodes({ id: "plot", nodes: { outline, shadow } }) : p.createFlowLinks({ id: "plot", links: { outline, shadow } });
  }
  p = p.createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "value" }).layoutHierarchy({ id: "layout", method: kind,
    ...(kind === "partition" ? {} : { options: kind === "tree" ? { nodeSize: [10, 10], siblingGap: 15, depthGap: 25, orientation: "vertical" } : { size: [140, 100], padding: 5, method: "slice-dice" } }) });
  return p[{ tree: "createTreePlot", treemap: "createTreemapPlot", partition: "createPartitionPlot" }[kind]]({ id: "plot", [kind === "tree" ? "nodes" : "cells"]: { outline, shadow } });
}
export const cases = [
  { id: "paint/resource-role-effects", async run() {
    for (const kind of ["tree", "treemap", "partition", "graph", "flow-node", "flow-link"]) {
      const p = resourcePlot(kind), restored = deserializeProgram(serializeProgram(p));
      const shadows = await prepareShadowRendering(restored, { createCanvas, decode });
      try {
        const canvas = createCanvas(1, 1); render(restored, canvas.getContext("2d"), { shadows });
        assert.deepEqual(canvas.toBuffer("image/png"), (await renderToPNGBuffer(p)).buffer);
        assert.match(renderToSVG(restored, { shadows }), /data:image\/png;base64/);
        assert.equal((await renderToPDFBuffer(restored)).buffer.subarray(0, 4).toString(), "%PDF");
      } finally { shadows.dispose(); }
    }
  } },
  { id: "paint/image-alpha-shadow", async run() {
    const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="5" fill="red"/></svg>');
    let p = chart().createCanvas({ width: 80, height: 60, margin: 0 });
    const prepared = await prepareImageResource(p, { kind: "create", id: "image", uri: "fixture:alpha", mimeType: "image/svg+xml", expectedHash: createHash("sha256").update(bytes).digest("hex") },
      { requestToken: "image", load: () => ({ bytes, mimeType: "image/svg+xml" }), decode: () => ({ width: 20, height: 20, originClean: true }) });
    p = p.createImageResource({ prepared, requestToken: "image" }).createImageMark({ viewport: { x: 10, y: 10, width: 20, height: 20 }, shadow });
    const restored = deserializeProgram(serializeProgram(p)), images = await prepareImageRendering(restored, { decode }), shadows = await prepareShadowRendering(restored, { createCanvas, decode });
    try { const canvas = createCanvas(1, 1); render(restored, canvas.getContext("2d"), { images, shadows }); assert.deepEqual(canvas.toBuffer("image/png"), (await renderToPNGBuffer(p)).buffer); }
    finally { shadows.dispose(); }
    assert.equal(restored.editImageMark({ shadow: false }).graphicSpec.objects.image.items[0].properties.shadow, undefined);
  } }
];
