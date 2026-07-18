import { normalizeOffsetPadding } from "../../../grammar/bars/geometry.js";
import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import { resolveHistogramBins } from "../../../grammar/histogram.js";

export function resolveBinnedBarDomain({
  valuesByConsumer,
  channel,
  scale,
  id,
  allValues
}) {
  const binnedBars = valuesByConsumer.filter(
    ({ consumer }) =>
      consumer.layer.mark?.type === "bar" &&
      consumer.encoding.bin !== undefined
  );
  if (binnedBars.length === 0) return undefined;
  if (channel !== "x" || binnedBars.length !== valuesByConsumer.length) {
    throw new Error(
      `Binned scale "${id}" cannot be shared with an unbinned consumer.`
    );
  }
  const binDefinitions = new Set(
    binnedBars.map(({ consumer }) => JSON.stringify(consumer.encoding.bin))
  );
  if (binDefinitions.size !== 1) {
    throw new Error(`Binned scale "${id}" requires one shared bin definition.`);
  }
  return resolveHistogramBins({
    values: allValues,
    bin: binnedBars[0].consumer.encoding.bin,
    domain: scale.domain,
    nice: scale.nice ?? true,
    zero: scale.zero ?? false
  }).domain;
}

export function resolveOffsetScalePolicy({
  consumers,
  resolvedScales,
  markConfigs,
  id,
  channel
}) {
  const parentChannel = channel === "xOffset" ? "x" : "y";
  const bandwidths = consumers.map(consumer => {
    if (parentChannel === "x" && consumer.layer.encoding?.x?.bin !== undefined) {
      return 1;
    }
    const parentScaleId = consumer.layer.encoding?.[parentChannel]?.scale;
    return resolvedScales[parentScaleId]?.bandwidth;
  });
  if (
    bandwidths.some(value => !Number.isFinite(value)) ||
    new Set(bandwidths).size !== 1
  ) {
    throw new Error(
      `${channel} scale "${id}" requires one shared resolved ${parentChannel} bandwidth.`
    );
  }
  const paddings = consumers.map(consumer => normalizeOffsetPadding(
    markConfigs[consumer.layer.id]?.[channel],
    undefined,
    channel
  ));
  const signatures = new Set(
    paddings.map(padding => JSON.stringify(padding))
  );
  if (signatures.size !== 1) {
    throw new Error(
      `${channel} scale "${id}" requires one shared padding policy.`
    );
  }
  return {
    parentBandwidth: bandwidths[0],
    ...paddings[0]
  };
}

export function resolveTemporalBarBand(consumers, domain, range, values) {
  const temporalBars = consumers.filter(consumer => {
    const channels = resolveBarChannels(consumer.layer);
    return resolveBarGrain(consumer.layer) === BAR_GRAINS.aggregate &&
      channels?.category === consumer.channel &&
      consumer.encoding.fieldType === "temporal";
  });
  if (temporalBars.length === 0) return undefined;
  if (temporalBars.length !== consumers.length) {
    throw new Error(
      "A temporal bar position scale cannot share a non-bar layout policy."
    );
  }
  const ordered = [...new Set(values)].sort((left, right) => left - right);
  if (ordered.length < 2) {
    throw new Error("Temporal bar position requires at least two distinct values.");
  }
  const minimumGap = Math.min(
    ...ordered.slice(1).map((value, index) => value - ordered[index])
  );
  const domainSpan = Math.abs(domain[1] - domain[0]);
  if (!(minimumGap > 0) || !(domainSpan > 0)) {
    throw new Error("Temporal bar position requires an increasing time domain.");
  }
  const direction = Math.sign(range[1] - range[0]) || 1;
  const estimatedBandwidth = Math.abs(range[1] - range[0]) * minimumGap /
    (domainSpan + minimumGap);
  const resolvedRange = [
    range[0] + direction * estimatedBandwidth / 2,
    range[1] - direction * estimatedBandwidth / 2
  ];
  const positions = ordered.map(value =>
    resolvedRange[0] +
      (value - domain[0]) / (domain[1] - domain[0]) *
      (resolvedRange[1] - resolvedRange[0])
  );
  const bandwidth = Math.min(
    ...positions.slice(1).map((value, index) => Math.abs(value - positions[index]))
  );
  return { bandwidth, range: resolvedRange };
}
