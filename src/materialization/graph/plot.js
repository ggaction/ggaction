import { validateGraphRecomputeView } from "./filterState.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { applyGraphView } from "./view.js";
import { bindTextFontProperties } from "../textFont.js";
import { contentDigest } from "../../core/contentDigest.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveGraphLayerResources } from "../../selectors/graphs.js";
import { graphEdgeGeometry } from "./geometry.js";
import { storedGraphRouteGeometry } from "./routeGeometry.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { materializeFillItems } from "../fillPaint.js";

import { graphItemKey } from "../../grammar/graph/itemIdentity.js";
function originalKey(dataset, node, definition) {
  const row = dataset.values[node.sourceRows[0]], fields = definition.nodeKey;
  return Array.isArray(fields) ? fields.map(field => row[field]) : row[fields];
}
function labelValue(value) {
  if (value === null || value === undefined) return "";
  if (!["string", "number", "boolean", "bigint"].includes(typeof value)) throw new TypeError("Graph label attributes must be scalar values.");
  return String(value);
}
function bodyStyle(config, overrides, key) {
  const { overrides: _overrides, ...base } = config;
  return { ...base, ...overrides.get(key) };
}
function overrideMap(entries) {
  return new Map(entries.map(({ key, ...style }) => [key, style]));
}

export function resolveGraphPlot(program, layer, config, { animationGeometry = false } = {}) {
  const { layout, graph, nodesData, edgesData } = resolveGraphLayerResources(program, layer), model = graph.result.model;
  validateGraphRecomputeView(program, layer, graph, config.view);
  const labels = layer.graphLabels, frame = resolveGraphicBounds(program), positions = layout.result.nodes;
  if (labels !== false && Object.hasOwn(labels, "field") && !graph.options.definition.attributes.includes(labels.field)) throw new TypeError("Graph labels require a retained node attribute.");
  validateGeneratedItemLimit(model.nodes.length * (labels === false ? 1 : 2) + model.edges.length * 2, "Graph plot graphic count");
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  if (positions.length) {
    x0 = x1 = positions[0].x; y0 = y1 = positions[0].y;
    for (const node of positions) { x0 = Math.min(x0, node.x); x1 = Math.max(x1, node.x); y0 = Math.min(y0, node.y); y1 = Math.max(y1, node.y); }
  }
  const origin = config.origin === "auto" ? [frame.x + frame.width / 2 - x0 / 2 - x1 / 2, frame.y + frame.height / 2 - y0 / 2 - y1 / 2]
    : [frame.x + config.origin[0], frame.y + config.origin[1]];
  const located = new Map(positions.map(node => [node.key, { x: node.x + origin[0], y: node.y + origin[1] }]));
  const nodeStyles = overrideMap(config.nodes.overrides), labelStyles = overrideMap(labels === false ? [] : config.labels.overrides);
  const radii = new Map(model.nodes.map(node => [node.key, bodyStyle(config.nodes, nodeStyles, node.key).radius]));
  const lineage = { kind: "resource", resource: { kind: "layout", id: layout.id, revision: layout.revision } };
  const graphics = [], items = [], nodeItems = new Map();
  const degrees = new Map(model.nodes.map(node => [node.key, 0]));
  for (const edge of model.edges) {
    degrees.set(edge.sourceKey, degrees.get(edge.sourceKey) + 1);
    degrees.set(edge.targetKey, degrees.get(edge.targetKey) + 1);
  }
  const inference = graph.provenance.origin === "inferred" ? { rule: graph.options.definition.rule,
    ruleId: graph.options.definition.ruleId, metric: graph.options.definition.metric ?? null } : {};
  const rawKeys = new Map(model.nodes.map(node => [node.key, originalKey(nodesData, node, graph.options.definition)]));
  const memberItem = (source, dataset) => ({ members: source.sourceRows.map(index => dataset.values[index]),
    memberKeys: source.sourceRows.map(index => dataset.rowKeys[index]), dataset });
  const edgeStyle = config.edges;
  const routeResource = layer.graphBinding.routes === undefined ? undefined : resolveInputReference(program, layer.graphBinding.routes);
  if (routeResource !== undefined && (routeResource.kind !== "edge-route" || routeResource.inputs[0].id !== graph.id || routeResource.inputs[0].revision !== graph.revision ||
      routeResource.inputs[1].id !== layout.id || routeResource.inputs[1].revision !== layout.revision)) throw new TypeError("Graph routes require the same exact graph and node layout.");
  const edgeLineage = routeResource === undefined ? lineage : { kind: "resource", resource: layer.graphBinding.routes };
  const resolvedEdgeStyle = { ...edgeStyle, arrows: edgeStyle.arrows === "auto" ? model.directed : edgeStyle.arrows };
  const routes = routeResource === undefined ? graphEdgeGeometry(model, located, radii, resolvedEdgeStyle)
    : storedGraphRouteGeometry(model, routeResource, origin, radii, resolvedEdgeStyle);
  for (const { edge, commands, arrowCommands } of routes) {
    const key = graphItemKey(layer, graph, "edge", edge.key), topology = contentDigest(JSON.stringify([edge.sourceKey, edge.targetKey]));
    const properties = { commands, fill: "none", stroke: edgeStyle.stroke, strokeWidth: edgeStyle.strokeWidth, opacity: edgeStyle.opacity, ...(edgeStyle.shadow === undefined ? {} : { shadow: edgeStyle.shadow }) };
    const graphicIndices = [graphics.length], graphicRoles = ["body"];
    graphics.push({ type: "path", properties, identity: { key, topology, role: "body", lineage: edgeLineage } });
    if (arrowCommands) {
      graphicIndices.push(graphics.length); graphicRoles.push("arrow");
      graphics.push({ type: "path", properties: { commands: arrowCommands, fill: edgeStyle.stroke, stroke: "none", strokeWidth: 0, opacity: edgeStyle.opacity, ...(edgeStyle.shadow === undefined ? {} : { shadow: edgeStyle.shadow }) }, identity: { key, topology, role: "arrow", lineage: edgeLineage } });
    }
    items.push({ key, topology, role: "edge", properties, graphicIndices, graphicRoles, lineage: edgeLineage, ...memberItem(edge, edgesData),
      fields: { ...inference, kind: "edge", key: edge.key, sourceKey: rawKeys.get(edge.sourceKey), targetKey: rawKeys.get(edge.targetKey), weight: edge.weight, origin: edge.origin, directed: edge.directed, ruleId: edge.ruleId } });
  }
  model.nodes.forEach((node, index) => {
    const key = graphItemKey(layer, graph, "node", node.key), properties = { ...located.get(node.key), ...bodyStyle(config.nodes, nodeStyles, node.key) };
    const item = { key, topology: "", role: "node", properties, graphicIndices: [graphics.length], graphicRoles: ["body"], lineage, ...memberItem(node, nodesData),
      fields: { ...inference, ...Object.fromEntries(Object.entries(node.attributes).map(([name, value]) => [`attribute:${name}`, value])), kind: "node", key: rawKeys.get(node.key),
        degree: degrees.get(node.key), incoming: model.adjacency[index].incoming.length, outgoing: model.adjacency[index].outgoing.length, origin: graph.provenance.origin } };
    graphics.push({ type: "circle", properties, identity: { key, topology: "", role: "body", lineage } });
    items.push(item); nodeItems.set(node.key, item);
  });
  if (labels !== false) {
    const texts = new Map(labels.overrides.map(entry => [entry.key, entry.text]));
    const { offset, overrides: _overrides, ...labelPaint } = config.labels;
    for (const node of model.nodes) {
      const item = nodeItems.get(node.key), position = located.get(node.key), raw = rawKeys.get(node.key);
      const text = texts.has(node.key) ? texts.get(node.key) : Object.hasOwn(labels, "field") ? labelValue(node.attributes[labels.field]) : Array.isArray(raw) ? JSON.stringify(raw) : String(raw);
      item.graphicIndices.push(graphics.length); item.graphicRoles.push("label");
      graphics.push({ type: "text", properties: bindTextFontProperties(program, { x: position.x + offset[0], y: position.y + offset[1], text,
        ...labelPaint, ...labelStyles.get(node.key), textAlign: "center", textBaseline: "middle" }), identity: { key: item.key, topology: "", role: "label", lineage } });
    }
  }
  const known = new Set(model.nodes.map(node => node.key));
  const targets = new Set([...nodeStyles.keys(), ...labelStyles.keys(), ...(labels === false ? [] : labels.overrides.map(entry => entry.key))]);
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic, properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return applyGraphView(program, { graphics: concrete, items, frame, layout, graph, nodesData, edgesData,
    ...(animationGeometry ? { animation: { origin, labelOffset: config.labels?.offset ?? [0, 0], edgeStyle: resolvedEdgeStyle,
      nodes: positions.map(node => ({ key: node.key, x: node.x, y: node.y, radius: radii.get(node.key) })), routeResource } } : {}),
    diagnostics: [...targets].filter(key => !known.has(key)).map(key => ({ code: "orphan-style", key })) }, config.view);
}
