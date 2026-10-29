import { createWaterfall } from "../../examples/waterfall/program.js";
import { prepareFontResource, prepareTextMetrics } from "../../src/index.js";
import { fonts } from "../../examples/font-assets/fonts/manifest.js";
import { loadFont, decodeFont, measureFont } from "../../examples/font-assets/host.js";
import { createTree } from "../../examples/tree-layouts/program.js";
import { createTreemap } from "../../examples/treemap-layouts/program.js";
import { createPartition } from "../../examples/partition-layouts/program.js";
import { createGraph } from "../../examples/graph-plots/program.js";
import { createFlow } from "../../examples/flow-layouts/program.js";
import { createImageExample } from "../../examples/image-assets/program.js";

import { createPyramid } from "../../examples/pyramid/program.js";

import { createOHLC } from "../../examples/ohlc/program.js";

export const effectConsumers = ["tree", "treemap", "icicle", "sunburst", "graph", "flow-node", "flow-link", "image", "pyramid", "ohlc", "waterfall"];
export async function resourceEffectPair(name) {
  const entry = {
    tree: [createTree, "tree", "editTreePlot", "nodes"], treemap: [createTreemap, "treemap", "editTreemapPlot", "cells"],
    icicle: [() => createPartition("icicle"), "partition", "editPartitionPlot", "cells"],
    sunburst: [() => createPartition("sunburst"), "partition", "editPartitionPlot", "cells"],
    graph: [createGraph, "graph", "editGraphPlot", "nodes"],
    "flow-node": [createFlow, "flow-node", "editFlowNodes", "nodes"],
    "flow-link": [createFlow, "flow-link", "editFlowLinks", "links"],
    waterfall: [createWaterfall, "waterfall", "editWaterfallPlot", "bars"],
    ohlc: [createOHLC, "ohlc", "editOHLCPlot", "body"],
    pyramid: [createPyramid, "pyramid", "editPyramidPlot", "stages"],
    image: [createImageExample, "image", "editImageMark", null]
  }[name];
  const [create, kind, edit, role] = entry;
  let base = create();
  const id = base.semanticSpec.layers.find(layer => layer.mark.type === kind).id;
  const shadow = { color: "#172554aa", offsetX: 4, offsetY: 3, blurRadius: ["tree", "graph"].includes(name) ? 2 : 0 }, outline = { color: "#ffffff", width: 5 };
  const labels = name !== "image" && name !== "flow-link";
  if (labels) {
    const font = fonts[0], requestToken = "resource-effect-font";
    if (base.semanticSpec.title.text !== undefined) base = base.editTitle({ titleStyle: { fontFamily: font.family, fontWeight: 400 }, subtitleStyle: { fontFamily: font.family, fontWeight: 400 } });
    base = base[edit]({ target: id, labels: { fontFamily: font.family, fontWeight: 400, fill: "#0f172a" } });
    const prepared = await prepareFontResource(base, { kind: "create", id: "effect-font", uri: new URL(`../../examples/font-assets/fonts/${font.file}`, import.meta.url).href,
      mimeType: font.mimeType, expectedHash: font.sha256, family: font.family, style: "normal", weight: 400, metricsProviderVersion: "example-canvas@1" },
      { requestToken, load: loadFont, decode: decodeFont });
    base = base.createFontResource({ prepared, requestToken });
    const metrics = await prepareTextMetrics(base, { id: "effect-metrics", fonts: ["effect-font"] }, { requestToken, decode: decodeFont, measure: measureFont });
    base = base.applyTextMetrics({ prepared: metrics, requestToken });
  }
  const effectOptions = { target: id, ...(name === "image" ? { shadow } : { [role]: { outline, shadow } }),
    ...(labels ? { labels: { outline, shadow } } : {}), ...(name === "ohlc" ? { stem: { outline, shadow } } : name === "waterfall" ? { connectors: { outline, shadow } } : {}) };
  const publicProgram = base[edit](effectOptions);
  const primitive = base.editGraphics({ target: id, property: "items", value: base.graphicSpec.objects[id].items.map(({ id: _id, ...child }) => {
    const applies = name === "graph" ? ["circle", "text"].includes(child.type) : child.identity?.role !== "link";
    if (name === "ohlc" && child.type === "line") {
      const { x1, x2, y1, y2, ...appearance } = child.properties;
      return { ...child, type: "path", properties: { commands: [{ op: "M", x: x1, y: y1 }, { op: "L", x: x2, y: y2 }], ...appearance, outline, shadow } };
    }
    return applies ? { ...child, type: child.type ?? base.graphicSpec.objects[id].type, properties: { ...child.properties, ...(name === "image" ? {} : { outline }), shadow } } : child;
  }) });
  return { base, publicProgram, primitive, effectEdit: { op: edit, options: effectOptions } };
}
