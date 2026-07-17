import { chart } from "../../../src/index.js";

import {
  CARS_DONUT_TARGET,
  GAPMINDER_RADIAL_TARGET,
  NIGHTINGALE_TARGET,
  createCarsDonutReference,
  createGapminderRadialBarReference,
  createNightingaleRoseReference
} from "./reference-values.js";

function createArcPrimitiveProgram(values, settings) {
  let program = chart()
    .createCanvas({
      width: settings.target.width,
      height: settings.target.height,
      margin: settings.target.margin
    })
    .createData({ values: values.rows });

  if (values.radialGridCommands !== undefined) {
    program = program
      .createGraphics({
        id: "radialGridCircles",
        parent: "plot-main",
        type: "path",
        length: values.radialGridCommands.length
      })
      .editGraphics({
        target: "radialGridCircles",
        property: "commands",
        value: values.radialGridCommands
      })
      .editGraphics({ target: "radialGridCircles", property: "stroke", value: "#d7e0ea" })
      .editGraphics({ target: "radialGridCircles", property: "strokeWidth", value: 1 })
      .editGraphics({
        target: "radialGridCircles",
        property: "strokeDash",
        value: values.radialGridCommands.map(() => [])
      });
  }

  program = program
    .createGraphics({
      id: "arcSectors",
      parent: "plot-main",
      type: "path",
      length: values.sectors.length
    })
    .editGraphics({
      target: "arcSectors",
      property: "commands",
      value: values.sectors.map(sector => sector.commands)
    })
    .editGraphics({
      target: "arcSectors",
      property: "fill",
      value: values.sectors.map(sector => sector.fill)
    })
    .editGraphics({
      target: "arcSectors",
      property: "opacity",
      value: settings.opacity
    })
    .editGraphics({
      target: "arcSectors",
      property: "stroke",
      value: settings.sectorStroke
    })
    .editGraphics({
      target: "arcSectors",
      property: "strokeWidth",
      value: settings.sectorStrokeWidth
    })
    .editGraphics({
      target: "arcSectors",
      property: "strokeDash",
      value: values.sectors.map(() => [])
    });

  if (values.thetaAxisCommands !== undefined) {
    program = program
      .createGraphics({ id: "thetaAxisLine", parent: "plot-main", type: "path" })
      .editGraphics({
        target: "thetaAxisLine",
        property: "commands",
        value: values.thetaAxisCommands
      })
      .editGraphics({ target: "thetaAxisLine", property: "stroke", value: "#64748b" })
      .editGraphics({ target: "thetaAxisLine", property: "strokeWidth", value: 1.25 });
  }

  if (values.radialAxis !== undefined) {
    program = program
      .createGraphics({ id: "radialAxisLine", parent: "plot-main", type: "line" })
      .editGraphics({
        target: "radialAxisLine",
        property: "x1",
        value: values.radialAxis.start.x
      })
      .editGraphics({
        target: "radialAxisLine",
        property: "y1",
        value: values.radialAxis.start.y
      })
      .editGraphics({
        target: "radialAxisLine",
        property: "x2",
        value: values.radialAxis.end.x
      })
      .editGraphics({
        target: "radialAxisLine",
        property: "y2",
        value: values.radialAxis.end.y
      })
      .editGraphics({ target: "radialAxisLine", property: "stroke", value: "#64748b" })
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
      .editGraphics({ target: "radialAxisTicks", property: "stroke", value: "#64748b" })
      .editGraphics({ target: "radialAxisTicks", property: "strokeWidth", value: 1 })
      .createGraphics({
        id: "radialAxisLabels",
        parent: "plot-main",
        type: "text",
        length: values.radialLabels.length
      })
      .editGraphics({
        target: "radialAxisLabels",
        property: "x",
        value: values.radialLabels.map(item => item.x)
      })
      .editGraphics({
        target: "radialAxisLabels",
        property: "y",
        value: values.radialLabels.map(item => item.y)
      })
      .editGraphics({
        target: "radialAxisLabels",
        property: "text",
        value: values.radialLabels.map(item => item.text)
      })
      .editGraphics({ target: "radialAxisLabels", property: "fill", value: "#334155" })
      .editGraphics({ target: "radialAxisLabels", property: "fontSize", value: 11 })
      .editGraphics({ target: "radialAxisLabels", property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: "radialAxisLabels", property: "fontWeight", value: "normal" })
      .editGraphics({ target: "radialAxisLabels", property: "textAlign", value: "center" })
      .editGraphics({ target: "radialAxisLabels", property: "textBaseline", value: "bottom" });
  }

  if (values.thetaLabels !== undefined) {
    program = program
      .createGraphics({
        id: "thetaAxisLabels",
        parent: "plot-main",
        type: "text",
        length: values.thetaLabels.length
      })
      .editGraphics({
        target: "thetaAxisLabels",
        property: "x",
        value: values.thetaLabels.map(item => item.x)
      })
      .editGraphics({
        target: "thetaAxisLabels",
        property: "y",
        value: values.thetaLabels.map(item => item.y)
      })
      .editGraphics({
        target: "thetaAxisLabels",
        property: "text",
        value: values.thetaLabels.map(item => item.text)
      })
      .editGraphics({ target: "thetaAxisLabels", property: "fill", value: "#334155" })
      .editGraphics({ target: "thetaAxisLabels", property: "fontSize", value: settings.thetaFontSize })
      .editGraphics({ target: "thetaAxisLabels", property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: "thetaAxisLabels", property: "fontWeight", value: "normal" })
      .editGraphics({
        target: "thetaAxisLabels",
        property: "textAlign",
        value: values.thetaLabels.map(item => item.textAlign)
      })
      .editGraphics({
        target: "thetaAxisLabels",
        property: "textBaseline",
        value: values.thetaLabels.map(item => item.textBaseline)
      });
  }

  if (values.thetaTitle !== undefined) {
    program = program
      .createGraphics({ id: "thetaAxisTitle", parent: "plot-main", type: "text" })
      .editGraphics({ target: "thetaAxisTitle", property: "x", value: values.thetaTitle.x })
      .editGraphics({ target: "thetaAxisTitle", property: "y", value: values.thetaTitle.y })
      .editGraphics({ target: "thetaAxisTitle", property: "text", value: values.thetaTitle.text })
      .editGraphics({ target: "thetaAxisTitle", property: "fill", value: "#0f172a" })
      .editGraphics({ target: "thetaAxisTitle", property: "fontSize", value: 13 })
      .editGraphics({ target: "thetaAxisTitle", property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: "thetaAxisTitle", property: "fontWeight", value: 600 })
      .editGraphics({ target: "thetaAxisTitle", property: "textAlign", value: "center" })
      .editGraphics({ target: "thetaAxisTitle", property: "textBaseline", value: "top" });
  }

  if (values.radialTitle !== undefined) {
    program = program
      .createGraphics({ id: "radialAxisTitle", parent: "plot-main", type: "text" })
      .editGraphics({ target: "radialAxisTitle", property: "x", value: values.radialTitle.x })
      .editGraphics({ target: "radialAxisTitle", property: "y", value: values.radialTitle.y })
      .editGraphics({ target: "radialAxisTitle", property: "text", value: values.radialTitle.text })
      .editGraphics({ target: "radialAxisTitle", property: "fill", value: "#0f172a" })
      .editGraphics({ target: "radialAxisTitle", property: "fontSize", value: 13 })
      .editGraphics({ target: "radialAxisTitle", property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: "radialAxisTitle", property: "fontWeight", value: 600 })
      .editGraphics({ target: "radialAxisTitle", property: "textAlign", value: "left" })
      .editGraphics({ target: "radialAxisTitle", property: "textBaseline", value: "top" });
  }

  const legend = values.legend;
  return program
    .createGraphics({
      id: "legendSymbols",
      parent: "canvas",
      type: "rect",
      length: legend.domain.length
    })
    .editGraphics({ target: "legendSymbols", property: "x", value: legend.symbolX })
    .editGraphics({ target: "legendSymbols", property: "y", value: legend.symbolY })
    .editGraphics({ target: "legendSymbols", property: "width", value: legend.symbolWidth })
    .editGraphics({ target: "legendSymbols", property: "height", value: legend.symbolHeight })
    .editGraphics({ target: "legendSymbols", property: "fill", value: legend.colors })
    .editGraphics({ target: "legendSymbols", property: "stroke", value: "#ffffff" })
    .editGraphics({ target: "legendSymbols", property: "strokeWidth", value: 0 })
    .createGraphics({
      id: "legendLabels",
      parent: "canvas",
      type: "text",
      length: legend.domain.length
    })
    .editGraphics({ target: "legendLabels", property: "x", value: legend.labelX })
    .editGraphics({ target: "legendLabels", property: "y", value: legend.itemY })
    .editGraphics({ target: "legendLabels", property: "text", value: legend.domain })
    .editGraphics({ target: "legendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "legendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "legendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "legendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "legendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "legendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "legendTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "legendTitle", property: "x", value: legend.titleX })
    .editGraphics({ target: "legendTitle", property: "y", value: legend.titleY })
    .editGraphics({ target: "legendTitle", property: "text", value: legend.title })
    .editGraphics({ target: "legendTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "legendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "legendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "legendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "legendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "legendTitle", property: "textBaseline", value: "middle" });
}

export function createCarsOriginDonutPrimitives(rows) {
  return createArcPrimitiveProgram(createCarsDonutReference(rows), {
    target: CARS_DONUT_TARGET,
    opacity: 1,
    sectorStroke: "#ffffff",
    sectorStrokeWidth: 1,
    thetaFontSize: 11
  });
}

export function createNightingaleRosePrimitives(rows) {
  return createArcPrimitiveProgram(createNightingaleRoseReference(rows), {
    target: NIGHTINGALE_TARGET,
    opacity: 0.9,
    sectorStroke: "#ffffff",
    sectorStrokeWidth: 0.5,
    thetaFontSize: 11
  });
}

export function createGapminderRadialBarPrimitives(rows) {
  return createArcPrimitiveProgram(createGapminderRadialBarReference(rows), {
    target: GAPMINDER_RADIAL_TARGET,
    opacity: 0.94,
    sectorStroke: "#ffffff",
    sectorStrokeWidth: 1,
    thetaFontSize: 10
  });
}
