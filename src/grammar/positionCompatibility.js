export const POSITION_FIELD_COMPATIBILITY = Object.freeze({
  point: Object.freeze({
    x: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    y: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    theta: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    radius: Object.freeze(["quantitative"])
  }),
  line: Object.freeze({
    x: Object.freeze(["quantitative", "temporal"]),
    y: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    theta: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    radius: Object.freeze(["quantitative"])
  }),
  area: Object.freeze({
    x: Object.freeze(["quantitative", "temporal"]),
    y: Object.freeze(["quantitative", "temporal"])
  }),
  arc: Object.freeze({
    theta: Object.freeze(["ordinal", "nominal"]),
    radius: Object.freeze(["quantitative"])
  }),
  rule: Object.freeze({
    x: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    y: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"])
  }),
  bar: Object.freeze({
    x: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    y: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"])
  }),
  text: Object.freeze({
    x: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    y: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"])
  }),
  rect: Object.freeze({
    x: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"]),
    y: Object.freeze(["quantitative", "temporal", "ordinal", "nominal"])
  })
});

export function validatePositionFieldCompatibility(mark, channel, fieldType) {
  const supported = POSITION_FIELD_COMPATIBILITY[mark]?.[channel];
  if (supported === undefined || !supported.includes(fieldType)) {
    throw new Error(
      `${mark} ${channel} position does not support field type "${fieldType}".`
    );
  }
  return fieldType;
}
