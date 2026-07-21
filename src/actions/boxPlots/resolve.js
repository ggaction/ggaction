import { resolveOptionalUserId, validateUserId } from "../../core/identifiers.js";
import { findLayer, hasLayer } from "../../selectors/layers.js";

const CATEGORY_TYPES = Object.freeze(["nominal", "ordinal", "temporal"]);

export function resolveBoxOrientation(x, y) {
  const xType = x?.fieldType ?? "quantitative";
  const yType = y?.fieldType ?? "quantitative";
  if (CATEGORY_TYPES.includes(xType) && yType === "quantitative") return "vertical";
  if (xType === "quantitative" && CATEGORY_TYPES.includes(yType)) return "horizontal";
  return undefined;
}

export function resolveBoxSourceLayer(program, target, {
  requiresInference = true
} = {}) {
  if (target !== undefined) {
    const layer = findLayer(program, validateUserId(target, "Box source layer id"));
    if (layer === undefined) throw new Error(`Unknown box source layer "${target}".`);
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current?.encoding?.x !== undefined || current?.encoding?.y !== undefined) {
    return current;
  }
  const eligible = program.semanticSpec.layers.filter(
    layer => layer.encoding?.x !== undefined && layer.encoding?.y !== undefined
  );
  if (eligible.length === 1) return eligible[0];
  if (eligible.length > 1 && requiresInference) {
    throw new Error(
      "createBoxPlot target is ambiguous; provide target or explicit x and y."
    );
  }
  return undefined;
}

export function resolveBoxPlotId(program, requested) {
  return resolveOptionalUserId(requested, {
    defaultId: "boxPlot",
    label: "Box-plot id",
    operation: "createBoxPlot",
    ambiguous: hasLayer(program, "boxPlot") ||
      program.graphicSpec.objects.boxPlot !== undefined
  });
}
