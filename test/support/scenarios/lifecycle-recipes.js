import { chart, hconcat } from "../../../src/index.js";

import { loadZooDataset } from "../datasets/zoo.js";
import {
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticDatasetSupports,
  realisticLifecycleRows,
  realisticSourceFields
} from "./realistic-data.js";

const CARTESIAN_CANVAS = Object.freeze({
  width: 920,
  height: 560,
  margin: Object.freeze({ top: 110, right: 220, bottom: 120, left: 150 })
});

function cartesianCanvas(factors) {
  return factors.dataset?.startsWith("tt-")
    ? {
        width: 1800,
        height: 920,
        margin: { top: 280, right: 520, bottom: 280, left: 480 }
      }
    : CARTESIAN_CANVAS;
}

function recipe(id, datasets, factors, build) {
  return Object.freeze({
    id,
    datasets: Object.freeze(datasets),
    factors: Object.freeze(factors),
    build
  });
}

function lifecycleSourceRows(dataset, kind, zooDataset) {
  return dataset?.startsWith("tt-")
    ? realisticLifecycleRows(dataset, kind).rows
    : loadZooDataset(zooDataset);
}

function lifecycleTitle(factors, purpose) {
  if (!factors.dataset?.startsWith("tt-")) {
    const titles = {
      "Derived-data analysis": "Derived-data lifecycle",
      "Multivariate relationship": "Scatter facade lifecycle",
      "Temporal trend": "Line facade lifecycle",
      "Grouped comparison": "Bar facade lifecycle",
      "Multivariate profile": "Parallel-coordinate facade lifecycle",
      "Ranged observations": "Mark create-edit-remove lifecycle",
      "Compact deviations": "Horizon revision lifecycle",
      "Modeled relationship": "Regression owner lifecycle",
      "Distribution summary": "Box-plot revision lifecycle",
      "Gradient distribution": "Gradient-plot revision lifecycle",
      "Violin distribution": "Violin facade lifecycle",
      "Guide-rich relationship": "Guide lifecycle",
      "Polar category profile": "Polar guide lifecycle",
      "Selected observations": "Selection and filtering lifecycle",
      "Derived resource analysis": "Direct data and scale resources",
      "Annotated observations": "Direct point and text appearance",
      "Ranged comparison": "Direct ranged-mark encodings",
      "Observed distribution": "Direct histogram encoding",
      "Parallel multivariate profile": "Direct parallel-coordinate encoding",
      "Regression components": "Direct regression components",
      "Guided relationship": "Direct aggregate guides",
      "Axis comparison": "Direct axis and grid facades",
      "Polar guide components": "Direct Polar guide components"
    };
    if (purpose.endsWith(" uncertainty")) {
      return `Error ${purpose.slice(0, -" uncertainty".length)} lifecycle`;
    }
    if (purpose.endsWith(" grouped comparison")) {
      return `Direct ${purpose.slice(0, -" grouped comparison".length)} grouped offsets`;
    }
    if (purpose.startsWith("Axis ")) return `Direct axis ${purpose.slice("Axis ".length)}`;
    return titles[purpose] ?? purpose;
  }
  const roles = realisticDatasetRoles(factors.dataset);
  const fields = realisticSourceFields(factors.dataset, {
    measure: roles.measures[0],
    dimension: roles.dimensions[0]
  });
  const [measure, dimension] = fields;
  const unit = measure.unit === undefined ? "" : ` (${measure.unit})`;
  return `${purpose}: ${measure.label}${unit} by ${dimension.label}`;
}

function lifecyclePurpose(recipeId, factors) {
  const purposes = {
    "action-derived-data": "Derived-data analysis",
    "action-scatter-facade": "Multivariate relationship",
    "action-line-facade": "Temporal trend",
    "action-bar-facade": "Grouped comparison",
    "action-parallel-facade": "Multivariate profile",
    "action-mark-lifecycle": "Ranged observations",
    "action-horizon-lifecycle": "Compact deviations",
    "action-regression-lifecycle": "Modeled relationship",
    "action-box-lifecycle": "Distribution summary",
    "action-gradient-lifecycle": "Gradient distribution",
    "action-violin-facade": "Violin distribution",
    "action-cartesian-guides": "Guide-rich relationship",
    "action-polar-guides": "Polar category profile",
    "action-selection-lifecycle": "Selected observations",
    "action-composition-lifecycle": "Composition comparison",
    "action-facet-scale-lifecycle": "Faceted comparison",
    "action-direct-data-resources": "Derived resource analysis",
    "action-direct-point-text": "Annotated observations",
    "action-direct-ranged-marks": "Ranged comparison",
    "action-direct-histogram": "Observed distribution",
    "action-direct-parallel": "Parallel multivariate profile",
    "action-direct-regression-components": "Regression components",
    "action-direct-guide-aggregates": "Guided relationship",
    "action-direct-axis-facades": "Axis comparison",
    "action-direct-polar-parts": "Polar guide components"
  };
  if (recipeId === "action-interval-lifecycle") return `${factors.kind} uncertainty`;
  if (recipeId === "action-direct-bar-offsets") {
    return `${factors.orientation} grouped comparison`;
  }
  if (recipeId === "action-direct-axis-parts") return `Axis ${factors.mode}`;
  return purposes[recipeId];
}

function polarCanvas(factors, direct = false) {
  if (factors.dataset?.startsWith("tt-")) {
    return direct
      ? {
          width: 1600,
          height: 1050,
          margin: { top: 280, right: 400, bottom: 250, left: 400 }
        }
      : {
          width: 1800,
          height: 1100,
          margin: { top: 280, right: 650, bottom: 250, left: 350 }
        };
  }
  return direct
    ? { width: 700, height: 700, margin: { top: 170, right: 170, bottom: 170, left: 170 } }
    : { width: 700, height: 700, margin: { top: 120, right: 170, bottom: 120, left: 170 } };
}

function temporalRows(dataset = "zoo-temporal-boundaries") {
  if (dataset.startsWith("tt-")) return realisticLifecycleRows(dataset, "temporal").rows;
  return loadZooDataset("zoo-temporal-boundaries").map((row, index) => ({
    ...row,
    order: index,
    value: row.value + (index % 3) * 0.25
  }));
}

function styleRows(dataset = "zoo-multi-encoding-styles") {
  if (dataset.startsWith("tt-")) return realisticLifecycleRows(dataset, "style").rows;
  return loadZooDataset("zoo-multi-encoding-styles").map((row, index) => ({
    ...row,
    angle: index * 30,
    category: `Category ${index % 4}`,
    group: `Group ${index % 3}`,
    positive: row.y + 1
  }));
}

function regressionRows(dataset = "zoo-label-collision-cloud") {
  if (dataset.startsWith("tt-")) return realisticLifecycleRows(dataset, "regression").rows;
  return loadZooDataset("zoo-label-collision-cloud").map((row, index) => ({
    id: row.id,
    x: index,
    y: 0.08 * index * index + (index % 2 === 0 ? 2 : -2) + Math.sin(index),
    group: index % 2 === 0 ? "even" : "odd"
  }));
}

function buildDerivedData(factors) {
  const rows = temporalRows(factors.dataset);
  const realistic = factors.dataset.startsWith("tt-");
  const values = rows.map(row => row.value).filter(Number.isFinite)
    .sort((left, right) => left - right);
  const groups = [...new Set(rows.map(row => row.group))];
  const lower = values[Math.floor((values.length - 1) * 0.1)];
  const upper = values[Math.ceil((values.length - 1) * 0.9)];
  const filter = factors.filter === "range"
    ? {
        field: "value",
        range: realistic
          ? { min: lower, max: upper, inclusive: true }
          : { min: -10, max: 10, inclusive: true }
      }
    : { field: "group", oneOf: realistic ? groups.slice(0, 2) : ["g0", "g1"] };
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "source", values: rows })
    .filterData({ id: "selected", source: "source", ...filter })
    .createWindowData({
      id: "ranked",
      source: "selected",
      partitionBy: "group",
      sortBy: [{ field: "order", order: factors.order }],
      operations: [
        { op: "rowNumber", as: "rank" },
        {
          op: "movingMean",
          field: "value",
          as: "movingValue",
          frame: { preceding: factors.frame, following: 0 }
        }
      ]
    })
    .createTimeUnitData({
      id: "bucketed",
      source: "ranked",
      field: "time",
      unit: factors.unit,
      as: "bucket"
    })
    .createIntervalData({
      id: "intervalSummary",
      source: "bucketed",
      field: "value",
      groupBy: "group",
      center: factors.interval === "median-iqr" ? "median" : "mean",
      extent: factors.interval === "median-iqr" ? "iqr" : "stderr"
    })
    .createRegressionData({
      id: "fit",
      source: "selected",
      x: "order",
      y: "value",
      groupBy: "group",
      method: factors.regression
    })
    .createPointMark({ id: "derivedPoints", data: "ranked" })
    .encodeX({ target: "derivedPoints", field: "order", scale: { zero: false } })
    .encodeY({ target: "derivedPoints", field: "movingValue", scale: { zero: false } })
    .encodeColor({ target: "derivedPoints", field: "group" })
    .createGuides({ legend: { position: "right" } })
    .createTitle({ text: lifecycleTitle(factors, "Derived-data analysis"), subtitle: factors.unit });
}

function buildScatterFacade(factors) {
  const rows = styleRows(factors.dataset);
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "styles", values: rows })
    .createScatterPlot({
      id: "scatterFacade",
      x: { field: "x", scale: { nice: factors.nice, zero: false } },
      y: { field: "positive", scale: { nice: true, zero: false } },
      color: { field: "color", scale: { palette: factors.palette } },
      shape: { field: "color" },
      point: { opacity: 0.72 },
      guides: { legend: { position: "right" } }
    })
    .encodePointRadius({ target: "scatterFacade", value: factors.radius })
    .removePointRadius({ target: "scatterFacade" })
    .encodeAngle({ target: "scatterFacade", field: "angle" })
    .removeEncoding({ target: "scatterFacade", channel: "shape" })
    .createTitle({ text: lifecycleTitle(factors, "Multivariate relationship") });
}

function buildLineFacade(factors) {
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "timeRows", values: temporalRows(factors.dataset) })
    .createLinePlot({
      id: "lineFacade",
      x: { field: "time", fieldType: "temporal", scale: { reverse: factors.reverse } },
      y: { field: "value", aggregate: "mean", scale: { nice: true, zero: false } },
      groupBy: "group",
      color: { field: "group", scale: { palette: factors.palette } },
      strokeDash: { field: "group" },
      line: { curve: factors.curve, strokeWidth: 2 },
      guides: { legend: { position: "right" } }
    })
    .createTitle({ text: lifecycleTitle(factors, "Temporal trend") });
}

function buildBarFacade(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "bar", "zoo-diverging-stacks").map(row => ({
    ...row,
    group: row.series
  }));
  const category = { field: "category", fieldType: "nominal" };
  const measure = {
    field: "value",
    aggregate: "sum",
    scale: { nice: true, zero: true }
  };
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "bars", values: rows })
    .createBarPlot({
      id: "barFacade",
      x: factors.orientation === "vertical" ? category : measure,
      y: factors.orientation === "vertical" ? measure : category,
      color: {
        field: "group",
        layout: "group",
        scale: { palette: factors.palette }
      },
      width: { band: factors.width },
      guides: { legend: { position: "right" } }
    })
    .createTitle({ text: lifecycleTitle(factors, "Grouped comparison"), subtitle: factors.orientation });
}

function buildParallelFacade(factors) {
  return chart()
    .createCanvas({
      width: 1040,
      height: 580,
      margin: { top: 120, right: 220, bottom: 80, left: 100 }
    })
    .createData({ id: "styles", values: styleRows(factors.dataset) })
    .createParallelCoordinates({
      id: "parallelFacade",
      dimensions: [
        { field: "x", title: "Index", scale: { nice: true, zero: false } },
        { field: "positive", title: "Positive", scale: { nice: true, zero: false } },
        { field: "size", title: "Size", scale: { nice: true, zero: true } },
        { field: "opacity", title: "Opacity", scale: { domain: [0, 1] } }
      ],
      key: "id",
      color: { field: "color", scale: { palette: factors.palette } },
      strokeDash: { field: "color" },
      line: { opacity: factors.opacity, strokeWidth: 1.4 },
      guides: { legend: { position: "right" } }
    })
    .createTitle({ text: lifecycleTitle(factors, "Multivariate profile") });
}

function buildMarkLifecycle(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "path", "zoo-path-order")
    .filter(row => Number.isFinite(row.value))
    .map((row, index) => ({
      ...row,
      baseline: 0,
      angle: index % 2 === 0 ? 0 : 90
    }));
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "paths", values: rows })
    .createAreaMark({ id: "areaLifecycle", opacity: 0.35 })
    .encodeX({ target: "areaLifecycle", field: "position", scale: { zero: false } })
    .encodeYRange({ target: "areaLifecycle", lower: "baseline", upper: "value" })
    .encodeGroup({ target: "areaLifecycle", field: "series" })
    .editAreaMark({
      target: "areaLifecycle",
      fill: factors.fill,
      opacity: factors.opacity,
      stroke: "#1e3a8a",
      strokeWidth: 1
    })
    .createTickMark({ id: "ticks", data: "paths", length: 16 })
    .encodeX({ target: "ticks", field: "position", scale: { id: "x" } })
    .encodeY({ target: "ticks", field: "value", scale: { id: "y" } })
    .encodeAngle({ target: "ticks", field: "angle" })
    .editTickMark({ target: "ticks", length: factors.length, stroke: "#dc2626" })
    .removeEncoding({ target: "ticks", channel: "angle" })
    .removeMark({ target: "ticks" })
    .createGuides({ legend: false })
    .createTitle({ text: lifecycleTitle(factors, "Ranged observations") });
}

function buildHorizonLifecycle(factors) {
  const realistic = factors.dataset.startsWith("tt-");
  const rows = lifecycleSourceRows(factors.dataset, "path", "zoo-path-order")
    .filter(row => Number.isFinite(row.value))
    .map((row, index) => ({
      ...row,
      position: realistic ? row.position : index % 7
    }));
  const ordered = rows.map(row => row.value).sort((left, right) => left - right);
  const baseline = realistic
    ? ordered[Math.floor((ordered.length - 1) * (factors.baseline === 2 ? 0.4 : 0.6))]
    : factors.baseline;
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "horizonSource", values: rows })
    .createAreaMark({ id: "horizon" })
    .encodeHorizon({
      target: "horizon",
      x: "position",
      y: "value",
      groupBy: "series",
      bands: factors.bands,
      baseline,
      palette: { positive: "blues", negative: "reds" }
    })
    .editHorizon({
      target: "horizon",
      bands: factors.bands === 2 ? 3 : 2,
      baseline: realistic
        ? ordered[Math.floor((ordered.length - 1) * 0.5)]
        : factors.baseline + 0.5,
      palette: { positive: "greens", negative: "oranges" }
    })
    .createGuides({ axes: { y: false }, legend: false })
    .createTitle({ text: lifecycleTitle(factors, "Compact deviations") });
}

function buildRegressionLifecycle(factors) {
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "regressionSource", values: regressionRows(factors.dataset) })
    .createPointMark({ id: "points", opacity: 0.42 })
    .encodeX({ target: "points", field: "x", scale: { nice: true, zero: false } })
    .encodeY({ target: "points", field: "y", scale: { nice: true, zero: false } })
    .encodeColor({ target: "points", field: "group" })
    .createRegression({
      target: "points",
      method: "linear",
      confidence: factors.confidence,
      interval: factors.interval,
      band: { opacity: 0.16, stroke: "#64748b", strokeWidth: 0.8 },
      line: { strokeWidth: 2.5 }
    })
    .editRegressionBand({
      target: "pointsRegressionBands",
      color: "#94a3b8",
      opacity: 0.2,
      strokeWidth: 1.2
    })
    .editRegressionLine({
      target: "pointsRegressionLines",
      strokeWidth: 3.5,
      curve: "linear"
    })
    .editRegression({
      target: "points",
      method: "polynomial",
      degree: factors.degree,
      confidence: factors.confidence,
      interval: factors.interval,
      band: { opacity: 0.13 },
      line: { strokeWidth: 3 }
    })
    .createGuides({ legend: false })
    .createTitle({ text: lifecycleTitle(factors, "Modeled relationship") });
}

function buildIntervalLifecycle(factors) {
  const rows = lifecycleSourceRows(
    factors.dataset,
    "interval",
    "zoo-asymmetric-intervals"
  ).map((row, index) => ({
    ...row,
    position: row.position ?? index + 1,
    group: factors.dataset.startsWith("tt-")
      ? row.group
      : index % 2 === 0 ? "even" : "odd"
  }));
  let program = chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "intervals", values: rows });
  if (factors.kind === "bar") {
    program = program
      .createErrorBar({
        id: "errorOwner",
        x: { field: "category", fieldType: "nominal" },
        y: { center: "center", lower: "lower", upper: "upper" },
        caps: true
      })
      .editErrorBar({
        target: "errorOwner",
        caps: true,
        capSize: factors.capSize,
        stroke: "#be123c",
        strokeWidth: 2,
        strokeDash: factors.dash,
        opacity: 0.8
      });
  } else {
    program = program
      .createErrorBand({
        id: "bandOwner",
        x: { field: "position" },
        y: { center: "center", lower: "lower", upper: "upper" },
        groupBy: "group",
        boundaries: false,
        opacity: 0.25
      })
      .editErrorBand({
        target: "bandOwner",
        fill: "#7dd3fc",
        opacity: 0.32,
        curve: "linear",
        boundaries: {}
      })
      .editErrorBandBoundary({
        target: "bandOwner",
        boundary: "both",
        stroke: "#0369a1",
        strokeWidth: 1.5,
        strokeDash: factors.dash
      });
  }
  return program
    .createGuides({
      axes: {
        x: { title: { text: "Category or position" } },
        y: { title: { text: "Interval" } }
      },
      legend: false
    })
    .createTitle({ text: lifecycleTitle(factors, `${factors.kind} uncertainty`) });
}

function buildBoxLifecycle(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "box", "zoo-boxplot-thresholds");
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "boxRows", values: rows })
    .createBoxPlot({
      id: "boxOwner",
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      outliers: true,
      guides: false
    })
    .editBoxPlot({
      target: "boxOwner",
      whisker: { type: "tukey", factor: factors.factor },
      width: { band: factors.width },
      box: { fill: "#f59e0b", opacity: 0.72, stroke: "#78350f" },
      median: { stroke: "#451a03", strokeWidth: 2.5 },
      outlier: { shape: "diamond", radius: 4, opacity: 0.85 }
    })
    .createTitle({ text: lifecycleTitle(factors, "Distribution summary") });
}

function buildGradientLifecycle(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "box", "zoo-boxplot-thresholds");
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "gradientRows", values: rows })
    .createGradientPlot({
      id: "gradientOwner",
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      density: { bandwidth: factors.bandwidth, steps: factors.steps },
      width: { band: 0.7 },
      gradient: { opacity: [0.05, 0.95] },
      center: { type: "median" },
      guides: { legend: { position: "right" } }
    })
    .editGradientPlot({
      target: "gradientOwner",
      density: { bandwidth: factors.bandwidth * 1.2, steps: factors.steps + 4 },
      width: { band: 0.58 },
      gradient: { opacity: [0.15, 0.85] },
      center: { type: "mean", stroke: "#7c2d12", strokeWidth: 2 }
    })
    .createTitle({ text: lifecycleTitle(factors, "Gradient distribution") });
}

function buildViolinLifecycle(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "box", "zoo-boxplot-thresholds");
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "violinRows", values: rows })
    .createViolinPlot({
      id: "violins",
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value", fieldType: "quantitative" },
      color: { field: "group", scale: { palette: factors.palette } },
      density: {
        bandwidth: factors.bandwidth,
        steps: factors.steps,
        width: { band: 0.76, resolve: factors.resolve }
      },
      area: { opacity: 0.74, strokeWidth: 1 },
      guides: { legend: { position: "right" } }
    })
    .createTitle({ text: lifecycleTitle(factors, "Violin distribution") });
}

function buildCartesianGuideLifecycle(factors) {
  let program = chart()
    .createCanvas({
      width: 1220,
      height: 680,
      margin: { top: 150, right: 310, bottom: 170, left: 230 }
    })
    .createData({ id: "styles", values: styleRows(factors.dataset) })
    .createPointMark({ id: "guidePoints", opacity: 0.68 })
    .encodeX({ target: "guidePoints", field: "x", scale: { nice: true, zero: false } })
    .encodeY({ target: "guidePoints", field: "positive", scale: { nice: true, zero: false } })
    .encodeColor({ target: "guidePoints", field: "color" })
    .encodeShape({ target: "guidePoints", field: "color" })
    .encodeSize({ target: "guidePoints", field: "size", scale: { range: [12, 80] } })
    .createGuides({
      axes: {
        x: { ticksAndLabels: { count: 5 }, title: { text: "Index" } },
        y: { ticksAndLabels: { count: 5 }, title: { text: "Positive value" } }
      },
      grid: { horizontal: true, vertical: true },
      legend: { position: "right", offset: 36 }
    })
    .createTitle({
      text: lifecycleTitle(factors, "Guide-rich relationship"),
      subtitle: "Every public edit and removal path"
    })
    .editXAxisTicksAndLabels({
      count: factors.tickCount,
      ticks: { length: 8, lineWidth: 1.5 },
      labels: { fontSize: 11, color: "#334155" }
    })
    .editYAxisTicksAndLabels({
      count: factors.tickCount,
      ticks: { length: 7 },
      labels: { fontSize: 11 }
    })
    .editXAxis({
      position: "top",
      line: { color: "#475569", lineWidth: 1.5 },
      title: { text: "Edited index", offset: 56 }
    })
    .editYAxis({
      line: { color: "#475569" },
      title: { text: "Edited value", offset: 72 }
    })
    .editHorizontalGrid({ count: factors.tickCount, color: "#cbd5e1" })
    .editVerticalGrid({ count: factors.tickCount, strokeDash: [3, 3] })
    .editGrid({
      horizontal: { lineWidth: 1.25 },
      vertical: { color: "#94a3b8" }
    })
    .editLegend({
      target: "guidePoints",
      offset: 40,
      itemGap: 26,
      count: 4,
      border: { color: "#cbd5e1", lineWidth: 1, padding: 10 }
    })
    .editLegendLayout({
      target: "guidePoints",
      position: "bottom",
      align: factors.align,
      direction: "horizontal",
      offset: 42,
      itemGap: 28
    })
    .editLegendLabels({
      target: "guidePoints",
      color: "#334155",
      fontSize: 11,
      fontFamily: "sans-serif"
    })
    .editLegendTitle({
      target: "guidePoints",
      title: "Encoded style",
      color: "#0f172a",
      fontSize: 14,
      fontWeight: 700
    })
    .editLegendSymbols({ target: "guidePoints", count: 5 })
    .editLegendBorder({
      target: "guidePoints",
      border: {
        color: "#64748b",
        lineWidth: 1.5,
        padding: 12,
        background: "#f8fafc"
      }
    })
    .editTitle({
      text: "Edited guide lifecycle",
      subtitle: factors.subtitle ? "Focused and aggregate guide edits" : false,
      align: "center"
    });
  program = program
    .removeXAxis()
    .removeYAxis()
    .removeLegend({ target: "guidePoints" })
    .removeTitle()
    .createTitle({ text: lifecycleTitle(factors, "Guide-rich relationship") });
  return program;
}

function buildPolarGuideLifecycle(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "polar", "zoo-polar-wrap");
  return chart()
    .createCanvas(polarCanvas(factors))
    .createData({ id: "polarRows", values: rows })
    .createPointMark({ id: "polarPoints", opacity: 0.65 })
    .encodeTheta({ target: "polarPoints", field: "angle" })
    .encodeR({ target: "polarPoints", field: "radius", scale: { zero: true } })
    .encodeColor({ target: "polarPoints", field: "group" })
    .createGuides({ legend: { position: "right" } })
    .editThetaAxis({
      line: { color: "#334155", lineWidth: 1.5 },
      ticksAndLabels: {
        count: factors.count,
        ticks: { length: 7 },
        labels: { fontSize: 11 }
      },
      title: { text: "Angle" }
    })
    .editRadialAxis({
      angle: factors.angle,
      line: { color: "#334155" },
      ticksAndLabels: { count: factors.count },
      title: { text: "Radius", position: "outside" }
    })
    .editThetaGrid({ count: factors.count, color: "#cbd5e1", strokeDash: [3, 3] })
    .editRadialGrid({ count: factors.count, color: "#94a3b8", lineWidth: 1.25 })
    .createTitle({ text: lifecycleTitle(factors, "Polar category profile") });
}

function buildSelectionLifecycle(factors) {
  const rows = styleRows(factors.dataset);
  const ordered = rows.map(row => row.x).sort((left, right) => left - right);
  const realistic = factors.dataset.startsWith("tt-");
  const minimum = realistic
    ? ordered[Math.floor((ordered.length - 1) * (factors.min === 0 ? 0 : 0.2))]
    : factors.min;
  const maximum = realistic
    ? ordered[Math.ceil((ordered.length - 1) * 0.9)]
    : 11;
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "selectionRows", values: rows })
    .createPointMark({ id: "selectedPoints" })
    .encodeX({ target: "selectedPoints", field: "x", scale: { zero: false } })
    .encodeY({ target: "selectedPoints", field: "positive", scale: { zero: false } })
    .encodeColor({ target: "selectedPoints", field: "color" })
    .filterMarks({
      target: "selectedPoints",
      field: "x",
      op: "range",
      min: minimum,
      max: maximum,
      inclusive: true
    })
    .highlightMarks({
      id: "highestPoint",
      target: "selectedPoints",
      select: { field: "positive", op: "max", count: factors.count },
      color: "#dc2626",
      shape: "diamond",
      size: 2.2,
      stroke: "#ffffff",
      strokeWidth: 1,
      dimOthers: { opacity: 0.18 },
      bringToFront: true
    })
    .removeMarkHighlight({ selection: "highestPoint" })
    .createGuides({ legend: { position: "right" } })
    .createTitle({ text: lifecycleTitle(factors, "Selected observations") });
}

function miniaturePanel(rows, fill, title, realistic = false) {
  return chart()
    .createCanvas(realistic
      ? {
          width: 900,
          height: 560,
          margin: { top: 180, right: 110, bottom: 140, left: 180 }
        }
      : {
          width: 340,
          height: 260,
          margin: { top: 60, right: 35, bottom: 60, left: 65 }
        })
    .createData({ values: rows })
    .createPointMark({ fill })
    .encodeX({ field: "x", scale: { zero: false } })
    .encodeY({ field: "positive", scale: { zero: false } })
    .createGuides({ legend: false })
    .createTitle({ text: title });
}

function buildCompositionLifecycle(factors) {
  const rows = styleRows(factors.dataset);
  const realistic = factors.dataset.startsWith("tt-");
  const left = miniaturePanel(rows, "#2563eb", "Original left", realistic);
  const right = miniaturePanel(
    [...rows].reverse(),
    "#f97316",
    "Original right",
    realistic
  );
  const replacement = miniaturePanel(
    rows.slice(2),
    "#16a34a",
    lifecycleTitle(factors, "Composition comparison"),
    realistic
  );
  return hconcat({
    id: "lifecyclePair",
    programs: [
      { id: "left", program: left },
      { id: "right", program: right }
    ],
    gap: 8,
    padding: 4
  })
    .editCompositionLayout({
      gap: factors.gap,
      padding: factors.padding,
      align: factors.align
    })
    .replaceCompositionChild({ target: "right", program: replacement });
}

function buildFacetScaleLifecycle(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "facet", "zoo-facet-imbalance");
  return chart()
    .createCanvas(factors.dataset.startsWith("tt-")
      ? {
          width: 800,
          height: 520,
          margin: { top: 180, right: 160, bottom: 130, left: 170 }
        }
      : {
          width: 360,
          height: 280,
          margin: { top: 55, right: 90, bottom: 70, left: 75 }
        })
    .createData({ id: "facetRows", values: rows })
    .createPointMark({ id: "facetPoints" })
    .encodeX({ target: "facetPoints", field: "x", scale: { zero: false } })
    .encodeY({ target: "facetPoints", field: "y", scale: { zero: false } })
    .encodeColor({ target: "facetPoints", field: "category" })
    .createGuides({ legend: false })
    .createTitle({ text: lifecycleTitle(factors, "Faceted comparison") })
    .facet({
      field: "facet",
      columns: factors.columns,
      scales: { x: "shared", y: "shared" },
      guides: { axes: "each", legend: false }
    })
    .editFacetScales({ x: "independent", y: factors.yScale })
    .editFacetGuides({ axes: factors.axes });
}

function buildDirectDataResources(factors) {
  const rows = styleRows(factors.dataset);
  const xValues = rows.map(row => row.x);
  const width = factors.dataset.startsWith("tt-") ? factors.width * 2 : factors.width;
  const ordered = [...xValues].sort((left, right) => left - right);
  const spread = ordered[Math.floor((ordered.length - 1) * 0.75)] -
    ordered[Math.floor((ordered.length - 1) * 0.25)] ||
    ordered.at(-1) - ordered[0] || 1;
  const bandwidth = factors.dataset.startsWith("tt-")
    ? spread * factors.bandwidth
    : factors.bandwidth;
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .editCanvas({
      width,
      background: factors.background
    })
    .createData({ id: "directSource", values: rows })
    .createDensityData({
      id: "directDensity",
      source: "directSource",
      field: "x",
      groupBy: "color",
      bandwidth,
      steps: factors.steps
    })
    .createBin2DData({
      id: "directBins",
      source: "directSource",
      x: "x",
      y: "positive",
      bins: factors.bins,
      includeEmpty: factors.includeEmpty
    })
    .createDerivedData({
      id: "declaredFilter",
      source: "directSource",
      transform: [{ type: "filter", field: "color", oneOf: [rows[0].color] }]
    })
    .createScale({
      id: "manualScale",
      type: "linear",
      domain: [Math.min(...xValues), Math.max(...xValues)],
      range: [150, width - 120],
      nice: false,
      zero: false
    })
    .createPointMark({ id: "resourcePoints", data: "directSource" })
    .encodeX({ target: "resourcePoints", field: "x" })
    .encodeY({ target: "resourcePoints", field: "positive" })
    .createTitle({ text: lifecycleTitle(factors, "Derived resource analysis") });
}

function buildDirectPointText(factors) {
  const rows = styleRows(factors.dataset).map(row => ({ ...row, label: row.shape }));
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "appearanceRows", values: rows })
    .createPointMark({ id: "appearancePoints" })
    .encodeX({ target: "appearancePoints", field: "x" })
    .encodeY({ target: "appearancePoints", field: "positive" })
    .encodeRadius({ target: "appearancePoints", value: factors.radius })
    .encodeOpacity({
      target: "appearancePoints",
      field: "opacity",
      scale: { range: factors.opacityRange }
    })
    .createTextMark({ id: "appearanceLabels", data: "appearanceRows" })
    .encodeX({ target: "appearanceLabels", field: "x", scale: { id: "x" } })
    .encodeY({
      target: "appearanceLabels",
      field: "positive",
      scale: { id: "y" }
    })
    .encodeText({ target: "appearanceLabels", field: "label" })
    .editTextMark({
      target: "appearanceLabels",
      fill: factors.fill,
      fontSize: factors.fontSize,
      fontWeight: 700,
      align: "left"
    })
    .createTitle({ text: lifecycleTitle(factors, "Annotated observations") });
}

function directRangeRows(dataset) {
  return lifecycleSourceRows(dataset, "interval", "zoo-asymmetric-intervals")
    .map((row, index) => ({
      ...row,
      position: row.position ?? index + 1,
      positionEnd: (row.position ?? index + 1) + 0.25,
      group: dataset?.startsWith("tt-")
        ? row.group
        : index % 2 === 0 ? "even" : "odd"
    }));
}

function buildDirectRangedMarks(factors) {
  const rows = directRangeRows(factors.dataset);
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "directRanges", values: rows })
    .createRuleMark({ id: "directRules", data: "directRanges" })
    .encodeX({
      target: "directRules",
      field: "lower",
      fieldType: "quantitative"
    })
    .encodeX2({
      target: "directRules",
      field: "upper",
      fieldType: "quantitative"
    })
    .encodeY({
      target: "directRules",
      field: "position",
      fieldType: "quantitative"
    })
    .encodeY2({
      target: "directRules",
      field: "positionEnd",
      fieldType: "quantitative"
    })
    .encodeStroke({ target: "directRules", value: factors.stroke })
    .encodeStrokeWidth({ target: "directRules", field: "position" })
    .encodeOpacity({ target: "directRules", value: factors.opacity })
    .createRectMark({ id: "directRects", data: "directRanges", opacity: 0.12 })
    .encodeX({ target: "directRects", field: "lower", scale: { id: "x" } })
    .encodeX2({ target: "directRects", field: "upper" })
    .encodeY({ target: "directRects", field: "position", scale: { id: "y" } })
    .encodeY2({ target: "directRects", field: "positionEnd" })
    .editRectMark({
      target: "directRects",
      fill: factors.fill,
      opacity: 0.18,
      stroke: "#1e3a8a",
      strokeWidth: 1
    })
    .createAreaMark({ id: "directBands", data: "directRanges", opacity: 0.2 })
    .encodeXRange({
      target: "directBands",
      lower: "lower",
      upper: "upper",
      scale: { id: "x" }
    })
    .encodeY({ target: "directBands", field: "position", scale: { id: "y" } })
    .encodeGroup({ target: "directBands", field: "group" })
    .createTitle({ text: lifecycleTitle(factors, "Ranged comparison") });
}

function buildDirectBarOffsets(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "bar", "zoo-diverging-stacks").map(row => ({
    ...row,
    group: row.series
  }));
  let program = chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "offsetRows", values: rows })
    .createBarMark({ id: "offsetBars" });
  if (factors.orientation === "horizontal") {
    program = program
      .encodeX({ target: "offsetBars", field: "value", aggregate: "sum" })
      .encodeY({
        target: "offsetBars",
        field: "category",
        fieldType: "nominal"
      })
      .encodeYOffset({
        target: "offsetBars",
        field: "group",
        paddingInner: factors.padding
      });
  } else {
    program = program
      .encodeX({
        target: "offsetBars",
        field: "category",
        fieldType: "nominal"
      })
      .encodeY({ target: "offsetBars", field: "value", aggregate: "sum" })
      .encodeXOffset({
        target: "offsetBars",
        field: "group",
        paddingInner: factors.padding
      });
  }
  return program
    .encodeColor({ target: "offsetBars", field: "group", layout: "group" })
    .editBarMark({
      target: "offsetBars",
      opacity: 0.8,
      stroke: "#334155",
      strokeWidth: 1
    })
    .createTitle({ text: lifecycleTitle(factors, `${factors.orientation} grouped comparison`) });
}

function buildDirectHistogram(factors) {
  const rows = lifecycleSourceRows(
    factors.dataset,
    "histogram",
    "zoo-histogram-boundaries"
  );
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "histogramRows", values: rows })
    .createBarMark({ id: "directHistogram" })
    .encodeHistogram({
      target: "directHistogram",
      field: "value",
      maxBins: factors.maxBins,
      xScale: { nice: factors.nice, zero: false }
    })
    .editBarMark({
      target: "directHistogram",
      fill: factors.fill,
      opacity: 0.82
    })
    .createTitle({ text: lifecycleTitle(factors, "Observed distribution") });
}

function buildDirectParallel(factors) {
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "parallelRows", values: styleRows(factors.dataset) })
    .createCoordinate({ id: "parallelDirect", type: "parallel" })
    .createLineMark({ id: "parallelLines", data: "parallelRows", opacity: 0.5 })
    .encodeParallelCoordinates({
      target: "parallelLines",
      coordinate: "parallelDirect",
      dimensions: [
        { field: "x", scale: { nice: factors.nice, zero: false } },
        { field: "positive", scale: { nice: true, zero: false } },
        { field: "size", scale: { nice: true, zero: true } },
        { field: "opacity", scale: { domain: [0, 1] } }
      ],
      key: "id",
      missing: factors.missing
    })
    .createTitle({ text: lifecycleTitle(factors, "Parallel multivariate profile") });
}

function buildDirectRegressionComponents(factors) {
  const rows = regressionRows(factors.dataset);
  return chart()
    .createCanvas(cartesianCanvas(factors))
    .createData({ id: "componentSource", values: rows })
    .createPointMark({ id: "componentPoints" })
    .encodeX({ target: "componentPoints", field: "x" })
    .encodeY({ target: "componentPoints", field: "y" })
    .createRegressionData({
      id: "componentFit",
      source: "componentSource",
      x: "x",
      y: "y",
      confidence: factors.confidence,
      interval: factors.interval
    })
    .createRegressionBand({
      id: "directRegressionBand",
      data: "componentFit",
      x: "x",
      lower: "__regression_ci_lower",
      upper: "__regression_ci_upper",
      coordinate: "main",
      xScale: "x",
      yScale: "y",
      color: "#94a3b8",
      opacity: 0.16
    })
    .createRegressionLine({
      id: "directRegressionLine",
      data: "componentFit",
      x: "x",
      y: "y",
      coordinate: "main",
      xScale: "x",
      yScale: "y",
      strokeWidth: factors.strokeWidth
    })
    .createTitle({ text: lifecycleTitle(factors, "Regression components") });
}

function directGuideBase(dataset) {
  return chart()
    .createCanvas({
      width: 920,
      height: 560,
      margin: { top: 130, right: 210, bottom: 130, left: 150 }
    })
    .createData({ id: "guideRows", values: styleRows(dataset) })
    .createPointMark({ id: "directGuidePoints" })
    .encodeX({ target: "directGuidePoints", field: "x" })
    .encodeY({ target: "directGuidePoints", field: "positive" })
    .encodeColor({ target: "directGuidePoints", field: "color" });
}

function buildDirectGuideAggregates(factors) {
  return directGuideBase(factors.dataset)
    .createAxes()
    .createGrid()
    .createLegend({ target: "directGuidePoints", position: "right" })
    .editXAxisLine({ color: "#334155", lineWidth: 1.5 })
    .editYAxisLine({ color: "#334155", lineWidth: 1.5 })
    .editXAxisTicks({ count: factors.count, length: 7 })
    .editYAxisTicks({ count: factors.count, length: 7 })
    .editXAxisLabels({ count: factors.count, fontSize: 11 })
    .editYAxisLabels({ count: factors.count, fontSize: 11 })
    .editXAxisTitle({ text: "Direct X", offset: 52 })
    .editYAxisTitle({ text: "Direct Y", offset: 68 })
    .createTitle({ text: lifecycleTitle(factors, "Guided relationship") });
}

function buildDirectAxisFacades(factors) {
  return directGuideBase(factors.dataset)
    .createXAxis({ position: factors.xPosition })
    .createYAxis({ position: factors.yPosition })
    .createHorizontalGrid({ count: factors.count, color: "#cbd5e1" })
    .createVerticalGrid({ count: factors.count, strokeDash: [3, 3] })
    .createTitle({ text: lifecycleTitle(factors, "Axis comparison") });
}

function buildDirectAxisParts(factors) {
  let program = directGuideBase(factors.dataset);
  if (factors.mode === "leaves") {
    program = program
      .createXAxisLine({ lineWidth: 1.5 })
      .createYAxisLine({ lineWidth: 1.5 })
      .createXAxisTicks({ count: factors.count })
      .createYAxisTicks({ count: factors.count })
      .createXAxisLabels({ count: factors.count })
      .createYAxisLabels({ count: factors.count })
      .createXAxisTitle({ text: "Leaf X" })
      .createYAxisTitle({ text: "Leaf Y" });
  } else {
    program = program
      .createXAxisTicksAndLabels({
        count: factors.count,
        ticks: { length: 7 },
        labels: { fontSize: 11 }
      })
      .createYAxisTicksAndLabels({
        count: factors.count,
        ticks: { length: 7 },
        labels: { fontSize: 11 }
      });
  }
  return program.createTitle({ text: lifecycleTitle(factors, `Axis ${factors.mode}`) });
}

function buildDirectPolarParts(factors) {
  const rows = lifecycleSourceRows(factors.dataset, "polar", "zoo-polar-wrap");
  return chart()
    .createCanvas(polarCanvas(factors, true))
    .createData({ id: "directPolarRows", values: rows })
    .createPointMark({ id: "directPolarPoints" })
    .encodeTheta({ target: "directPolarPoints", field: "angle" })
    .encodeR({
      target: "directPolarPoints",
      field: "radius",
      scale: { zero: true }
    })
    .createThetaAxis()
    .createRadialAxis({ angle: factors.angle })
    .editThetaAxisLine({ lineWidth: 2 })
    .editRadialAxisLine({ color: "#334155" })
    .editThetaAxisTicks({ count: factors.count, length: 7 })
    .editRadialAxisTicks({ count: factors.count, length: 7 })
    .editThetaAxisLabels({ count: factors.count, fontSize: 11 })
    .editRadialAxisLabels({ count: factors.count, fontSize: 11 })
    .editThetaAxisTitle({ text: "Direct angle" })
    .editRadialAxisTitle({ text: "Direct radius", position: "outside" })
    .createThetaGrid({ count: factors.count, strokeDash: [3, 3] })
    .createRadialGrid({ count: factors.count, lineWidth: 1.25 })
    .createTitle({ text: lifecycleTitle(factors, "Polar guide components") });
}

export const LIFECYCLE_SCENARIO_RECIPES = Object.freeze([
  recipe("action-derived-data", ["zoo-temporal-boundaries"], {
    filter: ["oneOf", "range"],
    order: ["ascending", "descending"],
    frame: [1, 2],
    unit: ["month", "year"],
    interval: ["mean-stderr", "median-iqr"],
    regression: ["linear", "polynomial"]
  }, buildDerivedData),
  recipe("action-scatter-facade", ["zoo-multi-encoding-styles"], {
    nice: [false, true], palette: ["tableau10", "set2"], radius: [3, 6]
  }, buildScatterFacade),
  recipe("action-line-facade", ["zoo-temporal-boundaries"], {
    reverse: [false, true], palette: ["tableau10", "dark2"],
    curve: ["linear", "step"]
  }, buildLineFacade),
  recipe("action-bar-facade", ["zoo-diverging-stacks"], {
    orientation: ["horizontal", "vertical"],
    palette: ["tableau10", "set2"], width: [0.6, 0.85]
  }, buildBarFacade),
  recipe("action-parallel-facade", ["zoo-multi-encoding-styles"], {
    palette: ["tableau10", "dark2"], opacity: [0.35, 0.7]
  }, buildParallelFacade),
  recipe("action-mark-lifecycle", ["zoo-path-order"], {
    fill: ["#93c5fd", "#c4b5fd"], opacity: [0.4, 0.7], length: [18, 26]
  }, buildMarkLifecycle),
  recipe("action-horizon-lifecycle", ["zoo-path-order"], {
    bands: [2, 3], baseline: [2, 3]
  }, buildHorizonLifecycle),
  recipe("action-regression-lifecycle", ["zoo-label-collision-cloud"], {
    confidence: [0.9, 0.95], interval: ["mean", "prediction"], degree: [2, 3]
  }, buildRegressionLifecycle),
  recipe("action-interval-lifecycle", ["zoo-asymmetric-intervals"], {
    kind: ["bar", "band"], capSize: [6, 14], dash: ["dashed", [5, 3]]
  }, buildIntervalLifecycle),
  recipe("action-box-lifecycle", ["zoo-boxplot-thresholds"], {
    factor: [1, 1.5], width: [0.48, 0.76]
  }, buildBoxLifecycle),
  recipe("action-gradient-lifecycle", ["zoo-boxplot-thresholds"], {
    bandwidth: [0.25, 0.65], steps: [32, 64]
  }, buildGradientLifecycle),
  recipe("action-violin-facade", ["zoo-boxplot-thresholds"], {
    bandwidth: [0.25, 0.65], steps: [32, 64],
    resolve: ["shared", "independent"], palette: ["tableau10", "set2"]
  }, buildViolinLifecycle),
  recipe("action-cartesian-guides", ["zoo-multi-encoding-styles"], {
    tickCount: [4, 6], align: ["left", "right"], subtitle: [true, false]
  }, buildCartesianGuideLifecycle),
  recipe("action-polar-guides", ["zoo-polar-wrap"], {
    count: [4, 6], angle: [45, 135]
  }, buildPolarGuideLifecycle),
  recipe("action-selection-lifecycle", ["zoo-multi-encoding-styles"], {
    min: [0, 2], count: [1, 2]
  }, buildSelectionLifecycle),
  recipe("action-composition-lifecycle", ["zoo-multi-encoding-styles"], {
    gap: [12, 28], padding: [6, 14], align: ["start", "center"]
  }, buildCompositionLifecycle),
  recipe("action-facet-scale-lifecycle", ["zoo-facet-imbalance"], {
    columns: [2, 3], yScale: ["shared", "independent"], axes: ["each", "outer"]
  }, buildFacetScaleLifecycle),
  recipe("action-direct-data-resources", ["zoo-multi-encoding-styles"], {
    width: [920, 1040], background: ["#ffffff", "#f8fafc"],
    bandwidth: [0.35, 0.7], steps: [24, 48], bins: [3, 5],
    includeEmpty: [false, true]
  }, buildDirectDataResources),
  recipe("action-direct-point-text", ["zoo-multi-encoding-styles"], {
    radius: [3, 6], opacityRange: [[0.2, 0.9], [0.35, 1]],
    fill: ["#111827", "#7c2d12"], fontSize: [10, 13]
  }, buildDirectPointText),
  recipe("action-direct-ranged-marks", ["zoo-asymmetric-intervals"], {
    stroke: ["#be123c", "#0369a1"], opacity: [0.55, 0.8],
    fill: ["#93c5fd", "#c4b5fd"]
  }, buildDirectRangedMarks),
  recipe("action-direct-bar-offsets", ["zoo-diverging-stacks"], {
    orientation: ["horizontal", "vertical"], padding: [0.08, 0.24]
  }, buildDirectBarOffsets),
  recipe("action-direct-histogram", ["zoo-histogram-boundaries"], {
    maxBins: [5, 9], nice: [false, true], fill: ["#0ea5e9", "#8b5cf6"]
  }, buildDirectHistogram),
  recipe("action-direct-parallel", ["zoo-multi-encoding-styles"], {
    nice: [false, true], missing: ["break", "drop-row"]
  }, buildDirectParallel),
  recipe("action-direct-regression-components", ["zoo-label-collision-cloud"], {
    confidence: [0.9, 0.95], interval: ["mean", "prediction"],
    strokeWidth: [2, 4]
  }, buildDirectRegressionComponents),
  recipe("action-direct-guide-aggregates", ["zoo-multi-encoding-styles"], {
    count: [4, 6]
  }, buildDirectGuideAggregates),
  recipe("action-direct-axis-facades", ["zoo-multi-encoding-styles"], {
    xPosition: ["bottom", "top"], yPosition: ["left", "right"], count: [4, 6]
  }, buildDirectAxisFacades),
  recipe("action-direct-axis-parts", ["zoo-multi-encoding-styles"], {
    mode: ["leaves", "groups"], count: [4, 6]
  }, buildDirectAxisParts),
  recipe("action-direct-polar-parts", ["zoo-polar-wrap"], {
    count: [4, 6], angle: [45, 135]
  }, buildDirectPolarParts)
]);

const REALISTIC_LIFECYCLE_KINDS = Object.freeze({
  "action-derived-data": "temporal",
  "action-scatter-facade": "style",
  "action-line-facade": "temporal",
  "action-bar-facade": "bar",
  "action-parallel-facade": "parallel",
  "action-mark-lifecycle": "path",
  "action-horizon-lifecycle": "path",
  "action-regression-lifecycle": "regression",
  "action-interval-lifecycle": "interval",
  "action-box-lifecycle": "box",
  "action-gradient-lifecycle": "box",
  "action-violin-facade": "box",
  "action-cartesian-guides": "style",
  "action-polar-guides": "polar",
  "action-selection-lifecycle": "style",
  "action-composition-lifecycle": "style",
  "action-facet-scale-lifecycle": "facet",
  "action-direct-data-resources": "style",
  "action-direct-point-text": "style",
  "action-direct-ranged-marks": "interval",
  "action-direct-bar-offsets": "bar",
  "action-direct-histogram": "histogram",
  "action-direct-parallel": "parallel",
  "action-direct-regression-components": "regression",
  "action-direct-guide-aggregates": "style",
  "action-direct-axis-facades": "style",
  "action-direct-axis-parts": "style",
  "action-direct-polar-parts": "polar"
});

const COMPOSITE_LIFECYCLES = new Set([
  "action-derived-data",
  "action-regression-lifecycle",
  "action-cartesian-guides",
  "action-selection-lifecycle",
  "action-composition-lifecycle",
  "action-facet-scale-lifecycle",
  "action-direct-data-resources"
]);

function realisticLifecycleMetadata(base, factors) {
  const kind = REALISTIC_LIFECYCLE_KINDS[base.id];
  const view = realisticLifecycleRows(factors.dataset, kind);
  const fields = realisticSourceFields(
    factors.dataset,
    view.provenance.fieldBindings
  );
  const measure = fields.find(field =>
    field.field === view.provenance.fieldBindings.measure
  );
  const dimension = fields.find(field =>
    field.field === view.provenance.fieldBindings.dimension
  );
  const complexity = COMPOSITE_LIFECYCLES.has(base.id) ? "composite" : "advanced";
  const purpose = lifecyclePurpose(base.id, factors);
  if (purpose === undefined) {
    throw new Error(`Missing lifecycle analysis purpose for ${base.id}.`);
  }
  const feature = `feature:${base.id.replace(/^action-/u, "")}`;
  const lifecycleClaims = {
    "action-derived-data": ["create", "filter"],
    "action-scatter-facade": ["create", "remove"],
    "action-line-facade": ["create"],
    "action-bar-facade": ["create"],
    "action-parallel-facade": ["create"],
    "action-mark-lifecycle": ["create", "edit", "remove"],
    "action-horizon-lifecycle": ["create", "edit"],
    "action-regression-lifecycle": ["create", "edit"],
    "action-interval-lifecycle": ["create", "edit"],
    "action-box-lifecycle": ["create", "edit"],
    "action-gradient-lifecycle": ["create", "edit"],
    "action-violin-facade": ["create"],
    "action-cartesian-guides": ["create", "edit", "remove"],
    "action-polar-guides": ["create", "edit"],
    "action-selection-lifecycle": ["create", "remove", "filter", "select", "highlight"],
    "action-composition-lifecycle": ["edit", "compose", "reassign"],
    "action-facet-scale-lifecycle": ["create", "edit", "compose"],
    "action-direct-data-resources": ["create", "edit"],
    "action-direct-point-text": ["create", "edit"],
    "action-direct-ranged-marks": ["create", "edit"],
    "action-direct-bar-offsets": ["create", "edit"],
    "action-direct-histogram": ["create", "edit"],
    "action-direct-parallel": ["create"],
    "action-direct-regression-components": ["create"],
    "action-direct-guide-aggregates": ["create", "edit"],
    "action-direct-axis-facades": ["create"],
    "action-direct-axis-parts": ["create"],
    "action-direct-polar-parts": ["create", "edit"]
  }[base.id];
  const unit = measure?.unit === undefined ? "" : ` (${measure.unit})`;
  return Object.freeze({
    corpus: "tidytuesday",
    chartFamily: purpose,
    complexity,
    sourceDatasetIds: Object.freeze([factors.dataset]),
    title: `${purpose}: ${measure?.label ?? "measure"}${unit} by ${dimension?.label ?? "group"}`,
    analysisQuestion:
      `How does ${measure?.label ?? "the measure"} vary by ${dimension?.label ?? "group"} ` +
      `under the ${purpose} authoring workflow?`,
    sourceFields: fields,
    provenance: view.provenance,
    dataOperations: Object.freeze(view.provenance.transformations.map(item => item.op)),
    activeFeatures: Object.freeze([
      feature,
      ...lifecycleClaims.map(value => `lifecycle:${value}`)
    ])
  });
}

function lifecycleSignature(base, factors) {
  const signatures = {
    "action-derived-data": [
      "filterData", "createWindowData", "createTimeUnitData",
      "createIntervalData", "createRegressionData"
    ],
    "action-scatter-facade": [
      "createScatterPlot", "encodePointRadius", "removePointRadius", "removeEncoding"
    ],
    "action-line-facade": ["createLinePlot"],
    "action-bar-facade": ["createBarPlot"],
    "action-parallel-facade": ["createParallelCoordinates"],
    "action-mark-lifecycle": [
      "createAreaMark", "editAreaMark", "createTickMark", "editTickMark", "removeMark"
    ],
    "action-horizon-lifecycle": ["encodeHorizon", "editHorizon"],
    "action-regression-lifecycle": [
      "createRegression", "editRegressionBand", "editRegressionLine", "editRegression"
    ],
    "action-box-lifecycle": ["createBoxPlot", "editBoxPlot"],
    "action-gradient-lifecycle": ["createGradientPlot", "editGradientPlot"],
    "action-violin-facade": ["createViolinPlot"],
    "action-cartesian-guides": [
      "createGuides", "editXAxis", "editYAxis", "editGrid", "editLegend",
      "editTitle", "removeXAxis", "removeYAxis", "removeLegend", "removeTitle"
    ],
    "action-polar-guides": [
      "editThetaAxis", "editRadialAxis", "editThetaGrid", "editRadialGrid"
    ],
    "action-selection-lifecycle": [
      "filterMarks", "highlightMarks", "removeMarkHighlight"
    ],
    "action-composition-lifecycle": [
      "hconcat", "editCompositionLayout", "replaceCompositionChild"
    ],
    "action-facet-scale-lifecycle": ["facet", "editFacetScales", "editFacetGuides"],
    "action-direct-data-resources": [
      "editCanvas", "createDensityData", "createBin2DData", "createDerivedData", "createScale"
    ],
    "action-direct-point-text": [
      "encodeRadius", "encodeOpacity", "createTextMark", "encodeText", "editTextMark"
    ],
    "action-direct-ranged-marks": [
      "createRuleMark", "encodeX2", "encodeY2", "createRectMark", "editRectMark",
      "createAreaMark", "encodeXRange"
    ],
    "action-direct-histogram": ["createBarMark", "encodeHistogram", "editBarMark"],
    "action-direct-parallel": [
      "createCoordinate", "createLineMark", "encodeParallelCoordinates"
    ],
    "action-direct-regression-components": [
      "createRegressionData", "createRegressionBand", "createRegressionLine"
    ],
    "action-direct-guide-aggregates": [
      "createAxes", "createGrid", "createLegend", "editXAxisLine", "editYAxisLine",
      "editXAxisTicks", "editYAxisTicks", "editXAxisLabels", "editYAxisLabels",
      "editXAxisTitle", "editYAxisTitle"
    ],
    "action-direct-axis-facades": [
      "createXAxis", "createYAxis", "createHorizontalGrid", "createVerticalGrid"
    ],
    "action-direct-polar-parts": [
      "createThetaAxis", "createRadialAxis", "editThetaAxisLine", "editRadialAxisLine",
      "editThetaAxisTicks", "editRadialAxisTicks", "editThetaAxisLabels",
      "editRadialAxisLabels", "editThetaAxisTitle", "editRadialAxisTitle",
      "createThetaGrid", "createRadialGrid"
    ]
  };
  if (base.id === "action-interval-lifecycle") {
    return factors.kind === "bar"
      ? ["createErrorBar", "editErrorBar"]
      : ["createErrorBand", "editErrorBand", "editErrorBandBoundary"];
  }
  if (base.id === "action-direct-bar-offsets") {
    return [
      "createBarMark",
      factors.orientation === "horizontal" ? "encodeYOffset" : "encodeXOffset",
      "editBarMark"
    ];
  }
  if (base.id === "action-direct-axis-parts") {
    return factors.mode === "leaves"
      ? [
          "createXAxisLine", "createYAxisLine", "createXAxisTicks", "createYAxisTicks",
          "createXAxisLabels", "createYAxisLabels", "createXAxisTitle", "createYAxisTitle"
        ]
      : ["createXAxisTicksAndLabels", "createYAxisTicksAndLabels"];
  }
  const signature = signatures[base.id];
  if (signature === undefined) {
    throw new Error(`Missing lifecycle trace signature for ${base.id}.`);
  }
  return signature;
}

function observeLifecycleFeatures(base, program, factors) {
  const operations = new Set(program.trace?.children?.map(node => node.op) ?? []);
  const features = [];
  const signature = lifecycleSignature(base, factors);
  if (signature.every(operation => operations.has(operation))) {
    features.push(`feature:${base.id.replace(/^action-/u, "")}`);
  }
  if ([...operations].some(value => value.startsWith("create"))) {
    features.push("lifecycle:create");
  }
  if ([...operations].some(value =>
    value.startsWith("edit") || value === "jitterPoints" || value === "orderCategories"
  )) features.push("lifecycle:edit");
  if ([...operations].some(value => value.startsWith("remove"))) {
    features.push("lifecycle:remove");
  }
  if (operations.has("filterData") || operations.has("filterMarks")) {
    features.push("lifecycle:filter");
  }
  if (operations.has("filterMarks")) features.push("lifecycle:select");
  if (operations.has("highlightMarks") || operations.has("removeMarkHighlight")) {
    features.push("lifecycle:highlight");
  }
  if (["facet", "hconcat", "vconcat", "replaceCompositionChild", "editFacetScales"]
    .some(value => operations.has(value))) {
    features.push("lifecycle:compose");
  }
  if (operations.has("replaceCompositionChild")) features.push("lifecycle:reassign");
  return Object.freeze(features);
}

export const REALISTIC_LIFECYCLE_SCENARIO_RECIPES = Object.freeze(
  LIFECYCLE_SCENARIO_RECIPES.map(base => {
    const kind = REALISTIC_LIFECYCLE_KINDS[base.id];
    const datasets = realisticDatasetIds().filter(dataset =>
      realisticDatasetSupports(dataset, kind)
    );
    return Object.freeze({
      ...base,
      id: `realistic-${base.id}`,
      suite: "realistic",
      generation: "balanced-per-dataset",
      complexity: COMPOSITE_LIFECYCLES.has(base.id) ? "composite" : "advanced",
      datasets,
      build: factors => base.build(factors),
      expectedDirectActionsFor: factors => Object.freeze(lifecycleSignature(base, factors)),
      observe: (program, factors) => observeLifecycleFeatures(base, program, factors),
      describe: factors => realisticLifecycleMetadata(base, factors)
    });
  })
);

export const REALISTIC_LIFECYCLE_COUNTS = Object.freeze({
  advanced: LIFECYCLE_SCENARIO_RECIPES.length - COMPOSITE_LIFECYCLES.size,
  composite: COMPOSITE_LIFECYCLES.size
});

export const REALISTIC_LIFECYCLE_REQUIRED_FEATURES = Object.freeze([
  ...LIFECYCLE_SCENARIO_RECIPES.map(base =>
    `feature:${base.id.replace(/^action-/u, "")}`
  ),
  "lifecycle:compose",
  "lifecycle:create",
  "lifecycle:edit",
  "lifecycle:filter",
  "lifecycle:highlight",
  "lifecycle:reassign",
  "lifecycle:remove",
  "lifecycle:select"
]);

export const LIFECYCLE_EXPECTED_ACTIONS = Object.freeze([
  "filterData", "createRegressionData", "createWindowData", "createTimeUnitData",
  "createIntervalData", "createTickMark", "editTickMark", "removeMark",
  "editAreaMark", "encodeShape", "encodeAngle", "removePointRadius",
  "encodeYOffset", "encodeParallelCoordinates", "removeEncoding", "encodeHorizon",
  "editHorizon", "createRegression", "editRegression", "editErrorBar",
  "editErrorBand", "editErrorBandBoundary", "editBoxPlot", "createGradientPlot",
  "editGradientPlot", "createViolinPlot", "editXAxisTicksAndLabels",
  "editYAxisTicksAndLabels", "editXAxis", "editYAxis", "removeXAxis",
  "removeYAxis", "editHorizontalGrid", "editVerticalGrid", "editGrid",
  "editLegend", "editLegendLayout", "editLegendLabels", "editLegendTitle",
  "editLegendSymbols", "editLegendBorder", "removeLegend", "editTitle",
  "removeTitle", "createRegressionBand", "editRegressionBand",
  "createRegressionLine", "editRegressionLine", "filterMarks",
  "removeMarkHighlight", "highlightMarks", "editThetaAxis", "editRadialAxis",
  "editThetaGrid", "editRadialGrid", "replaceCompositionChild", "editFacetScales",
  "createScatterPlot", "createLinePlot", "createBarPlot", "createParallelCoordinates"
]);
