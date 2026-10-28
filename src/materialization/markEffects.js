// False is an authoring reset, never a concrete primitive value. Invoke after
// role and per-item overrides have resolved so an item can disable its base effect.
export function materializeMarkEffectProperties(properties) {
  const { outline, shadow, ...rest } = properties;
  return { ...rest, ...(outline === undefined || outline === false ? {} : { outline }),
    ...(shadow === undefined || shadow === false ? {} : { shadow }) };
}
