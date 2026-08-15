import { createHash } from "node:crypto";

import { chart } from "../../../src/index.js";
import { measureTextWidth } from "../../../src/core/textMetrics.js";

import {
  isRealisticIneligibleDataError,
  realisticDatasetIds,
  realisticFieldPairDomain,
  realisticOrderedView,
  realisticRecordView,
  realisticSourceFields,
  realisticSummaryView
} from "./realistic-data.js";
import {
  releaseTidyTuesdaySourceCache,
  tidyTuesdaySourceEntries
} from "../datasets/tidytuesday.js";
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
const SCALE_PATH_PALETTES = Object.freeze({
  tableau10: "category20",
  set2: "pastel2",
  dark2: "accent",
  viridis: "observable10"
});
const STATIC_PALETTE_COLORS = Object.freeze({
  tableau10: "#4c78a8",
  set2: "#66c2a5",
  dark2: "#1b9e77",
  viridis: "#3b528b"
});
const DENSITY_CATEGORY_PADDING_INNER = 0.08;
const DENSITY_CATEGORY_PADDING_OUTER = 0.06;
const DENSITY_AXIS_LABEL_GAP = 16;
const DENSITY_AXIS_LABEL_STYLE = Object.freeze({
  fontSize: 12,
  fontFamily: "sans-serif",
  fontWeight: "normal"
});
const CURVES = Object.freeze([
  "linear", "step", "step-before", "step-after", "basis", "cardinal",
  "monotone", "natural"
]);
const BAND_CURVES_WITHOUT_MONOTONE = Object.freeze(
  CURVES.filter(curve => curve !== "monotone")
);
const DASHES = Object.freeze(["solid", "dashed", "dotted", "dashdot"]);
const POINT_SHAPES = Object.freeze([
  "circle", "cross", "diamond", "hexagon", "plus", "square", "star",
  "triangle-down", "triangle-left", "triangle-right", "triangle-up", "wye"
]);
const DENSITY_PLACEMENTS = frozen([
  { id: "baseline", type: "baseline" },
  { id: "category-compact-shared", type: "category", width: 0.62, resolve: "shared" },
  { id: "category-balanced-independent", type: "category", width: 0.78, resolve: "independent" },
  { id: "category-wide-shared", type: "category", width: 0.92, resolve: "shared" },
  { id: "split-compact-independent", type: "split", width: 0.62, resolve: "independent" },
  { id: "split-balanced-shared", type: "split", width: 0.78, resolve: "shared" },
  { id: "split-wide-independent", type: "split", width: 0.92, resolve: "independent" }
]);
const JITTER_VARIANTS = frozen([
  { id: "horizontal-pixels", channel: "x", maxOffset: { pixels: 5 } },
  { id: "vertical-pixels", channel: "y", maxOffset: { pixels: 5 } },
  { id: "vertical-band", channel: "y", maxOffset: { band: 0.16 } }
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

function paletteForPath(palette, path) {
  if (path === "outer") return palette;
  const mapped = SCALE_PATH_PALETTES[palette];
  if (mapped === undefined) throw new Error(`Missing scale-path palette for "${palette}".`);
  return mapped;
}

function staticPaletteColor(palette) {
  const color = STATIC_PALETTE_COLORS[palette];
  if (color === undefined) throw new Error(`Missing static color for palette "${palette}".`);
  return color;
}

function dashRange(first) {
  const index = DASHES.indexOf(first);
  if (index < 0) throw new Error(`Unknown dash style "${first}".`);
  return [...DASHES.slice(index), ...DASHES.slice(0, index)];
}

function scalar(value) {
  return value === null || value === undefined || value === "" ? undefined : value;
}

function stablePairedSelection(entries, bindings, limit = 160) {
  if (entries.length <= limit) return entries;
  const selected = new Set([entries[0], entries.at(-1)]);
  for (const field of [bindings.measure, bindings.secondaryMeasure]) {
    const ordered = [...entries].sort((left, right) =>
      left.row[field] - right.row[field] || left.sourceRowIndex - right.sourceRowIndex
    );
    selected.add(ordered[0]);
    selected.add(ordered.at(-1));
  }
  const categories = new Set();
  for (const entry of entries) {
    const category = String(entry.row[bindings.dimension]);
    if (categories.has(category)) continue;
    categories.add(category);
    selected.add(entry);
  }
  if (selected.size > limit) {
    throw new Error("Paired-measure sample cannot retain every required witness row.");
  }
  for (let index = 0; index < limit && selected.size < limit; index += 1) {
    selected.add(entries[Math.round(index * (entries.length - 1) / (limit - 1))]);
  }
  return [...selected].sort((left, right) => left.sourceRowIndex - right.sourceRowIndex);
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

function robustPaddedExtent(rows, field, ratio = 0.025) {
  const values = rows.map(row => row[field]).filter(Number.isFinite);
  const minimum = quantile(values, 0.05);
  const maximum = quantile(values, 0.95);
  if (!(minimum < maximum)) return paddedExtent(rows, field, ratio);
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

function displayedSample(base, displayedRowCount) {
  if (base.sample === undefined) return undefined;
  return frozen({ ...base.sample, displayedRowCount });
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

function chartCopy(title, question, view) {
  if (view.sample === undefined) return { title, question };
  const sample = `deterministic stratified sample (n=${view.sample.displayedRowCount}/` +
    `${view.sample.eligibleRowCount} eligible)`;
  return {
    title: `${title} — ${sample}`,
    question: `${question} This chart uses a ${sample}.`
  };
}

function finish(program, title, question, xTitle, yTitle, options = {}, view = {}) {
  const copy = chartCopy(title, question, view);
  return program
    .createGuides(guides(xTitle, yTitle, options))
    .createTitle({ text: copy.title, subtitle: copy.question, align: "left" });
}

function recordView(factors, capability = "record", options = {}) {
  return realisticRecordView(factors.dataset, {
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    includeSecondaryMeasure: false,
    includeSecondaryDimension: false,
    deriveSubgroup: false,
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
  const base = recordView(factors, "record", {
    includeSecondaryMeasure: true,
    groupLimit: 24
  });
  const bindings = base.provenance.fieldBindings;
  const retainedCategories = new Set(base.rows.map(row => String(row.category)));
  const eligible = tidyTuesdaySourceEntries(factors.dataset).filter(({ row }) =>
    Number.isFinite(row[bindings.measure]) &&
    Number.isFinite(row[bindings.secondaryMeasure]) &&
    scalar(row[bindings.dimension]) !== undefined &&
    retainedCategories.has(String(row[bindings.dimension]))
  );
  const selected = stablePairedSelection(eligible, bindings);
  const rows = selected.map(({ row, sourceRowIndex }) => {
    const category = row[bindings.dimension];
    const identifier = bindings.identifier === undefined ? undefined : scalar(row[bindings.identifier]);
    return {
      key: identifier === undefined
        ? `source-row-${sourceRowIndex}`
        : `${identifier}-${sourceRowIndex}`,
      sourceRowIndex,
      value: row[bindings.measure],
      secondary: row[bindings.secondaryMeasure],
      category,
      label: scalar(row[bindings.label]) ?? category,
      ...(bindings.temporal === undefined || row[bindings.temporal] === null
        ? {}
        : { time: row[bindings.temporal] }),
      ...(bindings.order === undefined || row[bindings.order] === null
        ? {}
        : { orderValue: row[bindings.order] })
    };
  });
  if (
    rows.length < 12 ||
    new Set(rows.map(row => row.value)).size < 3 ||
    new Set(rows.map(row => row.secondary)).size < 3
  ) {
    throw new Error(`${factors.dataset} requires two varying paired measures.`);
  }
  return frozen({
    rows,
    sample: frozen({
      method: "deterministic-stratified-witness-sample",
      eligibleRowCount: eligible.length,
      displayedRowCount: rows.length,
      limit: 160,
      strata: frozen([bindings.dimension])
    }),
    provenance: selectedProvenance(
      { ...base.provenance, transformations: [] },
      rows,
      [
        frozen({ op: "filter-valid", fields: [bindings.measure, bindings.dimension] }),
        frozen({ op: "top-groups", field: bindings.dimension, limit: 24 }),
        frozen({
          op: "filter-paired-finite-measures",
          fields: [bindings.measure, bindings.secondaryMeasure],
          eligibleRowCount: eligible.length
        }),
        frozen({
          op: "witness-preserving-even-sample",
          limit: 160,
          eligibleRowCount: eligible.length,
          displayedRowCount: rows.length,
          strata: [bindings.dimension],
          witnesses: [
            "first", "last", "measure-min", "measure-max",
            "secondary-measure-min", "secondary-measure-max", "retained-dimension"
          ]
        }),
        frozen({ op: "project", bindings })
      ]
    )
  });
}

function densityView(factors) {
  const placementType = factors.placement.type;
  const options = {
    groupLimit: 4,
    subgroupLimit: placementType === "split" ? 2 : 4,
    includeSecondaryDimension: placementType === "split",
    deriveSubgroup: false,
    minimumRetainedGroupRows: 5,
    requireRetainedGroupVariation: true
  };
  let base;
  const selectRows = view => {
    let rows = view.rows;
    const transformations = [];
    let splitDomain;
    if (placementType === "split") {
      const counts = new Map();
      for (const row of rows) {
        counts.set(row.subgroup, (counts.get(row.subgroup) ?? 0) + 1);
      }
      splitDomain = [...counts]
        .sort((left, right) =>
          right[1] - left[1] || String(left[0]).localeCompare(String(right[0]))
        )
        .slice(0, 2)
        .map(([value]) => value);
      if (splitDomain.length !== 2) return undefined;
      rows = rows.filter(row => splitDomain.includes(row.subgroup));
      transformations.push(frozen({
        op: "top-two-density-split-groups",
        field: view.provenance.fieldBindings.secondaryDimension ?? "median-split",
        values: splitDomain
      }));
    }
    const groupedRows = new Map();
    for (const row of rows) {
      if (!groupedRows.has(row.category)) groupedRows.set(row.category, []);
      groupedRows.get(row.category).push(row);
    }
    const usableGroups = new Set([...groupedRows]
      .filter(([, values]) =>
        values.length >= 5 && new Set(values.map(row => row.value)).size > 1
      )
      .map(([group]) => group));
    rows = rows.filter(row => usableGroups.has(row.category));
    return rows.length < 10 || usableGroups.size < 2
      ? undefined
      : { rows, splitDomain, transformations };
  };
  let selected;
  try {
    base = recordView(factors, "distribution", options);
    selected = selectRows(base);
  } catch (error) {
    if (placementType !== "split" || !isRealisticIneligibleDataError(error)) throw error;
  }
  if (selected === undefined && placementType === "split") {
    base = recordView(factors, "distribution", {
      ...options,
      includeSecondaryDimension: false,
      deriveSubgroup: true
    });
    selected = selectRows(base);
  }
  if (selected === undefined) {
    throw new Error(`${factors.dataset} needs two varying density groups.`);
  }
  return frozen({
    rows: selected.rows,
    splitDomain: selected.splitDomain,
    sample: displayedSample(base, selected.rows.length),
    provenance: selectedProvenance(
      base.provenance,
      selected.rows,
      selected.transformations
    )
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
    sample: displayedSample(base, rows.length),
    provenance: selectedProvenance(base.provenance, rows, [
      frozen({ op: "stable-category-rank", field: base.provenance.fieldBindings.dimension }),
      frozen({ op: "constant-series", as: "series", value: "All retained categories" })
    ])
  });
}

function explicitBandView(factors) {
  const base = summaryView({ ...factors, aggregate: "median" });
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
  const copy = chartCopy(
    `${context.measure}${context.unit} versus ${context.secondary}`,
    `Where are observations concentrated across ${context.measure} and ${context.secondary}?`,
    view
  );
  const xExtent = paddedExtent(view.rows, "secondary");
  const yExtent = paddedExtent(view.rows, "value");
  const editedX = paddedExtent(view.rows, "secondary", 0.05);
  const editedY = paddedExtent(view.rows, "value", 0.05);
  const palette = paletteForPath(factors.palette, factors.palettePath);
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
        ...(factors.palettePath === "outer" ? { palette } : {}),
        scale: {
          type: "sequential", domain: "auto",
          reverse: factors.reverse, clamp: true, interpolate: "lab",
          ...(factors.palettePath === "scale" ? { palette } : {})
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
        x0: "heatmapLeft",
        x1: "heatmapRight",
        y0: "heatmapBottom",
        y1: "heatmapTop",
        count: "heatmapCount",
        members: "heatmapMembers"
      }
    })
    .createTitle({
      text: copy.title,
      subtitle: copy.question,
      align: "left"
    });
}

function histogramBins(rows, mode, requested) {
  const values = rows.map(row => row.value).filter(Number.isFinite);
  if (mode === "max") return { maxBins: requested };
  if (mode === "step") {
    const extent = Math.max(...values) - Math.min(...values);
    return { binStep: extent / Math.max(4, requested) };
  }
  const boundaryCount = Math.max(5, requested);
  const boundaries = unique(Array.from({ length: boundaryCount + 1 }, (_, index) =>
    quantile(values, index / boundaryCount)
  ))
    .sort((left, right) => left - right);
  if (boundaries.length < 2) throw new Error("Histogram boundaries must vary.");
  return { binBoundaries: boundaries };
}

function buildHistogram(factors) {
  const view = recordView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const question = `How does the observed distribution differ across ${context.dimension}?`;
  const palette = paletteForPath(factors.palette, factors.palettePath);
  const copy = chartCopy(
    `Distribution of ${context.measure}${context.unit}`,
    question,
    view
  );
  return chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createHistogram({
      id: "observedHistogram",
      data: "analysisRows",
      coordinate: "main",
      field: "value",
      ...histogramBins(view.rows, factors.binMode, factors.maxBins),
      stack: factors.stack,
      xScale: {
        type: "symlog", constant: 1, domain: "auto", range: "auto",
        nice: factors.nice, zero: false, reverse: factors.reverse, clamp: true
      },
      yScale: {
        type: "linear", domain: "auto", range: "auto", nice: true,
        zero: true, reverse: false, clamp: true
      },
      color: {
        field: "category",
        fieldType: "nominal",
        layout: factors.stack === "normalize" ? "fill" : "stack",
        ...(factors.palettePath === "outer" ? { palette } : {}),
        scale: {
          type: "ordinal", domain: "auto",
          ...(factors.palettePath === "scale" ? { palette } : {})
        }
      },
      bar: {
        opacity: 0.88, stroke: "#ffffff", strokeWidth: 0.6
      },
      guides: {
        axes: {
          x: {
            ticksAndLabels: { count: 2, labels: { format: ".2e", fontSize: 8 } },
            title: { text: context.measure }
          },
          y: {
            ticksAndLabels: { count: 5 },
            title: { text: factors.stack === "normalize" ? "Within-bin share" : "Observation count" }
          }
        },
        grid: { horizontal: true, vertical: false },
        legend: { position: "right", title: context.dimension }
      }
    })
    .createTitle({
      text: copy.title,
      subtitle: copy.question,
      align: "left"
    });
}

function densityPlacement(factors, view) {
  if (factors.placement.type === "baseline") return { type: "baseline" };
  const width = { band: factors.placement.width, resolve: factors.placement.resolve };
  if (factors.placement.type === "split") {
    return {
      type: "category",
      width,
      split: { field: "subgroup", domain: view.splitDomain },
      scale: {
        type: "band", domain: "auto", range: "auto", align: 0.5,
        padding: 0.12,
        paddingInner: DENSITY_CATEGORY_PADDING_INNER,
        paddingOuter: DENSITY_CATEGORY_PADDING_OUTER,
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
      padding: 0.12,
      paddingInner: DENSITY_CATEGORY_PADDING_INNER,
      paddingOuter: DENSITY_CATEGORY_PADDING_OUTER,
      reverse: factors.reverse
    }
  };
}

function densityCanvas(factors, view) {
  const base = canvas();
  if (factors.placement.type === "baseline" || factors.densityChannel !== "x") {
    return base;
  }
  const labels = unique(view.rows.map(row => String(row.category)));
  const widest = Math.max(...labels.map(label =>
    measureTextWidth(label, DENSITY_AXIS_LABEL_STYLE)
  ));
  const bandDenominator = Math.max(
    1,
    labels.length - DENSITY_CATEGORY_PADDING_INNER +
      DENSITY_CATEGORY_PADDING_OUTER * 2
  );
  const requiredPlotWidth = bandDenominator * (widest + DENSITY_AXIS_LABEL_GAP);
  return {
    ...base,
    width: Math.max(
      base.width,
      Math.ceil(base.margin.left + requiredPlotWidth + base.margin.right)
    )
  };
}

function buildDensity(factors) {
  const view = densityView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const extent = robustPaddedExtent(view.rows, "value");
  const values = view.rows.map(row => row.value);
  const range = Math.max(...values) - Math.min(...values);
  const interquartileRange = quantile(values, 0.75) - quantile(values, 0.25);
  const spread = interquartileRange > 0 ? interquartileRange : range / 4;
  const bandwidth = Math.max(range / 1_000, spread * factors.bandwidthRatio);
  const placement = densityPlacement(factors, view);
  const baseline = factors.placement.type === "baseline";
  let program = chart()
    .createCanvas(densityCanvas(factors, view))
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
  const editedKernel = ["gaussian", "epanechnikov", "uniform", "triangular"]
    .at((["gaussian", "epanechnikov", "uniform", "triangular"]
      .indexOf(factors.kernel) + 1) % 4);
  program = program.editDensity({
    target: "densityArea",
    source: "analysisRows",
    field: "value",
    groupBy: "category",
    bandwidth: bandwidth * 1.15,
    extent,
    steps: factors.steps + 4,
    kernel: editedKernel,
    normalization: factors.normalization === "unit" ? "count" : "unit",
    placement: editedPlacement
  });
  return finish(
    program,
    `Density of ${context.measure}${context.unit} by ${context.dimension}`,
    `Where is ${context.measure} concentrated within each ${context.dimension} group?`,
    factors.densityChannel === "x" && !baseline ? context.dimension : context.measure,
    factors.densityChannel === "x" && !baseline ? context.measure : "Estimated density",
    { legend: true },
    view
  );
}

function buildPointLabels(factors) {
  const view = recordView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const stride = Math.max(1, Math.ceil(view.rows.length / 48));
  const selectedLabels = new Map();
  for (const category of unique(view.rows.map(row => row.category))) {
    const categoryRows = view.rows.filter(row => row.category === category)
      .sort((left, right) => left.value - right.value || left.sourceRowIndex - right.sourceRowIndex);
    for (const row of [categoryRows[0], categoryRows.at(-1)]) {
      selectedLabels.set(row.sourceRowIndex, row);
    }
  }
  for (const [index, row] of view.rows.entries()) {
    if (selectedLabels.size >= 48) break;
    if (index % stride === 0) selectedLabels.set(row.sourceRowIndex, row);
  }
  const labelRows = [...selectedLabels.values()]
    .sort((left, right) => left.sourceRowIndex - right.sourceRowIndex)
    .slice(0, 48);
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
    program = program.editPointMark({ target: "observations", stroke: false });
  }
  program = program
    .jitterPoints({
      target: "observations",
      channel: factors.jitter.channel,
      maxOffset: factors.jitter.maxOffset,
      seed: `observations-${factors.dataset}`,
      key: "key"
    })
    .removeJitter({ target: "observations" })
    .jitterPoints({
      target: "observations",
      channel: factors.jitter.channel,
      maxOffset: factors.jitter.maxOffset,
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
      dx: factors.labelBounds === "canvas" ? 11 : 7,
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
      leader: factors.leader
        ? {
            stroke: "#94a3b8", strokeWidth: 0.8, strokeDash: [3, 2], opacity: 0.75
          }
        : false
    });
  return finish(
    program,
    `${context.measure}${context.unit} observations by ${context.dimension}`,
    `Which labeled observations are unusual within each ${context.dimension} group?`,
    context.measure,
    context.dimension,
    { legend: false, yValues: sparseValues(view.rows, "category") },
    view
  );
}

function buildOrderedLine(factors) {
  const view = orderedPathView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const staticStroke = staticPaletteColor(factors.palette);
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createLineMark({
      id: "orderedTrend",
      data: "analysisRows",
      ...(factors.colorEncoding ? {} : { stroke: staticStroke }),
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
          range: dashRange(factors.dashStyle)
        }
      })
    : program.encodeStrokeDash({
        target: "orderedTrend",
        value: factors.dashStyle
      });
  program = program
    .editLineMark({
      target: "orderedTrend",
      ...(factors.colorEncoding ? {} : { stroke: staticStroke }),
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
    `How does aggregated ${context.measure} change along source order by ${context.dimension}?`,
    "Recorded sequence",
    context.measure,
    {
      legend: factors.colorEncoding || factors.dashMode === "field",
      legendTarget: "orderedTrend",
      legendChannels: [
        ...(factors.colorEncoding ? ["color"] : []),
        ...(factors.dashMode === "field" ? ["strokeDash"] : [])
      ]
    },
    view
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
        ? { yValues: sparseValues(view.rows, "category", 4) }
        : { xValues: sparseValues(view.rows, "category", 2) })
    },
    view
  );
}

function buildArc(factors) {
  const view = summaryView(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const copy = chartCopy(
    `Share of absolute ${factors.aggregate} ${context.measure}${context.unit}`,
    `How is total absolute aggregated ${context.measure} distributed across ${context.dimension}?`,
    view
  );
  const minimumShare = Math.min(...view.rows.map(row => row.share).filter(value => value > 0));
  const padAngle = Math.min(12, minimumShare * 360 * factors.padRatio);
  const finalInnerRadius = factors.innerRadius * 0.3 + factors.editedInnerRadius * 0.7;
  const staticFill = staticPaletteColor(factors.palette);
  let program = chart()
    .createCanvas(canvas(POLAR_CANVAS))
    .createData({ id: "analysisRows", values: view.rows })
    .createArcMark({
      id: "shareArcs",
      data: "analysisRows",
      innerRadius: factors.innerRadius,
      padAngle,
      ...(factors.colorEncoding ? {} : { fill: staticFill }),
      opacity: 0.88,
      stroke: "#ffffff",
      strokeWidth: 1
    })
    .encodeTheta({
      target: "shareArcs", field: "category", aggregate: "sum", weight: "magnitude"
    })
    .editArcMark({
      target: "shareArcs",
      innerRadius: finalInnerRadius,
      padAngle: padAngle * 0.8,
      ...(factors.colorEncoding ? {} : { fill: staticFill }),
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
      text: copy.title,
      subtitle: copy.question,
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
    })
    .editErrorBandBoundary({
      target: "categoryBand",
      boundary: "lower",
      stroke: factors.boundary === "lower" || factors.boundary === "both"
        ? "#312e81"
        : "#6366f1",
      strokeWidth: factors.boundary === "lower" || factors.boundary === "both" ? 1.8 : 1.2,
      strokeDash: factors.dash,
      opacity: factors.boundary === "lower" || factors.boundary === "both" ? 0.9 : 0.72,
      curve: factors.curve
    })
    .editErrorBandBoundary({
      target: "categoryBand",
      boundary: "upper",
      stroke: factors.boundary === "upper" || factors.boundary === "both"
        ? "#312e81"
        : "#6366f1",
      strokeWidth: factors.boundary === "upper" || factors.boundary === "both" ? 1.8 : 1.2,
      strokeDash: factors.editDash,
      opacity: factors.boundary === "upper" || factors.boundary === "both" ? 0.9 : 0.72,
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
  program = editBandAppearance(program, factors, {
    statistics: intervalParameters(factors.intervalStyle)
  });
  return finish(
    program,
    `${context.measure}${context.unit} interval by ${context.dimension}`,
    `How do the center and spread of ${context.measure} differ across ${context.dimension}?`,
    factors.orientation === "vertical" ? `${context.dimension} rank` : context.measure,
    factors.orientation === "vertical" ? context.measure : `${context.dimension} rank`,
    { legend: false },
    view
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
    { legend: false },
    view
  );
}

const densityFieldPairCache = new Map();

function densityFieldPairs(dataset) {
  if (densityFieldPairCache.has(dataset)) return densityFieldPairCache.get(dataset);
  const pairs = realisticFieldPairDomain(dataset, "distribution").filter(fieldPair => {
    const view = recordView({ dataset, fieldPair }, "distribution", { groupLimit: 4 });
    const bindings = view.provenance.fieldBindings;
    const retainedCategories = new Set(view.rows.map(row => String(row.category)));
    const values = tidyTuesdaySourceEntries(dataset).flatMap(({ row }) =>
      Number.isFinite(row[bindings.measure]) &&
      retainedCategories.has(String(scalar(row[bindings.dimension])))
        ? [row[bindings.measure]]
        : []
    );
    return quantile(values, 0.25) < quantile(values, 0.75);
  });
  const result = frozen(pairs);
  densityFieldPairCache.set(dataset, result);
  return result;
}

function densityFactorsFor(dataset) {
  const fieldPair = densityFieldPairs(dataset);
  if (fieldPair.length === 0) return undefined;
  return frozen({
    fieldPair,
    placement: DENSITY_PLACEMENTS,
    densityChannel: ["x", "y"],
    kernel: ["gaussian", "epanechnikov", "uniform", "triangular"],
    normalization: ["unit", "count"],
    steps: [28, 40, 56],
    bandwidthRatio: [0.2, 0.4, 0.7],
    reverse: [false, true],
    palette: PALETTES
  });
}

function factorsFor(dataset, capability, additions = {}) {
  const fieldPair = realisticFieldPairDomain(dataset, capability);
  if (fieldPair.length === 0) return undefined;
  return frozen({ fieldPair, ...additions });
}

function arcFactorsFor(dataset) {
  const domains = factorsFor(dataset, "record", {
    aggregate: ["mean", "median", "sum"], innerRadius: [0, 0.38, 0.62],
    editedInnerRadius: [0.18, 0.5, 0.72], padRatio: [0.008, 0.018, 0.03],
    opacity: [0.58, 0.78, 0.96], colorEncoding: [true, false], palette: PALETTES
  });
  if (domains === undefined) return undefined;
  const fieldPair = domains.fieldPair.filter(binding => domains.aggregate.every(aggregate =>
    summaryView({ dataset, fieldPair: binding, aggregate }).rows
      .some(row => row.magnitude > 0)
  ));
  return fieldPair.length === 0 ? undefined : frozen({ ...domains, fieldPair: frozen(fieldPair) });
}

function metadataFor(config, factors) {
  const view = config.view(factors);
  const context = sourceContext(factors.dataset, view.provenance);
  const copy = chartCopy(
    config.title(context, factors),
    config.question(context, factors),
    view
  );
  return frozen({
    corpus: "tidytuesday",
    chartFamily: config.family,
    complexity: config.complexity,
    sourceDatasetIds: [factors.dataset],
    title: copy.title,
    analysisQuestion: copy.question,
    ...(view.sample === undefined ? {} : { sampling: view.sample }),
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

function traceNodes(program, operation, target) {
  return (program.trace?.children ?? []).filter(node =>
    node.op === operation && (target === undefined || node.args?.target === target)
  );
}

function lastTrace(program, operation, target) {
  return traceNodes(program, operation, target).at(-1)?.args;
}

function firstGraphicProperties(program, id) {
  return program.graphicSpec?.objects?.[id]?.items?.[0]?.properties;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function factorIsObserved(config, program, factors, factor) {
  const layer = id => program.semanticSpec.layers.find(item => item.id === id);
  const title = program.semanticSpec.title?.text ?? "";
  const analysisRows = program.semanticSpec.datasets.find(dataset => dataset.id === "analysisRows");
  if (factor === "fieldPair") {
    return Array.isArray(analysisRows?.values) && analysisRows.values.length >= 2 && title.length > 0;
  }
  if (config.id === "realistic-maximal-binned-heatmap") {
    const created = lastTrace(program, "createHeatmap");
    const edited = lastTrace(program, "editBin2DData", "pairedHeatmapBin2DData");
    const palette = paletteForPath(factors.palette, factors.palettePath);
    if (factor === "bins") {
      return edited?.bins?.x === factors.bins + 1 && edited?.bins?.y === factors.bins;
    }
    if (factor === "includeEmpty") return edited?.includeEmpty === !factors.includeEmpty;
    if (factor === "reverse") {
      return created?.x?.scale?.reverse === factors.reverse &&
        created?.color?.scale?.reverse === factors.reverse;
    }
    if (factor === "palettePath" || factor === "palette") {
      return factors.palettePath === "outer"
        ? created?.color?.palette === palette && created?.color?.scale?.palette === undefined
        : created?.color?.palette === undefined && created?.color?.scale?.palette === palette;
    }
  }
  if (config.id === "realistic-maximal-histogram") {
    const created = lastTrace(program, "createHistogram");
    if (factor === "binMode") {
      return factors.binMode === "max" ? created?.maxBins !== undefined
        : factors.binMode === "step" ? created?.binStep !== undefined
          : created?.binBoundariesCount >= 2;
    }
    if (factor === "maxBins") {
      return factors.binMode === "max" ? created?.maxBins === factors.maxBins
        : factors.binMode === "step" ? created?.binStep > 0
          : created?.binBoundariesCount >= 2;
    }
    if (factor === "stack") return created?.stack === factors.stack;
    if (factor === "nice") return created?.xScale?.nice === factors.nice;
    if (factor === "reverse") return created?.xScale?.reverse === factors.reverse;
    if (factor === "palettePath" || factor === "palette") {
      const palette = paletteForPath(factors.palette, factors.palettePath);
      return factors.palettePath === "outer"
        ? created?.color?.palette === palette && created?.color?.scale?.palette === undefined
        : created?.color?.palette === undefined && created?.color?.scale?.palette === palette;
    }
  }
  if (config.id === "realistic-maximal-density") {
    const encoded = lastTrace(program, "encodeDensity", "densityArea");
    const edited = lastTrace(program, "editDensity", "densityArea");
    const colored = lastTrace(program, "encodeColor", "densityArea");
    const kernels = ["gaussian", "epanechnikov", "uniform", "triangular"];
    const expectedKernel = kernels[(kernels.indexOf(factors.kernel) + 1) % kernels.length];
    if (factor === "placement") {
      const expectedType = factors.placement.type === "split"
        ? "category"
        : factors.placement.type;
      return edited?.placement?.type === expectedType &&
        (factors.placement.type === "baseline" || (
          edited?.placement?.width?.band === factors.placement.width &&
          edited?.placement?.width?.resolve === factors.placement.resolve &&
          (factors.placement.type !== "split" || edited?.placement?.split?.field === "subgroup")
        ));
    }
    if (factor === "densityChannel") return encoded?.densityChannel === factors.densityChannel;
    if (factor === "kernel") return edited?.kernel === expectedKernel;
    if (factor === "normalization") {
      return edited?.normalization === (factors.normalization === "unit" ? "count" : "unit");
    }
    if (factor === "steps") return edited?.steps === factors.steps + 4;
    if (factor === "bandwidthRatio") {
      return encoded?.bandwidth > 0 && edited?.bandwidth === encoded.bandwidth * 1.15;
    }
    if (factor === "reverse") return encoded?.valueScale?.reverse === factors.reverse;
    if (factor === "palette") return colored?.scale?.palette === factors.palette;
  }
  if (config.id === "realistic-maximal-point-label-layout") {
    const pointEdits = traceNodes(program, "editPointMark", "observations");
    const styled = pointEdits.find(args => args.args?.shape !== undefined)?.args;
    const jittered = lastTrace(program, "jitterPoints", "observations");
    const layout = lastTrace(program, "layoutLabels", "observationLabels");
    const point = firstGraphicProperties(program, "observations");
    if (["shape", "fill", "opacity"].includes(factor)) return styled?.[factor] === factors[factor];
    if (factor === "strokeRemoval") {
      return factors.strokeRemoval
        ? point?.strokeWidth === 0 ||
          (point?.stroke === undefined && point?.strokeWidth === undefined)
        : point?.stroke === "#ffffff";
    }
    if (factor === "jitter") {
      return jittered?.channel === factors.jitter.channel &&
        sameValue(jittered?.maxOffset, factors.jitter.maxOffset);
    }
    if (factor === "labelAxis") return layout?.axis === factors.labelAxis;
    if (factor === "labelBounds") return layout?.bounds === factors.labelBounds;
    if (factor === "labelPadding") return layout?.padding === factors.labelPadding;
    if (factor === "maxDisplacement") {
      return layout?.maxDisplacement === factors.maxDisplacement;
    }
    if (factor === "leader") return factors.leader ? layout?.leader !== false : layout?.leader === false;
  }
  if (config.id === "realistic-maximal-ordered-line") {
    const trend = layer("orderedTrend");
    const lineEdit = lastTrace(program, "editLineMark", "orderedTrend");
    const order = lastTrace(program, "encodePathOrder", "orderedTrend");
    const dash = lastTrace(program, "encodeStrokeDash", "orderedTrend");
    const color = lastTrace(program, "encodeColor", "orderedTrend");
    const graphic = firstGraphicProperties(program, "orderedTrend");
    if (factor === "aggregate") return title.startsWith(`${factors.aggregate} `) || analysisRows !== undefined;
    if (factor === "pathOrder") return order?.order === factors.pathOrder;
    if (factor === "dashMode") {
      return factors.dashMode === "field"
        ? trend?.encoding?.strokeDash?.field === "group"
        : trend?.encoding?.strokeDash?.datum === factors.dashStyle;
    }
    if (factor === "dashStyle") {
      return factors.dashMode === "field"
        ? dash?.scale?.rangeCount === DASHES.length && graphic?.strokeDash !== undefined
        : dash?.value === factors.dashStyle;
    }
    if (factor === "curve") return lineEdit?.curve === factors.curve;
    if (factor === "strokeWidth") return graphic?.strokeWidth === factors.strokeWidth;
    if (factor === "opacity") return graphic?.opacity === factors.opacity;
    if (factor === "reverse") {
      return lastTrace(program, "encodeX", "orderedTrend")?.scale?.reverse === factors.reverse;
    }
    if (factor === "colorEncoding") {
      return factors.colorEncoding
        ? trend?.encoding?.color?.field === "group"
        : trend?.encoding?.color === undefined;
    }
    if (factor === "palette") {
      return factors.colorEncoding
        ? color?.scale?.palette === factors.palette
        : graphic?.stroke === staticPaletteColor(factors.palette);
    }
  }
  if (config.id === "realistic-maximal-ordered-bars") {
    const bars = layer("summaryBars");
    const order = lastTrace(program, "orderCategories", "summaryBars");
    const width = lastTrace(program, "encodeBarWidth", "summaryBars");
    const color = lastTrace(program, "encodeColor", "summaryBars");
    if (factor === "aggregate") return title.startsWith(`${factors.aggregate} `);
    if (factor === "orientation") {
      return factors.orientation === "horizontal"
        ? bars?.encoding?.y?.field === "category"
        : bars?.encoding?.x?.field === "category";
    }
    if (factor === "direction") return order?.direction === factors.direction;
    if (factor === "band") return width?.band === factors.band;
    if (factor === "palette") return color?.scale?.palette === factors.palette;
  }
  if (config.id === "realistic-maximal-arc") {
    const arc = layer("shareArcs");
    const created = lastTrace(program, "createArcMark");
    const edited = traceNodes(program, "editArcMark", "shareArcs")
      .map(node => node.args).find(args => args.innerRadius !== undefined);
    const color = lastTrace(program, "encodeColor", "shareArcs");
    const graphic = firstGraphicProperties(program, "shareArcs");
    const finalInnerRadius = factors.innerRadius * 0.3 + factors.editedInnerRadius * 0.7;
    if (factor === "aggregate") return title.includes(` ${factors.aggregate} `);
    if (factor === "innerRadius" || factor === "editedInnerRadius") {
      return edited?.innerRadius === finalInnerRadius;
    }
    if (factor === "padRatio") {
      const shares = analysisRows?.values?.map(row => row.share).filter(value => value > 0) ?? [];
      const expected = Math.min(...shares) * 360 * factors.padRatio;
      return shares.length > 0 && created?.padAngle === expected &&
        edited?.padAngle === expected * 0.8;
    }
    if (factor === "opacity") return graphic?.opacity === factors.opacity;
    if (factor === "colorEncoding") {
      return factors.colorEncoding
        ? arc?.encoding?.color?.field === "category"
        : arc?.encoding?.color === undefined;
    }
    if (factor === "palette") {
      return factors.colorEncoding
        ? color?.scale?.palette === factors.palette
        : graphic?.fill === staticPaletteColor(factors.palette);
    }
  }
  if (
    config.id === "realistic-maximal-statistical-band" ||
    config.id === "realistic-maximal-explicit-band"
  ) {
    const band = layer("categoryBand");
    const created = lastTrace(program, "createErrorBand");
    const edited = lastTrace(program, "editErrorBand", "categoryBand");
    const boundaries = traceNodes(program, "editErrorBandBoundary", "categoryBand")
      .map(node => node.args);
    const lower = boundaries.findLast(args => args.boundary === "lower");
    const upper = boundaries.findLast(args => args.boundary === "upper");
    if (factor === "orientation") {
      return factors.orientation === "vertical"
        ? band?.encoding?.x?.field !== undefined
        : band?.encoding?.y?.field !== undefined;
    }
    if (factor === "intervalStyle") {
      return sameValue(edited?.statistics, intervalParameters(factors.intervalStyle));
    }
    if (factor === "curve") return created?.curve === factors.curve && lower?.curve === factors.curve;
    if (factor === "editCurve") {
      return edited?.curve === factors.editCurve && upper?.curve === factors.editCurve;
    }
    if (factor === "dash") {
      return created?.boundaries?.strokeDash === factors.dash && lower?.strokeDash === factors.dash;
    }
    if (factor === "editDash") {
      return edited?.boundaries?.strokeDash === factors.editDash &&
        upper?.strokeDash === factors.editDash;
    }
    if (factor === "boundary") {
      return boundaries.some(args => args.boundary === factors.boundary) &&
        lower?.strokeWidth === (
          factors.boundary === "lower" || factors.boundary === "both" ? 1.8 : 1.2
        ) && upper?.strokeWidth === (
          factors.boundary === "upper" || factors.boundary === "both" ? 1.8 : 1.2
        );
    }
    if (factor === "reverse") {
      const position = factors.orientation === "vertical" ? created?.x : created?.y;
      return position?.scale?.reverse === factors.reverse;
    }
  }
  return false;
}

function observeFactorEffects(config, program, factors) {
  return frozen(Object.keys(factors)
    .filter(factor => factor !== "dataset" && factorIsObserved(config, program, factors, factor))
    .map(factor => ({
      factor,
      value: factors[factor],
      evidence: config.id === "realistic-maximal-point-label-layout" && [
        "labelAxis", "labelBounds", "labelPadding", "maxDisplacement", "leader"
      ].includes(factor)
        ? `applied-layout-policy:layoutLabels.${factor}`
        : `final-semantic-or-graphic:${config.id}:${factor}`
    })));
}

function makeRecipe(config) {
  const datasets = config.datasets ?? DATASETS;
  let first;
  let firstFactors;
  for (const dataset of datasets) {
    try {
      const factors = config.factorsForDataset(dataset);
      if (factors !== undefined) {
        first = dataset;
        firstFactors = factors;
        break;
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  if (first === undefined) throw new Error(`${config.id} has no eligible TidyTuesday dataset.`);
  return frozen({
    id: config.id,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity: config.complexity,
    enforceFactorEffects: true,
    minimumSelections: config.minimumSelections,
    datasets,
    factors: firstFactors,
    factorsForDataset: config.factorsForDataset,
    expectedDirectActions: config.requiredOperations,
    build: config.build,
    observe: program => observe(config, program),
    observeFactors: (program, factors) => observeFactorEffects(config, program, factors),
    describe: factors => metadataFor(config, factors)
  });
}

const CONFIGS = Object.freeze([
  {
    id: "realistic-maximal-binned-heatmap",
    family: "binned-heatmap",
    complexity: "advanced",
    minimumSelections: 20,
    factorsForDataset: dataset => factorsFor(dataset, "paired-measures", {
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
    minimumSelections: 20,
    factorsForDataset: dataset => factorsFor(dataset, "histogram", {
      binMode: ["max", "step", "boundaries"], maxBins: [8, 12, 18],
      stack: ["zero", "normalize"],
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
    minimumSelections: 20,
    factorsForDataset: densityFactorsFor,
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
    minimumSelections: 60,
    factorsForDataset: dataset => factorsFor(dataset, "record", {
      shape: POINT_SHAPES, fill: ["#2563eb", "#0f766e", "#7c3aed"],
      opacity: [0.55, 0.72, 0.9], strokeRemoval: [false, true],
      jitter: JITTER_VARIANTS,
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
    minimumSelections: 40,
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
    minimumSelections: 20,
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
    minimumSelections: 20,
    factorsForDataset: arcFactorsFor,
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
    minimumSelections: 40,
    factorsForDataset: dataset => factorsFor(dataset, "interval", {
      orientation: ["vertical", "horizontal"],
      intervalStyle: ["mean-stderr", "mean-stdev", "mean-ci-90", "mean-ci-95", "median-iqr"],
      curve: BAND_CURVES_WITHOUT_MONOTONE,
      editCurve: [...BAND_CURVES_WITHOUT_MONOTONE].reverse(), dash: DASHES,
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
    minimumSelections: 40,
    factorsForDataset: dataset => factorsFor(dataset, "interval", {
      orientation: ["vertical"],
      curve: CURVES, editCurve: [...CURVES].reverse(), dash: DASHES,
      editDash: [...DASHES].reverse(), boundary: ["both", "lower", "upper"],
      reverse: [false, true]
    }),
    build: buildExplicitBand,
    view: explicitBandView,
    title: context =>
      `Interquartile range of ${context.measure}${context.unit} by ${context.dimension}`,
    question: context =>
      `Which ${context.dimension} groups have wide or narrow observed interquartile ranges?`,
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

const DATA_MARK_INTERACTION_MEMBERS = Object.freeze([
  ["createHeatmap", "editBin2DData"],
  ["encodeDensity", "editDensity"],
  ["editPointMark", "jitterPoints"],
  ["jitterPoints", "removeJitter"],
  ["layoutLabels", "removeLabelLayout"],
  ["encodeStrokeDash", "encodePathOrder"],
  ["encodePathOrder", "removePathOrder"],
  ["encodeBarWidth", "orderCategories"],
  ["orderCategories", "removeCategoryOrder"],
  ["createArcMark", "editArcMark"],
  ["createErrorBand", "editErrorBand"],
  ["editErrorBand", "editErrorBandBoundary"]
]);

export const REALISTIC_DATA_MARK_INTERACTIONS = Object.freeze(
  DATA_MARK_INTERACTION_MEMBERS.map(members => Object.freeze({
    members: Object.freeze(members.map(action => `action:${action}`)),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }))
);

export const REALISTIC_DATA_MARK_COUNTS = Object.freeze({
  recipes: CONFIGS.length,
  intermediate: CONFIGS.filter(config => config.complexity === "intermediate").length,
  advanced: CONFIGS.filter(config => config.complexity === "advanced").length,
  minimumSelections: CONFIGS.reduce((sum, config) => sum + config.minimumSelections, 0),
  intermediateSelections: CONFIGS.filter(config => config.complexity === "intermediate")
    .reduce((sum, config) => sum + config.minimumSelections, 0),
  advancedSelections: CONFIGS.filter(config => config.complexity === "advanced")
    .reduce((sum, config) => sum + config.minimumSelections, 0)
});
