import { validateSemanticFieldType } from "../scales/index.js";

export function resolveSecondaryPositionPolicy(layer, primary, primaryChannel, args, operation) {
  const rule = layer.mark.type === "rule", area = layer.mark.type === "area", rect = layer.mark.type === "rect";
  const hasField = Object.hasOwn(args, "field"), hasDatum = Object.hasOwn(args, "datum");
  if ((rule || area || rect) && hasField === hasDatum) {
    throw new Error(`${operation} requires exactly one of field or datum for a ${layer.mark.type} mark.`);
  }
  if (!rule && !area && !rect && (!hasField || hasDatum)) {
    throw new Error(`${operation} requires a field for a ranged mark.`);
  }
  if (rule && hasField && args.fieldType === undefined) {
    throw new Error(`${operation} requires fieldType for a rule mark.`);
  }
  const fieldType = rule
    ? validateSemanticFieldType(args.fieldType ?? "quantitative")
    : layer.mark.type === "rect"
      ? args.fieldType ?? primary.fieldType
      : args.fieldType ?? "quantitative";
  if (
    !rule &&
    layer.mark.type !== "rect" &&
    fieldType !== "quantitative"
  ) {
    throw new Error(`${operation} requires a quantitative field.`);
  }
  if (
    layer.mark.type === "rect" &&
    !["quantitative", "temporal"].includes(fieldType)
  ) {
    throw new Error(`${operation} requires a quantitative or temporal rect field.`);
  }
  if (layer.mark.type === "rect" && fieldType !== primary.fieldType) {
    throw new Error(
      `${operation} fieldType must match the primary ${primaryChannel} fieldType.`
    );
  }
  if (rule && fieldType !== primary.fieldType) {
    throw new Error(
      `${operation} fieldType must match the primary ${primaryChannel} fieldType.`
    );
  }
  return { fieldType };
}
