import { deriveHistogramCells } from "./bars/histogram.js";
import { readNominalField, resolveOrdinalDomain } from "../grammar/scales/index.js";
import { requireSemanticScale } from "../selectors/scales.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { conditionalPositionTemplate, positionBindings } from "../core/encodingBindings.js";
import { deriveBarAggregates } from "../grammar/bars/aggregate.js";
import { BAR_GRAINS, resolveBarChannels, resolveBarColorLayout, resolveBarGrain } from "../grammar/bars/policy.js";

export const BAR_POSITION_CHANNELS = Object.freeze(["x", "y", "x2", "y2", "xOffset", "yOffset"]);

export function hasConditionalBarPosition(layer) {
  return layer.mark?.type === "bar" && BAR_POSITION_CHANNELS.some(channel => layer.conditionals?.[channel] !== undefined);
}

export function deriveConditionalHistogramCells(program, layer, dataset) {
  const color = layer.encoding.color;
  const colorDomain = color === undefined ? undefined : resolveOrdinalDomain(requireSemanticScale(program, color.scale).domain, readNominalField(dataset.values, color.field));
  return deriveHistogramCells({ dataset, layer, xEncoding: layer.encoding.x, xScale: requireSemanticScale(program, layer.encoding.x.scale),
    resolvedScales: program.resolvedScales, colorDomain });
}

export function conditionalBarStructure(program, layer, dataset) {
  const template = conditionalPositionTemplate(layer, BAR_POSITION_CHANNELS);
  const grain = resolveBarGrain(template), channels = resolveBarChannels(template);
  const policy = candidate => canonicalJSON([resolveBarGrain(candidate), resolveBarChannels(candidate), resolveBarColorLayout(candidate)]);
  const signature = policy(template), branches = {};
  const derived = grain === BAR_GRAINS.aggregate ? deriveBarAggregates(dataset.values, template)
    : grain === BAR_GRAINS.histogram ? { values: deriveConditionalHistogramCells(program, template, dataset) } : undefined;
  const topology = candidate => canonicalJSON(candidate.values.map(value => value.sourceIndices));
  const scales = new Set([channels.measure, `${channels.measure}2`].flatMap(channel => positionBindings(layer, channel).map(binding => binding.scale)));
  if ((template.encoding[`${channels.measure}2`] !== undefined || !["overlay", "group"].includes(resolveBarColorLayout(template))) && scales.size !== 1) {
    throw new Error("Conditional bar ranges and stacks require one shared measure scale.");
  }
  for (const channel of BAR_POSITION_CHANNELS) {
    if (layer.conditionals?.[channel] === undefined) continue;
    branches[channel] = positionBindings(layer, channel).map(binding => {
      const candidate = { ...template, encoding: { ...template.encoding, [channel]: binding } };
      if (policy(candidate) !== signature) throw new Error(`Conditional ${channel} changes bar grain, orientation or layout.`);
      if (![BAR_GRAINS.aggregate, BAR_GRAINS.histogram].includes(grain) || !["x", "y"].includes(channel)) return undefined;
      const result = grain === BAR_GRAINS.aggregate ? deriveBarAggregates(dataset.values, candidate) : { values: deriveConditionalHistogramCells(program, candidate, dataset) };
      if (topology(result) !== topology(derived)) throw new Error(`Conditional ${channel} changes bar cell membership; author grouping before conditional positions.`);
      return result;
    });
  }
  return { template, grain, channels, derived, branches };
}
