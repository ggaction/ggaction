export function requireFiniteProperty(properties, property, graphicId) {
  const value = properties[property];

  if (!Number.isFinite(value)) {
    throw new Error(
      `Graphic "${graphicId}" requires a finite ${property} property.`
    );
  }

  return value;
}

export function requireStringProperty(properties, property, graphicId) {
  const value = properties[property];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-empty ${property} property.`
    );
  }

  return value;
}
