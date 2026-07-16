import { chart } from "../../../src/index.js";
import { createPointShapeGraphic } from "../../../src/grammar/pointShapes.js";

import {
  POINT_HIGHLIGHT_LAYOUT,
  POINT_HIGHLIGHT_TARGET,
  selectGroupedMaximumHorsepower
} from "./reference-values.js";

export function createPointHighlightPrimitive(cars) {
  const values = selectGroupedMaximumHorsepower(cars);
  const selectedIndices = new Set(values.selected.map(item => item.index));
  const base = chart()
    .createCanvas(POINT_HIGHLIGHT_LAYOUT)
    .createData({ id: "cars", values: values.rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin" })
    .encodeRadius({ value: 3 })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      },
      legend: { channels: ["color"] }
    })
    .createTitle({
      text: "Highest-Horsepower Car in Each Origin",
      subtitle: "Selected points are enlarged, offset, and drawn in front"
    });
  const sourceChildren = base.graphicSpec.objects.points.items;
  const unselected = [];
  const selected = [];

  for (const [index, child] of sourceChildren.entries()) {
    if (!selectedIndices.has(index)) {
      unselected.push({
        type: "circle",
        properties: {
          ...child.properties,
          opacity: POINT_HIGHLIGHT_TARGET.dimOpacity
        }
      });
      continue;
    }
    const { x, y, radius } = child.properties;
    selected.push(createPointShapeGraphic({
      shape: POINT_HIGHLIGHT_TARGET.shape,
      x: x + POINT_HIGHLIGHT_TARGET.offset.x,
      y: y + POINT_HIGHLIGHT_TARGET.offset.y,
      area: Math.PI * radius ** 2 * POINT_HIGHLIGHT_TARGET.size,
      fill: POINT_HIGHLIGHT_TARGET.accent,
      stroke: POINT_HIGHLIGHT_TARGET.stroke,
      strokeWidth: POINT_HIGHLIGHT_TARGET.strokeWidth,
      opacity: POINT_HIGHLIGHT_TARGET.opacity
    }));
  }

  return base.editGraphics({
    target: "points",
    property: "items",
    value: [...unselected, ...selected]
  });
}
