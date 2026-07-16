import { createCarsBoxPlotReferenceValues } from "../../reference-values.js";

export const STYLED_FACTOR_STYLE = Object.freeze({
  factor: 1,
  band: 0.5,
  boxFill: "#f28e2b",
  boxOpacity: 0.82,
  boxStroke: "#9a3412",
  boxStrokeWidth: 2,
  medianStroke: "#431407",
  medianStrokeWidth: 3,
  outlierFill: "#111111",
  outlierRadius: 4,
  outlierOpacity: 0.9
});

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function diamondGraphic(point, { fill, radius, opacity }) {
  const halfDiagonal = Math.sqrt(Math.PI * radius ** 2 / 2);
  return Object.freeze({
    type: "path",
    properties: Object.freeze({
      commands: Object.freeze([
        Object.freeze({ op: "M", x: point.x, y: point.y - halfDiagonal }),
        Object.freeze({ op: "L", x: point.x + halfDiagonal, y: point.y }),
        Object.freeze({ op: "L", x: point.x, y: point.y + halfDiagonal }),
        Object.freeze({ op: "L", x: point.x - halfDiagonal, y: point.y }),
        Object.freeze({ op: "Z" })
      ]),
      fill,
      opacity
    })
  });
}

export function createCarsStyledFactorReferenceValues(cars) {
  const values = createCarsBoxPlotReferenceValues(cars, {
    factor: STYLED_FACTOR_STYLE.factor
  });
  const width = values.scales.x.step * STYLED_FACTOR_STYLE.band;
  const boxes = values.boxes.map(box => ({
    ...box,
    x: box.x + (box.width - width) / 2,
    width
  }));
  const medians = values.medians.map((median, index) => ({
    ...median,
    x1: boxes[index].x,
    x2: boxes[index].x + boxes[index].width
  }));
  const outlierGraphics = values.outlierPoints.map(point => diamondGraphic(point, {
    fill: STYLED_FACTOR_STYLE.outlierFill,
    radius: STYLED_FACTOR_STYLE.outlierRadius,
    opacity: STYLED_FACTOR_STYLE.outlierOpacity
  }));

  return Object.freeze({
    ...values,
    boxes: freezeRows(boxes),
    medians: freezeRows(medians),
    outlierGraphics: Object.freeze(outlierGraphics)
  });
}
