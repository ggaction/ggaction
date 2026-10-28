import { materializeMarkEffectProperties } from "../markEffects.js";
import { bindTextFontProperties } from "../textFont.js";
import { contentDigest } from "../../core/contentDigest.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { graphFieldValue, graphSourceKey } from "../../grammar/graph/fields.js";
import { flowRibbonCommands } from "../../grammar/flow/ribbon.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveFlowLayerResources } from "../../selectors/flow.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { materializeFillItems } from "../fillPaint.js";
import { uniqueFields } from "../selection/items/common.js";

export function resolveFlowPlot(program, layer, config) {
  const { layout, graph, dataset, nodesDataset } = resolveFlowLayerResources(program, layer);
  if (requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("Flow marks require a Cartesian coordinate.");
  const frame = resolveCoordinateBounds(program, layer.coordinate), bounds = layout.result.bounds;
  const scale = Math.min(frame.width / (bounds.right - bounds.left), frame.height / (bounds.bottom - bounds.top));
  const origin = [frame.x + (frame.width - (bounds.right - bounds.left) * scale) / 2 - bounds.left * scale,
    frame.y + (frame.height - (bounds.bottom - bounds.top) * scale) / 2 - bounds.top * scale];
  const point = (x, y) => ({ x: origin[0] + x * scale, y: origin[1] + y * scale });
  const nodeMark = layer.mark.type === "flow-node", model = graph.result.model;
  const records = nodeMark ? model.nodes : model.edges, values = nodeMark ? layout.result.nodes : layout.result.edges;
  const rawKey = node => {
    const row = nodesDataset.values[node.sourceRows[0]];
    return row === undefined ? node.key : graphSourceKey(row, graph.options.definition.nodeKey);
  };
  const nodeKeys = new Map(model.nodes.map(node => [node.key, rawKey(node)]));
  const { overrides: storedOverrides, ...body } = config.body;
  const overrides = new Map(storedOverrides.map(({ key, ...style }) => [key, style]));
  const labelOverrides = new Map((config.labels?.overrides ?? []).map(({ key, ...style }) => [key, style]));
  const labelText = new Map((layer.flowLabels?.overrides ?? []).map(({ key, text }) => [key, text]));
  const lineage = { kind: "resource", resource: layer.flowBinding.layout }, graphics = [], items = [];
  values.forEach((value, index) => {
    const record = records[index], members = record.sourceRows.map(row => dataset.values[row]), memberKeys = record.sourceRows.map(row => dataset.rowKeys[row]);
    const role = nodeMark ? "node" : "link", key = JSON.stringify([[], layer.id, role, [graph.id, record.key]]);
    const topology = nodeMark ? "" : contentDigest(JSON.stringify([record.sourceKey, record.targetKey, value.route, value.lane?.side ?? null]));
    const style = { ...body, ...overrides.get(record.key) };
    const properties = nodeMark ? { ...point(value.x, value.y), width: value.width * scale, height: value.height * scale, ...style }
      : { commands: flowRibbonCommands(value, layout.options.options.orientation).map(command => {
        if (command.op === "Z") return command;
        const mapped = { op: command.op, ...point(command.x, command.y) };
        if (command.op === "C") Object.assign(mapped, { x1: origin[0] + command.x1 * scale, y1: origin[1] + command.y1 * scale,
          x2: origin[0] + command.x2 * scale, y2: origin[1] + command.y2 * scale });
        return mapped;
      }), fillRule: "nonzero", ...style };
    const fields = { ...uniqueFields(members), ...(nodeMark ? { key: nodeKeys.get(record.key), value: value.throughput,
      incoming: value.incoming, outgoing: value.outgoing, imbalance: value.imbalance }
      : { source: nodeKeys.get(record.sourceKey), target: nodeKeys.get(record.targetKey), value: value.value }) };
    const item = { key, topology, role, fields, properties, members, memberKeys, graphicIndices: [graphics.length], graphicRoles: ["body"] };
    graphics.push({ type: nodeMark ? "rect" : "path", properties, identity: { key, topology, role: "body", lineage } }); items.push(item);
    if (layer.flowLabels !== false) {
      const { content } = layer.flowLabels, { offset, overrides: _labelOverrides, ...labelStyle } = config.labels;
      const text = labelText.get(record.key) ?? (content === "key" ? String(nodeKeys.get(record.key)) : content === "value" ? String(value.throughput)
        : String(graphFieldValue(members[0], content.field, true)));
      item.graphicIndices.push(graphics.length); item.graphicRoles.push("label");
      graphics.push({ type: "text", properties: bindTextFontProperties(program, { ...point(value.x + value.width / 2, value.y + value.height / 2),
        x: point(value.x + value.width / 2, value.y).x + offset[0], y: point(value.x, value.y + value.height / 2).y + offset[1], text,
        ...labelStyle, ...labelOverrides.get(record.key), textAlign: "center", textBaseline: "middle" }), identity: { key, topology, role: "label", lineage } });
    }
  });
  validateGeneratedItemLimit(graphics.length, "Flow plot graphic count");
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic, properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  const known = new Set(records.map(record => record.key)), targets = new Set([...overrides.keys(), ...labelOverrides.keys(), ...labelText.keys()]);
  return { graphics: concrete, items, frame, graph, layout, dataset,
    diagnostics: [...targets].filter(key => !known.has(key)).map(key => ({ code: "orphan-style", key })) };
}
