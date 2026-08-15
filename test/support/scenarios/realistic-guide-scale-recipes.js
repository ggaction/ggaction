import { createHash } from "node:crypto";

import { chart } from "../../../src/index.js";
import { PALETTE_NAMES } from "../../../src/grammar/palettes.js";

import { tidyTuesdaySourceEntries } from "../datasets/tidytuesday.js";

import {
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticFieldPairDomain,
  realisticOrderedView,
  realisticRecordView,
  realisticSourceFields,
  realisticSummaryView
} from "./realistic-data.js";

const CANVAS = Object.freeze({
  width: 4_400,
  height: 3_200,
  background: "#ffffff",
  margin: Object.freeze({ top: 900, right: 1_000, bottom: 900, left: 1_000 })
});

const NUMERIC_FORMAT_VARIANTS = Object.freeze([
  Object.freeze({ id: "automatic", format: "auto", valueField: "value" }),
  Object.freeze({ id: "integer", format: ".0f", valueField: "value" }),
  Object.freeze({ id: "one-decimal", format: ".1f", valueField: "value" }),
  Object.freeze({ id: "two-decimals", format: ".2f", valueField: "value" }),
  Object.freeze({ id: "scientific", format: ".2e", valueField: "value" }),
  Object.freeze({ id: "decimal-object", format: Object.freeze({ decimals: 3 }), valueField: "value" }),
  Object.freeze({ id: "x-percent-integer", format: ".0%", valueField: "share", valueAxis: "x" }),
  Object.freeze({ id: "y-percent-integer", format: ".0%", valueField: "share", valueAxis: "y" }),
  Object.freeze({ id: "x-percent-decimal", format: ".1%", valueField: "share", valueAxis: "x" }),
  Object.freeze({ id: "y-percent-decimal", format: ".1%", valueField: "share", valueAxis: "y" })
]);

const SIMPLE_GUIDE_VARIANTS = Object.freeze([
  Object.freeze({ id: "plain-linear", nice: false, zero: false, reverse: false }),
  Object.freeze({ id: "zero-anchored", nice: true, zero: true, reverse: false }),
  Object.freeze({ id: "reversed-rank", nice: true, zero: false, reverse: true })
]);

const TIME_FORMAT_VARIANTS = Object.freeze([
  Object.freeze({ id: "year-on-x", format: "%Y", timeAxis: "x" }),
  Object.freeze({ id: "month-on-x", format: "%Y-%m", timeAxis: "x" }),
  Object.freeze({ id: "day-on-x", format: "%Y-%m-%d", timeAxis: "x" }),
  Object.freeze({ id: "year-on-y", format: "%Y", timeAxis: "y" }),
  Object.freeze({ id: "month-on-y", format: "%Y-%m", timeAxis: "y" }),
  Object.freeze({ id: "day-on-y", format: "%Y-%m-%d", timeAxis: "y" })
]);

const POLAR_VARIANTS = Object.freeze([
  Object.freeze({ id: "count-inside", tickPolicy: "count", titlePosition: "inside" }),
  Object.freeze({ id: "values-outside", tickPolicy: "values", titlePosition: "outside" }),
  Object.freeze({ id: "title-opt-out", tickPolicy: "count", titlePosition: false })
]);

const PARALLEL_VARIANTS = Object.freeze([
  Object.freeze({ id: "parallel-break", missing: "break", reverse: false }),
  Object.freeze({ id: "parallel-drop-row", missing: "drop-row", reverse: true })
]);

const CONTINUOUS_PALETTES = new Set([
  "blues", "tealblues", "teals", "greens", "browns", "oranges", "reds",
  "purples", "warmgreys", "greys", "viridis", "magma", "inferno", "plasma",
  "cividis", "turbo", "bluegreen", "bluepurple", "goldgreen", "goldorange",
  "goldred", "greenblue", "orangered", "purplebluegreen", "purpleblue",
  "purplered", "redpurple", "yellowgreenblue", "yellowgreen", "yelloworangebrown",
  "yelloworangered", "darkblue", "darkgold", "darkgreen", "darkmulti", "darkred",
  "lightgreyred", "lightgreyteal", "lightmulti", "lightorange", "lighttealblue",
  "blueorange", "brownbluegreen", "purplegreen", "pinkyellowgreen", "purpleorange",
  "redblue", "redgrey", "redyellowblue", "redyellowgreen", "spectral", "rainbow",
  "sinebow"
]);

const INTERPOLATIONS = Object.freeze([
  "rgb", "hsl", "hsl-long", "lab", "hcl", "hcl-long", "cubehelix", "cubehelix-long"
]);

const NON_SEQUENTIAL_SCALE_PROFILES = Object.freeze([
  ...["linear", "log", "pow", "sqrt", "symlog"].map(type => Object.freeze({
    profile: `position-${type}`,
    kind: "position",
    type
  })),
  ...["band", "point"].map(type => Object.freeze({
    profile: `category-${type}`,
    kind: "category",
    type
  })),
  Object.freeze({ profile: "shape-ordinal", kind: "category-shape", type: "ordinal" }),
  ...["quantize", "quantile", "threshold"].map(type => Object.freeze({
    profile: `color-${type}`,
    kind: "color",
    type
  }))
]);

function sequentialScaleRound(round) {
  return PALETTE_NAMES.map((palette, paletteOrdinal) => {
    const interpolationOrdinal = (paletteOrdinal + round) % INTERPOLATIONS.length;
    const interpolate = INTERPOLATIONS[interpolationOrdinal];
    return Object.freeze({
      id: `color-sequential-${palette}-${interpolate}`,
      kind: "color",
      type: "sequential",
      palette,
      interpolate,
      paletteOrdinal,
      interpolationOrdinal
    });
  });
}

function nonSequentialScaleVariants() {
  return NON_SEQUENTIAL_SCALE_PROFILES.map(profile => Object.freeze({
    ...profile,
    id: profile.profile
  }));
}

const SEQUENTIAL_SCALE_VARIANTS = Object.freeze(
  Array.from({ length: INTERPOLATIONS.length }, (_, round) =>
    sequentialScaleRound(round)
  ).flat()
);

const NON_SEQUENTIAL_SCALE_VARIANTS = Object.freeze(nonSequentialScaleVariants());

const SCALE_SEQUENTIAL_SPLIT = SEQUENTIAL_SCALE_VARIANTS.length / 2;
const SCALE_PRIMARY_VARIANTS = Object.freeze([
  ...SEQUENTIAL_SCALE_VARIANTS.slice(0, SCALE_SEQUENTIAL_SPLIT),
  ...NON_SEQUENTIAL_SCALE_VARIANTS
]);
const SCALE_SECONDARY_VARIANTS = Object.freeze(
  SEQUENTIAL_SCALE_VARIANTS.slice(SCALE_SEQUENTIAL_SPLIT)
);

// Every advertised sequential palette/interpolation pair is selected once. The
// eleven non-sequential profiles repeat five times so their type-specific options
// meet the same five-occurrence, three-dataset distribution requirement. Splitting
// this vocabulary keeps each recipe under the 15% diversity ceiling at 3,600.
const SCALE_PRIMARY_COVERAGE_VARIANTS = Object.freeze([
  ...SEQUENTIAL_SCALE_VARIANTS.slice(0, SCALE_SEQUENTIAL_SPLIT),
  ...Array.from({ length: 5 }, () => NON_SEQUENTIAL_SCALE_VARIANTS).flat()
]);
const SCALE_SECONDARY_COVERAGE_VARIANTS = SCALE_SECONDARY_VARIANTS;

const FACET_VARIANTS = Object.freeze([
  Object.freeze({
    id: "independent-then-shared-start",
    first: "independent",
    align: "start",
    columns: 2,
    gap: 16,
    padding: 12
  }),
  Object.freeze({
    id: "shared-then-independent-center",
    first: "shared",
    align: "center",
    columns: 3,
    gap: 24,
    padding: 16
  }),
  Object.freeze({
    id: "independent-then-shared-end",
    first: "independent",
    align: "end",
    columns: 2,
    gap: 32,
    padding: 20
  })
]);

const INITIAL_FACTOR_DATASET = "tt-penguins";

function canvas() {
  return { ...CANVAS, margin: { ...CANVAS.margin } };
}

function aggregateFor(variant) {
  return variant.id.length % 3 === 0 ? "sum" : variant.id.length % 2 === 0 ? "median" : "mean";
}

function summaryView(factors) {
  return realisticSummaryView(factors.dataset, {
    aggregate: aggregateFor(factors.variant),
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex
  });
}

function orderedView(factors) {
  return realisticOrderedView(factors.dataset, {
    aggregate: aggregateFor(factors.variant),
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    temporalOnly: true,
    groupLimit: 3,
    binLimit: 12
  });
}

function facetView(factors) {
  return realisticRecordView(factors.dataset, {
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    minimumPerSubgroup: 3,
    witnessCross: true,
    rowLimit: 120,
    groupLimit: 6,
    subgroupLimit: 4
  });
}

function parallelScalar(value) {
  return value === null || value === undefined || value === "" ? undefined : value;
}

function parallelOrderNumeric(value, ranks) {
  if (Number.isFinite(value)) return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
  if (typeof value !== "string" || value.length === 0) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : ranks.get(value);
}

function parallelRowKey(row, sourceRowIndex, identifier) {
  const value = identifier === undefined ? undefined : row[identifier];
  return parallelScalar(value) === undefined
    ? `source-row-${sourceRowIndex}`
    : `${value}-${sourceRowIndex}`;
}

function parallelStableSample(entries, limit, { hasSecondary, hasSubgroup }) {
  if (entries.length <= limit) return entries;
  const selected = new Set([entries[0], entries.at(-1)]);
  for (const field of ["value", ...(hasSecondary ? ["secondary"] : [])]) {
    const finite = entries.filter(entry => Number.isFinite(entry[field]));
    if (finite.length === 0) continue;
    finite.sort((left, right) =>
      left[field] - right[field] || left.sourceRowIndex - right.sourceRowIndex
    );
    selected.add(finite[0]);
    selected.add(finite.at(-1));
  }
  for (const field of ["category", ...(hasSubgroup ? ["subgroup"] : [])]) {
    const witnessed = new Set();
    for (const entry of entries) {
      const value = parallelScalar(entry[field]);
      if (value === undefined || witnessed.has(String(value))) continue;
      witnessed.add(String(value));
      selected.add(entry);
    }
  }
  const strata = [
    ["category"],
    ...(hasSubgroup ? [["subgroup"], ["category", "subgroup"]] : [])
  ];
  for (const fields of strata) {
    const witnessed = new Set();
    for (const entry of entries) {
      const values = fields.map(field => parallelScalar(entry[field]));
      if (values.some(value => value === undefined)) continue;
      const key = values.map(String).join("\0");
      if (witnessed.has(key)) continue;
      witnessed.add(key);
      selected.add(entry);
    }
  }
  for (let index = 0; index < limit; index += 1) {
    if (selected.size >= limit) break;
    selected.add(entries[Math.round(index * (entries.length - 1) / (limit - 1))]);
  }
  if (selected.size > limit) {
    throw new Error("Parallel row limit cannot retain all required witness rows.");
  }
  return [...selected].sort((left, right) => left.sourceRowIndex - right.sourceRowIndex);
}

function parallelProvenance(dataset, bindings, rows, transformations) {
  const indexes = [...new Set(rows.map(row => row.sourceRowIndex))]
    .sort((left, right) => left - right);
  if (indexes.length < 2) {
    throw new Error(`Dataset "${dataset}" needs two complete parallel rows.`);
  }
  return Object.freeze({
    sourceDataset: dataset,
    sourceRowIndexBasis: "zero-based-data-row-in-pinned-csv",
    sourceRowCount: indexes.length,
    minimumSourceRow: indexes[0],
    maximumSourceRow: indexes.at(-1),
    sourceSelectionSha256: createHash("sha256").update(indexes.join(",")).digest("hex"),
    indexEncoding: "sorted-zero-based-indexes-sha256-v1",
    sourceRowIndexes: Object.freeze(indexes),
    fieldBindings: Object.freeze(bindings),
    transformations: Object.freeze(transformations.map(value => Object.freeze(value)))
  });
}

function parallelView(factors) {
  const roles = realisticDatasetRoles(factors.dataset);
  const measure = roles.measures[factors.fieldPair.measureIndex % roles.measures.length];
  const secondaryMeasure = roles.measures.find(field => field !== measure);
  const dimension = roles.dimensions[
    factors.fieldPair.dimensionIndex % roles.dimensions.length
  ];
  const secondaryDimension = roles.dimensions.find(field => field !== dimension);
  const temporal = roles.temporal[0];
  const order = roles.order[0];
  const identifier = roles.identifiers[0];
  const label = roles.labels[0] ?? dimension;
  const sourceEntries = tidyTuesdaySourceEntries(factors.dataset);
  const groupStats = new Map();
  for (const { row, sourceRowIndex } of sourceEntries) {
    const category = parallelScalar(row[dimension]);
    if (!Number.isFinite(row[measure]) || category === undefined) continue;
    const key = String(category);
    const current = groupStats.get(key) ?? { count: 0, first: sourceRowIndex };
    current.count += 1;
    current.first = Math.min(current.first, sourceRowIndex);
    groupStats.set(key, current);
  }
  const retainedGroups = new Set([...groupStats]
    .sort((left, right) =>
      right[1].count - left[1].count || left[1].first - right[1].first ||
      left[0].localeCompare(right[0])
    )
    .slice(0, 6)
    .map(([category]) => category));
  let eligible = sourceEntries.filter(({ row }) =>
    Number.isFinite(row[measure]) &&
    retainedGroups.has(String(parallelScalar(row[dimension])))
  );
  let retainedSubgroups;
  if (secondaryDimension !== undefined) {
    const subgroupCounts = new Map();
    for (const { row } of eligible) {
      const subgroup = parallelScalar(row[secondaryDimension]);
      if (subgroup === undefined) continue;
      const key = String(subgroup);
      subgroupCounts.set(key, (subgroupCounts.get(key) ?? 0) + 1);
    }
    retainedSubgroups = new Set([...subgroupCounts]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 4)
      .map(([subgroup]) => subgroup));
    eligible = eligible.filter(({ row }) =>
      retainedSubgroups.has(String(parallelScalar(row[secondaryDimension])))
    );
  }
  const rawOrderValues = [...new Set(eligible.flatMap(({ row, sourceRowIndex }) => {
    const value = order === undefined ? sourceRowIndex : parallelScalar(row[order]);
    return value === undefined ? [] : [value];
  }))];
  rawOrderValues.sort((left, right) => {
    if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
    const leftTime = typeof left === "string" ? Date.parse(left) : Number.NaN;
    const rightTime = typeof right === "string" ? Date.parse(right) : Number.NaN;
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime;
    return String(left).localeCompare(String(right));
  });
  const orderRanks = new Map(rawOrderValues.map((value, index) => [value, index + 1]));
  const complete = eligible.flatMap(({ row, sourceRowIndex }) => {
    const category = parallelScalar(row[dimension]);
    const orderValue = order === undefined ? sourceRowIndex : parallelScalar(row[order]);
    const orderNumeric = parallelOrderNumeric(orderValue, orderRanks);
    if (
      !Number.isInteger(sourceRowIndex) || !Number.isFinite(row[measure]) ||
      category === undefined || !Number.isFinite(orderNumeric)
    ) return [];
    const subgroup = secondaryDimension === undefined
      ? undefined
      : parallelScalar(row[secondaryDimension]);
    return [Object.freeze({
      key: parallelRowKey(row, sourceRowIndex, identifier),
      sourceRowIndex,
      value: row[measure],
      ...(secondaryMeasure === undefined || !Number.isFinite(row[secondaryMeasure])
        ? {}
        : { secondary: row[secondaryMeasure] }),
      category: String(category),
      ...(subgroup === undefined ? {} : { subgroup: String(subgroup) }),
      label: parallelScalar(row[label]) ?? category,
      ...(temporal === undefined || row[temporal] === null
        ? {}
        : { time: row[temporal] }),
      ...(order === undefined ? {} : { orderValue }),
      orderNumeric
    })];
  });
  const rows = Object.freeze(parallelStableSample(complete, 80, {
    hasSecondary: secondaryMeasure !== undefined,
    hasSubgroup: secondaryDimension !== undefined
  }));
  const bindings = {
    measure,
    ...(secondaryMeasure === undefined ? {} : { secondaryMeasure }),
    dimension,
    ...(secondaryDimension === undefined ? {} : { secondaryDimension }),
    ...(temporal === undefined ? {} : { temporal }),
    ...(order === undefined ? {} : { order }),
    ...(identifier === undefined ? {} : { identifier }),
    label
  };
  const sample = Object.freeze({
    method: "deterministic-stratified-witness-sample",
    eligibleRowCount: complete.length,
    displayedRowCount: rows.length,
    limit: 80,
    strata: Object.freeze([
      dimension,
      ...(secondaryDimension === undefined ? [] : [secondaryDimension])
    ])
  });
  const transformations = [
    { op: "filter-valid", fields: [measure, dimension] },
    { op: "top-groups", field: dimension, limit: 6 },
    ...(secondaryDimension === undefined
      ? []
      : [{ op: "top-subgroups", field: secondaryDimension, limit: 4 }]),
    {
      op: "filter-parallel-complete-cases",
      fields: ["sourceRowIndex", measure, dimension, order ?? "sourceRowIndex"],
      eligibleRowCount: complete.length,
      purpose: "filter every parallel dimension before deterministic sampling"
    },
    {
      op: "witness-preserving-even-sample",
      limit: 80,
      eligibleRowCount: complete.length,
      displayedRowCount: rows.length,
      strata: [dimension, ...(secondaryDimension === undefined ? [] : [secondaryDimension])],
      witnesses: ["first", "last", "measure-min", "measure-max", "retained-dimension"]
    },
    ...(order === undefined
      ? [{ op: "source-row-index-order-projection", as: "orderNumeric" }]
      : [{ op: "source-order-numeric-projection", field: order }]),
    { op: "project", bindings }
  ];
  return Object.freeze({
    rows,
    sample,
    provenance: parallelProvenance(factors.dataset, bindings, rows, transformations)
  });
}

function contextFor(dataset, view, family) {
  const fields = realisticSourceFields(dataset, view.provenance.fieldBindings);
  const fieldByName = new Map(fields.map(field => [field.field, field]));
  const bindings = view.provenance.fieldBindings;
  const measure = fieldByName.get(bindings.measure);
  const dimension = fieldByName.get(bindings.dimension);
  const sequence = fieldByName.get(bindings.temporal ?? bindings.order);
  const measureText = measure?.label ?? bindings.measure;
  const dimensionText = dimension?.label ?? bindings.dimension;
  const sequenceText = sequence?.label;
  const unit = measure?.unit === undefined ? "" : ` (${measure.unit})`;
  const sample = view.provenance.transformations.find(transformation =>
    transformation.op === "witness-preserving-even-sample"
  );
  const sampleText = sample === undefined
    ? ""
    : ` — deterministic stratified sample (n=${sample.displayedRowCount}/${sample.eligibleRowCount} eligible)`;
  const titleByFamily = {
    "guide-scale-cartesian": `${measureText}${unit} across ${dimensionText}`,
    "guide-scale-temporal": `${measureText}${unit} over ${sequenceText ?? "time"}`,
    "guide-scale-polar": `Relative ${measureText}${unit} by ${dimensionText}`,
    "guide-scale-vocabulary": `Scaled ${measureText}${unit} by ${dimensionText}`,
    "guide-scale-parallel": `${measureText}${unit} multivariate profiles${sampleText}`,
    "guide-scale-facet": `${measureText}${unit} within ${dimensionText} small multiples${sampleText}`
  };
  const questionByFamily = {
    "guide-scale-cartesian": `Which ${dimensionText} groups lead after aggregating ${measureText}, and how large are their shares?`,
    "guide-scale-temporal": `How does aggregated ${measureText} change over ${sequenceText ?? "time"}?`,
    "guide-scale-polar": `How is the absolute aggregate of ${measureText} distributed across ${dimensionText} groups?`,
    "guide-scale-vocabulary": `How do alternative valid scale policies change the comparison of ${measureText} across ${dimensionText}?`,
    "guide-scale-parallel": `In the deterministic stratified sample (n=${sample?.displayedRowCount ?? view.rows.length}/${sample?.eligibleRowCount ?? view.rows.length} eligible), which ${dimensionText} records have unusual ${measureText} profiles across source order and category?`,
    "guide-scale-facet": `In the deterministic stratified sample (n=${sample?.displayedRowCount ?? view.rows.length}/${sample?.eligibleRowCount ?? view.rows.length} eligible), how does the distribution of ${measureText} vary across repeated ${dimensionText} groups?`
  };
  return Object.freeze({
    fields,
    measureText,
    dimensionText,
    sequenceText,
    title: titleByFamily[family],
    question: questionByFamily[family]
  });
}

function tickPolicy(mode, values, count = 5) {
  return mode === "values" ? { values } : { count };
}

function endpointValues(domain) {
  return Object.freeze([...new Set([domain[0], domain.at(-1)])]);
}

function axisLabelStyle(format, offset = 20) {
  return {
    offset,
    format,
    color: "#334155",
    fontSize: 12,
    fontFamily: "sans-serif",
    fontWeight: 500
  };
}

function axisTickStyle(length = 7) {
  return {
    length,
    color: "#64748b",
    lineWidth: 1
  };
}

function axisTitle(text, position, at) {
  return {
    text,
    position,
    at,
    offset: position === "left" || position === "right" ? 180 : 120,
    rotation: position === "left"
      ? -Math.PI / 2
      : position === "right" ? Math.PI / 2 : 0,
    color: "#0f172a",
    fontSize: 14,
    fontFamily: "sans-serif",
    fontWeight: 700
  };
}

function nestedAxisTitle(text, position, at) {
  const { position: _position, ...options } = axisTitle(text, position, at);
  return options;
}

function completeAxis({
  channel,
  position,
  format,
  policy,
  values,
  title,
  at,
  coordinate = "main"
}) {
  const scale = channel;
  return {
    scale,
    coordinate,
    position,
    line: { color: "#475569", lineWidth: 1.25 },
    ticksAndLabels: {
      ...tickPolicy(policy, values),
      ticks: axisTickStyle(8),
      labels: axisLabelStyle(format, channel === "x" ? 22 : 18)
    },
    title: nestedAxisTitle(title, position, at)
  };
}

function directTickOptions(channel, position, policy, values) {
  return {
    scale: channel,
    position,
    ...tickPolicy(policy, values),
    ...axisTickStyle(8)
  };
}

function directLabelOptions(channel, position, policy, values, format) {
  return {
    scale: channel,
    position,
    ...tickPolicy(policy, values),
    ...axisLabelStyle(format, channel === "x" ? 22 : 18)
  };
}

function directTicksAndLabelsOptions(channel, position, policy, values, format) {
  return {
    scale: channel,
    position,
    ...tickPolicy(policy, values),
    ticks: axisTickStyle(8),
    labels: axisLabelStyle(format, channel === "x" ? 22 : 18)
  };
}

function legendOptions(variant, title, { target = "points", channels = ["color"] } = {}) {
  const ordinal = Math.abs(variant.id.split("").reduce((sum, value) => sum + value.charCodeAt(0), 0));
  const positions = ["right", "bottom", "left", "top"];
  const aligns = ["left", "center", "right"];
  const position = positions[ordinal % positions.length];
  const direction = ["top", "bottom"].includes(position) ? "horizontal" : "vertical";
  const symbolModes = [
    "auto",
    { width: 20, height: 12, stroke: "#ffffff", strokeWidth: 1 },
    {
      layers: [
        { type: "line", length: 24, lineWidth: 2 },
        {
          type: "point",
          shape: "circle",
          size: 80,
          fill: "#94a3b8",
          stroke: "#ffffff",
          strokeWidth: 1
        },
        { type: "swatch", width: 20, height: 12, stroke: "#ffffff", strokeWidth: 1 }
      ]
    }
  ];
  const borderModes = [false, true, {
    color: "#cbd5e1",
    lineWidth: 1,
    padding: 12,
    background: "#ffffff"
  }];
  return {
    target,
    channels,
    position,
    align: direction === "vertical" ? "center" : aligns[ordinal % aligns.length],
    direction,
    ...(direction === "horizontal" ? { columns: 4 } : {}),
    offset: 48,
    titlePosition: ordinal % 2 === 0 ? "top" : "left",
    title,
    symbol: channels.includes("shape") ? "auto" : symbolModes[ordinal % symbolModes.length],
    labels: {
      offset: 9,
      color: "#334155",
      fontSize: 12,
      fontFamily: "sans-serif",
      fontWeight: 500
    },
    titleStyle: {
      color: "#0f172a",
      fontSize: 13,
      fontFamily: "sans-serif",
      fontWeight: 700
    },
    itemGap: 14,
    border: borderModes[ordinal % borderModes.length]
  };
}

function editableLegendOptions(variant, title, options) {
  const { channels: _channels, ...editable } = legendOptions(variant, title, options);
  return editable;
}

function variantNarrative(variant) {
  if (variant.palette !== undefined) {
    return `${variant.palette} sequential color with ${variant.interpolate} interpolation`;
  }
  if (variant.kind !== undefined) {
    const role = {
      position: "quantitative position",
      category: "categorical position",
      "category-shape": "categorical shape",
      color: "quantitative color"
    }[variant.kind];
    return `${variant.type} ${role} scale`;
  }
  if (variant.valueField !== undefined) {
    const axis = variant.valueAxis ?? "y";
    const format = typeof variant.format === "string"
      ? variant.format
      : `${variant.format.decimals}-decimal labels`;
    return `${axis}-axis ${variant.valueField} values formatted as ${format}`;
  }
  if (variant.timeAxis !== undefined) {
    return `${variant.timeAxis}-axis time labels formatted as ${variant.format}`;
  }
  if (variant.missing !== undefined) {
    return `${variant.missing} missing-value handling with ${variant.reverse ? "reversed" : "forward"} measure direction`;
  }
  if (variant.tickPolicy !== undefined) {
    return `${variant.tickPolicy}-based polar ticks with ${variant.titlePosition === false ? "restored inside" : `${variant.titlePosition} radial`} title placement`;
  }
  if (variant.first !== undefined) {
    const second = variant.first === "independent" ? "shared" : "independent";
    return `${variant.first}-then-${second} facet scales in a ${variant.columns}-column ${variant.align}-aligned layout with ${variant.gap}px gaps and ${variant.padding}px padding`;
  }
  if (variant.nice !== undefined) {
    return `${variant.reverse ? "reversed" : "forward"} linear rank scale with nice=${variant.nice} and zero=${variant.zero}`;
  }
  throw new Error(`Unknown guide/scale variant "${variant.id}".`);
}

function analysisQuestion(context, variant) {
  return `${context.question} Display policy: ${variantNarrative(variant)}.`;
}

function titleOptions(context, variant, { final = false } = {}) {
  const ordinal = Math.abs(variant.id.split("").reduce((sum, value) => sum + value.charCodeAt(0), 0));
  const positions = ["top", "bottom", "left", "right"];
  const aligns = ["left", "center", "right"];
  const position = final ? "top" : positions[ordinal % positions.length];
  return {
    text: context.title,
    subtitle: analysisQuestion(context, variant),
    position,
    align: final ? "left" : aligns[ordinal % aligns.length],
    offset: position === "bottom" ? 400 : position === "right" ? -28 : 28,
    gap: 12,
    maxWidth: 800,
    wrap: ordinal % 2 === 0 ? "word" : "character",
    lineHeight: 24,
    titleStyle: {
      color: "#0f172a",
      fontSize: 24,
      fontFamily: "sans-serif",
      fontWeight: 700
    },
    subtitleStyle: {
      color: "#475569",
      fontSize: 13,
      fontFamily: "sans-serif",
      fontWeight: 400
    }
  };
}

function pointSummaryBase(factors, family) {
  const view = summaryView(factors);
  const context = contextFor(factors.dataset, view, family);
  const variant = factors.variant;
  const valueAxis = variant.valueAxis ?? "y";
  const valueField = variant.valueField ?? "value";
  const xField = valueAxis === "x" ? valueField : "rank";
  const yField = valueAxis === "y" ? valueField : "rank";
  const xFormat = valueAxis === "x" ? variant.format : ".0f";
  const yFormat = valueAxis === "y" ? variant.format : ".0f";
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createPointMark({
      id: "points",
      shape: "circle",
      opacity: 0.84,
      stroke: "#ffffff",
      strokeWidth: 0.8
    })
    .encodeX({ target: "points", field: xField, scale: { nice: true, zero: false } })
    .encodeY({ target: "points", field: yField, scale: { nice: true, zero: false } })
    .encodeColor({
      target: "points",
      field: "category",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .encodeSize({ target: "points", field: "count", scale: { range: [28, 180] } });
  const xDomain = program.resolvedScales.x.domain;
  const yDomain = program.resolvedScales.y.domain;
  return {
    program,
    view,
    context,
    xFormat,
    yFormat,
    xValues: endpointValues(xDomain),
    yValues: endpointValues(yDomain),
    xTitle: valueAxis === "x" ? context.measureText : `${context.dimensionText} rank`,
    yTitle: valueAxis === "y" ? context.measureText : `${context.dimensionText} rank`
  };
}

function exerciseCartesianGuides(factors, base) {
  const variant = factors.variant;
  const numericOrdinal = NUMERIC_FORMAT_VARIANTS.findIndex(candidate =>
    candidate.id === variant.id
  );
  const temporalVariant = TIME_FORMAT_VARIANTS.some(candidate =>
    candidate.id === variant.id
  );
  if (numericOrdinal < 0 && !temporalVariant) {
    throw new Error(`Unknown cartesian guide variant "${variant.id}".`);
  }
  // Temporal variants historically share the same lifecycle geometry. Resolve
  // that policy by value as well so worker structured clones cannot alter it.
  const ordinal = temporalVariant ? -1 : numericOrdinal;
  const xPosition = ordinal % 2 === 0 ? "top" : "bottom";
  const yPosition = ordinal % 2 === 0 ? "right" : "left";
  const oppositeX = xPosition === "top" ? "bottom" : "top";
  const oppositeY = yPosition === "right" ? "left" : "right";
  const atValues = ["start", "center", "end"];
  const at = atValues[Math.abs(ordinal) % atValues.length];
  const policy = ordinal % 2 === 0 ? "count" : "values";
  const alternatePolicy = policy === "count" ? "values" : "count";
  // Long temporal labels need an explicit sparse set at every lifecycle stage;
  // an automatic count can still expand to colliding calendar boundaries.
  const xPolicy = variant.timeAxis === "x" ? "values" : policy;
  const yPolicy = variant.timeAxis === "y" ? "values" : policy;
  const xAlternatePolicy = variant.timeAxis === "x" ? "values" : alternatePolicy;
  const yAlternatePolicy = variant.timeAxis === "y" ? "values" : alternatePolicy;
  const xCoverageFormat = typeof base.xFormat === "string" && base.xFormat.startsWith("%")
    ? base.xFormat
    : { decimals: 3 };
  const yCoverageFormat = typeof base.yFormat === "string" && base.yFormat.startsWith("%")
    ? base.yFormat
    : { decimals: 3 };
  const xAxis = completeAxis({
    channel: "x",
    position: xPosition,
    format: base.xFormat,
    policy: xPolicy,
    values: base.xValues,
    title: base.xTitle,
    at
  });
  const yAxis = completeAxis({
    channel: "y",
    position: yPosition,
    format: base.yFormat,
    policy: yPolicy,
    values: base.yValues,
    title: base.yTitle,
    at
  });
  const legend = legendOptions(variant, base.context.dimensionText);
  const { columns: _legendColumns, ...legendWithoutColumns } = legend;
  const initialAxesLegend = {
    ...legendWithoutColumns,
    position: yPosition === "left" ? "right" : "left",
    align: "center",
    direction: "vertical",
    offset: 48
  };
  const movedAxesLegend = {
    ...initialAxesLegend,
    position: oppositeY === "left" ? "right" : "left"
  };
  const { channels: _axesLegendChannels, ...editableMovedAxesLegend } = movedAxesLegend;
  let program = base.program.createGuides({
    axes: {
      coordinate: { id: "main", type: ordinal % 2 === 0 ? "cartesian" : "auto" },
      x: xAxis,
      y: yAxis,
      theta: false,
      radius: false
    },
    grid: {
      horizontal: {
        scale: "y",
        coordinate: "main",
        ...tickPolicy(yPolicy, base.yValues, 5),
        color: "#dbeafe",
        lineWidth: 0.8,
        strokeDash: [4, 3]
      },
      vertical: {
        scale: "x",
        coordinate: "main",
        ...tickPolicy(xPolicy, base.xValues, 5),
        color: "#f1f5f9",
        lineWidth: 0.8,
        strokeDash: [2, 3]
      },
      theta: false,
      radial: false
    },
    legend: initialAxesLegend
  });

  program = program
    .removeLegend({ target: "points", channels: ["color"] })
    .editXAxisLine({ position: oppositeX, color: "#334155", lineWidth: 1.4 })
    .editYAxisLine({ position: oppositeY, color: "#334155", lineWidth: 1.4 })
    .editXAxisTicks({
      position: oppositeX,
      ...tickPolicy(xAlternatePolicy, base.xValues, 4),
      ...axisTickStyle(7)
    })
    .editYAxisTicks({
      position: oppositeY,
      ...tickPolicy(yAlternatePolicy, base.yValues, 4),
      ...axisTickStyle(7)
    })
    .editXAxisLabels({
      position: oppositeX,
      ...tickPolicy(xAlternatePolicy, base.xValues, 4),
      ...axisLabelStyle(base.xFormat, 21)
    })
    .editYAxisLabels({
      position: oppositeY,
      ...tickPolicy(yAlternatePolicy, base.yValues, 4),
      ...axisLabelStyle(base.yFormat, 17)
    })
    .editXAxisLabels({
      position: oppositeX,
      ...tickPolicy(xAlternatePolicy, base.xValues, 4),
      ...axisLabelStyle(xCoverageFormat, 21)
    })
    .editYAxisLabels({
      position: oppositeY,
      ...tickPolicy(yAlternatePolicy, base.yValues, 4),
      ...axisLabelStyle(yCoverageFormat, 17)
    })
    .editXAxisTicksAndLabels({
      position: xPosition,
      ...tickPolicy(xPolicy, base.xValues, 5),
      ticks: axisTickStyle(8),
      labels: axisLabelStyle(base.xFormat, 22)
    })
    .editYAxisTicksAndLabels({
      position: yPosition,
      ...tickPolicy(yPolicy, base.yValues, 5),
      ticks: axisTickStyle(8),
      labels: axisLabelStyle(base.yFormat, 18)
    })
    .editXAxisTitle(axisTitle(`${base.xTitle} (edited)`, xPosition, at))
    .editYAxisTitle(axisTitle(`${base.yTitle} (edited)`, yPosition, at))
    .editXAxis({
      position: oppositeX,
      line: { color: "#475569", lineWidth: 1.1 },
      ticks: {
        ...tickPolicy(xAlternatePolicy, base.xValues, 4),
        ...axisTickStyle(6)
      },
      labels: {
        ...tickPolicy(xAlternatePolicy, base.xValues, 4),
        ...axisLabelStyle(base.xFormat, 20)
      },
      title: nestedAxisTitle(base.xTitle, oppositeX, at)
    })
    .editYAxis({
      position: oppositeY,
      line: { color: "#475569", lineWidth: 1.1 },
      ticksAndLabels: {
        ...tickPolicy(yAlternatePolicy, base.yValues, 4),
        ticks: axisTickStyle(6),
        labels: axisLabelStyle(base.yFormat, 16)
      },
      title: nestedAxisTitle(base.yTitle, oppositeY, at)
    })
    .editXAxis({
      position: oppositeX,
      line: { color: "#475569", lineWidth: 1.1 },
      ticksAndLabels: {
        ...tickPolicy(xAlternatePolicy, base.xValues, 4),
        ticks: axisTickStyle(6),
        labels: axisLabelStyle(xCoverageFormat, 20)
      },
      title: nestedAxisTitle(base.xTitle, oppositeX, at)
    })
    .editYAxis({
      position: oppositeY,
      line: { color: "#475569", lineWidth: 1.1 },
      ticks: {
        ...tickPolicy(yAlternatePolicy, base.yValues, 4),
        ...axisTickStyle(6)
      },
      labels: {
        ...tickPolicy(yAlternatePolicy, base.yValues, 4),
        ...axisLabelStyle(yCoverageFormat, 16)
      },
      title: nestedAxisTitle(base.yTitle, oppositeY, at)
    })
    .editHorizontalGrid({ values: "auto", color: "#dbeafe", lineWidth: 0.7, strokeDash: [3, 3] })
    .editVerticalGrid({ values: "auto", color: "#f1f5f9", lineWidth: 0.7, strokeDash: [1, 1] })
    .editGrid({
      horizontal: { values: "auto", color: "#e2e8f0", lineWidth: 0.8, strokeDash: [3, 2] },
      vertical: { values: "auto", color: "#f8fafc", lineWidth: 0.8, strokeDash: [2, 3] }
    })
    .editGrid({
      horizontal: {
        ...tickPolicy(yAlternatePolicy, base.yValues, 4),
        color: "#e2e8f0",
        lineWidth: 0.9,
        strokeDash: [4, 2]
      },
      vertical: {
        ...tickPolicy(xAlternatePolicy, base.xValues, 4),
        color: "#f8fafc",
        lineWidth: 0.9,
        strokeDash: [2, 4]
      }
    })
    .createLegend(movedAxesLegend)
    .editLegend({
      ...editableMovedAxesLegend,
      title: ordinal % 3 === 0 ? false : ordinal % 3 === 1 ? "auto" : `${base.context.dimensionText} group`
    })
    .editLegendLayout({
      target: "points",
      position: movedAxesLegend.position,
      align: "center",
      direction: "vertical",
      offset: 48,
      titlePosition: "left",
      itemGap: 16
    })
    .editLegendLabels({
      target: "points",
      color: "#334155",
      fontSize: 12,
      fontFamily: "sans-serif",
      fontWeight: 500
    })
    .editLegendTitle({
      target: "points",
      title: ordinal % 3 === 0 ? false : ordinal % 3 === 1 ? "auto" : base.context.dimensionText,
      color: "#0f172a",
      fontSize: 13,
      fontFamily: "sans-serif",
      fontWeight: 700
    })
    .editLegendSymbols({
      target: "points",
      symbol: legend.symbol
    })
    .editLegendBorder({
      target: "points",
      border: ordinal % 3 === 0
        ? false
        : ordinal % 3 === 1 ? true : {
            color: "#cbd5e1",
            lineWidth: 1,
            padding: 10,
            background: "#ffffff"
          }
    })
    .createTitle(titleOptions(base.context, variant))
    .editTitle({
      ...titleOptions(base.context, variant),
      text: `${base.context.title}: guide review`,
      subtitle: ordinal % 2 === 0 ? false : base.context.question
    });

  program = program
    .removeTitle()
    .removeLegend({ target: "points", channels: ["color"] })
    .removeGrid({ horizontal: true, vertical: true, theta: false, radial: false })
    .removeXAxis({ scale: "x" })
    .removeYAxis({ scale: "y" });

  program = program
    .createLegend(legend)
    .editLegend({
      ...editableLegendOptions(variant, `${base.context.dimensionText} group`),
      title: ordinal % 3 === 0
        ? false
        : ordinal % 3 === 1 ? "auto" : `${base.context.dimensionText} group`
    })
    .editLegendLayout({
      target: "points",
      position: legend.position,
      align: legend.align,
      direction: legend.direction,
      ...(legend.columns === undefined ? {} : { columns: legend.columns }),
      offset: legend.offset,
      titlePosition: legend.titlePosition,
      itemGap: legend.itemGap
    })
    .removeLegend({ target: "points", channels: ["color"] });

  program = program
    .createXAxis(xAxis)
    .editXAxis({ line: false, ticksAndLabels: false, title: false })
    .createXAxis(xAxis)
    .editXAxis({ ticks: false, labels: false })
    .removeXAxis({ scale: "x" })
    .createYAxis(yAxis)
    .editYAxis({ line: false, ticksAndLabels: false, title: false })
    .createYAxis(yAxis)
    .editYAxis({ ticks: false, labels: false })
    .removeYAxis({ scale: "y" });

  program = program
    .createAxes({ coordinate: { id: "main", type: "cartesian" }, x: false, y: yAxis })
    .removeYAxis({ coordinate: "main", scale: "y" })
    .createAxes({ coordinate: { id: "main", type: "auto" }, x: xAxis, y: false })
    .removeXAxis({ coordinate: "main", scale: "x" })
    .createXAxis(xAxis)
    .createYAxis(yAxis)
    .removeXAxis({ scale: "x" })
    .removeYAxis({ scale: "y" });

  program = program
    .createXAxisLine({ scale: "x", position: xPosition, color: "#475569", lineWidth: 1.2 })
    .createYAxisLine({ scale: "y", position: yPosition, color: "#475569", lineWidth: 1.2 })
    .createXAxisTicks(directTickOptions("x", xPosition, xPolicy, base.xValues))
    .createYAxisTicks(directTickOptions("y", yPosition, yPolicy, base.yValues))
    .createXAxisLabels(directLabelOptions("x", xPosition, xPolicy, base.xValues, base.xFormat))
    .createYAxisLabels(directLabelOptions("y", yPosition, yPolicy, base.yValues, base.yFormat))
    .createXAxisTitle({ ...axisTitle(base.xTitle, xPosition, at), scale: "x" })
    .createYAxisTitle({ ...axisTitle(base.yTitle, yPosition, at), scale: "y" })
    .removeXAxis({ scale: "x" })
    .removeYAxis({ scale: "y" });

  program = program
    .createXAxisLabels(directLabelOptions(
      "x",
      xPosition,
      xAlternatePolicy,
      base.xValues,
      xCoverageFormat
    ))
    .createYAxisLabels(directLabelOptions(
      "y",
      yPosition,
      yAlternatePolicy,
      base.yValues,
      yCoverageFormat
    ))
    .removeXAxis({ scale: "x" })
    .removeYAxis({ scale: "y" });

  program = program
    .createXAxisTicksAndLabels(
      directTicksAndLabelsOptions("x", xPosition, xAlternatePolicy, base.xValues, base.xFormat)
    )
    .createYAxisTicksAndLabels(
      directTicksAndLabelsOptions("y", yPosition, yAlternatePolicy, base.yValues, base.yFormat)
    )
    .removeXAxis({ scale: "x" })
    .removeYAxis({ scale: "y" });

  program = program
    .createGrid({
      horizontal: {
        scale: "y",
        coordinate: "main",
        ...tickPolicy(yPolicy, base.yValues, 5),
        color: "#dbeafe",
        lineWidth: 0.8,
        strokeDash: [4, 3]
      },
      vertical: {
        scale: "x",
        coordinate: "main",
        ...tickPolicy(xPolicy, base.xValues, 5),
        color: "#f1f5f9",
        lineWidth: 0.8,
        strokeDash: [2, 3]
      },
      theta: false,
      radial: false
    })
    .removeGrid({ horizontal: true, vertical: true, theta: false, radial: false })
    .createGrid({ horizontal: true, vertical: false, theta: false, radial: false })
    .removeGrid({ horizontal: true, vertical: false, theta: false, radial: false })
    .createGrid({ horizontal: false, vertical: true, theta: false, radial: false })
    .removeGrid({ horizontal: false, vertical: true, theta: false, radial: false })
    .createHorizontalGrid({
      scale: "y",
      coordinate: "main",
      ...tickPolicy(yPolicy, base.yValues, 5),
      color: "#dbeafe",
      lineWidth: 0.8,
      strokeDash: [4, 3]
    })
    .createVerticalGrid({
      scale: "x",
      coordinate: "main",
      ...tickPolicy(xPolicy, base.xValues, 5),
      color: "#f1f5f9",
      lineWidth: 0.8,
      strokeDash: [2, 3]
    })
    .editHorizontalGrid({
      ...tickPolicy(yAlternatePolicy, base.yValues, 4),
      color: "#dbeafe",
      lineWidth: 0.7,
      strokeDash: [3, 3]
    })
    .editVerticalGrid({
      ...tickPolicy(xAlternatePolicy, base.xValues, 4),
      color: "#f1f5f9",
      lineWidth: 0.7,
      strokeDash: []
    })
    .removeGrid({ horizontal: true, vertical: true, theta: false, radial: false });

  program = program
    .createLegend(legend)
    .removeLegend({ target: "points", channels: ["color"] })
    .createGuides({ axes: false, grid: false, legend })
    .removeLegend({ target: "points", channels: ["color"] })
    .createGuides({ axes: { x: xAxis, y: yAxis }, grid: false, legend: false })
    .removeXAxis({ coordinate: "main", scale: "x" })
    .removeYAxis({ coordinate: "main", scale: "y" })
    .createGuides({ axes: false, grid: { horizontal: true, vertical: true }, legend: false })
    .removeGrid({ horizontal: true, vertical: true, theta: false, radial: false })
    .createAxes({ coordinate: { id: "main", type: "cartesian" }, x: xAxis, y: yAxis })
    .createGrid({ horizontal: true, vertical: true, theta: false, radial: false })
    .createLegend(initialAxesLegend)
    .createTitle(titleOptions(base.context, variant, { final: true }));
  return program;
}

function buildCartesian(factors) {
  return exerciseCartesianGuides(
    factors,
    pointSummaryBase(factors, "guide-scale-cartesian")
  );
}

function buildSimpleGuide(factors) {
  const view = summaryView(factors);
  const context = contextFor(factors.dataset, view, "guide-scale-vocabulary");
  const { variant } = factors;
  return chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createScale({
      id: "x",
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: variant.nice,
      zero: variant.zero,
      reverse: variant.reverse
    })
    .createPointMark({ id: "points", fill: "#2563eb", opacity: 0.82 })
    .encodeX({ target: "points", field: "rank", scale: { id: "x" } })
    .encodeY({ target: "points", field: "value", scale: { nice: true, zero: false } })
    .encodePointRadius({ target: "points", value: 5 })
    .createAxes({
      x: { ticksAndLabels: { count: 4 }, title: { text: `${context.dimensionText} rank` } },
      y: { ticksAndLabels: { count: 4 }, title: { text: context.measureText } }
    })
    .createTitle(titleOptions(context, variant, { final: true }));
}

function temporalPointBase(factors) {
  const view = orderedView(factors);
  const context = contextFor(factors.dataset, view, "guide-scale-temporal");
  const { variant } = factors;
  const timeOnX = variant.timeAxis === "x";
  const initialReverse = variant.id.length % 2 === 0;
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createScale({
      id: variant.timeAxis,
      type: "time",
      domain: "auto",
      range: "auto",
      nice: !initialReverse,
      clamp: initialReverse,
      reverse: initialReverse,
      unknown: timeOnX ? CANVAS.margin.left : CANVAS.height - CANVAS.margin.bottom
    })
    .createPointMark({
      id: "points",
      shape: "circle",
      opacity: 0.82,
      stroke: "#ffffff",
      strokeWidth: 0.8
    })
    .encodeX({
      target: "points",
      field: timeOnX ? "position" : "value",
      fieldType: timeOnX ? "temporal" : "quantitative",
      scale: timeOnX ? { id: "x" } : { nice: true, zero: false }
    })
    .encodeY({
      target: "points",
      field: timeOnX ? "value" : "position",
      fieldType: timeOnX ? "quantitative" : "temporal",
      scale: timeOnX ? { nice: true, zero: false } : { id: "y" }
    })
    .encodeColor({
      target: "points",
      field: "group",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .encodeSize({ target: "points", field: "count", scale: { range: [24, 140] } })
    .editScale({
      id: variant.timeAxis,
      type: "time",
      domain: "auto",
      range: "auto",
      nice: initialReverse,
      clamp: !initialReverse,
      reverse: !initialReverse,
      unknown: timeOnX ? CANVAS.margin.left + 10 : CANVAS.height - CANVAS.margin.bottom - 10
    });
  const xDomain = program.resolvedScales.x.domain;
  const yDomain = program.resolvedScales.y.domain;
  return {
    program,
    view,
    context,
    xFormat: timeOnX ? variant.format : ".2f",
    yFormat: timeOnX ? ".2f" : variant.format,
    xValues: endpointValues(xDomain),
    yValues: endpointValues(yDomain),
    xTitle: timeOnX ? context.sequenceText ?? "Time" : context.measureText,
    yTitle: timeOnX ? context.measureText : context.sequenceText ?? "Time"
  };
}

function buildTemporal(factors) {
  return exerciseCartesianGuides(factors, temporalPointBase(factors));
}

function scaleBoolean(variant) {
  return variant.id.length % 2 === 0;
}

function positionScaleOptions(variant, view) {
  const maximum = Math.max(...view.rows.map(row => row.rank));
  const initial = scaleBoolean(variant);
  const common = {
    id: "x",
    type: variant.type,
    range: "auto",
    clamp: initial,
    reverse: initial,
    unknown: CANVAS.margin.left + 12
  };
  if (variant.type === "linear") {
    return {
      create: { ...common, domain: "auto", nice: initial, zero: !initial },
      edit: {
        ...common,
        domain: [1, maximum],
        nice: !initial,
        zero: initial,
        clamp: !initial,
        reverse: !initial,
        unknown: CANVAS.margin.left + 24
      }
    };
  }
  const domain = [1, Math.max(2, maximum)];
  const parameter = variant.type === "log"
    ? { base: initial ? 2 : 10 }
    : variant.type === "pow"
      ? { exponent: initial ? 1.5 : 2 }
      : variant.type === "symlog" ? { constant: initial ? 0.5 : 1 } : {};
  const editedParameter = variant.type === "log"
    ? { base: initial ? 10 : 2 }
    : variant.type === "pow"
      ? { exponent: initial ? 2 : 1.5 }
      : variant.type === "symlog" ? { constant: initial ? 1 : 0.5 } : {};
  return {
    create: { ...common, domain, ...parameter },
    edit: {
      ...common,
      domain: "auto",
      clamp: !initial,
      reverse: !initial,
      unknown: CANVAS.margin.left + 24,
      ...editedParameter
    }
  };
}

function categoryScaleOptions(variant, view) {
  const domain = view.rows.map(row => row.category);
  const initial = scaleBoolean(variant);
  const shared = {
    id: "y",
    type: variant.type,
    domain,
    range: "auto",
    reverse: initial,
    unknown: CANVAS.margin.top + 12
  };
  if (variant.type === "band") {
    return {
      create: { ...shared, paddingInner: 0.18, paddingOuter: 0.12, align: 0.2 },
      edit: {
        ...shared,
        domain: "auto",
        reverse: !initial,
        paddingInner: 0.32,
        paddingOuter: 0.2,
        align: 0.8,
        unknown: CANVAS.margin.top + 24
      }
    };
  }
  if (variant.type === "point") {
    return {
      create: { ...shared, padding: 0.2, align: 0.2 },
      edit: {
        ...shared,
        domain: "auto",
        reverse: !initial,
        padding: 0.4,
        align: 0.8,
        unknown: CANVAS.margin.top + 24
      }
    };
  }
  throw new Error(`Unsupported category position scale "${variant.type}".`);
}

function ordinalShapeScaleOptions(variant, view) {
  const shapes = [
    "circle", "square", "diamond", "triangle-up", "triangle-down", "triangle-left",
    "triangle-right", "plus", "cross", "star", "hexagon", "wye"
  ];
  return {
    create: {
      id: "shape",
      type: "ordinal",
      domain: view.rows.map(row => row.category),
      range: shapes,
      unknown: "circle"
    },
    edit: {
      id: "shape",
      type: "ordinal",
      domain: "auto",
      range: [...shapes].reverse(),
      unknown: "diamond"
    }
  };
}

function sequentialPalette(variant, objectForm, edited = false) {
  if (!objectForm) return variant.palette;
  return {
    name: variant.palette,
    count: edited ? 9 : 7,
    ...(CONTINUOUS_PALETTES.has(variant.palette)
      ? { extent: edited ? [0.15, 0.95] : [0.05, 0.9] }
      : {})
  };
}

function quantitativeColorEncoding(view, context, variant) {
  const candidates = variant.type === "sequential"
    ? [{ field: "share", legendTitle: context.measureText }]
    : [
        { field: "share", legendTitle: context.measureText },
        {
          field: "count",
          legendTitle: `Source records per ${context.dimensionText}`
        },
        {
          field: "rank",
          legendTitle: `${context.dimensionText} aggregate rank`
        }
      ];
  for (const candidate of candidates) {
    const values = view.rows.map(row => row[candidate.field]).filter(Number.isFinite);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    if (variant.type === "sequential" || minimum < maximum) {
      return Object.freeze({
        ...candidate,
        values: Object.freeze(values),
        extent: Object.freeze([minimum, maximum]),
        normalized: candidate.field === "share"
      });
    }
  }
  throw new Error(
    `Dataset "${view.provenance.sourceDataset}" has no varying truthful quantitative color field.`
  );
}

function interpolatedThresholds(extent, ratios) {
  const [minimum, maximum] = extent;
  return ratios.map(ratio => minimum + (maximum - minimum) * ratio);
}

function colorScaleOptions(variant, {
  id = "color",
  createObjectPalette = false,
  encoding
} = {}) {
  const initial = scaleBoolean(variant);
  if (variant.type === "sequential") {
    return {
      create: {
        id,
        type: "sequential",
        domain: "auto",
        palette: sequentialPalette(variant, createObjectPalette),
        interpolate: variant.interpolate,
        clamp: initial,
        reverse: initial,
        unknown: "#94a3b8"
      },
      edit: {
        id,
        type: "sequential",
        domain: [0, 1],
        palette: sequentialPalette(variant, !createObjectPalette, true),
        interpolate: variant.interpolate,
        clamp: !initial,
        reverse: !initial,
        unknown: "#64748b"
      }
    };
  }
  const range = ["#eff6ff", "#93c5fd", "#3b82f6", "#1e3a8a"];
  const normalized = encoding?.normalized ?? true;
  const extent = normalized ? [0, 1] : encoding.extent;
  const domain = variant.type === "threshold"
    ? interpolatedThresholds(extent, [0.25, 0.5, 0.75])
    : variant.type === "quantile" && !normalized ? encoding.values : extent;
  return {
    create: {
      id,
      type: variant.type,
      domain,
      range,
      reverse: initial,
      unknown: "#94a3b8"
    },
    edit: {
      id,
      type: variant.type,
      domain: variant.type === "threshold"
        ? interpolatedThresholds(extent, [0.2, 0.55, 0.8])
        : "auto",
      range: [...range].reverse(),
      reverse: !initial,
      unknown: "#64748b"
    }
  };
}

function buildScaleVocabulary(factors) {
  const view = summaryView(factors);
  const context = contextFor(factors.dataset, view, "guide-scale-vocabulary");
  const { variant } = factors;
  const colorEncoding = variant.kind === "color"
    ? quantitativeColorEncoding(view, context, variant)
    : undefined;
  const definitions = variant.kind === "position"
    ? positionScaleOptions(variant, view)
    : variant.kind === "category"
      ? categoryScaleOptions(variant, view)
      : variant.kind === "category-shape"
        ? ordinalShapeScaleOptions(variant, view)
        : colorScaleOptions(variant, { encoding: colorEncoding });
  const comparisonDefinitions = variant.type === "sequential"
    ? colorScaleOptions(variant, {
        id: "colorComparison",
        createObjectPalette: true
      })
    : undefined;
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createScale(definitions.create)
    .createPointMark({
      id: "points",
      shape: "circle",
      opacity: 0.84,
      stroke: "#ffffff",
      strokeWidth: 0.8
    });
  program = program.encodeX({
    target: "points",
    field: "rank",
    scale: variant.kind === "position" ? { id: "x" } : { nice: true, zero: false }
  });
  program = program.encodeY({
    target: "points",
    field: variant.kind === "category" ? "category" : "value",
    fieldType: variant.kind === "category" ? "nominal" : "quantitative",
    scale: variant.kind === "category" ? { id: "y" } : { nice: true, zero: false }
  });
  program = program.encodeColor({
    target: "points",
    field: variant.kind === "color" ? colorEncoding.field : "category",
    fieldType: variant.kind === "color" ? "quantitative" : "nominal",
    scale: variant.kind === "color" ? { id: "color" }
      : { palette: "tableau10" }
  });
  if (variant.kind === "category-shape") {
    program = program.encodeShape({
      target: "points",
      field: "category",
      fieldType: "nominal",
      scale: definitions.create
    });
  }
  program = program.encodePointRadius({ target: "points", value: 5 });
  if (variant.kind === "position" && variant.type === "linear") {
    program = program
      .createScale({
        ...definitions.create,
        id: "xComparison",
        nice: !definitions.create.nice,
        zero: !definitions.create.zero
      })
      .createPointMark({
        id: "positionComparisonPoints",
        shape: "diamond",
        fill: "#94a3b8",
        opacity: 0.3,
        stroke: "#ffffff",
        strokeWidth: 0.6
      })
      .encodeX({
        target: "positionComparisonPoints",
        field: "rank",
        scale: { id: "xComparison" }
      })
      .encodeY({
        target: "positionComparisonPoints",
        field: "center",
        scale: { nice: true, zero: false }
      })
      .encodePointRadius({ target: "positionComparisonPoints", value: 3.5 });
  }
  if (comparisonDefinitions !== undefined) {
    program = program
      .createScale(comparisonDefinitions.create)
      .createPointMark({
        id: "comparisonPoints",
        shape: "diamond",
        opacity: 0.3,
        stroke: "#ffffff",
        strokeWidth: 0.6
      })
      .encodeX({
        target: "comparisonPoints",
        field: "rank",
        scale: { nice: true, zero: false }
      })
      .encodeY({
        target: "comparisonPoints",
        field: "value",
        scale: { nice: true, zero: false }
      })
      .encodeColor({
        target: "comparisonPoints",
        field: "share",
        fieldType: "quantitative",
        scale: { id: "colorComparison" }
      })
      .encodePointRadius({ target: "comparisonPoints", value: 3.5 })
      .editScale(definitions.edit)
      .editScale(comparisonDefinitions.edit);
  } else {
    program = program.editScale(definitions.edit);
  }
  if (variant.kind === "position" && variant.type === "linear") {
    program = program.editScale({
      id: "x",
      nice: !definitions.edit.nice,
      zero: !definitions.edit.zero
    });
  }
  program = program
    .createAxes({
      x: { scale: "x", title: { text: `${context.dimensionText} rank` } },
      y: { title: { text: variant.kind === "category" ? context.dimensionText : context.measureText } }
    });
  if (variant.kind === "color" && variant.type === "sequential") {
    const gradientLegend = {
      target: "points",
      channels: ["color"],
      position: "right",
      align: "center",
      offset: 180,
      title: context.measureText,
      count: 5,
      gradient: { length: 180, thickness: 18 },
      labels: {
        offset: 9,
        color: "#334155",
        fontSize: 12,
        fontFamily: "sans-serif",
        fontWeight: 500
      },
      titleStyle: {
        color: "#0f172a",
        fontSize: 13,
        fontFamily: "sans-serif",
        fontWeight: 700
      },
      border: { color: "#cbd5e1", lineWidth: 1, padding: 10, background: "#ffffff" }
    };
    program = program
      .createLegend(gradientLegend)
      .editLegend({
        target: "points",
        count: 4,
        gradient: { length: 160, thickness: 16 },
        position: "right",
        align: "center",
        offset: 170,
        title: context.measureText
      })
      .editLegendSymbols({
        target: "points",
        count: 4,
        gradient: { length: 160, thickness: 16 }
      })
      .removeLegend({ target: "points", channels: ["color"] })
      .createGuides({ axes: false, grid: false, legend: gradientLegend });
  } else if (variant.kind === "color") {
    program = program.createLegend({
      target: "points",
      channels: ["color"],
      position: "right",
      align: "center",
      direction: "vertical",
      offset: 180,
      title: colorEncoding.legendTitle,
      symbol: { width: 20, height: 12, stroke: "#ffffff", strokeWidth: 1 },
      labels: {
        offset: 9,
        color: "#334155",
        fontSize: 12,
        fontFamily: "sans-serif",
        fontWeight: 500
      },
      titleStyle: {
        color: "#0f172a",
        fontSize: 13,
        fontFamily: "sans-serif",
        fontWeight: 700
      },
      itemGap: 28,
      border: { color: "#cbd5e1", lineWidth: 1, padding: 10, background: "#ffffff" }
    });
  } else {
    const { columns: _columns, ...scaleLegend } = legendOptions(
      variant,
      context.dimensionText,
      variant.kind === "category-shape" ? { channels: ["shape"] } : undefined
    );
    program = program.createLegend({
      ...scaleLegend,
      position: "right",
      align: "center",
      direction: "vertical",
      offset: 180
    });
  }
  return program.createTitle(titleOptions(context, variant, { final: true }));
}

function polarTickStyle() {
  return {
    length: 8,
    color: "#64748b",
    lineWidth: 1
  };
}

function polarLabelStyle(format = ".1f") {
  return {
    offset: 14,
    format,
    color: "#334155",
    fontSize: 11,
    fontFamily: "sans-serif",
    fontWeight: 500
  };
}

function polarTitle(text, position) {
  return {
    text,
    offset: 18,
    color: "#0f172a",
    fontSize: 13,
    fontFamily: "sans-serif",
    fontWeight: 700,
    ...(position === undefined ? {} : { position })
  };
}

function polarCompleteAxis({
  scale,
  coordinate = "polar",
  angle,
  policy,
  values,
  title,
  titlePosition
}) {
  return {
    scale,
    coordinate,
    angle,
    line: { color: "#475569", lineWidth: 1.25 },
    ticksAndLabels: {
      ...tickPolicy(policy, values, 5),
      ticks: polarTickStyle(),
      labels: polarLabelStyle()
    },
    title: titlePosition === false
      ? false
      : polarTitle(title, titlePosition)
  };
}

function buildPolar(factors) {
  const view = summaryView(factors);
  const context = contextFor(factors.dataset, view, "guide-scale-polar");
  const { variant } = factors;
  const policy = variant.tickPolicy;
  const alternatePolicy = policy === "count" ? "values" : "count";
  const angle = variant.id === "values-outside" ? 180 : variant.id === "title-opt-out" ? 270 : 90;
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createPointMark({
      id: "points",
      shape: "circle",
      opacity: 0.86,
      stroke: "#ffffff",
      strokeWidth: 0.8
    })
    .encodeTheta({
      target: "points",
      field: "rank",
      fieldType: "quantitative",
      scale: { id: "theta", type: "linear", nice: true, zero: false }
    })
    .encodeR({
      target: "points",
      field: "share",
      fieldType: "quantitative",
      scale: { id: "radius", type: "linear", nice: true, zero: true }
    })
    .encodeColor({
      target: "points",
      field: "category",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .encodePointRadius({ target: "points", value: 6 });
  const thetaDomain = program.resolvedScales.theta.domain;
  const radiusDomain = program.resolvedScales.radius.domain;
  const thetaValues = endpointValues(thetaDomain);
  const radiusValues = endpointValues(radiusDomain);
  const thetaAxis = polarCompleteAxis({
    scale: "theta",
    angle: 0,
    policy,
    values: thetaValues,
    title: `${context.dimensionText} rank`,
    titlePosition: variant.titlePosition === false ? false : undefined
  });
  const radiusAxis = polarCompleteAxis({
    scale: "radius",
    angle,
    policy,
    values: radiusValues,
    title: `${context.measureText} share`,
    titlePosition: variant.titlePosition
  });
  const legend = legendOptions(variant, context.dimensionText);
  program = program.createGuides({
    axes: {
      coordinate: { id: "polar", type: "polar" },
      theta: thetaAxis,
      radius: radiusAxis
    },
    grid: {
      horizontal: false,
      vertical: false,
      theta: {
        scale: "theta",
        coordinate: "polar",
        ...tickPolicy(policy, thetaValues, 5),
        color: "#dbeafe",
        lineWidth: 0.8,
        strokeDash: [4, 3]
      },
      radial: {
        scale: "radius",
        coordinate: "polar",
        ...tickPolicy(policy, radiusValues, 5),
        color: "#e2e8f0",
        lineWidth: 0.8,
        strokeDash: [2, 3]
      }
    },
    legend
  });

  if (variant.titlePosition === false) {
    program = program
      .removeThetaAxis({ coordinate: "polar", scale: "theta" })
      .removeRadialAxis({ coordinate: "polar", scale: "radius" })
      .createThetaAxis({
        ...thetaAxis,
        title: polarTitle(`${context.dimensionText} rank`)
      })
      .createRadialAxis({
        ...radiusAxis,
        title: polarTitle(`${context.measureText} share`, "inside")
      });
  }

  program = program
    .editThetaAxisLine({ color: "#334155", lineWidth: 1.5 })
    .editRadialAxisLine({ color: "#334155", lineWidth: 1.5 })
    .editThetaAxisTicks({
      ...tickPolicy(alternatePolicy, thetaValues, 4),
      ...polarTickStyle()
    })
    .editRadialAxisTicks({
      ...tickPolicy(alternatePolicy, radiusValues, 4),
      ...polarTickStyle()
    })
    .editThetaAxisLabels({
      ...tickPolicy(alternatePolicy, thetaValues, 4),
      ...polarLabelStyle(".0f")
    })
    .editRadialAxisLabels({
      ...tickPolicy(alternatePolicy, radiusValues, 4),
      ...polarLabelStyle(".1%")
    })
    .editThetaAxisLabels({
      ...tickPolicy(alternatePolicy, thetaValues, 4),
      ...polarLabelStyle({ decimals: 3 })
    })
    .editRadialAxisLabels({
      ...tickPolicy(alternatePolicy, radiusValues, 4),
      ...polarLabelStyle({ decimals: 3 })
    })
    .editThetaAxisTitle(polarTitle(`${context.dimensionText} rank`))
    .editRadialAxisTitle(polarTitle(
      `${context.measureText} share`,
      variant.titlePosition === false ? "inside" : variant.titlePosition
    ))
    .editThetaAxis({
      line: { color: "#475569", lineWidth: 1.2 },
      ticks: {
        ...tickPolicy(policy, thetaValues, 5),
        ...polarTickStyle()
      },
      labels: {
        ...tickPolicy(policy, thetaValues, 5),
        ...polarLabelStyle(".1f")
      },
      title: polarTitle(`${context.dimensionText} rank`)
    })
    .editRadialAxis({
      angle,
      line: { color: "#475569", lineWidth: 1.2 },
      ticksAndLabels: {
        ...tickPolicy(policy, radiusValues, 5),
        ticks: polarTickStyle(),
        labels: polarLabelStyle(".1%")
      },
      title: polarTitle(
        `${context.measureText} share`,
        variant.titlePosition === false ? "inside" : variant.titlePosition
      )
    })
    .editThetaGrid({
      ...tickPolicy(alternatePolicy, thetaValues, 4),
      color: "#dbeafe",
      lineWidth: 0.7,
      strokeDash: [3, 3]
    })
    .editRadialGrid({
      ...tickPolicy(alternatePolicy, radiusValues, 4),
      color: "#e2e8f0",
      lineWidth: 0.7,
      strokeDash: [1, 1]
    })
    .editGrid({
      theta: {
        ...tickPolicy(policy, thetaValues, 5),
        color: "#dbeafe",
        lineWidth: 0.8,
        strokeDash: [4, 2]
      },
      radial: {
        ...tickPolicy(policy, radiusValues, 5),
        color: "#e2e8f0",
        lineWidth: 0.8,
        strokeDash: [2, 4]
      }
    });

  program = program
    .removeLegend({ target: "points", channels: ["color"] })
    .removeGrid({ horizontal: false, vertical: false, theta: true, radial: true })
    .removeThetaAxis({ coordinate: "polar", scale: "theta" })
    .removeRadialAxis({ coordinate: "polar", scale: "radius" });

  program = program
    .createAxes({
      coordinate: { id: "polar", type: "polar" },
      theta: thetaAxis,
      radius: radiusAxis
    })
    .removeThetaAxis({ coordinate: "polar", scale: "theta" })
    .removeRadialAxis({ coordinate: "polar", scale: "radius" })
    .createThetaAxis(thetaAxis)
    .createRadialAxis(radiusAxis)
    .editThetaAxis({
      ticksAndLabels: {
        ...tickPolicy(alternatePolicy, thetaValues, 4),
        ticks: polarTickStyle(),
        labels: polarLabelStyle(".0f")
      }
    })
    .editRadialAxis({
      angle,
      ticks: {
        ...tickPolicy(alternatePolicy, radiusValues, 4),
        ...polarTickStyle()
      },
      labels: {
        ...tickPolicy(alternatePolicy, radiusValues, 4),
        ...polarLabelStyle(".1%")
      }
    })
    .removeThetaAxis({ coordinate: "polar", scale: "theta" })
    .removeRadialAxis({ coordinate: "polar", scale: "radius" });

  program = program
    .createGrid({
      horizontal: false,
      vertical: false,
      theta: {
        scale: "theta",
        coordinate: "polar",
        ...tickPolicy(policy, thetaValues, 5),
        color: "#dbeafe",
        lineWidth: 0.8,
        strokeDash: [4, 3]
      },
      radial: {
        scale: "radius",
        coordinate: "polar",
        ...tickPolicy(policy, radiusValues, 5),
        color: "#e2e8f0",
        lineWidth: 0.8,
        strokeDash: [2, 3]
      }
    })
    .removeGrid({ horizontal: false, vertical: false, theta: true, radial: true })
    .createGrid({ horizontal: false, vertical: false, theta: true, radial: true })
    .removeGrid({ horizontal: false, vertical: false, theta: true, radial: true })
    .createThetaGrid({
      scale: "theta",
      coordinate: "polar",
      ...tickPolicy(policy, thetaValues, 5),
      color: "#dbeafe",
      lineWidth: 0.8,
      strokeDash: [4, 3]
    })
    .createRadialGrid({
      scale: "radius",
      coordinate: "polar",
      ...tickPolicy(policy, radiusValues, 5),
      color: "#e2e8f0",
      lineWidth: 0.8,
      strokeDash: [2, 3]
    })
    .editThetaGrid({
      ...tickPolicy(alternatePolicy, thetaValues, 4),
      color: "#dbeafe",
      lineWidth: 0.7,
      strokeDash: [3, 3]
    })
    .editRadialGrid({
      ...tickPolicy(alternatePolicy, radiusValues, 4),
      color: "#e2e8f0",
      lineWidth: 0.7,
      strokeDash: [1, 1]
    })
    .removeGrid({ horizontal: false, vertical: false, theta: true, radial: true });

  program = program
    .createGuides({ axes: false, grid: false, legend })
    .removeLegend({ target: "points", channels: ["color"] })
    .createGuides({ axes: { theta: thetaAxis, radius: radiusAxis }, grid: false, legend: false })
    .removeThetaAxis({ coordinate: "polar", scale: "theta" })
    .removeRadialAxis({ coordinate: "polar", scale: "radius" })
    .createGuides({ axes: false, grid: { theta: true, radial: true }, legend: false })
    .removeGrid({ horizontal: false, vertical: false, theta: true, radial: true })
    .createAxes({
      coordinate: { id: "polar", type: "polar" },
      theta: thetaAxis,
      radius: radiusAxis
    })
    .createGrid({ horizontal: false, vertical: false, theta: true, radial: true })
    .createLegend(legendOptions(variant, context.dimensionText))
    .createTitle(titleOptions(context, variant, { final: true }));
  return program;
}

function buildParallelGuides(factors) {
  const view = parallelView(factors);
  const context = contextFor(factors.dataset, view, "guide-scale-parallel");
  const { variant } = factors;
  return chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createCoordinate({ id: "parallel", type: "parallel" })
    .createLineMark({
      id: "profileLines",
      strokeWidth: 1.2,
      opacity: 0.42
    })
    .encodeParallelCoordinates({
      target: "profileLines",
      coordinate: "parallel",
      dimensions: [
        {
          field: "sourceRowIndex",
          title: "Pinned source row",
          fieldType: "quantitative",
          scale: { type: "linear", nice: true, zero: true }
        },
        {
          field: "value",
          title: context.measureText,
          fieldType: "quantitative",
          scale: { type: "linear", nice: true, zero: false, reverse: variant.reverse }
        },
        {
          field: "orderNumeric",
          title: context.sequenceText ?? "Source order",
          fieldType: "quantitative",
          scale: { type: "linear", nice: true, zero: false }
        },
        {
          field: "category",
          title: context.dimensionText,
          fieldType: "ordinal",
          scale: { type: "point", padding: 0.25 }
        }
      ],
      key: "key",
      missing: variant.missing
    })
    .encodeColor({
      target: "profileLines",
      field: "category",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .createAxes({ coordinate: { id: "parallel", type: "parallel" } })
    .createLegend(legendOptions(variant, context.dimensionText, {
      target: "profileLines",
      channels: ["color"]
    }))
    .createTitle(titleOptions(context, variant, { final: true }));
}

function buildFacetGuides(factors) {
  const view = facetView(factors);
  const context = contextFor(factors.dataset, view, "guide-scale-facet");
  const firstPolicy = factors.variant.first;
  const secondPolicy = firstPolicy === "independent" ? "shared" : "independent";
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createPointMark({
      id: "facetPoints",
      shape: "circle",
      opacity: 0.78,
      stroke: "#ffffff",
      strokeWidth: 0.7
    })
    .encodeX({
      target: "facetPoints",
      field: "sourceRowIndex",
      fieldType: "quantitative",
      scale: { nice: true, zero: false }
    })
    .encodeY({
      target: "facetPoints",
      field: "value",
      fieldType: "quantitative",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      target: "facetPoints",
      field: "category",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .encodeShape({
      target: "facetPoints",
      field: "subgroup",
      fieldType: "nominal"
    })
    .encodeSize({
      target: "facetPoints",
      field: "value",
      fieldType: "quantitative",
      scale: { range: [20, 100] }
    })
    .encodeOpacity({
      target: "facetPoints",
      field: "value",
      fieldType: "quantitative",
      scale: { range: [0.35, 0.9] }
    })
    .createLineMark({
      id: "facetLines",
      stroke: "#64748b",
      strokeWidth: 1.2,
      opacity: 0.42
    })
    .encodeX({
      target: "facetLines",
      field: "sourceRowIndex",
      fieldType: "quantitative",
      scale: { nice: true, zero: false }
    })
    .encodeY({
      target: "facetLines",
      field: "value",
      fieldType: "quantitative",
      scale: { nice: true, zero: false }
    })
    .encodeStrokeDash({
      target: "facetLines",
      field: "subgroup",
      fieldType: "nominal",
      scale: { range: [[], [5, 3], [2, 2], [8, 3, 2, 3]] }
    })
    .createBarMark({
      id: "xOffsetBars",
      opacity: 0.12,
      stroke: false
    })
    .encodeX({
      target: "xOffsetBars",
      field: "category",
      fieldType: "nominal",
      scale: { id: "barX", type: "band" }
    })
    .encodeY({
      target: "xOffsetBars",
      field: "sourceRowIndex",
      fieldType: "quantitative",
      aggregate: "count",
      scale: { id: "barY", type: "linear", nice: true, zero: true }
    })
    .encodeXOffset({
      target: "xOffsetBars",
      field: "subgroup",
      fieldType: "nominal",
      scale: { range: [-8, 8] },
      paddingInner: 0.15,
      paddingOuter: 0.1
    })
    .encodeColor({
      target: "xOffsetBars",
      field: "subgroup",
      fieldType: "nominal",
      layout: "group",
      scale: { id: "barColor", type: "ordinal", palette: "tableau10" }
    })
    .createBarMark({
      id: "yOffsetBars",
      opacity: 0.1,
      stroke: false
    })
    .encodeX({
      target: "yOffsetBars",
      field: "sourceRowIndex",
      fieldType: "quantitative",
      aggregate: "count",
      scale: { id: "horizontalX", type: "linear", nice: true, zero: true }
    })
    .encodeY({
      target: "yOffsetBars",
      field: "category",
      fieldType: "nominal",
      scale: { id: "horizontalY", type: "band" }
    })
    .encodeYOffset({
      target: "yOffsetBars",
      field: "subgroup",
      fieldType: "nominal",
      scale: { range: [-6, 6] },
      paddingInner: 0.15,
      paddingOuter: 0.1
    })
    .encodeColor({
      target: "yOffsetBars",
      field: "subgroup",
      fieldType: "nominal",
      layout: "group",
      scale: { id: "horizontalColor", type: "ordinal", palette: "tableau10" }
    })
    .createGuides({
      axes: {
        x: {
          scale: "x",
          ticksAndLabels: { count: 4 },
          title: { text: "Pinned source row" }
        },
        y: {
          scale: "y",
          ticksAndLabels: { count: 4 },
          title: { text: context.measureText }
        }
      },
      grid: false,
      legend: false
    })
    .createLegend({
      target: "facetLines",
      channels: ["strokeDash"],
      position: "top",
      align: "center",
      direction: "horizontal",
      columns: 4,
      offset: 48,
      titlePosition: "top",
      title: `${context.dimensionText} subgroup pattern`,
      symbol: { length: 28, lineWidth: 2 },
      labels: { offset: 8, fontSize: 11 },
      titleStyle: { fontSize: 12, fontWeight: 700 }
    })
    .editLegendSymbols({
      target: "facetLines",
      symbol: { length: 24, lineWidth: 2.5 }
    })
    .removeLegend({ target: "facetLines", channels: ["strokeDash"] })
    .createLegend({
      target: "facetPoints",
      channels: ["color"],
      position: "right",
      align: "center",
      direction: "vertical",
      offset: 150,
      title: context.dimensionText,
      symbol: "auto",
      labels: { offset: 8, fontSize: 11 },
      titleStyle: { fontSize: 12, fontWeight: 700 }
    })
    .facet({
      field: "subgroup",
      columns: factors.variant.columns,
      gap: factors.variant.gap,
      padding: factors.variant.padding,
      scales: {
        x: secondPolicy,
        y: secondPolicy,
        xOffset: secondPolicy,
        yOffset: secondPolicy,
        color: secondPolicy,
        shape: secondPolicy,
        size: secondPolicy,
        opacity: secondPolicy,
        strokeDash: secondPolicy
      },
      guides: { axes: "each", legend: false },
      align: factors.variant.align
    })
    .editFacetHeaders({
      fontSize: 13,
      fontFamily: "sans-serif",
      fontWeight: 700,
      color: "#334155",
      offset: 12
    })
    .editFacetScales({
      x: firstPolicy,
      y: firstPolicy,
      xOffset: firstPolicy,
      yOffset: firstPolicy,
      color: firstPolicy,
      shape: firstPolicy,
      size: firstPolicy,
      opacity: firstPolicy,
      strokeDash: firstPolicy
    })
    .editFacetGuides({
      axes: "outer",
      legend: false
    })
    .editFacetScales({
      x: secondPolicy,
      y: secondPolicy,
      xOffset: secondPolicy,
      yOffset: secondPolicy,
      color: secondPolicy,
      shape: secondPolicy,
      size: secondPolicy,
      opacity: secondPolicy,
      strokeDash: secondPolicy
    })
    .editFacetGuides({
      axes: "each",
      legend: secondPolicy === "shared" ? "shared" : false
    });
  return program.createTitle(titleOptions(context, factors.variant, { final: true }));
}

const CARTESIAN_ACTIONS = Object.freeze([
  "createGuides", "createAxes", "createXAxis", "createYAxis",
  "createXAxisLine", "createYAxisLine", "editXAxisLine", "editYAxisLine",
  "createXAxisTicks", "createYAxisTicks", "editXAxisTicks", "editYAxisTicks",
  "createXAxisLabels", "createYAxisLabels", "editXAxisLabels", "editYAxisLabels",
  "createXAxisTicksAndLabels", "createYAxisTicksAndLabels",
  "editXAxisTicksAndLabels", "editYAxisTicksAndLabels",
  "createXAxisTitle", "createYAxisTitle", "editXAxisTitle", "editYAxisTitle",
  "editXAxis", "editYAxis", "removeXAxis", "removeYAxis",
  "createGrid", "createHorizontalGrid", "createVerticalGrid",
  "editHorizontalGrid", "editVerticalGrid", "editGrid", "removeGrid",
  "createLegend", "editLegend", "editLegendLayout", "editLegendLabels",
  "editLegendTitle", "editLegendSymbols", "editLegendBorder", "removeLegend",
  "createTitle", "editTitle", "removeTitle"
]);

function factorContract(dataset, capability, variants) {
  const fieldPair = realisticFieldPairDomain(dataset, capability);
  if (fieldPair.length === 0) return undefined;
  return Object.freeze({ fieldPair, variant: variants });
}

function coverageSchedule(variants, repeats = 5) {
  const selectionVariantIds = Array.from({ length: repeats }, () => variants)
    .flat()
    .map(variant => variant.id);
  const scheduledCounts = new Map();
  for (const variantId of selectionVariantIds) {
    scheduledCounts.set(variantId, (scheduledCounts.get(variantId) ?? 0) + 1);
  }
  const variantRequirements = Object.freeze([...scheduledCounts].map(([
    variantId,
    minimumOccurrences
  ]) => Object.freeze({
    variantId,
    minimumOccurrences,
    minimumDatasets: Math.min(minimumOccurrences, 3)
  })));
  return Object.freeze({
    factor: "variant",
    selectionVariantIds: Object.freeze(selectionVariantIds),
    minimumSelections: selectionVariantIds.length,
    assignment: "round-robin-datasets",
    variantRequirements,
    // Engine compatibility: coverageScheduleReport clamps this maximum to each
    // ID's repeated selection count. variantRequirements is the canonical,
    // explicit per-ID contract exposed to audits and humans.
    minimumDatasetsPerRequirement: Math.max(...variantRequirements.map(value =>
      value.minimumDatasets
    ))
  });
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function directTraceEntries(program, operation) {
  return (program.trace.children ?? []).filter(entry => entry.op === operation);
}

function containsValue(value, expected) {
  if (sameValue(value, expected)) return true;
  if (value === null || typeof value !== "object") return false;
  return Object.values(value).some(child => containsValue(child, expected));
}

function scalePaletteName(value) {
  return typeof value === "string" ? value : value?.name;
}

function variantHasDirectActionEvidence(program, variant) {
  if (variant.palette !== undefined) {
    return directTraceEntries(program, "createScale").some(({ args }) =>
      args.type === "sequential" &&
      scalePaletteName(args.palette) === variant.palette &&
      args.interpolate === variant.interpolate
    );
  }
  if (variant.kind !== undefined) {
    return directTraceEntries(program, "createScale").some(({ args }) =>
      args.type === variant.type
    );
  }
  if (variant.valueField !== undefined) {
    const axis = variant.valueAxis ?? "y";
    const encoding = directTraceEntries(program, axis === "x" ? "encodeX" : "encodeY")
      .some(({ args }) => args.target === "points" && args.field === variant.valueField);
    const formatting = (program.trace.children ?? []).some(entry =>
      /Axis|Guides/u.test(entry.op) && containsValue(entry.args, variant.format)
    );
    return encoding && formatting;
  }
  if (variant.timeAxis !== undefined) {
    const scale = directTraceEntries(program, "createScale").some(({ args }) =>
      args.id === variant.timeAxis && args.type === "time"
    );
    const formatting = (program.trace.children ?? []).some(entry =>
      /Axis|Guides/u.test(entry.op) && containsValue(entry.args, variant.format)
    );
    return scale && formatting;
  }
  if (variant.missing !== undefined) {
    return directTraceEntries(program, "encodeParallelCoordinates").some(({ args }) =>
      args.missing === variant.missing
    );
  }
  if (variant.tickPolicy !== undefined) {
    const angle = variant.id === "values-outside" ? 180
      : variant.id === "title-opt-out" ? 270 : 90;
    return directTraceEntries(program, "createGuides").some(({ args }) => {
      const radial = args.axes?.radius;
      const ticks = radial?.ticksAndLabels;
      return radial?.angle === angle && (
        variant.tickPolicy === "count" ? ticks?.count === 5 : ticks?.valuesCount > 0
      );
    });
  }
  if (variant.first !== undefined) {
    const facet = directTraceEntries(program, "facet").some(({ args }) =>
      args.columns === variant.columns && args.gap === variant.gap &&
      args.padding === variant.padding && args.align === variant.align
    );
    const firstResolution = directTraceEntries(program, "editFacetScales")
      .some(({ args }) => args.x === variant.first && args.y === variant.first);
    return facet && firstResolution;
  }
  if (variant.nice !== undefined) {
    return directTraceEntries(program, "createScale").some(({ args }) =>
      args.type === "linear" && args.nice === variant.nice &&
      args.zero === variant.zero && args.reverse === variant.reverse
    );
  }
  return false;
}

function observeFactorEffects(program, values, view, context) {
  const title = titleOptions(context, values.variant, { final: true });
  const createdData = directTraceEntries(program, "createData").some(({ args }) =>
    args.id === "analysisRows" && args.valuesCount === view.rows.length
  );
  const createdTitle = directTraceEntries(program, "createTitle").some(({ args }) =>
    args.text === title.text && args.subtitle === title.subtitle
  );
  const finalData = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "analysisRows"
  );
  const finalTitle = program.semanticSpec.title;
  const fieldPairObserved = createdData && createdTitle &&
    sameValue(finalData?.values, view.rows) && finalTitle?.text === context.title;
  const variantObserved = createdTitle && variantHasDirectActionEvidence(program, values.variant) &&
    finalTitle?.subtitle === analysisQuestion(context, values.variant);
  return Object.freeze([
    ...(fieldPairObserved ? [Object.freeze({
      factor: "fieldPair",
      value: values.fieldPair,
      evidence: "direct:createData+createTitle;final:analysisRows+visible-title"
    })] : []),
    ...(variantObserved ? [Object.freeze({
      factor: "variant",
      value: values.variant,
      evidence: "direct:variant-action+createTitle;final:visible-policy-subtitle"
    })] : [])
  ]);
}

function makeRecipe({
  id,
  complexity,
  family,
  capability,
  variants,
  build,
  view,
  actions,
  actionsFor,
  schedule = coverageSchedule(variants)
}) {
  const datasets = realisticDatasetIds();
  const factors = factorContract(INITIAL_FACTOR_DATASET, capability, variants);
  if (factors === undefined) {
    throw new Error(
      `${INITIAL_FACTOR_DATASET} must remain eligible for realistic ${capability} recipes.`
    );
  }
  return Object.freeze({
    id,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity,
    enforceFactorEffects: true,
    datasets: Object.freeze(datasets),
    factors,
    expectedDirectActions: actions,
    ...(actionsFor === undefined ? {} : { expectedDirectActionsFor: actionsFor }),
    coverageSchedule: schedule,
    factorsForDataset(dataset) {
      return factorContract(dataset, capability, variants);
    },
    build,
    observe() {
      return Object.freeze([]);
    },
    observeFactors(program, values) {
      const selectedView = view(values);
      const context = contextFor(values.dataset, selectedView, family);
      return observeFactorEffects(program, values, selectedView, context);
    },
    describe(values) {
      const selectedView = view(values);
      const context = contextFor(values.dataset, selectedView, family);
      return Object.freeze({
        corpus: "tidytuesday",
        chartFamily: family,
        complexity,
        sourceDatasetIds: Object.freeze([values.dataset]),
        title: context.title,
        analysisQuestion: analysisQuestion(context, values.variant),
        sourceFields: context.fields,
        provenance: selectedView.provenance,
        dataOperations: Object.freeze(
          selectedView.provenance.transformations.map(transformation => transformation.op)
        ),
        activeFeatures: Object.freeze([])
      });
    }
  });
}

const CARTESIAN_RECIPE = makeRecipe({
  id: "realistic-guide-scale-cartesian-lifecycle",
  complexity: "advanced",
  family: "guide-scale-cartesian",
  capability: "record",
  variants: NUMERIC_FORMAT_VARIANTS,
  build: buildCartesian,
  view: summaryView,
  actions: CARTESIAN_ACTIONS
});

const SIMPLE_ACTIONS = Object.freeze([
  "createScale",
  "createAxes",
  "createTitle"
]);

const SIMPLE_RECIPE = makeRecipe({
  id: "realistic-guide-scale-simple",
  complexity: "simple",
  family: "guide-scale-vocabulary",
  capability: "record",
  variants: SIMPLE_GUIDE_VARIANTS,
  build: buildSimpleGuide,
  view: summaryView,
  actions: SIMPLE_ACTIONS
});

const TEMPORAL_ACTIONS = Object.freeze([
  ...CARTESIAN_ACTIONS,
  "createScale",
  "editScale"
]);

const TEMPORAL_RECIPE = makeRecipe({
  id: "realistic-guide-scale-temporal-lifecycle",
  complexity: "advanced",
  family: "guide-scale-temporal",
  capability: "temporal",
  variants: TIME_FORMAT_VARIANTS,
  build: buildTemporal,
  view: orderedView,
  actions: TEMPORAL_ACTIONS
});

const PARALLEL_ACTIONS = Object.freeze([
  "createAxes",
  "createLegend",
  "createTitle"
]);

const PARALLEL_RECIPE = makeRecipe({
  id: "realistic-guide-scale-parallel-profiles",
  complexity: "advanced",
  family: "guide-scale-parallel",
  capability: "record",
  variants: PARALLEL_VARIANTS,
  build: buildParallelGuides,
  view: parallelView,
  actions: PARALLEL_ACTIONS
});

const SCALE_ACTIONS = Object.freeze([
  "createScale",
  "editScale",
  "createAxes",
  "createGuides",
  "createLegend",
  "editLegend",
  "editLegendSymbols",
  "removeLegend",
  "createTitle"
]);
const SCALE_NON_SEQUENTIAL_ACTIONS = Object.freeze(SCALE_ACTIONS.filter(action =>
  !["createGuides", "editLegend", "editLegendSymbols", "removeLegend"].includes(action)
));
const scaleActionsFor = factors => factors.variant.type === "sequential"
  ? SCALE_ACTIONS
  : SCALE_NON_SEQUENTIAL_ACTIONS;

const SCALE_PRIMARY_RECIPE = makeRecipe({
  id: "realistic-guide-scale-vocabulary-primary",
  complexity: "intermediate",
  family: "guide-scale-vocabulary",
  capability: "record",
  variants: SCALE_PRIMARY_VARIANTS,
  build: buildScaleVocabulary,
  view: summaryView,
  actions: SCALE_ACTIONS,
  actionsFor: scaleActionsFor,
  schedule: coverageSchedule(SCALE_PRIMARY_COVERAGE_VARIANTS, 1)
});

const SCALE_SECONDARY_RECIPE = makeRecipe({
  id: "realistic-guide-scale-vocabulary-secondary",
  complexity: "intermediate",
  family: "guide-scale-vocabulary",
  capability: "record",
  variants: SCALE_SECONDARY_VARIANTS,
  build: buildScaleVocabulary,
  view: summaryView,
  actions: SCALE_ACTIONS,
  actionsFor: scaleActionsFor,
  schedule: coverageSchedule(SCALE_SECONDARY_COVERAGE_VARIANTS, 1)
});

const SCALE_RECIPES = Object.freeze([SCALE_PRIMARY_RECIPE, SCALE_SECONDARY_RECIPE]);

const POLAR_ACTIONS = Object.freeze([
  "createGuides",
  "createAxes",
  "createThetaAxis",
  "createRadialAxis",
  "editThetaAxis",
  "editRadialAxis",
  "removeThetaAxis",
  "removeRadialAxis",
  "editThetaAxisLine",
  "editRadialAxisLine",
  "editThetaAxisTicks",
  "editRadialAxisTicks",
  "editThetaAxisLabels",
  "editRadialAxisLabels",
  "editThetaAxisTitle",
  "editRadialAxisTitle",
  "createGrid",
  "createThetaGrid",
  "createRadialGrid",
  "editGrid",
  "editThetaGrid",
  "editRadialGrid",
  "removeGrid"
]);

const POLAR_RECIPE = makeRecipe({
  id: "realistic-guide-scale-polar-lifecycle",
  complexity: "advanced",
  family: "guide-scale-polar",
  capability: "record",
  variants: POLAR_VARIANTS,
  build: buildPolar,
  view: summaryView,
  actions: POLAR_ACTIONS
});

const FACET_ACTIONS = Object.freeze([
  "facet",
  "editFacetHeaders",
  "editFacetScales",
  "editFacetGuides",
  "createLegend",
  "editLegendSymbols",
  "removeLegend",
  "createTitle"
]);

const FACET_RECIPE = makeRecipe({
  id: "realistic-guide-scale-facet-policies",
  complexity: "composite",
  family: "guide-scale-facet",
  capability: "facet",
  variants: FACET_VARIANTS,
  build: buildFacetGuides,
  view: facetView,
  actions: FACET_ACTIONS
});

export const REALISTIC_GUIDE_SCALE_RECIPES = Object.freeze([
  SIMPLE_RECIPE,
  CARTESIAN_RECIPE,
  TEMPORAL_RECIPE,
  PARALLEL_RECIPE,
  ...SCALE_RECIPES,
  POLAR_RECIPE,
  FACET_RECIPE
]);

export const REALISTIC_GUIDE_SCALE_COUNTS = Object.freeze({
  simple: 1,
  intermediate: 2,
  advanced: 4,
  composite: 1
});

export const REALISTIC_GUIDE_SCALE_COVERAGE_SELECTIONS = Object.freeze(
  Object.fromEntries(REALISTIC_GUIDE_SCALE_RECIPES.map(recipe => [
    recipe.id,
    recipe.coverageSchedule
  ]))
);

export const REALISTIC_GUIDE_SCALE_INTERACTIONS = Object.freeze([
  Object.freeze({
    members: Object.freeze(["action:createScale", "action:editScale"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }),
  Object.freeze({
    members: Object.freeze(["action:createGuides", "action:removeGrid"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }),
  Object.freeze({
    members: Object.freeze(["action:createAxes", "action:editGrid"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }),
  Object.freeze({
    members: Object.freeze(["action:editLegend", "action:removeLegend"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }),
  Object.freeze({
    members: Object.freeze(["action:createThetaAxis", "action:removeThetaAxis"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }),
  Object.freeze({
    members: Object.freeze(["action:createRadialAxis", "action:removeRadialAxis"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }),
  Object.freeze({
    members: Object.freeze(["action:editThetaGrid", "action:editRadialGrid"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }),
  Object.freeze({
    members: Object.freeze(["action:facet", "action:editFacetHeaders"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  }),
  Object.freeze({
    members: Object.freeze(["action:editFacetScales", "action:editFacetGuides"]),
    minimumOccurrences: 5,
    minimumDatasets: 3
  })
]);

export const REALISTIC_GUIDE_SCALE_EXPECTED_ACTIONS = Object.freeze([
  ...new Set(REALISTIC_GUIDE_SCALE_RECIPES.flatMap(recipe =>
    recipe === SIMPLE_RECIPE
      ? SIMPLE_ACTIONS
      : recipe === CARTESIAN_RECIPE
      ? CARTESIAN_ACTIONS
      : recipe === TEMPORAL_RECIPE
        ? TEMPORAL_ACTIONS
        : recipe === PARALLEL_RECIPE
          ? PARALLEL_ACTIONS
        : SCALE_RECIPES.includes(recipe)
          ? SCALE_ACTIONS
          : recipe === POLAR_RECIPE ? POLAR_ACTIONS : FACET_ACTIONS
  ))
]);

export function realisticGuideScaleWitnessFactors(recipe, dataset) {
  if (!REALISTIC_GUIDE_SCALE_RECIPES.includes(recipe)) {
    throw new Error(`Unknown realistic guide/scale recipe "${recipe?.id}".`);
  }
  const factors = recipe.factorsForDataset(dataset);
  if (factors === undefined) return Object.freeze([]);
  return Object.freeze(factors.variant.map((variant, index) => Object.freeze({
    dataset,
    fieldPair: factors.fieldPair[index % factors.fieldPair.length],
    variant
  })));
}

export function realisticGuideScaleCoverageFactors(recipe) {
  if (!REALISTIC_GUIDE_SCALE_RECIPES.includes(recipe)) {
    throw new Error(`Unknown realistic guide/scale recipe "${recipe?.id}".`);
  }
  const variants = new Map(recipe.factors.variant.map(variant => [variant.id, variant]));
  return Object.freeze(recipe.coverageSchedule.selectionVariantIds.map((variantId, index) => {
    const variant = variants.get(variantId);
    if (variant === undefined) {
      throw new Error(`${recipe.id} has no scheduled variant "${variantId}".`);
    }
    for (let offset = 0; offset < recipe.datasets.length; offset += 1) {
      const dataset = recipe.datasets[(index + offset) % recipe.datasets.length];
      const factors = recipe.factorsForDataset(dataset);
      if (factors === undefined) continue;
      return Object.freeze({
        dataset,
        fieldPair: factors.fieldPair[index % factors.fieldPair.length],
        variant
      });
    }
    throw new Error(`${recipe.id} has no eligible dataset for variant "${variantId}".`);
  }));
}
