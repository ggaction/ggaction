import { chart } from "../../../src/index.js";

import { createPolarPointPrimitiveValues } from "./reference-values.js";

function createPolarPointPrimitives(rows, {
  width,
  height,
  margin,
  thetaField,
  radiusField,
  colorField,
  pointRadius,
  opacity,
  radiusZero,
  colorRange
}) {
  const values = createPolarPointPrimitiveValues(rows, {
    width,
    height,
    margin,
    thetaField,
    radiusField,
    colorField,
    pointRadius,
    opacity
  });
  let program = chart()
    .editSemantic({ property: "dataset[data].values", value: values.validRows })
    .editSemantic({ property: "layer[point].mark.type", value: "point" })
    .editSemantic({ property: "layer[point].data", value: "data" })
    .editSemantic({ property: "layer[point].coordinate", value: "polar" })
    .editSemantic({
      property: "layer[point].encoding.theta.field",
      value: thetaField
    })
    .editSemantic({
      property: "layer[point].encoding.theta.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[point].encoding.theta.scale",
      value: "theta"
    })
    .editSemantic({
      property: "layer[point].encoding.radius.field",
      value: radiusField
    })
    .editSemantic({
      property: "layer[point].encoding.radius.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[point].encoding.radius.scale",
      value: "radius"
    })
    .editSemantic({
      property: "layer[point].encoding.color.field",
      value: colorField
    })
    .editSemantic({
      property: "layer[point].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[point].encoding.color.scale",
      value: "color"
    })
    .editSemantic({ property: "scale[theta].type", value: "linear" })
    .editSemantic({ property: "scale[theta].domain", value: "auto" })
    .editSemantic({ property: "scale[theta].range", value: "auto" })
    .editSemantic({ property: "scale[radius].type", value: "linear" })
    .editSemantic({ property: "scale[radius].domain", value: "auto" })
    .editSemantic({ property: "scale[radius].range", value: "auto" });

  if (radiusZero !== undefined) {
    program = program.editSemantic({
      property: "scale[radius].zero",
      value: radiusZero
    });
  }

  program = program
    .editSemantic({ property: "scale[color].type", value: "ordinal" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: colorRange
    })
    .editSemantic({ property: "coordinate[polar].type", value: "polar" })
    .createGraphics({ id: "canvas", type: "canvas" })
    .createGraphics({ id: "plot-main", type: "collection", parent: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: width })
    .editGraphics({ target: "canvas", property: "height", value: height })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({
      id: "point",
      parent: "plot-main",
      type: "circle",
      length: values.validRows.length
    })
    .editGraphics({ target: "point", property: "x", value: values.x })
    .editGraphics({ target: "point", property: "y", value: values.y })
    .editGraphics({ target: "point", property: "fill", value: values.fill })
    .editGraphics({
      target: "point",
      property: "radius",
      value: values.pointRadius
    });

  return opacity === undefined
    ? program
    : program.editGraphics({
        target: "point",
        property: "opacity",
        value: values.opacity
      });
}

export function createCarsPolarScatterplotPrimitives(rows) {
  return createPolarPointPrimitives(rows, {
    width: 520,
    height: 520,
    margin: 48,
    thetaField: "Acceleration",
    radiusField: "Horsepower",
    colorField: "Origin",
    pointRadius: 3,
    colorRange: "auto"
  });
}

export function createFashionTsnePolarPointPrimitives(rows) {
  return createPolarPointPrimitives(rows, {
    width: 560,
    height: 560,
    margin: 40,
    thetaField: "x_pos",
    radiusField: "y_pos",
    colorField: "label_name",
    pointRadius: 1.4,
    opacity: 0.42,
    radiusZero: false,
    colorRange: { palette: "tableau10" }
  });
}
