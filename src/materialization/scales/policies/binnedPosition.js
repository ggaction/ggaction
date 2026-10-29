import { findMarkFilterDataset } from "../../../selectors/datasets.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { compositionChannel } from "../../../selectors/plotComposition.js";
import { findHistogramBinIndex, resolveHistogramBins } from "../../../grammar/histogram.js";

export function resolveBinnedPositionDomain({
  valuesByConsumer,
  program,
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
  const independentConsumers = valuesByConsumer.filter(({ consumer, scalePolicy }) =>
    scalePolicy !== false && !isSourceOwnedText(consumer.layer) && consumer.layer.mark?.type !== "tick"
  );
  const signature = consumer => {
    const role = program && compositionChannel(program, consumer.encoding, consumer.layer.data);
    return role && role.fieldType === "quantitative" ? JSON.stringify([
      role.field ?? null, role.fields ?? null, role.measurement.unit, role.temporalUnit ?? null
    ]) : undefined;
  };
  const expected = signature(binnedPositions[0].consumer);
  // Binning changes sampling, not the physical value units of a position.
  // Raw points and compatible summary paths can share that coordinate while
  // retaining their own observations and the binned mark's original bins.
  const compatibleUnbinned = expected !== undefined && independentConsumers.every(({ consumer }) =>
    signature(consumer) === expected);
  if (channel !== "x" || (binnedPositions.length !== independentConsumers.length && !compatibleUnbinned)) {
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
  const bins = resolveHistogramBins({
    values: binnedPositions.flatMap(item => item.values).filter(value => value !== undefined),
    bin: binnedPositions[0].consumer.encoding.bin,
    domain: scale.domain,
    nice: scale.nice ?? true,
    zero: scale.zero ?? false
  });
  if (Array.isArray(scale.domain)) return bins.domain;
  let [minimum, maximum] = bins.domain;
  // A final-item filter freezes the bin partition so surviving observations
  // are never rebinned. Those boundaries describe the partition, not a fixed
  // display domain: auto scales follow the retained bins' complete intervals.
  // An unfiltered consumer still contributes its full requested bin extent.
  if (binnedPositions.every(({ consumer }) => program && findMarkFilterDataset(program, consumer.layer))) {
    let first = Infinity, last = -1;
    for (const { values } of binnedPositions) for (const value of values) {
      if (!Number.isFinite(value)) continue;
      const index = findHistogramBinIndex(value, bins.boundaries);
      if (index < 0) continue;
      first = Math.min(first, index); last = Math.max(last, index);
    }
    if (last >= 0) {
      minimum = bins.boundaries[first]; maximum = bins.boundaries[last + 1];
      if (scale.zero) { minimum = Math.min(0, minimum); maximum = Math.max(0, maximum); }
    }
  }
  for (const { values } of independentConsumers) for (const value of values) {
    if (!Number.isFinite(value)) continue;
    minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
  }
  return [minimum, maximum];
}
