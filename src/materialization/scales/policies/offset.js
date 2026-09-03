import { normalizeOffsetPadding } from "../../../grammar/bars/geometry.js";

function resolveParentSlot(consumer, resolvedScales, parentChannel) {
  if (parentChannel === "x" && consumer.layer.encoding?.x?.bin !== undefined) {
    return 1;
  }
  const parentScaleId = consumer.layer.encoding?.[parentChannel]?.scale;
  const parentScale = resolvedScales[parentScaleId];
  if (Number.isFinite(parentScale?.bandwidth) && parentScale.bandwidth > 0) {
    return parentScale.bandwidth;
  }
  if (parentScale?.type === "point" && Number.isFinite(parentScale.step)) {
    return Math.abs(parentScale.step);
  }
  return undefined;
}

export function resolveOffsetScalePolicy({
  consumers,
  resolvedScales,
  markConfigs,
  id,
  channel
}) {
  const parentChannel = channel === "xOffset" ? "x" : "y";
  const slots = consumers.map(consumer =>
    resolveParentSlot(consumer, resolvedScales, parentChannel)
  );
  if (
    slots.some(value => !Number.isFinite(value) || value <= 0) ||
    new Set(slots).size !== 1
  ) {
    throw new Error(
      `${channel} scale "${id}" requires one shared resolved ${parentChannel} categorical slot.`
    );
  }
  const paddings = consumers.map(consumer => normalizeOffsetPadding(
    markConfigs[consumer.layer.id]?.[channel],
    undefined,
    channel
  ));
  const signatures = new Set(
    paddings.map(padding => JSON.stringify(padding))
  );
  if (signatures.size !== 1) {
    throw new Error(
      `${channel} scale "${id}" requires one shared padding policy.`
    );
  }
  return {
    parentBandwidth: slots[0],
    ...paddings[0]
  };
}
