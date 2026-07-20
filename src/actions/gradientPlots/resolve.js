import { resolveOptionalUserId, validateUserId } from "../../core/identifiers.js";
import { findLayer, hasLayer } from "../../selectors/layers.js";

const CATEGORICAL = Object.freeze(["nominal", "ordinal", "temporal"]);

export function resolveGradientOrientation(x, y) {
  const xType = x?.fieldType;
  const yType = y?.fieldType;
  if (CATEGORICAL.includes(xType) && (yType === undefined || yType === "quantitative")) {
    return "vertical";
  }
  if ((xType === undefined || xType === "quantitative") && CATEGORICAL.includes(yType)) {
    return "horizontal";
  }
  return undefined;
}

export function normalizeGradientPositionTypes(x, y) {
  const orientation = resolveGradientOrientation(x, y);
  if (orientation === "vertical") {
    return { x, y: { fieldType: "quantitative", ...y }, orientation };
  }
  if (orientation === "horizontal") {
    return { x: { fieldType: "quantitative", ...x }, y, orientation };
  }
  return { x, y, orientation };
}

export function resolveGradientSourceLayer(program, target) {
  if (target !== undefined) {
    const id = validateUserId(target, "Gradient plot source layer id");
    const layer = findLayer(program, id);
    if (layer === undefined) {
      throw new Error(`Unknown gradient plot source layer "${id}".`);
    }
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current?.encoding?.x !== undefined || current?.encoding?.y !== undefined) {
    return current;
  }
  const eligible = program.semanticSpec.layers.filter(layer =>
    layer.encoding?.x !== undefined && layer.encoding?.y !== undefined
  );
  if (eligible.length === 1) return eligible[0];
  if (eligible.length > 1) {
    throw new Error(
      "createGradientPlot target is ambiguous; provide target or explicit x and y."
    );
  }
  return undefined;
}

export function resolveGradientPlotId(program, requested) {
  return resolveOptionalUserId(requested, {
    defaultId: "gradientPlot",
    label: "Gradient-plot id",
    operation: "createGradientPlot",
    ambiguous: hasLayer(program, "gradientPlot") ||
      program.graphicSpec.objects.gradientPlot !== undefined
  });
}

export function resolveGradientOwner(program, requested, operation) {
  const eligible = program.semanticSpec.layers.filter(
    layer => program.markConfigs[layer.id]?.gradientPlot?.materialized === true
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "Gradient-plot owner id");
    const layer = findLayer(program, id);
    if (layer === undefined || !eligible.includes(layer)) {
      throw new Error(`Unknown gradient-plot owner "${id}".`);
    }
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current !== undefined && eligible.includes(current)) return current;
  if (eligible.length === 1) return eligible[0];
  if (eligible.length === 0) throw new Error(`${operation} requires a gradient plot.`);
  throw new Error(`${operation} target is ambiguous; provide target.`);
}
