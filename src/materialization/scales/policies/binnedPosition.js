import { isSourceOwnedText } from "../../../grammar/text.js";
import { compositionChannel } from "../../../selectors/plotComposition.js";
import { resolveHistogramBins } from "../../../grammar/histogram.js";

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
  const domain = resolveHistogramBins({
    values: binnedPositions.flatMap(item => item.values).filter(value => value !== undefined),
    bin: binnedPositions[0].consumer.encoding.bin,
    domain: scale.domain,
    nice: scale.nice ?? true,
    zero: scale.zero ?? false
  }).domain;
  if (Array.isArray(scale.domain)) return domain;
  let [minimum, maximum] = domain;
  for (const { values } of independentConsumers) for (const value of values) {
    if (!Number.isFinite(value)) continue;
    minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
  }
  return [minimum, maximum];
}
