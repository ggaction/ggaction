import { chart } from "../../../src/index.js";
import { linearPathCommands } from "../../support/path.js";

import {
  CENTERED_AREA_COLORS,
  CENTERED_AREA_LAYOUT,
  createCenteredAreaReferenceValues
} from "./reference-values.js";

export function createCenteredAreaStreamPrimitives(jobs) {
  const values = createCenteredAreaReferenceValues(jobs);
  return chart()
    .createCanvas({
      width: CENTERED_AREA_LAYOUT.width,
      height: CENTERED_AREA_LAYOUT.height,
      margin: CENTERED_AREA_LAYOUT.margin
    })
    .createData({ id: "jobs", values: values.rows })
    .createAreaMark({ id: "occupations", opacity: 1 })
    .editSemantic({
      property: "layer[occupations].coordinate",
      value: "main"
    })
    .editSemantic({
      property: "layer[occupations].encoding.x.field",
      value: "year"
    })
    .editSemantic({
      property: "layer[occupations].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[occupations].encoding.x.scale",
      value: "x"
    })
    .editSemantic({
      property: "layer[occupations].encoding.y.field",
      value: "count"
    })
    .editSemantic({
      property: "layer[occupations].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[occupations].encoding.y.scale",
      value: "y"
    })
    .editSemantic({
      property: "layer[occupations].encoding.group.field",
      value: "job"
    })
    .editSemantic({
      property: "layer[occupations].encoding.group.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[occupations].encoding.color.field",
      value: "job"
    })
    .editSemantic({
      property: "layer[occupations].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[occupations].encoding.color.scale",
      value: "color"
    })
    .editSemantic({ property: "layer[occupations].encoding.group.inferredFrom", value: "color" })
    .editSemantic({ property: "layer[occupations].encoding.y2.datum", value: 0 })
    .editSemantic({ property: "layer[occupations].encoding.y2.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[occupations].encoding.y2.scale", value: "y" })
    .editSemantic({
      property: "layer[occupations].layout.mode",
      value: "center"
    })
    .editSemantic({ property: "scale[x].type", value: "linear" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({
      property: "scale[y].domain",
      value: CENTERED_AREA_LAYOUT.yDomain
    })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].nice", value: false })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({ property: "scale[color].type", value: "ordinal" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: CENTERED_AREA_COLORS
    })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .rematerializeScale({ id: "x" })
    .rematerializeScale({ id: "y" })
    .rematerializeScale({ id: "color" })
    .editGraphics({
      target: "occupations",
      property: "length",
      value: values.series.length
    })
    .editGraphics({
      target: "occupations",
      property: "commands",
      value: values.series.map(series =>
        linearPathCommands(series.points, { close: true })
      )
    })
    .editGraphics({
      target: "occupations",
      property: "fill",
      value: values.series.map(series => series.color)
    })
    .editGraphics({
      target: "occupations",
      property: "opacity",
      value: 1
    })
    .createGuides({
      axes: {
        x: { title: { text: "Year" } },
        y: { title: { text: "Count" } }
      },
      grid: { horizontal: {}, vertical: false },
      legend: { position: "right" }
    })
    .createTitle({
      text: "U.S. occupation counts",
      subtitle: "Center-stacked around half of each year's total"
    });
}
