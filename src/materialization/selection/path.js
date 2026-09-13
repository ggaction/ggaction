function translateCommand(command, offset) {
  const translated = { ...command };
  for (const key of ["x", "x1", "x2"]) {
    if (Number.isFinite(translated[key])) translated[key] += offset.x;
  }
  for (const key of ["y", "y1", "y2"]) {
    if (Number.isFinite(translated[key])) translated[key] += offset.y;
  }
  return translated;
}

export function transformPathHighlightProperties(properties, style) {
  const { offset = { x: 0, y: 0 }, ...appearance } = style;
  return {
    ...properties,
    ...appearance,
    ...(offset.x === 0 && offset.y === 0
      ? {}
      : {
          commands: properties.commands.map(command =>
            translateCommand(command, offset)
          )
        })
  };
}

export function transformRuleHighlightProperties(properties, style) {
  const { offset, ...appearance } = style;
  return {
    ...properties,
    ...appearance,
    x1: properties.x1 + offset.x,
    x2: properties.x2 + offset.x,
    y1: properties.y1 + offset.y,
    y2: properties.y2 + offset.y
  };
}
