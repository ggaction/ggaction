import { materializeMarkEffectProperties } from "../markEffects.js";
import { bindTextFontProperties } from "../textFont.js";
import { materializeFillItems } from "../fillPaint.js";
import { resolveHierarchyLayerResources } from "../../selectors/hierarchy.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { resolveCoordinateBounds, resolveCoordinatePolarFrame } from "../coordinateBounds.js";
import { projectPartitionView } from "../../grammar/hierarchy/partitionView.js";
import { mapPartitionRectangle, mapPartitionSector } from "../../grammar/hierarchy/partitionMapping.js";
import { buildAnnularSectorCommands, resolvePolarPoint } from "../../grammar/polarPaths.js";
import { hierarchyInputSources } from "../../grammar/hierarchy/input.js";
import { validatePartitionPlotDefinition } from "../../grammar/hierarchy/partitionPlot.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { uniqueFields } from "../selection/items/common.js";
import { hierarchyNodeItemKey } from "./items.js";

function styleMap(entries) { return new Map(entries.map(({ key, ...style }) => [key, style])); }
export function resolvePartitionPlot(program, layer, config) {
  const { layout, hierarchy, dataset } = resolveHierarchyLayerResources(program, layer);
  validatePartitionPlotDefinition(config, layer.hierarchyLabels, layer.partitionView, hierarchy.result);
  const coordinate = requireCoordinate(program, layer.coordinate);
  if (!["cartesian", "polar"].includes(coordinate.type)) throw new TypeError("Partition requires Cartesian or polar coordinates.");
  const frame = resolveCoordinateBounds(program, coordinate.id), mapping = config.mapping;
  const polar = coordinate.type === "polar" ? resolveCoordinatePolarFrame(program, coordinate.id) : undefined;
  const outerRadius = mapping.outerRadius === "auto" ? polar?.availableRadius : mapping.outerRadius;
  if (polar && (!(outerRadius > mapping.innerRadius) || outerRadius > polar.availableRadius)) throw new RangeError("Partition radii must fit inside the polar frame.");
  const view = projectPartitionView(layout.result, { ...(layer.partitionView.focusKey === null ? {} : { focusKey: layer.partitionView.focusKey }), rootVisible: layer.partitionView.rootVisible, maxNodes: hierarchy.options.maxNodes });
  const visible = new Map(view.nodes.map(node => [node.key, node]));
  const sources = hierarchyInputSources(dataset.values, hierarchy.options);
  const nodes = layout.result.nodes.filter(node => !node.synthetic), allNodes = new Map(hierarchy.result.nodes.map(node => [node.key, node]));
  const navigation = new Map();
  for (const node of layout.result.nodes) node.childrenKeys.forEach((key, index) => navigation.set(key, {
    parent: node.synthetic ? null : node.key, previousSibling: node.childrenKeys[index - 1] ?? null, nextSibling: node.childrenKeys[index + 1] ?? null
  }));
  const { overrides: _overrides, ...paint } = config.cells, bodyOverrides = styleMap(config.cells.overrides);
  const labelOverrides = styleMap(config.labels?.overrides ?? []), texts = new Map((layer.hierarchyLabels?.overrides ?? []).map(({ key, text }) => [key, text]));
  const lineage = { kind: "resource", resource: layer.hierarchyBinding.layout };
  const graphics = [], items = [], labels = [];
  for (const node of nodes) {
    const key = hierarchyNodeItemKey(layer, hierarchy, node), cell = visible.get(node.key), style = { ...paint, ...bodyOverrides.get(node.key) };
    let properties = style, geometry, anchor, drawable = false, labelVisible = false, type;
    if (cell?.visible) {
      const interval = { u0: cell.u0, u1: cell.u1, v0: cell.v0, v1: cell.v1 };
      if (!polar) {
        const horizontal = mapping.orientation === "horizontal";
        geometry = mapPartitionRectangle(interval, { ...frame, orientation: mapping.orientation, reverseU: mapping.reverseU, reverseV: mapping.reverseV,
          gapX: mapping.padding[horizontal ? 0 : 1], gapY: mapping.padding[horizontal ? 1 : 0] });
        const { visible: ink, ...rect } = geometry;
        properties = { ...rect, ...style }; type = "rect"; drawable = ink;
        anchor = { x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 };
        labelVisible = geometry.width >= config.labelVisibility.minWidth;
      } else {
        if (mapping.reverseU) [interval.u0, interval.u1] = [1 - interval.u1, 1 - interval.u0];
        if (mapping.reverseV) [interval.v0, interval.v1] = [1 - interval.v1, 1 - interval.v0];
        geometry = mapPartitionSector(interval, { innerRadius: mapping.innerRadius, outerRadius, radiusPolicy: mapping.radiusPolicy,
          startAngle: mapping.startAngle * Math.PI / 180, sweep: mapping.sweep * Math.PI / 180,
          direction: mapping.direction, angularGap: mapping.padding[0], radialGap: mapping.padding[1] });
        drawable = geometry.visible; type = "path";
        const theta0 = geometry.startAngle * 180 / Math.PI, theta1 = geometry.endAngle * 180 / Math.PI;
        if (drawable) properties = { commands: buildAnnularSectorCommands({ frame: polar, startTheta: theta0, endTheta: theta1, innerRadius: geometry.innerRadius, outerRadius: geometry.outerRadius }), ...style };
        anchor = resolvePolarPoint(polar, (theta0 + theta1) / 2, (geometry.innerRadius + geometry.outerRadius) / 2);
        labelVisible = Math.abs(geometry.endAngle - geometry.startAngle) * (geometry.innerRadius + geometry.outerRadius) / 2 >= config.labelVisibility.minArcLength;
      }
    }
    const item = { node, key, properties, graphicIndices: [], graphicRoles: [], visible: drawable, geometry,
      members: node.sourceRows.map(index => dataset.values[index]), memberKeys: node.sourceRows.map(index => dataset.rowKeys[index]),
      fields: { ...(sources.get(node.key)?.object ?? uniqueFields(node.sourceRows.map(index => dataset.values[index]))),
        value: node.totalValue, depth: node.depth, children: node.childrenKeys.length, nodeKey: node.key, name: texts.get(node.key) ?? String(node.totalValue) },
      navigation: { key: node.key, parent: null, previousSibling: null, nextSibling: null, ...navigation.get(node.key), firstChild: node.childrenKeys[0] ?? null, root: hierarchy.result.rootKey } };
    if (drawable) {
      item.graphicIndices.push(graphics.length); item.graphicRoles.push("body");
      graphics.push({ type, properties, identity: { key, topology: "", role: "body", lineage } });
      if (layer.hierarchyLabels !== false && labelVisible) {
        const { overrides: _labelOverrides, offset, ...labelPaint } = config.labels;
        labels.push({ item, graphic: { type: "text", properties: bindTextFontProperties(program, { x: anchor.x + offset[0], y: anchor.y + offset[1], text: texts.get(node.key) ?? String(node.totalValue),
          ...labelPaint, ...labelOverrides.get(node.key), textAlign: "center", textBaseline: "middle" }), identity: { key, topology: "", role: "label", lineage } } });
      }
    }
    items.push(item);
  }
  for (const { item, graphic } of labels) {
    item.graphicIndices.push(graphics.length); item.graphicRoles.push("label"); graphics.push(graphic);
  }
  validateGeneratedItemLimit(graphics.length, "Partition graphic count");
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic, properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  const targets = new Set([...bodyOverrides.keys(), ...labelOverrides.keys(), ...texts.keys()]);
  return { graphics: concrete, items, dataset, layout, hierarchy, frame, view: { ...view, ...(layer.partitionView.recovery ? { recovery: layer.partitionView.recovery } : {}) },
    diagnostics: [...targets].filter(key => !allNodes.has(key)).map(key => ({ code: "orphan-style", key })) };
}
