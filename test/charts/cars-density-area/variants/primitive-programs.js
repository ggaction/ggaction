import {
  createCarsDensityAreaPrimitiveProgram,
  createCarsDensityAreaPrimitives
} from "../primitive.program.js";
import { wrappedBottomTitleTarget } from "./title-reference.js";

export function createWrappedBottomTitlePrimitives(cars) {
  const target = wrappedBottomTitleTarget;
  return createCarsDensityAreaPrimitives(cars)
    .editGraphics({ target: "canvas", property: "height", value: target.height })
    .editSemantic({ property: "title.text", value: target.options.text })
    .editSemantic({ property: "title.subtitle", value: target.options.subtitle })
    .editGraphics({
      target: "chartTitle",
      property: "length",
      value: target.title.lines.length
    })
    .editGraphics({ target: "chartTitle", property: "x", value: target.title.x })
    .editGraphics({ target: "chartTitle", property: "y", value: target.title.y })
    .editGraphics({
      target: "chartTitle",
      property: "text",
      value: target.title.lines
    })
    .editGraphics({ target: "chartTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartTitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "chartTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "chartTitle", property: "fontSize", value: 22 })
    .editGraphics({ target: "chartTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "chartTitle", property: "fontWeight", value: 600 })
    .editGraphics({
      target: "chartTitle",
      property: "rotation",
      value: target.title.rotation
    })
    .editGraphics({ target: "chartSubtitle", property: "length", value: 2 })
    .editGraphics({
      target: "chartSubtitle",
      property: "x",
      value: target.subtitle.x
    })
    .editGraphics({
      target: "chartSubtitle",
      property: "y",
      value: target.subtitle.y
    })
    .editGraphics({
      target: "chartSubtitle",
      property: "text",
      value: target.subtitle.lines
    })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 14 })
    .editGraphics({
      target: "chartSubtitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({
      target: "chartSubtitle",
      property: "rotation",
      value: target.subtitle.rotation
    });
}

export function createAreaOutlineEditPrimitives(cars) {
  return createCarsDensityAreaPrimitives(cars)
    .editGraphics({
      target: "densities",
      property: "opacity",
      value: 0.35
    })
    .editGraphics({
      target: "densities",
      property: "stroke",
      value: "#334155"
    })
    .editGraphics({
      target: "densities",
      property: "strokeWidth",
      value: 1.5
    });
}

export function createEpanechnikovKernelPrimitives(cars) {
  return createCarsDensityAreaPrimitiveProgram(cars, {
    kernel: "epanechnikov"
  });
}

export function createCountNormalizationPrimitives(cars) {
  return createCarsDensityAreaPrimitiveProgram(cars, {
    normalization: "count"
  });
}

export function createDensityRevisionPrimitives(cars) {
  return createCarsDensityAreaPrimitiveProgram(cars, {
    datasetId: "densitiesDensityDataRevision1",
    bandwidth: 0.9,
    kernel: "triangular",
    normalization: "count"
  });
}
