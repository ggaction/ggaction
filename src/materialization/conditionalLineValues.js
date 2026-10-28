import { positionBindings } from "../core/encodingBindings.js";
import { mapConditionalBranchValues, mapConditionalValues } from "./conditionalMapping.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";
import { conditionalLineStructure, LINE_POSITION_CHANNELS } from "./conditionalLineStructure.js";
import { uniqueFields, identifyItems } from "./selection/items/common.js";
import { memberRowReferences } from "./selection/rows.js";

export function conditionalLinePositions(program, layer, dataset, resolvers) {
  const structure = conditionalLineStructure(program, layer, dataset);
  const definitions = structure.derived.series.flatMap(series => series.vertexSourceIndices.map(indices => {
    const members = indices.map(index => dataset.values[index]);
    const memberKeys = indices.map(index => dataset.rowKeys[index]);
    return { fields: uniqueFields(members), members, memberKeys,
      rows: memberRowReferences(program, members, layer.data, memberKeys) };
  }));
  const items = identifyItems(program, layer, "vertex", definitions);
  const mapped = {}, selected = {};
  for (const channel of LINE_POSITION_CHANNELS) {
    const bindings = positionBindings(layer, channel);
    if (!bindings.length) continue;
    const definition = layer.conditionals?.[channel];
    if (definition === undefined) {
      const raw = structure.derived.series.flatMap(series => series.values.map(value => value[channel]));
      mapped[channel] = mapConditionalBranchValues(raw, bindings[0], program.resolvedScales[bindings[0].scale], channel);
      selected[channel] = raw.map(value => ({ value, binding: bindings[0] }));
      continue;
    }
    const membership = conditionalSelectionMembership(program, layer, definition, items, resolvers, { rowMembership: true });
    const branchValues = structure.branches[channel].map(derived => derived.series.flatMap(series => series.values.map(value => value[channel])));
    selected[channel] = mapConditionalValues(program, layer, channel, items, membership, { branchValues, mapped: false, includeBinding: true });
    mapped[channel] = selected[channel].map(({ value, binding }) => mapConditionalBranchValues([value], binding, program.resolvedScales[binding.scale], channel)[0]);
  }
  let offset = 0;
  const selectedPositions = [];
  const positions = structure.derived.series.map(series => {
    const values = Object.fromEntries(Object.entries(mapped).map(([channel, values]) => [channel, values.slice(offset, offset + series.values.length)]));
    selectedPositions.push(Object.fromEntries(Object.entries(selected).map(([channel, values]) => [channel, values.slice(offset, offset + series.values.length)])));
    offset += series.values.length;
    return values;
  });
  return { ...structure, positions, selectedPositions };
}
