import { chart } from "../../../src/index.js";

import { createDirectFacetGateValues } from "./reference-values.js";

export function createCarsOriginScatterplotFacetPrimitives(cars) {
  const values = createDirectFacetGateValues(cars).scatter;
  let program = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: values.width })
    .editGraphics({ target: "canvas", property: "height", value: values.height })
    .editGraphics({ target: "canvas", property: "background", value: "#ffffff" })
    .createGraphics({ id: "scatterFacet", type: "collection", parent: "canvas" })
    .createGraphics({
      id: "scatterFacetTitle",
      type: "collection",
      parent: "scatterFacet"
    })
    .editGraphics({
      target: "scatterFacetTitle",
      property: "items",
      value: values.titleItems
    });

  for (const [index, cell] of values.cells.entries()) {
    const canvasId = `scatterFacetCell${index}`;
    const contentId = `${canvasId}Content`;
    program = program
      .createGraphics({ id: canvasId, type: "canvas", parent: "scatterFacet" })
      .editGraphics({ target: canvasId, property: "x", value: cell.x })
      .editGraphics({ target: canvasId, property: "y", value: cell.y })
      .editGraphics({ target: canvasId, property: "width", value: cell.width })
      .editGraphics({ target: canvasId, property: "height", value: cell.height })
      .editGraphics({ target: canvasId, property: "background", value: "#ffffff" })
      .createGraphics({ id: contentId, type: "collection", parent: canvasId })
      .editGraphics({ target: contentId, property: "items", value: cell.items });
  }

  return program;
}

export function createCarsOriginHistogramFacetPrimitives(cars) {
  const values = createDirectFacetGateValues(cars).histogram;
  let program = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: values.width })
    .editGraphics({ target: "canvas", property: "height", value: values.height })
    .editGraphics({ target: "canvas", property: "background", value: "#ffffff" })
    .createGraphics({ id: "histogramFacet", type: "collection", parent: "canvas" })
    .createGraphics({
      id: "histogramFacetTitle",
      type: "collection",
      parent: "histogramFacet"
    })
    .editGraphics({
      target: "histogramFacetTitle",
      property: "items",
      value: values.titleItems
    });

  for (const [index, cell] of values.cells.entries()) {
    const canvasId = `histogramFacetCell${index}`;
    const contentId = `${canvasId}Content`;
    program = program
      .createGraphics({ id: canvasId, type: "canvas", parent: "histogramFacet" })
      .editGraphics({ target: canvasId, property: "x", value: cell.x })
      .editGraphics({ target: canvasId, property: "y", value: cell.y })
      .editGraphics({ target: canvasId, property: "width", value: cell.width })
      .editGraphics({ target: canvasId, property: "height", value: cell.height })
      .editGraphics({ target: canvasId, property: "background", value: "#ffffff" })
      .createGraphics({ id: contentId, type: "collection", parent: canvasId })
      .editGraphics({ target: contentId, property: "items", value: cell.items });
  }

  return program;
}
