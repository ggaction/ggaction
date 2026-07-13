import { validateUserId } from "../../../../core/identifiers.js";
import { sameOrderedValues } from "../../../../core/validation.js";
import { CHANNELS } from "./options.js";
import { nonEmptyString } from "./validation.js";

function isCategoricalTarget(layer) {
  if (layer?.mark?.type === "line") {
    return CHANNELS.some(
      channel => layer.encoding?.[channel]?.scale !== undefined
    );
  }
  return layer?.mark?.type === "bar" &&
    layer.encoding?.color?.scale !== undefined;
}

export function resolveTarget(program, requested) {
  if (requested !== undefined) {
    const id = validateUserId(requested, "Legend target id");
    const layer = program.semanticSpec.layers.find(item => item.id === id);
    if (!isCategoricalTarget(layer)) {
      throw new Error(`Unknown categorical legend target "${id}".`);
    }
    return layer;
  }

  const current = program.semanticSpec.layers.find(
    layer => layer.id === program.context.currentMark
  );
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

function resolveOrdinalScales(program, scaleIds) {
  const scales = scaleIds.map(id => {
    const semantic = program.semanticSpec.scales.find(item => item.id === id);
    const concrete = program.resolvedScales[id];
    if (semantic?.type !== "ordinal" || concrete?.type !== "ordinal") {
      throw new Error(`Legend requires resolved ordinal scale "${id}".`);
    }
    if (!Array.isArray(concrete.domain) || concrete.domain.length === 0) {
      throw new Error(`Legend scale "${id}" requires a non-empty domain.`);
    }
    return concrete;
  });
  if (scales.slice(1).some(scale => !sameValues(scale.domain, scales[0].domain))) {
    throw new Error("Combined legend scales must have identical ordered domains.");
  }
  return { scales, domain: scales[0].domain };
}

export function resolveDefinition(program, layer, requestedChannels, requestedTitle) {
  const kind = layer.mark.type === "bar" ? "color" : "series";
  const channels = requestedChannels ?? (kind === "color"
    ? ["color"]
    : CHANNELS.filter(
        channel => layer.encoding?.[channel]?.scale !== undefined
      ));
  if (
    !Array.isArray(channels) ||
    channels.length === 0 ||
    !channels.every(channel => CHANNELS.includes(channel)) ||
    new Set(channels).size !== channels.length
  ) {
    throw new Error(
      "Legend channels must be a non-empty unique color/strokeDash array."
    );
  }
  if (kind === "color" && !sameValues(channels, ["color"])) {
    throw new Error("Bar legends currently support only the color channel.");
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
  return {
    kind,
    channels,
    scales,
    field,
    title: nonEmptyString(requestedTitle ?? field, "Legend title"),
    domain: resolved.domain
  };
}

export function resolveCurrentDefinition(program, config) {
  const layer = program.semanticSpec.layers.find(
    item => item.id === config.target
  );
  if (layer === undefined) {
    throw new Error(`Unknown categorical legend target "${config.target}".`);
  }
  const guide = program.semanticSpec.guides.legend?.[config.kind];
  if (guide === undefined) {
    throw new Error("Legend rematerialization requires semantic guide state.");
  }
  const channels = config.kind === "series" ? guide.channels : ["color"];
  const definition = resolveDefinition(program, layer, channels, guide.title);
  const storedScales = config.kind === "series" ? guide.scales : [guide.scale];
  if (!sameValues(definition.scales, storedScales)) {
    throw new Error("Legend encodings no longer use the stored guide scales.");
  }
  return definition;
}
