import { positionBindings } from "../core/encodingBindings.js";
import { readAreaEndpoint } from "../grammar/areaEndpoints.js";
import { readScaleField } from "../grammar/scales/index.js";
import { mapConditionalBranchValues, mapConditionalValues } from "./conditionalMapping.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";
import { AREA_POSITION_CHANNELS, areaPositionTopology, conditionalAreaStructure, deriveConditionalAreaBranch } from "./conditionalAreaStructure.js";
import { identifyItems, ownFields } from "./selection/items/common.js";
import { memberRowReferences } from "./selection/rows.js";

function rawValues(dataset, layer, binding, channel) {
  if (binding.fieldType === "quantitative") return readAreaEndpoint(dataset.values, binding, layer.mark.missing);
  return readScaleField(dataset.values, binding.field, binding.fieldType, { temporalUnit: binding.temporalUnit });
}

export function conditionalAreaValues(program, layer, dataset, resolvers, { mapped = true } = {}) {
  const structure = conditionalAreaStructure(program, layer, dataset);
  const items = identifyItems(program, layer, "vertex", dataset.values.map((row, index) => ({
    fields: ownFields(row), members: [row], memberKeys: [dataset.rowKeys[index]],
    rows: memberRowReferences(program, [row], layer.data, [dataset.rowKeys[index]])
  })));
  const selected = {}, positionValues = {};
  for (const channel of AREA_POSITION_CHANNELS) {
    const bindings = positionBindings(layer, channel);
    if (!bindings.length) continue;
    const definition = layer.conditionals?.[channel];
    if (definition === undefined) {
      selected[channel] = rawValues(dataset, layer, bindings[0], channel).map(value => ({ value, binding: bindings[0] }));
    } else {
      const membership = conditionalSelectionMembership(program, layer, definition, items, resolvers, { rowMembership: true });
      selected[channel] = mapConditionalValues(program, layer, channel, items, membership, { mapped: false, includeBinding: true,
        allowMissing: layer.mark.missing === "break", branchValues: bindings.map(binding => rawValues(dataset, layer, binding, channel)) });
    }
    positionValues[channel] = selected[channel].map(item => item.value);
  }
  // Reuse the native kernel after selection: stack/fill/center sees the actual
  // mixed values, never independently laid-out branch geometries.
  const result = deriveConditionalAreaBranch(program, structure.template, dataset, positionValues);
  if (areaPositionTopology(result.raw) !== areaPositionTopology(structure.raw)) throw new Error("Conditional area positions change the selected vertex membership or order.");
  if (!mapped) return { ...structure, ...result, selected };
  const map = (channel, value, sourceIndex) => {
    const binding = selected[channel][sourceIndex].binding;
    return mapConditionalBranchValues([value], binding, program.resolvedScales[binding.scale], channel)[0];
  };
  const positions = result.derived.series.map((series, seriesIndex) => {
    const sourceIndices = result.raw.series[seriesIndex].sourceIndices;
    return series.values.map((value, index) => {
      const sourceIndex = sourceIndices[index];
      if (result.transform?.placement?.type === "category") {
        const category = result.transform.placement.channel, valueChannel = category === "x" ? "y" : "x";
        const scale = program.resolvedScales[selected[category][sourceIndex].binding.scale];
        if (!Number.isFinite(scale.bandwidth) || scale.bandwidth <= 0) throw new Error("Categorical density placement requires a positive band scale.");
        return { category: map(category, series.category, sourceIndex), value: map(valueChannel, value.value, sourceIndex), bandwidth: scale.bandwidth };
      }
      if (result.derived.orientation === "horizontal") return { x: map("x", value.x, sourceIndex), x2: map("x2", value.x2, sourceIndex), y: map("y", value.y, sourceIndex) };
      if (result.derived.mode === "x-density") return { x: map("x", value.x, sourceIndex), x2: map("x", 0, sourceIndex), y: map("y", value.y, sourceIndex) };
      return { x: map("x", value.x, sourceIndex), y: map("y", value.lower ?? value.y, sourceIndex),
        y2: map(selected.y2 === undefined ? "y" : "y2", value.upper ?? value.y2, sourceIndex) };
    });
  });
  return { ...structure, ...result, positions, selected };
}
