import { chart, render } from "../../../../../src/index.js";
import {
  ERROR_BAR_COLOR,
  ERROR_BAR_FIELDS,
  ERROR_BAR_LAYOUT,
  ENCODED_LAYER_POINT_OPACITY,
  ENCODED_LAYER_POINT_RADIUS,
  RULE_GEOMETRY_LAYOUT,
  createEncodedLayerInferenceReferenceValues,
  createErrorBarReferenceValues,
  createRuleGeometryReferenceValues
} from "../../reference-values.js";

export function createEncodedLayerInferencePrimitives(cars) {
  const values = createEncodedLayerInferenceReferenceValues(cars);
  const x1 = lines => lines.map(line => line.x1);
  const y1 = lines => lines.map(line => line.y1);
  const x2 = lines => lines.map(line => line.x2);
  const y2 = lines => lines.map(line => line.y2);

  return chart()
    .createCanvas({
      width: ERROR_BAR_LAYOUT.width,
      height: ERROR_BAR_LAYOUT.height,
      margin: ERROR_BAR_LAYOUT.margin
    })
    .createData({ values: cars })
    .createPointMark()
    .encodeX({ field: "Origin", fieldType: "ordinal" })
    .encodeY({ field: "Acceleration" })
    .encodeColor({ field: "Origin" })
    .encodeRadius({ value: ENCODED_LAYER_POINT_RADIUS })
    .encodeOpacity({ value: ENCODED_LAYER_POINT_OPACITY })
    .editSemantic({
      property: "dataset[errorBarIntervalData].source",
      value: "data"
    })
    .editSemantic({
      property: "dataset[errorBarIntervalData].transform",
      value: [values.transform]
    })
    .editSemantic({
      property: "dataset[errorBarIntervalData].values",
      value: values.rows
    })
    .editSemantic({ property: "layer[errorBar].mark.type", value: "rule" })
    .editSemantic({
      property: "layer[errorBar].data",
      value: "errorBarIntervalData"
    })
    .editSemantic({ property: "layer[errorBar].coordinate", value: "main" })
    .editSemantic({
      property: "layer[errorBar].encoding.x.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[errorBar].encoding.x.fieldType",
      value: "ordinal"
    })
    .editSemantic({ property: "layer[errorBar].encoding.x.scale", value: "x" })
    .editSemantic({
      property: "layer[errorBar].encoding.y.field",
      value: ERROR_BAR_FIELDS.lower
    })
    .editSemantic({
      property: "layer[errorBar].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[errorBar].encoding.y.scale", value: "y" })
    .editSemantic({
      property: "layer[errorBar].encoding.y2.field",
      value: ERROR_BAR_FIELDS.upper
    })
    .editSemantic({
      property: "layer[errorBar].encoding.y2.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[errorBar].encoding.y2.scale", value: "y" })
    .editSemantic({
      property: "layer[errorBar].encoding.strokeDash.datum",
      value: "solid"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].mark.type",
      value: "rule"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].data",
      value: "errorBarIntervalData"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.x.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.x.fieldType",
      value: "ordinal"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.y.field",
      value: ERROR_BAR_FIELDS.lower
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBarLowerCap].encoding.strokeDash.datum",
      value: "solid"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].mark.type",
      value: "rule"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].data",
      value: "errorBarIntervalData"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.x.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.x.fieldType",
      value: "ordinal"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.y.field",
      value: ERROR_BAR_FIELDS.upper
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[errorBarUpperCap].encoding.strokeDash.datum",
      value: "solid"
    })
    .createGraphics({
      id: "errorBar",
      parent: "plot-main",
      type: "line",
      length: values.mainRules.length
    })
    .editGraphics({ target: "errorBar", property: "x1", value: x1(values.mainRules) })
    .editGraphics({ target: "errorBar", property: "y1", value: y1(values.mainRules) })
    .editGraphics({ target: "errorBar", property: "x2", value: x2(values.mainRules) })
    .editGraphics({ target: "errorBar", property: "y2", value: y2(values.mainRules) })
    .editGraphics({ target: "errorBar", property: "stroke", value: ERROR_BAR_COLOR })
    .editGraphics({ target: "errorBar", property: "strokeWidth", value: 1.5 })
    .editGraphics({
      target: "errorBar",
      property: "strokeDash",
      value: values.mainRules.map(() => [])
    })
    .editGraphics({ target: "errorBar", property: "opacity", value: 1 })
    .createGraphics({
      id: "errorBarLowerCap",
      parent: "plot-main",
      type: "line",
      length: values.lowerCaps.length
    })
    .editGraphics({ target: "errorBarLowerCap", property: "x1", value: x1(values.lowerCaps) })
    .editGraphics({ target: "errorBarLowerCap", property: "y1", value: y1(values.lowerCaps) })
    .editGraphics({ target: "errorBarLowerCap", property: "x2", value: x2(values.lowerCaps) })
    .editGraphics({ target: "errorBarLowerCap", property: "y2", value: y2(values.lowerCaps) })
    .editGraphics({ target: "errorBarLowerCap", property: "stroke", value: ERROR_BAR_COLOR })
    .editGraphics({ target: "errorBarLowerCap", property: "strokeWidth", value: 1.5 })
    .editGraphics({
      target: "errorBarLowerCap",
      property: "strokeDash",
      value: values.lowerCaps.map(() => [])
    })
    .editGraphics({ target: "errorBarLowerCap", property: "opacity", value: 1 })
    .createGraphics({
      id: "errorBarUpperCap",
      parent: "plot-main",
      type: "line",
      length: values.upperCaps.length
    })
    .editGraphics({ target: "errorBarUpperCap", property: "x1", value: x1(values.upperCaps) })
    .editGraphics({ target: "errorBarUpperCap", property: "y1", value: y1(values.upperCaps) })
    .editGraphics({ target: "errorBarUpperCap", property: "x2", value: x2(values.upperCaps) })
    .editGraphics({ target: "errorBarUpperCap", property: "y2", value: y2(values.upperCaps) })
    .editGraphics({ target: "errorBarUpperCap", property: "stroke", value: ERROR_BAR_COLOR })
    .editGraphics({ target: "errorBarUpperCap", property: "strokeWidth", value: 1.5 })
    .editGraphics({
      target: "errorBarUpperCap",
      property: "strokeDash",
      value: values.upperCaps.map(() => [])
    })
    .editGraphics({ target: "errorBarUpperCap", property: "opacity", value: 1 })
    .createGuides()
    .createTitle({
      text: "Acceleration by Origin",
      subtitle: "Observations and 95% mean confidence intervals"
    });
}

export function renderEncodedLayerInferencePrimitives(cars, context) {
  return render(createEncodedLayerInferencePrimitives(cars), context);
}
