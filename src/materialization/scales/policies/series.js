import { isSourceOwnedText } from "../../../grammar/text.js";
import {
  isTransformedScaleType,
  resolveContinuousDomain,
  resolveTransformedDomain
} from "../../../grammar/scales/index.js";
import { numericExtent } from "../../../grammar/numeric.js";
import { compositionChannel } from "../../../selectors/plotComposition.js";

export function resolveSeriesLayoutDomain({
  program,
  id,
  scale,
  valuesByConsumer,
  seriesLayouts
}) {
  if (!seriesLayouts.some(Boolean)) return undefined;
  const activeLayouts = seriesLayouts.filter(Boolean);
  const layouts = new Set(activeLayouts.map(item => item.layout));
  // Independent native layers may use different layouts in the same value
  // units. Only normalized/centered policies change the axis interpretation.
  if (layouts.size !== 1 && [...layouts].some(layout => !["group", "overlay", "stack", "diverging"].includes(layout))) {
    throw new Error(`Series layout scale "${id}" requires one layout policy.`);
  }
  const layoutConsumers = valuesByConsumer.filter(
    (_, index) => seriesLayouts[index] !== undefined
  );
  const directConsumers = valuesByConsumer.filter(
    ({ consumer, scalePolicy }, index) =>
      scalePolicy !== false &&
      seriesLayouts[index] === undefined &&
      !isSourceOwnedText(consumer.layer)
  );
  const layout = activeLayouts[0].layout;
  const compatibleDirect = directConsumers.every(({ consumer }) =>
    layoutConsumers.every(({ consumer: layoutConsumer }) => {
      const aggregate = layoutConsumer.encoding.aggregate;
      const directEncoding = consumer.encoding;
      return directEncoding.fieldType === "quantitative" && (
        layout === "overlay" ||
        Object.hasOwn(directEncoding, "datum") ||
        (
            (directEncoding.field === layoutConsumer.encoding.field || program &&
              compositionChannel(program, directEncoding, consumer.layer.data)?.field ===
                compositionChannel(program, layoutConsumer.encoding, layoutConsumer.layer.data)?.field) && (
            aggregate !== "count" || (directEncoding.aggregate === "count" &&
              JSON.stringify(consumer.layer.encoding.x?.bin) === JSON.stringify(layoutConsumer.layer.encoding.x?.bin))
          )
        )
      );
    })
  );
  if (!compatibleDirect) {
    throw new Error(
      `Series layout scale "${id}" cannot be shared with another policy.`
    );
  }
  const values = [
    ...activeLayouts.flatMap(item => item.values),
    ...directConsumers.flatMap(item => item.values)
  ];
  if (["center", "wiggle"].includes(layout) && scale.domain !== "auto") {
    const [minimum, maximum] = numericExtent(values);
    const [domainMinimum, domainMaximum] = numericExtent(scale.domain);
    if (domainMinimum > minimum || domainMaximum < maximum) {
      throw new Error(
        layout === "center" ? `Center layout scale "${id}" explicit domain must contain every centered bound.`
          : `Wiggle layout scale "${id}" explicit domain must contain every resolved bound.`
      );
    }
  }
  if (
    [...layouts].some(item => ["group", "overlay"].includes(item)) &&
    scale.domain !== "auto" &&
    (numericExtent(scale.domain)[0] > 0 || numericExtent(scale.domain)[1] < 0)
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
