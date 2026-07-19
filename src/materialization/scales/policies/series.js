import {
  isTransformedScaleType,
  resolveContinuousDomain,
  resolveTransformedDomain
} from "../../../grammar/scales/index.js";

export function resolveSeriesLayoutDomain({
  id,
  scale,
  valuesByConsumer,
  seriesLayouts
}) {
  if (!seriesLayouts.some(Boolean)) return undefined;
  const activeLayouts = seriesLayouts.filter(Boolean);
  const layouts = new Set(activeLayouts.map(item => item.layout));
  if (layouts.size !== 1) {
    throw new Error(`Series layout scale "${id}" requires one layout policy.`);
  }
  const layoutConsumers = valuesByConsumer.filter(
    (_, index) => seriesLayouts[index] !== undefined
  );
  const directConsumers = valuesByConsumer.filter(
    (_, index) => seriesLayouts[index] === undefined
  );
  const compatibleDirect = directConsumers.every(({ consumer }) =>
    layoutConsumers.every(({ consumer: layoutConsumer }) => {
      const aggregate = layoutConsumer.encoding.aggregate;
      return aggregate !== "count" &&
        consumer.encoding.fieldType === "quantitative" &&
        consumer.encoding.field === layoutConsumer.encoding.field;
    })
  );
  if (!compatibleDirect) {
    throw new Error(
      `Series layout scale "${id}" cannot be shared with another policy.`
    );
  }
  const layout = activeLayouts[0].layout;
  const values = [
    ...activeLayouts.flatMap(item => item.values),
    ...directConsumers.flatMap(item => item.values)
  ];
  if (
    ["group", "overlay"].includes(layout) &&
    scale.domain !== "auto" &&
    (Math.min(...scale.domain) > 0 || Math.max(...scale.domain) < 0)
  ) {
    throw new Error(
      `Series layout scale "${id}" requires an explicit domain containing zero.`
    );
  }
  const nice = layout === "fill" && scale.domain === "auto"
    ? false
    : scale.nice;
  const zero = layout === "fill" && scale.domain === "auto"
    ? false
    : scale.zero;
  return isTransformedScaleType(scale.type)
    ? resolveTransformedDomain({
        type: scale.type,
        domain: scale.domain,
        values,
        nice: nice ?? false,
        zero: zero ?? false,
        ...(scale.base === undefined ? {} : { base: scale.base }),
        ...(scale.exponent === undefined ? {} : { exponent: scale.exponent }),
        ...(scale.constant === undefined ? {} : { constant: scale.constant })
      })
    : resolveContinuousDomain({
        domain: scale.domain,
        values,
        type: scale.type,
        nice,
        zero
      });
}
