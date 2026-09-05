import { readAreaEndpoint } from "../../../grammar/areaEndpoints.js";
import { readScaleField } from "../../../grammar/scales/index.js";
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
    for (const dimension of layer.encoding?.parallel?.dimensions ?? []) {
      if (dimension.scale === id) {
        consumers.push({
          layer,
          channel: "y",
          encoding: dimension,
          role: "parallelDimension"
        });
      }
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
  const { field, fieldType, temporalUnit } = consumer.encoding;
  const parallel = consumer.role === "parallelDimension";
  if (!parallel && !isDirectCategoricalConsumer(consumer) &&
    fieldType !== "quantitative" && fieldType !== "temporal" &&
    (!["nominal", "ordinal"].includes(fieldType) ||
      !["ordinal", "band", "point"].includes(scale.type))) {
    throw new Error(
      `Scale materialization requires a quantitative encoding on mark "${consumer.layer.id}".`
    );
  }
  if (consumer.layer.mark.type === "area" && ["x", "y", "x2", "y2"].includes(consumer.channel) && fieldType === "quantitative") {
    return readAreaEndpoint(dataset.values, consumer.encoding, consumer.layer.mark.missing).filter(value => value != null);
  }
  return readScaleField(dataset.values, field, fieldType, {
    allowUnknown: parallel || Object.hasOwn(scale, "unknown"), temporalUnit
  });
}
