import { chart, hconcat } from "../../../src/index.js";
import {
  resolveConcreteGraphicBounds,
  unionConcreteGraphicBounds
} from "../../../src/grammar/schemas/graphicBounds.js";
import { measureTextWidth } from "../../../src/core/textMetrics.js";

import { REVIEW_LAYOUT } from "./reference-values.js";

function validCars(cars) {
  return cars.filter(car =>
    Number.isFinite(car.Displacement) &&
    Number.isFinite(car.Miles_per_Gallon) &&
    Number.isFinite(car.Acceleration) &&
    typeof car.Origin === "string" &&
    car.Origin.length > 0
  );
}

function addReviewLabel(program, text) {
  return program
    .createGraphics({ id: "reviewLabel", parent: "canvas", type: "text" })
    .editGraphics({ target: "reviewLabel", property: "x", value: 70 })
    .editGraphics({ target: "reviewLabel", property: "y", value: 17 })
    .editGraphics({ target: "reviewLabel", property: "text", value: text })
    .editGraphics({ target: "reviewLabel", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "reviewLabel", property: "fontSize", value: 13 })
    .editGraphics({ target: "reviewLabel", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "reviewLabel", property: "fontWeight", value: 700 })
    .editGraphics({ target: "reviewLabel", property: "textAlign", value: "left" })
    .editGraphics({ target: "reviewLabel", property: "textBaseline", value: "middle" });
}

function createCarsHorizontalLegendProgram(cars, position) {
  return chart()
    .createCanvas({
      width: REVIEW_LAYOUT.multiWidth,
      height: 620,
      margin: {
        top: position === "top" ? 200 : 40,
        right: 70,
        bottom: position === "bottom" ? 200 : 60,
        left: 70
      }
    })
    .createData({ id: "cars", values: validCars(cars) })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin", fieldType: "nominal" })
    .encodeOpacity({ field: "Acceleration" })
    .createGuides({
      axes: {
        x: { title: { text: "Displacement" } },
        y: { title: { text: "Miles per Gallon" } }
      },
      legend: false
    })
    .createLegend({
      target: "points",
      channels: ["color"],
      position,
      align: "left",
      columns: 3,
      ...(position === "bottom" ? { offset: 60 } : {})
    })
    .createLegend({
      target: "points",
      channels: ["opacity"],
      position,
      align: "right",
      count: 3,
      ...(position === "bottom" ? { offset: 60 } : {})
    });
}

const HORIZONTAL_BLOCKS = Object.freeze({
  color: Object.freeze({
    title: "colorLegendTitle",
    element: "colorLegendSymbols",
    content: Object.freeze(["colorLegendSymbols", "colorLegendLabels"])
  }),
  opacity: Object.freeze({
    title: "opacityLegendTitle",
    element: "opacityLegendSymbols",
    content: Object.freeze(["opacityLegendSymbols", "opacityLegendLabels"])
  })
});

function translateGraphicX(program, id, dx) {
  const graphic = program.graphicSpec.objects[id];
  if (graphic.items !== undefined) {
    return program.editGraphics({
      target: id,
      property: "items",
      value: graphic.items.map(item => ({
        type: item.type ?? graphic.type,
        properties: { ...item.properties, x: item.properties.x + dx }
      }))
    });
  }
  return program.editGraphics({
    target: id,
    property: "x",
    value: graphic.properties.x + dx
  });
}

function translateBlockX(program, kind, dx) {
  const block = HORIZONTAL_BLOCKS[kind];
  return [block.title, ...block.content].reduce(
    (next, id) => translateGraphicX(next, id, dx),
    program
  );
}

function widenHorizontalGap(program, gap) {
  return translateBlockX(program, "opacity", gap - 24);
}

function placeInlineBlock(program, kind, cursor, gap) {
  const block = HORIZONTAL_BLOCKS[kind];
  const title = resolveConcreteGraphicBounds(program.graphicSpec, block.title);
  const element = resolveConcreteGraphicBounds(program.graphicSpec, block.element);
  const content = unionConcreteGraphicBounds(program.graphicSpec, block.content);
  const titleWidth = title.right - title.left;
  const contentDx = cursor + titleWidth + 20 - content.left;
  let next = block.content.reduce(
    (current, id) => translateGraphicX(current, id, contentDx),
    program
  );
  next = next
    .editGraphics({ target: block.title, property: "x", value: cursor })
    .editGraphics({
      target: block.title,
      property: "y",
      value: (element.top + element.bottom) / 2
    })
    .editGraphics({
      target: block.title,
      property: "textAlign",
      value: "left"
    });
  return {
    program: next,
    cursor: Math.max(
      cursor + titleWidth,
      content.right + contentDx
    ) + gap
  };
}

function placeInlineTitles(program, gap) {
  let next = program;
  let cursor = 70;
  for (const kind of ["color", "opacity"]) {
    const placement = placeInlineBlock(next, kind, cursor, gap);
    next = placement.program;
    cursor = placement.cursor;
  }
  return next;
}

function placeContinuousLabelsInline(program) {
  const title = program.graphicSpec.objects.opacityLegendTitle.properties;
  const symbols = program.graphicSpec.objects.opacityLegendSymbols;
  const labels = program.graphicSpec.objects.opacityLegendLabels;
  const titleBounds = resolveConcreteGraphicBounds(
    program.graphicSpec,
    "opacityLegendTitle"
  );
  let cursor = titleBounds.right + 20;
  const nextSymbols = [];
  const nextLabels = [];
  for (let index = 0; index < symbols.items.length; index += 1) {
    const symbol = symbols.items[index];
    const label = labels.items[index];
    const radius = symbol.properties.radius;
    const symbolX = cursor + radius;
    nextSymbols.push({
      type: symbol.type ?? symbols.type,
      properties: { ...symbol.properties, x: symbolX, y: title.y }
    });
    cursor = symbolX + radius + 8;
    nextLabels.push({
      type: label.type ?? labels.type,
      properties: {
        ...label.properties,
        x: cursor,
        y: title.y,
        textAlign: "left"
      }
    });
    cursor += measureTextWidth(label.properties.text, {
      fontSize: label.properties.fontSize
    });
    if (index < symbols.items.length - 1) cursor += 20;
  }
  return program
    .editGraphics({
      target: "opacityLegendSymbols",
      property: "items",
      value: nextSymbols
    })
    .editGraphics({
      target: "opacityLegendLabels",
      property: "items",
      value: nextLabels
    });
}

export function createHorizontalLegendOptionProgram(cars, {
  gap,
  inlineTitles = false,
  inlineContinuousLabels = false,
  label
}) {
  const base = createCarsHorizontalLegendProgram(cars, "top");
  let placed = inlineTitles
    ? placeInlineTitles(base, gap)
    : widenHorizontalGap(base, gap);
  if (inlineContinuousLabels) placed = placeContinuousLabelsInline(placed);
  return addReviewLabel(placed, label);
}

export function createHorizontalLegendLaneComparison(cars) {
  const top = addReviewLabel(
    createCarsHorizontalLegendProgram(cars, "top"),
    "TOP · left-packed aligned legends"
  );
  const bottom = addReviewLabel(
    createCarsHorizontalLegendProgram(cars, "bottom"),
    "BOTTOM · left-packed aligned legends"
  );
  return hconcat({
    id: "horizontalLegendLaneComparison",
    programs: [
      { id: "top", program: top },
      { id: "bottom", program: bottom }
    ],
    gap: REVIEW_LAYOUT.gap,
    padding: REVIEW_LAYOUT.padding,
    align: "start"
  });
}
