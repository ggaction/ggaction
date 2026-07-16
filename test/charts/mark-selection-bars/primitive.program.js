import { createCarsHistogram } from "../../../examples/cars-histogram/program.js";

import {
  BAR_HIGHLIGHT_LAYOUT,
  BAR_HIGHLIGHT_TARGET,
  selectTallestHistogramStack,
  selectTopmostHistogramSegment
} from "./reference-values.js";

function baseHistogram(cars, width, height) {
  const base = createCarsHistogram(cars);
  return width === BAR_HIGHLIGHT_LAYOUT.width &&
    height === BAR_HIGHLIGHT_LAYOUT.height
    ? base
    : base.editCanvas({ width, height });
}

export function createTallestHistogramStackHighlightPrimitive(
  cars,
  {
    width = BAR_HIGHLIGHT_LAYOUT.width,
    height = BAR_HIGHLIGHT_LAYOUT.height
  } = {}
) {
  const base = baseHistogram(cars, width, height);
  const { target } = selectTallestHistogramStack(cars, { width, height });
  const graphic = base.graphicSpec.objects.bars;
  const children = graphic.items.map(child => ({
    type: child.type ?? graphic.type,
    properties: child.properties
  }));
  const selectedIndices = new Set(target.indices);

  return base.editGraphics({
    target: "bars",
    property: "items",
    value: [
      ...children.filter((_, index) => !selectedIndices.has(index)),
      ...children.filter((_, index) => selectedIndices.has(index)).map(selected => ({
        type: selected.type,
        properties: { ...selected.properties, ...BAR_HIGHLIGHT_TARGET }
      }))
    ]
  });
}

export function createTopmostHistogramSegmentHighlightPrimitive(
  cars,
  {
    width = BAR_HIGHLIGHT_LAYOUT.width,
    height = BAR_HIGHLIGHT_LAYOUT.height
  } = {}
) {
  const base = baseHistogram(cars, width, height);
  const { target } = selectTopmostHistogramSegment(cars, { width, height });
  const graphic = base.graphicSpec.objects.bars;
  const children = graphic.items.map(child => ({
    type: child.type ?? graphic.type,
    properties: child.properties
  }));
  const [selected] = children.splice(target.index, 1);
  return base.editGraphics({
    target: "bars",
    property: "items",
    value: [
      ...children,
      {
        type: selected.type,
        properties: { ...selected.properties, ...BAR_HIGHLIGHT_TARGET }
      }
    ]
  });
}
