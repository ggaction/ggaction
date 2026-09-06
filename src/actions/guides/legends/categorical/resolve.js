import { requireDataset } from "../../../../selectors/datasets.js";
import { readNominalField } from "../../../../grammar/scales/fields.js";
import { resolveLegendOrderDomain } from "../../../../grammar/categoryOrder.js";
import { validateUserId } from "../../../../core/identifiers.js";
import {
  sameOrderedValues,
  validateGeneratedItemLimit
} from "../../../../core/validation.js";
import { CHANNELS } from "./options.js";
import { nonEmptyString } from "./validation.js";
import { findLayer } from "../../../../selectors/layers.js";
import { findSemanticScale } from "../../../../selectors/scales.js";

function isCategoricalTarget(layer) {
  if (["line", "point"].includes(layer?.mark?.type)) {
    return CHANNELS.some(
      channel => layer.encoding?.[channel]?.scale !== undefined
    );
  }
  return ["bar", "area", "arc", "rect"].includes(layer?.mark?.type) &&
    layer.encoding?.color?.scale !== undefined;
}

export function resolveTarget(program, requested) {
  if (requested !== undefined) {
    const id = validateUserId(requested, "Legend target id");
    const layer = findLayer(program, id);
    if (!isCategoricalTarget(layer)) {
      throw new Error(`Unknown categorical legend target "${id}".`);
    }
    return layer;
  }

  const current = findLayer(program, program.context.currentMark);
  if (isCategoricalTarget(current)) return current;
  const candidates = program.semanticSpec.layers.filter(isCategoricalTarget);
  if (candidates.length !== 1) {
    throw new Error(
      "createLegend requires target when the categorical mark is ambiguous."
    );
  }
  return candidates[0];
}

export const sameValues = sameOrderedValues;

function resolveLegendKind(layer, requestedChannels) {
  if (["bar", "area", "arc", "rect"].includes(layer.mark.type)) return "color";
  if (
    layer.mark.type === "point" &&
    sameValues(requestedChannels, ["color"])
  ) {
    return "color";
  }
  return "series";
}

function resolveOrdinalScales(program, scaleIds) {
  const scales = scaleIds.map(id => {
    const semantic = findSemanticScale(program, id);
    const concrete = program.resolvedScales[id];
    if (semantic?.type !== "ordinal" || concrete?.type !== "ordinal") {
      throw new Error(`Legend requires resolved ordinal scale "${id}".`);
    }
    if (!Array.isArray(concrete.domain) || concrete.domain.length === 0) {
      throw new Error(`Legend scale "${id}" requires a non-empty domain.`);
    }
    validateGeneratedItemLimit(
      concrete.domain.length,
      "Categorical legend item count"
    );
    return concrete;
  });
  if (scales.slice(1).some(scale => !sameValues(scale.domain, scales[0].domain))) {
    throw new Error("Combined legend scales must have identical ordered domains.");
  }
  return { scales, domain: scales[0].domain };
}

export function resolveDefinition(program, layer, requestedChannels, requestedTitle, order) {
  const channels = requestedChannels ?? (["line", "point"].includes(layer.mark.type)
    ? CHANNELS.filter(channel => layer.encoding?.[channel]?.scale !== undefined)
    : ["color"]);
  const kind = resolveLegendKind(layer, channels);
  if (
    !Array.isArray(channels) ||
    channels.length === 0 ||
    !channels.every(channel => CHANNELS.includes(channel)) ||
    new Set(channels).size !== channels.length
  ) {
    throw new Error(
      "Legend channels must be a non-empty unique color/strokeDash/shape array."
    );
  }
  if (kind === "color" && !sameValues(channels, ["color"])) {
    throw new Error("Color legends currently support only the color channel.");
  }

  const encodings = channels.map(channel => {
    const encoding = layer.encoding?.[channel];
    if (encoding?.scale === undefined) {
      throw new Error(`Legend target does not encode channel "${channel}".`);
    }
    return { channel, encoding };
  });
  const fields = new Set(encodings.map(item => item.encoding.field));
  if (fields.size !== 1) {
    throw new Error("Combined legend channels must encode the same field.");
  }
  const scales = encodings.map(item => item.encoding.scale);
  const resolved = resolveOrdinalScales(program, scales);
  const field = [...fields][0];
  let linked;
  if (order?.channel !== undefined) {
    const position = layer.encoding?.[order.channel];
    if (!["nominal", "ordinal"].includes(position?.fieldType) || position.field !== field) {
      throw new Error("Linked legend order requires the same categorical field on its target.");
    }
    linked = program.resolvedScales[position.scale]?.domain;
  }
  return {
    kind,
    channels,
    scales,
    field,
    title: nonEmptyString(requestedTitle ?? field, "Legend title"),
    domain: resolveLegendOrderDomain(resolved.domain, order, linked,
      order?.values === undefined ? undefined : readNominalField(requireDataset(program, layer.data).values, field))
  };
}

export function resolveCurrentDefinition(program, config) {
  const layer = findLayer(program, config.target);
  if (layer === undefined) {
    throw new Error(`Unknown categorical legend target "${config.target}".`);
  }
  const guide = program.semanticSpec.guides.legend?.[config.kind];
  if (guide === undefined) {
    throw new Error("Legend rematerialization requires semantic guide state.");
  }
  const channels = config.kind === "series" ? guide.channels : ["color"];
  return resolveDefinition(
    program,
    layer,
    channels,
    config.inferredTitle === true ? undefined : guide.title,
    guide.order
  );
}
