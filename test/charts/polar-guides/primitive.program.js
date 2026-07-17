import { chart } from "../../../src/index.js";

import { createCarsPolarGuideReference } from "./reference-values.js";

export function createCarsPolarGuidePrimitives(rows) {
  const values = createCarsPolarGuideReference(rows);

  return chart()
    .createCanvas({ width: 620, height: 620, margin: 78 })
    .createData({ values: values.validRows })
    .createPointMark({ opacity: 0.78 })
    .encodeTheta({ field: "Acceleration" })
    .encodeR({ field: "Horsepower", scale: { zero: true } })
    .encodeColor({ field: "Origin" })
    .encodePointRadius({ value: 3 })
    .editSemantic({
      property: "guide.grid.radial.scale",
      value: "radius"
    })
    .editSemantic({
      property: "guide.grid.radial.coordinate",
      value: "polar"
    })
    .editSemantic({
      property: "guide.grid.theta.scale",
      value: "theta"
    })
    .editSemantic({
      property: "guide.grid.theta.coordinate",
      value: "polar"
    })
    .editSemantic({
      property: "guide.axis.theta.scale",
      value: "theta"
    })
    .editSemantic({
      property: "guide.axis.theta.coordinate",
      value: "polar"
    })
    .editSemantic({
      property: "guide.axis.theta.title",
      value: "Acceleration"
    })
    .editSemantic({
      property: "guide.axis.radius.scale",
      value: "radius"
    })
    .editSemantic({
      property: "guide.axis.radius.coordinate",
      value: "polar"
    })
    .editSemantic({
      property: "guide.axis.radius.title",
      value: "Horsepower"
    })
    .createGraphics({
      id: "radialGridCircles",
      parent: "plot-main",
      before: "point",
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
      before: "point",
      type: "line",
      length: values.thetaGrid.length
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "x1",
      value: values.thetaGrid.map(line => line.start.x)
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "y1",
      value: values.thetaGrid.map(line => line.start.y)
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "x2",
      value: values.thetaGrid.map(line => line.end.x)
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "y2",
      value: values.thetaGrid.map(line => line.end.y)
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "stroke",
      value: "#d7e0ea"
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "strokeWidth",
      value: 1
    })
    .editGraphics({
      target: "thetaGridLines",
      property: "strokeDash",
      value: values.thetaGrid.map(() => [])
    })
    .createGraphics({
      id: "thetaAxisLine",
      parent: "plot-main",
      type: "path"
    })
    .editGraphics({
      target: "thetaAxisLine",
      property: "commands",
      value: values.thetaAxisCommands
    })
    .editGraphics({
      target: "thetaAxisLine",
      property: "stroke",
      value: "#475569"
    })
    .editGraphics({
      target: "thetaAxisLine",
      property: "strokeWidth",
      value: 1.25
    })
    .createGraphics({
      id: "thetaAxisTicks",
      parent: "plot-main",
      type: "line",
      length: values.thetaTicks.length
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "x1",
      value: values.thetaTicks.map(tick => tick.start.x)
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "y1",
      value: values.thetaTicks.map(tick => tick.start.y)
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "x2",
      value: values.thetaTicks.map(tick => tick.end.x)
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "y2",
      value: values.thetaTicks.map(tick => tick.end.y)
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "stroke",
      value: "#475569"
    })
    .editGraphics({
      target: "thetaAxisTicks",
      property: "strokeWidth",
      value: 1
    })
    .createGraphics({
      id: "thetaAxisLabels",
      parent: "plot-main",
      type: "text",
      length: values.thetaLabels.length
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "x",
      value: values.thetaLabels.map(label => label.x)
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "y",
      value: values.thetaLabels.map(label => label.y)
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "text",
      value: values.thetaLabels.map(label => label.text)
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "fill",
      value: "#334155"
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "fontSize",
      value: 11
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "fontWeight",
      value: "normal"
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "textAlign",
      value: values.thetaLabels.map(label => label.textAlign)
    })
    .editGraphics({
      target: "thetaAxisLabels",
      property: "textBaseline",
      value: values.thetaLabels.map(label => label.textBaseline)
    })
    .createGraphics({
      id: "thetaAxisTitle",
      parent: "plot-main",
      type: "text"
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "x",
      value: values.thetaTitle.x
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "y",
      value: values.thetaTitle.y
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "text",
      value: values.thetaTitle.text
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "fill",
      value: "#0f172a"
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "fontSize",
      value: 13
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "fontWeight",
      value: 600
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "textAlign",
      value: "center"
    })
    .editGraphics({
      target: "thetaAxisTitle",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({
      id: "radialAxisLine",
      parent: "plot-main",
      type: "line"
    })
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
    .editGraphics({
      target: "radialAxisLine",
      property: "stroke",
      value: "#475569"
    })
    .editGraphics({
      target: "radialAxisLine",
      property: "strokeWidth",
      value: 1.25
    })
    .createGraphics({
      id: "radialAxisTicks",
      parent: "plot-main",
      type: "line",
      length: values.radialTicks.length
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "x1",
      value: values.radialTicks.map(tick => tick.start.x)
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "y1",
      value: values.radialTicks.map(tick => tick.start.y)
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "x2",
      value: values.radialTicks.map(tick => tick.end.x)
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "y2",
      value: values.radialTicks.map(tick => tick.end.y)
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "stroke",
      value: "#475569"
    })
    .editGraphics({
      target: "radialAxisTicks",
      property: "strokeWidth",
      value: 1
    })
    .createGraphics({
      id: "radialAxisLabels",
      parent: "plot-main",
      type: "text",
      length: values.radialLabels.length
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "x",
      value: values.radialLabels.map(label => label.x)
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "y",
      value: values.radialLabels.map(label => label.y)
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "text",
      value: values.radialLabels.map(label => label.text)
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "fill",
      value: "#334155"
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "fontSize",
      value: 11
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "fontWeight",
      value: "normal"
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "textAlign",
      value: "center"
    })
    .editGraphics({
      target: "radialAxisLabels",
      property: "textBaseline",
      value: "bottom"
    })
    .createGraphics({
      id: "radialAxisTitle",
      parent: "plot-main",
      type: "text"
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "x",
      value: values.radialTitle.x
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "y",
      value: values.radialTitle.y
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "text",
      value: values.radialTitle.text
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "fill",
      value: "#0f172a"
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "fontSize",
      value: 13
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "fontWeight",
      value: 600
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "textAlign",
      value: "center"
    })
    .editGraphics({
      target: "radialAxisTitle",
      property: "textBaseline",
      value: "top"
    });
}
