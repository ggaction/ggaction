import { chart } from "../../../src/index.js";

import {
  GAPMINDER_POLAR_TARGET,
  JOBS_RADAR_ROLES,
  JOBS_RADAR_TARGET,
  createGapminderPolarLineReference,
  createJobsRadarReference
} from "./reference-values.js";

function createPolarLinePrimitiveProgram(values, settings) {
  const theta = values.thetaLabels;
  const radius = values.radialLabels;
  const legend = values.legend;

  let program = chart()
    .createCanvas({
      width: settings.width,
      height: settings.height,
      margin: settings.margin
    })
    .createData({ values: settings.rows })
    .createLineMark({
      strokeWidth: settings.strokeWidth,
      opacity: settings.opacity
    })
    .editSemantic({ property: "coordinate[polar].type", value: "polar" })
    .editSemantic({ property: "layer[line].coordinate", value: "polar" })
    .editSemantic({ property: "scale[theta].type", value: settings.thetaScaleType })
    .editSemantic({ property: "scale[theta].domain", value: settings.thetaDomain })
    .editSemantic({ property: "scale[theta].range", value: settings.thetaRange });
  if (settings.thetaPadding !== undefined) {
    program = program
      .editSemantic({
        property: "scale[theta].padding",
        value: settings.thetaPadding
      })
      .editSemantic({
        property: "scale[theta].align",
        value: settings.thetaAlign
      });
  }
  return program
    .editSemantic({ property: "scale[radius].type", value: "linear" })
    .editSemantic({ property: "scale[radius].domain", value: settings.radiusDomain })
    .editSemantic({ property: "scale[radius].range", value: "auto" })
    .editSemantic({ property: "scale[radius].zero", value: settings.radiusZero })
    .editSemantic({ property: "scale[color].type", value: "ordinal" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: { palette: "tableau10" }
    })
    .editSemantic({
      property: "layer[line].encoding.theta.field",
      value: settings.thetaField
    })
    .editSemantic({
      property: "layer[line].encoding.theta.fieldType",
      value: settings.thetaFieldType
    })
    .editSemantic({
      property: "layer[line].encoding.theta.scale",
      value: "theta"
    })
    .editSemantic({
      property: "layer[line].encoding.radius.field",
      value: settings.radiusField
    })
    .editSemantic({
      property: "layer[line].encoding.radius.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[line].encoding.radius.scale",
      value: "radius"
    })
    .editSemantic({
      property: "layer[line].encoding.group.field",
      value: settings.groupField
    })
    .editSemantic({
      property: "layer[line].encoding.group.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[line].encoding.color.field",
      value: settings.groupField
    })
    .editSemantic({
      property: "layer[line].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[line].encoding.color.scale",
      value: "color"
    })
    .editSemantic({ property: "guide.axis.theta.scale", value: "theta" })
    .editSemantic({ property: "guide.axis.theta.coordinate", value: "polar" })
    .editSemantic({
      property: "guide.axis.theta.title",
      value: settings.thetaTitle
    })
    .editSemantic({ property: "guide.axis.radius.scale", value: "radius" })
    .editSemantic({ property: "guide.axis.radius.coordinate", value: "polar" })
    .editSemantic({
      property: "guide.axis.radius.title",
      value: settings.radiusTitle
    })
    .editSemantic({ property: "guide.grid.radial.scale", value: "radius" })
    .editSemantic({ property: "guide.grid.radial.coordinate", value: "polar" })
    .editSemantic({ property: "guide.grid.theta.scale", value: "theta" })
    .editSemantic({ property: "guide.grid.theta.coordinate", value: "polar" })
    .editSemantic({
      property: "guide.legend.series.channels",
      value: ["color"]
    })
    .editSemantic({
      property: "guide.legend.series.scales",
      value: ["color"]
    })
    .editSemantic({
      property: "guide.legend.series.title",
      value: settings.legendTitle
    })
    .editGraphics({
      target: "line",
      property: "length",
      value: values.series.length
    })
    .editGraphics({
      target: "line",
      property: "commands",
      value: values.series.map(series => series.commands)
    })
    .editGraphics({
      target: "line",
      property: "stroke",
      value: values.series.map(series => series.stroke)
    })
    .editGraphics({
      target: "line",
      property: "strokeWidth",
      value: values.series.map(() => settings.strokeWidth)
    })
    .editGraphics({
      target: "line",
      property: "strokeDash",
      value: values.series.map(() => [])
    })
    .editGraphics({
      target: "line",
      property: "opacity",
      value: settings.opacity
    })
    .createGraphics({
      id: "radialGridCircles",
      parent: "plot-main",
      before: "line",
      type: "path",
      length: values.radialGridCommands.length
    })
    .editGraphics({
      target: "radialGridCircles",
      property: "commands",
      value: values.radialGridCommands
    })
    .editGraphics({
      target: "radialGridCircles",
      property: "stroke",
      value: "#d7e0ea"
    })
    .editGraphics({
      target: "radialGridCircles",
      property: "strokeWidth",
      value: 1
    })
    .editGraphics({
      target: "radialGridCircles",
      property: "strokeDash",
      value: values.radialGridCommands.map(() => [])
    })
    .createGraphics({
      id: "thetaGridLines",
      parent: "plot-main",
      before: "line",
      type: "line",
      length: values.thetaGrid.length
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "x1",
      value: values.thetaGrid.map(item => item.start.x)
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "y1",
      value: values.thetaGrid.map(item => item.start.y)
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "x2",
      value: values.thetaGrid.map(item => item.end.x)
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "y2",
      value: values.thetaGrid.map(item => item.end.y)
    })
    .editGraphics({ target: "thetaGridLines", property: "stroke", value: "#d7e0ea" })
    .editGraphics({ target: "thetaGridLines", property: "strokeWidth", value: 1 })
    .editGraphics({
      target: "thetaGridLines",
      property: "strokeDash",
      value: values.thetaGrid.map(() => [])
    })
    .createGraphics({ id: "thetaAxisLine", parent: "plot-main", type: "path" })
    .editGraphics({
      target: "thetaAxisLine",
      property: "commands",
      value: values.thetaAxisCommands
    })
    .editGraphics({ target: "thetaAxisLine", property: "stroke", value: "#475569" })
    .editGraphics({ target: "thetaAxisLine", property: "strokeWidth", value: 1.25 })
    .createGraphics({
      id: "thetaAxisTicks",
      parent: "plot-main",
      type: "line",
      length: values.thetaTicks.length
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "x1",
      value: values.thetaTicks.map(item => item.start.x)
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "y1",
      value: values.thetaTicks.map(item => item.start.y)
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "x2",
      value: values.thetaTicks.map(item => item.end.x)
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "y2",
      value: values.thetaTicks.map(item => item.end.y)
    })
    .editGraphics({ target: "thetaAxisTicks", property: "stroke", value: "#475569" })
    .editGraphics({ target: "thetaAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "thetaAxisLabels",
      parent: "plot-main",
      type: "text",
      length: theta.length
    })
    .editGraphics({ target: "thetaAxisLabels", property: "x", value: theta.map(item => item.x) })
    .editGraphics({ target: "thetaAxisLabels", property: "y", value: theta.map(item => item.y) })
    .editGraphics({ target: "thetaAxisLabels", property: "text", value: theta.map(item => item.text) })
    .editGraphics({ target: "thetaAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "thetaAxisLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "thetaAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "thetaAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "textAlign",
      value: theta.map(item => item.textAlign)
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "textBaseline",
      value: theta.map(item => item.textBaseline)
    })
    .createGraphics({ id: "thetaAxisTitle", parent: "plot-main", type: "text" })
    .editGraphics({ target: "thetaAxisTitle", property: "x", value: values.thetaTitle.x })
    .editGraphics({ target: "thetaAxisTitle", property: "y", value: values.thetaTitle.y })
    .editGraphics({ target: "thetaAxisTitle", property: "text", value: values.thetaTitle.text })
    .editGraphics({ target: "thetaAxisTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "thetaAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "thetaAxisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "thetaAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "thetaAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "thetaAxisTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "radialAxisLine", parent: "plot-main", type: "line" })
    .editGraphics({ target: "radialAxisLine", property: "x1", value: values.radialAxis.start.x })
    .editGraphics({ target: "radialAxisLine", property: "y1", value: values.radialAxis.start.y })
    .editGraphics({ target: "radialAxisLine", property: "x2", value: values.radialAxis.end.x })
    .editGraphics({ target: "radialAxisLine", property: "y2", value: values.radialAxis.end.y })
    .editGraphics({ target: "radialAxisLine", property: "stroke", value: "#475569" })
    .editGraphics({ target: "radialAxisLine", property: "strokeWidth", value: 1.25 })
    .createGraphics({
      id: "radialAxisTicks",
      parent: "plot-main",
      type: "line",
      length: values.radialTicks.length
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "x1",
      value: values.radialTicks.map(item => item.start.x)
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "y1",
      value: values.radialTicks.map(item => item.start.y)
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "x2",
      value: values.radialTicks.map(item => item.end.x)
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "y2",
      value: values.radialTicks.map(item => item.end.y)
    })
    .editGraphics({ target: "radialAxisTicks", property: "stroke", value: "#475569" })
    .editGraphics({ target: "radialAxisTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "radialAxisLabels",
      parent: "plot-main",
      type: "text",
      length: radius.length
    })
    .editGraphics({ target: "radialAxisLabels", property: "x", value: radius.map(item => item.x) })
    .editGraphics({ target: "radialAxisLabels", property: "y", value: radius.map(item => item.y) })
    .editGraphics({ target: "radialAxisLabels", property: "text", value: radius.map(item => item.text) })
    .editGraphics({ target: "radialAxisLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "radialAxisLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "radialAxisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "radialAxisLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "radialAxisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "radialAxisLabels", property: "textBaseline", value: "bottom" })
    .createGraphics({ id: "radialAxisTitle", parent: "plot-main", type: "text" })
    .editGraphics({ target: "radialAxisTitle", property: "x", value: values.radialTitle.x })
    .editGraphics({ target: "radialAxisTitle", property: "y", value: values.radialTitle.y })
    .editGraphics({ target: "radialAxisTitle", property: "text", value: values.radialTitle.text })
    .editGraphics({ target: "radialAxisTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "radialAxisTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "radialAxisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "radialAxisTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "radialAxisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "radialAxisTitle", property: "textBaseline", value: "top" })
    .createGraphics({
      id: "seriesLegendSymbols",
      parent: "canvas",
      type: "line",
      length: legend.domain.length
    })
    .editGraphics({ target: "seriesLegendSymbols", property: "x1", value: legend.x1 })
    .editGraphics({ target: "seriesLegendSymbols", property: "y1", value: legend.itemY })
    .editGraphics({ target: "seriesLegendSymbols", property: "x2", value: legend.x2 })
    .editGraphics({ target: "seriesLegendSymbols", property: "y2", value: legend.itemY })
    .editGraphics({ target: "seriesLegendSymbols", property: "stroke", value: legend.strokes })
    .editGraphics({ target: "seriesLegendSymbols", property: "strokeWidth", value: 2 })
    .editGraphics({
      target: "seriesLegendSymbols",
      property: "strokeDash",
      value: legend.domain.map(() => [])
    })
    .createGraphics({
      id: "seriesLegendLabels",
      parent: "canvas",
      type: "text",
      length: legend.domain.length
    })
    .editGraphics({ target: "seriesLegendLabels", property: "x", value: legend.labelX })
    .editGraphics({ target: "seriesLegendLabels", property: "y", value: legend.itemY })
    .editGraphics({ target: "seriesLegendLabels", property: "text", value: legend.domain })
    .editGraphics({ target: "seriesLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "seriesLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "seriesLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "seriesLegendTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "seriesLegendTitle", property: "x", value: legend.titleX })
    .editGraphics({ target: "seriesLegendTitle", property: "y", value: legend.titleY })
    .editGraphics({ target: "seriesLegendTitle", property: "text", value: legend.title })
    .editGraphics({ target: "seriesLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "seriesLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "seriesLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendTitle", property: "textBaseline", value: "middle" });
}

export function createGapminderPolarLinePrimitives(rows) {
  const values = createGapminderPolarLineReference(rows);
  return createPolarLinePrimitiveProgram(values, {
    width: GAPMINDER_POLAR_TARGET.width,
    height: GAPMINDER_POLAR_TARGET.height,
    margin: GAPMINDER_POLAR_TARGET.margin,
    rows: values.validRows,
    thetaField: "year",
    thetaFieldType: "quantitative",
    thetaScaleType: "linear",
    thetaDomain: GAPMINDER_POLAR_TARGET.thetaDomain,
    thetaRange: GAPMINDER_POLAR_TARGET.thetaRange,
    thetaPadding: undefined,
    thetaAlign: undefined,
    radiusField: "life_expect",
    radiusDomain: GAPMINDER_POLAR_TARGET.radiusDomain,
    radiusZero: false,
    groupField: "country",
    thetaTitle: "Year",
    radiusTitle: "Life expectancy",
    legendTitle: "country",
    strokeWidth: 2.5,
    opacity: 0.88
  });
}

export function createJobsRadarPrimitives(rows) {
  const values = createJobsRadarReference(rows);
  return createPolarLinePrimitiveProgram(values, {
    width: JOBS_RADAR_TARGET.width,
    height: JOBS_RADAR_TARGET.height,
    margin: JOBS_RADAR_TARGET.margin,
    rows: values.radarRows,
    thetaField: "role",
    thetaFieldType: "nominal",
    thetaScaleType: "point",
    thetaDomain: JOBS_RADAR_ROLES,
    thetaRange: "auto",
    thetaPadding: 0.5,
    thetaAlign: 0.5,
    radiusField: "share",
    radiusDomain: JOBS_RADAR_TARGET.radiusDomain,
    radiusZero: true,
    groupField: "sex",
    thetaTitle: "Occupation",
    radiusTitle: "Share",
    legendTitle: "Sex",
    strokeWidth: 2.5,
    opacity: 0.9
  });
}
