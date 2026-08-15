import { createHash } from "node:crypto";

import { chart } from "../../../src/index.js";

import {
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticFieldPairDomain,
  realisticOrderedView,
  realisticRecordView,
  realisticSourceFields,
  realisticSummaryView
} from "./realistic-data.js";
import { SOURCE_INDEX_ENCODING } from "./coverage-ledger.js";

const CANVAS = Object.freeze({
  width: 1800,
  height: 980,
  margin: Object.freeze({ top: 250, right: 520, bottom: 250, left: 440 })
});
const POLAR_CANVAS = Object.freeze({
  width: 1900,
  height: 1100,
  margin: Object.freeze({ top: 260, right: 650, bottom: 260, left: 360 })
});
const PALETTES = Object.freeze(["tableau10", "set2", "dark2", "viridis"]);
const CURVES = Object.freeze([
  "linear", "step", "step-before", "step-after", "basis", "cardinal",
  "monotone", "natural"
]);
const DASHES = Object.freeze(["solid", "dashed", "dotted", "dashdot"]);
const POINT_SHAPES = Object.freeze([
  "circle", "cross", "diamond", "hexagon", "plus", "square", "star",
  "triangle-down", "triangle-left", "triangle-right", "triangle-up", "wye"
]);
const DATASETS = Object.freeze(realisticDatasetIds());

function frozen(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) frozen(child);
  return Object.freeze(value);
}

function canvas(value = CANVAS) {
  return { ...value, margin: { ...value.margin } };
}

function unique(values) {
  return [...new Set(values)];
}

function quantile(values, probability) {
  const ordered = [...values].sort((left, right) => left - right);
  const index = (ordered.length - 1) * probability;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return ordered[lower] +
    (ordered[Math.min(lower + 1, ordered.length - 1)] - ordered[lower]) * fraction;
}

function numericExtent(rows, field) {
  const values = rows.map(row => row[field]).filter(Number.isFinite);
  if (values.length < 2) throw new Error(`Realistic ${field} extent requires two values.`);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) throw new Error(`Realistic ${field} extent must vary.`);
  return [minimum, maximum];
}

function paddedExtent(rows, field, ratio = 0.025) {
  const [minimum, maximum] = numericExtent(rows, field);
  const padding = (maximum - minimum) * ratio;
  return [minimum - padding, maximum + padding];
}

function selectedProvenance(base, rows, transformations) {
  const indexes = unique(rows.map(row => row.sourceRowIndex).filter(Number.isInteger))
    .sort((left, right) => left - right);
  if (indexes.length === 0) {
    throw new Error(`${base.sourceDataset} derived view requires source-row indexes.`);
  }
  return frozen({
    sourceDataset: base.sourceDataset,
    sourceRowIndexBasis: "zero-based-data-row-in-pinned-csv",
    sourceRowCount: indexes.length,
    minimumSourceRow: indexes[0],
    maximumSourceRow: indexes.at(-1),
    sourceSelectionSha256: createHash("sha256").update(indexes.join(",")).digest("hex"),
    indexEncoding: SOURCE_INDEX_ENCODING,
    sourceRowIndexes: indexes,
    fieldBindings: base.fieldBindings,
    transformations: frozen([...base.transformations, ...transformations])
  });
}

function aggregateProvenance(base, transformations) {
  return frozen({
    ...base,
    transformations: frozen([...base.transformations, ...transformations])
  });
}

function sourceContext(dataset, provenance) {
  const fields = realisticSourceFields(dataset, provenance.fieldBindings);
  const byField = new Map(fields.map(field => [field.field, field]));
  const measure = byField.get(provenance.fieldBindings.measure);
  const dimension = byField.get(provenance.fieldBindings.dimension);
  const secondary = byField.get(provenance.fieldBindings.secondaryMeasure);
  const unit = measure?.unit === undefined ? "" : ` (${measure.unit})`;
  return frozen({
    fields,
    measure: measure?.label ?? provenance.fieldBindings.measure,
    dimension: dimension?.label ?? provenance.fieldBindings.dimension,
    secondary: secondary?.label ?? provenance.fieldBindings.secondaryMeasure,
    unit
  });
}

function sparseValues(rows, field, limit = 5) {
  const values = unique(rows.map(row => row[field]));
  if (values.length <= limit) return values;
  return unique(Array.from({ length: limit }, (_, index) =>
    values[Math.round(index * (values.length - 1) / (limit - 1))]
  ));
}

function guides(xTitle, yTitle, {
  legend = true,
  legendTarget,
  legendChannels,
  xValues,
  yValues
} = {}) {
  return {
    axes: {
      x: {
        ...(xValues === undefined ? {} : { ticksAndLabels: { values: xValues } }),
        title: { text: xTitle }
      },
      y: {
        ...(yValues === undefined ? {} : { ticksAndLabels: { values: yValues } }),
        title: { text: yTitle }
      }
    },
    grid: false,
    legend: legend
      ? {
          position: "right",
          title: "Group",
          ...(legendTarget === undefined ? {} : { target: legendTarget }),
          ...(legendChannels === undefined ? {} : { channels: legendChannels })
        }
      : false
  };
}

function finish(program, title, question, xTitle, yTitle, options = {}) {
  return program
    .createGuides(guides(xTitle, yTitle, options))
    .createTitle({ text: title, subtitle: question, align: "left" });
}

function recordView(factors, capability = "record", options = {}) {
  return realisticRecordView(factors.dataset, {
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    ...options,
    ...(capability === "distribution" ? { minimumPerGroup: 8 } : {})
  });
}

function summaryView(factors) {
  return realisticSummaryView(factors.dataset, {
    aggregate: factors.aggregate ?? "mean",
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex
  });
}

function pairedMeasureView(factors) {
  const base = recordView(factors);
  const rows = base.rows.filter(row => Number.isFinite(row.secondary));
  if (
    rows.length < 12 ||
    new Set(rows.map(row => row.value)).size < 3 ||
    new Set(rows.map(row => row.secondary)).size < 3
  ) {
    throw new Error(`${factors.dataset} requires two varying paired measures.`);
  }
  return frozen({
    rows,
    provenance: selectedProvenance(base.provenance, rows, [frozen({
      op: "filter-paired-finite-measures",
      fields: [
        base.provenance.fieldBindings.secondaryMeasure,
        base.provenance.fieldBindings.measure
      ]
    })])
  });
}

function densityView(factors) {
  const base = recordView(factors, "distribution", {
    groupLimit: 4,
    subgroupLimit: 4
  });
  let rows = base.rows;
  const transformations = [];
  if (factors.placement === "split") {
    const counts = new Map();
    for (const row of rows) counts.set(row.subgroup, (counts.get(row.subgroup) ?? 0) + 1);
    const domain = [...counts]
      .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
      .slice(0, 2)
      .map(([value]) => value);
    if (domain.length !== 2) throw new Error(`${factors.dataset} needs two density subgroups.`);
    rows = rows.filter(row => domain.includes(row.subgroup));
    transformations.push(frozen({
      op: "top-two-density-split-groups",
      field: base.provenance.fieldBindings.secondaryDimension ?? "median-split",
      values: domain
    }));
  }
  const usableGroups = new Set([...Map.groupBy(rows, row => row.category)]
    .filter(([, values]) => values.length >= 5 && new Set(values.map(row => row.value)).size > 1)
    .map(([group]) => group));
  rows = rows.filter(row => usableGroups.has(row.category));
  if (rows.length < 10 || usableGroups.size < 2) {
    throw new Error(`${factors.dataset} needs two varying density groups.`);
  }
  return frozen({
    rows,
    splitDomain: factors.placement === "split"
      ? unique(rows.map(row => row.subgroup))
      : undefined,
    provenance: selectedProvenance(base.provenance, rows, transformations)
  });
}

function orderedPathView(factors) {
  const base = realisticOrderedView(factors.dataset, {
    aggregate: factors.aggregate,
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex
  });
  const counters = new Map();
  const rows = base.rows.map(row => {
    const index = counters.get(row.group) ?? 0;
    counters.set(row.group, index + 1);
    return { ...row, pathIndex: index };
  });
  if ([...counters.values()].every(count => count < 2)) {
    throw new Error(`${factors.dataset} requires multi-point source paths.`);
  }
  return frozen({
    rows,
    positionType: base.positionType,
    provenance: aggregateProvenance(base.provenance, [frozen({
      op: "stable-within-series-rank",
      groupBy: base.provenance.fieldBindings.dimension,
      as: "pathIndex"
    })])
  });
}

function statisticalBandView(factors) {
  const base = recordView(factors, "distribution", { groupLimit: 7 });
  const categories = unique(base.rows.map(row => row.category));
  const rank = new Map(categories.map((category, index) => [category, index + 1]));
  const rows = base.rows.map(row => ({
    ...row,
    categoryRank: rank.get(row.category),
    series: "All retained categories"
  }));
  return frozen({
    rows,
    provenance: selectedProvenance(base.provenance, rows, [
      frozen({ op: "stable-category-rank", field: base.provenance.fieldBindings.dimension }),
      frozen({ op: "constant-series", as: "series", value: "All retained categories" })
    ])
  });
}

function explicitBandView(factors) {
  const base = summaryView(factors);
  const rows = base.rows.map(row => ({ ...row, series: "All retained categories" }));
  return frozen({
    rows,
    provenance: aggregateProvenance(base.provenance, [frozen({
      op: "constant-series",
      as: "series",
      value: "All retained categories"
    })])
  });
}

function buildBinnedHeatmap(factors) {
  const view = pairedMeasureView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const xExtent = paddedExtent(view.rows, "secondary");
  const yExtent = paddedExtent(view.rows, "value");
  const editedX = paddedExtent(view.rows, "secondary", 0.05);
  const editedY = paddedExtent(view.rows, "value", 0.05);
  const id = "pairedHeatmap";
  return chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createHeatmap({
      id,
      data: "analysisRows",
      coordinate: "main",
      x: {
        field: "secondary",
        fieldType: "quantitative",
        scale: {
          type: "linear", domain: "auto", range: "auto", nice: false,
          zero: false, reverse: factors.reverse, clamp: true
        }
      },
      y: {
        field: "value",
        fieldType: "quantitative",
        scale: {
          type: "linear", domain: "auto", range: "auto", nice: false,
          zero: false, reverse: false, clamp: true
        }
      },
      bin: {
        bins: { x: factors.bins, y: factors.bins - 1 },
        extent: { x: xExtent, y: yExtent },
        includeEmpty: factors.includeEmpty
      },
      color: {
        ...(factors.palettePath === "outer" ? { palette: factors.palette } : {}),
        scale: {
          type: "sequential", domain: "auto",
          reverse: factors.reverse, clamp: true, interpolate: "lab",
          ...(factors.palettePath === "scale" ? { palette: factors.palette } : {})
        }
      },
      rect: { opacity: 0.9, stroke: "#ffffff", strokeWidth: 0.7 },
      guides: {
        axes: {
          x: { ticksAndLabels: { count: 5 }, title: { text: context.secondary } },
          y: { ticksAndLabels: { count: 5 }, title: { text: context.measure } }
        },
        grid: false,
        legend: { position: "right", title: "Observation count" }
      }
    })
    .editBin2DData({
      target: `${id}Bin2DData`,
      source: "analysisRows",
      x: "secondary",
      y: "value",
      bins: { x: factors.bins + 1, y: factors.bins },
      extent: { x: editedX, y: editedY },
      includeEmpty: !factors.includeEmpty,
      members: true,
      as: {
        x0: "__pairedHeatmapBin2DData_x0",
        x1: "__pairedHeatmapBin2DData_x1",
        y0: "__pairedHeatmapBin2DData_y0",
        y1: "__pairedHeatmapBin2DData_y1",
        count: "__pairedHeatmapBin2DData_count",
        members: "__pairedHeatmapBin2DData_members"
      }
    })
    .createTitle({
      text: `${context.measure}${context.unit} versus ${context.secondary}`,
      subtitle: "Where are observations concentrated across the two measured quantities?",
      align: "left"
    });
}

function histogramBins(rows, mode, requested) {
  const values = rows.map(row => row.value).filter(Number.isFinite);
  if (mode === "max") return { maxBins: requested };
  if (mode === "step") {
    const spread = quantile(values, 0.75) - quantile(values, 0.25) ||
      Math.max(...values) - Math.min(...values);
    return { binStep: spread / Math.max(4, requested) };
  }
  const boundaries = unique([0, 0.2, 0.4, 0.6, 0.8, 1]
    .map(probability => quantile(values, probability)))
    .sort((left, right) => left - right);
  if (boundaries.length < 2) throw new Error("Histogram boundaries must vary.");
  return { binBoundaries: boundaries };
}

function buildHistogram(factors) {
  const view = recordView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  return chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createHistogram({
      id: "observedHistogram",
      data: "analysisRows",
      coordinate: "main",
      field: "value",
      ...histogramBins(view.rows, factors.binMode, factors.maxBins),
      stack: factors.segmented ? factors.stack : "zero",
      xScale: {
        type: "symlog", constant: 1, domain: "auto", range: "auto",
        nice: factors.nice, zero: false, reverse: factors.reverse, clamp: true
      },
      yScale: {
        type: "linear", domain: "auto", range: "auto", nice: true,
        zero: true, reverse: false, clamp: true
      },
      ...(factors.segmented ? {
        color: {
          field: "category",
          fieldType: "nominal",
          layout: factors.stack === "normalize" ? "fill" : "stack",
          ...(factors.palettePath === "outer" ? { palette: factors.palette } : {}),
          scale: {
            type: "ordinal", domain: "auto",
            ...(factors.palettePath === "scale" ? { palette: factors.palette } : {})
          }
        }
      } : {}),
      bar: {
        ...(factors.segmented ? {} : { fill: "#64748b" }),
        opacity: 0.88, stroke: "#ffffff", strokeWidth: 0.6
      },
      guides: {
        axes: {
          x: {
            ticksAndLabels: { count: 3, labels: { format: ".2e", fontSize: 9 } },
            title: { text: context.measure }
          },
          y: { ticksAndLabels: { count: 5 }, title: { text: "Observation count" } }
        },
        grid: { horizontal: true, vertical: false },
        legend: factors.segmented
          ? { position: "right", title: context.dimension }
          : false
      }
    })
    .createTitle({
      text: `Distribution of ${context.measure}${context.unit}`,
      subtitle: `How does the observed distribution differ across ${context.dimension}?`,
      align: "left"
    });
}

function densityPlacement(factors, view) {
  if (factors.placement === "baseline") return { type: "baseline" };
  const width = { band: factors.width, resolve: factors.widthResolve };
  if (factors.placement === "split") {
    return {
      type: "category",
      width,
      split: { field: "subgroup", domain: view.splitDomain },
      scale: {
        type: "band", domain: "auto", range: "auto", align: 0.5,
        padding: 0.12, paddingInner: 0.08, paddingOuter: 0.06,
        reverse: factors.reverse
      }
    };
  }
  return {
    type: "category",
    side: factors.densityChannel === "x" ? "right" : "top",
    width,
    scale: {
      type: "band", domain: "auto", range: "auto", align: 0.5,
      padding: 0.12, paddingInner: 0.08, paddingOuter: 0.06,
      reverse: factors.reverse
    }
  };
}

function buildDensity(factors) {
  const view = densityView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const extent = paddedExtent(view.rows, "value");
  const spread = quantile(view.rows.map(row => row.value), 0.75) -
    quantile(view.rows.map(row => row.value), 0.25);
  const bandwidth = Math.max(Number.MIN_VALUE, spread * factors.bandwidthRatio);
  const placement = densityPlacement(factors, view);
  const baseline = factors.placement === "baseline";
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createAreaMark({
      id: "densityArea",
      data: "analysisRows",
      fill: "#2563eb",
      opacity: 0.5,
      stroke: "#1d4ed8",
      strokeWidth: 0.8,
      curve: "linear"
    })
    .encodeDensity({
      target: "densityArea",
      source: "analysisRows",
      field: "value",
      groupBy: "category",
      bandwidth,
      extent,
      steps: factors.steps,
      kernel: factors.kernel,
      normalization: factors.normalization,
      as: ["observedValue", "estimatedDensity"],
      densityChannel: factors.densityChannel,
      coordinate: "main",
      valueScale: {
        type: "linear", domain: "auto", range: "auto", nice: false,
        zero: false, reverse: factors.reverse, clamp: true
      },
      ...(baseline ? {
        densityScale: {
          type: "linear", domain: "auto", range: "auto", nice: true,
          zero: true, reverse: false, clamp: true
        }
      } : {}),
      placement
    })
    .encodeColor({
      target: "densityArea", field: "category", fieldType: "nominal",
      layout: "overlay", scale: { palette: factors.palette }
    });
  const editedPlacement = baseline
    ? { type: "baseline" }
    : densityPlacement({ ...factors, reverse: !factors.reverse }, view);
  program = program.editDensity({
    target: "densityArea",
    source: "analysisRows",
    field: "value",
    groupBy: "category",
    bandwidth: bandwidth * 1.15,
    extent,
    steps: factors.steps + 4,
    kernel: factors.kernel === "gaussian" ? "epanechnikov" : "gaussian",
    normalization: factors.normalization === "unit" ? "count" : "unit",
    placement: editedPlacement
  });
  return finish(
    program,
    `Density of ${context.measure}${context.unit} by ${context.dimension}`,
    `Where is ${context.measure} concentrated within each ${context.dimension} group?`,
    factors.densityChannel === "x" && !baseline ? context.dimension : context.measure,
    factors.densityChannel === "x" && !baseline ? context.measure : "Estimated density",
    { legend: true }
  );
}

function buildPointLabels(factors) {
  const view = recordView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const stride = Math.max(1, Math.ceil(view.rows.length / 48));
  const labelRows = view.rows.filter((row, index) => index % stride === 0).slice(0, 48);
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createData({ id: "labelRows", values: labelRows })
    .createPointMark({
      id: "observations",
      data: "analysisRows",
      shape: "circle",
      fill: "#2563eb",
      opacity: 0.64,
      stroke: "#ffffff",
      strokeWidth: 0.6
    })
    .encodeX({
      target: "observations", field: "value", fieldType: "quantitative",
      scale: { nice: true, zero: false }
    })
    .encodeY({
      target: "observations", field: "category", fieldType: "nominal",
      scale: { padding: 0.2 }
    })
    .editPointMark({
      target: "observations",
      shape: factors.shape,
      fill: factors.fill,
      opacity: factors.opacity,
      stroke: "#ffffff",
      strokeWidth: 0.8
    });
  if (factors.strokeRemoval) {
    program = program
      .editPointMark({ target: "observations", stroke: false })
      .editPointMark({ target: "observations", stroke: "#ffffff", strokeWidth: 0.8 });
  }
  const maxOffset = factors.offset === "band"
    ? { band: 0.16 }
    : { pixels: 5 };
  program = program
    .jitterPoints({
      target: "observations",
      channel: factors.offset === "band" ? "y" : factors.jitterChannel,
      maxOffset,
      seed: `observations-${factors.dataset}`,
      key: "key"
    })
    .removeJitter({ target: "observations" })
    .jitterPoints({
      target: "observations",
      channel: "y",
      maxOffset: { pixels: 3 },
      seed: 20260815,
      key: "key"
    })
    .createTextMark({
      id: "observationLabels",
      data: "labelRows",
      fontFamily: "system-ui",
      fontSize: 9,
      fontWeight: 500,
      fill: "#334155",
      dx: 7,
      dy: -3,
      align: "left",
      baseline: "middle"
    })
    .encodeX({ target: "observationLabels", field: "value", scale: { id: "x" } })
    .encodeY({
      target: "observationLabels", field: "category", fieldType: "nominal",
      scale: { id: "y" }
    })
    .encodeText({ target: "observationLabels", field: "label" })
    .layoutLabels({
      target: "observationLabels",
      axis: factors.labelAxis,
      padding: factors.labelPadding,
      maxDisplacement: factors.maxDisplacement,
      bounds: factors.labelBounds,
      leader: factors.leader
        ? {
            stroke: "#94a3b8", strokeWidth: 0.8, strokeDash: [3, 2], opacity: 0.75
          }
        : false
    })
    .removeLabelLayout({ target: "observationLabels" })
    .layoutLabels({
      target: "observationLabels",
      axis: factors.labelAxis,
      padding: factors.labelPadding,
      maxDisplacement: factors.maxDisplacement,
      bounds: factors.labelBounds,
      leader: {
        stroke: "#94a3b8", strokeWidth: 0.8, strokeDash: [3, 2], opacity: 0.75
      }
    });
  return finish(
    program,
    `${context.measure}${context.unit} observations by ${context.dimension}`,
    `Which labeled observations are unusual within each ${context.dimension} group?`,
    context.measure,
    context.dimension,
    { legend: false, yValues: sparseValues(view.rows, "category") }
  );
}

function buildOrderedLine(factors) {
  const view = orderedPathView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createLineMark({
      id: "orderedTrend",
      data: "analysisRows",
      ...(factors.colorEncoding ? {} : { stroke: "#2563eb" }),
      strokeWidth: 2,
      opacity: 0.82,
      curve: "linear",
      closed: false
    })
    .encodeX({
      target: "orderedTrend", field: "pathIndex", fieldType: "quantitative",
      scale: { nice: true, zero: false, reverse: factors.reverse }
    })
    .encodeY({
      target: "orderedTrend", field: "value", fieldType: "quantitative",
      scale: { nice: true, zero: false }
    })
    .encodeGroup({ target: "orderedTrend", field: "group", fieldType: "nominal" })
    .encodePathOrder({
      target: "orderedTrend",
      field: "pathIndex",
      fieldType: "quantitative",
      order: factors.pathOrder
    });
  program = factors.dashMode === "field"
    ? program.encodeStrokeDash({
        target: "orderedTrend",
        field: "group",
        fieldType: "nominal",
        scale: {
          id: "trendDash", type: "ordinal", domain: "auto",
          range: ["solid", "dashed", "dotted", "dashdot"]
        }
      })
    : program.encodeStrokeDash({
        target: "orderedTrend",
        value: factors.dashStyle
      });
  program = program
    .editLineMark({
      target: "orderedTrend",
      ...(factors.colorEncoding ? {} : { stroke: "#1d4ed8" }),
      strokeWidth: factors.strokeWidth,
      opacity: factors.opacity,
      curve: factors.curve,
      closed: false
    });
  if (factors.colorEncoding) {
    program = program.encodeColor({
      target: "orderedTrend", field: "group", fieldType: "nominal",
      scale: { palette: factors.palette }
    });
  }
  program = program
    .removePathOrder({ target: "orderedTrend" })
    .encodePathOrder({
      target: "orderedTrend", field: "pathIndex", fieldType: "quantitative",
      order: factors.pathOrder
    });
  return finish(
    program,
    `${context.measure}${context.unit} over the recorded sequence`,
    `How does aggregated ${context.measure} change along the source order by ${context.dimension}?`,
    "Recorded sequence",
    context.measure,
    {
      legend: factors.colorEncoding || factors.dashMode === "field",
      legendTarget: "orderedTrend",
      legendChannels: [
        ...(factors.colorEncoding ? ["color"] : []),
        ...(factors.dashMode === "field" ? ["strokeDash"] : [])
      ]
    }
  );
}

function applyAllCategoryOrders(program, rows, channel, direction) {
  const categories = unique(rows.map(row => row.category));
  return program
    .orderCategories({
      target: "summaryBars", channel, values: categories
    })
    .orderCategories({
      target: "summaryBars", channel, by: "category", direction: "descending"
    })
    .orderCategories({
      target: "summaryBars", channel, by: "count", direction: "ascending"
    })
    .orderCategories({
      target: "summaryBars",
      channel,
      by: { field: "value", aggregate: "sum" },
      direction
    })
    .removeCategoryOrder({ target: "summaryBars", channel })
    .orderCategories({
      target: "summaryBars",
      channel,
      by: { field: "value", aggregate: factorsAggregate(direction) },
      direction
    });
}

function factorsAggregate(direction) {
  return direction === "ascending" ? "min" : "max";
}

function buildOrderedBars(factors) {
  const view = summaryView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const horizontal = factors.orientation === "horizontal";
  const categoryChannel = horizontal ? "y" : "x";
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createBarMark({
      id: "summaryBars", data: "analysisRows",
      opacity: 0.86, stroke: "#ffffff", strokeWidth: 0.6
    })
    [horizontal ? "encodeX" : "encodeY"]({
      target: "summaryBars", field: "value", aggregate: "sum",
      scale: { nice: true, zero: true }
    })
    [horizontal ? "encodeY" : "encodeX"]({
      target: "summaryBars", field: "category", fieldType: "nominal"
    })
    .encodeColor({
      target: "summaryBars", field: "category", fieldType: "nominal",
      layout: "group", scale: { palette: factors.palette }
    })
    .encodeBarWidth({ target: "summaryBars", band: 0.72 })
    .encodeBarWidth({ target: "summaryBars", pixels: 22 })
    .encodeBarWidth({ target: "summaryBars", band: factors.band });
  program = applyAllCategoryOrders(program, view.rows, categoryChannel, factors.direction);
  return finish(
    program,
    `${factors.aggregate} ${context.measure}${context.unit} by ${context.dimension}`,
    `Which ${context.dimension} groups have the largest aggregated ${context.measure}?`,
    horizontal ? context.measure : context.dimension,
    horizontal ? context.dimension : context.measure,
    {
      legend: true,
      ...(horizontal
        ? { yValues: sparseValues(view.rows, "category") }
        : { xValues: sparseValues(view.rows, "category") })
    }
  );
}

function buildArc(factors) {
  const view = summaryView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const minimumShare = Math.min(...view.rows.map(row => row.share).filter(value => value > 0));
  const padAngle = Math.min(2, minimumShare * 360 * factors.padRatio);
  let program = chart()
    .createCanvas(canvas(POLAR_CANVAS))
    .createData({ id: "analysisRows", values: view.rows })
    .createArcMark({
      id: "shareArcs",
      data: "analysisRows",
      innerRadius: factors.innerRadius,
      padAngle,
      ...(factors.colorEncoding ? {} : { fill: "#2563eb" }),
      opacity: 0.88,
      stroke: "#ffffff",
      strokeWidth: 1
    })
    .encodeTheta({
      target: "shareArcs", field: "category", aggregate: "sum", weight: "magnitude"
    })
    .editArcMark({
      target: "shareArcs",
      innerRadius: factors.editedInnerRadius,
      padAngle: padAngle * 0.8,
      ...(factors.colorEncoding ? {} : { fill: "#0f766e" }),
      opacity: factors.opacity,
      stroke: "#ffffff",
      strokeWidth: 1.2
    })
    .editArcMark({ target: "shareArcs", stroke: false })
    .editArcMark({ target: "shareArcs", stroke: "#ffffff", strokeWidth: 1.2 });
  if (factors.colorEncoding) {
    program = program.encodeColor({
      target: "shareArcs", field: "category", fieldType: "nominal",
      scale: { palette: factors.palette }
    });
  }
  if (factors.colorEncoding) {
    program = program.createGuides({
      axes: false,
      grid: false,
      legend: { position: "right", title: context.dimension }
    });
  }
  program = program.createTitle({
      text: `Share of absolute ${factors.aggregate} ${context.measure}${context.unit}`,
      subtitle: `How is total absolute aggregated ${context.measure} distributed across ${context.dimension}?`,
      align: "left"
    });
  return program;
}

function positionScale(reverse = false) {
  return {
    type: "linear", domain: "auto", range: "auto", nice: true,
    zero: false, reverse, clamp: true
  };
}

function intervalParameters(style) {
  if (style === "median-iqr") return { center: "median", extent: "iqr" };
  if (style === "mean-ci-90") return { center: "mean", extent: "ci", level: 0.9 };
  if (style === "mean-ci-95") return { center: "mean", extent: "ci", level: 0.95 };
  return {
    center: "mean",
    extent: style === "mean-stdev" ? "stdev" : "stderr"
  };
}

function statisticalChannels(factors) {
  const parameters = intervalParameters(factors.intervalStyle);
  const position = {
    field: "categoryRank",
    fieldType: "quantitative",
    scale: positionScale(factors.reverse)
  };
  const interval = {
    field: "value",
    ...parameters,
    scale: positionScale(false)
  };
  return factors.orientation === "vertical"
    ? { x: position, y: interval }
    : { x: interval, y: position };
}

function explicitChannels(factors) {
  const position = {
    field: "rank",
    fieldType: "quantitative",
    scale: positionScale(factors.reverse)
  };
  const interval = {
    center: "value",
    lower: "lower",
    upper: "upper",
    scale: positionScale(false)
  };
  return factors.orientation === "vertical"
    ? { x: position, y: interval }
    : { x: interval, y: position };
}

function bandSource(program, rows, channels) {
  return program
    .createPointMark({
      id: "bandObservations", data: "analysisRows", fill: "#64748b", opacity: 0.32,
      stroke: "#ffffff", strokeWidth: 0.4
    })
    .encodeX({
      target: "bandObservations",
      field: channels.x.field ?? channels.x.center,
      fieldType: "quantitative",
      scale: channels.x.scale
    })
    .encodeY({
      target: "bandObservations",
      field: channels.y.field ?? channels.y.center,
      fieldType: "quantitative",
      scale: channels.y.scale
    });
}

function createBand(program, factors, channels) {
  return program.createErrorBand({
    id: "categoryBand",
    target: "bandObservations",
    data: "analysisRows",
    coordinate: "main",
    x: channels.x,
    y: channels.y,
    groupBy: "series",
    fill: "#60a5fa",
    opacity: 0.28,
    curve: factors.curve,
    boundaries: {
      stroke: "#1d4ed8",
      strokeWidth: 1.1,
      strokeDash: factors.dash,
      opacity: 0.88,
      curve: factors.curve
    }
  });
}

function editBandAppearance(program, factors, { statistics } = {}) {
  return program
    .editErrorBand({
      target: "categoryBand",
      fill: "#818cf8",
      opacity: 0.34,
      curve: factors.editCurve,
      ...(statistics === undefined ? {} : { statistics }),
      boundaries: {
        stroke: "#4338ca",
        strokeWidth: 1.4,
        strokeDash: factors.editDash,
        opacity: 0.82,
        curve: factors.editCurve
      }
    })
    .editErrorBandBoundary({
      target: "categoryBand",
      boundary: factors.boundary,
      stroke: "#312e81",
      strokeWidth: 1.8,
      strokeDash: [5, 3],
      opacity: 0.9,
      curve: factors.editCurve
    });
}

function buildStatisticalBand(factors) {
  const view = statisticalBandView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const channels = statisticalChannels(factors);
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows });
  program = bandSource(program, view.rows, channels);
  program = createBand(program, factors, channels);
  const edited = factors.intervalStyle === "median-iqr"
    ? intervalParameters("mean-ci-95")
    : intervalParameters("median-iqr");
  program = editBandAppearance(program, factors, {
    statistics: edited
  });
  return finish(
    program,
    `${context.measure}${context.unit} interval by ${context.dimension}`,
    `How do the center and spread of ${context.measure} differ across ${context.dimension}?`,
    factors.orientation === "vertical" ? `${context.dimension} rank` : context.measure,
    factors.orientation === "vertical" ? context.measure : `${context.dimension} rank`,
    { legend: false }
  );
}

function buildExplicitBand(factors) {
  const view = explicitBandView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const channels = explicitChannels(factors);
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows });
  program = bandSource(program, view.rows, channels);
  program = createBand(program, factors, channels);
  program = editBandAppearance(program, factors);
  return finish(
    program,
    `Interquartile range of ${context.measure}${context.unit} by ${context.dimension}`,
    `Which ${context.dimension} groups have wide or narrow observed interquartile ranges?`,
    factors.orientation === "vertical" ? `${context.dimension} rank` : context.measure,
    factors.orientation === "vertical" ? context.measure : `${context.dimension} rank`,
    { legend: false }
  );
}

function factorsFor(dataset, capability, additions = {}) {
  const fieldPair = realisticFieldPairDomain(dataset, capability);
  if (fieldPair.length === 0) return undefined;
  return frozen({ fieldPair, ...additions });
}

function metadataFor(config, factors) {
  const view = config.view(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  return frozen({
    corpus: "tidytuesday",
    chartFamily: config.family,
    complexity: config.complexity,
    sourceDatasetIds: [factors.dataset],
    title: config.title(context, factors),
    analysisQuestion: config.question(context, factors),
    sourceFields: context.fields,
    provenance: view.provenance,
    dataOperations: view.provenance.transformations.map(item => item.op),
    activeFeatures: config.features
  });
}

function observe(config, program) {
  const direct = new Set(program.trace?.children?.map(node => node.op) ?? []);
  return frozen(config.requiredOperations.every(operation => direct.has(operation))
    ? config.features
    : []);
}

function makeRecipe(config) {
  const datasets = config.datasets ?? DATASETS;
  const first = datasets.find(dataset => config.factorsForDataset(dataset) !== undefined);
  if (first === undefined) throw new Error(`${config.id} has no eligible TidyTuesday dataset.`);
  return frozen({
    id: config.id,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity: config.complexity,
    datasets,
    factors: config.factorsForDataset(first),
    factorsForDataset: config.factorsForDataset,
    build: config.build,
    observe: program => observe(config, program),
    describe: factors => metadataFor(config, factors)
  });
}

const CONFIGS = Object.freeze([
  {
    id: "realistic-maximal-binned-heatmap",
    family: "binned-heatmap",
    complexity: "advanced",
    datasets: DATASETS.filter(dataset => realisticDatasetRoles(dataset).measures.length >= 2),
    factorsForDataset: dataset => factorsFor(dataset, "record", {
      bins: [5, 7, 9], includeEmpty: [false, true], reverse: [false, true],
      palettePath: ["outer", "scale"], palette: PALETTES
    }),
    build: buildBinnedHeatmap,
    view: pairedMeasureView,
    title: context => `${context.measure}${context.unit} versus ${context.secondary}`,
    question: context =>
      `Where are observations concentrated across ${context.measure} and ${context.secondary}?`,
    features: frozen(["feature:maximal-binned-heatmap", "lifecycle:create", "lifecycle:edit"]),
    requiredOperations: frozen(["createHeatmap", "editBin2DData"])
  },
  {
    id: "realistic-maximal-histogram",
    family: "histogram",
    complexity: "intermediate",
    factorsForDataset: dataset => factorsFor(dataset, "histogram", {
      binMode: ["max", "step", "boundaries"], maxBins: [8, 12, 18],
      stack: ["zero", "normalize"], segmented: [true, false],
      palettePath: ["outer", "scale"], nice: [false, true], reverse: [false, true],
      palette: PALETTES
    }),
    build: buildHistogram,
    view: factors => recordView(factors),
    title: context => `Distribution of ${context.measure}${context.unit}`,
    question: context =>
      `How does the observed distribution differ across ${context.dimension}?`,
    features: frozen(["feature:maximal-histogram", "lifecycle:create"]),
    requiredOperations: frozen(["createHistogram"])
  },
  {
    id: "realistic-maximal-density",
    family: "density",
    complexity: "advanced",
    factorsForDataset: dataset => factorsFor(dataset, "distribution", {
      placement: ["baseline", "category", "split"],
      densityChannel: ["x", "y"], kernel: ["gaussian", "epanechnikov", "uniform", "triangular"],
      normalization: ["unit", "count"], steps: [28, 40, 56],
      bandwidthRatio: [0.2, 0.4, 0.7], width: [0.62, 0.78, 0.92],
      widthResolve: ["shared", "independent"], reverse: [false, true], palette: PALETTES
    }),
    build: buildDensity,
    view: densityView,
    title: context => `Density of ${context.measure}${context.unit} by ${context.dimension}`,
    question: context =>
      `Where is ${context.measure} concentrated within each ${context.dimension} group?`,
    features: frozen(["feature:maximal-density", "lifecycle:create", "lifecycle:edit"]),
    requiredOperations: frozen(["encodeDensity", "editDensity"])
  },
  {
    id: "realistic-maximal-point-label-layout",
    family: "annotated-strip",
    complexity: "advanced",
    factorsForDataset: dataset => factorsFor(dataset, "record", {
      shape: POINT_SHAPES, fill: ["#2563eb", "#0f766e", "#7c3aed"],
      opacity: [0.55, 0.72, 0.9], strokeRemoval: [false, true],
      offset: ["pixels", "band"], jitterChannel: ["x", "y"],
      labelAxis: ["x", "y", "both"], labelBounds: ["plot", "canvas"],
      labelPadding: [1, 3, 6], maxDisplacement: [20, 42, 72], leader: [true, false]
    }),
    build: buildPointLabels,
    view: factors => recordView(factors),
    title: context => `${context.measure}${context.unit} observations by ${context.dimension}`,
    question: context =>
      `Which labeled observations are unusual within each ${context.dimension} group?`,
    features: frozen([
      "feature:maximal-point-label-layout", "feature:jitter", "feature:label-layout",
      "lifecycle:create", "lifecycle:edit", "lifecycle:remove"
    ]),
    requiredOperations: frozen([
      "editPointMark", "jitterPoints", "removeJitter", "layoutLabels", "removeLabelLayout"
    ])
  },
  {
    id: "realistic-maximal-ordered-line",
    family: "ordered-line",
    complexity: "advanced",
    factorsForDataset: dataset => factorsFor(dataset, "ordered", {
      aggregate: ["mean", "median", "sum"], pathOrder: ["ascending", "descending"],
      dashMode: ["field", "constant"], dashStyle: DASHES, curve: CURVES,
      strokeWidth: [1.5, 2.5, 4], opacity: [0.55, 0.76, 0.94],
      reverse: [false, true], colorEncoding: [true, false], palette: PALETTES
    }),
    build: buildOrderedLine,
    view: orderedPathView,
    title: context => `${context.measure}${context.unit} over the recorded sequence`,
    question: context =>
      `How does aggregated ${context.measure} change along source order by ${context.dimension}?`,
    features: frozen([
      "feature:maximal-ordered-line", "lifecycle:create", "lifecycle:edit", "lifecycle:remove"
    ]),
    requiredOperations: frozen([
      "encodeStrokeDash", "editLineMark", "encodePathOrder", "removePathOrder"
    ])
  },
  {
    id: "realistic-maximal-ordered-bars",
    family: "ordered-bar",
    complexity: "intermediate",
    factorsForDataset: dataset => factorsFor(dataset, "record", {
      aggregate: ["mean", "median", "sum"], orientation: ["vertical", "horizontal"],
      direction: ["ascending", "descending"], band: [0.5, 0.7, 0.86], palette: PALETTES
    }),
    build: buildOrderedBars,
    view: summaryView,
    title: (context, factors) =>
      `${factors.aggregate} ${context.measure}${context.unit} by ${context.dimension}`,
    question: context =>
      `Which ${context.dimension} groups have the largest aggregated ${context.measure}?`,
    features: frozen([
      "feature:maximal-ordered-bar", "lifecycle:create", "lifecycle:edit", "lifecycle:remove"
    ]),
    requiredOperations: frozen([
      "encodeBarWidth", "orderCategories", "removeCategoryOrder"
    ])
  },
  {
    id: "realistic-maximal-arc",
    family: "donut",
    complexity: "intermediate",
    factorsForDataset: dataset => factorsFor(dataset, "record", {
      aggregate: ["mean", "median", "sum"], innerRadius: [0, 0.38, 0.62],
      editedInnerRadius: [0.18, 0.5, 0.72], padRatio: [0.04, 0.1, 0.18],
      opacity: [0.58, 0.78, 0.96], colorEncoding: [true, false], palette: PALETTES
    }),
    build: buildArc,
    view: summaryView,
    title: (context, factors) =>
      `Share of absolute ${factors.aggregate} ${context.measure}${context.unit}`,
    question: context =>
      `How is total absolute aggregated ${context.measure} distributed across ${context.dimension}?`,
    features: frozen(["feature:maximal-arc", "lifecycle:create", "lifecycle:edit"]),
    requiredOperations: frozen(["createArcMark", "editArcMark"])
  },
  {
    id: "realistic-maximal-statistical-band",
    family: "statistical-error-band",
    complexity: "advanced",
    factorsForDataset: dataset => factorsFor(dataset, "interval", {
      orientation: ["vertical", "horizontal"],
      intervalStyle: ["mean-stderr", "mean-stdev", "mean-ci-90", "mean-ci-95", "median-iqr"],
      curve: CURVES, editCurve: [...CURVES].reverse(), dash: DASHES,
      editDash: [...DASHES].reverse(), boundary: ["both", "lower", "upper"],
      reverse: [false, true]
    }),
    build: buildStatisticalBand,
    view: statisticalBandView,
    title: context => `${context.measure}${context.unit} interval by ${context.dimension}`,
    question: context =>
      `How do the center and spread of ${context.measure} differ across ${context.dimension}?`,
    features: frozen([
      "feature:maximal-statistical-band", "lifecycle:create", "lifecycle:edit"
    ]),
    requiredOperations: frozen([
      "createErrorBand", "editErrorBand", "editErrorBandBoundary"
    ])
  },
  {
    id: "realistic-maximal-explicit-band",
    family: "explicit-error-band",
    complexity: "advanced",
    factorsForDataset: dataset => factorsFor(dataset, "interval", {
      aggregate: ["mean", "median", "sum"], orientation: ["vertical", "horizontal"],
      curve: CURVES, editCurve: [...CURVES].reverse(), dash: DASHES,
      editDash: [...DASHES].reverse(), boundary: ["both", "lower", "upper"],
      reverse: [false, true]
    }),
    build: buildExplicitBand,
    view: explicitBandView,
    title: context => `Interquartile range of ${context.measure}${context.unit}`,
    question: context =>
      `Which ${context.dimension} groups have wide or narrow interquartile ranges?`,
    features: frozen(["feature:maximal-explicit-band", "lifecycle:create", "lifecycle:edit"]),
    requiredOperations: frozen([
      "createErrorBand", "editErrorBand", "editErrorBandBoundary"
    ])
  }
]);

export const REALISTIC_DATA_MARK_SCENARIO_RECIPES = Object.freeze(
  CONFIGS.map(makeRecipe)
);

export const REALISTIC_DATA_MARK_REQUIRED_FEATURES = Object.freeze(
  unique(CONFIGS.flatMap(config => config.features)).sort()
);

export const REALISTIC_DATA_MARK_COUNTS = Object.freeze({
  recipes: CONFIGS.length,
  intermediate: CONFIGS.filter(config => config.complexity === "intermediate").length,
  advanced: CONFIGS.filter(config => config.complexity === "advanced").length
});
