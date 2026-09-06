import { isPlainObject } from "../../../core/immutable.js";
import { findSemanticScale } from "../../../selectors/scales.js";

export function requireDensityField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

export function resolveDensityScaleOptions(value, defaults, label) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const scale = { ...defaults, ...(value ?? {}) };
  if (value?.type === "log" && value.zero === undefined) delete scale.zero;
  return scale;
}

export function resolveDensityCategoryScaleOptions(value, fallbackId) {
  const scale = resolveDensityScaleOptions(
    value,
    { type: "band" },
    "Density placement scale"
  );
  if ((scale.type ?? "band") !== "band") {
    throw new Error('Density category placement requires scale type "band".');
  }
  return {
    ...(fallbackId === undefined ? {} : { id: fallbackId }),
    ...scale,
    type: "band"
  };
}

function valueScaleForTransition(program, layer, transform) {
  const densityChannel = transform.placement?.channel ?? (
    layer.encoding.x.field === transform.as[1] ? "x" : "y"
  );
  const valueChannel = densityChannel === "x" ? "y" : "x";
  return findSemanticScale(program, layer.encoding[valueChannel].scale);
}

export function resolveDensityTransitionScaleDefinitions(
  program,
  layer,
  transform,
  placement,
  rawPlacement,
  rawValueScale
) {
  const valueScale = valueScaleForTransition(program, layer, transform);
  if (valueScale === undefined) {
    throw new Error(`Density area "${layer.id}" requires its value scale.`);
  }
  if (rawValueScale?.id !== undefined && rawValueScale.id !== valueScale.id) {
    throw new Error("editDensity value scale cannot change its id.");
  }
  const { id: _valueId, range: _valueRange, ...storedValueDefinition } = valueScale;
  void _valueId;
  void _valueRange;
  const valueDefinition = resolveDensityScaleOptions(
    rawValueScale,
    storedValueDefinition,
    "Density valueScale"
  );
  delete valueDefinition.id;
  delete valueDefinition.range;
  const valueChannel = placement?.channel === "x" ? "y" : "x";
  const companionChannel = valueChannel === "x" ? "y" : "x";
  let companionDefinition;
  if (placement === undefined) {
    companionDefinition = {
      type: "linear", domain: "auto", range: "auto", nice: true, zero: true
    };
  } else {
    const currentCategoryChannel = transform.placement?.channel;
    const currentCategoryScale = currentCategoryChannel === undefined
      ? undefined
      : findSemanticScale(program, layer.encoding[currentCategoryChannel].scale);
    const { id: _categoryId, range: _categoryRange, ...storedCategoryDefinition } =
      currentCategoryScale ?? {};
    void _categoryId;
    void _categoryRange;
    companionDefinition = resolveDensityCategoryScaleOptions({
      domain: "auto",
      range: "auto",
      paddingInner: 0,
      paddingOuter: 0,
      align: 0.5,
      ...storedCategoryDefinition,
      ...(rawPlacement?.scale ?? {})
    });
  }
  return {
    [valueChannel]: { ...valueDefinition, range: "auto" },
    [companionChannel]: companionDefinition
  };
}

export function resolveDensityPositionDefinition({
  layer,
  output,
  groupBy,
  placement,
  coordinate,
  valueScale,
  densityScale,
  placementScale
}) {
  if (placement === undefined) {
    const xIsDensity = layer.densityChannel === "x";
    return {
      x: {
        field: output[xIsDensity ? 1 : 0],
        fieldType: "quantitative",
        scale: xIsDensity ? densityScale : valueScale,
        coordinate
      },
      y: {
        field: output[xIsDensity ? 0 : 1],
        fieldType: "quantitative",
        scale: xIsDensity ? valueScale : densityScale,
        coordinate
      }
    };
  }
  const category = {
    field: placement.categoryField,
    fieldType: "nominal",
    scale: placementScale,
    coordinate
  };
  const value = {
    field: output[0],
    fieldType: "quantitative",
    scale: valueScale,
    coordinate
  };
  return placement.channel === "x"
    ? { x: category, y: value }
    : { x: value, y: category };
}
