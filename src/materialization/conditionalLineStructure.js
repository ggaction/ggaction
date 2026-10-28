import { canonicalJSON } from "../core/contentDigest.js";
import { conditionalPositionTemplate, positionBindings } from "../core/encodingBindings.js";
import { deriveLineSeries, resolveLineBins } from "../grammar/lineSeries.js";
import { requireSemanticScale } from "../selectors/scales.js";

export const LINE_POSITION_CHANNELS = Object.freeze(["x", "y", "theta", "radius"]);

export function hasConditionalLinePosition(layer) {
  return layer.mark?.type === "line" && LINE_POSITION_CHANNELS.some(channel => layer.conditionals?.[channel] !== undefined);
}

export function deriveConditionalLineBranch(program, layer, dataset) {
  const encoding = layer.encoding;
  const options = { lineage: true, vertexLineage: true, scales: program.semanticSpec.scales };
  for (const channel of ["x", "y", "theta"]) {
    const binding = encoding[channel];
    if (binding === undefined) continue;
    options[`${channel}Domain`] = program.resolvedScales[binding.scale]?.domain;
    if (binding.bin !== undefined) options[`${channel}BinBoundaries`] = resolveLineBins(dataset.values,
      channel === "x" ? layer : { ...layer, encoding: { ...encoding, x: binding } },
      requireSemanticScale(program, binding.scale)).boundaries;
  }
  return deriveLineSeries(dataset.values, layer, options);
}

function topology(derived) {
  return canonicalJSON(derived.series.map(series => [series.key, series.vertexSourceIndices]));
}

export function conditionalLineStructure(program, layer, dataset) {
  const template = conditionalPositionTemplate(layer, LINE_POSITION_CHANNELS);
  const derived = deriveConditionalLineBranch(program, template, dataset);
  const signature = topology(derived), branches = {};
  for (const channel of LINE_POSITION_CHANNELS) {
    if (layer.conditionals?.[channel] === undefined) continue;
    branches[channel] = positionBindings(layer, channel).map(binding => {
      const candidate = deriveConditionalLineBranch(program, { ...template, encoding: { ...template.encoding, [channel]: binding } }, dataset);
      if (topology(candidate) !== signature) throw new Error(`Conditional ${channel} changes line vertex membership or order; author grouping and path order before conditional positions.`);
      return candidate;
    });
  }
  return { template, derived, branches };
}
