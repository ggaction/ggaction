import { chart, hconcat } from "../../../src/index.js";

import { loadZooDataset } from "../datasets/zoo.js";

const CARTESIAN_CANVAS = Object.freeze({
  width: 920,
  height: 560,
  margin: Object.freeze({ top: 110, right: 220, bottom: 120, left: 150 })
});

function recipe(id, datasets, factors, build) {
  return Object.freeze({
    id,
    datasets: Object.freeze(datasets),
    factors: Object.freeze(factors),
    build
  });
}

function temporalRows() {
  return loadZooDataset("zoo-temporal-boundaries").map((row, index) => ({
    ...row,
    order: index,
    value: row.value + (index % 3) * 0.25
  }));
}

function styleRows() {
  return loadZooDataset("zoo-multi-encoding-styles").map((row, index) => ({
    ...row,
    angle: index * 30,
    category: `Category ${index % 4}`,
    group: `Group ${index % 3}`,
    positive: row.y + 1
  }));
}

function regressionRows() {
  return loadZooDataset("zoo-label-collision-cloud").map((row, index) => ({
    id: row.id,
    x: index,
    y: 0.08 * index * index + (index % 2 === 0 ? 2 : -2) + Math.sin(index),
    group: index % 2 === 0 ? "even" : "odd"
  }));
}

function buildDerivedData(factors) {
  const rows = temporalRows();
  const filter = factors.filter === "range"
    ? { field: "value", range: { min: -10, max: 10, inclusive: true } }
    : { field: "group", oneOf: ["g0", "g1"] };
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Derived-data lifecycle", subtitle: factors.unit });
}

function buildScatterFacade(factors) {
  const rows = styleRows();
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Scatter facade lifecycle" });
}

function buildLineFacade(factors) {
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
    .createData({ id: "timeRows", values: temporalRows() })
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
    .createTitle({ text: "Line facade lifecycle" });
}

function buildBarFacade(factors) {
  const rows = loadZooDataset("zoo-diverging-stacks").map(row => ({
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
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Bar facade lifecycle", subtitle: factors.orientation });
}

function buildParallelFacade(factors) {
  return chart()
    .createCanvas({
      width: 1040,
      height: 580,
      margin: { top: 120, right: 220, bottom: 80, left: 100 }
    })
    .createData({ id: "styles", values: styleRows() })
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
    .createTitle({ text: "Parallel-coordinate facade lifecycle" });
}

function buildMarkLifecycle(factors) {
  const rows = loadZooDataset("zoo-path-order")
    .filter(row => Number.isFinite(row.value))
    .map((row, index) => ({
      ...row,
      baseline: 0,
      angle: index % 2 === 0 ? 0 : 90
    }));
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Mark create-edit-remove lifecycle" });
}

function buildHorizonLifecycle(factors) {
  const rows = loadZooDataset("zoo-path-order")
    .filter(row => Number.isFinite(row.value))
    .map((row, index) => ({ ...row, position: index % 7 }));
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
    .createData({ id: "horizonSource", values: rows })
    .createAreaMark({ id: "horizon" })
    .encodeHorizon({
      target: "horizon",
      x: "position",
      y: "value",
      groupBy: "series",
      bands: factors.bands,
      baseline: factors.baseline,
      palette: { positive: "blues", negative: "reds" }
    })
    .editHorizon({
      target: "horizon",
      bands: factors.bands === 2 ? 3 : 2,
      baseline: factors.baseline + 0.5,
      palette: { positive: "greens", negative: "oranges" }
    })
    .createGuides({ axes: { y: false }, legend: false })
    .createTitle({ text: "Horizon revision lifecycle" });
}

function buildRegressionLifecycle(factors) {
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
    .createData({ id: "regressionSource", values: regressionRows() })
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
    .createTitle({ text: "Regression owner lifecycle" });
}

function buildIntervalLifecycle(factors) {
  const rows = loadZooDataset("zoo-asymmetric-intervals").map((row, index) => ({
    ...row,
    position: index + 1,
    group: index % 2 === 0 ? "even" : "odd"
  }));
  let program = chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: `Error ${factors.kind} lifecycle` });
}

function buildBoxLifecycle(factors) {
  const rows = loadZooDataset("zoo-boxplot-thresholds");
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Box-plot revision lifecycle" });
}

function buildGradientLifecycle(factors) {
  const rows = loadZooDataset("zoo-boxplot-thresholds");
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Gradient-plot revision lifecycle" });
}

function buildViolinLifecycle(factors) {
  const rows = loadZooDataset("zoo-boxplot-thresholds");
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Violin facade lifecycle" });
}

function buildCartesianGuideLifecycle(factors) {
  let program = chart()
    .createCanvas({
      width: 1220,
      height: 680,
      margin: { top: 150, right: 310, bottom: 170, left: 230 }
    })
    .createData({ id: "styles", values: styleRows() })
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
      text: "Guide lifecycle",
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
    .removeTitle();
  return program;
}

function buildPolarGuideLifecycle(factors) {
  const rows = loadZooDataset("zoo-polar-wrap");
  return chart()
    .createCanvas({
      width: 700,
      height: 700,
      margin: { top: 120, right: 170, bottom: 120, left: 170 }
    })
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
    .createTitle({ text: "Polar guide lifecycle" });
}

function buildSelectionLifecycle(factors) {
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
    .createData({ id: "selectionRows", values: styleRows() })
    .createPointMark({ id: "selectedPoints" })
    .encodeX({ target: "selectedPoints", field: "x", scale: { zero: false } })
    .encodeY({ target: "selectedPoints", field: "positive", scale: { zero: false } })
    .encodeColor({ target: "selectedPoints", field: "color" })
    .filterMarks({
      target: "selectedPoints",
      field: "x",
      op: "range",
      min: factors.min,
      max: 11,
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
    .createTitle({ text: "Selection and filtering lifecycle" });
}

function miniaturePanel(rows, fill, title) {
  return chart()
    .createCanvas({
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
  const rows = styleRows();
  const left = miniaturePanel(rows, "#2563eb", "Original left");
  const right = miniaturePanel([...rows].reverse(), "#f97316", "Original right");
  const replacement = miniaturePanel(rows.slice(2), "#16a34a", "Replacement");
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
  const rows = loadZooDataset("zoo-facet-imbalance");
  return chart()
    .createCanvas({
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
  const rows = styleRows();
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
    .editCanvas({
      width: factors.width,
      background: factors.background
    })
    .createData({ id: "directSource", values: rows })
    .createDensityData({
      id: "directDensity",
      source: "directSource",
      field: "x",
      groupBy: "color",
      bandwidth: factors.bandwidth,
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
      transform: [{ type: "filter", field: "color", oneOf: ["color-0"] }]
    })
    .createScale({
      id: "manualScale",
      type: "linear",
      domain: [0, 11],
      range: [150, factors.width - 120],
      nice: false,
      zero: false
    })
    .createPointMark({ id: "resourcePoints", data: "directSource" })
    .encodeX({ target: "resourcePoints", field: "x" })
    .encodeY({ target: "resourcePoints", field: "positive" })
    .createTitle({ text: "Direct data and scale resources" });
}

function buildDirectPointText(factors) {
  const rows = styleRows().map(row => ({ ...row, label: row.shape }));
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Direct point and text appearance" });
}

function directRangeRows() {
  return loadZooDataset("zoo-asymmetric-intervals").map((row, index) => ({
    ...row,
    position: index + 1,
    positionEnd: index + 1.25,
    group: index % 2 === 0 ? "even" : "odd"
  }));
}

function buildDirectRangedMarks(factors) {
  const rows = directRangeRows();
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Direct ranged-mark encodings" });
}

function buildDirectBarOffsets(factors) {
  const rows = loadZooDataset("zoo-diverging-stacks").map(row => ({
    ...row,
    group: row.series
  }));
  let program = chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: `Direct ${factors.orientation} grouped offsets` });
}

function buildDirectHistogram(factors) {
  const rows = loadZooDataset("zoo-histogram-boundaries");
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Direct histogram encoding" });
}

function buildDirectParallel(factors) {
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
    .createData({ id: "parallelRows", values: styleRows() })
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
    .createTitle({ text: "Direct parallel-coordinate encoding" });
}

function buildDirectRegressionComponents(factors) {
  const rows = regressionRows();
  return chart()
    .createCanvas(CARTESIAN_CANVAS)
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
    .createTitle({ text: "Direct regression components" });
}

function directGuideBase() {
  return chart()
    .createCanvas({
      width: 920,
      height: 560,
      margin: { top: 130, right: 210, bottom: 130, left: 150 }
    })
    .createData({ id: "guideRows", values: styleRows() })
    .createPointMark({ id: "directGuidePoints" })
    .encodeX({ target: "directGuidePoints", field: "x" })
    .encodeY({ target: "directGuidePoints", field: "positive" })
    .encodeColor({ target: "directGuidePoints", field: "color" });
}

function buildDirectGuideAggregates(factors) {
  return directGuideBase()
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
    .createTitle({ text: "Direct aggregate guides" });
}

function buildDirectAxisFacades(factors) {
  return directGuideBase()
    .createXAxis({ position: factors.xPosition })
    .createYAxis({ position: factors.yPosition })
    .createHorizontalGrid({ count: factors.count, color: "#cbd5e1" })
    .createVerticalGrid({ count: factors.count, strokeDash: [3, 3] })
    .createTitle({ text: "Direct axis and grid facades" });
}

function buildDirectAxisParts(factors) {
  let program = directGuideBase();
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
  return program.createTitle({ text: `Direct axis ${factors.mode}` });
}

function buildDirectPolarParts(factors) {
  const rows = loadZooDataset("zoo-polar-wrap");
  return chart()
    .createCanvas({
      width: 700,
      height: 700,
      margin: { top: 170, right: 170, bottom: 170, left: 170 }
    })
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
    .createTitle({ text: "Direct Polar guide components" });
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
