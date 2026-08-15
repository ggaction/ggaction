import { chart, hconcat, vconcat } from "../../../src/index.js";

import { duplicateRows, shuffleRows } from "../datasets/mutations.js";
import {
  LIFECYCLE_SCENARIO_RECIPES,
  REALISTIC_LIFECYCLE_REQUIRED_FEATURES,
  REALISTIC_LIFECYCLE_SCENARIO_RECIPES
} from "./lifecycle-recipes.js";
import {
  REALISTIC_ANALYSIS_RECIPES,
  REALISTIC_ANALYSIS_REQUIRED_FEATURES
} from "./realistic-recipes.js";
import {
  REALISTIC_DATA_MARK_INTERACTIONS,
  REALISTIC_DATA_MARK_REQUIRED_FEATURES,
  REALISTIC_DATA_MARK_SCENARIO_RECIPES
} from "./realistic-data-mark-recipes.js";
import {
  REALISTIC_GUIDE_SCALE_INTERACTIONS,
  REALISTIC_GUIDE_SCALE_RECIPES
} from "./realistic-guide-scale-recipes.js";
import {
  REALISTIC_FACADE_OPTION_RECIPES
} from "./realistic-facade-option-recipes.js";
import {
  barRows,
  boxRows,
  categoricalStressRows,
  densityRows,
  facetRows,
  heatmapBinRows,
  heatmapGridRows,
  histogramRows,
  intervalRows,
  labelRows,
  lineRows,
  monotoneIntervalRows,
  polarRows,
  scatterRows
} from "./data-views.js";

const PALETTES = Object.freeze(["tableau10", "set2", "dark2"]);

function canvas({ square = false, panel = false } = {}) {
  if (square) {
    return {
      width: 760,
      height: 700,
      margin: { top: 100, right: 210, bottom: 100, left: 100 }
    };
  }
  if (panel) {
    return {
      width: 420,
      height: 320,
      margin: { top: 54, right: 72, bottom: 76, left: 76 }
    };
  }
  return {
    width: 1400,
    height: 760,
    margin: { top: 180, right: 320, bottom: 180, left: 420 }
  };
}

function mutation(rows, kind, seed) {
  if (kind === "shuffle") return shuffleRows(rows, seed);
  if (kind === "duplicate") return duplicateRows(rows, 5);
  return rows;
}

function positionScale(type, { nice, reverse }) {
  return {
    type,
    nice,
    reverse,
    ...(type === "log" ? {} : { zero: false }),
    ...(type === "log" ? { base: 10 } : {}),
    ...(type === "pow" ? { exponent: 2 } : {}),
    ...(type === "symlog" ? { constant: 1 } : {})
  };
}

function buildScatter(factors) {
  const rows = mutation(
    scatterRows(factors.dataset),
    factors.mutation,
    `scatter-${factors.dataset}`
  );
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: rows })
    .createPointMark({ id: "points", shape: factors.shape, opacity: 0.72 })
    .encodeX({
      target: "points",
      field: "x",
      scale: factors.scalePath === "direct"
        ? positionScale(factors.scaleType, factors)
        : { nice: factors.nice, zero: false, reverse: factors.reverse }
    })
    .encodeY({ target: "points", field: "y", scale: { nice: true, zero: false } })
    .encodeColor({
      target: "points",
      field: "category",
      scale: { palette: factors.palette }
    })
    .encodeSize({ target: "points", field: "size", scale: { range: [2, 11] } });
  if (factors.scalePath === "edit") {
    program = program.editScale({
      id: "x",
      ...positionScale(factors.scaleType, factors)
    });
  }
  if (factors.jitter !== "none") {
    program = program.jitterPoints({
      target: "points",
      channel: "y",
      maxOffset: { pixels: 1.5 },
      seed: "scenario-jitter",
      ...(factors.mutation === "duplicate" ? {} : { key: "key" })
    });
    if (factors.jitter === "remove") {
      program = program.removeJitter({ target: "points" });
    }
  }
  return program
    .createGuides({
      axes: {
        x: factors.dataset === "zoo-quantitative-extremes"
          ? false
          : { ticksAndLabels: { count: 3 }, title: { text: "Positive X" } },
        y: { title: { text: "Y" } }
      },
      grid: { horizontal: true, vertical: true },
      legend: {
        position: factors.legendPosition,
        title: "Category",
        ...(factors.legendPosition === "left" ? { offset: 120 } : {})
      }
    })
    .createTitle({
      text: "Generated scatter scenario",
      subtitle: `${factors.dataset} · ${factors.scaleType}`,
      align: factors.titleAlign
    })
    .editPointMark({ target: "points", stroke: "#ffffff", strokeWidth: 0.7 });
}

function aggregateOption(value) {
  return value === "q75" ? { op: "quantile", probability: 0.75 } : value;
}

function buildLine(factors) {
  const rows = lineRows(factors.dataset);
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: rows })
    .createLineMark({ id: "lines", curve: "linear" })
    .encodeX({
      target: "lines",
      field: factors.pathOrder === "none" ? "time" : "orderValue",
      fieldType: factors.pathOrder === "none" ? "temporal" : "quantitative",
      scale: { nice: true, reverse: factors.reverse }
    })
    .encodeY({
      target: "lines",
      field: "value",
      ...(factors.pathOrder === "none"
        ? { aggregate: aggregateOption(factors.aggregate) }
        : {}),
      scale: { nice: true, zero: false }
    })
    .encodeGroup({ target: "lines", field: "category" })
    .encodeColor({ target: "lines", field: "category", scale: { palette: factors.palette } })
    .encodeStrokeDash({ target: "lines", field: "category" })
    .editLineMark({ target: "lines", curve: factors.curve, strokeWidth: 2.2 });
  if (factors.pathOrder !== "none") {
    program = program.encodePathOrder({
      target: "lines",
      field: "orderValue",
      order: factors.pathOrder === "descending" ? "descending" : "ascending"
    });
    if (factors.pathOrder === "remove") {
      program = program.removePathOrder({ target: "lines" });
    }
  }
  return program
    .createGuides({
      axes: { x: { title: { text: "Time" } }, y: { title: { text: "Value" } } },
      grid: { horizontal: {}, vertical: false },
      legend: { position: factors.legendPosition }
    })
    .createTitle({ text: "Generated temporal lines", subtitle: factors.dataset });
}

function buildBar(factors) {
  const sourceRows = barRows(factors.dataset);
  const rows = ["stack", "fill"].includes(factors.layout)
    ? sourceRows.map(row => ({ ...row, value: Math.abs(row.value) }))
    : sourceRows;
  const position = {
    field: "value",
    aggregate: aggregateOption(factors.aggregate),
    scale: { nice: true, zero: factors.layout !== "diverging" }
  };
  const category = { field: "category", fieldType: "nominal" };
  let program = chart()
    .createCanvas({
      width: 1500,
      height: 680,
      margin: { top: 90, right: 220, bottom: 190, left: 220 }
    })
    .createData({ id: "scenarioRows", values: rows })
    .createBarMark({ id: "bars", opacity: 0.86 })
    [factors.orientation === "vertical" ? "encodeX" : "encodeY"]({
      target: "bars",
      ...category
    })
    [factors.orientation === "vertical" ? "encodeY" : "encodeX"]({
      target: "bars",
      ...position
    })
    .encodeColor({
      target: "bars",
      field: "group",
      layout: factors.layout,
      scale: { palette: factors.palette }
    })
    .encodeBarWidth(
      factors.width === "pixels"
        ? { target: "bars", pixels: 18 }
        : { target: "bars", band: 0.7 }
    );
  if (factors.order !== "none") {
    const channel = factors.orientation === "vertical" ? "x" : "y";
    program = program.orderCategories({
      target: "bars",
      channel,
      by: { field: "value", aggregate: "sum" },
      direction: "descending"
    });
    if (factors.order === "remove") {
      program = program.removeCategoryOrder({ target: "bars", channel });
    }
  }
  return program
    .createGuides({ legend: { position: factors.legendPosition }, grid: false })
    .createTitle({ text: "Generated categorical bars", subtitle: factors.dataset });
}

function buildUnicodeStress(factors) {
  const rows = categoricalStressRows(factors.dataset);
  return chart()
    .createCanvas({
      width: 2600,
      height: 1400,
      margin: { top: 120, right: 1100, bottom: 180, left: 180 }
    })
    .createData({ id: "scenarioRows", values: rows })
    .createPointMark({ id: "unicodePoints", opacity: 0.78 })
    .encodeX({ target: "unicodePoints", field: "order", scale: { zero: false } })
    .encodeY({ target: "unicodePoints", field: "value", scale: { zero: false } })
    .encodeColor({
      target: "unicodePoints",
      field: "category",
      scale: { palette: factors.palette }
    })
    .encodePointRadius({ target: "unicodePoints", value: factors.radius })
    .createTextMark({
      id: "unicodeText",
      data: "scenarioRows",
      fontFamily: factors.fontFamily,
      fontSize: factors.fontSize,
      dx: 10
    })
    .encodeX({ target: "unicodeText", field: "order", scale: { id: "x" } })
    .encodeY({ target: "unicodeText", field: "value", scale: { id: "y" } })
    .encodeText({ target: "unicodeText", field: "category" })
    .createGuides({
      axes: {
        x: { ticksAndLabels: { count: 6 }, title: { text: "Source row" } },
        y: { title: { text: "Value" } }
      },
      legend: {
        position: "right",
        title: "Full Unicode categories",
        itemGap: 32
      }
    })
    .createTitle({ text: "Full Unicode label stress", subtitle: factors.fontFamily });
}

function buildCardinalityStress(factors) {
  const rows = categoricalStressRows(factors.dataset);
  return chart()
    .createCanvas({
      width: 3400,
      height: 7200,
      margin: { top: 140, right: 1500, bottom: 220, left: 180 }
    })
    .createData({ id: "scenarioRows", values: rows })
    .createPointMark({ id: "cardinalityPoints", opacity: factors.opacity })
    .encodeX({ target: "cardinalityPoints", field: "order" })
    .encodeY({
      target: "cardinalityPoints",
      field: "value",
      scale: { zero: false }
    })
    .encodeColor({
      target: "cardinalityPoints",
      field: "category",
      scale: { palette: factors.palette }
    })
    .encodePointRadius({ target: "cardinalityPoints", value: factors.radius })
    .createGuides({
      axes: {
        x: { ticksAndLabels: { count: 8 }, title: { text: "Category ordinal" } },
        y: { title: { text: "Value" } }
      },
      legend: {
        position: "right",
        title: "All 257 categories",
        itemGap: 26
      }
    })
    .createTitle({ text: "257-category legend stress" });
}

function histogramBoundaries(rows) {
  const values = [...new Set(rows.map(row => row.value).filter(Number.isFinite))]
    .sort((left, right) => left - right);
  if (values.length < 2) {
    throw new Error("Histogram boundary stress requires at least two finite values.");
  }
  return [...new Set([0, 0.25, 0.5, 0.75, 1].map(quantile =>
    values[Math.round((values.length - 1) * quantile)]
  ))];
}

function histogramBinning(mode, rows) {
  if (mode === "step") {
    const values = rows.map(row => row.value).filter(Number.isFinite);
    const span = Math.max(...values) - Math.min(...values);
    return { binStep: span / 5 > 0 ? span / 5 : Number.MIN_VALUE };
  }
  if (mode === "boundaries") return { binBoundaries: histogramBoundaries(rows) };
  return { maxBins: 12 };
}

function buildHistogramProgram(factors, rows, binning, subtitle) {
  return chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: rows })
    .createHistogram({
      id: "histogram",
      field: "value",
      ...binning,
      stack: factors.stack === "normalize" ? "normalize" : "zero",
      xScale: { nice: factors.nice, zero: false },
      color: {
        field: "category",
        layout: factors.stack === "normalize" ? "fill" : "stack",
        scale: { palette: factors.palette }
      },
      guides: {
        axes: { x: { ticksAndLabels: { count: 3 } } },
        legend: { position: factors.legendPosition }
      }
    })
    .createTitle({ text: "Generated histogram", subtitle });
}

function buildHistogram(factors) {
  const rows = histogramRows(factors.dataset, "all");
  return buildHistogramProgram(
    factors,
    rows,
    histogramBinning(factors.binning, rows),
    `${factors.dataset} · ${factors.binning}`
  );
}

function buildExtremeHistogram(factors) {
  const rows = histogramRows(factors.dataset, factors.dataVariant);
  return buildHistogramProgram(
    factors,
    rows,
    histogramBinning(factors.binning, rows),
    `${factors.dataset} · ${factors.dataVariant} · ${factors.binning}`
  );
}

function buildDensity(factors) {
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: densityRows(factors.dataset) })
    .createAreaMark({ id: "density", opacity: 0.42 })
    .encodeDensity({
      target: "density",
      field: "value",
      groupBy: "category",
      kernel: factors.kernel,
      normalization: factors.normalization,
      steps: factors.steps,
      ...(factors.bandwidth === "auto" ? {} : { bandwidth: factors.bandwidth })
    })
    .encodeColor({ target: "density", field: "category", layout: "overlay", scale: { palette: factors.palette } });
  if (factors.edit) {
    program = program.editDensity({
      target: "density",
      kernel: factors.kernel === "gaussian" ? "triangular" : "gaussian",
      steps: factors.steps === 32 ? 64 : 32
    });
  }
  return program
    .createGuides({ legend: { position: "right" }, grid: { horizontal: true, vertical: false } })
    .createTitle({ text: "Generated density", subtitle: factors.dataset });
}

function whisker(value) {
  if (value === "minmax") return { type: "minmax" };
  return { type: "tukey", factor: value === "tukey1" ? 1 : 1.5 };
}

function buildBox(factors) {
  const vertical = factors.orientation === "vertical";
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: boxRows(factors.dataset) })
    .createBoxPlot({
      id: "boxes",
      x: vertical
        ? { field: "category", fieldType: "nominal" }
        : { field: "value" },
      y: vertical
        ? { field: "value" }
        : { field: "category", fieldType: "nominal" },
      whisker: whisker(factors.whisker),
      width: { band: factors.width },
      outliers: factors.outliers
    });
  if (factors.color) {
    program = program.encodeColor({
      target: "boxes",
      field: "category",
      fieldType: "nominal",
      scale: { palette: factors.palette }
    });
  }
  return program
    .createGuides({ legend: factors.color ? { position: "right" } : false })
    .createTitle({ text: "Generated box plot", subtitle: factors.dataset });
}

function buildHeatmapGrid(factors) {
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: heatmapGridRows() })
    .createHeatmap({
      id: "cells",
      x: { field: "x", fieldType: "nominal" },
      y: { field: "y", fieldType: "nominal" },
      color: {
        field: "value",
        fieldType: "quantitative",
        scale: { type: "sequential", palette: factors.palette, reverse: factors.reverse }
      },
      rect: { stroke: factors.stroke ? "#ffffff" : "transparent", strokeWidth: factors.stroke ? 1 : 0 },
      guides: { legend: { position: factors.legendPosition } }
    });
  if (factors.text) {
    program = program
      .createTextMark({ id: "cellLabels", fontSize: 10, align: "center", baseline: "middle" })
      .encodeX({ target: "cellLabels", field: "x", fieldType: "nominal" })
      .encodeY({ target: "cellLabels", field: "y", fieldType: "nominal" })
      .encodeText({ target: "cellLabels", field: "value", format: ".0f" });
  }
  return program.createTitle({ text: "Generated sparse heatmap" });
}

function buildHeatmapBin(factors) {
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: heatmapBinRows(factors.dataset) })
    .createHeatmap({
      id: "heat",
      x: { field: "x" },
      y: { field: "y" },
      bin: { bins: factors.bins, includeEmpty: factors.includeEmpty },
      color: { scale: { type: "sequential", palette: factors.palette } },
      guides: { legend: { position: "right" } }
    });
  if (factors.edit !== "none") {
    program = program.editBin2DData({
      target: "heatBin2DData",
      bins: factors.bins === 4 ? 8 : 4,
      includeEmpty: factors.edit === "toggle" ? !factors.includeEmpty : factors.includeEmpty
    });
  }
  return program.createTitle({ text: "Generated binned heatmap", subtitle: factors.dataset });
}

function errorBarCaps(style) {
  if (style === "none") return { caps: false };
  return {
    caps: true,
    capSize: { short: 4, medium: 8, long: 16 }[style]
  };
}

function buildErrorBar(factors) {
  const rows = intervalRows();
  const horizontal = factors.orientation === "horizontal";
  return chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: rows })
    .createErrorBar({
      id: "interval",
      x: horizontal
        ? { center: "center", lower: "lower", upper: "upper" }
        : { field: "category", fieldType: "nominal" },
      y: horizontal
        ? { field: "category", fieldType: "nominal" }
        : { center: "center", lower: "lower", upper: "upper" },
      ...errorBarCaps(factors.capStyle),
      strokeDash: factors.dash,
      strokeWidth: 1.5
    })
    .createGuides({
      axes: {
        x: { title: { text: horizontal ? "Interval" : "Position" } },
        y: { title: { text: horizontal ? "Position" : "Interval" } }
      },
      legend: false
    })
    .createTitle({
      text: "Generated error bars",
      subtitle: `${factors.orientation} · ${factors.capStyle}`
    });
}

function buildErrorBand(factors) {
  const rows = monotoneIntervalRows();
  const horizontal = factors.orientation === "horizontal";
  return chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: rows })
    .createErrorBand({
      id: "interval",
      x: horizontal
        ? { center: "center", lower: "lower", upper: "upper" }
        : { field: "position" },
      y: horizontal
        ? { field: "position" }
        : { center: "center", lower: "lower", upper: "upper" },
      groupBy: "group",
      curve: factors.curve,
      boundaries: { stroke: "#334155", strokeDash: factors.dash }
    })
    .encodeColor({ target: "interval", field: "group", layout: "overlay" })
    .createGuides({
      axes: {
        x: { title: { text: horizontal ? "Interval" : "Position" } },
        y: { title: { text: horizontal ? "Position" : "Interval" } }
      },
      legend: { position: "right" }
    })
    .createTitle({
      text: "Generated error bands",
      subtitle: `${factors.orientation} · ${factors.curve}`
    });
}

function buildPolar(factors) {
  let program = chart()
    .createCanvas(canvas({ square: true }))
    .createData({ id: "scenarioRows", values: polarRows(factors.dataset) })
    .createPointMark({ id: "polarPoints", opacity: 0.65, shape: factors.shape })
    .encodeTheta({ target: "polarPoints", field: "theta", scale: { reverse: factors.reverse } })
    .encodeR({ target: "polarPoints", field: "radius", scale: { zero: factors.zero } })
    .encodeColor({ target: "polarPoints", field: "category", scale: { palette: factors.palette } })
    .encodePointRadius({ target: "polarPoints", value: factors.radius });
  if (factors.guides !== "none") {
    program = program.createGuides();
    if (factors.guides === "edit") {
      program = program
        .editThetaAxis({ ticksAndLabels: { count: 5 } })
        .editRadialAxis({ angle: 45 })
        .editThetaGrid({ count: 5, strokeDash: [2, 2] })
        .editRadialGrid({ count: 4, lineWidth: 1.5 });
    } else if (factors.guides === "remove") {
      program = program
        .removeThetaAxis()
        .removeRadialAxis()
        .removeGrid({ theta: true, radial: true });
    }
  }
  return program.createTitle({ text: "Generated polar points", subtitle: factors.dataset });
}

function buildArc(factors) {
  let program = chart()
    .createCanvas(canvas({ square: true }))
    .createData({ id: "scenarioRows", values: polarRows(factors.dataset) })
    .createArcMark({
      id: "arcs",
      innerRadius: factors.innerRadius,
      padAngle: factors.padAngle,
      opacity: factors.opacity
    })
    .encodeTheta({ target: "arcs", field: "category", aggregate: "sum", weight: "value" })
    .encodeColor({ target: "arcs", field: "category", scale: { palette: factors.palette } });
  if (factors.edit) {
    program = program.editArcMark({
      target: "arcs",
      innerRadius: factors.innerRadius === 0 ? 0.35 : 0,
      padAngle: factors.padAngle === 0 ? 1 : 0
    });
  }
  return program
    .createGuides({ axes: false, grid: false, legend: { position: factors.legendPosition, title: "Sector" } })
    .createTitle({ text: "Generated arc chart", subtitle: factors.dataset });
}

function buildLabels(factors) {
  const rows = labelRows();
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "scenarioRows", values: rows })
    .createPointMark({ id: "points", fill: "#2563eb" })
    .encodeX({ target: "points", field: "x", scale: { domain: [0, 1], zero: false } })
    .encodeY({ target: "points", field: "y", scale: { domain: [0.45, 0.55], zero: false } })
    .encodePointRadius({ target: "points", value: 2.5 })
    .createTextMark({
      id: "labels",
      fill: "#0f172a",
      fontSize: factors.fontSize,
      fontFamily: factors.fontFamily,
      fontWeight: factors.fontWeight,
      align: "left",
      baseline: "middle",
      dx: 6
    })
    .encodeText({ target: "labels", field: "label" })
    .layoutLabels({
      target: "labels",
      axis: factors.axis,
      padding: factors.padding,
      maxDisplacement: factors.maxDisplacement,
      bounds: "plot",
      ...(factors.leader ? { leader: { stroke: "#94a3b8", strokeWidth: 0.8 } } : {})
    });
  if (factors.remove) program = program.removeLabelLayout({ target: "labels" });
  return program
    .createGuides({ legend: false })
    .createTitle({ text: "Generated label layout", subtitle: `${factors.fontFamily} ${factors.fontWeight}` });
}

function buildFacet(factors) {
  let program = chart()
    .createCanvas(canvas({ panel: true }))
    .createData({ id: "scenarioRows", values: facetRows(factors.dataset) })
    .createPointMark({ id: "points", opacity: 0.7 })
    .encodeX({ target: "points", field: "x", scale: { nice: true, zero: false } })
    .encodeY({ target: "points", field: "y", scale: { nice: true, zero: false } })
    .encodeColor({ target: "points", field: "category", scale: { palette: factors.palette } })
    .encodePointRadius({ target: "points", value: 2.5 })
    .createGuides({ legend: false })
    .facet({
      id: "facets",
      field: "facet",
      columns: factors.columns,
      gap: factors.gap,
      padding: factors.padding,
      align: factors.align,
      scales: { x: factors.scalePolicy, y: factors.scalePolicy },
      guides: { axes: factors.axes, legend: factors.legend ? "shared" : false }
    })
    .editFacetHeaders({
      fontSize: factors.headerSize,
      fontWeight: factors.headerWeight,
      offset: 10
    });
  if (factors.editGuides) {
    program = program.editFacetGuides({ axes: factors.axes === "each" ? "outer" : "each" });
  }
  return program.createTitle({ text: "Generated facets", subtitle: factors.dataset });
}

function miniatureScatter(rows, color) {
  return chart()
    .createCanvas({
      width: 340,
      height: 280,
      margin: { top: 40, right: 30, bottom: 70, left: 70 }
    })
    .createData({ values: rows })
    .createPointMark({ fill: color })
    .encodeX({ field: "x", scale: { zero: false } })
    .encodeY({ field: "y", scale: { zero: false } })
    .encodePointRadius({ value: 2.5 })
    .createGuides({ legend: false });
}

function buildComposition(factors) {
  const rows = scatterRows("zoo-multi-encoding-styles");
  const first = miniatureScatter(rows, "#2563eb").createTitle({ text: "First" });
  const second = miniatureScatter([...rows].reverse(), "#e45756").createTitle({ text: "Second" });
  const compose = factors.direction === "horizontal" ? hconcat : vconcat;
  let program = compose({
    id: "generatedComposition",
    programs: [{ id: "first", program: first }, { id: "second", program: second }],
    gap: factors.gap,
    padding: factors.padding,
    align: factors.align
  });
  if (factors.edit) {
    program = program.editCompositionLayout({
      gap: factors.gap === 0 ? 12 : 0,
      padding: factors.padding === 0 ? 8 : 0
    });
  }
  return program;
}

function recipe(id, datasets, factors, build) {
  return Object.freeze({ id, datasets: Object.freeze(datasets), factors: Object.freeze(factors), build });
}

export const SCENARIO_RECIPES = Object.freeze([
  recipe("scatter-transforms", [
    "zoo-positive-log-decades", "zoo-quantitative-extremes",
    "zoo-multi-encoding-styles", "zoo-constant-domain", "tt-penguins"
  ], {
    scaleType: ["linear", "log", "sqrt", "pow", "symlog"],
    scalePath: ["direct", "edit"], nice: [false, true], reverse: [false, true],
    palette: PALETTES, shape: ["circle", "diamond", "triangle-up"],
    mutation: ["none", "shuffle", "duplicate"], jitter: ["none", "keep", "remove"],
    legendPosition: ["right", "left", "top", "bottom"], titleAlign: ["left", "center", "right"]
  }, buildScatter),
  recipe("temporal-lines", [
    "zoo-temporal-irregular", "zoo-temporal-boundaries",
    "tt-global-temperatures", "tt-london-marathon-winners"
  ], {
    curve: ["linear", "step", "monotone", "cardinal"],
    aggregate: ["mean", "median", "q75"], reverse: [false, true],
    pathOrder: ["none", "descending", "remove"], palette: PALETTES,
    legendPosition: ["right", "bottom"]
  }, buildLine),
  recipe("categorical-bars", [
    "zoo-unicode-labels", "zoo-categorical-cardinality",
    "zoo-diverging-stacks", "zoo-numeric-looking-categories", "tt-penguins"
  ], {
    layout: ["group", "stack", "overlay", "diverging", "fill"],
    aggregate: ["sum", "mean", "median"], orientation: ["vertical", "horizontal"],
    order: ["none", "descending", "remove"], width: ["band", "pixels"],
    palette: PALETTES, legendPosition: ["right", "bottom"]
  }, buildBar),
  recipe("unicode-label-stress", ["zoo-unicode-labels"], {
    palette: PALETTES, radius: [3, 6], fontFamily: ["sans-serif", "monospace"],
    fontSize: [14, 18]
  }, buildUnicodeStress),
  recipe("categorical-cardinality-stress", ["zoo-categorical-cardinality"], {
    palette: PALETTES, radius: [2.5, 4.5], opacity: [0.55, 0.9]
  }, buildCardinalityStress),
  recipe("histogram-binning", [
    "zoo-histogram-boundaries", "tt-us-tornadoes", "tt-himalayan-peaks"
  ], {
    binning: ["maxBins", "step", "boundaries"], stack: ["zero", "normalize"],
    nice: [false, true], palette: PALETTES, legendPosition: ["right", "bottom"]
  }, buildHistogram),
  recipe("histogram-extreme-binning", ["zoo-histogram-boundaries"], {
    dataVariant: ["subnormal", "large-offset"],
    binning: ["maxBins", "step", "boundaries"], stack: ["zero", "normalize"],
    nice: [false, true], palette: PALETTES, legendPosition: ["right", "bottom"]
  }, buildExtremeHistogram),
  recipe("kernel-density", ["zoo-multimodal-density", "tt-penguins"], {
    kernel: ["gaussian", "epanechnikov", "triangular"],
    normalization: ["unit", "count"], steps: [32, 64, 100],
    bandwidth: ["auto", 0.4, 1.2], palette: PALETTES, edit: [false, true]
  }, buildDensity),
  recipe("box-summary", ["zoo-boxplot-thresholds", "tt-penguins"], {
    orientation: ["vertical", "horizontal"], whisker: ["tukey15", "tukey1", "minmax"],
    outliers: [false, true], width: [0.45, 0.75], color: [false, true], palette: PALETTES
  }, buildBox),
  recipe("sparse-heatmap", ["zoo-sparse-grid"], {
    palette: ["viridis", "magma", "blues"], reverse: [false, true],
    stroke: [false, true], text: [false, true], legendPosition: ["right", "bottom"]
  }, buildHeatmapGrid),
  recipe("binned-heatmap", ["zoo-label-collision-cloud", "tt-us-tornadoes"], {
    bins: [4, 8, { x: 6, y: 10 }], includeEmpty: [false, true],
    edit: ["none", "resize", "toggle"], palette: ["viridis", "magma", "blues"]
  }, buildHeatmapBin),
  recipe("explicit-error-bars", ["zoo-asymmetric-intervals"], {
    orientation: ["vertical", "horizontal"],
    capStyle: ["none", "short", "medium", "long"],
    dash: ["solid", "dashed", [4, 2]]
  }, buildErrorBar),
  recipe("explicit-error-bands", ["zoo-asymmetric-intervals"], {
    orientation: ["vertical", "horizontal"],
    dash: ["solid", "dashed", [4, 2]], curve: ["linear", "step", "monotone"]
  }, buildErrorBand),
  recipe("polar-points", ["zoo-polar-wrap", "zoo-unicode-labels"], {
    guides: ["none", "edit", "remove"], reverse: [false, true], zero: [false, true],
    radius: [1.5, 3, 6], shape: ["circle", "diamond"], palette: PALETTES
  }, buildPolar),
  recipe("polar-arcs", ["zoo-polar-wrap", "zoo-unicode-labels"], {
    innerRadius: [0, 0.35, 0.65], padAngle: [0, 0.5, 2], opacity: [0.55, 0.85, 1],
    palette: PALETTES, legendPosition: ["right", "bottom"], edit: [false, true]
  }, buildArc),
  recipe("dense-labels", ["zoo-label-collision-cloud"], {
    axis: ["x", "y", "both"], padding: [0, 2, 6], maxDisplacement: [12, 32, 64],
    fontSize: [10, 12, 16], fontFamily: ["sans-serif", "monospace"],
    fontWeight: ["normal", 700], leader: [false, true], remove: [false, true]
  }, buildLabels),
  recipe("facet-layout", ["zoo-facet-imbalance", "tt-penguins"], {
    columns: [1, 2, 3], gap: [8, 20], padding: [4, 14], align: ["start", "center", "end"],
    axes: ["each", "outer"], legend: [false, true], scalePolicy: ["shared", "independent"],
    headerSize: [11, 15], headerWeight: ["normal", 700], palette: PALETTES,
    editGuides: [false, true]
  }, buildFacet),
  recipe("program-composition", ["zoo-multi-encoding-styles"], {
    direction: ["horizontal", "vertical"], gap: [0, 8, 20], padding: [0, 8],
    align: ["start", "center", "end"], edit: [false, true]
  }, buildComposition),
  ...LIFECYCLE_SCENARIO_RECIPES
]);

export const REALISTIC_SCENARIO_RECIPES = Object.freeze([
  ...REALISTIC_ANALYSIS_RECIPES,
  ...REALISTIC_LIFECYCLE_SCENARIO_RECIPES,
  ...REALISTIC_DATA_MARK_SCENARIO_RECIPES,
  ...REALISTIC_GUIDE_SCALE_RECIPES,
  ...REALISTIC_FACADE_OPTION_RECIPES
]);

export const REALISTIC_REQUIRED_FEATURES = Object.freeze([...new Set([
  ...REALISTIC_ANALYSIS_REQUIRED_FEATURES,
  ...REALISTIC_LIFECYCLE_REQUIRED_FEATURES,
  ...REALISTIC_DATA_MARK_REQUIRED_FEATURES
])].sort());

export const REALISTIC_REQUIRED_INTERACTIONS = Object.freeze([
  Object.freeze({ members: Object.freeze(["lifecycle:compose", "renderer:svg"]) }),
  Object.freeze({ members: Object.freeze(["lifecycle:edit", "renderer:svg"]) }),
  Object.freeze({ members: Object.freeze(["lifecycle:filter", "lifecycle:select"]) }),
  Object.freeze({ members: Object.freeze(["lifecycle:highlight", "lifecycle:select"]) }),
  ...REALISTIC_DATA_MARK_INTERACTIONS,
  ...REALISTIC_GUIDE_SCALE_INTERACTIONS
]);

export function scenarioRecipe(id) {
  const value = [...SCENARIO_RECIPES, ...REALISTIC_SCENARIO_RECIPES]
    .find(recipeValue => recipeValue.id === id);
  if (value === undefined) throw new Error(`Unknown scenario recipe "${id}".`);
  return value;
}
