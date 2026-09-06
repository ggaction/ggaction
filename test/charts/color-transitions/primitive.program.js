import { chart } from "../../../src/index.js";
import { layout, rows, color } from "../../../examples/color-transitions/program.js";
export function createPointPrimitive() {
  const p = chart().createCanvas(layout).createData({ id: "data", values: rows })
    .createPointMark({ id: "m", data: "data" })
    .encodeX({ target: "m", field: "x" })
    .encodeY({ target: "m", field: "value" })
    .encodeColor({ target: "m", ...color })
    .createGuides();
  const { labels, titleStyle, border, align, offset } = p.guideConfigs.legend.gradient;
  return p.removeLegend({ target: "m", channels: ["color"] })
    .editSemantic({ property: "scale[colors].midpoint", remove: true })
    .editSemantic({ property: "scale[colors].interpolate", remove: true })
    .editSemantic({ property: "scale[colors].type", value: "quantize" })
    .editSemantic({ property: "scale[colors].domain", value: [-2, 8] })
    .editSemantic({ property: "scale[colors].range", value: ["blue", "red"] })
    .rematerializeScale({ id: "colors" })
    .createLegend({ target: "m", channels: ["color"], labels, titleStyle, border, align, offset });
}
export function createBarPrimitive() {
  const p = chart().createCanvas(layout).createData({ id: "data", values: rows })
    .createBarMark({ id: "m", data: "data" })
    .encodeX({ target: "m", field: "category", fieldType: "nominal" })
    .encodeY({ target: "m", field: "value", fieldType: "quantitative", aggregate: "sum" })
    .encodeColor({ target: "m", ...color })
    .createGuides();
  const { labels, titleStyle, border, align, offset } = p.guideConfigs.legend.gradient;
  return p.removeLegend({ target: "m", channels: ["color"] })
    .editSemantic({ property: "scale[colors].midpoint", remove: true })
    .editSemantic({ property: "scale[colors].interpolate", remove: true })
    .editSemantic({ property: "scale[colors].type", value: "quantize" })
    .editSemantic({ property: "scale[colors].domain", value: [-2, 8] })
    .editSemantic({ property: "scale[colors].range", value: ["blue", "red"] })
    .rematerializeScale({ id: "colors" })
    .rematerializeBarMark({ id: "m" })
    .createLegend({ target: "m", channels: ["color"], labels, titleStyle, border, align, offset });
}
