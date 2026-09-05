import { chart } from "../../../src/index.js";
import { measureTextWidth } from "../../../src/core/textMetrics.js";

import {
  isRealisticIneligibleDataError,
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticDatasetSupports,
  realisticLifecycleRows,
  realisticRecordView,
  realisticSourceFields
} from "./realistic-data.js";
import {
  REALISTIC_GUIDE_SCALE_RECIPES,
  realisticGuideScaleWitnessFactors
} from "./realistic-guide-scale-recipes.js";

const PROFILES = Object.freeze([Object.freeze({ id: "maximal" })]);
const REQUIRED_REPETITIONS = 5;
const DASHES = Object.freeze(["solid", "dashed", "dotted", "dashdot"]);
const CURVES = Object.freeze([
  "linear", "step", "step-before", "step-after", "basis", "cardinal",
  "monotone", "natural"
]);
const KERNELS = Object.freeze(["epanechnikov", "gaussian", "triangular", "uniform"]);
const NORMALIZATIONS = Object.freeze(["unit", "count"]);
const FACET_LEGEND_SAFETY_GUTTER = 12;
const CARTESIAN_GUIDE_CANVAS = Object.freeze({
  width: 1_600,
  height: 1_000,
  margin: Object.freeze({ top: 180, right: 460, bottom: 150, left: 260 })
});
const CARTESIAN_GUIDE_SIZE_RANGE = Object.freeze([154, 616]);
const CARTESIAN_GUIDE_WITNESS_RADIUS = 6;
const DEFAULT_ANALYSIS_QUESTION =
  "Direct lifecycle options are exercised against one truthful TidyTuesday projection.";
const REGRESSION_ANALYSIS_QUESTION =
  "How does the selected measure vary across stable source-record order within full-source-supported groups?";
const STATISTICAL_ANALYSIS_QUESTION =
  "How do interval estimates and distribution shapes vary across source time and observed categories?";
const DERIVED_ENCODING_ANALYSIS_QUESTION =
  "How do overall temporal horizon patterns, histograms, and category densities describe the selected measure?";
const REMOVAL_ANALYSIS_QUESTION =
  "How does the selected measure vary across stable selected source-record order and authentic source categories?";
const SELECTOR_CHANNELS = Object.freeze([
  "x", "y", "x2", "y2", "xOffset", "yOffset", "theta", "radius",
  "color", "strokeDash", "size", "shape", "group", "opacity"
]);
const REMOVE_CHANNELS = Object.freeze([
  "color", "group", "opacity", "radius", "size", "strokeDash", "strokeWidth",
  "text", "theta", "x", "x2", "xOffset", "y", "y2", "yOffset"
]);
const GRAPHIC_PROPERTIES = Object.freeze([
  "fill", "height", "opacity", "radius", "stroke", "strokeWidth", "width",
  "x", "x1", "x2", "y", "y1", "y2"
]);
const SELECTOR_OPERATORS = Object.freeze([
  "eq", "neq", "gt", "gte", "lt", "lte", "oneOf", "range", "min", "max"
]);
const POINT_SHAPES = Object.freeze([
  "circle", "cross", "diamond", "hexagon", "plus", "square", "star",
  "triangle-down", "triangle-left", "triangle-right", "triangle-up", "wye"
]);
const DATASETS = Object.freeze(realisticDatasetIds());
const EXCLUDED_FACADE_ACTIONS = Object.freeze([
  "createScatterPlot", "createBarPlot", "createLinePlot", "createParallelCoordinates",
  "createViolinPlot", "createBoxPlot", "createGradientPlot", "createHeatmap",
  "createHistogram"
]);
const EXCLUDED_ENCODING_ACTIONS = Object.freeze([
  "encodeX", "encodeY", "encodeXRange", "encodeYRange", "encodeX2", "encodeY2",
  "encodeXOffset", "encodeYOffset", "encodeColor", "encodeOpacity", "encodeSize",
  "encodeShape", "encodeStrokeWidth", "encodeStrokeDash", "encodeTheta", "encodeR",
  "encodeAngle", "encodeText"
]);
const ASSIGNED_LITERAL_FAMILIES = Object.freeze([
  "literal-3442700b9eeb",
  "literal-6371c9690063",
  "MarkGraphicProperty-fd2942b95187",
  "literal-dfcfe8a02b6b"
]);
const REPLAY_CORRECTED_NESTED_REQUIREMENTS = Object.freeze([
  "option-path:createAxes.y.ticksAndLabels.labels.format.decimals",
  "option-path:createGrid.horizontal.count",
  "option-path:createGrid.vertical.count",
  "option-path:createGuides.axes.y.ticksAndLabels.labels.format.decimals",
  "option-path:createGuides.grid.horizontal.count",
  "option-path:createGuides.grid.vertical.count",
  "option-path:createXAxis.ticksAndLabels.count",
  "option-path:createYAxis.ticksAndLabels.count",
  "option-path:createYAxis.ticksAndLabels.labels.format.decimals",
  "option-path:createYAxisTicksAndLabels.labels.format.decimals",
  "option-path:editYAxis.ticksAndLabels.labels.format.decimals",
  "option-path:editYAxisTicksAndLabels.labels.format.decimals"
]);
const REPLAY_GUIDE_ACTIONS = Object.freeze([
  "createAxes", "createGrid", "createGuides", "createXAxis", "createYAxis",
  "createXAxisTicksAndLabels", "createYAxisTicksAndLabels", "editYAxis",
  "editYAxisTicksAndLabels", "createXAxisLabels", "createXAxisLine",
  "createXAxisTicks", "createXAxisTitle", "createYAxisLabels", "createYAxisLine",
  "createYAxisTicks", "createYAxisTitle", "editXAxis", "editXAxisLabels",
  "editXAxisLine", "editXAxisTicks", "editXAxisTicksAndLabels", "editXAxisTitle",
  "editYAxisLabels", "editYAxisLine", "editYAxisTicks", "editYAxisTitle",
  "createLegend", "editLegend", "editLegendLayout", "editLegendTitle",
  "editLegendBorder", "createTitle", "editTitle", "createThetaAxis",
  "createRadialAxis", "editThetaAxis", "editRadialAxis"
]);
const REPLAY_UNCORRECTED_GUIDE_LITERALS = Object.freeze([
  "option-value:createAxes.radius=boolean:false",
  "option-value:createAxes.theta=boolean:false",
  "option-value:createGuides.axes.coordinate.type=string:parallel",
  "option-value:createGuides.axes.x=boolean:false"
]);

function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function canvas() {
  return {
    width: 2_800,
    height: 1_600,
    background: "#ffffff",
    margin: { top: 430, right: 760, bottom: 430, left: 650 }
  };
}

function regressionLifecycleView(dataset) {
  const roles = realisticDatasetRoles(dataset);
  const dimensionOrder = [
    ...(roles.dimensions.length > 1 ? [1] : []),
    0,
    ...roles.dimensions.slice(2).map((_, index) => index + 2)
  ];
  const candidates = dimensionOrder.flatMap((dimensionIndex, priority) => {
    try {
      const records = realisticRecordView(dataset, {
        dimensionIndex,
        includeSecondaryDimension: false,
        deriveSubgroup: false,
        minimumPerGroup: 4,
        minimumRetainedGroupRows: 4,
        requireRetainedGroupVariation: true
      });
      const sampledGroups = new Map();
      for (const row of records.rows) {
        const label = String(row.category);
        const values = sampledGroups.get(label) ?? [];
        values.push(row.value);
        sampledGroups.set(label, values);
      }
      if ([...sampledGroups.values()].some(values =>
        values.length < 4 || new Set(values).size < 2
      )) return [];
      return [{ records, priority }];
    } catch (error) {
      if (!isRealisticIneligibleDataError(error)) throw error;
      return [];
    }
  }).sort((left, right) =>
    right.records.sample.eligibleRowCount - left.records.sample.eligibleRowCount ||
    right.records.rows.length - left.records.rows.length ||
    left.priority - right.priority
  );
  let records;
  let groupProjection;
  if (candidates.length > 0) {
    records = candidates[0].records;
    groupProjection = {
      id: "source-dimension",
      field: records.provenance.fieldBindings.dimension,
      value(row) {
        return String(row.category);
      }
    };
  } else {
    records = realisticRecordView(dataset, {
      includeSecondaryDimension: false,
      deriveSubgroup: false,
      groupLimit: 160,
      minimumPerGroup: 1
    });
    if (records.rows.length < 4 || new Set(records.rows.map(row => row.value)).size < 2) {
      throw new Error(
        `Dataset "${dataset}" has no truthful rows for polynomial regression.`
      );
    }
    groupProjection = {
      id: "all-observations",
      value() {
        return "All observations";
      }
    };
  }
  const rows = records.rows.map((row, index) => ({
    id: row.key,
    x: index + 1,
    y: row.value,
    position: index + 1,
    value: row.value,
    label: row.label,
    sourceGroup: String(row.category),
    series: groupProjection.value(row),
    group: groupProjection.value(row),
    sourceRowIndex: row.sourceRowIndex
  }));
  const retainedGroups = [...new Set(rows.map(row => row.group))];
  const transformations = [
    ...records.provenance.transformations,
    freeze({
      op: "polynomial-supported-group-projection",
      groupProjection: groupProjection.id,
      ...(groupProjection.field === undefined
        ? { derivedField: "all-observations" }
        : { field: groupProjection.field }),
      selectionBasis: "full-source-before-sample",
      minimumRows: 4,
      minimumDistinctX: 3,
      minimumDistinctY: 2,
      eligibleRowCount: records.sample.eligibleRowCount,
      retainedGroups
    }),
    freeze({
      op: "stable-selected-source-order-rank",
      source: "sourceRowIndex",
      as: "x"
    }),
    freeze({
      op: "project-real-analysis-pair",
      x: "sourceRowIndex",
      y: records.provenance.fieldBindings.measure
    }),
    freeze({ op: "lifecycle-projection", kind: "regression" })
  ];
  return freeze({
    rows,
    sample: {
      ...records.sample,
      displayedRowCount: rows.length,
      outputRowCount: rows.length
    },
    provenance: {
      ...records.provenance,
      transformations
    }
  });
}

function recordOrderLifecycleView(dataset, projectionKind) {
  const records = realisticRecordView(dataset, {
    includeSecondaryDimension: true,
    deriveSubgroup: true
  });
  const selectedRows = [...records.rows].sort((left, right) =>
    left.sourceRowIndex - right.sourceRowIndex
  );
  const minimum = Math.min(...selectedRows.map(row => row.value));
  const maximum = Math.max(...selectedRows.map(row => row.value));
  const span = maximum - minimum || 1;
  const rows = selectedRows.map((row, index) => {
    const sourceGroup = String(row.subgroup ?? row.category);
    return {
      id: row.key,
      x: index + 1,
      y: row.value,
      position: index + 1,
      value: row.value,
      label: row.label,
      category: String(row.category),
      sourceGroup,
      group: sourceGroup,
      series: sourceGroup,
      opacity: (row.value - minimum) / span,
      angle: index * 360 / selectedRows.length,
      sourceRowIndex: row.sourceRowIndex
    };
  });
  return freeze({
    rows,
    sample: {
      ...records.sample,
      displayedRowCount: rows.length,
      outputRowCount: rows.length
    },
    provenance: {
      ...records.provenance,
      transformations: [
        ...records.provenance.transformations,
        freeze({
          op: "stable-selected-source-order-rank",
          source: "sourceRowIndex",
          sort: "ascending",
          as: "x"
        }),
        freeze({
          op: "project-real-analysis-pair",
          x: "sourceRowIndex",
          y: records.provenance.fieldBindings.measure
        }),
        freeze({
          op: "min-max-normalize",
          source: records.provenance.fieldBindings.measure,
          as: "opacity"
        }),
        freeze({
          op: "stable-angle-rank",
          source: "sourceRowIndex",
          as: "angle"
        }),
        freeze({ op: "lifecycle-projection", kind: projectionKind })
      ]
    }
  });
}

function selectionLifecycleView(dataset) {
  try {
    return realisticLifecycleRows(dataset, "style");
  } catch (error) {
    if (!isRealisticIneligibleDataError(error)) throw error;
    return recordOrderLifecycleView(dataset, "selection");
  }
}

function extendedView(dataset, kind, {
  derivedEncodingProjection = false,
  removalProjection = false,
  selectionProjection = false,
  singleSeriesProjection = false,
  statisticalProjection = false
} = {}) {
  const base = kind === "regression"
    ? regressionLifecycleView(dataset)
    : removalProjection
      ? recordOrderLifecycleView(dataset, "removal")
      : selectionProjection
        ? selectionLifecycleView(dataset)
        : realisticLifecycleRows(dataset, kind);
  const singleSeriesValue = singleSeriesProjection
    ? "All observations"
    : undefined;
  const selectionSeriesValue = selectionProjection
    ? "All observations"
    : undefined;
  const rows = base.rows.map((row, index) => {
    const first = Number.isFinite(row.x)
      ? row.x
      : Number.isFinite(row.position) ? row.position : index + 1;
    const second = Number.isFinite(row.y)
      ? row.y
      : Number.isFinite(row.value) ? row.value : Number.isFinite(row.center) ? row.center : first;
    const positiveX = Math.abs(first) + 1;
    const positiveY = Math.abs(second) + 1;
    const span = Math.max(0.01, positiveY * 0.12);
    return {
      ...row,
      id: row.id ?? `source-${index}`,
      rowOrdinal: index + 1,
      timeUnique: new Date(
        (Number.isFinite(Date.parse(row.time)) ? Date.parse(row.time) : Date.UTC(2000, 0, 1)) + index
      ).toISOString(),
      x: first,
      y: second,
      positiveX,
      positiveY,
      value: Number.isFinite(row.value) ? row.value : second,
      lower: Math.max(Number.MIN_VALUE, positiveY - span),
      center: positiveY,
      upper: positiveY + span,
      baseline: 0,
      position: Number.isFinite(row.position) ? row.position : index + 1,
      positionEnd: (Number.isFinite(row.position) ? row.position : index + 1) + 0.28,
      bucket: index % 3 + 1,
      category: String(row.category ?? row.group ?? `Group ${index % 4}`),
      group: singleSeriesValue ??
        String(row.group ?? row.series ?? row.category ?? `Series ${index % 3}`),
      series: singleSeriesValue ??
        String(row.series ?? row.group ?? row.category ?? `Series ${index % 3}`),
      ...(selectionProjection ? { selectionSeries: selectionSeriesValue } : {}),
      ...(statisticalProjection ? { bandGroup: "All observations" } : {}),
      ...(derivedEncodingProjection ? { horizonGroup: "All observations" } : {}),
      label: String(row.label ?? row.category ?? row.group ?? row.id ?? index + 1),
      size: Math.abs(Number.isFinite(row.size) ? row.size : first) + 1,
      opacity: Number.isFinite(row.opacity) ? Math.max(0, Math.min(1, row.opacity)) : 0.7,
      angle: Number.isFinite(row.angle) ? row.angle : index * 360 / Math.max(1, base.rows.length)
    };
  });
  return freeze({
    rows,
    sample: base.sample,
    provenance: {
      ...base.provenance,
      transformations: [
        ...base.provenance.transformations,
        freeze({
          op: "direct-lifecycle-field-projection",
          purpose: "derive positive, interval, position, label, and grouping witnesses without adding rows",
          sourceRowCount: rows.length
        }),
        ...(singleSeriesProjection
          ? [freeze({
              op: "single-series-projection",
              groupProjection: "all-observations",
              derivedField: "group",
              value: singleSeriesValue,
              purpose: "collapse only derived grouping channels while preserving authentic category labels and rows"
            })]
          : []),
        ...(selectionProjection
          ? [freeze({
              op: "overall-selection-line-cohort-projection",
              groupProjection: "all-observations",
              derivedField: "selectionSeries",
              value: selectionSeriesValue,
              purpose:
                "form one truthful overall source-order line cohort for selection witnesses " +
                "without dropping rows or changing source categories"
            })]
          : []),
        ...(statisticalProjection
          ? [freeze({
              op: "overall-statistical-cohort-projection",
              groupProjection: "all-observations",
              derivedField: "bandGroup",
              value: "All observations",
              purpose: "form one truthful overall bar-and-band cohort without dropping rows or changing source categories"
            })]
          : []),
        ...(derivedEncodingProjection
          ? [freeze({
              op: "overall-horizon-cohort-projection",
              groupProjection: "all-observations",
              derivedField: "horizonGroup",
              value: "All observations",
              purpose: "form one truthful overall horizon cohort without dropping rows or changing source categories"
            })]
          : [])
      ]
    }
  });
}

function scale(type, id, ordinal = 0) {
  const common = {
    id,
    type,
    domain: "auto",
    range: "auto",
    reverse: ordinal % 2 === 1
  };
  if (type === "band") {
    return { ...common, paddingInner: 0.18, paddingOuter: 0.09, align: 0.5 };
  }
  if (type === "point") return { ...common, padding: 0.3, align: 0.5 };
  if (type === "time") return { ...common, nice: ordinal % 2 === 0, clamp: ordinal % 2 === 1 };
  return {
    ...common,
    nice: ordinal % 2 === 0,
    ...(type === "log" ? {} : { zero: ordinal % 3 === 0 }),
    clamp: ordinal % 2 === 1,
    ...(type === "log" ? { base: 2 } : {}),
    ...(type === "pow" ? { exponent: 2 } : {}),
    ...(type === "symlog" ? { constant: 1 } : {})
  };
}

function createBase(dataset, kind, id = "analysisRows", options = {}) {
  const view = extendedView(dataset, kind, options);
  return {
    view,
    program: chart()
      .createCanvas(canvas())
      .createData({ id, values: view.rows })
  };
}

function titleFor(dataset, family) {
  return `${family}: authentic ${dataset} observations`;
}

const TITLE_FAMILY_BY_RECIPE_FAMILY = Object.freeze({
  "direct-lifecycle-data-mark": "Data, mark, and encoding lifecycle coverage",
  "direct-lifecycle-selection": "Selection, filtering, and highlight lifecycle coverage",
  "direct-lifecycle-removal": "Encoding removal lifecycle coverage",
  "direct-lifecycle-statistical": "Statistical interval and distribution lifecycle coverage",
  "direct-lifecycle-derived-encoding": "Horizon, histogram, and density lifecycle coverage",
  "direct-lifecycle-regression": "Regression model and component lifecycle coverage",
  "direct-lifecycle-miscellaneous": "Derived data, ordering, and parallel lifecycle coverage",
  "direct-lifecycle-facet": "Facet and composition layout lifecycle coverage"
});

function finish(program, dataset, family, analysisQuestion = DEFAULT_ANALYSIS_QUESTION) {
  const text = titleFor(dataset, family);
  const options = {
    text,
    subtitle: analysisQuestion,
    align: "left",
    maxWidth: 1_700,
    wrap: "word",
    lineHeight: 28
  };
  return program.titleConfig === undefined
    ? program.createTitle(options)
    : program.editTitle(options);
}

function apply(program, action, options) {
  return program[action](options);
}

function applyMany(program, action, values) {
  let next = program;
  for (const options of values) next = apply(next, action, options);
  return next;
}

function buildDataAndMarkCoverage(factors) {
  const { view, program: initial } = createBase(factors.dataset, "style");
  const first = view.rows[0];
  const xValues = view.rows.map(row => row.positiveX);
  const yValues = view.rows.map(row => row.positiveY);
  const extentX = [Math.min(...xValues), Math.max(...xValues)];
  const extentY = [Math.min(...yValues), Math.max(...yValues)];
  let program = initial.editCanvas({
    height: 1_600,
    margin: { top: 430, right: 760, bottom: 430, left: 650 }
  });

  const predicates = ["eq", "neq", "gt", "gte", "lt", "lte"].map((op, index) => ({
    id: `predicate-${op}`,
    source: "analysisRows",
    field: "positiveX",
    predicate: { op, value: index < 2 ? first.positiveX : extentX[0] }
  }));
  program = applyMany(program, "filterData", [
    ...predicates,
    {
      id: "range-exclusive",
      source: "analysisRows",
      field: "positiveX",
      range: { min: extentX[0], max: extentX[1], inclusive: false }
    },
    {
      id: "directMaterialRows",
      source: "analysisRows",
      field: "rowOrdinal",
      range: { min: 1, max: 12, inclusive: true }
    }
  ]);

  for (const kernel of KERNELS) {
    for (const normalization of NORMALIZATIONS) {
      program = program.createDensityData({
        id: `density-${kernel}-${normalization}`,
        source: "analysisRows",
        field: "positiveX",
        groupBy: "group",
        bandwidth: "auto",
        extent: "auto",
        steps: 32,
        kernel,
        normalization,
        as: ["densityValue", "densityEstimate"]
      });
    }
  }
  program = program.createBin2DData({
    id: "maximalBins",
    source: "analysisRows",
    x: "positiveX",
    y: "positiveY",
    bins: { x: 8, y: 7 },
    extent: { x: extentX, y: extentY },
    includeEmpty: true,
    members: true,
    as: {
      x0: "binX0", x1: "binX1", y0: "binY0", y1: "binY1",
      count: "binCount", members: "binMembers"
    }
  }).editBin2DData({
    target: "maximalBins",
    bins: { x: 7, y: 6 },
    extent: { x: extentX, y: extentY },
    includeEmpty: false,
    members: true,
    as: {
      x0: "editedX0", x1: "editedX1", y0: "editedY0", y1: "editedY1",
      count: "editedCount", members: "editedMembers"
    }
  }).createBin2DData({
    id: "memberlessBins",
    source: "analysisRows",
    x: "positiveX",
    y: "positiveY",
    bins: 6,
    includeEmpty: false,
    members: false
  }).editBin2DData({
    target: "memberlessBins",
    members: true
  }).editBin2DData({
    target: "memberlessBins",
    members: false
  });

  program = program.createPointMark({ id: "encodedPoints", data: "directMaterialRows" })
    .encodeX({ target: "encodedPoints", field: "positiveX", scale: { zero: false } })
    .encodeY({ target: "encodedPoints", field: "positiveY", scale: { zero: false } });

  program = program.createTextMark({
    id: "maximalText", data: "directMaterialRows", text: "label", opacity: 0.9,
    rotation: 0, align: "start", baseline: "top"
  }).encodeX({ target: "maximalText", field: "positiveX", scale: { id: "x" } })
    .encodeY({ target: "maximalText", field: "positiveY", scale: { id: "y" } })
    .encodeText({ target: "maximalText", value: "Observed row", format: "auto" });
  for (const align of ["start", "center", "end", "right"]) {
    for (const baseline of ["alphabetic", "top", "middle", "bottom", "hanging", "ideographic"]) {
      program = program.createTextMark({
        id: `text-${align}-${baseline}`,
        data: "directMaterialRows",
        text: "label",
        align,
        baseline,
        opacity: 0.18
      }).encodeX({
        target: `text-${align}-${baseline}`,
        field: "positiveX",
        scale: { id: "x" }
      }).encodeY({
        target: `text-${align}-${baseline}`,
        field: "positiveY",
        scale: { id: "y" }
      }).encodeText({
        target: `text-${align}-${baseline}`,
        field: "label"
      });
      program = program.editTextMark({
        target: "maximalText", align, baseline, dx: 4, dy: -4,
        fill: "#111827", fontFamily: "sans-serif", fontSize: 12,
        fontWeight: 600, opacity: 0.86, rotation: 0
      });
    }
  }

  program = program
    .createTickMark({ id: "maximalTicks", data: "directMaterialRows", opacity: 0.75, stroke: "#334155", strokeWidth: 1.4 })
    .editTickMark({ target: "maximalTicks", opacity: 0.82, stroke: "#0f172a", strokeWidth: 2 })
    .encodeX({ target: "maximalTicks", field: "positiveX", scale: { id: "x" } })
    .encodeY({ target: "maximalTicks", field: "positiveY", scale: { id: "y" } })
    .createRectMark({ id: "maximalRects", data: "directMaterialRows", fill: "#93c5fd", stroke: "#1e3a8a", strokeWidth: 1, opacity: 0.16 })
    .editRectMark({ target: "maximalRects", fill: "#bfdbfe", stroke: false, opacity: 0.12 })
    .encodeX({ target: "maximalRects", field: "lower", scale: { id: "x" } })
    .encodeX2({ target: "maximalRects", field: "upper" })
    .encodeY({ target: "maximalRects", field: "position", scale: { id: "y" } })
    .encodeY2({ target: "maximalRects", field: "positionEnd" })
    .createRectMark({ id: "strokeFreeRect", data: "directMaterialRows", fill: "#dbeafe", stroke: false, opacity: 0.08 })
    .encodeX({ target: "strokeFreeRect", field: "lower", scale: { id: "x" } })
    .encodeX2({ target: "strokeFreeRect", field: "upper" })
    .encodeY({ target: "strokeFreeRect", field: "position", scale: { id: "y" } })
    .encodeY2({ target: "strokeFreeRect", field: "positionEnd" })
    .createAreaMark({ id: "maximalArea", data: "directMaterialRows", fill: "#bfdbfe", opacity: 0.25 })
    .encodeX({ target: "maximalArea", field: "rowOrdinal", scale: { id: "lifecycle-path-x" } })
    .encodeYRange({
      target: "maximalArea", lower: "baseline", upper: "positiveY", scale: { id: "y" }
    });
  for (const curve of CURVES) {
    program = program.createAreaMark({
      id: `area-${curve}`, data: "directMaterialRows", curve,
      fill: "#dbeafe", opacity: 0.08
    }).encodeX({
      target: `area-${curve}`, field: "rowOrdinal", scale: { id: "lifecycle-path-x" }
    }).encodeYRange({
      target: `area-${curve}`, lower: "baseline", upper: "positiveY", scale: { id: "y" }
    });
    program = program.editAreaMark({
      target: "maximalArea", curve, fill: "#93c5fd", opacity: 0.22,
      stroke: curve === "linear" ? false : "#1d4ed8",
      ...(curve === "linear" ? {} : { strokeWidth: 1 })
    });
  }
  program = program.createLineMark({ id: "maximalLine", data: "directMaterialRows", opacity: 0.6 })
    .encodeX({ target: "maximalLine", field: "rowOrdinal", scale: { id: "lifecycle-path-x" } })
    .encodeY({ target: "maximalLine", field: "positiveY", scale: { id: "y" } });
  program = program.createLineMark({
    id: "closedLifecycleLine", data: "directMaterialRows", curve: "linear",
    closed: true, opacity: 0.1, stroke: "#a78bfa", strokeWidth: 1
  }).editLineMark({
    target: "closedLifecycleLine", curve: "linear", closed: true,
    opacity: 0.12, stroke: "#8b5cf6", strokeWidth: 1
  }).editLineMark({
    target: "closedLifecycleLine", curve: "linear", closed: false,
    opacity: 0.12, stroke: "#8b5cf6", strokeWidth: 1
  }).encodeX({
    target: "closedLifecycleLine", field: "rowOrdinal", scale: { id: "lifecycle-path-x" }
  }).encodeY({
    target: "closedLifecycleLine", field: "positiveY", scale: { id: "y" }
  });
  for (const curve of CURVES) {
    program = program.createLineMark({
      id: `line-${curve}`, data: "directMaterialRows", curve,
      closed: false, opacity: 0.12, stroke: "#8b5cf6", strokeWidth: 1
    }).encodeX({
      target: `line-${curve}`, field: "rowOrdinal", scale: { id: "lifecycle-path-x" }
    }).encodeY({
      target: `line-${curve}`, field: "positiveY", scale: { id: "y" }
    });
    program = program.editLineMark({ target: "maximalLine", curve, closed: false, opacity: 0.65, stroke: "#7c3aed", strokeWidth: 1.5 });
  }
  program = program
    .createBarMark({ id: "maximalBars", data: "directMaterialRows", fill: "#f59e0b", opacity: 0.55 })
    .editBarMark({ target: "maximalBars", fill: "#fbbf24", stroke: false, opacity: 0.6 })
    .encodeX({
      target: "maximalBars", field: "category", fieldType: "nominal",
      scale: { id: "maximal-bar-x", type: "band" }
    })
    .encodeY({
      target: "maximalBars", field: "positiveY", aggregate: "sum",
      scale: { id: "maximal-bar-y", zero: true }
    });

  program = program.createRuleMark({ id: "ranges", data: "directMaterialRows" })
    .encodeXRange({ target: "ranges", lower: "lower", upper: "upper" })
    .encodeYRange({ target: "ranges", lower: "position", upper: "positionEnd" })
    .editRuleMark({ target: "ranges", stroke: "#7c3aed", strokeWidth: 1.5, strokeDash: "dashed", opacity: 0.65 });

  return finish(program, factors.dataset, "Data, mark, and encoding lifecycle coverage");
}

function selectorOptions(kind, value, rows) {
  const first = rows[0];
  if (kind === "channel") {
    return { channel: value, op: "max", count: 1, groupBy: ["group"], ties: "all", grain: "item" };
  }
  if (kind === "property") {
    return { property: value, op: "max", count: 1, groupBy: "group", ties: "first", grain: "item" };
  }
  if (value === "oneOf") return { field: "group", op: value, values: [first.group] };
  if (value === "range") {
    return { field: "positiveX", op: value, min: 0, max: Number.MAX_SAFE_INTEGER, inclusive: false };
  }
  if (value === "min" || value === "max") {
    return { field: "positiveX", op: value, count: 1, groupBy: ["group"], ties: value === "min" ? "first" : "all" };
  }
  return { field: "positiveX", op: value, value: value === "neq" ? -1 : first.positiveX };
}

function buildSelectionCoverage(factors) {
  const { view, program: initial } = createBase(
    factors.dataset,
    "style",
    "analysisRows",
    { selectionProjection: true }
  );
  let program = initial.createPointMark({ id: "selectionPoints", data: "analysisRows" })
    .encodeX({ target: "selectionPoints", field: "positiveX", scale: { zero: false } })
    .encodeY({ target: "selectionPoints", field: "positiveY", scale: { zero: false } })
    .encodeOpacity({ target: "selectionPoints", field: "opacity" })
    .encodeSize({ target: "selectionPoints", field: "size" })
    .encodeShape({ target: "selectionPoints", field: "group" })
    .editPointMark({ target: "selectionPoints", stroke: "#1e3a8a", strokeWidth: 1 });

  const filterVariants = [
    selectorOptions("channel", "x", view.rows),
    selectorOptions("property", "x", view.rows),
    selectorOptions("property", "y", view.rows),
    selectorOptions("operator", "eq", view.rows),
    selectorOptions("operator", "oneOf", view.rows),
    selectorOptions("operator", "range", view.rows),
    selectorOptions("operator", "min", view.rows),
    selectorOptions("operator", "max", view.rows),
    { channel: "y2", op: "max", count: 1, groupBy: "category", ties: "all", grain: "stack" }
  ];
  for (const [index, selector] of filterVariants.entries()) {
    const target = `filter-points-${index}`;
    if (selector.grain === "stack") {
      program = program.createHistogram({
        id: target,
        data: "analysisRows",
        field: "positiveY",
        maxBins: 8,
        xScale: { id: `stack-x-${index}`, type: "linear", zero: false },
        yScale: { id: `stack-y-${index}`, type: "linear", zero: true },
        color: {
          field: "group",
          layout: "stack",
          scale: { id: `stack-color-${index}`, type: "ordinal" }
        },
        guides: false
      });
    } else {
      program = program.createPointMark({ id: target, data: "analysisRows" })
        .encodeX({ target, field: "positiveX", scale: { id: `filter-x-${index}`, zero: false } })
        .encodeY({ target, field: "positiveY", scale: { id: `filter-y-${index}`, zero: false } })
        .encodeColor({ target, field: "group" });
    }
    program = program.filterMarks({ target, ...selector });
  }

  let selectionOrdinal = 0;
  const highlight = (select, target = "selectionPoints", pointStyle = true) => {
    const id = `highlight-${selectionOrdinal++}`;
    program = program.highlightMarks({
      id,
      target,
      select,
      ...(pointStyle
        ? {
            fill: "#fecaca",
            stroke: "#7f1d1d",
            strokeWidth: 1.5,
            shape: POINT_SHAPES[selectionOrdinal % POINT_SHAPES.length],
            size: 1.8,
            offset: { x: 2, y: -2 }
          }
        : { stroke: "#7f1d1d", strokeWidth: 1.5 }),
      opacity: 0.92,
      dimOthers: selectionOrdinal % 2 === 0 ? false : { opacity: 0.2 },
      bringToFront: selectionOrdinal % 2 === 0
    }).removeMarkHighlight({ selection: id });
  };
  for (const [index, channel] of SELECTOR_CHANNELS.entries()) {
    const target = `channel-selection-${channel}`;
    if (["x2", "y2"].includes(channel)) {
      program = program.createRuleMark({ id: target, data: "analysisRows" })
        .encodeX({ target, field: "lower", fieldType: "quantitative", scale: { id: `channel-x-${index}` } })
        .encodeX2({ target, field: "upper", fieldType: "quantitative", scale: { id: `channel-x-${index}` } })
        .encodeY({ target, field: "position", fieldType: "quantitative", scale: { id: `channel-y-${index}` } })
        .encodeY2({ target, field: "positionEnd", fieldType: "quantitative", scale: { id: `channel-y-${index}` } });
    } else if (["xOffset", "yOffset"].includes(channel)) {
      program = program.createBarMark({ id: target, data: "analysisRows" });
      program = channel === "xOffset"
        ? program
            .encodeX({
              target, field: "category", fieldType: "nominal",
              scale: { id: `channel-x-${index}`, type: "band" }
            })
            .encodeY({
              target, field: "positiveY", aggregate: "sum",
              scale: { id: `channel-y-${index}`, type: "linear" }
            })
        : program
            .encodeX({
              target, field: "positiveY", aggregate: "sum",
              scale: { id: `channel-x-${index}`, type: "linear" }
            })
            .encodeY({
              target, field: "category", fieldType: "nominal",
              scale: { id: `channel-y-${index}`, type: "band" }
            });
      program = program.encodeColor({
        target, field: "category", layout: "group",
        scale: { id: `channel-color-${index}`, type: "ordinal" }
      });
      program = channel === "xOffset"
        ? program.encodeXOffset({ target, field: "category" })
        : program.encodeYOffset({ target, field: "category" });
    } else if (["theta", "radius"].includes(channel)) {
      program = program.createPointMark({ id: target, data: "analysisRows" })
        .encodeTheta({ target, field: "angle" })
        .encodeR({ target, field: "positiveY" });
    } else if (["group", "strokeDash", "strokeWidth"].includes(channel)) {
      program = program.createLineMark({ id: target, data: "analysisRows" })
        .encodeX({ target, field: "rowOrdinal", scale: { id: `channel-x-${index}` } })
        .encodeY({ target, field: "positiveY", scale: { id: `channel-y-${index}` } })
        .encodeGroup({ target, field: "selectionSeries" });
      if (channel === "strokeDash") {
        program = program.encodeStrokeDash({ target, field: "selectionSeries" });
      }
    } else {
      program = program.createPointMark({ id: target, data: "analysisRows" })
        .encodeX({ target, field: "positiveX", scale: { id: `channel-x-${index}` } })
        .encodeY({ target, field: "positiveY", scale: { id: `channel-y-${index}` } });
      program = baseEncodingForRemoval(program, target, channel);
    }
    const id = `channel-highlight-${index}`;
    program = program.highlightMarks({
      id,
      target,
      select: selectorOptions("channel", channel, view.rows),
      opacity: 0.9,
      bringToFront: false
    }).removeMarkHighlight({ selection: id });
  }
  program = program.createRectMark({ id: "propertyRect", data: "analysisRows" })
    .encodeX({ target: "propertyRect", field: "lower", scale: { id: "property-x" } })
    .encodeX2({ target: "propertyRect", field: "upper", scale: { id: "property-x" } })
    .encodeY({ target: "propertyRect", field: "position", scale: { id: "property-y" } })
    .encodeY2({ target: "propertyRect", field: "positionEnd", scale: { id: "property-y" } });
  program = program.createRuleMark({ id: "propertyRule", data: "analysisRows" })
    .encodeX({ target: "propertyRule", field: "lower", fieldType: "quantitative", scale: { id: "property-rule-x" } })
    .encodeX2({ target: "propertyRule", field: "upper", fieldType: "quantitative", scale: { id: "property-rule-x" } })
    .encodeY({ target: "propertyRule", field: "position", fieldType: "quantitative", scale: { id: "property-rule-y" } })
    .encodeY2({ target: "propertyRule", field: "positionEnd", fieldType: "quantitative", scale: { id: "property-rule-y" } });
  for (const property of GRAPHIC_PROPERTIES) {
    const target = ["width", "height"].includes(property)
      ? "propertyRect"
      : ["x1", "x2", "y1", "y2"].includes(property)
        ? "propertyRule"
        : "selectionPoints";
    highlight(selectorOptions("property", property, view.rows), target, target === "selectionPoints");
  }
  for (const operator of SELECTOR_OPERATORS) highlight(selectorOptions("operator", operator, view.rows));
  program = program.createLineMark({ id: "selectionLine", data: "analysisRows" })
    .encodeX({ target: "selectionLine", field: "rowOrdinal", scale: { id: "selection-line-x", zero: false } })
    .encodeY({ target: "selectionLine", field: "positiveY", scale: { id: "selection-line-y", zero: false } })
    .encodeGroup({ target: "selectionLine", field: "selectionSeries" });
  for (const [index, strokeDash] of DASHES.entries()) {
    const id = `dash-highlight-${index}`;
    program = program.highlightMarks({
      id,
      target: "selectionLine",
      select: {
        field: "selectionSeries",
        op: "eq",
        value: view.rows[0].selectionSeries
      },
      stroke: "#7f1d1d",
      strokeWidth: 2,
      strokeDash,
      opacity: 0.9,
      bringToFront: false
    }).removeMarkHighlight({ selection: id });
  }
  program = program.selectMarks({
    id: "persisted-selection", target: "selectionPoints",
    field: "positiveX", op: "max", count: 1
  }).highlightMarks({
    selection: "persisted-selection", target: "selectionPoints",
    fill: "#dbeafe", opacity: 0.9,
    offset: { x: -2, y: 2 }, dimOthers: true,
    bringToFront: false
  }).removeMarkHighlight({ selection: "persisted-selection" });
  program = program.highlightMarks({
    id: "inclusive-highlight",
    target: "selectionPoints",
    select: {
      field: "positiveX", op: "range", min: 0,
      max: Number.MAX_SAFE_INTEGER, inclusive: true
    },
    fill: "#bfdbfe",
    opacity: 0.9
  }).removeMarkHighlight({ selection: "inclusive-highlight" });
  const stackTarget = `filter-points-${filterVariants.length - 1}`;
  program = program.highlightMarks({
    id: "stack-highlight",
    target: stackTarget,
    select: {
      grain: "stack", channel: "y2", op: "max",
      count: 1, groupBy: "category", ties: "all"
    },
    fill: "#fde68a",
    opacity: 0.88
  }).removeMarkHighlight({ selection: "stack-highlight" });
  return finish(program, factors.dataset, "Selection, filtering, and highlight lifecycle coverage");
}

function baseEncodingForRemoval(program, target, channel) {
  if (channel === "color") return program.encodeColor({ target, field: "group" });
  if (channel === "group") return program.encodeGroup({ target, field: "group" });
  if (channel === "opacity") return program.encodeOpacity({ target, field: "opacity" });
  if (channel === "radius") return program.encodeR({ target, field: "positiveY" });
  if (channel === "size") return program.encodeSize({ target, field: "size" });
  if (channel === "shape") return program.encodeShape({ target, field: "group" });
  if (channel === "strokeDash") return program.encodeStrokeDash({ target, field: "group" });
  if (channel === "strokeWidth") return program.encodeStrokeWidth({ target, field: "size" });
  if (channel === "text") return program.encodeText({ target, field: "label" });
  if (channel === "theta") return program.encodeTheta({ target, field: "angle" });
  if (channel === "x") return program.encodeX({ target, field: "positiveX" });
  if (channel === "x2") return program.encodeX2({ target, field: "upper", fieldType: "quantitative" });
  if (channel === "xOffset") {
    return program.encodeXOffset({
      target, field: "group", fieldType: "nominal",
      scale: { id: `remove-offset-${channel}`, type: "ordinal", domain: "auto", range: "auto" },
      paddingInner: 0.1, paddingOuter: 0.05
    });
  }
  if (channel === "y") return program.encodeY({ target, field: "positiveY" });
  if (channel === "y2") return program.encodeY2({ target, field: "positionEnd", fieldType: "quantitative" });
  if (channel === "yOffset") {
    return program.encodeYOffset({
      target, field: "group", fieldType: "nominal",
      scale: { id: `remove-offset-${channel}`, type: "ordinal", domain: "auto", range: "auto" },
      paddingInner: 0.1, paddingOuter: 0.05
    });
  }
  throw new Error(`Unknown removal channel ${channel}.`);
}

function buildRemovalCoverage(factors) {
  const { program: initial } = createBase(
    factors.dataset,
    "style",
    "analysisRows",
    { removalProjection: true, singleSeriesProjection: true }
  );
  let program = initial.filterData({
    id: "removalMaterialRows",
    source: "analysisRows",
    field: "rowOrdinal",
    range: { min: 1, max: 12, inclusive: true }
  });
  for (const channel of REMOVE_CHANNELS) {
    const target = `remove-${channel}`;
    if (channel === "text") {
      program = program.createTextMark({ id: target, data: "removalMaterialRows" })
        .encodeX({
          target, field: "positiveX", scale: { id: `remove-base-x-${channel}` }
        })
        .encodeY({
          target, field: "positiveY", scale: { id: `remove-base-y-${channel}` }
        });
    } else if (["x2", "y2"].includes(channel)) {
      program = program.createRuleMark({ id: target, data: "removalMaterialRows" })
        .encodeX({ target, field: "lower", fieldType: "quantitative", scale: { id: `remove-x-${channel}` } })
        .encodeY({ target, field: "position", fieldType: "quantitative", scale: { id: `remove-y-${channel}` } });
    } else if (["group", "strokeDash"].includes(channel)) {
      program = program.createLineMark({ id: target, data: "removalMaterialRows" })
        .encodeX({ target, field: "positiveX", scale: { id: `remove-x-${channel}` } })
        .encodeY({ target, field: "positiveY", scale: { id: `remove-y-${channel}` } });
    } else if (channel === "strokeWidth") {
      program = program.createRuleMark({ id: target, data: "removalMaterialRows" })
        .encodeX({ target, field: "lower", fieldType: "quantitative", scale: { id: `remove-x-${channel}` } })
        .encodeX2({ target, field: "upper", fieldType: "quantitative" })
        .encodeY({ target, field: "position", fieldType: "quantitative", scale: { id: `remove-y-${channel}` } });
    } else if (["xOffset", "yOffset"].includes(channel)) {
      program = program.createBarMark({ id: target, data: "removalMaterialRows" });
      program = channel === "xOffset"
        ? program
            .encodeX({ target, field: "category", fieldType: "nominal", scale: { id: `remove-x-${channel}`, type: "band" } })
            .encodeY({ target, field: "positiveY", aggregate: "mean", stack: null, scale: { id: `remove-y-${channel}` } })
        : program
            .encodeX({ target, field: "positiveY", aggregate: "mean", stack: null, scale: { id: `remove-x-${channel}` } })
            .encodeY({ target, field: "category", fieldType: "nominal", scale: { id: `remove-y-${channel}`, type: "band" } });
    } else {
      program = program.createPointMark({ id: target, data: "removalMaterialRows" });
      if (["theta", "radius"].includes(channel)) {
        program = program
          .encodeR({ target, field: "positiveY", scale: { id: `remove-r-${channel}` } })
          .encodeTheta({ target, field: "angle", scale: { id: `remove-theta-${channel}` } });
      } else {
        program = program
          .encodeX({
            target, field: "positiveX", scale: { id: `remove-base-x-${channel}` }
          })
          .encodeY({
            target, field: "positiveY", scale: { id: `remove-base-y-${channel}` }
          });
      }
    }
    program = baseEncodingForRemoval(program, target, channel)
      .removeEncoding({ target, channel });
    // A lifecycle removal is followed by a source-backed replacement so the
    // final chart retains material geometry while the root trace still proves
    // the public removal transition for every channel.
    program = baseEncodingForRemoval(program, target, channel);
    if (["xOffset", "yOffset"].includes(channel)) {
      program = program
        .encodeColor({ target, field: "group", fieldType: "nominal", layout: "group" })
        .encodeBarWidth({ target, band: 0.72 });
    }
  }
  return finish(
    program,
    factors.dataset,
    "Encoding removal lifecycle coverage",
    REMOVAL_ANALYSIS_QUESTION
  );
}

function categoricalScale(id, type = "band") {
  return type === "point"
    ? { id, type, domain: "auto", range: "auto", padding: 0.28, align: 0.5, reverse: true }
    : {
        id, type: "band", domain: "auto", range: "auto",
        paddingInner: 0.16, paddingOuter: 0.08, align: 0.5, reverse: false
      };
}

function errorAppearance(index) {
  return {
    caps: false,
    capSize: 7,
    stroke: "#7f1d1d",
    strokeWidth: 1.5,
    strokeDash: DASHES[index % DASHES.length],
    opacity: 0.82,
    coordinate: "main",
    data: "analysisRows"
  };
}

export function realisticDirectLifecycleErrorBandFailure(index, error) {
  const rawReason = error instanceof Error ? error.message : String(error);
  const compactReason = rawReason.replace(/\s+/gu, " ").trim();
  const boundedReason = compactReason.length <= 180
    ? compactReason
    : `${compactReason.slice(0, 179)}…`;
  return new Error(
    `Direct lifecycle error-band variant ${index} failed: ${boundedReason}`,
    { cause: error }
  );
}

function buildStatisticalCoverage(factors) {
  const { view, program: initial } = createBase(
    factors.dataset,
    "temporal",
    "analysisRows",
    { statisticalProjection: true }
  );
  let program = initial;
  const quantitativeTypes = ["linear", "log", "pow", "sqrt", "symlog"];
  const intervalVariants = [
    ["mean", "stderr"], ["mean", "stdev"], ["mean", "ci"], ["median", "iqr"]
  ];
  let errorIndex = 0;
  for (const [center, extent] of intervalVariants) {
    const id = `error-x-stat-${errorIndex}`;
    program = program.createErrorBar({
      id,
      ...errorAppearance(errorIndex),
      x: {
        field: "positiveX", center, extent,
        ...(extent === "ci" ? { level: 0.9 } : {}),
        scale: scale("linear", `error-x-${errorIndex}`, errorIndex)
      },
      y: {
        field: "bandGroup", fieldType: errorIndex % 2 === 0 ? "nominal" : "ordinal",
        scale: categoricalScale(`error-y-${errorIndex}`, errorIndex % 2 ? "point" : "band")
      },
      ...(errorIndex === 0 ? { groupBy: "bandGroup" } : {})
    });
    errorIndex += 1;
    program = program.createErrorBar({
      id: `error-y-stat-${errorIndex}`,
      ...errorAppearance(errorIndex),
      x: {
        field: "bandGroup", fieldType: errorIndex % 2 === 0 ? "nominal" : "ordinal",
        scale: categoricalScale(`error-x-position-${errorIndex}`, errorIndex % 2 ? "point" : "band")
      },
      y: {
        field: "positiveY", center, extent,
        ...(extent === "ci" ? { level: 0.92 } : {}),
        scale: scale("linear", `error-y-interval-${errorIndex}`, errorIndex)
      }
    });
    errorIndex += 1;
  }
  for (const [index, type] of quantitativeTypes.entries()) {
    program = program.createErrorBar({
      id: `error-x-scale-${type}`,
      ...errorAppearance(index),
      x: {
        center: "center", lower: "lower", upper: "upper",
        scale: scale(type, `error-x-scale-${type}`, index)
      },
      y: {
        field: "category", fieldType: "ordinal",
        scale: categoricalScale(`error-y-category-${type}`, "point")
      }
    }).createErrorBar({
      id: `error-y-scale-${type}`,
      ...errorAppearance(index + 1),
      x: {
        field: "category", fieldType: "ordinal",
        scale: categoricalScale(`error-x-category-${type}`, "point")
      },
      y: {
        center: "center", lower: "lower", upper: "upper",
        scale: scale(type, `error-y-scale-${type}`, index + 1)
      }
    });
  }
  program = program.createErrorBar({
    id: "error-temporal-x",
    ...errorAppearance(0),
    x: { field: "time", fieldType: "temporal", scale: scale("time", "error-time-x", 0) },
    y: { center: "center", lower: "lower", upper: "upper", scale: scale("linear", "error-time-y", 0) }
  }).createErrorBar({
    id: "error-temporal-y",
    ...errorAppearance(1),
    x: { center: "center", lower: "lower", upper: "upper", scale: scale("linear", "error-time-ix", 0) },
    y: { field: "time", fieldType: "temporal", scale: scale("time", "error-time-position-y", 1) }
  });
  program = program.createPointMark({ id: "error-target-band", data: "analysisRows" })
    .encodeX({
      target: "error-target-band", field: "category", fieldType: "nominal",
      scale: categoricalScale("error-target-band-x", "band")
    })
    .encodeY({
      target: "error-target-band", field: "positiveY", fieldType: "quantitative",
      scale: scale("linear", "error-target-band-y", 0)
    })
    .createErrorBar({
    id: "targeted-error-bar",
    target: "error-target-band",
    ...errorAppearance(2),
    x: {
      field: "category",
      fieldType: "nominal",
      scale: categoricalScale("error-target-band-x", "band")
    },
    y: {
      center: "center", lower: "lower", upper: "upper",
      scale: scale("linear", "error-target-band-y", 0)
    }
  });
  const editableError = "error-x-stat-0";
  for (const [index, [center, extent]] of intervalVariants.entries()) {
    program = program.editErrorBar({
      target: editableError,
      caps: index === intervalVariants.length - 1,
      capSize: 8,
      stroke: "#991b1b",
      strokeWidth: 1.8,
      strokeDash: DASHES[index],
      opacity: 0.88,
      statistics: { center, extent, ...(extent === "ci" ? { level: 0.9 } : {}) }
    });
  }

  let bandIndex = 0;
  const createBand = options => {
    try {
      program = program.createErrorBand({
        id: `error-band-${bandIndex}`,
        data: "analysisRows",
        coordinate: "main",
        groupBy: "bandGroup",
        fill: "#93c5fd",
        opacity: 0.2,
        curve: "linear",
        boundaries: bandIndex === 0
          ? false
          : {
              stroke: "#1d4ed8", strokeWidth: 1,
              strokeDash: DASHES[bandIndex % DASHES.length], opacity: 0.8,
              curve: "linear"
            },
        ...options
      });
    } catch (error) {
      throw realisticDirectLifecycleErrorBandFailure(bandIndex, error);
    }
    bandIndex += 1;
  };
  for (const [index, type] of quantitativeTypes.entries()) {
    createBand({
      x: {
        center: "center", lower: "lower", upper: "upper",
        scale: scale(type, `band-x-${type}`, index)
      },
      y: { field: "positiveY", scale: scale("linear", `band-y-position-${type}`, 0) }
    });
    createBand({
      x: { field: "positiveX", scale: scale("linear", `band-x-position-${type}`, 0) },
      y: {
        center: "center", lower: "lower", upper: "upper",
        scale: scale(type, `band-y-${type}`, index)
      }
    });
  }
  for (const [center, extent] of intervalVariants) {
    createBand({
      x: {
        field: "positiveX", center, extent,
        ...(extent === "ci" ? { level: 0.9 } : {}),
        scale: scale("linear", `band-stat-x-${bandIndex}`, 0)
      },
      y: { field: "bucket", scale: scale("linear", `band-stat-y-${bandIndex}`, 0) },
      groupBy: undefined
    });
    createBand({
      x: { field: "bucket", scale: scale("linear", `band-stat-position-x-${bandIndex}`, 0) },
      y: {
        field: "positiveY", center, extent,
        ...(extent === "ci" ? { level: 0.9 } : {}),
        scale: scale("linear", `band-stat-interval-y-${bandIndex}`, 0)
      },
      groupBy: undefined
    });
  }
  createBand({
    x: { field: "time", fieldType: "temporal", scale: scale("time", "band-time-x", 0) },
    y: { center: "center", lower: "lower", upper: "upper", scale: scale("linear", "band-time-y", 0) }
  });
  createBand({
    x: { center: "center", lower: "lower", upper: "upper", scale: scale("linear", "band-time-position-x", 0) },
    y: { field: "timeUnique", fieldType: "temporal", scale: scale("time", "band-time-y-position", 0) }
  });
  program = program.editErrorBand({
    target: "error-band-0",
    fill: "#bfdbfe",
    opacity: 0.18,
    curve: "linear",
    boundaries: false
  });

  program = program.createBoxPlot({
    id: "boxOwner",
    data: "analysisRows",
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value", fieldType: "quantitative" },
    guides: false
  });
  for (const [index, type] of quantitativeTypes.entries()) {
    program = program.editBoxPlot({
      target: "boxOwner",
      data: "analysisRows",
      x: {
        field: "category", fieldType: index % 2 ? "ordinal" : "nominal",
        scale: categoricalScale(`box-x-category-${index}`, "band")
      },
      y: { field: "positiveY", fieldType: "quantitative", scale: scale(type, `box-y-${type}`, index) },
      whisker: index === 0 ? { type: "minmax" } : { type: "tukey", factor: 1.5 },
      width: { band: 0.68 },
      outliers: index % 2 === 0,
      box: { fill: "#fcd34d", opacity: 0.7, stroke: "#92400e", strokeWidth: 1.2 },
      median: { stroke: "#451a03", strokeWidth: 2 },
      outlier: { shape: "diamond", radius: 3.5, opacity: 0.8 }
    }).editBoxPlot({
      target: "boxOwner",
      data: "analysisRows",
      x: { field: "positiveX", fieldType: "quantitative", scale: scale(type, `box-x-${type}`, index) },
      y: {
        field: "category", fieldType: index % 2 ? "ordinal" : "nominal",
        scale: categoricalScale(`box-y-category-${index}`, "band")
      },
      outliers: index % 2 === 1
    });
  }

  program = program.createGradientPlot({
    id: "gradientOwner",
    data: "analysisRows",
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value", fieldType: "quantitative" },
    guides: false
  });
  let gradientIndex = 0;
  for (const [index, type] of quantitativeTypes.entries()) {
    const density = {
      bandwidth: index % 2 ? "auto" : 1,
      extent: "auto",
      steps: 40,
      kernel: KERNELS[index % KERNELS.length],
      normalization: NORMALIZATIONS[index % NORMALIZATIONS.length]
    };
    program = program.editGradientPlot({
      target: "gradientOwner",
      data: "analysisRows",
      x: {
        field: "category", fieldType: index % 2 ? "ordinal" : "nominal",
        scale: categoricalScale(`gradient-x-category-${index}`, "band")
      },
      y: { field: "positiveY", fieldType: "quantitative", scale: scale(type, `gradient-y-${type}`, index) },
      density,
      width: { band: 0.72 },
      gradient: {
        palette: { name: "viridis", count: 7, extent: [0.08, 0.92] },
        opacity: [0.08, 0.92]
      },
      center: index === 0
        ? false
        : { type: "median", stroke: "#7c2d12", strokeWidth: 1.8 }
    }).editGradientPlot({
      target: "gradientOwner",
      data: "analysisRows",
      x: { field: "positiveX", fieldType: "quantitative", scale: scale(type, `gradient-x-${type}`, index) },
      y: {
        field: "category", fieldType: index % 2 ? "ordinal" : "nominal",
        scale: categoricalScale(`gradient-y-category-${index}`, "band")
      },
      density
    });
    gradientIndex += 1;
  }

  return finish(
    program,
    factors.dataset,
    "Statistical interval and distribution lifecycle coverage",
    STATISTICAL_ANALYSIS_QUESTION
  );
}

function horizonPalette(index, count = 3) {
  return {
    positive: {
      name: ["blues", "greens", "purpleblue"][index % 3],
      count,
      extent: [0.08, 0.92]
    },
    negative: {
      name: ["reds", "oranges", "goldred"][index % 3],
      count,
      extent: [0.1, 0.9]
    }
  };
}

function horizonYScale(id, index) {
  return {
    id,
    type: "linear",
    domain: [0, 1],
    range: "auto",
    clamp: index % 2 === 0,
    reverse: index % 2 === 1
  };
}

function buildDerivedEncodingCoverage(factors) {
  const { view, program: initial } = createBase(
    factors.dataset,
    "temporal",
    "analysisRows",
    { derivedEncodingProjection: true }
  );
  let program = initial;
  const quantitativeTypes = ["linear", "log", "pow", "sqrt", "symlog"];
  const values = view.rows.map(row => row.positiveY).sort((left, right) => left - right);
  const minimum = values[0];
  const maximum = values.at(-1);
  const boundaries = Array.from({ length: 9 }, (_, index) => {
    if (index === 0) return minimum;
    if (index === 8) return maximum;
    return minimum + (maximum - minimum) * index / 8;
  });

  for (const [index, type] of quantitativeTypes.entries()) {
    const target = index === 0 ? "horizonOwner" : `horizon-${type}`;
    program = program.createAreaMark({
      id: target, data: "analysisRows", fill: "#60a5fa", opacity: 0.55
    });
    const common = {
      target,
      source: "analysisRows",
      x: {
        field: "positiveX",
        fieldType: "quantitative",
        scale: scale(type, `horizon-x-${type}`, index)
      },
      y: {
        field: "positiveY",
        fieldType: "quantitative",
        scale: horizonYScale(`horizon-y-${type}`, index)
      },
      groupBy: "horizonGroup",
      bands: 3,
      baseline: 0,
      extent: "auto",
      resolve: index % 2 ? "independent" : "shared",
      missing: index % 2 ? "error" : "break",
      overflow: index % 2 ? "error" : "clip",
      palette: index === quantitativeTypes.length - 1
        ? { positive: "purpleblue", negative: "goldred" }
        : horizonPalette(index)
    };
    program = program.encodeHorizon(common);
  }
  program = program.createAreaMark({
    id: "horizon-time", data: "analysisRows", fill: "#93c5fd", opacity: 0.42
  }).encodeHorizon({
    target: "horizon-time",
    source: "analysisRows",
    x: {
      field: "timeUnique",
      fieldType: "temporal",
      scale: scale("time", "horizon-x-time", 0)
    },
    y: {
      field: "positiveY",
      fieldType: "quantitative",
      scale: horizonYScale("horizon-y-time", 1)
    },
    groupBy: "horizonGroup",
    bands: 3,
    baseline: 0,
    extent: "auto",
    resolve: "shared",
    missing: "break",
    overflow: "clip",
    palette: horizonPalette(2)
  });
  program = program.editHorizon({
    target: "horizonOwner",
    source: "analysisRows",
    x: {
      field: "rowOrdinal",
      fieldType: "quantitative",
      scale: scale("linear", "horizon-x-linear", 0)
    },
    y: {
      field: "positiveY",
      fieldType: "quantitative",
      scale: horizonYScale("horizon-y-linear", 0)
    },
    groupBy: false,
    bands: 3,
    baseline: 0,
    extent: "auto",
    resolve: "shared",
    missing: "break",
    overflow: "clip",
    palette: horizonPalette(0)
  });
  for (const [index, type] of ["log", "pow", "sqrt", "symlog"].entries()) {
    program = program.editHorizon({
      target: "horizonOwner",
      source: "analysisRows",
      x: {
        field: "positiveX",
        fieldType: "quantitative",
        scale: scale(type, "horizon-x-linear", index + 1)
      },
      y: {
        field: "positiveY",
        fieldType: "quantitative",
        scale: horizonYScale("horizon-y-linear", index + 1)
      },
      groupBy: "horizonGroup",
      bands: 3,
      baseline: 0,
      extent: "auto",
      resolve: index % 2 === 0 ? "independent" : "shared",
      missing: index % 2 === 0 ? "error" : "break",
      overflow: index % 2 === 0 ? "error" : "clip",
      palette: horizonPalette(index + 1)
    });
  }
  program = program.editHorizon({
    target: "horizonOwner",
    source: "analysisRows",
    x: {
      field: "timeUnique",
      fieldType: "temporal",
      scale: scale("time", "horizon-x-linear", 1)
    },
    y: {
      field: "positiveY",
      fieldType: "quantitative",
      scale: horizonYScale("horizon-y-linear", 1)
    },
    groupBy: "horizonGroup",
    bands: 3,
    baseline: 0,
    extent: "auto",
    resolve: "independent",
    missing: "error",
    overflow: "error",
    palette: { positive: "purpleblue", negative: "goldred" }
  });

  program = program.createBarMark({ id: "histogramOwner", data: "analysisRows" });
  const histogramTypes = ["log", "linear", "pow", "sqrt", "symlog"];
  for (const [index, type] of histogramTypes.entries()) {
    program = program.encodeHistogram({
      target: "histogramOwner",
      field: "positiveY",
      ...(index === 0
        ? { binBoundaries: boundaries }
        : index === 1
          ? { binStep: Math.max((maximum - minimum) / 12, Number.EPSILON) }
          : { maxBins: 12 }),
      stack: index % 2 ? "normalize" : "zero",
      coordinate: "main",
      xScale: scale(type, `histogram-x-${type}`, index),
      yScale: scale(["linear", "pow", "sqrt", "symlog"][index % 4], `histogram-y-${index}`, index + 1)
    });
  }

  for (const [index, type] of quantitativeTypes.entries()) {
    const target = index === 0 ? "densityOwner" : `densityOwner-${type}`;
    program = program.createAreaMark({
      id: target, data: "analysisRows", fill: "#a78bfa",
      opacity: 0.38, stroke: "#6d28d9", strokeWidth: 1
    });
    program = program.encodeDensity({
      target,
      source: "analysisRows",
      field: "positiveY",
      groupBy: "category",
      bandwidth: "auto",
      extent: "auto",
      steps: 40,
      kernel: KERNELS[index % KERNELS.length],
      normalization: NORMALIZATIONS[index % NORMALIZATIONS.length],
      as: ["densityValue", "densityEstimate"],
      densityChannel: "y",
      coordinate: "main",
      valueScale: scale(type, `density-value-${type}`, index),
      ...(index === quantitativeTypes.length - 1
        ? {
            placement: {
              type: "category", side: "bottom",
              width: { band: 0.7, resolve: "shared" },
              scale: categoricalScale("density-category-vertical", "band")
            }
          }
        : {
            densityScale: {
              ...scale(["linear", "pow", "sqrt", "symlog"][index % 4], `density-height-${index}`, index + 1),
              ...(index === 0 ? { domain: [0, 1], zero: false } : { zero: true })
            },
            placement: { type: "baseline" }
          })
    });
  }
  program = program.createAreaMark({
    id: "density-vertical-top",
    data: "analysisRows",
    fill: "#c4b5fd",
    opacity: 0.28,
    stroke: "#7c3aed",
    strokeWidth: 1
  }).encodeDensity({
    target: "density-vertical-top",
    source: "analysisRows",
    field: "positiveY",
    groupBy: "category",
    bandwidth: "auto",
    extent: "auto",
    steps: 40,
    kernel: "gaussian",
    normalization: "unit",
    as: ["densityValue", "densityEstimate"],
    densityChannel: "y",
    coordinate: "main",
    valueScale: scale("linear", "density-value-top", 0),
    placement: {
      type: "category",
      side: "top",
      width: { band: 0.7, resolve: "shared" },
      scale: categoricalScale("density-category-vertical-top", "band")
    }
  });
  for (const [index, side] of ["left", "both"].entries()) {
    const target = `density-horizontal-${side}`;
    program = program.createAreaMark({
      id: target, data: "analysisRows", fill: "#ddd6fe", opacity: 0.24
    }).encodeDensity({
      target,
      source: "analysisRows",
      field: "positiveY",
      groupBy: "category",
      bandwidth: "auto",
      extent: "auto",
      steps: 36,
      kernel: KERNELS[index],
      normalization: NORMALIZATIONS[index],
      as: ["densityValue", "densityEstimate"],
      densityChannel: "x",
      coordinate: "main",
      valueScale: scale("linear", `density-horizontal-value-${index}`, index),
      placement: {
        type: "category",
        side,
        width: { band: 0.72, resolve: index === 0 ? "shared" : "independent" },
        scale: categoricalScale(`density-horizontal-category-${index}`, "band")
      }
    });
  }
  const placements = [
    { type: "baseline" },
    {
      type: "category", side: "left",
      width: { band: 0.68, resolve: "shared" },
      scale: categoricalScale("density-category-left", "band")
    },
    {
      type: "category", side: "right",
      width: { band: 0.74, resolve: "independent" },
      scale: categoricalScale("density-category-left", "band")
    },
    {
      type: "category", side: "both",
      width: { band: 0.82, resolve: "shared" },
      scale: categoricalScale("density-category-left", "band")
    }
  ];
  for (const [index, placement] of placements.entries()) {
    program = program.editDensity({
      target: "densityOwner",
      source: "analysisRows",
      field: "positiveY",
      groupBy: index === 0 ? false : "category",
      bandwidth: "auto",
      extent: "auto",
      steps: 44,
      kernel: KERNELS[index],
      normalization: NORMALIZATIONS[index % NORMALIZATIONS.length],
      placement
    });
  }
  const verticalPlacements = [
    {
      type: "category", side: "bottom",
      width: { band: 0.66, resolve: "shared" },
      scale: categoricalScale("density-category-vertical", "band")
    },
    {
      type: "category", side: "top",
      width: { band: 0.76, resolve: "independent" },
      scale: categoricalScale("density-category-vertical", "band")
    },
    {
      type: "category", side: "both",
      width: { band: 0.8, resolve: "shared" },
      scale: categoricalScale("density-category-vertical", "band")
    }
  ];
  for (const [index, placement] of verticalPlacements.entries()) {
    program = program.editDensity({
      target: "densityOwner-symlog",
      source: "analysisRows",
      field: "positiveY",
      groupBy: "category",
      bandwidth: "auto",
      extent: "auto",
      steps: 46,
      kernel: KERNELS[index],
      normalization: NORMALIZATIONS[index % NORMALIZATIONS.length],
      placement
    });
  }
  return finish(
    program,
    factors.dataset,
    "Horizon, histogram, and density lifecycle coverage",
    DERIVED_ENCODING_ANALYSIS_QUESTION
  );
}

function addRegressionPoint(program, id, opacity = 0.2) {
  return program.createPointMark({ id, data: "analysisRows", opacity })
    .encodeX({
      target: id, field: "rowOrdinal", fieldType: "quantitative",
      scale: { id: `regression-x-${id}`, type: "linear", nice: true, zero: false }
    })
    .encodeY({
      target: id, field: "positiveY", fieldType: "quantitative",
      scale: { id: `regression-y-${id}`, type: "linear", nice: true, zero: false }
    })
    .encodeColor({
      target: id, field: "group", fieldType: "nominal",
      scale: { id: `regression-color-${id}`, type: "ordinal", palette: "tableau10" }
    });
}

function regressionBandStyle(curve, index) {
  return {
    color: "#bfdbfe",
    opacity: 0.14 + index % 3 * 0.02,
    stroke: "#1d4ed8",
    strokeWidth: 0.8 + index % 2 * 0.2,
    curve
  };
}

function buildRegressionCoverage(factors) {
  const { view, program: initial } = createBase(factors.dataset, "regression");
  let program = initial.createData({ id: "directRows", values: view.rows });
  for (const [index, curve] of CURVES.entries()) {
    const target = index === 0 ? "regressionOwner" : `regression-owner-${curve}`;
    program = addRegressionPoint(program, target, 0.12);
    program = program.createRegression({
      target,
      x: "rowOrdinal",
      y: "positiveY",
      groupBy: "group",
      method: index % 2 === 0 ? "linear" : "polynomial",
      ...(index % 2 === 0 ? {} : { degree: 2 }),
      confidence: 0.9,
      interval: "prediction",
      band: regressionBandStyle(curve, index),
      line: { strokeWidth: 2 + index % 3 * 0.25, curve }
    });
  }
  program = addRegressionPoint(program, "regression-loess", 0.1)
    .createRegression({
      target: "regression-loess",
      x: "rowOrdinal",
      y: "positiveY",
      groupBy: "group",
      method: "loess",
      span: 0.62,
      band: false,
      line: { strokeWidth: 2.2, curve: "linear" }
    });

  for (const [index, curve] of CURVES.entries()) {
    program = program.editRegression({
      target: "regressionOwner",
      data: "analysisRows",
      x: "rowOrdinal",
      y: "positiveY",
      groupBy: "group",
      method: "polynomial",
      degree: 2,
      confidence: 0.88,
      interval: "prediction",
      band: regressionBandStyle(curve, index),
      line: { strokeWidth: 2.4 + index % 2 * 0.2, curve }
    });
  }
  program = program.editRegression({
    target: "regressionOwner",
    data: "analysisRows",
    x: "rowOrdinal",
    y: "positiveY",
    groupBy: "group",
    method: "linear",
    confidence: 0.9,
    interval: "prediction",
    band: regressionBandStyle("linear", 0),
    line: { strokeWidth: 2.5, curve: "linear" }
  }).editRegression({
    target: "regressionOwner",
    data: "analysisRows",
    x: "rowOrdinal",
    y: "positiveY",
    groupBy: false,
    method: "loess",
    span: 0.58,
    band: false,
    line: { strokeWidth: 2.1, curve: "linear" }
  });

  program = program.createPointMark({
    id: "directComponentSource", data: "directRows", opacity: 0.08
  }).encodeX({
    target: "directComponentSource", field: "rowOrdinal", fieldType: "quantitative",
    scale: { id: "direct-regression-x", type: "linear", nice: true, zero: false }
  }).encodeY({
    target: "directComponentSource", field: "positiveY", fieldType: "quantitative",
    scale: { id: "direct-regression-y", type: "linear", nice: true, zero: false }
  }).encodeColor({
    target: "directComponentSource", field: "group", fieldType: "nominal",
    scale: { id: "direct-regression-color", type: "ordinal", palette: "tableau10" }
  }).createRegressionData({
    id: "directPolynomialFit",
    source: "directRows",
    x: "rowOrdinal",
    y: "positiveY",
    groupBy: "group",
    method: "polynomial",
    degree: 2,
    confidence: 0.9,
    interval: "mean"
  }).createRegressionData({
    id: "directPredictionFit",
    source: "directRows",
    x: "rowOrdinal",
    y: "positiveY",
    groupBy: "group",
    method: "polynomial",
    degree: 2,
    confidence: 0.9,
    interval: "prediction"
  }).createRegressionData({
    id: "directLoessFit",
    source: "directRows",
    x: "rowOrdinal",
    y: "positiveY",
    groupBy: "group",
    method: "loess",
    span: 0.6
  });

  for (const [index, curve] of CURVES.entries()) {
    program = program.createRegressionBand({
      id: `direct-regression-band-${curve}`,
      data: "directPolynomialFit",
      x: "rowOrdinal",
      lower: "__regression_ci_lower",
      upper: "__regression_ci_upper",
      groupBy: "group",
      coordinate: "main",
      xScale: "direct-regression-x",
      yScale: "direct-regression-y",
      color: "#c7d2fe",
      opacity: 0.12,
      stroke: "#4338ca",
      strokeWidth: 0.8,
      curve
    }).createRegressionLine({
      id: `direct-regression-line-${curve}`,
      data: "directPolynomialFit",
      x: "rowOrdinal",
      y: "positiveY",
      groupBy: "group",
      coordinate: "main",
      xScale: "direct-regression-x",
      yScale: "direct-regression-y",
      colorScale: "direct-regression-color",
      strokeWidth: 1.8,
      curve
    });
  }
  program = program.createRegressionBand({
    id: "direct-regression-prediction-band",
    data: "directPredictionFit",
    x: "rowOrdinal",
    lower: "__regression_ci_lower",
    upper: "__regression_ci_upper",
    groupBy: "group",
    coordinate: "main",
    xScale: "direct-regression-x",
    yScale: "direct-regression-y",
    color: "#ddd6fe",
    opacity: 0.1,
    stroke: "#6d28d9",
    strokeWidth: 0.8,
    curve: "linear"
  }).createRegressionLine({
    id: "direct-regression-prediction-line",
    data: "directPredictionFit",
    x: "rowOrdinal",
    y: "positiveY",
    groupBy: "group",
    coordinate: "main",
    xScale: "direct-regression-x",
    yScale: "direct-regression-y",
    colorScale: "direct-regression-color",
    strokeWidth: 1.6,
    curve: "linear"
  });
  for (const [index, curve] of CURVES.entries()) {
    program = program.editRegressionBand({
      target: "direct-regression-band-linear",
      color: "#bfdbfe",
      opacity: 0.15,
      stroke: "#1e40af",
      strokeWidth: 1 + index % 2 * 0.2,
      curve
    }).editRegressionLine({
      target: "direct-regression-line-linear",
      strokeWidth: 2 + index % 2 * 0.25,
      curve
    });
  }
  program = program.editRegressionBand({
    target: "direct-regression-band-linear",
    stroke: false
  });
  return finish(
    program,
    factors.dataset,
    "Regression model and component lifecycle coverage",
    REGRESSION_ANALYSIS_QUESTION
  );
}

function buildMiscellaneousCoverage(factors) {
  const { program: initial } = createBase(factors.dataset, "temporal");
  let program = initial;
  for (const unit of ["day", "hour", "minute", "quarter", "second"]) {
    program = program.createTimeUnitData({
      id: `time-unit-${unit}`,
      source: "analysisRows",
      field: "timeUnique",
      unit,
      as: `time_${unit}`
    });
  }
  program = program.createIntervalData({
    id: "confidenceInterval",
    source: "analysisRows",
    field: "positiveY",
    groupBy: "group",
    center: "mean",
    extent: "ci",
    level: 0.9,
    as: { center: "ciCenter", lower: "ciLower", upper: "ciUpper" }
  }).createIntervalData({
    id: "deviationInterval",
    source: "analysisRows",
    field: "positiveY",
    groupBy: "group",
    center: "mean",
    extent: "stdev",
    as: { center: "sdCenter", lower: "sdLower", upper: "sdUpper" }
  });

  program = program.createBarMark({ id: "orderedBars", data: "analysisRows" })
    .encodeX({
      target: "orderedBars", field: "category", fieldType: "nominal",
      scale: { id: "ordered-categories", type: "band" }
    })
    .encodeY({
      target: "orderedBars", field: "positiveY", fieldType: "quantitative",
      aggregate: "sum", scale: { id: "ordered-values", type: "linear", zero: true }
    })
    .orderCategories({
      target: "orderedBars",
      channel: "x",
      by: { field: "positiveY", aggregate: "mean" },
      direction: "descending"
    });

  program = program.createCoordinate({ id: "parallelCoverage", type: "parallel" })
    .createLineMark({ id: "parallelCoverageLines", data: "analysisRows", opacity: 0.35 })
    .encodeParallelCoordinates({
      target: "parallelCoverageLines",
      coordinate: "parallelCoverage",
      dimensions: [
        { field: "rowOrdinal", fieldType: "quantitative", scale: { type: "linear", nice: true, zero: true } },
        { field: "positiveY", fieldType: "quantitative", scale: { type: "linear", nice: true, zero: false } },
        { field: "size", fieldType: "quantitative", scale: { type: "linear", nice: true, zero: true } },
        { field: "category", fieldType: "ordinal", scale: { type: "point", padding: 0.25 } }
      ],
      key: "id",
      missing: "error"
    }).createGuides({
      axes: { coordinate: { id: "parallelCoverage", type: "parallel" } },
      grid: false,
      legend: false
    });
  return finish(program, factors.dataset, "Derived data, ordering, and parallel lifecycle coverage");
}

function facetCoverageLayout(rows) {
  const labelStyle = { fontSize: 10.5, fontFamily: "sans-serif", fontWeight: "normal" };
  const titleStyle = { fontSize: 12, fontFamily: "sans-serif", fontWeight: 700 };
  const seriesLabels = [...new Set(rows.map(row => row.group))];
  const facetLabels = [...new Set(rows.map(row => row.category))];
  const maximumSeriesWidth = Math.max(...seriesLabels.map(value =>
    measureTextWidth(String(value) || "(empty)", labelStyle)
  ));
  const maximumFacetWidth = Math.max(...facetLabels.map(value =>
    measureTextWidth(String(value) || "(empty)", titleStyle)
  ));
  const symbolWidth = 12;
  const labelOffset = 8;
  const legendOffset = 10;
  const legendWidth = Math.ceil(Math.max(
    symbolWidth + labelOffset + maximumSeriesWidth,
    measureTextWidth("Series", titleStyle)
  ));
  const rightMargin = legendOffset + legendWidth + 24;
  const plotWidth = Math.max(900, Math.ceil(maximumFacetWidth + 96));
  const plotHeight = Math.max(380, 92 + Math.max(0, seriesLabels.length - 1) * 26);
  return freeze({
    canvas: {
      width: 220 + plotWidth + rightMargin,
      height: 150 + plotHeight + 160,
      background: "#ffffff",
      margin: { top: 150, right: rightMargin, bottom: 160, left: 220 }
    },
    legend: {
      target: "facetPoints",
      channels: ["color"],
      position: "right",
      offset: legendOffset,
      title: "Series",
      symbol: { width: symbolWidth, height: 12, strokeWidth: 0.5 },
      labels: { ...labelStyle, offset: labelOffset },
      titleStyle,
      itemGap: 26,
      border: false
    },
    seriesLabels,
    facetLabels,
    maximumSeriesWidth,
    legendWidth
  });
}

function buildFacetCoverage(factors) {
  const { view, program: initial } = createBase(factors.dataset, "facet");
  const layout = facetCoverageLayout(view.rows);
  const program = initial.editCanvas(layout.canvas).createPointMark({
    id: "facetPoints", data: "analysisRows", opacity: 0.7
  }).encodeX({
    target: "facetPoints", field: "positiveX", fieldType: "quantitative",
    scale: { id: "facet-x", type: "linear", nice: true, zero: false }
  }).encodeY({
    target: "facetPoints", field: "positiveY", fieldType: "quantitative",
    scale: { id: "facet-y", type: "linear", nice: true, zero: false }
  }).encodeColor({
    target: "facetPoints", field: "group", fieldType: "nominal",
    scale: { id: "facet-color", type: "ordinal", palette: "tableau10" }
  }).createGuides({ legend: layout.legend })
    .facet({
      id: "facetedCoverage",
      data: "analysisRows",
      field: "category",
      columns: 3,
      gap: 20,
      align: "end",
      padding: { top: 14, right: 16, bottom: 18, left: 20 },
      scales: { x: "shared", y: "independent" },
      guides: { axes: "each", legend: "shared" }
    }).editCompositionLayout({
      columns: 3,
      gap: 24,
      align: "end",
      padding: { top: 18, right: 20, bottom: 22, left: 24 }
    });
  const finished = finish(
    program,
    factors.dataset,
    "Facet and composition layout lifecycle coverage"
  );
  const composedWidth = finished.graphicSpec.objects.canvas.properties.width;
  return finished.editGraphics({
    target: "canvas",
    property: "width",
    value: composedWidth + FACET_LEGEND_SAFETY_GUTTER
  });
}

function metadataFor(recipe, factors) {
  const view = extendedView(factors.dataset, recipe.kind, {
    derivedEncodingProjection: recipe.derivedEncodingProjection,
    removalProjection: recipe.removalProjection,
    selectionProjection: recipe.selectionProjection,
    singleSeriesProjection: recipe.singleSeriesProjection,
    statisticalProjection: recipe.statisticalProjection
  });
  const fields = realisticSourceFields(factors.dataset, view.provenance.fieldBindings);
  const titleFamily = TITLE_FAMILY_BY_RECIPE_FAMILY[recipe.family] ?? recipe.family;
  return freeze({
    corpus: "tidytuesday",
    chartFamily: recipe.family,
    complexity: recipe.complexity,
    sourceDatasetIds: [factors.dataset],
    title: titleFor(factors.dataset, titleFamily),
    analysisQuestion: recipe.kind === "regression"
      ? REGRESSION_ANALYSIS_QUESTION
      : recipe.statisticalProjection
        ? STATISTICAL_ANALYSIS_QUESTION
        : recipe.derivedEncodingProjection
          ? DERIVED_ENCODING_ANALYSIS_QUESTION
          : recipe.removalProjection
            ? REMOVAL_ANALYSIS_QUESTION
            : DEFAULT_ANALYSIS_QUESTION,
    sourceFields: fields,
    ...(view.sample === undefined ? {} : { sampling: view.sample }),
    provenance: view.provenance,
    dataOperations: view.provenance.transformations.map(item => item.op),
    activeFeatures: []
  });
}

function schedule() {
  return freeze({
    factor: "profile",
    selectionVariantIds: Array(REQUIRED_REPETITIONS).fill("maximal"),
    minimumSelections: REQUIRED_REPETITIONS,
    assignment: "round-robin-datasets-per-variant",
    variantRequirements: [{
      variantId: "maximal",
      minimumOccurrences: REQUIRED_REPETITIONS,
      minimumDatasets: 3
    }],
    minimumDatasetsPerRequirement: 3
  });
}

function makeRecipe({
  id,
  family,
  complexity,
  kind,
  build,
  expectedDirectActions,
  derivedEncodingProjection = false,
  removalProjection = false,
  selectionProjection = false,
  singleSeriesProjection = false,
  statisticalProjection = false
}) {
  const datasets = freeze(DATASETS.filter(dataset => realisticDatasetSupports(dataset, kind)));
  const coverageSchedule = schedule();
  const recipe = {
    id,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity,
    enforceFactorEffects: true,
    datasets,
    factors: freeze({ profile: PROFILES }),
    expectedDirectActions: freeze(expectedDirectActions),
    coverageSchedule,
    minimumSelections: coverageSchedule.minimumSelections,
    kind,
    family,
    derivedEncodingProjection,
    removalProjection,
    selectionProjection,
    singleSeriesProjection,
    statisticalProjection,
    factorsForDataset(dataset) {
      return datasets.includes(dataset) ? freeze({ profile: PROFILES }) : undefined;
    },
    build,
    observe() {
      return freeze([]);
    },
    observeFactors(program, factors) {
      const direct = new Set(program.trace.children?.map(entry => entry.op) ?? []);
      return expectedDirectActions.every(action => direct.has(action))
        ? freeze([{
            factor: "profile",
            value: factors.profile,
            evidence: "direct-root-trace:maximal-lifecycle-actions;final:graphic-program"
          }])
        : freeze([]);
    },
    describe(factors) {
      return metadataFor(recipe, factors);
    }
  };
  return freeze(recipe);
}

function delegatedGuideFactors(delegate, factors) {
  const witnesses = realisticGuideScaleWitnessFactors(delegate, factors.dataset);
  const match = witnesses.find(witness => witness.variant.id === factors.profile.id);
  if (match === undefined) {
    throw new Error(`${delegate.id} has no ${factors.profile.id} witness for ${factors.dataset}.`);
  }
  return match;
}

function makeDelegatedGuideRecipe({
  id, family, complexity, delegate, expectedDirectActions, augment, profileIds,
  preserveDelegatePresentation = false
}) {
  const datasets = freeze([...delegate.datasets]);
  const includedProfiles = profileIds === undefined ? undefined : new Set(profileIds);
  const profiles = freeze([
    ...new Set(delegate.coverageSchedule.selectionVariantIds)
  ].filter(variantId => includedProfiles === undefined || includedProfiles.has(variantId))
    .map(id => ({ id })));
  const selectionVariantIds = profiles.flatMap(profile =>
    Array(REQUIRED_REPETITIONS).fill(profile.id)
  );
  const coverageSchedule = freeze({
    factor: "profile",
    selectionVariantIds,
    minimumSelections: selectionVariantIds.length,
    assignment: "round-robin-datasets-per-variant",
    variantRequirements: profiles.map(profile => ({
      variantId: profile.id,
      minimumOccurrences: REQUIRED_REPETITIONS,
      minimumDatasets: 3
    })),
    minimumDatasetsPerRequirement: 3
  });
  const recipe = {
    id,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity,
    enforceFactorEffects: true,
    datasets,
    factors: freeze({ profile: profiles }),
    expectedDirectActions: freeze(expectedDirectActions),
    coverageSchedule,
    minimumSelections: coverageSchedule.minimumSelections,
    kind: "delegate",
    family,
    factorsForDataset(dataset) {
      if (!datasets.includes(dataset)) return undefined;
      const available = new Set(
        realisticGuideScaleWitnessFactors(delegate, dataset).map(witness => witness.variant.id)
      );
      return freeze({ profile: profiles.filter(profile => available.has(profile.id)) });
    },
    build(factors) {
      const delegated = delegate.build(delegatedGuideFactors(delegate, factors));
      const augmented = augment === undefined ? delegated : augment(delegated);
      return preserveDelegatePresentation
        ? augmented
        : finish(augmented, factors.dataset, family);
    },
    observe() {
      return freeze([]);
    },
    observeFactors(program, factors) {
      const direct = new Set(program.trace.children?.map(entry => entry.op) ?? []);
      return expectedDirectActions.every(action => direct.has(action))
        ? freeze([{
            factor: "profile",
            value: factors.profile,
            evidence: "direct-root-trace:delegated-guide-lifecycle;final:graphic-program"
          }])
        : freeze([]);
    },
    describe(factors) {
      const source = delegate.describe(delegatedGuideFactors(delegate, factors));
      return freeze({
        ...source,
        chartFamily: family,
        complexity,
        ...(preserveDelegatePresentation
          ? {}
          : {
              title: titleFor(factors.dataset, family),
              analysisQuestion:
                "Direct lifecycle options are exercised against one truthful TidyTuesday projection."
            }),
        activeFeatures: []
      });
    }
  };
  return freeze(recipe);
}

const DATA_MARK_RECIPE = makeRecipe({
  id: "realistic-direct-lifecycle-data-mark-coverage",
  family: "direct-lifecycle-data-mark",
  complexity: "intermediate",
  kind: "style",
  build: buildDataAndMarkCoverage,
  expectedDirectActions: [
    "editCanvas", "filterData", "createDensityData", "createBin2DData", "editBin2DData",
    "createTextMark", "editTextMark", "createTickMark", "editTickMark", "createRectMark",
    "editRectMark", "createAreaMark", "editAreaMark", "createLineMark", "editLineMark",
    "createBarMark", "editBarMark", "editRuleMark"
  ]
});

const SELECTION_RECIPE = makeRecipe({
  id: "realistic-direct-lifecycle-selection-coverage",
  family: "direct-lifecycle-selection",
  complexity: "advanced",
  kind: "style",
  selectionProjection: true,
  build: buildSelectionCoverage,
  expectedDirectActions: [
    "filterMarks", "highlightMarks"
  ]
});

const REMOVAL_RECIPE = makeRecipe({
  id: "realistic-direct-lifecycle-removal-coverage",
  family: "direct-lifecycle-removal",
  complexity: "simple",
  kind: "style",
  removalProjection: true,
  singleSeriesProjection: true,
  build: buildRemovalCoverage,
  expectedDirectActions: ["removeEncoding"]
});

const STATISTICAL_RECIPE = makeRecipe({
  id: "realistic-direct-lifecycle-statistical-coverage",
  family: "direct-lifecycle-statistical",
  complexity: "composite",
  kind: "temporal",
  statisticalProjection: true,
  build: buildStatisticalCoverage,
  expectedDirectActions: [
    "createErrorBar", "editErrorBar", "createErrorBand", "editErrorBand",
    "editBoxPlot", "editGradientPlot"
  ]
});

const DERIVED_ENCODING_RECIPE = makeRecipe({
  id: "realistic-direct-lifecycle-derived-encoding-coverage",
  family: "direct-lifecycle-derived-encoding",
  complexity: "composite",
  kind: "temporal",
  derivedEncodingProjection: true,
  build: buildDerivedEncodingCoverage,
  expectedDirectActions: [
    "encodeHorizon", "editHorizon", "encodeHistogram", "encodeDensity", "editDensity"
  ]
});

const REGRESSION_RECIPE = makeRecipe({
  id: "realistic-direct-lifecycle-regression-coverage",
  family: "direct-lifecycle-regression",
  complexity: "composite",
  kind: "regression",
  build: buildRegressionCoverage,
  expectedDirectActions: [
    "createRegression", "editRegression", "createRegressionData",
    "createRegressionBand", "editRegressionBand",
    "createRegressionLine", "editRegressionLine"
  ]
});

const MISCELLANEOUS_RECIPE = makeRecipe({
  id: "realistic-direct-lifecycle-miscellaneous-coverage",
  family: "direct-lifecycle-miscellaneous",
  complexity: "intermediate",
  kind: "temporal",
  build: buildMiscellaneousCoverage,
  expectedDirectActions: [
    "createTimeUnitData", "createIntervalData", "orderCategories",
    "encodeParallelCoordinates", "createGuides"
  ]
});

const FACET_RECIPE = makeRecipe({
  id: "realistic-direct-lifecycle-facet-coverage",
  family: "direct-lifecycle-facet",
  complexity: "composite",
  kind: "facet",
  build: buildFacetCoverage,
  expectedDirectActions: ["facet", "editCompositionLayout"]
});

const GUIDE_RECIPE_BY_ID = new Map(REALISTIC_GUIDE_SCALE_RECIPES.map(recipe => [
  recipe.id,
  recipe
]));

function decimalTicksAndLabels() {
  return {
    count: 4,
    ticks: { length: 7, color: "#64748b", lineWidth: 1 },
    labels: {
      offset: 14,
      format: { decimals: 2 },
      color: "#334155",
      fontSize: 11,
      fontFamily: "sans-serif",
      fontWeight: 500
    }
  };
}

function formattedTicksAndLabels(format) {
  const ticksAndLabels = decimalTicksAndLabels();
  return {
    ...ticksAndLabels,
    labels: { ...ticksAndLabels.labels, format }
  };
}

function decimalCartesianAxis() {
  return {
    scale: "x",
    coordinate: "main",
    position: "bottom",
    line: { color: "#475569", lineWidth: 1.2 },
    ticksAndLabels: decimalTicksAndLabels(),
    title: {
      text: "Source order", at: "center", offset: 80, rotation: 0,
      color: "#0f172a", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700
    }
  };
}

function readableCartesianTicksAndLabels(format, values) {
  return {
    ...(values === undefined ? { count: 5 } : { values }),
    ticks: { length: 8, color: "#475569", lineWidth: 1.25 },
    labels: {
      offset: 12,
      format,
      color: "#334155",
      fontSize: 15,
      fontFamily: "sans-serif",
      fontWeight: 500
    }
  };
}

function restoreReadableCartesianGuidePresentation(program, presentation) {
  const xTicksAndLabels = readableCartesianTicksAndLabels(
    ".0f",
    presentation.xValues
  );
  const yTicksAndLabels = readableCartesianTicksAndLabels({ decimals: 3 });
  return program
    .editCanvas({
      width: CARTESIAN_GUIDE_CANVAS.width,
      height: CARTESIAN_GUIDE_CANVAS.height,
      margin: { ...CARTESIAN_GUIDE_CANVAS.margin }
    })
    .editScale({ id: "size", range: [...CARTESIAN_GUIDE_SIZE_RANGE] })
    .encodePointRadius({
      target: "decimalLegendLines",
      value: CARTESIAN_GUIDE_WITNESS_RADIUS
    })
    .editPointMark({ target: "points", strokeWidth: 1.2 })
    .editPointMark({
      target: "decimalLegendLines",
      fill: "#0f172a",
      opacity: 0.45
    })
    .editXAxisTicksAndLabels({ position: "bottom", ...xTicksAndLabels })
    .createXAxisLine({
      scale: "x",
      position: "bottom",
      color: "#475569",
      lineWidth: 1.25
    })
    .createXAxisTitle({
      scale: "x",
      position: "bottom",
      text: presentation.xTitle,
      at: "center",
      offset: 64,
      rotation: 0,
      color: "#0f172a",
      fontSize: 17,
      fontFamily: "sans-serif",
      fontWeight: 700
    })
    .createYAxis({
      scale: "y",
      coordinate: "main",
      position: "left",
      line: { color: "#475569", lineWidth: 1.25 },
      ticksAndLabels: yTicksAndLabels,
      title: {
        text: presentation.yTitle,
        at: "center",
        offset: 190,
        rotation: -Math.PI / 2,
        color: "#0f172a",
        fontSize: 17,
        fontFamily: "sans-serif",
        fontWeight: 700
      }
    })
    .createLegend({
      target: "points",
      channels: ["color"],
      position: "right",
      align: "center",
      direction: "vertical",
      offset: 42,
      title: presentation.legendTitle,
      symbol: "auto",
      labels: {
        offset: 10,
        fontSize: 15,
        fontFamily: "sans-serif",
        fontWeight: 500
      },
      titleStyle: {
        fontSize: 17,
        fontFamily: "sans-serif",
        fontWeight: 700
      }
    })
    .editTitle({
      maxWidth: 900,
      lineHeight: 34,
      titleStyle: {
        color: "#0f172a",
        fontSize: 30,
        fontFamily: "sans-serif",
        fontWeight: 700
      },
      subtitleStyle: {
        color: "#475569",
        fontSize: 17,
        fontFamily: "sans-serif",
        fontWeight: 400
      }
    });
}

function decimalPolarAxis(scaleId, angle = 0) {
  return {
    scale: scaleId,
    coordinate: "polar",
    angle,
    line: { color: "#475569", lineWidth: 1.2 },
    ticksAndLabels: decimalTicksAndLabels(),
    title: {
      text: scaleId === "theta" ? "Observation angle" : "Observation radius",
      offset: 18,
      color: "#0f172a",
      fontSize: 13,
      fontFamily: "sans-serif",
      fontWeight: 700
    }
  };
}

const CARTESIAN_GUIDE_RECIPE = makeDelegatedGuideRecipe({
  id: "realistic-direct-lifecycle-cartesian-guide-coverage",
  family: "direct-lifecycle-cartesian-guides",
  complexity: "advanced",
  delegate: GUIDE_RECIPE_BY_ID.get("realistic-guide-scale-cartesian-lifecycle"),
  profileIds: ["decimal-object"],
  preserveDelegatePresentation: true,
  expectedDirectActions: [
    "createCoordinate", "createGuides", "createAxes", "createXAxis",
    "createXAxisTicksAndLabels", "editXAxis", "editXAxisTicksAndLabels",
    "editLegend"
  ],
  augment(program) {
    const analysisRows = program.semanticSpec.datasets.find(dataset =>
      dataset.id === "analysisRows"
    ).values;
    const presentation = {
      xTitle: program.semanticSpec.guides.axis.x.title,
      yTitle: program.semanticSpec.guides.axis.y.title,
      legendTitle: program.semanticSpec.guides.legend.color.title,
      xValues: analysisRows.map(row => row.rank)
    };
    const axis = decimalCartesianAxis();
    let next = program
      .removeLegend({ target: "points", channels: ["color"] })
      .removeXAxis({ coordinate: "main", scale: "x" })
      .removeYAxis({ coordinate: "main", scale: "y" })
      .createPointMark({ id: "decimalLegendLines", data: "analysisRows", opacity: 0.3 })
      .encodeX({
        target: "decimalLegendLines", field: "rank", fieldType: "quantitative",
        scale: { id: "x" }
      })
      .encodeY({
        target: "decimalLegendLines", field: "value", fieldType: "quantitative",
        scale: { id: "y" }
      })
      .encodeShape({ target: "decimalLegendLines", field: "category" })
      .createGuides({
        axes: {
          coordinate: { id: "main", type: "cartesian" },
          x: false,
          y: { scale: "y", coordinate: "main" }
        },
        grid: false,
        legend: {
          target: "decimalLegendLines",
          channels: ["shape"],
          position: "right",
          title: "Observed category",
          symbol: { length: 28, lineWidth: 2 },
          labels: { offset: 8, fontSize: 11 },
          titleStyle: { fontSize: 12, fontWeight: 700 }
        }
      }).editLegend({
        target: "decimalLegendLines",
        position: "right",
        title: "Observed category",
        symbol: { length: 24, lineWidth: 2.5 }
      }).removeLegend({ target: "decimalLegendLines", channels: ["shape"] })
      .removeYAxis({ coordinate: "main", scale: "y" })
      .createGuides({
        axes: {
          coordinate: { id: "main", type: "cartesian" },
          x: axis,
          y: false
        },
        grid: false,
        legend: false
      }).removeXAxis({ coordinate: "main", scale: "x" })
      .createAxes({
        coordinate: { id: "main", type: "cartesian" },
        x: axis,
        y: false,
        theta: false,
        radius: false
      }).removeXAxis({ coordinate: "main", scale: "x" })
      .createXAxis(axis)
      .editXAxis({ labels: decimalTicksAndLabels().labels })
      .editXAxis({ ticksAndLabels: decimalTicksAndLabels() })
      .removeXAxis({ coordinate: "main", scale: "x" })
      .createXAxisTicksAndLabels({
        scale: "x",
        position: "bottom",
        ...decimalTicksAndLabels()
      }).editXAxisTicksAndLabels({
        position: "bottom",
        ...decimalTicksAndLabels()
      });
    next = next.createPointMark({ id: "cartesianCoordinateWitness", data: "analysisRows" })
      .createCoordinate({
        id: "cartesianWitness",
        type: "cartesian",
        layers: ["cartesianCoordinateWitness"]
      })
      .encodeX({
        target: "cartesianCoordinateWitness", field: "rank",
        fieldType: "quantitative", scale: { id: "cartesian-witness-x" }
      })
      .encodeY({
        target: "cartesianCoordinateWitness", field: "value",
        fieldType: "quantitative", scale: { id: "cartesian-witness-y" }
      })
      .removeMark({ target: "cartesianCoordinateWitness" });
    return restoreReadableCartesianGuidePresentation(next, presentation);
  }
});

const POLAR_GUIDE_RECIPE = makeDelegatedGuideRecipe({
  id: "realistic-direct-lifecycle-polar-guide-coverage",
  family: "direct-lifecycle-polar-guides",
  complexity: "advanced",
  delegate: GUIDE_RECIPE_BY_ID.get("realistic-guide-scale-polar-lifecycle"),
  profileIds: ["count-inside"],
  expectedDirectActions: [
    "createCoordinate", "createAxes", "createThetaAxis", "createRadialAxis",
    "editThetaAxis", "editRadialAxis"
  ],
  augment(program) {
    const theta = decimalPolarAxis("theta", 0);
    const radius = decimalPolarAxis("radius", 90);
    const formatted = formattedTicksAndLabels(".2f");
    const formattedTheta = {
      ...theta,
      ticksAndLabels: formatted
    };
    const formattedRadius = {
      ...radius,
      ticksAndLabels: formatted
    };
    let next = program
      .removeLegend({ target: "points", channels: ["color"] })
      .removeThetaAxis({ coordinate: "polar", scale: "theta" })
      .removeRadialAxis({ coordinate: "polar", scale: "radius" })
      .createGuides({
        axes: { coordinate: { id: "polar", type: "polar" }, theta, radius },
        grid: false,
        legend: false
      }).removeThetaAxis({ coordinate: "polar", scale: "theta" })
      .removeRadialAxis({ coordinate: "polar", scale: "radius" })
      .createGuides({
        axes: {
          coordinate: { id: "polar", type: "polar" },
          theta: formattedTheta,
          radius: formattedRadius
        },
        grid: false,
        legend: false
      }).removeThetaAxis({ coordinate: "polar", scale: "theta" })
      .removeRadialAxis({ coordinate: "polar", scale: "radius" })
      .createAxes({
        coordinate: { id: "polar", type: "polar" }, theta, radius
      }).removeThetaAxis({ coordinate: "polar", scale: "theta" })
      .removeRadialAxis({ coordinate: "polar", scale: "radius" })
      .createAxes({
        coordinate: { id: "polar", type: "polar" },
        theta: formattedTheta,
        radius: formattedRadius
      }).removeThetaAxis({ coordinate: "polar", scale: "theta" })
      .removeRadialAxis({ coordinate: "polar", scale: "radius" })
      .createThetaAxis(theta)
      .createRadialAxis(radius)
      .editThetaAxis({ labels: decimalTicksAndLabels().labels })
      .editThetaAxis({ ticksAndLabels: decimalTicksAndLabels() })
      .editRadialAxis({ labels: decimalTicksAndLabels().labels })
      .editRadialAxis({ ticksAndLabels: decimalTicksAndLabels() })
      .editThetaAxis({ labels: formatted.labels })
      .editThetaAxis({ ticksAndLabels: formatted })
      .editRadialAxis({ labels: formatted.labels })
      .editRadialAxis({ ticksAndLabels: formatted })
      .editThetaAxisLabels({ format: ".2f" })
      .editRadialAxisLabels({ format: ".2f" })
      .removeThetaAxis({ coordinate: "polar", scale: "theta" })
      .removeRadialAxis({ coordinate: "polar", scale: "radius" })
      .createThetaAxis(formattedTheta)
      .createRadialAxis(formattedRadius);
    next = next.createPointMark({ id: "polarCoordinateWitness", data: "analysisRows" })
      .createCoordinate({
        id: "polarWitness",
        type: "polar",
        layers: ["polarCoordinateWitness"]
      })
      .encodeTheta({
        target: "polarCoordinateWitness", field: "rank",
        fieldType: "quantitative", scale: { id: "polar-witness-theta" }
      })
      .encodeR({
        target: "polarCoordinateWitness", field: "value",
        fieldType: "quantitative", scale: { id: "polar-witness-radius" }
      });
    return next;
  }
});

export const REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES = freeze([
  DATA_MARK_RECIPE,
  SELECTION_RECIPE,
  REMOVAL_RECIPE,
  STATISTICAL_RECIPE,
  DERIVED_ENCODING_RECIPE,
  REGRESSION_RECIPE,
  MISCELLANEOUS_RECIPE,
  CARTESIAN_GUIDE_RECIPE,
  POLAR_GUIDE_RECIPE,
  FACET_RECIPE
]);

export const REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXPECTED_ACTIONS = freeze([
  ...new Set(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.flatMap(recipe =>
    recipe.expectedDirectActions
  ))
]);

export const REALISTIC_DIRECT_LIFECYCLE_COVERAGE_SCHEDULES = freeze(
  Object.fromEntries(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.map(recipe => [
    recipe.id,
    recipe.coverageSchedule
  ]))
);

export const REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXCLUDED_ACTIONS = freeze([
  ...EXCLUDED_FACADE_ACTIONS,
  ...EXCLUDED_ENCODING_ACTIONS
]);

export const REALISTIC_DIRECT_LIFECYCLE_COVERAGE_ASSIGNED_LITERAL_FAMILIES =
  ASSIGNED_LITERAL_FAMILIES;

export const REALISTIC_DIRECT_LIFECYCLE_COVERAGE_TARGET_COUNTS = freeze({
  optionPaths: 389,
  optionValues: 478,
  familyLiterals: 50,
  dataOperations: 1,
  total: 918,
  replayCorrectedOptions: 70
});

export const REALISTIC_DIRECT_LIFECYCLE_COVERAGE_TARGET_SHA256 =
  "5b820744f77368e073c15120cbcb53aa325758e123408615ceed6c8556c7f655";

function requirementAction(id) {
  return /^(?:option-path|option-value):([^.=]+)[.=]/u.exec(id)?.[1];
}

function replayCorrectedRequirement(requirement) {
  if (REPLAY_CORRECTED_NESTED_REQUIREMENTS.includes(requirement.id)) return true;
  return requirement.kind === "path-literal" &&
    REPLAY_GUIDE_ACTIONS.includes(requirementAction(requirement.id)) &&
    !REPLAY_UNCORRECTED_GUIDE_LITERALS.includes(requirement.id);
}

export function realisticDirectLifecycleReplayCorrectedRequirementIds(
  baselineRequirements
) {
  if (!Array.isArray(baselineRequirements)) {
    throw new TypeError("Replay correction requires baseline coverage requirements.");
  }
  return freeze(baselineRequirements
    .filter(requirement =>
      (!requirement.meetsMinimum || requirement.datasetCount < requirement.minimumDatasets) &&
      replayCorrectedRequirement(requirement)
    )
    .map(requirement => requirement.id)
    .sort());
}

export function realisticDirectLifecycleRequirementTargets(
  publicInventory,
  baselineRequirements
) {
  if (!Array.isArray(publicInventory?.optionPaths) || !Array.isArray(baselineRequirements)) {
    throw new TypeError("Direct lifecycle targets require an inventory and baseline requirements.");
  }
  const excludedActions = new Set(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXCLUDED_ACTIONS);
  const assignedFamilies = new Set(ASSIGNED_LITERAL_FAMILIES);
  const requiredOptions = new Set(publicInventory.optionPaths
    .filter(option => option.required)
    .map(option => option.id));
  const inventoryOptionRequirements = new Set([
    ...requiredOptions,
    ...publicInventory.pathLiteralRequirements
      .filter(requirement => requiredOptions.has(requirement.optionPath))
      .map(requirement => requirement.id)
  ]);
  const inventoryFamilyRequirements = new Set(publicInventory.familyLiteralRequirements
    .filter(requirement => assignedFamilies.has(requirement.family))
    .map(requirement => requirement.id));
  return freeze(baselineRequirements
    .filter(requirement =>
      !requirement.meetsMinimum || requirement.datasetCount < requirement.minimumDatasets
    )
    .filter(requirement => {
      const action = requirementAction(requirement.id);
      if (action !== undefined) {
        return inventoryOptionRequirements.has(requirement.id) &&
          !excludedActions.has(action) &&
          !replayCorrectedRequirement(requirement);
      }
      if (requirement.kind === "family-literal") {
        return inventoryFamilyRequirements.has(requirement.id);
      }
      return requirement.id === "data-operation:single-series-projection";
    })
    .map(requirement => requirement.id)
    .sort());
}

export const REALISTIC_DIRECT_LIFECYCLE_COVERAGE_COUNTS = freeze({
  recipes: REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.length,
  simple: REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.filter(recipe =>
    recipe.complexity === "simple"
  ).length,
  intermediate: REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.filter(recipe =>
    recipe.complexity === "intermediate"
  ).length,
  advanced: REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.filter(recipe =>
    recipe.complexity === "advanced"
  ).length,
  composite: REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.filter(recipe =>
    recipe.complexity === "composite"
  ).length,
  minimumSelections: REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.reduce((sum, recipe) =>
    sum + recipe.coverageSchedule.minimumSelections, 0
  ),
  maximumRecipeSelections: Math.max(...REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES
    .map(recipe => recipe.coverageSchedule.minimumSelections)),
  maximumFamilySelections: REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.reduce((sum, recipe) =>
    sum + recipe.coverageSchedule.minimumSelections, 0
  ),
  targetRequirements: REALISTIC_DIRECT_LIFECYCLE_COVERAGE_TARGET_COUNTS.total
});

export function realisticDirectLifecycleCoverageFactors(recipe, datasets = recipe.datasets) {
  if (!REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.includes(recipe)) {
    throw new Error(`Unknown realistic direct-lifecycle recipe "${recipe?.id}".`);
  }
  return freeze(recipe.coverageSchedule.selectionVariantIds.map((variantId, index) => {
    for (let offset = 0; offset < datasets.length; offset += 1) {
      const dataset = datasets[(index + offset) % datasets.length];
      const domains = recipe.factorsForDataset(dataset);
      const profile = domains?.profile.find(value => value.id === variantId);
      if (profile !== undefined) return { dataset, profile };
    }
    throw new Error(`${recipe.id} has no eligible dataset for profile ${variantId}.`);
  }));
}
