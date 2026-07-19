import {
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField
} from "../../../grammar/scales/index.js";
import { findDataset } from "../../../selectors/datasets.js";
import { requireSemanticScale } from "../../../selectors/scales.js";
import { SCALED_ENCODING_CHANNELS } from "../../../core/vocabulary.js";

export function findScale(program, id) {
  return requireSemanticScale(program, id);
}

export function findScaleConsumers(program, id) {
  const consumers = [];
  for (const layer of program.semanticSpec.layers) {
    for (const channel of SCALED_ENCODING_CHANNELS) {
      const encoding = layer.encoding?.[channel];
      if (encoding?.scale === id) consumers.push({ layer, channel, encoding });
    }
  }
  return consumers;
}

export function requireConsumerDataset(program, consumer) {
  const dataset = findDataset(program, consumer.layer.data);
  if (dataset === undefined) {
    throw new Error(
      `Mark "${consumer.layer.id}" references unknown dataset "${consumer.layer.data}".`
    );
  }
  return dataset;
}

export function isDirectCategoricalConsumer(consumer) {
  return ["color", "strokeDash", "xOffset", "yOffset", "shape"].includes(
    consumer.channel
  ) && consumer.encoding.fieldType === "nominal";
}

export function readConsumerFieldValues(
  program,
  consumer,
  dataset,
  scale = findScale(program, consumer.encoding.scale)
) {
  const allowUnknown = Object.hasOwn(scale, "unknown");
  if (isDirectCategoricalConsumer(consumer)) {
    return allowUnknown
      ? readScaleField(
          dataset.values,
          consumer.encoding.field,
          consumer.encoding.fieldType,
          { allowUnknown: true }
        )
      : readNominalField(dataset.values, consumer.encoding.field);
  }
  if (consumer.encoding.fieldType === "temporal") {
    return allowUnknown
      ? readScaleField(dataset.values, consumer.encoding.field, "temporal", {
          allowUnknown: true
        })
      : readTemporalField(dataset.values, consumer.encoding.field);
  }
  if (["nominal", "ordinal"].includes(consumer.encoding.fieldType)) {
    if (!["ordinal", "band", "point"].includes(scale.type)) {
      throw new Error(
        `Scale materialization requires a quantitative encoding on mark "${consumer.layer.id}".`
      );
    }
    return allowUnknown
      ? readScaleField(
          dataset.values,
          consumer.encoding.field,
          consumer.encoding.fieldType,
          { allowUnknown: true }
        )
      : readNominalField(dataset.values, consumer.encoding.field);
  }
  if (consumer.encoding.fieldType !== "quantitative") {
    throw new Error(
      `Scale materialization requires a quantitative encoding on mark "${consumer.layer.id}".`
    );
  }
  return allowUnknown
    ? readScaleField(dataset.values, consumer.encoding.field, "quantitative", {
        allowUnknown: true
      })
    : readQuantitativeField(dataset.values, consumer.encoding.field);
}
