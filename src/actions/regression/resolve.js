import { isPlainObject } from "../../core/immutable.js";
import { findLayer } from "../../selectors/layers.js";

export function requireRegressionObject(value, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}

export function requireRegressionField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

export function findRegressionPoint(program, requested) {
  const eligible = program.semanticSpec.layers.filter(layer =>
    layer.mark?.type === "point" &&
    layer.encoding?.x?.fieldType === "quantitative" &&
    layer.encoding?.y?.fieldType === "quantitative"
  );
  if (requested !== undefined) {
    const selected = findLayer(program, requested);
    if (selected === undefined || !eligible.includes(selected)) {
      throw new Error(`Unknown regression point target "${requested}".`);
    }
    return selected;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current !== undefined && eligible.includes(current)) return current;
  if (eligible.length === 1) return eligible[0];
  if (eligible.length === 0) {
    throw new Error(
      "createRegression requires an eligible quantitative point mark."
    );
  }
  throw new Error("createRegression target is ambiguous; provide target.");
}

export function inferRegressionGroup(layer, args) {
  if (Object.hasOwn(args, "groupBy")) {
    return args.groupBy === undefined || args.groupBy === false
      ? undefined
      : requireRegressionField(args.groupBy, "Regression groupBy");
  }
  const candidates = [...new Set(
    [layer.encoding?.color, layer.encoding?.shape]
      .filter(encoding =>
        ["nominal", "ordinal"].includes(encoding?.fieldType)
      )
      .map(encoding => encoding.field)
  )];
  if (candidates.length > 1) {
    throw new Error("createRegression groupBy is ambiguous; provide groupBy.");
  }
  return candidates[0];
}
