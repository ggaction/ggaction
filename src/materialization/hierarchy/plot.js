import { hierarchyInputSources } from "../../grammar/hierarchy/input.js";
import { contentDigest } from "../../core/contentDigest.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { resolveHierarchyLayerResources } from "../../selectors/hierarchy.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { uniqueFields } from "../selection/items/common.js";

export function hierarchyNodeItemKey(layer, hierarchy, node) {
  return JSON.stringify([[], layer.id, "node", [hierarchy.id, node.key]]);
}
function boundsOf(nodes, method) {
  if (!nodes.length) return { x0: 0, x1: 0, y0: 0, y1: 0 };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const node of nodes) {
    const rect = method === "tree" ? { x0: node.x, x1: node.x, y0: node.y, y1: node.y } : node.rect;
    x0 = Math.min(x0, rect.x0); x1 = Math.max(x1, rect.x1); y0 = Math.min(y0, rect.y0); y1 = Math.max(y1, rect.y1);
  }
  return { x0, x1, y0, y1 };
}

export function resolveHierarchyPlot(program, layer, config) {
  const { layout, hierarchy, dataset } = resolveHierarchyLayerResources(program, layer), method = layer.mark.type;
  const frame = resolveGraphicBounds(program), nodes = layout.result.nodes.filter(node => !node.synthetic);
  const bounds = boundsOf(nodes, method), origin = config.origin === "auto"
    ? [frame.x + (frame.width - bounds.x1 - bounds.x0) / 2, frame.y + (frame.height - bounds.y1 - bounds.y0) / 2]
    : [frame.x + config.origin[0], frame.y + config.origin[1]];
  const sources = hierarchyInputSources(dataset.values, hierarchy.options);
  const sourceNodes = new Map(hierarchy.result.nodes.map(node => [node.key, node]));
  const positions = new Map(nodes.map(node => [node.key, node]));
  const body = config[method === "tree" ? "nodes" : "cells"], { overrides: _bodyOverrides, ...bodyPaint } = body;
  const bodyOverrides = new Map(body.overrides.map(entry => { const { key, ...style } = entry; return [key, style]; }));
  const labelOverrides = new Map((config.labels?.overrides ?? []).map(entry => { const { key, ...style } = entry; return [key, style]; }));
  const labelText = new Map((layer.hierarchyLabels?.overrides ?? []).map(entry => [entry.key, entry.text]));
  const lineage = { kind: "resource", resource: { kind: "layout", id: layout.id, revision: layout.revision } };
  const graphics = [], items = [];
  if (method === "tree" && config.links !== false) for (const node of nodes) {
    const parent = positions.get(node.parentKey);
    if (!parent) continue;
    graphics.push({ type: "line", properties: { x1: origin[0] + parent.x, y1: origin[1] + parent.y,
      x2: origin[0] + node.x, y2: origin[1] + node.y, ...config.links },
    identity: { key: JSON.stringify([[], layer.id, "link", [hierarchy.id, JSON.stringify([node.parentKey, node.key])]]),
      role: "link", topology: contentDigest(JSON.stringify([node.parentKey, node.key])), lineage } });
  }
  for (const node of nodes) {
    const source = sourceNodes.get(node.key), key = hierarchyNodeItemKey(layer, hierarchy, node), properties = method === "tree"
      ? { x: origin[0] + node.x, y: origin[1] + node.y, ...bodyPaint, ...bodyOverrides.get(node.key) }
      : { x: origin[0] + node.rect.x0, y: origin[1] + node.rect.y0, width: node.rect.x1 - node.rect.x0,
          height: node.rect.y1 - node.rect.y0, ...bodyPaint, ...bodyOverrides.get(node.key) };
    const graphicIndices = [graphics.length];
    graphics.push({ type: method === "tree" ? "circle" : "rect", properties, identity: { key, topology: "", role: "body", lineage } });
    items.push({ node: source, key, graphicIndices, graphicRoles: ["body"], properties,
      members: source.sourceRows.map(index => dataset.values[index]), memberKeys: source.sourceRows.map(index => dataset.rowKeys[index]),
      fields: { ...(sources.get(node.key)?.object ?? uniqueFields(source.sourceRows.map(index => dataset.values[index]))), value: source.totalValue,
        depth: source.depth, children: source.childrenKeys.length } });
  }
  if (layer.hierarchyLabels !== false) {
    const { overrides: _overrides, offset, ...labelPaint } = config.labels;
    nodes.forEach((node, index) => {
      const item = items[index], source = item.node;
      const x = method === "tree" ? node.x : (node.rect.x0 + node.rect.x1) / 2;
      const y = method === "tree" ? node.y : source.childrenKeys.length ? (node.rect.y0 + node.content.y0) / 2 : (node.rect.y0 + node.rect.y1) / 2;
      item.graphicIndices.push(graphics.length); item.graphicRoles.push("label");
      graphics.push({ type: "text", properties: { x: origin[0] + x + offset[0], y: origin[1] + y + offset[1],
        text: labelText.get(node.key) ?? String(source.totalValue), ...labelPaint, ...labelOverrides.get(node.key),
        textAlign: "center", textBaseline: "middle", ...(method === "treemap" && source.childrenKeys.length && node.content.y0 === node.rect.y0 ? { opacity: 0 } : {}) },
      identity: { key: item.key, topology: "", role: "label", lineage } });
    });
  }
  const known = new Set(nodes.map(node => node.key)), targets = new Set([...bodyOverrides.keys(), ...labelOverrides.keys(), ...labelText.keys()]);
  validateGeneratedItemLimit(graphics.length, "Hierarchy plot graphic count");
  for (const graphic of graphics) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { graphics, items, dataset, layout, hierarchy, frame,
    diagnostics: [...targets].filter(key => !known.has(key)).map(key => ({ code: "orphan-style", key })) };
}
