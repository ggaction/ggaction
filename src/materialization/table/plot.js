import { requireDataset } from "../../selectors/datasets.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { validateTableBinding } from "../../grammar/tablePlot.js";
import { deriveTableData } from "../../grammar/tableData.js";
import { readScaleField } from "../../grammar/scales/fields.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { identifyItems } from "../selection/items/common.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { bindTextFontProperties } from "../textFont.js";
import { layoutTableContent } from "./layout.js";
import { contentDigest } from "../../core/contentDigest.js";
import { findGraphicParent } from "../../grammar/schemas/graphicTree.js";

export function tableCellGraphicId(owner, key) { return `${owner}-cell-${contentDigest(key)}`; }

export function resolveTablePlot(program, layer, config, resolvedScales = program.resolvedScales) {
  validateTableBinding(layer, config);
  if (requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("Table requires a Cartesian viewport.");
  const dataset = requireDataset(program, layer.data);
  const frame = resolveCoordinateBounds(program, layer.coordinate, { resolvedScales });
  const data = deriveTableData(dataset.values, dataset.rowKeys, layer.table);
  const resolved = layoutTableContent(data, dataset.rowKeys, layer.table, config, frame, program.materializationConfigs.textMetrics);
  const color = layer.encoding?.color;
  const colors = color === undefined ? undefined : mapScaleConsumerValues(readScaleField(dataset.values, color.field, color.fieldType), resolvedScales[color.scale], "color");
  const definitions = resolved.cells.map(cell => {
    const members = cell.role === "body" ? [dataset.values[cell.sourceIndex]] : cell.aggregate ? dataset.values : [];
    const memberKeys = cell.role === "body" ? [cell.rowKey] : cell.aggregate ? dataset.rowKeys : [];
    return { ...cell, members, memberKeys,
      semanticIdentity: ["table-cell", cell.role, cell.rowKey ?? null, cell.columnKey],
      fields: cell.role === "body" ? { ...members[0] } : {},
      channels: { role: cell.role, columnKey: cell.columnKey, ...(cell.rowKey === undefined ? {} : { rowKey: cell.rowKey }),
        value: cell.value, text: cell.text, truncated: cell.truncated, sourceRowCount: resolved.layout.sourceRowCount,
        visibleRowCount: resolved.layout.visibleRowCount, omittedRowCount: resolved.layout.omittedRowCount,
        ...(cell.aggregate ? { inputRows: cell.aggregate.inputRows, usedRows: cell.aggregate.usedRows, excludedRows: cell.aggregate.excludedRows } : {}),
        ...(color && cell.role === "body" ? { color: members[0][color.field] } : {}) },
      properties: { x: cell.bounds.left, y: cell.bounds.top, width: cell.bounds.right - cell.bounds.left, height: cell.bounds.bottom - cell.bounds.top }
    };
  });
  const items = identifyItems(program, layer, "item", definitions), graphics = [];
  for (const item of items) {
    item.graphicRoles = [];
    const lineage = { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKeys: item.memberKeys };
    for (const graphic of item.graphics) {
      const { role, clip: _clip, ...node } = graphic;
      const properties = { ...node.properties, ...(colors && item.role === "body" && role === "body" ? { fill: colors[item.sourceIndex] } : {}) };
      graphics.push({ ...node, properties: graphic.type === "text" ? bindTextFontProperties(program, properties) : properties,
        identity: { key: item.key, topology: item.topology, role, lineage } });
      item.graphicRoles.push(role);
    }
  }
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic, properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  const byKey = new Map();
  for (const graphic of concrete) {
    const list = byKey.get(graphic.identity.key) ?? []; list.push(graphic); byKey.set(graphic.identity.key, list);
  }
  const groups = items.map(item => {
    const id = tableCellGraphicId(layer.id, item.key);
    if (program.graphicSpec.objects[id] !== undefined && findGraphicParent(program.graphicSpec, id)?.id !== layer.id) throw new Error("Table cell graphic id collides with an unrelated owner.");
    return { id, items: byKey.get(item.key), clip: { x: item.bounds.left, y: item.bounds.top, width: item.bounds.right - item.bounds.left, height: item.bounds.bottom - item.bounds.top } };
  });
  const note = resolved.note === undefined ? [] : materializeFillItems(program, layer, [{ type: "text", properties: bindTextFontProperties(program, materializeMarkEffectProperties(resolved.note)) }]);
  for (const graphic of note) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { graphics: concrete, groups, note, items, frame, dataset, data, layout: resolved.layout };
}
