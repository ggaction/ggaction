import { createCarsLineChart } from "../../../examples/cars-line-chart/program.js";

import {
  LINE_HIGHLIGHT_LAYOUT,
  LINE_HIGHLIGHT_TARGET,
  selectJapanLineSeries
} from "./reference-values.js";

function baseLineChart(cars, width, height) {
  const base = createCarsLineChart(cars);
  return width === LINE_HIGHLIGHT_LAYOUT.width &&
    height === LINE_HIGHLIGHT_LAYOUT.height
    ? base
    : base.editCanvas({ width, height });
}

export function createJapanLineHighlightPrimitive(
  cars,
  {
    width = LINE_HIGHLIGHT_LAYOUT.width,
    height = LINE_HIGHLIGHT_LAYOUT.height
  } = {}
) {
  const base = baseLineChart(cars, width, height);
  const { target } = selectJapanLineSeries(cars, { width, height });
  const graphic = base.graphicSpec.objects.trends;
  const children = graphic.items.map(child => ({
    type: child.type ?? graphic.type,
    properties: child.properties
  }));
  const [selected] = children.splice(target.index, 1);
  const legendSymbols = base.graphicSpec.objects.seriesLegendSymbols;

  return base
    .editGraphics({
      target: "trends",
      property: "items",
      value: [
        ...children.map(child => ({
          type: child.type,
          properties: {
            ...child.properties,
            opacity: LINE_HIGHLIGHT_TARGET.dimOpacity
          }
        })),
        {
          type: selected.type,
          properties: {
            ...selected.properties,
            stroke: LINE_HIGHLIGHT_TARGET.stroke,
            strokeWidth: LINE_HIGHLIGHT_TARGET.strokeWidth,
            strokeDash: LINE_HIGHLIGHT_TARGET.strokeDash,
            opacity: LINE_HIGHLIGHT_TARGET.opacity
          }
        }
      ]
    })
    .editGraphics({
      target: "seriesLegendSymbols",
      property: "items",
      value: legendSymbols.items.map((child, index) => ({
        type: child.type ?? legendSymbols.type,
        properties: index === target.index
          ? {
              ...child.properties,
              stroke: LINE_HIGHLIGHT_TARGET.stroke,
              strokeWidth: LINE_HIGHLIGHT_TARGET.strokeWidth,
              strokeDash: LINE_HIGHLIGHT_TARGET.strokeDash,
              opacity: LINE_HIGHLIGHT_TARGET.opacity
            }
          : {
              ...child.properties,
              opacity: LINE_HIGHLIGHT_TARGET.dimOpacity
            }
      }))
    });
}
