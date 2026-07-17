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
