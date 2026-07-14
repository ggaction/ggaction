import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer } from "../../../selectors/layers.js";
import { findSemanticScale } from "../../../selectors/scales.js";
import { isAggregate } from "../../../grammar/aggregate.js";

export const DEFAULT_BAR_FILL = DEFAULT_COLORS.mark;
export const DEFAULT_BAR_STROKE = "white";
export const DEFAULT_BAR_STROKE_WIDTH = 0.5;

export function requireCompleteBar(program, id) {
  const layer = findLayer(program, id);

  if (layer?.mark?.type !== "bar") {
    throw new Error(`Unknown bar mark "${id}".`);
  }
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Bar mark "${id}" requires an existing dataset.`);
  }
  if (program.graphicSpec.objects[id]?.type !== "rect") {
    throw new Error(`Bar mark "${id}" requires rect graphics.`);
  }

  const xEncoding = layer.encoding?.x;
  const yEncoding = layer.encoding?.y;
  const isHistogram =
    xEncoding?.bin !== undefined &&
    yEncoding?.aggregate === "count" &&
    yEncoding.stack === "zero";
  const isOrdinalAggregate =
    xEncoding?.fieldType === "ordinal" &&
    isAggregate(yEncoding?.aggregate) &&
    yEncoding.stack === null;

  if (
    xEncoding?.scale === undefined ||
    yEncoding?.scale === undefined ||
    (!isHistogram && !isOrdinalAggregate)
  ) {
    throw new Error(
      `Bar mark "${id}" requires binned x/count y or ordinal x/aggregate y encodings.`
    );
  }
  const xScale = findSemanticScale(program, xEncoding.scale);
  const yScale = findSemanticScale(program, yEncoding.scale);
  if (xScale === undefined || yScale === undefined) {
    throw new Error(`Bar mark "${id}" requires x and y scales.`);
  }

  return {
    dataset,
    layer,
    xEncoding,
    yEncoding,
    xScale,
    yScale,
    materialization: isHistogram ? "histogram" : "ordinalAggregate"
  };
}
