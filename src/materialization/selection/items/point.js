import { hasPositionBinding } from "../../../core/encodingBindings.js";
import {
  channelMapFromRow,
  concreteProperties,
  finalizeItemsStages,
  ownFields
} from "./common.js";
import { drainStages, mapStages } from "../../../core/stages.js";
import { identifyItems } from "./common.js";

export function resolvePointSourceItems(program, layer, dataset) {
  return identifyItems(program, layer, "point", dataset.values.map((row, index) => ({
    rowKey: dataset.rowKeys[index], fields: ownFields(row), channels: channelMapFromRow(row, layer), members: [row]
  })));
}

export function resolvePointItems(...args) {
  return drainStages(resolvePointItemsStages(...args));
}

export function* resolvePointItemsStages(program, layer, dataset, grain, resolveItems, selectionResolvers) {
  const graphic = program.graphicSpec.objects[layer.id];
  const completePosition = (
    hasPositionBinding(layer, "x") &&
    hasPositionBinding(layer, "y")
  ) || (
    hasPositionBinding(layer, "theta") &&
    hasPositionBinding(layer, "radius")
  );
  if (
    !Array.isArray(graphic?.items) ||
    !completePosition
  ) {
    throw new Error(`Point mark "${layer.id}" is incomplete for selection.`);
  }
  // Concrete output reads only identities. Selection fields are built when a
  // selection result or a bring-to-front highlight order can read them.
  const selectable = !selectionResolvers?.identityOnly || Object.values(program.materializationConfigs.highlights ?? {})
    .some(config => config.target === layer.id && config.bringToFront === true);
  const definitions = yield* mapStages(dataset.values, (row, index) => !selectable ? { rowKey: dataset.rowKeys[index], members: [row] } : ({
    rowKey: dataset.rowKeys[index],
    fields: ownFields(row),
    channels: channelMapFromRow(row, layer),
    properties: concreteProperties(graphic.items[index]?.properties),
    members: [row]
  }));
  return yield* finalizeItemsStages(
    program,
    layer,
    "point",
    definitions,
    program.graphicSpec.objects[layer.id]?.type
  , { selectionResolvers });
}
