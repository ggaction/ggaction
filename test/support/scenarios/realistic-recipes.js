import { chart, hconcat, vconcat } from "../../../src/index.js";
import { measureTextWidth } from "../../../src/core/textMetrics.js";
import { PALETTE_NAMES } from "../../../src/grammar/palettes.js";

import {
  realisticCompositionView,
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticFieldPairDomain,
  realisticGroupedView,
  realisticMatrixView,
  realisticOrderedView,
  realisticRecordView,
  realisticSourceFields,
  realisticSummaryView
} from "./realistic-data.js";

const CANVAS = Object.freeze({
  width: 1800,
  height: 920,
  margin: Object.freeze({ top: 280, right: 520, bottom: 280, left: 480 })
});

const PALETTES = Object.freeze([...PALETTE_NAMES]);
const LEGEND_POSITIONS = Object.freeze(["right", "bottom", "left", "top"]);
const FACET_AXES_COVERAGE_SCHEDULE = Object.freeze({
  factor: "facetAxes",
  selectionVariantIds: Object.freeze([
    "each", "outer",
    "each", "outer",
    "each", "outer",
    "each", "outer",
    "each", "outer"
  ]),
  minimumSelections: 10,
  assignment: "round-robin-datasets",
  variantRequirements: Object.freeze(["each", "outer"].map(variantId =>
    Object.freeze({
      variantId,
      minimumOccurrences: 5,
      minimumDatasets: 3
    })
  )),
  minimumDatasetsPerRequirement: 3
});

const SIMPLE_SPECS = Object.freeze([
  { id: "strip-points", kind: "point", family: "strip", variant: "plain" },
  { id: "jittered-strip", kind: "point", family: "strip", variant: "jitter" },
  { id: "ranked-dots", kind: "summary-point", family: "dot-plot", variant: "rank" },
  { id: "vertical-summary-bars", kind: "bar", family: "bar", orientation: "vertical" },
  { id: "horizontal-summary-bars", kind: "bar", family: "bar", orientation: "horizontal" },
  { id: "distribution-histogram", kind: "histogram", family: "histogram", variant: "plain" },
  { id: "category-boxes", kind: "box", family: "box", orientation: "vertical" },
  { id: "category-density", kind: "density", family: "density", variant: "plain" },
  { id: "ranked-line", kind: "line", family: "line", curve: "linear" },
  { id: "ranked-area", kind: "area", family: "area", curve: "linear" },
  { id: "category-donut", kind: "arc", family: "donut", innerRadius: 0.48 },
  { id: "distribution-matrix", kind: "heatmap", family: "heatmap", variant: "plain" },
  { id: "quartile-intervals", kind: "interval", family: "error-bar", orientation: "vertical" },
  { id: "ranked-labels", kind: "labels", family: "text", variant: "plain" }
]);

const INTERMEDIATE_SPECS = Object.freeze([
  { id: "encoded-strip", kind: "point", family: "strip", variant: "encoded" },
  { id: "large-jittered-strip", kind: "point", family: "strip", variant: "jitter-large" },
  { id: "bubble-summary", kind: "summary-point", family: "bubble", variant: "bubble" },
  { id: "reversed-summary-points", kind: "summary-point", family: "dot-plot", variant: "reverse" },
  { id: "grouped-bars", kind: "bar", family: "grouped-bar", layout: "group" },
  { id: "stacked-bars", kind: "bar", family: "stacked-bar", layout: "stack" },
  { id: "normalized-bars", kind: "bar", family: "normalized-bar", layout: "fill" },
  { id: "overlay-bars", kind: "bar", family: "overlay-bar", layout: "overlay" },
  { id: "ordered-horizontal-bars", kind: "bar", family: "bar", orientation: "horizontal", ordered: true },
  { id: "narrow-vertical-bars", kind: "bar", family: "bar", orientation: "vertical", narrow: true },
  { id: "stacked-histogram", kind: "histogram", family: "histogram", variant: "stack" },
  { id: "normalized-histogram", kind: "histogram", family: "histogram", variant: "normalize" },
  { id: "fine-histogram", kind: "histogram", family: "histogram", variant: "fine" },
  { id: "horizontal-boxes", kind: "box", family: "box", orientation: "horizontal" },
  { id: "minmax-boxes", kind: "box", family: "box", orientation: "vertical", minmax: true },
  { id: "count-density", kind: "density", family: "density", variant: "count" },
  { id: "triangular-density", kind: "density", family: "density", variant: "triangular" },
  { id: "edited-density", kind: "density", family: "density", variant: "edit" },
  { id: "step-ranking", kind: "line", family: "step-line", curve: "step" },
  { id: "monotone-ranking", kind: "line", family: "line", curve: "monotone" },
  { id: "cardinal-area", kind: "area", family: "area", curve: "cardinal" },
  { id: "padded-donut", kind: "arc", family: "donut", innerRadius: 0.62, padded: true },
  { id: "solid-pie", kind: "arc", family: "pie", innerRadius: 0 },
  { id: "reversed-matrix", kind: "heatmap", family: "heatmap", variant: "reverse" },
  { id: "labeled-matrix", kind: "heatmap", family: "heatmap", variant: "labels" },
  { id: "horizontal-quartile-intervals", kind: "interval", family: "error-bar", orientation: "horizontal" },
  { id: "capped-quartile-intervals", kind: "interval", family: "error-bar", orientation: "vertical", longCaps: true },
  { id: "laid-out-labels", kind: "labels", family: "text", variant: "layout" }
]);

const ADVANCED_SPECS = Object.freeze([
  { id: "faceted-distribution", kind: "facet", family: "facet" }
]);

const COMPOSITE_SPECS = Object.freeze([
  { id: "paired-summary-dashboard", kind: "composition", family: "dashboard" }
]);

const ALL_ANALYSIS_SPECS = Object.freeze([
  ...SIMPLE_SPECS,
  ...INTERMEDIATE_SPECS,
  ...ADVANCED_SPECS,
  ...COMPOSITE_SPECS
]);

function aggregateValue(value) {
  return value === "median" ? "median" : value === "sum" ? "sum" : "mean";
}

function aggregateLabel(operation, { adjective = false } = {}) {
  if (operation === "sum") return adjective ? "total" : "Total";
  if (operation === "median") return adjective ? "median" : "Median";
  if (operation === "count") return adjective ? "observation count" : "Observation count";
  return adjective ? "mean" : "Mean";
}

function titleContext(dataset, view, spec, factors) {
  const fields = realisticSourceFields(dataset, view.provenance.fieldBindings);
  const byName = new Map(fields.map(field => [field.field, field]));
  const bindings = view.provenance.fieldBindings;
  const measure = byName.get(bindings.measure);
  const dimension = byName.get(bindings.dimension);
  const secondaryDimension = byName.get(bindings.secondaryDimension);
  const measureText = measure?.label ?? bindings.measure;
  const dimensionText = dimension?.label ?? bindings.dimension;
  const secondaryDimensionText = secondaryDimension?.label ?? bindings.secondaryDimension;
  const unit = measure?.unit === undefined ? "" : ` (${measure.unit})`;
  const measureAxis = `${measureText}${unit}`;
  const sequence = byName.get(bindings.temporal ?? bindings.order);
  const sequenceText = sequence?.label;
  const sequenceIsDimension = sequence?.field === dimension?.field;
  const operation = view.aggregate ?? aggregateValue(factors.aggregate);
  const aggregate = aggregateLabel(operation);
  const aggregateAdjective = aggregateLabel(operation, { adjective: true });
  const sampleN = view.sample?.displayedRowCount;
  const sampleTitle = sampleN === undefined
    ? ""
    : ` — stratified sample (n=${sampleN})`;
  const sampleQuestion = sampleN === undefined
    ? ""
    : ` in the deterministic stratified sample of ${sampleN} authentic rows`;
  const sequenceTitle = `${measureAxis} over ${sequenceText ?? "source order"}` +
    (sequenceIsDimension ? "" : ` by ${dimensionText}`);
  let title;
  let analysisQuestion;
  if (spec.kind === "point") {
    title = `${measureAxis} observations by ${dimensionText}${sampleTitle}`;
    analysisQuestion = `How does ${measureText} vary across ${dimensionText}${sampleQuestion}?`;
  } else if (spec.kind === "summary-point") {
    title = `${aggregate} ${measureAxis} by ${dimensionText}`;
    analysisQuestion = `Which ${dimensionText} groups have the largest ${aggregateAdjective} ${measureText}?`;
  } else if (spec.kind === "bar" && spec.layout !== undefined) {
    const countLayout = ["stack", "fill"].includes(spec.layout);
    title = countLayout
      ? `${aggregateLabel("count")} by ${dimensionText} and ${secondaryDimensionText}`
      : `${aggregate} ${measureAxis} by ${dimensionText} and ${secondaryDimensionText}`;
    analysisQuestion = spec.layout === "fill"
      ? `What share of observations in each ${dimensionText} group belongs to each ${secondaryDimensionText}?`
      : countLayout
        ? `How many authentic observations fall in each ${dimensionText} and ${secondaryDimensionText} combination?`
        : `How does the full-source ${aggregateAdjective} ${measureText} compare across ${dimensionText} and ${secondaryDimensionText}?`;
  } else if (spec.kind === "bar") {
    title = `${aggregate} ${measureAxis} by ${dimensionText}`;
    analysisQuestion = operation === "sum"
      ? `Which ${dimensionText} groups have the largest total ${measureText}?`
      : `How does the ${aggregateAdjective} ${measureText} compare across ${dimensionText} groups?`;
  } else if (spec.kind === "histogram") {
    title = `Distribution of ${measureAxis}${sampleTitle}`;
    analysisQuestion = spec.variant === "plain" || spec.variant === "fine"
      ? `What is the sampled distribution of ${measureText}${sampleQuestion}?`
      : `How does the sampled distribution of ${measureText} differ across ${dimensionText}${sampleQuestion}?`;
  } else if (spec.kind === "box") {
    title = `${measureAxis} distribution by ${dimensionText}${sampleTitle}`;
    analysisQuestion = `How do the median, spread, and outliers of ${measureText} differ by ${dimensionText}${sampleQuestion}?`;
  } else if (spec.kind === "density") {
    title = `${measureAxis} density by ${dimensionText}${sampleTitle}`;
    analysisQuestion = `Where is ${measureText} concentrated within each ${dimensionText} group${sampleQuestion}?`;
  } else if (["line", "area"].includes(spec.kind)) {
    title = `${aggregate} ${sequenceTitle}`;
    analysisQuestion = `How does the ${aggregateAdjective} ${measureText} change over ${sequenceText ?? "source order"}` +
      (sequenceIsDimension ? "?" : ` by ${dimensionText}?`);
  } else if (spec.kind === "arc") {
    title = `Relative magnitude of ${aggregateAdjective} ${measureAxis} by ${dimensionText}`;
    analysisQuestion = `What share of the absolute ${aggregateAdjective} ${measureText} magnitude belongs to each ${dimensionText} group?`;
  } else if (spec.kind === "heatmap") {
    title = `Mean ${measureAxis} by ${dimensionText} and ${secondaryDimensionText}`;
    analysisQuestion = `Where are the highest full-source mean ${measureText} values across ${dimensionText} and ${secondaryDimensionText} combinations?`;
  } else if (spec.kind === "interval") {
    title = `Median and interquartile range of ${measureAxis} by ${dimensionText}`;
    analysisQuestion = `How do the median and middle 50% of ${measureText} differ across ${dimensionText} groups?`;
  } else if (spec.kind === "labels") {
    title = `${dimensionText} ranked by ${aggregateAdjective} ${measureAxis}`;
    analysisQuestion = `Which ${dimensionText} groups rank highest by ${aggregateAdjective} ${measureText}?`;
  } else if (spec.kind === "facet") {
    title = `${measureAxis} by ${dimensionText}, faceted by ${secondaryDimensionText}${sampleTitle}`;
    analysisQuestion = `How does sampled ${measureText} vary by ${dimensionText} within each ${secondaryDimensionText}${sampleQuestion}?`;
  } else {
    title = `${aggregate} and sampled ${measureAxis} by ${dimensionText}${sampleTitle}`;
    analysisQuestion = `How do full-source ${aggregateAdjective} levels and ${sampleN} sampled observations of ${measureText} compare across ${dimensionText}?`;
  }
  return Object.freeze({
    title,
    analysisQuestion,
    sourceFields: fields,
    measureText,
    measureAxis,
    dimensionText,
    secondaryDimensionText,
    sequenceText,
    aggregate,
    aggregateAdjective,
    sampleN
  });
}

function canvas(factors) {
  const margin = { ...CANVAS.margin };
  if (factors?.legendPosition === "left") margin.left = 1_000;
  if (factors?.legendPosition === "right") margin.right = 760;
  if (factors?.legendPosition === "top") margin.top = 420;
  if (factors?.legendPosition === "bottom") margin.bottom = 420;
  return { ...CANVAS, width: 2_600, height: 1_120, margin };
}

function sparseCategoryValues(rows, field) {
  const values = [...new Set(rows.map(row => row[field]))];
  const longest = Math.max(...values.map(value => String(value).length));
  const limit = longest > 50 ? 1 : longest > 24 ? 2 : 4;
  if (values.length <= limit) return values;
  return [...new Set(Array.from({ length: limit }, (_, index) =>
    values[Math.round(index * (values.length - 1) / (limit - 1))]
  ))];
}

function guides(factors, xTitle, yTitle, {
  legend = true,
  legendTitle = "Group",
  xCount,
  xFormat,
  xValues,
  yValues
} = {}) {
  return {
    axes: {
      x: {
        ...(xValues !== undefined
          ? {
              ticksAndLabels: {
                values: xValues,
                ...(xFormat === undefined ? {} : { labels: { format: xFormat } })
              }
            }
          : xCount === undefined ? {} : {
              ticksAndLabels: {
                count: xCount,
                ...(xFormat === undefined ? {} : { labels: { format: xFormat } })
              }
            }),
        title: { text: xTitle }
      },
      y: {
        position: factors.legendPosition === "left" ? "right" : "left",
        ...(yValues === undefined ? {} : { ticksAndLabels: { values: yValues } }),
        title: { text: yTitle }
      }
    },
    grid: false,
    legend: legend
      ? { position: factors.legendPosition, title: legendTitle }
      : false
  };
}

function finish(program, context, factors, {
  xTitle,
  yTitle,
  legend = true,
  legendTitle,
  xCount,
  xFormat,
  xValues,
  yValues
} = {}) {
  return program
    .createGuides(guides(
      factors,
      xTitle ?? context.dimensionText,
      yTitle ?? context.measureText,
      { legend, legendTitle, xCount, xFormat, xValues, yValues }
    ))
    .createTitle({
      text: context.title,
      subtitle: context.analysisQuestion,
      align: factors.titleAlign
    });
}

function recordView(factors, capability = "record", options = {}) {
  return realisticRecordView(factors.dataset, {
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    includeSecondaryMeasure: false,
    includeSecondaryDimension: capability === "facet",
    deriveSubgroup: false,
    ...options,
    ...(capability === "distribution" ? { minimumPerGroup: 5 } : {}),
    ...(capability === "facet"
      ? { minimumPerSubgroup: 3, witnessCross: true }
      : {})
  });
}

function summaryView(factors, operation = aggregateValue(factors.aggregate)) {
  return realisticSummaryView(factors.dataset, {
    aggregate: operation,
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex
  });
}

function orderedView(factors, spec) {
  return realisticOrderedView(factors.dataset, {
    aggregate: aggregateValue(factors.aggregate),
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    temporalOnly: spec.kind === "area"
  });
}

function resolveAnalysis(spec, factors) {
  let view;
  if (spec.kind === "summary-point") {
    view = summaryView(factors);
  } else if (spec.kind === "point") {
    view = recordView(factors);
  } else if (spec.kind === "bar" && spec.layout !== undefined) {
    view = realisticGroupedView(factors.dataset, {
      aggregate: ["stack", "fill"].includes(spec.layout)
        ? "count"
        : aggregateValue(factors.aggregate),
      measureIndex: factors.fieldPair.measureIndex,
      dimensionIndex: factors.fieldPair.dimensionIndex,
      secondaryDimensionIndex: 0
    });
  } else if (spec.kind === "bar") {
    view = summaryView(factors);
  } else if (spec.kind === "histogram") {
    view = recordView(factors, capabilityFor(spec), {
      groupLimit: ["stack", "normalize"].includes(spec.variant) ? 8 : 24
    });
  } else if (["box", "density"].includes(spec.kind)) {
    view = recordView(factors, "distribution");
  } else if (["line", "area"].includes(spec.kind)) {
    view = orderedView(factors, spec);
  } else if (spec.kind === "arc") {
    view = summaryView(factors);
  } else if (spec.kind === "heatmap") {
    view = realisticMatrixView(factors.dataset, {
      measureIndex: factors.fieldPair.measureIndex,
      dimensionIndex: factors.fieldPair.dimensionIndex,
      secondaryDimensionIndex: 0
    });
  } else if (spec.kind === "interval") {
    view = summaryView(factors, "median");
  } else if (spec.kind === "labels") {
    view = summaryView(factors);
  } else if (spec.kind === "facet") {
    view = recordView(factors, "facet");
  } else if (spec.kind === "composition") {
    view = realisticCompositionView(factors.dataset, {
      aggregate: aggregateValue(factors.aggregate),
      measureIndex: factors.fieldPair.measureIndex,
      dimensionIndex: factors.fieldPair.dimensionIndex
    });
  } else {
    throw new Error(`Unknown realistic recipe kind "${spec.kind}".`);
  }
  return Object.freeze({
    view,
    context: titleContext(factors.dataset, view, spec, factors)
  });
}

function buildPoint(spec, factors, resolution) {
  const { view, context } = resolution;
  const summary = spec.kind === "summary-point";
  let program = chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    .createPointMark({
      id: "points",
      shape: factors.shape,
      opacity: factors.opacity,
      stroke: "#ffffff",
      strokeWidth: 0.6
    })
    .encodeX({ target: "points", field: "value", scale: { nice: true, zero: false } })
    .encodeY({
      target: "points",
      field: "category",
      fieldType: "nominal",
      scale: { reverse: summary && spec.variant === "reverse" }
    })
    .encodeColor({
      target: "points",
      field: "category",
      fieldType: "nominal",
      scale: { palette: factors.palette }
    });
  program = summary && spec.variant === "bubble"
    ? program.encodeSize({ target: "points", field: "count", scale: { range: [12, 170] } })
    : spec.variant === "encoded"
      ? program.encodeSize({ target: "points", field: "value", scale: { range: [10, 90] } })
    : program.encodePointRadius({ target: "points", value: factors.radius });
  if (["jitter", "jitter-large"].includes(spec.variant)) {
    program = program.jitterPoints({
      target: "points",
      channel: "y",
      maxOffset: { pixels: spec.variant === "jitter-large" ? 10 : 5 },
      seed: `${spec.id}-${factors.dataset}`,
      key: "key"
    });
  }
  return program
    .createGuides(guides(factors, context.measureAxis, context.dimensionText, {
      yValues: sparseCategoryValues(view.rows, "category"),
      legendTitle: context.dimensionText
    }))
    .createTitle({
      text: context.title,
      subtitle: context.analysisQuestion,
      align: factors.titleAlign
    });
}

function buildBar(spec, factors, resolution) {
  const grouped = spec.layout !== undefined;
  const { view, context } = resolution;
  const horizontal = spec.orientation === "horizontal";
  const countLayout = ["stack", "fill"].includes(spec.layout);
  const category = { field: "category", fieldType: "nominal" };
  const value = {
    field: "value",
    aggregate: "sum",
    scale: { nice: true, zero: true }
  };
  let program = chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    .createBarMark({ id: "bars", opacity: factors.opacity })
    [horizontal ? "encodeX" : "encodeY"]({ target: "bars", ...value })
    [horizontal ? "encodeY" : "encodeX"]({ target: "bars", ...category })
    .encodeColor({
      target: "bars",
      field: grouped ? "subgroup" : "category",
      fieldType: "nominal",
      layout: spec.layout ?? "group",
      scale: { palette: factors.palette }
    })
    .encodeBarWidth(spec.narrow
      ? { target: "bars", band: 0.48 }
      : { target: "bars", band: 0.76 });
  if (spec.ordered) {
    program = program.orderCategories({
      target: "bars",
      channel: horizontal ? "y" : "x",
      by: { field: "value", aggregate: "sum" },
      direction: "descending"
    });
  }
  return finish(program, context, factors, {
    xTitle: horizontal
      ? countLayout ? "Observation count" : context.measureAxis
      : context.dimensionText,
    yTitle: horizontal
      ? context.dimensionText
      : countLayout ? "Observation count" : context.measureAxis,
    legendTitle: grouped ? context.secondaryDimensionText : context.dimensionText,
    ...(horizontal
      ? { yValues: sparseCategoryValues(view.rows, "category") }
      : { xValues: sparseCategoryValues(view.rows, "category") })
  });
}

function buildHistogram(spec, factors, resolution) {
  const { view, context } = resolution;
  const segmented = ["stack", "normalize"].includes(spec.variant);
  return chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    .createHistogram({
      id: "histogram",
      field: "value",
      maxBins: spec.variant === "fine" ? 24 : factors.maxBins,
      stack: spec.variant === "normalize" ? "normalize" : "zero",
      xScale: { nice: factors.nice, zero: false },
      ...(segmented ? {
        color: {
          field: "category",
          layout: spec.variant === "normalize" ? "fill" : "stack",
          scale: { palette: factors.palette }
        }
      } : {}),
      guides: false
    })
    .createGuides({
      axes: {
        x: { ticksAndLabels: { count: 5 }, title: { text: context.measureAxis } },
        y: {
          position: factors.legendPosition === "left" ? "right" : "left",
          ticksAndLabels: { count: 5 },
          title: { text: "Count" }
        }
      },
      grid: false,
      legend: segmented
        ? { position: factors.legendPosition, title: context.dimensionText }
        : false
    })
    .createTitle({ text: context.title, subtitle: context.analysisQuestion, align: factors.titleAlign });
}

function buildBox(spec, factors, resolution) {
  const { view, context } = resolution;
  const horizontal = spec.orientation === "horizontal";
  return chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    .createBoxPlot({
      id: "boxes",
      x: horizontal
        ? { field: "value" }
        : { field: "category", fieldType: "nominal" },
      y: horizontal
        ? { field: "category", fieldType: "nominal" }
        : { field: "value" },
      whisker: spec.minmax ? { type: "minmax" } : { type: "tukey", factor: factors.whisker },
      outliers: factors.outliers,
      width: { band: factors.width }
    })
    .encodeColor({
      target: "boxes",
      field: "category",
      fieldType: "nominal",
      scale: { palette: factors.palette }
    })
    .createGuides(guides(
      factors,
      horizontal ? context.measureAxis : context.dimensionText,
      horizontal ? context.dimensionText : context.measureAxis,
      horizontal
        ? {
            yValues: sparseCategoryValues(view.rows, "category"),
            legendTitle: context.dimensionText
          }
        : {
            xValues: sparseCategoryValues(view.rows, "category"),
            legendTitle: context.dimensionText
          }
    ))
    .createTitle({ text: context.title, subtitle: context.analysisQuestion, align: factors.titleAlign });
}

function buildDensity(spec, factors, resolution) {
  const { view, context } = resolution;
  const ordered = view.rows.map(row => row.value).sort((left, right) => left - right);
  const at = probability => ordered[Math.round((ordered.length - 1) * probability)];
  const spread = at(0.75) - at(0.25) || ordered.at(-1) - ordered[0];
  const bandwidth = Math.max(Number.MIN_VALUE, spread * factors.bandwidthRatio);
  let program = chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    .createAreaMark({ id: "density", opacity: factors.opacity })
    .encodeDensity({
      target: "density",
      field: "value",
      groupBy: "category",
      kernel: spec.variant === "triangular"
        ? "triangular"
        : spec.variant === "edit" ? "gaussian" : factors.kernel,
      normalization: spec.variant === "count" ? "count" : "unit",
      steps: factors.steps,
      bandwidth
    })
    .encodeColor({
      target: "density",
      field: "category",
      layout: "overlay",
      scale: { palette: factors.palette }
    });
  if (spec.variant === "edit") {
    program = program.editDensity({
      target: "density",
      kernel: "epanechnikov",
      steps: factors.steps + 8
    });
  }
  return finish(program, context, factors, {
    xTitle: context.measureAxis,
    yTitle: spec.variant === "count" ? "Estimated count density" : "Probability density",
    legendTitle: context.dimensionText
  });
}

function buildRankPath(spec, factors, resolution) {
  const { view, context } = resolution;
  const axisPositions = view.rows.map(row =>
    view.positionType === "temporal" ? Date.parse(row.position) : row.position
  );
  const xValues = [...new Set([Math.min(...axisPositions), Math.max(...axisPositions)])];
  const mark = spec.kind === "area" ? "createAreaMark" : "createLineMark";
  const edit = spec.kind === "area" ? "editAreaMark" : "editLineMark";
  let program = chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    [mark]({ id: "rankPath", opacity: factors.opacity })
    .encodeX({
      target: "rankPath",
      field: "position",
      fieldType: view.positionType,
      scale: { reverse: factors.reverse }
    })
    .encodeGroup({ target: "rankPath", field: "group" });
  program = spec.kind === "area"
    ? program.encodeYRange({ target: "rankPath", lower: "baseline", upper: "value" })
    : program.encodeY({
        target: "rankPath",
        field: "value",
        ...(view.positionType === "temporal" ? { aggregate: "mean" } : {}),
        scale: { nice: true, zero: false }
      });
  program = program.encodeColor({
    target: "rankPath",
    field: "group",
    scale: { palette: factors.palette }
  });
  return finish(program
    [edit]({
      target: "rankPath",
      curve: spec.curve,
      ...(spec.kind === "line" ? { strokeWidth: factors.strokeWidth } : {})
    }), context, factors, {
      xTitle: context.sequenceText,
      yTitle: context.measureAxis,
      xValues,
      xFormat: view.positionFormat,
      legend: true,
      legendTitle: context.dimensionText
    });
}

function buildArc(spec, factors, resolution) {
  const { view, context } = resolution;
  const horizontalLegend = ["top", "bottom"].includes(factors.legendPosition);
  const margin = horizontalLegend
    ? {
        top: factors.legendPosition === "top" ? 220 : 90,
        right: 60,
        bottom: factors.legendPosition === "bottom" ? 220 : 80,
        left: 60
      }
    : {
        top: 300,
        right: factors.legendPosition === "right" ? 420 : 80,
        bottom: 80,
        left: factors.legendPosition === "left" ? 420 : 80
      };
  return chart()
    .createCanvas({
      width: 900,
      height: 800,
      margin
    })
    .createData({ id: "analysisRows", values: view.rows })
    .createArcMark({
      id: "arcs",
      innerRadius: spec.innerRadius,
      padAngle: spec.padded
        ? Math.min(...view.rows.map(row => row.share * 360)) * factors.padRatio
        : 0,
      opacity: factors.opacity
    })
    .encodeTheta({ target: "arcs", field: "category", aggregate: "sum", weight: "magnitude" })
    .encodeColor({ target: "arcs", field: "category", scale: { palette: factors.palette } })
    .createGuides({
      axes: false,
      grid: false,
      legend: {
        position: factors.legendPosition,
        title: context.dimensionText,
        ...(horizontalLegend ? { columns: Math.min(3, view.rows.length) } : {})
      }
    })
    .createTitle({
      text: context.title,
      subtitle: context.analysisQuestion,
      align: factors.titleAlign,
      maxWidth: horizontalLegend ? 760 : 360,
      wrap: "word",
      lineHeight: 26
    });
}

function buildHeatmap(spec, factors, resolution) {
  const { view, context } = resolution;
  let program = chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    .createHeatmap({
      id: "cells",
      x: { field: "x", fieldType: "nominal" },
      y: { field: "y", fieldType: "nominal" },
      color: {
        field: "value",
        fieldType: "quantitative",
        scale: { type: "sequential", palette: factors.palette, reverse: spec.variant === "reverse" }
      },
      rect: { stroke: "#ffffff", strokeWidth: 0.6 },
      guides: false
    });
  if (spec.variant === "labels") {
    program = program
      .createTextMark({ id: "cellLabels", fontSize: 8, align: "center", baseline: "middle" })
      .encodeX({ target: "cellLabels", field: "x", fieldType: "nominal" })
      .encodeY({ target: "cellLabels", field: "y", fieldType: "nominal" })
      .encodeText({ target: "cellLabels", field: "value", format: ".2f" });
  }
  return finish(program, context, factors, {
    xTitle: context.dimensionText,
    yTitle: context.secondaryDimensionText,
    legendTitle: `Mean ${context.measureAxis}`,
    xValues: sparseCategoryValues(view.rows, "x"),
    yValues: sparseCategoryValues(view.rows, "y")
  });
}

function buildInterval(spec, factors, resolution) {
  const { view, context } = resolution;
  const horizontal = spec.orientation === "horizontal";
  return chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    .createErrorBar({
      id: "intervals",
      x: horizontal
        ? { center: "center", lower: "lower", upper: "upper" }
        : { field: "category", fieldType: "nominal" },
      y: horizontal
        ? { field: "category", fieldType: "nominal" }
        : { center: "center", lower: "lower", upper: "upper" },
      caps: true,
      capSize: spec.longCaps ? 16 : factors.capSize,
      strokeWidth: factors.strokeWidth
    })
    .createGuides(guides(
      factors,
      horizontal ? context.measureAxis : context.dimensionText,
      horizontal ? context.dimensionText : context.measureAxis,
      {
        legend: false,
        ...(horizontal
          ? { yValues: sparseCategoryValues(view.rows, "category") }
          : { xValues: sparseCategoryValues(view.rows, "category") })
      }
    ))
    .createTitle({ text: context.title, subtitle: context.analysisQuestion, align: factors.titleAlign });
}

function buildLabels(spec, factors, resolution) {
  const { view, context } = resolution;
  let program = chart()
    .createCanvas(canvas(factors))
    .createData({ id: "analysisRows", values: view.rows })
    .createPointMark({ id: "anchorPoints", fill: "#64748b" })
    .encodeX({ target: "anchorPoints", field: "rank" })
    .encodeY({ target: "anchorPoints", field: "value", scale: { zero: false } })
    .createTextMark({
      id: "labels",
      fontSize: factors.fontSize,
      fontWeight: factors.fontWeight,
      dx: 6,
      align: "left"
    })
    .encodeX({ target: "labels", field: "rank", scale: { id: "x" } })
    .encodeY({ target: "labels", field: "value", scale: { id: "y" } })
    .encodeText({ target: "labels", field: "category" });
  if (spec.variant === "layout") {
    program = program.layoutLabels({
      target: "labels",
      axis: factors.labelAxis,
      padding: factors.labelPadding,
      maxDisplacement: factors.maxDisplacement,
      bounds: "plot",
      leader: { stroke: "#94a3b8", strokeWidth: 0.8 }
    });
  }
  return finish(program, context, factors, {
    xTitle: "Rank",
    yTitle: `${context.aggregate} ${context.measureAxis}`,
    legend: false
  });
}

function facetGuideLayout(view, factors) {
  const allCategories = [...new Set(view.rows.map(row => row.category))];
  const displayedCategories = factors.facetScales === "shared"
    ? sparseCategoryValues(view.rows, "category")
    : allCategories;
  const maximumLabelWidth = Math.max(...displayedCategories.map(value =>
    measureTextWidth(String(value), { fontSize: 12 })
  ));
  const titleOffset = Math.ceil(maximumLabelWidth + 28);
  const leftMargin = Math.max(300, titleOffset + 16);
  return { displayedCategories, titleOffset, leftMargin };
}

function facetCanvas(columns, guideLayout) {
  const extraGuideWidth = guideLayout.leftMargin - 300;
  return {
    width: 420 + columns * 140 + extraGuideWidth,
    height: 420,
    margin: { top: 90, right: 100, bottom: 120, left: guideLayout.leftMargin }
  };
}

function buildFacet(spec, factors, resolution) {
  const { view, context } = resolution;
  const guideLayout = facetGuideLayout(view, factors);
  return chart()
    .createCanvas(facetCanvas(factors.columns, guideLayout))
    .createData({ id: "analysisRows", values: view.rows })
    .createPointMark({ id: "facetPoints", opacity: factors.opacity })
    .encodeX({ target: "facetPoints", field: "value", scale: { zero: false } })
    .encodeY({ target: "facetPoints", field: "category", fieldType: "nominal" })
    .encodeColor({ target: "facetPoints", field: "category", scale: { palette: factors.palette } })
    .createGuides({
      axes: {
        x: {
          ticksAndLabels: { count: 4 },
          title: { text: context.measureAxis }
        },
        y: {
          ...(factors.facetScales === "shared"
            ? { ticksAndLabels: { values: guideLayout.displayedCategories } }
            : {}),
          title: { text: context.dimensionText, offset: guideLayout.titleOffset }
        }
      },
      legend: false
    })
    .facet({
      field: "subgroup",
      columns: factors.columns,
      gap: factors.gap,
      padding: factors.padding,
      scales: { x: factors.facetScales, y: factors.facetScales },
      guides: { axes: factors.facetAxes, legend: false }
    })
    .createTitle({ text: context.title, subtitle: context.analysisQuestion, align: factors.titleAlign });
}

function miniSummary(view, color, title, context) {
  return chart()
    .createCanvas({
      width: 1600,
      height: 900,
      margin: { top: 420, right: 160, bottom: 160, left: 440 }
    })
    .createData({ values: view.rows })
    .createBarMark({ id: "miniBars", fill: color })
    .encodeX({
      target: "miniBars",
      field: "value",
      aggregate: "sum",
      scale: { zero: true }
    })
    .encodeY({ target: "miniBars", field: "category", fieldType: "nominal" })
    .createGuides({
      axes: {
        x: {
          ticksAndLabels: { count: 3 },
          title: { text: `${context.aggregate} ${context.measureAxis}` }
        },
        y: {
          ticksAndLabels: { values: sparseCategoryValues(view.rows, "category") },
          title: { text: context.dimensionText }
        }
      },
      legend: false
    })
    .createTitle({ text: title, maxWidth: 960, wrap: "word", lineHeight: 32 });
}

function miniDistribution(view, color, title, context) {
  return chart()
    .createCanvas({
      width: 1450,
      height: 980,
      margin: { top: 420, right: 160, bottom: 160, left: 440 }
    })
    .createData({ values: view.rows })
    .createPointMark({ id: "miniPoints", fill: color, opacity: 0.62 })
    .encodeX({ target: "miniPoints", field: "value", scale: { zero: false } })
    .encodeY({ target: "miniPoints", field: "category", fieldType: "nominal" })
    .createGuides({
      axes: {
        x: { ticksAndLabels: { count: 3 }, title: { text: context.measureAxis } },
        y: {
          ticksAndLabels: { values: sparseCategoryValues(view.rows, "category") },
          title: { text: context.dimensionText }
        }
      },
      legend: false
    })
    .createTitle({ text: title, maxWidth: 810, wrap: "word", lineHeight: 32 });
}

function buildComposition(spec, factors, resolution) {
  const { view, context } = resolution;
  const summary = Object.freeze({ rows: view.summaryRows });
  const records = Object.freeze({ rows: view.recordRows });
  const first = miniSummary(summary, "#2563eb", context.title, context);
  const second = miniDistribution(records, "#f97316", context.title, context);
  const compose = factors.compositionDirection === "horizontal" ? hconcat : vconcat;
  return compose({
    id: "realisticDashboard",
    programs: [{ id: "summary", program: first }, { id: "distribution", program: second }],
    gap: factors.gap,
    padding: factors.padding,
    align: factors.compositionAlign
  });
}

function buildRecipe(spec, factors, resolution) {
  if (["point", "summary-point"].includes(spec.kind)) {
    return buildPoint(spec, factors, resolution);
  }
  if (spec.kind === "bar") return buildBar(spec, factors, resolution);
  if (spec.kind === "histogram") return buildHistogram(spec, factors, resolution);
  if (spec.kind === "box") return buildBox(spec, factors, resolution);
  if (spec.kind === "density") return buildDensity(spec, factors, resolution);
  if (["line", "area"].includes(spec.kind)) {
    return buildRankPath(spec, factors, resolution);
  }
  if (spec.kind === "arc") return buildArc(spec, factors, resolution);
  if (spec.kind === "heatmap") return buildHeatmap(spec, factors, resolution);
  if (spec.kind === "interval") return buildInterval(spec, factors, resolution);
  if (spec.kind === "labels") return buildLabels(spec, factors, resolution);
  if (spec.kind === "facet") return buildFacet(spec, factors, resolution);
  if (spec.kind === "composition") return buildComposition(spec, factors, resolution);
  throw new Error(`Unknown realistic recipe kind "${spec.kind}".`);
}

function capabilityFor(spec) {
  if (["box", "density"].includes(spec.kind)) return "distribution";
  if (spec.kind === "histogram") {
    return ["stack", "normalize"].includes(spec.variant)
      ? "segmented-histogram"
      : "histogram";
  }
  if (spec.kind === "interval") return "interval";
  if (spec.kind === "heatmap") return "matrix";
  if (spec.kind === "facet") return "facet";
  if (spec.kind === "line") return "ordered";
  if (spec.kind === "area") return "temporal";
  if (spec.kind === "bar" && spec.layout !== undefined) return "grouped";
  return "record";
}

function palettesFor(spec) {
  const index = ALL_ANALYSIS_SPECS.indexOf(spec);
  if (index < 0) throw new Error(`Unknown realistic analysis spec "${spec.id}".`);
  return Object.freeze(Array.from({ length: 4 }, (_, offset) =>
    PALETTES[(index * 4 + offset) % PALETTES.length]
  ));
}

function factorsFor(spec, dataset) {
  const allFieldPairs = realisticFieldPairDomain(dataset, capabilityFor(spec));
  let fieldPairs = allFieldPairs;
  if (spec.kind === "bar" && ["stack", "fill"].includes(spec.layout)) {
    fieldPairs = allFieldPairs.filter((pair, index, values) =>
      values.findIndex(candidate => candidate.dimensionIndex === pair.dimensionIndex) === index
    );
  } else if (spec.kind === "arc") {
    fieldPairs = allFieldPairs.filter(fieldPair => ["mean", "median", "sum"].every(aggregate =>
      summaryView({ dataset, fieldPair, aggregate }).rows.some(row => row.magnitude > 0)
    ));
  } else if (
    ["summary-point", "labels", "composition"].includes(spec.kind) ||
    spec.kind === "bar" && spec.layout === undefined
  ) {
    fieldPairs = allFieldPairs.filter(fieldPair => ["mean", "median", "sum"].every(aggregate => {
      const values = summaryView({ dataset, fieldPair, aggregate }).rows.map(row => row.value);
      return values.some(value => value !== 0) && new Set(values).size >= 2;
    }));
  }
  if (fieldPairs.length === 0) return undefined;
  const fields = {
    fieldPair: fieldPairs
  };
  const palettes = palettesFor(spec);
  const titled = { ...fields, titleAlign: ["left", "center", "right"] };
  const summarized = { ...titled, aggregate: ["mean", "median", "sum"] };
  const colored = { ...titled, palette: palettes, legendPosition: LEGEND_POSITIONS };
  const summarizedColor = {
    ...summarized,
    palette: palettes,
    legendPosition: LEGEND_POSITIONS
  };
  if (["point", "summary-point"].includes(spec.kind)) return {
    ...(spec.kind === "summary-point" ? summarizedColor : colored),
    shape: ["circle", "diamond", "triangle-up", "square"],
    opacity: [0.48, 0.7, 0.9],
    ...(["bubble", "encoded"].includes(spec.variant) ? {} : { radius: [2.5, 4, 6] })
  };
  if (spec.kind === "bar") return {
    ...colored,
    ...(["stack", "fill"].includes(spec.layout)
      ? {}
      : { aggregate: ["mean", "median", "sum"] }),
    opacity: [0.58, 0.78, 0.94]
  };
  if (spec.kind === "histogram") return {
    ...(spec.variant === "plain" || spec.variant === "fine" ? titled : colored),
    ...(spec.variant === "fine" ? {} : { maxBins: [8, 12, 18] }),
    nice: [false, true]
  };
  if (spec.kind === "box") return {
    ...colored,
    ...(spec.minmax ? {} : { whisker: [1, 1.5, 2], outliers: [false, true] }),
    width: [0.45, 0.68, 0.82]
  };
  if (spec.kind === "density") return {
    ...colored,
    ...(["triangular", "edit"].includes(spec.variant)
      ? {}
      : { kernel: ["gaussian", "epanechnikov", "triangular"] }),
    steps: [32, 48, 64], bandwidthRatio: [0.2, 0.5, 0.9],
    opacity: [0.28, 0.48, 0.68]
  };
  if (["line", "area"].includes(spec.kind)) return {
    ...summarizedColor, opacity: [0.5, 0.72, 0.92], reverse: [false, true],
    ...(spec.kind === "line" ? { strokeWidth: [1.5, 2.5, 4] } : {})
  };
  if (spec.kind === "arc") return {
    ...summarizedColor, opacity: [0.55, 0.78, 1],
    ...(spec.padded ? { padRatio: [0.05, 0.12, 0.2] } : {})
  };
  if (spec.kind === "heatmap") return { ...colored };
  if (spec.kind === "interval") return {
    ...titled, ...(spec.longCaps ? {} : { capSize: [4, 8, 14] }),
    strokeWidth: [1, 1.8, 3]
  };
  if (spec.kind === "labels") return {
    ...summarized, fontSize: [10, 12, 15], fontWeight: ["normal", 600, 800],
    ...(spec.variant === "layout" ? {
      labelAxis: ["x", "y", "both"], labelPadding: [1, 3, 6],
      maxDisplacement: [16, 36, 72]
    } : {})
  };
  if (spec.kind === "facet") return {
    ...titled, palette: palettes, opacity: [0.48, 0.7, 0.9], columns: [2, 3, 4],
    gap: [8, 16, 28], padding: [4, 10, 18], facetScales: ["shared", "independent"],
    facetAxes: ["each", "outer"]
  };
  return {
    ...fields, aggregate: ["mean", "median", "sum"], gap: [8, 16, 28],
    padding: [4, 10, 18],
    compositionDirection: ["horizontal", "vertical"],
    compositionAlign: ["start", "center", "end"]
  };
}

function activeFeatures(spec, factors) {
  const features = [
    `feature:${spec.family}`
  ];
  if (["facet", "composition"].includes(spec.kind)) features.push("lifecycle:compose");
  if (spec.variant?.includes("jitter")) features.push("feature:jitter", "lifecycle:edit");
  if (spec.variant === "edit") features.push("lifecycle:edit");
  return Object.freeze(features);
}

function directTraceHas(program, operation, expectedArgs = {}) {
  return (program.trace?.children ?? []).some(node =>
    node.op === operation && Object.entries(expectedArgs).every(([key, value]) =>
      Object.is(node.args?.[key], value)
    )
  );
}

function nonemptyGraphic(program, ids, types) {
  return Object.entries(program.graphicSpec?.objects ?? {}).some(([id, object]) =>
    (ids.length === 0 || ids.includes(id) || ids.some(candidate => id.endsWith(candidate))) &&
    types.includes(object.type) &&
    (Array.isArray(object.items) ? object.items.length > 0 : true)
  );
}

function semanticLayer(program, id, mark) {
  return (program.semanticSpec?.layers ?? []).some(layer =>
    layer.id === id && layer.mark?.type === mark
  );
}

function observesPrimaryRecipeEffect(spec, program, factors) {
  const expectation = {
    point: {
      operation: "createPointMark",
      id: "points",
      mark: "point",
      graphics: ["circle", "path", "rect", "collection"]
    },
    "summary-point": {
      operation: "createPointMark",
      id: "points",
      mark: "point",
      graphics: ["circle", "path", "rect", "collection"]
    },
    bar: { operation: "createBarMark", id: "bars", mark: "bar", graphics: ["rect"] },
    histogram: { operation: "createHistogram", id: "histogram", mark: "bar", graphics: ["rect"] },
    box: { operation: "createBoxPlot", id: "boxes", mark: "bar", graphics: ["rect"] },
    density: { operation: "encodeDensity", id: "density", mark: "area", graphics: ["path"] },
    line: { operation: "createLineMark", id: "rankPath", mark: "line", graphics: ["path"] },
    area: { operation: "createAreaMark", id: "rankPath", mark: "area", graphics: ["path"] },
    arc: { operation: "createArcMark", id: "arcs", mark: "arc", graphics: ["path"] },
    heatmap: { operation: "createHeatmap", id: "cells", mark: "rect", graphics: ["rect"] },
    interval: { operation: "createErrorBar", id: "intervals", mark: "rule", graphics: ["line"] },
    labels: { operation: "createTextMark", id: "labels", mark: "text", graphics: ["text"] },
    facet: {
      operation: "facet",
      id: "facetPoints",
      mark: "point",
      graphicIds: [],
      graphics: ["circle", "path"]
    }
  }[spec.kind];
  if (spec.kind === "composition") {
    const operation = factors.compositionDirection === "horizontal" ? "hconcat" : "vconcat";
    const summary = program.children?.summary;
    const distribution = program.children?.distribution;
    return directTraceHas(program, operation, { id: "realisticDashboard" }) &&
      semanticLayer(summary, "miniBars", "bar") &&
      semanticLayer(distribution, "miniPoints", "point") &&
      nonemptyGraphic(summary, ["miniBars"], ["rect"]) &&
      nonemptyGraphic(distribution, ["miniPoints"], ["circle", "path"]) &&
      summary.semanticSpec.title.text === distribution.semanticSpec.title.text;
  }
  const actionArgs = expectation.operation.startsWith("encode")
    ? { target: expectation.id }
    : expectation.operation === "facet"
      ? {}
      : { id: expectation.id };
  return directTraceHas(program, expectation.operation, actionArgs) &&
    semanticLayer(program, expectation.id, expectation.mark) &&
    nonemptyGraphic(program, expectation.graphicIds ?? [expectation.id], expectation.graphics);
}

function observeFeatures(spec, program, factors) {
  const features = [];
  const primaryEffect = observesPrimaryRecipeEffect(spec, program, factors);
  if (primaryEffect) features.push(`feature:${spec.family}`);
  if (
    primaryEffect && ["facet", "composition"].includes(spec.kind)
  ) features.push("lifecycle:compose");
  if (
    primaryEffect && spec.variant?.includes("jitter") &&
    directTraceHas(program, "jitterPoints", { target: "points" })
  ) {
    features.push("feature:jitter", "lifecycle:edit");
  }
  if (
    primaryEffect && spec.variant === "edit" &&
    directTraceHas(program, "editDensity", { target: "density" })
  ) {
    features.push("lifecycle:edit");
  }
  return Object.freeze(features);
}

function directNode(program, operation, target) {
  return (program.trace?.children ?? []).find(node =>
    node.op === operation && (
      target === undefined || node.args?.target === target || node.args?.id === target
    )
  );
}

function sameNumber(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) &&
    Math.abs(left - right) <= Math.max(1, Math.abs(right)) * 1e-10;
}

function arcLegendHasFinalPosition(program, position, categoryCount) {
  const canvasArgs = directNode(program, "createCanvas")?.args;
  const labels = program.graphicSpec?.objects?.colorLegendLabels?.items;
  if (canvasArgs === undefined || labels?.length !== categoryCount) return false;
  const plot = {
    top: canvasArgs.margin.top,
    right: canvasArgs.width - canvasArgs.margin.right,
    bottom: canvasArgs.height - canvasArgs.margin.bottom,
    left: canvasArgs.margin.left
  };
  return labels.every(({ properties }) => {
    if (position === "top") return properties.y < plot.top;
    if (position === "right") return properties.x > plot.right;
    if (position === "bottom") return properties.y > plot.bottom;
    return position === "left" && properties.x < plot.left;
  });
}

function factorEvidence(spec, program, factors, resolution, name) {
  const value = factors[name];
  const { view } = resolution;
  const node = (operation, target) => directNode(program, operation, target)?.args;
  if (name === "fieldPair") {
    const roles = realisticDatasetRoles(factors.dataset);
    const bindings = view.provenance.fieldBindings;
    const countLayout = spec.kind === "bar" && ["stack", "fill"].includes(spec.layout);
    return (countLayout || bindings.measure === roles.measures[value.measureIndex]) &&
      bindings.dimension === roles.dimensions[value.dimensionIndex]
      ? "provenance.fieldBindings"
      : undefined;
  }
  if (name === "titleAlign") {
    const titleNodes = spec.kind === "composition"
      ? Object.values(program.children ?? {}).map(child => directNode(child, "createTitle")?.args)
      : [node("createTitle")];
    return titleNodes.length > 0 && titleNodes.every(args => args?.align === value)
      ? "trace.createTitle.align"
      : undefined;
  }
  if (name === "aggregate") {
    return view.aggregate === aggregateValue(value) && view.provenance.transformations.some(item =>
      item.aggregate === aggregateValue(value)
    ) ? "view.aggregate+provenance.transformations" : undefined;
  }
  if (name === "palette") {
    const args = [
      node("encodeColor", "points"), node("encodeColor", "bars"),
      node("encodeColor", "boxes"), node("encodeColor", "density"),
      node("encodeColor", "rankPath"), node("encodeColor", "arcs"),
      node("encodeColor", "facetPoints"),
      node("createHistogram"), node("createHeatmap")
    ].filter(Boolean);
    return args.some(item =>
      item.scale?.palette === value || item.color?.scale?.palette === value
    ) ? "trace.color.scale.palette" : undefined;
  }
  if (name === "legendPosition") {
    const args = node("createGuides");
    const finalArcPosition = spec.kind !== "arc" ||
      arcLegendHasFinalPosition(program, value, view.rows.length);
    return args?.legend?.position === value && finalArcPosition
      ? spec.kind === "arc"
        ? "trace.createGuides.legend.position+final-graphic:colorLegendLabels.position"
        : "trace.createGuides.legend.position"
      : undefined;
  }
  if (name === "shape") {
    return node("createPointMark", "points")?.shape === value
      ? "trace.createPointMark.shape"
      : undefined;
  }
  if (name === "opacity") {
    const args = [
      node("createPointMark", "points"), node("createPointMark", "facetPoints"),
      node("createBarMark", "bars"), node("createAreaMark", "density"),
      node("createLineMark", "rankPath"), node("createAreaMark", "rankPath"),
      node("createArcMark", "arcs")
    ].filter(Boolean);
    return args.some(item => item.opacity === value)
      ? "trace.createMark.opacity"
      : undefined;
  }
  if (name === "radius") {
    return node("encodePointRadius", "points")?.value === value
      ? "trace.encodePointRadius.value"
      : undefined;
  }
  if (name === "maxBins") {
    return node("createHistogram")?.maxBins === value
      ? "trace.createHistogram.maxBins"
      : undefined;
  }
  if (name === "nice") {
    return node("createHistogram")?.xScale?.nice === value
      ? "trace.createHistogram.xScale.nice"
      : undefined;
  }
  if (name === "whisker") {
    return node("createBoxPlot")?.whisker?.factor === value
      ? "trace.createBoxPlot.whisker.factor"
      : undefined;
  }
  if (name === "outliers") {
    return node("createBoxPlot")?.outliers === value
      ? "trace.createBoxPlot.outliers"
      : undefined;
  }
  if (name === "width") {
    return node("createBoxPlot")?.width?.band === value
      ? "trace.createBoxPlot.width.band"
      : undefined;
  }
  if (name === "kernel") {
    return node("encodeDensity", "density")?.kernel === value
      ? "trace.encodeDensity.kernel"
      : undefined;
  }
  if (name === "steps") {
    return node("encodeDensity", "density")?.steps === value
      ? "trace.encodeDensity.steps"
      : undefined;
  }
  if (name === "bandwidthRatio") {
    const ordered = view.rows.map(row => row.value).sort((left, right) => left - right);
    const at = probability => ordered[Math.round((ordered.length - 1) * probability)];
    const spread = at(0.75) - at(0.25) || ordered.at(-1) - ordered[0];
    const expected = Math.max(Number.MIN_VALUE, spread * value);
    return sameNumber(node("encodeDensity", "density")?.bandwidth, expected)
      ? "trace.encodeDensity.bandwidth-derived-from-iqr"
      : undefined;
  }
  if (name === "reverse") {
    return node("encodeX", "rankPath")?.scale?.reverse === value
      ? "trace.encodeX.scale.reverse"
      : undefined;
  }
  if (name === "strokeWidth") {
    const observed = node("editLineMark", "rankPath")?.strokeWidth ??
      node("createErrorBar")?.strokeWidth;
    return observed === value ? "trace.strokeWidth" : undefined;
  }
  if (name === "padRatio") {
    const expected = Math.min(...view.rows.map(row => row.share * 360)) * value;
    return sameNumber(node("createArcMark", "arcs")?.padAngle, expected)
      ? "trace.createArcMark.padAngle-derived-from-share"
      : undefined;
  }
  if (name === "capSize") {
    return node("createErrorBar")?.capSize === value
      ? "trace.createErrorBar.capSize"
      : undefined;
  }
  if (name === "fontSize" || name === "fontWeight") {
    return node("createTextMark", "labels")?.[name] === value
      ? `trace.createTextMark.${name}`
      : undefined;
  }
  if (["labelAxis", "labelPadding", "maxDisplacement"].includes(name)) {
    const key = { labelAxis: "axis", labelPadding: "padding", maxDisplacement: "maxDisplacement" }[name];
    return node("layoutLabels", "labels")?.[key] === value
      ? `trace.layoutLabels.${key}`
      : undefined;
  }
  if (
    spec.kind === "facet" &&
    ["columns", "gap", "padding", "facetScales", "facetAxes"].includes(name)
  ) {
    const args = node("facet");
    const canvas = name === "columns"
      ? facetCanvas(value, facetGuideLayout(view, factors))
      : undefined;
    const children = name === "columns" ? Object.values(program.children ?? {}) : [];
    const finalFacet = program.compositionSpec?.facet;
    const observed = name === "columns"
      ? args?.columns === value && node("createCanvas")?.width === canvas.width &&
        program.compositionSpec?.columns === Math.min(value, children.length) &&
        children.length > 0 && children.every(child =>
          child.resolvedScales.x?.range?.at(-1) === canvas.width - canvas.margin.right
        )
      : name === "facetScales"
      ? args?.scales?.x === value && args?.scales?.y === value &&
        finalFacet?.scales?.x === value && finalFacet?.scales?.y === value
      : name === "facetAxes"
        ? args?.guides?.axes === value && finalFacet?.guides?.axes === value
        : args?.[name] === value;
    return observed
      ? name === "columns"
        ? "final-semantic-or-graphic:facet.columns+canvas.width+composition+child-x-range"
        : name === "facetScales"
          ? "trace.facet.scales+final-semantic:composition.facet.scales"
          : name === "facetAxes"
            ? "trace.facet.guides.axes+final-semantic:composition.facet.guides.axes"
        : `trace.facet.${name}`
      : undefined;
  }
  if (name === "compositionDirection") {
    return directTraceHas(program, value === "horizontal" ? "hconcat" : "vconcat", {
      id: "realisticDashboard"
    }) ? "trace.composition.direction" : undefined;
  }
  if (["compositionAlign", "gap", "padding"].includes(name) && spec.kind === "composition") {
    const args = node(factors.compositionDirection === "horizontal" ? "hconcat" : "vconcat");
    const key = name === "compositionAlign" ? "align" : name;
    return args?.[key] === value ? `trace.composition.${key}` : undefined;
  }
  return undefined;
}

function observeFactorEffects(spec, program, factors, resolution) {
  return Object.freeze(Object.keys(factors)
    .filter(name => name !== "dataset")
    .flatMap(name => {
      const evidence = factorEvidence(spec, program, factors, resolution, name);
      return evidence === undefined
        ? []
        : [Object.freeze({ factor: name, value: factors[name], evidence })];
    }));
}

function makeRecipe(spec, complexity) {
  const datasets = realisticDatasetIds();
  let cachedDefaultFactors;
  const defaultFactors = () => {
    if (cachedDefaultFactors === undefined) {
      cachedDefaultFactors = Object.freeze(factorsFor(spec, datasets[0]));
    }
    return cachedDefaultFactors;
  };
  let cachedFactors;
  let cachedResolution;
  const resolve = values => {
    if (cachedFactors === values) return cachedResolution;
    const resolution = resolveAnalysis(spec, values);
    cachedFactors = values;
    cachedResolution = resolution;
    return resolution;
  };
  return Object.freeze({
    id: `realistic-${spec.id}`,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity,
    enforceFactorEffects: true,
    get factors() {
      return defaultFactors();
    },
    ...(spec.kind === "facet"
      ? { coverageSchedule: FACET_AXES_COVERAGE_SCHEDULE }
      : {}),
    datasets,
    factorsForDataset(dataset) {
      const value = factorsFor(spec, dataset);
      return value === undefined ? undefined : Object.freeze(value);
    },
    build: values => buildRecipe(spec, values, resolve(values)),
    observe: (program, values) => observeFeatures(spec, program, values),
    observeFactors: (program, values) =>
      observeFactorEffects(spec, program, values, resolve(values)),
    releaseResolution(values) {
      if (cachedFactors !== values) return;
      cachedFactors = undefined;
      cachedResolution = undefined;
    },
    describe(values) {
      const { view, context } = resolve(values);
      return Object.freeze({
        corpus: "tidytuesday",
        chartFamily: spec.family,
        complexity,
        sourceDatasetIds: Object.freeze([values.dataset]),
        title: context.title,
        analysisQuestion: context.analysisQuestion,
        sourceFields: context.sourceFields,
        ...(view.sample === undefined ? {} : { sampling: view.sample }),
        provenance: view.provenance,
        dataOperations: Object.freeze(view.provenance.transformations.map(item => item.op)),
        activeFeatures: activeFeatures(spec, values)
      });
    }
  });
}

export const REALISTIC_ANALYSIS_RECIPES = Object.freeze([
  ...SIMPLE_SPECS.map(spec => makeRecipe(spec, "simple")),
  ...INTERMEDIATE_SPECS.map(spec => makeRecipe(spec, "intermediate")),
  ...ADVANCED_SPECS.map(spec => makeRecipe(spec, "advanced")),
  ...COMPOSITE_SPECS.map(spec => makeRecipe(spec, "composite"))
]);

export const REALISTIC_ANALYSIS_COUNTS = Object.freeze({
  simple: SIMPLE_SPECS.length,
  intermediate: INTERMEDIATE_SPECS.length,
  advanced: ADVANCED_SPECS.length,
  composite: COMPOSITE_SPECS.length
});

export const REALISTIC_ANALYSIS_REQUIRED_FEATURES = Object.freeze([...new Set([
  ...[
    ...SIMPLE_SPECS,
    ...INTERMEDIATE_SPECS,
    ...ADVANCED_SPECS,
    ...COMPOSITE_SPECS
  ].map(spec => `feature:${spec.family}`),
  "feature:jitter",
  "lifecycle:compose",
  "lifecycle:edit"
])].sort());
