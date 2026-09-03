import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import {
  interpolateNumber,
  inverseLerp
} from "../../../grammar/numeric.js";
export function resolveTemporalBarBand(valuesByConsumer, domain, range) {
  const temporalBars = valuesByConsumer.filter(({ consumer }) => {
    const channels = resolveBarChannels(consumer.layer);
    return resolveBarGrain(consumer.layer) === BAR_GRAINS.aggregate &&
      channels?.category === consumer.channel &&
      consumer.encoding.fieldType === "temporal";
  });
  if (temporalBars.length === 0) return undefined;
  const temporalFields = new Set(
    temporalBars.map(({ consumer }) => consumer.encoding.field)
  );
  const compatibleConsumers = valuesByConsumer.filter(({ consumer }) =>
    ["line", "rule", "text"].includes(consumer.layer.mark?.type) &&
      consumer.encoding.fieldType === "temporal" &&
      temporalFields.has(consumer.encoding.field)
  );
  if (
    temporalBars.length + compatibleConsumers.length !==
    valuesByConsumer.length
  ) {
    throw new Error(
      "A temporal bar position scale requires compatible bar, line, rule, or text consumers of one field."
    );
  }
  const values = temporalBars.flatMap(item => item.values);
  const ordered = [...new Set(values)].sort((left, right) => left - right);
  if (ordered.length < 2) {
    throw new Error("Temporal bar position requires at least two distinct values.");
  }
  let minimumGap = Infinity;
  for (let index = 1; index < ordered.length; index += 1) {
    minimumGap = Math.min(minimumGap, ordered[index] - ordered[index - 1]);
  }
  const domainSpan = Math.abs(domain[1] - domain[0]);
  if (!(minimumGap > 0) || !(domainSpan > 0)) {
    throw new Error("Temporal bar position requires an increasing time domain.");
  }
  const direction = Math.sign(range[1] - range[0]) || 1;
  const bandwidthFraction = minimumGap / (domainSpan + minimumGap);
  const directBandwidth = Math.abs(range[1] - range[0]) * minimumGap /
    (domainSpan + minimumGap);
  const directRange = [
    range[0] + direction * directBandwidth / 2,
    range[1] - direction * directBandwidth / 2
  ];
  const stable = !Number.isFinite(directBandwidth) ||
    !directRange.every(Number.isFinite);
  const estimatedBandwidth = stable
    ? Math.abs(
      interpolateNumber(range[0], range[1], bandwidthFraction) - range[0]
    )
    : directBandwidth;
  const resolvedRange = stable
    ? [
        interpolateNumber(range[0], range[1], bandwidthFraction / 2),
        interpolateNumber(range[0], range[1], 1 - bandwidthFraction / 2)
      ]
    : directRange;
  const resolvedSpan = resolvedRange[1] - resolvedRange[0];
  const positions = ordered.map(value => {
    const direct = resolvedRange[0] +
      (value - domain[0]) / (domain[1] - domain[0]) * resolvedSpan;
    return Number.isFinite(direct)
      ? direct
      : interpolateNumber(
        resolvedRange[0],
        resolvedRange[1],
        inverseLerp(value, domain[0], domain[1])
      );
  });
  let bandwidth = Infinity;
  for (let index = 1; index < positions.length; index += 1) {
    bandwidth = Math.min(
      bandwidth,
      Math.abs(positions[index] - positions[index - 1])
    );
  }
  if (![estimatedBandwidth, bandwidth, ...resolvedRange].every(Number.isFinite)) {
    throw new RangeError("Temporal bar position exceeds the finite numeric range.");
  }
  return { bandwidth, range: resolvedRange };
}
