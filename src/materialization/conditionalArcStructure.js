import { canonicalJSON } from "../core/contentDigest.js";
import { conditionalPositionTemplate, positionBindings } from "../core/encodingBindings.js";
import { usesProportionalArcTheta, deriveMeasuredArcValues, deriveProportionalArcThetaValues, deriveProportionalArcRadiusValues, deriveRadialArcValues } from "../grammar/arcs.js";
import { readNominalField, resolveOrdinalDomain } from "../grammar/scales/index.js";
import { requireSemanticScale } from "../selectors/scales.js";

export const ARC_POSITION_CHANNELS = Object.freeze(["theta", "radius"]);

export function hasConditionalArcPosition(layer) {
  return layer.mark?.type === "arc" && ARC_POSITION_CHANNELS.some(channel => layer.conditionals?.[channel] !== undefined);
}

export function deriveConditionalArcBranch(program, layer, dataset) {
  const theta = layer.encoding.theta, radius = layer.encoding.radius;
  const thetaScale = requireSemanticScale(program, theta.scale);
  const radiusScale = radius === undefined ? undefined : requireSemanticScale(program, radius.scale);
  const measured = radiusScale?.radialMapping !== undefined;
  const proportional = usesProportionalArcTheta(theta, radiusScale);
  const domain = theta.fieldType === "quantitative" ? undefined : resolveOrdinalDomain(thetaScale.domain, readNominalField(dataset.values, theta.field));
  let values = measured ? deriveMeasuredArcValues(dataset.values, layer) : proportional
    ? deriveProportionalArcThetaValues(dataset.values, layer, { domain, includeZero: true }) : deriveRadialArcValues(dataset.values, layer);
  if (proportional && radius !== undefined) {
    const radii = deriveProportionalArcRadiusValues(dataset.values, layer, { includeZero: true });
    const bySource = new Map(radii.map(value => [value.sourceIndices[0], value.radius]));
    values = values.map(value => ({ ...value, radius: bySource.get(value.sourceIndices[0]) }));
  }
  if (domain !== undefined && values.some(value => !domain.includes(value.theta))) throw new Error("Conditional arc theta is outside its scale domain.");
  return { values, measured, proportional };
}

export function conditionalArcStructure(program, layer, dataset) {
  const template = conditionalPositionTemplate(layer, ARC_POSITION_CHANNELS);
  const derived = deriveConditionalArcBranch(program, template, dataset), branches = {};
  const topology = result => canonicalJSON([result.measured, result.proportional, result.values.map(value => value.sourceIndices)]);
  const signature = topology(derived);
  if (derived.proportional && new Set(positionBindings(layer, "theta").map(binding => binding.scale)).size !== 1) {
    throw new Error("Conditional proportional arc theta requires one shared angular scale.");
  }
  for (const channel of ARC_POSITION_CHANNELS) {
    if (layer.conditionals?.[channel] === undefined) continue;
    branches[channel] = positionBindings(layer, channel).map(binding => {
      const result = deriveConditionalArcBranch(program, { ...template, encoding: { ...template.encoding, [channel]: binding } }, dataset);
      if (topology(result) !== signature) throw new Error(`Conditional ${channel} changes arc item membership or layout.`);
      return result;
    });
  }
  return { template, derived, branches };
}
