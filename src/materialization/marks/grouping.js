import { findUpstreamTransform } from "../dataProvenance.js";
import { readPathSeriesFields, validatePathSeriesAppearance } from "../../grammar/pathSeries.js";

export function validatePathGroupAppearance(program, layer, dataset) {
  if (layer.mark.type === "area" && findUpstreamTransform(program, dataset, "density")) {
    // Density placement owns a category/split grain beyond the visible group field.
    readPathSeriesFields(dataset.values, layer);
    return;
  }
  validatePathSeriesAppearance(dataset.values, layer);
}

export function assertPathGroupCompatible(program, layer, dataset, group) {
  if (layer.encoding?.parallel !== undefined) {
    throw new Error("Parallel paths have row identity and do not support encodeGroup.");
  }
  const field = group?.field;
  for (const [type, editor] of [
    ["density", "editDensity"],
    ["horizon", "editHorizon"],
    ["regression", "editRegression"],
    ["interval", "editErrorBand"]
  ]) {
    const transform = findUpstreamTransform(program, dataset, type);
    if (transform === undefined) continue;
    const fields = type === "horizon" ? [transform.as.group]
      : type === "interval"
        ? transform.groupBy.filter(value =>
            value !== layer.encoding?.x?.field && value !== layer.encoding?.y?.field
          )
        : [transform.groupBy];
    if (group?.fields !== undefined || group === undefined ||
        field === undefined || !fields.includes(field)) {
      throw new Error(
        `${type === "density" ? "Density area" : type + " path"} mark "${layer.id}" must group by ${fields.length === 1 && fields[0] !== undefined ? JSON.stringify(fields[0]) : "its owned field"}; use ${editor}.`
      );
    }
  }
  if (layer.layout?.mode !== undefined) {
    if (group === undefined && !["overlay"].includes(layer.layout.mode)) throw new Error("Remove active series layout before removing its group.");
    return;
  }
  if (layer.mark?.type === "area" && (
    layer.encoding?.y?.stack === "center" ||
    ![undefined, "overlay"].includes(layer.encoding?.color?.layout)
  )) {
    if (group?.fields !== undefined ||
        (layer.encoding?.color !== undefined && field !== layer.encoding.color.field)) {
      throw new Error("Area layout requires one group field matching its color field.");
    }
  }
}
