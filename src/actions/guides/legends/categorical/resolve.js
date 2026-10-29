import { conditionalLegendLayer } from "../../../../materialization/legendEncodings.js";
import { resolveSizeShapeMapping } from "../../../../grammar/legendCombinations.js";
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
import { findLegendLayer as findLayer } from "../../../../materialization/legendEncodings.js";
import { findSemanticScale } from "../../../../selectors/scales.js";
import { horizonLegendPresentation } from "../../../../grammar/horizon.js";

function isCategoricalTarget(layer) {
  if (["line", "point"].includes(layer?.mark?.type)) {
    return CHANNELS.some(
      channel => layer.encoding?.[channel]?.scale !== undefined
    );
  }
  return ["bar", "area", "arc", "rect", "rule", "tick", "text", "table", "pyramid", "ohlc", "waterfall", "trail"].includes(
    layer?.mark?.type
  ) && ["color", "stroke"].some(
    channel => layer.encoding?.[channel]?.scale !== undefined
  );
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
  const candidates = program.semanticSpec.layers.map(layer => conditionalLegendLayer(layer)).filter(isCategoricalTarget);
  if (candidates.length !== 1) {
    throw new Error(
      "createLegend requires target when the categorical mark is ambiguous."
    );
  }
  return candidates[0];
}

export const sameValues = sameOrderedValues;

function resolveLegendKind(program, layer, requestedChannels) {
  if (sameValues(requestedChannels, ["stroke"])) return "stroke";
  if (["bar", "area", "arc", "rect", "text", "table", "pyramid", "ohlc", "waterfall", "trail"].includes(layer.mark.type)) return "color";
  if (
    sameValues(requestedChannels, ["color"]) &&
    (layer.mark.type === "point" || program.guideConfigs.legend?.color?.target === layer.id ||
      (program.guideConfigs.legend?.series?.target === layer.id &&
       program.guideConfigs.legend.series.field !== layer.encoding.color?.field))
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
  if (scales.slice(1).some(scale => scale.domain.length !== scales[0].domain.length ||
      scale.domain.some(value => !scales[0].domain.some(other => Object.is(value, other))))) {
    throw new Error("Combined legend scales must contain the same domain values.");
  }
  return { scales, domain: scales[0].domain };
}

export function resolveDefinition(program, layer, requestedChannels, requestedTitle, order, preferredKind) {
  const channels = requestedChannels ?? CHANNELS.filter(
    channel => layer.encoding?.[channel]?.scale !== undefined
  );
  const sizeShape = channels?.length === 2 && channels.includes("size") && channels.includes("shape");
  if (sizeShape && (layer.mark.type !== "point" || !["nominal", "ordinal"].includes(layer.encoding.size?.fieldType))) {
    throw new Error("Combined size-shape requires one categorical point owner.");
  }
  const kind = preferredKind ?? resolveLegendKind(program, layer, channels);
  if (
    !Array.isArray(channels) ||
    channels.length === 0 ||
    !channels.every(channel => CHANNELS.includes(channel) || sizeShape && channel === "size") ||
    new Set(channels).size !== channels.length
  ) {
    throw new Error(
      "Legend channels must be a non-empty unique color/strokeDash/shape array."
    );
  }
  if (["color", "stroke"].includes(kind) && !sameValues(channels, [kind])) {
    throw new Error(`${kind} legends currently support only the ${kind} channel.`);
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
  const transform = requireDataset(program, layer.data).transform?.[0];
  const horizon = field === transform?.as?.color ? horizonLegendPresentation(transform) : undefined;
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
    title: nonEmptyString(requestedTitle ?? horizon?.title ?? field, "Legend title"),
    ...(horizon === undefined ? {} : { defaultLabelMap: horizon.labelMap }),
    domain: resolveLegendOrderDomain(resolved.domain, order, linked,
      order?.values === undefined ? undefined : readNominalField(requireDataset(program, layer.data).values, field)),
    ...(sizeShape ? {combine:"size-shape",...resolveSizeShapeMapping({layer,
      scales:program.resolvedScales,order,rows:requireDataset(program,layer.data).values})} : {})
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
  const channels = config.kind === "series" ? guide.channels : [config.kind];
  return resolveDefinition(
    program,
    layer,
    channels,
    config.inferredTitle === true ? undefined : guide.title,
    guide.order
  );
}
