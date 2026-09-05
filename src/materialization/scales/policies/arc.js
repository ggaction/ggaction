import { validateMeasuredRadiusScale } from "../../../grammar/scales/radial.js";
export function resolveArcAutoPositionRange({
  consumers,
  scale,
  channel,
  domain,
  range,
  markConfigs
}) {
  if (
    (scale.range !== "auto" && scale.range !== undefined) ||
    consumers.length === 0 ||
    !consumers.every(consumer => consumer.layer.mark?.type === "arc")
  ) {
    return range;
  }
  if (channel === "radius") {
    const ratios = consumers.map(
      consumer => markConfigs[consumer.layer.id]?.innerRadius ?? 0
    );
    if (new Set(ratios).size !== 1) {
      throw new Error(
        `Shared arc radius scale "${scale.id}" requires one innerRadius policy.`
      );
    }
    const outer = Math.max(...range);
    return [outer * ratios[0], outer];
  }
  if (
    channel === "theta" &&
    scale.type === "band" &&
    consumers.every(consumer => consumer.encoding.aggregate === undefined)
  ) {
    const step = (range[1] - range[0]) / domain.length;
    return [range[0] - step / 2, range[1] - step / 2];
  }
  return range;
}


export function resolveMeasuredRadiusDomain({ scale, channel, allValues }) {
  if (scale.radialMapping === undefined) return undefined;
  if (channel !== "radius") throw new Error("Measured radius scales support only radius consumers.");
  const maximum = allValues.reduce((maximum, value) => Math.max(maximum, value), -Infinity);
  if (!Number.isFinite(maximum) || maximum <= 0 || allValues.some(value => value < 0)) {
    throw new Error("Measured radius requires finite non-negative aggregates and a positive maximum.");
  }
  const domain = scale.domain === "auto" ? [0, maximum] : scale.domain;
  if (Array.isArray(domain) && domain[1] < maximum) {
    throw new RangeError("Measured radius domain maximum must cover every category aggregate.");
  }
  return domain;
}

export function validateMeasuredRadiusConsumers({ scale, domain, range, consumers, markConfigs, thetaScales }) {
  if (scale.radialMapping === undefined) return;
  validateMeasuredRadiusScale({ ...scale, domain, range });
  for (const { layer, encoding } of consumers) {
    const theta = layer.encoding?.theta;
    const thetaScale = thetaScales[layer.id];
    if (layer.mark?.type !== "arc" || !["count", "sum"].includes(encoding.aggregate) ||
      !["nominal", "ordinal"].includes(theta?.fieldType) || theta.aggregate !== undefined ||
      thetaScale?.type !== "band" || (thetaScale.paddingInner ?? 0) !== 0 || (thetaScale.paddingOuter ?? 0) !== 0) {
      throw new Error("Measured radius requires only equal-angle categorical Arc consumers.");
    }
    const config = markConfigs[layer.id] ?? {};
    if ((config.padAngle ?? 0) !== 0) throw new Error("Measured Arc requires padAngle 0.");
    if (scale.range !== "auto" && config.innerRadiusExplicit === true &&
      Math.abs(config.innerRadius - range[0] / range[1]) > Number.EPSILON * 8) {
      throw new Error("Measured Arc innerRadius must agree with its explicit radius range.");
    }
  }
}
