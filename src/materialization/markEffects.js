// False is an authoring reset, never a concrete primitive value. Invoke after
// role and per-item overrides have resolved so an item can disable its base effect.
export function materializeMarkEffectProperties(properties) {
  const { outline, shadow, ...rest } = properties;
  return { ...rest, ...(outline === undefined || outline === false ? {} : { outline }),
    ...(shadow === undefined || shadow === false ? {} : { shadow }) };
}

// Native final mark output and prepared animation resolve authored effects here.
export function resolveMarkEffectProperties(layer, config, input) {
  const { outline: previousOutline, shadow: previousShadow, blend: previousBlend, ...properties } = input;
  void previousOutline; void previousShadow; void previousBlend;
  const owner = layer.mark.type === "bar" ? config?.barAppearance : config;
  if (owner?.outline !== undefined && owner.outline !== false) properties.outline = owner.outline;
  if (owner?.shadow !== undefined && owner.shadow !== false) properties.shadow = owner.shadow;
  if (Object.hasOwn(layer.mark, "blend")) properties.blend = layer.mark.blend;
  return properties;
}
