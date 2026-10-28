import { canonicalJSON } from "../core/contentDigest.js";
import { conditionalPositionTemplate, positionBindings } from "../core/encodingBindings.js";
import { deriveAreaSeries, deriveCenteredAreaSeries, deriveDensityAreaSeries, layoutDensityAreaSeries } from "../grammar/areaSeries.js";
import { findUpstreamTransform } from "./dataProvenance.js";

export const AREA_POSITION_CHANNELS = Object.freeze(["x", "y", "x2", "y2"]);

export function hasConditionalAreaPosition(layer) {
  return layer.mark?.type === "area" && AREA_POSITION_CHANNELS.some(channel => layer.conditionals?.[channel] !== undefined);
}

export function deriveConditionalAreaBranch(program, layer, dataset, positionValues) {
  const transform = findUpstreamTransform(program, dataset, "density");
  const options = { lineage: true, positionValues, xDomain: program.resolvedScales[layer.encoding.x?.scale]?.domain,
    yDomain: program.resolvedScales[layer.encoding.y?.scale]?.domain };
  const raw = transform !== undefined ? deriveDensityAreaSeries(dataset.values, layer, transform, options)
    : layer.encoding.y?.stack === "center" ? deriveCenteredAreaSeries(dataset.values, layer, options)
      : deriveAreaSeries(dataset.values, layer, options);
  const layout = layer.layout?.mode ?? layer.encoding.color?.layout ?? "overlay";
  const derived = transform !== undefined && transform.placement?.type !== "category" ? layoutDensityAreaSeries(raw, layout) : raw;
  return { raw, derived, transform };
}

export function areaPositionTopology(raw) {
  return canonicalJSON([raw.mode, raw.orientation, raw.series.map(series => [series.key, series.sourceIndices])]);
}

export function areaMeasureChannel(raw) {
  return raw.orientation === "horizontal" || ["x-density", "category-y"].includes(raw.mode) ? "x" : "y";
}

export function conditionalAreaStructure(program, layer, dataset) {
  const template = conditionalPositionTemplate(layer, AREA_POSITION_CHANNELS);
  const result = deriveConditionalAreaBranch(program, template, dataset);
  const signature = areaPositionTopology(result.raw), branches = {};
  // Endpoints and coupled sums have one common unit, just like ordinary area
  // ranges. Independent positions can still choose separate branch scales.
  const measure = areaMeasureChannel(result.raw);
  const scales = new Set([measure, `${measure}2`].flatMap(channel => positionBindings(layer, channel).map(binding => binding.scale)));
  const coupled = template.encoding[`${measure}2`] !== undefined || template.encoding.y?.stack === "center" || (template.layout?.mode ?? "overlay") !== "overlay";
  if (coupled && scales.size !== 1) throw new Error("Conditional area endpoints require one shared measure scale.");
  for (const channel of AREA_POSITION_CHANNELS) {
    if (layer.conditionals?.[channel] === undefined) continue;
    branches[channel] = positionBindings(layer, channel).map(binding => {
      const candidate = deriveConditionalAreaBranch(program, { ...template, encoding: { ...template.encoding, [channel]: binding } }, dataset);
      if (areaPositionTopology(candidate.raw) !== signature) throw new Error(`Conditional ${channel} changes area vertex membership or order; author grouping and path order before conditional positions.`);
      return candidate;
    });
  }
  return { template, ...result, branches };
}
