export function validatePositionSource(layer, args, operation) {
  const hasField = Object.hasOwn(args, "field"), hasDatum = Object.hasOwn(args, "datum");
  if (["rule", "rect", "text", "point", "tick"].includes(layer.mark.type)) {
    if (hasField === hasDatum) {
      throw new Error(`${operation} requires exactly one of field or datum for a ${layer.mark.type} mark.`);
    }
    if (layer.mark.type === "rule" && hasField && args.fieldType === undefined) {
      throw new Error(`${operation} requires fieldType for a rule mark.`);
    }
  } else if (layer.mark.type === "area") {
    if (hasField === hasDatum) throw new Error(`${operation} requires exactly one of field or datum for an area mark.`);
    if (hasDatum && (!Number.isFinite(args.datum) || (args.fieldType ?? "quantitative") !== "quantitative" ||
      ["aggregate", "bin", "stack", "temporalUnit"].some(key => Object.hasOwn(args, key)))) {
      throw new Error("Area datum requires a finite quantitative constant without aggregate, bin, stack, or temporalUnit.");
    }
  } else if (hasDatum) {
    throw new Error(`${operation} does not support datum for a ${layer.mark.type} mark.`);
  }
}
