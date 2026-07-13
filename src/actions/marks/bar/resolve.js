export const DEFAULT_BAR_FILL = "#4c78a8";
export const DEFAULT_BAR_STROKE = "white";
export const DEFAULT_BAR_STROKE_WIDTH = 0.5;

export function requireCompleteBar(program, id) {
  const layer = program.semanticSpec.layers.find(item => item.id === id);

  if (layer?.mark?.type !== "bar") {
    throw new Error(`Unknown bar mark "${id}".`);
  }
  const dataset = program.semanticSpec.datasets.find(
    item => item.id === layer.data
  );
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
  const isOrdinalMean =
    xEncoding?.fieldType === "ordinal" &&
    yEncoding?.fieldType === "quantitative" &&
    yEncoding.aggregate === "mean" &&
    yEncoding.stack === null;

  if (
    xEncoding?.scale === undefined ||
    yEncoding?.scale === undefined ||
    (!isHistogram && !isOrdinalMean)
  ) {
    throw new Error(
      `Bar mark "${id}" requires binned x/count y or ordinal x/mean y encodings.`
    );
  }
  const xScale = program.semanticSpec.scales.find(
    item => item.id === xEncoding.scale
  );
  const yScale = program.semanticSpec.scales.find(
    item => item.id === yEncoding.scale
  );
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
    materialization: isHistogram ? "histogram" : "ordinalMean"
  };
}
