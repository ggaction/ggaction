import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarGrain,
  resolveBarOffsetChannel
} from "../../../grammar/bars/policy.js";
import { resolveOffsetScaleDefinition } from "../../scales/definitions.js";
import { isRangedArea } from "./policy.js";

export function applyColorLayoutCompanion(
  program,
  { target, layer, layout, scale, field }
) {
  if (layout === undefined || layer.mark.type === "arc") return program;
  if (
    layer.mark.type === "bar" &&
    resolveBarGrain(layer) === BAR_GRAINS.ranged
  ) {
    return program;
  }
  if (
    layer.mark.type === "area" &&
    [layer.encoding?.x, layer.encoding?.y].some(
      encoding => ["nominal", "ordinal"].includes(encoding?.fieldType)
    )
  ) {
    return program;
  }
  if (isRangedArea(layer)) return program;
  const channels = layer.mark.type === "bar"
    ? resolveBarChannels(layer)
    : undefined;
  const measureChannel = channels?.measure ?? "y";
  const measure = layer.encoding?.[measureChannel];
  if (measure?.field === undefined || measure.scale === undefined) {
    throw new Error(`Color layout on mark "${target}" requires a measure encoding.`);
  }
  const stack = layout === "fill"
    ? "normalize"
    : layout === "center"
      ? "center"
    : layout === "overlay" || layout === "group"
      ? null
      : "zero";
  let next = program;
  if (layout === "group") {
    const offsetChannel = resolveBarOffsetChannel(layer);
    const method = offsetChannel === "xOffset" ? "encodeXOffset" : "encodeYOffset";
    next = next[method]({
      field,
      target,
      scale: {
        ...(layer.encoding?.[offsetChannel]?.scale === undefined
          ? {}
          : { id: layer.encoding[offsetChannel].scale }),
        domain: scale.domain
      }
    });
  }
  return next[measureChannel === "x" ? "encodeX" : "encodeY"]({
    target,
    field: measure.field,
    fieldType: measure.fieldType,
    ...(measure.aggregate === undefined ? {} : { aggregate: measure.aggregate }),
    stack
  });
}

export function preSynchronizeGroupedOffset(
  program,
  { target, layer, layout, field, fieldType, scale, requestedScale }
) {
  if (
    layer.mark.type !== "bar" ||
    layout !== "group" ||
    layer.encoding?.color?.scale !== scale.id ||
    !Object.keys(requestedScale).some(key => key !== "id")
  ) {
    return program;
  }
  const offsetChannel = resolveBarOffsetChannel(layer);
  const offset = layer.encoding?.[offsetChannel];
  if (offset?.scale === undefined) return program;
  const offsetScale = resolveOffsetScaleDefinition(program, {
    id: offset.scale,
    domain: scale.domain
  }, offsetChannel);
  return program
    .editSemantic({
      property: `layer[${target}].encoding.${offsetChannel}.field`,
      value: field
    })
    .editSemantic({
      property: `layer[${target}].encoding.${offsetChannel}.fieldType`,
      value: fieldType
    })
    .editSemantic({
      property: `scale[${offsetScale.id}].domain`,
      value: offsetScale.domain
    });
}
