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

export function createRuleGeometryPrimitives() {
  const values = createRuleGeometryReferenceValues();
  const [vertical, horizontal, verticalInterval, horizontalInterval, diagonal] =
    values.rules;

  return chart()
    .createCanvas({
      width: RULE_GEOMETRY_LAYOUT.width,
      height: RULE_GEOMETRY_LAYOUT.height,
      margin: RULE_GEOMETRY_LAYOUT.margin
    })
    .createData({ values: values.rows })
    .editSemantic({
      property: "coordinate[main].type",
      value: "cartesian"
    })
    .editSemantic({ property: "scale[x].type", value: "linear" })
    .editSemantic({ property: "scale[x].domain", value: [0, 100] })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: [0, 100] })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({
      property: `layer[${vertical.id}].mark.type`,
      value: "rule"
    })
    .editSemantic({ property: `layer[${vertical.id}].data`, value: "data" })
    .editSemantic({
      property: `layer[${vertical.id}].coordinate`,
      value: "main"
    })
    .editSemantic({
      property: `layer[${vertical.id}].encoding.x.datum`,
      value: vertical.channels.x
    })
    .editSemantic({
      property: `layer[${vertical.id}].encoding.x.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${vertical.id}].encoding.x.scale`,
      value: "x"
    })
    .editSemantic({
      property: `layer[${horizontal.id}].mark.type`,
      value: "rule"
    })
    .editSemantic({ property: `layer[${horizontal.id}].data`, value: "data" })
    .editSemantic({
      property: `layer[${horizontal.id}].coordinate`,
      value: "main"
    })
    .editSemantic({
      property: `layer[${horizontal.id}].encoding.y.datum`,
      value: horizontal.channels.y
    })
    .editSemantic({
      property: `layer[${horizontal.id}].encoding.y.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${horizontal.id}].encoding.y.scale`,
      value: "y"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].mark.type`,
      value: "rule"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].data`,
      value: "data"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].coordinate`,
      value: "main"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.x.datum`,
      value: verticalInterval.channels.x
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.x.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.x.scale`,
      value: "x"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.y.datum`,
      value: verticalInterval.channels.y
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.y.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.y.scale`,
      value: "y"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.y2.datum`,
      value: verticalInterval.channels.y2
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.y2.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${verticalInterval.id}].encoding.y2.scale`,
      value: "y"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].mark.type`,
      value: "rule"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].data`,
      value: "data"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].coordinate`,
      value: "main"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.y.datum`,
      value: horizontalInterval.channels.y
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.y.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.y.scale`,
      value: "y"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.x.datum`,
      value: horizontalInterval.channels.x
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.x.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.x.scale`,
      value: "x"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.x2.datum`,
      value: horizontalInterval.channels.x2
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.x2.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${horizontalInterval.id}].encoding.x2.scale`,
      value: "x"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].mark.type`,
      value: "rule"
    })
    .editSemantic({ property: `layer[${diagonal.id}].data`, value: "data" })
    .editSemantic({
      property: `layer[${diagonal.id}].coordinate`,
      value: "main"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.x.field`,
      value: "xStart"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.x.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.x.scale`,
      value: "x"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.y.field`,
      value: "yStart"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.y.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.y.scale`,
      value: "y"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.x2.field`,
      value: "xEnd"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.x2.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.x2.scale`,
      value: "x"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.y2.field`,
      value: "yEnd"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.y2.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${diagonal.id}].encoding.y2.scale`,
      value: "y"
    })
    .createGraphics({ id: vertical.id, parent: "plot-main", type: "line", length: 1 })
    .editGraphics({ target: vertical.id, property: "x1", value: vertical.x1 })
    .editGraphics({ target: vertical.id, property: "y1", value: vertical.y1 })
    .editGraphics({ target: vertical.id, property: "x2", value: vertical.x2 })
    .editGraphics({ target: vertical.id, property: "y2", value: vertical.y2 })
    .editGraphics({ target: vertical.id, property: "stroke", value: vertical.stroke })
    .editGraphics({ target: vertical.id, property: "strokeWidth", value: 3 })
    .editGraphics({ target: vertical.id, property: "strokeDash", value: [[]] })
    .editGraphics({ target: vertical.id, property: "opacity", value: 1 })
    .createGraphics({ id: horizontal.id, parent: "plot-main", type: "line", length: 1 })
    .editGraphics({ target: horizontal.id, property: "x1", value: horizontal.x1 })
    .editGraphics({ target: horizontal.id, property: "y1", value: horizontal.y1 })
    .editGraphics({ target: horizontal.id, property: "x2", value: horizontal.x2 })
    .editGraphics({ target: horizontal.id, property: "y2", value: horizontal.y2 })
    .editGraphics({ target: horizontal.id, property: "stroke", value: horizontal.stroke })
    .editGraphics({ target: horizontal.id, property: "strokeWidth", value: 3 })
    .editGraphics({ target: horizontal.id, property: "strokeDash", value: [[]] })
    .editGraphics({ target: horizontal.id, property: "opacity", value: 1 })
    .createGraphics({ id: verticalInterval.id, parent: "plot-main", type: "line", length: 1 })
    .editGraphics({ target: verticalInterval.id, property: "x1", value: verticalInterval.x1 })
    .editGraphics({ target: verticalInterval.id, property: "y1", value: verticalInterval.y1 })
    .editGraphics({ target: verticalInterval.id, property: "x2", value: verticalInterval.x2 })
    .editGraphics({ target: verticalInterval.id, property: "y2", value: verticalInterval.y2 })
    .editGraphics({ target: verticalInterval.id, property: "stroke", value: verticalInterval.stroke })
    .editGraphics({ target: verticalInterval.id, property: "strokeWidth", value: 3 })
    .editGraphics({ target: verticalInterval.id, property: "strokeDash", value: [[]] })
    .editGraphics({ target: verticalInterval.id, property: "opacity", value: 1 })
    .createGraphics({ id: horizontalInterval.id, parent: "plot-main", type: "line", length: 1 })
    .editGraphics({ target: horizontalInterval.id, property: "x1", value: horizontalInterval.x1 })
    .editGraphics({ target: horizontalInterval.id, property: "y1", value: horizontalInterval.y1 })
    .editGraphics({ target: horizontalInterval.id, property: "x2", value: horizontalInterval.x2 })
    .editGraphics({ target: horizontalInterval.id, property: "y2", value: horizontalInterval.y2 })
    .editGraphics({ target: horizontalInterval.id, property: "stroke", value: horizontalInterval.stroke })
    .editGraphics({ target: horizontalInterval.id, property: "strokeWidth", value: 3 })
    .editGraphics({ target: horizontalInterval.id, property: "strokeDash", value: [[]] })
    .editGraphics({ target: horizontalInterval.id, property: "opacity", value: 1 })
    .createGraphics({ id: diagonal.id, parent: "plot-main", type: "line", length: 1 })
    .editGraphics({ target: diagonal.id, property: "x1", value: diagonal.x1 })
    .editGraphics({ target: diagonal.id, property: "y1", value: diagonal.y1 })
    .editGraphics({ target: diagonal.id, property: "x2", value: diagonal.x2 })
    .editGraphics({ target: diagonal.id, property: "y2", value: diagonal.y2 })
    .editGraphics({ target: diagonal.id, property: "stroke", value: diagonal.stroke })
    .editGraphics({ target: diagonal.id, property: "strokeWidth", value: 3 })
    .editGraphics({ target: diagonal.id, property: "strokeDash", value: [[]] })
    .editGraphics({ target: diagonal.id, property: "opacity", value: 1 })
    .createTitle({
      text: "Rule geometry primitives",
      subtitle: "Full-span, bounded, and diagonal endpoints"
    });
}

export function renderRuleGeometryPrimitives(context) {
  return render(createRuleGeometryPrimitives(), context);
}
