import { resolveHistogramBins } from "../../../grammar/histogram.js";

export function resolveBinnedPositionDomain({
  valuesByConsumer,
  channel,
  scale,
  id
}) {
  const binnedPositions = valuesByConsumer.filter(
    ({ consumer }) =>
      ["bar", "line"].includes(consumer.layer.mark?.type) &&
      consumer.encoding.bin !== undefined
  );
  if (binnedPositions.length === 0) return undefined;
  const independentConsumers = valuesByConsumer.filter(({ consumer }) =>
    !(consumer.layer.mark?.type === "text" && binnedPositions.some(
      ({ consumer: owner }) => consumer.layer.source === owner.layer.id
    ))
  );
  if (channel !== "x" || binnedPositions.length !== independentConsumers.length) {
    throw new Error(
      `Binned scale "${id}" cannot be shared with an unbinned consumer.`
    );
  }
  const binDefinitions = new Set(
    binnedPositions.map(({ consumer }) => JSON.stringify(consumer.encoding.bin))
  );
  if (binDefinitions.size !== 1) {
    throw new Error(`Binned scale "${id}" requires one shared bin definition.`);
  }
  return resolveHistogramBins({
    values: binnedPositions.flatMap(item => item.values).filter(value => value !== undefined),
    bin: binnedPositions[0].consumer.encoding.bin,
    domain: scale.domain,
    nice: scale.nice ?? true,
    zero: scale.zero ?? false
  }).domain;
}
