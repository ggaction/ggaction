import { commonPositionBinding } from "../../core/encodingBindings.js";
import { isConditionalPositionChannel } from "../../grammar/conditionalPosition.js";

// One branch payload policy is shared by direct encoding and aggregate preflight.
export function conditionalBranchRequest(layer, channel, definition) {
  const explicitYScales = new Set(channel === "y" ? [...definition.conditions.map(condition => condition.value), definition.otherwise]
    .map(value => value?.scale?.id).filter(id => id !== undefined) : []);
  const sharedYScale = explicitYScales.size === 1 ? [...explicitYScales][0]
    : commonPositionBinding(layer, "y")?.scale ?? commonPositionBinding(layer, "y2")?.scale ?? "y";
  const positional = isConditionalPositionChannel(channel);
  const textChannel = ["text", "dx", "dy"].includes(channel);
  return function branchRequest(value, path) {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.hasOwn(value, "target")) throw new TypeError("Conditional values require an encoder payload without target.");
    const field = Object.hasOwn(value, "field");
    const previous = (path[0] === "otherwise" ? layer.conditionals?.[channel]?.otherwise : layer.conditionals?.[channel]?.conditions[path[1]]?.value)
      ?? (channel === "text" || positional ? layer.encoding?.[channel] : undefined);
    const coupledScale = ["x2", "y2"].includes(channel) ? commonPositionBinding(layer, channel[0])?.scale
      : ["bar", "area"].includes(layer.mark.type) && ["x", "y"].includes(channel) ? commonPositionBinding(layer, `${channel}2`)?.scale
      : layer.mark.type === "arc" && channel === "theta"
        ? commonPositionBinding(layer, channel)?.scale ?? `${layer.id}-theta` : undefined;
    const payload = (field || positional) && channel !== "angle" && !textChannel ? { ...value, scale: { ...value.scale,
      id: value.scale?.id ?? (channel === "y" ? sharedYScale : undefined) ?? previous?.scale ?? coupledScale ?? `${layer.id}-${channel}-${path[0] === "otherwise" ? "otherwise" : `condition-${path[1]}`}` } } : value;
    return { field, previous, payload };
  };
}
