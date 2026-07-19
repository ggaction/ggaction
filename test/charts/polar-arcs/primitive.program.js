import { chart } from "../../../src/index.js";

import {
  CAUSE_ORDER,
  CARS_DONUT_TARGET,
  CLUSTER_ORDER,
  GAPMINDER_RADIAL_TARGET,
  GAPMINDER_WEIGHTED_DONUT_TARGET,
  MONTH_ORDER,
  NIGHTINGALE_TARGET,
  RADIAL_COUNTRY_ORDER,
  createCarsDonutReference,
  createGapminderWeightedDonutReference,
  createGapminderRadialBarReference,
  createNightingaleRoseReference
} from "./reference-values.js";

function editProperties(program, prefix, values) {
  let next = program;
  for (const [property, value] of Object.entries(values)) {
    next = next.editSemantic({ property: `${prefix}.${property}`, value });
  }
  return next;
}

function authorArcSemantics(program, semantic) {
  let next = program
    .editSemantic({ property: "coordinate[polar].type", value: "polar" })
    .editSemantic({ property: "layer[arc].coordinate", value: "polar" });
  for (const [id, definition] of Object.entries(semantic.scales)) {
    next = editProperties(next, `scale[${id}]`, definition);
  }
  for (const [channel, definition] of Object.entries(semantic.encoding)) {
    next = editProperties(next, `layer[arc].encoding.${channel}`, definition);
  }
  for (const [path, definition] of Object.entries(semantic.guides)) {
    next = editProperties(next, `guide.${path}`, definition);
  }
  return next;
}

function createArcPrimitiveProgram(values, settings) {
  let program = chart()
    .createCanvas({
      width: settings.target.width,
      height: settings.target.height,
      margin: settings.target.margin
    })
    .createData({ values: values.rows })
    .createArcMark(settings.mark);

  program = authorArcSemantics(program, settings.semantic);

  if (values.radialGridCommands !== undefined) {
    program = program
      .createGraphics({
        id: "radialGridCircles",
        parent: "plot-main",
        before: "arc",
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
    .editGraphics({ target: "arc", property: "length", value: values.sectors.length })
    .editGraphics({
      target: "arc",
      property: "commands",
      value: values.sectors.map(sector => sector.commands)
    })
    .editGraphics({
      target: "arc",
      property: "fill",
      value: values.sectors.map(sector => sector.fill)
    })
    .editGraphics({
      target: "arc",
      property: "opacity",
      value: settings.opacity
    })
    .editGraphics({
      target: "arc",
      property: "stroke",
      value: settings.sectorStroke
    })
    .editGraphics({
      target: "arc",
      property: "strokeWidth",
      value: settings.sectorStrokeWidth
    })
    .editGraphics({
      target: "arc",
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
      .editGraphics({ target: "thetaAxisLine", property: "stroke", value: "#475569" })
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
        id: "thetaAxisTicks",
        parent: "plot-main",
        ...(values.radialAxis === undefined ? {} : { before: "radialAxisLine" }),
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
        ...(values.radialAxis === undefined ? {} : { before: "radialAxisLine" }),
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
      .createGraphics({
        id: "thetaAxisTitle",
        parent: "plot-main",
        ...(values.radialAxis === undefined ? {} : { before: "radialAxisLine" }),
        type: "text"
      })
      .editGraphics({ target: "thetaAxisTitle", property: "x", value: values.thetaTitle.x })
      .editGraphics({ target: "thetaAxisTitle", property: "y", value: values.thetaTitle.y })
      .editGraphics({ target: "thetaAxisTitle", property: "text", value: values.thetaTitle.text })
      .editGraphics({ target: "thetaAxisTitle", property: "fill", value: "#0f172a" })
      .editGraphics({ target: "thetaAxisTitle", property: "fontSize", value: 13 })
      .editGraphics({ target: "thetaAxisTitle", property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: "thetaAxisTitle", property: "fontWeight", value: 600 })
      .editGraphics({ target: "thetaAxisTitle", property: "textAlign", value: "center" })
      .editGraphics({ target: "thetaAxisTitle", property: "textBaseline", value: "middle" });
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
      .editGraphics({
        target: "radialAxisTitle",
        property: "textAlign",
        value: values.radialTitle.textAlign
      })
      .editGraphics({
        target: "radialAxisTitle",
        property: "textBaseline",
        value: values.radialTitle.textBaseline
      });
  }

  const legend = values.legend;
  return program
    .createGraphics({
      id: "colorLegendSymbols",
      parent: "canvas",
      type: "rect",
      length: legend.domain.length
    })
    .editGraphics({ target: "colorLegendSymbols", property: "x", value: legend.symbolX })
    .editGraphics({ target: "colorLegendSymbols", property: "y", value: legend.symbolY })
    .editGraphics({ target: "colorLegendSymbols", property: "width", value: legend.symbolWidth })
    .editGraphics({ target: "colorLegendSymbols", property: "height", value: legend.symbolHeight })
    .editGraphics({ target: "colorLegendSymbols", property: "fill", value: legend.colors })
    .editGraphics({ target: "colorLegendSymbols", property: "stroke", value: "white" })
    .editGraphics({ target: "colorLegendSymbols", property: "strokeWidth", value: 0.5 })
    .createGraphics({
      id: "colorLegendLabels",
      parent: "canvas",
      type: "text",
      length: legend.domain.length
    })
    .editGraphics({ target: "colorLegendLabels", property: "x", value: legend.labelX })
    .editGraphics({ target: "colorLegendLabels", property: "y", value: legend.itemY })
    .editGraphics({ target: "colorLegendLabels", property: "text", value: legend.domain })
    .editGraphics({ target: "colorLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "colorLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "colorLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "colorLegendTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "colorLegendTitle", property: "x", value: legend.titleX })
    .editGraphics({ target: "colorLegendTitle", property: "y", value: legend.titleY })
    .editGraphics({ target: "colorLegendTitle", property: "text", value: legend.title })
    .editGraphics({ target: "colorLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "colorLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "colorLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendTitle", property: "textBaseline", value: "middle" });
}

export function createCarsOriginDonutPrimitives(rows) {
  return createArcPrimitiveProgram(createCarsDonutReference(rows), {
    target: CARS_DONUT_TARGET,
    opacity: 1,
    sectorStroke: "#ffffff",
    sectorStrokeWidth: 1,
    thetaFontSize: 11,
    mark: { innerRadius: 0.56, padAngle: 1.5 },
    semantic: {
      scales: {
        theta: {
          type: "band", domain: "auto", range: "auto",
          paddingInner: 0, paddingOuter: 0, align: 0.5
        },
        color: { type: "ordinal", domain: "auto", range: { palette: "tableau10" } }
      },
      encoding: {
        theta: {
          field: "Origin", fieldType: "nominal", scale: "theta",
          aggregate: "count"
        },
        color: { field: "Origin", fieldType: "nominal", scale: "color" }
      },
      guides: {
        "legend.color": { scale: "color", title: "Origin" }
      }
    }
  });
}

export function createGapminderWeightedDonutPrimitives(rows) {
  return createArcPrimitiveProgram(createGapminderWeightedDonutReference(rows), {
    target: GAPMINDER_WEIGHTED_DONUT_TARGET,
    opacity: 0.96,
    sectorStroke: "#ffffff",
    sectorStrokeWidth: 1,
    thetaFontSize: 11,
    mark: { innerRadius: 0.5, padAngle: 1.25, opacity: 0.96 },
    semantic: {
      scales: {
        theta: {
          type: "band", domain: CLUSTER_ORDER, range: "auto",
          paddingInner: 0, paddingOuter: 0, align: 0.5
        },
        color: {
          type: "ordinal", domain: CLUSTER_ORDER,
          range: ["#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b", "#eeca3b"]
        }
      },
      encoding: {
        theta: {
          field: "cluster", fieldType: "nominal", scale: "theta",
          aggregate: "sum", weight: "pop"
        },
        color: { field: "cluster", fieldType: "nominal", scale: "color" }
      },
      guides: {
        "legend.color": { scale: "color", title: "Cluster" }
      }
    }
  });
}

export function createNightingaleRosePrimitives(rows) {
  return createArcPrimitiveProgram(createNightingaleRoseReference(rows), {
    target: NIGHTINGALE_TARGET,
    opacity: 0.9,
    sectorStroke: "#ffffff",
    sectorStrokeWidth: 0.5,
    thetaFontSize: 11,
    mark: { padAngle: 1, opacity: 0.9, strokeWidth: 0.5 },
    semantic: {
      scales: {
        theta: {
          type: "band", domain: MONTH_ORDER, range: "auto",
          paddingInner: 0, paddingOuter: 0, align: 0.5
        },
        radius: { type: "linear", domain: [0, 6.5], range: "auto", zero: true },
        color: {
          type: "ordinal", domain: CAUSE_ORDER,
          range: ["#599ad3", "#727272", "#f1595f"]
        }
      },
      encoding: {
        theta: { field: "month", fieldType: "ordinal", scale: "theta" },
        radius: { field: "value", fieldType: "quantitative", scale: "radius" },
        color: {
          field: "cause", fieldType: "nominal", scale: "color", layout: "overlay"
        }
      },
      guides: {
        "axis.theta": { scale: "theta", coordinate: "polar" },
        "axis.radius": {
          scale: "radius", coordinate: "polar", title: "Mortality rate"
        },
        "grid.radial": { scale: "radius", coordinate: "polar" },
        "legend.color": { scale: "color", title: "Cause" }
      }
    }
  });
}

export function createGapminderRadialBarPrimitives(rows) {
  return createArcPrimitiveProgram(createGapminderRadialBarReference(rows), {
    target: GAPMINDER_RADIAL_TARGET,
    opacity: 0.94,
    sectorStroke: "#ffffff",
    sectorStrokeWidth: 1,
    thetaFontSize: 11,
    mark: { innerRadius: 0.18, padAngle: 2, opacity: 0.94 },
    semantic: {
      scales: {
        theta: {
          type: "band", domain: RADIAL_COUNTRY_ORDER, range: "auto",
          paddingInner: 0, paddingOuter: 0, align: 0.5
        },
        radius: { type: "linear", domain: [45, 85], range: "auto", zero: false },
        color: { type: "ordinal", domain: "auto", range: { palette: "tableau10" } }
      },
      encoding: {
        theta: { field: "country", fieldType: "nominal", scale: "theta" },
        radius: {
          field: "life_expect", fieldType: "quantitative", scale: "radius"
        },
        color: { field: "cluster", fieldType: "nominal", scale: "color" }
      },
      guides: {
        "axis.theta": {
          scale: "theta", coordinate: "polar", title: "Country"
        },
        "axis.radius": {
          scale: "radius", coordinate: "polar", title: "Life expectancy"
        },
        "grid.radial": { scale: "radius", coordinate: "polar" },
        "legend.color": { scale: "color", title: "Cluster" }
      }
    }
  });
}
