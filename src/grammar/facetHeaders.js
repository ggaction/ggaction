export function validateFacetHeaderRotations(value) {
  for (const config of value.common === undefined ? [value] : [value.common, value.row, value.column]) {
    if (config?.rotation !== undefined && !Number.isFinite(config.rotation)) {
      throw new TypeError("Facet header rotation must contain finite normalized radians.");
    }
  }
}

