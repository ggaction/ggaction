import { conditionalValues } from "../../../grammar/conditionalState.js";
import { canonicalJSON } from "../../../core/contentDigest.js";
import { readConditionalConsumerValues } from "../../conditionalValues.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { readSeriesIdentity, validatePathSeriesAppearance } from "../../../grammar/pathSeries.js";
import { readAreaEndpoint } from "../../../grammar/areaEndpoints.js";
import { readLinePosition } from "../../../grammar/lineMissing.js";
import { readNominalField, readScaleField } from "../../../grammar/scales/index.js";
import { readCategoricalLineColor, validateCategoricalColorConsumer } from "../../../grammar/scales/colorConsumers.js";
import { readArcColorValues } from "../../../grammar/arcs.js";
import { findDataset } from "../../../selectors/datasets.js";
import { requireSemanticScale } from "../../../selectors/scales.js";
import { SCALED_ENCODING_CHANNELS } from "../../../core/vocabulary.js";
import { applyItemMissingPolicy } from "../../../grammar/itemMissing.js";
import { resolveOverlayGeometry } from "../../overlayGeometry.js";
import { uniqueFields } from "../../selection/items/common.js";

export function findScale(program, id) {
  return requireSemanticScale(program, id);
}

export function findScaleConsumers(program, id) {
  const consumers = [];
  for (const layer of program.semanticSpec.layers) {
    if (isSourceOwnedText(layer)) continue;
    for (const channel of SCALED_ENCODING_CHANNELS) {
      if (layer.derivedBindings?.overlay && ["x", "y", "x2", "y2", "xOffset", "yOffset"].includes(channel)) continue;
      if (layer.derivedBindings?.overlay?.inheritColor && channel === "color") continue;
      const encoding = layer.encoding?.[channel];
      if (encoding?.scale === id) consumers.push({ layer, channel, encoding });
      const bindings = new Set();
      for (const branch of layer.conditionals?.[channel] === undefined ? [] : conditionalValues(layer.conditionals[channel])) {
        if (branch.scale !== id) continue;
        const key = canonicalJSON(branch);
        if (!bindings.has(key)) consumers.push({ layer, channel, encoding: branch, role: "conditional" });
        bindings.add(key);
      }
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
  return applyItemMissingPolicy(consumer.layer, dataset);
}

export function isDirectCategoricalConsumer(consumer) {
  return ["color", "stroke", "strokeDash", "xOffset", "yOffset", "shape"].includes(
    consumer.channel
  ) && ["nominal", "ordinal"].includes(consumer.encoding.fieldType);
}

export function readConsumerFieldValues(
  program,
  consumer,
  dataset,
  scale = findScale(program, consumer.encoding.scale)
) {
  if (consumer.role === "conditional") return readConditionalConsumerValues(program, consumer.layer, consumer.encoding, scale, consumer.channel);
  const { field, fieldType, temporalUnit } = consumer.encoding;
  if (consumer.layer.derivedBindings?.overlay) {
    const groups = resolveOverlayGeometry(program, consumer.layer.derivedBindings.overlay, { geometry: false });
    const rows = consumer.layer.mark.type === "point" ? groups.flatMap(group => group.points.map(point => point.fields))
      : groups.map(group => uniqueFields(group.points.map(point => point.fields)));
    return readScaleField(rows, field, fieldType, { allowUnknown: Object.hasOwn(scale, "unknown"), temporalUnit });
  }
  if (consumer.layer.mark.type === "line" && consumer.layer.mark.missing === "break" &&
      ["x", "y"].includes(consumer.channel)) {
    return readLinePosition(dataset.values, consumer.encoding).filter(value => value !== null);
  }
  if (consumer.channel === "strokeDash") {
    validateCategoricalColorConsumer(consumer.layer, consumer.encoding, scale, "strokeDash");
    return readNominalField(dataset.values, field);
  }
  if (consumer.channel === "color" && ["nominal", "ordinal"].includes(fieldType) &&
      validateCategoricalColorConsumer(consumer.layer, consumer.encoding, scale)) {
    return readCategoricalLineColor(dataset.values, field);
  }
  if (consumer.layer.mark.type === "arc" && consumer.channel === "color") {
    return readArcColorValues(dataset.values, consumer.layer);
  }
  if (consumer.layer.mark.type === "bar" && consumer.layer.encoding?.group !== undefined && ["xOffset", "yOffset"].includes(consumer.channel)) {
    return readSeriesIdentity(dataset.values, consumer.layer).values;
  }
  if (consumer.layer.mark.type === "area" && consumer.channel === "color" && fieldType === "quantitative") {
    validatePathSeriesAppearance(dataset.values, consumer.layer);
    const identities = readSeriesIdentity(dataset.values, consumer.layer).values;
    const values = readScaleField(dataset.values, field, fieldType);
    return [...new Map(identities.map((identity, index) => [identity, values[index]])).values()];
  }
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
