import { chart } from "../../../src/index.js";

import {
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticRecordView,
  realisticSourceFields
} from "./realistic-data.js";

const INITIAL_DATASET = "tt-penguins";
const TARGET_ACTIONS = Object.freeze([
  "createViolinPlot",
  "createBoxPlot",
  "createGradientPlot",
  "createHeatmap",
  "createHistogram"
]);
const TARGET_REQUIREMENT_COUNTS = Object.freeze({
  createViolinPlot: 182,
  createBoxPlot: 171,
  createGradientPlot: 121,
  createHeatmap: 146,
  createHistogram: 225
});
const TARGET_REQUIREMENT_SHA256 = Object.freeze({
  createViolinPlot: "7b1d5ffde2c065bc84ffdf6fc7bf42102439eb1a8c1fd3d8547058a6f2100f1a",
  createBoxPlot: "943a8363014f2068b6abd79b9ebdc3eed58246786406214bcd9d7a392ddae932",
  createGradientPlot: "3a1418ce97b6aa930faa839bb34d84af709422e6367522a03fbb8e55e531ea91",
  createHeatmap: "984d0da613e49603782c85ae79c45911c9565d006bfd5a0dbfb5e020d9c06e6a",
  createHistogram: "72053da2acaa3e29714468a9676a87239305440113f63b83bd77d59fe41fd7b6"
});
const SHAPE_FAMILY_LITERAL_VALUE_KEYS = Object.freeze([
  "string:star",
  "string:triangle-left"
]);
const CANVAS = Object.freeze({
  width: 1_900,
  height: 2_000,
  background: "#ffffff",
  margin: Object.freeze({ top: 650, right: 360, bottom: 650, left: 340 })
});
const VIEW_CACHE_LIMIT = 16;
const QUANTITATIVE_SCALE_TYPES = Object.freeze([
  "linear", "log", "pow", "sqrt", "symlog"
]);
const HISTOGRAM_COUNT_SCALE_TYPES = Object.freeze([
  "linear", "pow", "sqrt", "symlog"
]);
const COLOR_INTERPOLATIONS = Object.freeze([
  "rgb", "hsl", "hsl-long", "lab",
  "hcl", "hcl-long", "cubehelix", "cubehelix-long"
]);
const SCALE_BOOLEAN_PROFILES = freeze([
  { nice: false, zero: false, clamp: false, reverse: false },
  { nice: true, zero: false, clamp: true, reverse: true },
  { nice: true, zero: true, clamp: false, reverse: true },
  { nice: false, zero: true, clamp: true, reverse: false },
  { nice: true, zero: false, clamp: false, reverse: true }
]);

function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (Object.hasOwn(descriptor, "value")) freeze(descriptor.value);
  }
  return Object.freeze(value);
}

function canvas() {
  return { ...CANVAS, margin: { ...CANVAS.margin } };
}

function slug(value) {
  return value.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLowerCase();
}

// These compact bindings are a frozen projection of realisticFieldPairDomain over
// the pinned 50-dataset corpus. Every scheduled binding is revalidated by the 460
// actual builds, while schedule construction never retains full source CSVs.
const DISTRIBUTION_INELIGIBLE_DATASETS = new Set([
  "tt-global-temperatures",
  "tt-cats-vs-dogs",
  "tt-christmas-songs",
  "tt-tour-de-france-winners",
  "tt-dog-breed-traits"
]);
const DISTRIBUTION_SPECIAL_BINDINGS = freeze({
  "tt-us-tornadoes": [[0, 0], [0, 2]],
  "tt-fast-food-nutrition": [[0, 0], [1, 0]],
  "tt-college-graduates": [[0, 0], [1, 0]],
  "tt-voter-turnout": [[0, 0], [1, 0]],
  "tt-video-games": [[1, 0], [1, 2]],
  "tt-nuclear-explosions": [[0, 2], [1, 2]],
  "tt-tuition-costs": [[0, 2], [1, 2]],
  "tt-datasaurus": [[0, 0], [1, 0]],
  "tt-wind-turbines": [[3, 1], [3, 2]],
  "tt-nurses": [[0, 0], [1, 0]],
  "tt-stock-prices": [[0, 0], [1, 0]],
  "tt-life-expectancy": [[0, 0]],
  "tt-groundhogs": [[0, 1], [0, 3]],
  "tt-outer-space-objects": [[0, 0]],
  "tt-pride-index": [[0, 0], [1, 0]]
});
const DEFAULT_DISTRIBUTION_BINDINGS = freeze([[0, 0], [0, 1]]);

function verifiedFieldPairDomain(dataset, capability) {
  const pairs = capability === "record"
    ? [[0, 0]]
    : DISTRIBUTION_INELIGIBLE_DATASETS.has(dataset)
      ? []
      : DISTRIBUTION_SPECIAL_BINDINGS[dataset] ?? DEFAULT_DISTRIBUTION_BINDINGS;
  return freeze(pairs.map(([measureIndex, dimensionIndex]) => ({
    measureIndex,
    dimensionIndex,
    bindingId: `verified:${capability}:${measureIndex}-${dimensionIndex}`
  })));
}

const GUIDE_PROFILES = freeze([
  {
    id: "cartesian-vertical-values",
    guideMode: "cartesian",
    orientation: "vertical",
    axisType: "cartesian",
    tickMode: "values",
    format: ".1f",
    legendProfile: 0
  },
  {
    id: "cartesian-vertical-count",
    guideMode: "cartesian",
    orientation: "vertical",
    axisType: "auto",
    tickMode: "count",
    format: ".2f",
    legendProfile: 1
  },
  {
    id: "cartesian-horizontal-values",
    guideMode: "cartesian",
    orientation: "horizontal",
    axisType: "cartesian",
    tickMode: "values",
    axisFalse: "x",
    format: ".1f",
    legendProfile: 2
  },
  {
    id: "cartesian-horizontal-count",
    guideMode: "cartesian",
    orientation: "horizontal",
    axisType: "auto",
    tickMode: "count",
    format: ".2f",
    legendProfile: 3
  },
  {
    id: "cartesian-without-axes",
    guideMode: "cartesian",
    orientation: "vertical",
    axisType: "cartesian",
    tickMode: "values",
    axes: false,
    legendKind: "continuous",
    legendProfile: 0
  },
  {
    id: "cartesian-without-grid",
    guideMode: "cartesian",
    orientation: "horizontal",
    axisType: "auto",
    tickMode: "count",
    grid: false,
    format: ".1f",
    legendKind: "continuous",
    legendProfile: 1
  },
  {
    id: "cartesian-without-legend",
    guideMode: "cartesian",
    orientation: "vertical",
    axisType: "cartesian",
    tickMode: "count",
    legend: false,
    format: ".2f"
  },
  {
    id: "cartesian-horizontal-grid-boolean",
    guideMode: "cartesian",
    orientation: "vertical",
    axisType: "auto",
    tickMode: "values",
    axisFalse: "x",
    gridBoolean: "horizontal",
    format: ".1f",
    legendProfile: 2
  },
  {
    id: "cartesian-vertical-grid-boolean",
    guideMode: "cartesian",
    orientation: "horizontal",
    axisType: "cartesian",
    tickMode: "count",
    axisFalse: "y",
    gridBoolean: "vertical",
    format: ".2f",
    legendProfile: 3
  }
]);

const HISTOGRAM_NON_CARTESIAN_GUIDE_PROFILES = freeze([
  {
    id: "polar-values-inside",
    guideMode: "polar",
    tickMode: "values",
    format: ".1f",
    radialTitlePosition: "inside",
    legendProfile: 0
  },
  {
    id: "polar-count-outside",
    guideMode: "polar",
    tickMode: "count",
    format: ".2f",
    radialTitlePosition: "outside",
    legendProfile: 1
  },
  {
    id: "polar-titleless-theta-grid",
    guideMode: "polar",
    tickMode: "values",
    format: ".1f",
    polarTitles: false,
    gridBoolean: "theta",
    legendProfile: 2
  },
  {
    id: "polar-titleless-radial-grid",
    guideMode: "polar",
    tickMode: "count",
    format: ".2f",
    polarTitles: false,
    gridBoolean: "radial",
    legendProfile: 3
  },
  {
    id: "parallel-context-axes",
    guideMode: "parallel",
    legend: false,
    grid: false
  }
]);

const VIOLIN_FEATURE_PROFILES = freeze([
  "constant-fill",
  "compact-density",
  "detailed-density",
  "narrow-shared-width",
  "wide-independent-width",
  "reversed-split",
  "soft-area",
  "opaque-area",
  "linear-contour",
  "natural-contour",
  "horizontal-compact",
  "horizontal-detailed"
].map((id, featureIndex) => ({
  id: `violin-${id}`,
  featureIndex,
  guideMode: "none",
  orientation: id.startsWith("horizontal") ? "horizontal" : "vertical",
  tickMode: featureIndex % 2 === 0 ? "values" : "count",
  format: featureIndex % 2 === 0 ? ".1f" : ".2f",
  fillOnly: id === "constant-fill"
})));

const BOX_FEATURE_PROFILES = freeze([
  "minmax-whiskers",
  "wide-boxes",
  "narrow-boxes",
  "high-contrast",
  "soft-outliers"
].map((id, featureIndex) => ({
  id: `box-${id}`,
  featureIndex,
  guideMode: "none",
  orientation: featureIndex % 2 === 0 ? "vertical" : "horizontal",
  tickMode: featureIndex % 2 === 0 ? "values" : "count",
  format: featureIndex % 2 === 0 ? ".1f" : ".2f"
})));

const GRADIENT_FEATURE_PROFILES = freeze([
  "without-center",
  "compact-density",
  "detailed-density",
  "wide-strip",
  "soft-gradient"
].map((id, featureIndex) => ({
  id: `gradient-${id}`,
  featureIndex,
  guideMode: "none",
  orientation: featureIndex % 2 === 0 ? "vertical" : "horizontal",
  tickMode: featureIndex % 2 === 0 ? "values" : "count",
  format: featureIndex % 2 === 0 ? ".1f" : ".2f"
})));

const HEATMAP_FEATURE_PROFILES = freeze([
  { id: "heatmap-coarse-bins", bins: { x: 6, y: 6 } },
  { id: "heatmap-fine-bins", bins: { x: 16, y: 14 } },
  { id: "heatmap-wide-bins", bins: { x: 14, y: 6 } },
  { id: "heatmap-tall-bins", bins: { x: 6, y: 14 } },
  { id: "heatmap-observed-cells", bins: { x: 10, y: 8 }, includeEmpty: false },
  { id: "heatmap-explicit-extent", bins: { x: 9, y: 9 }, explicitExtent: true },
  { id: "heatmap-soft-cells", bins: { x: 11, y: 7 }, rectOpacity: 0.58 },
  { id: "heatmap-borderless-cells", bins: { x: 8, y: 12 }, rectStroke: false },
  { id: "heatmap-strong-borders", bins: { x: 12, y: 8 }, rectStrokeWidth: 1.4 },
  { id: "heatmap-reversed-x", bins: { x: 10, y: 10 }, reverseX: true },
  { id: "heatmap-reversed-y", bins: { x: 10, y: 10 }, reverseY: true },
  { id: "heatmap-magma-density", bins: { x: 13, y: 9 }, paletteOffset: 1 },
  { id: "heatmap-ordinal-color", pregridded: true, ordinalColor: true },
  {
    id: "heatmap-ordinal-soft",
    pregridded: true,
    ordinalColor: true,
    rectOpacity: 0.62
  },
  {
    id: "heatmap-ordinal-reversed",
    pregridded: true,
    ordinalColor: true,
    reverseY: true
  },
  {
    id: "heatmap-temporal-color",
    pregridded: true,
    temporalColor: true,
    requiresTemporal: true
  },
  {
    id: "heatmap-temporal-soft",
    pregridded: true,
    temporalColor: true,
    requiresTemporal: true,
    rectOpacity: 0.62
  },
  {
    id: "heatmap-temporal-reversed",
    pregridded: true,
    temporalColor: true,
    requiresTemporal: true,
    reverseX: true
  }
].map((profile, featureIndex) => ({
  ...profile,
  featureIndex,
  guideMode: "none",
  orientation: "vertical",
  tickMode: featureIndex % 2 === 0 ? "values" : "count",
  format: featureIndex % 2 === 0 ? ".1f" : ".2f"
})));

const HISTOGRAM_FEATURE_PROFILES = freeze([
  ...HISTOGRAM_NON_CARTESIAN_GUIDE_PROFILES,
  {
    id: "histogram-constant-fill",
    featureIndex: 0,
    guideMode: "none",
    orientation: "horizontal",
    tickMode: "values",
    format: ".2f",
    fillOnly: true
  },
  {
    id: "histogram-fixed-boundaries",
    featureIndex: 4,
    guideMode: "none",
    orientation: "horizontal",
    tickMode: "count",
    format: ".1f"
  }
]);

function profilesForAction(action) {
  const featureProfiles = {
    createViolinPlot: VIOLIN_FEATURE_PROFILES,
    createBoxPlot: BOX_FEATURE_PROFILES,
    createGradientPlot: GRADIENT_FEATURE_PROFILES,
    createHeatmap: HEATMAP_FEATURE_PROFILES,
    createHistogram: HISTOGRAM_FEATURE_PROFILES
  }[action] ?? [];
  return freeze([...GUIDE_PROFILES, ...featureProfiles]);
}

const viewCache = new Map();

function cachedView(key) {
  if (!viewCache.has(key)) return undefined;
  const value = viewCache.get(key);
  viewCache.delete(key);
  viewCache.set(key, value);
  return value;
}

function cacheView(key, value) {
  if (viewCache.has(key)) viewCache.delete(key);
  viewCache.set(key, value);
  while (viewCache.size > VIEW_CACHE_LIMIT) viewCache.delete(viewCache.keys().next().value);
  return value;
}

function withinGroupSplit(rows) {
  const byCategory = new Map();
  for (const row of rows) {
    const values = byCategory.get(row.category) ?? [];
    values.push(row);
    byCategory.set(row.category, values);
  }
  const sideByKey = new Map();
  for (const values of byCategory.values()) {
    values.sort((left, right) =>
      left.value - right.value || left.sourceRowIndex - right.sourceRowIndex
    );
    values.forEach((row, index) => {
      sideByKey.set(row.key, index < values.length / 2 ? "lower-half" : "upper-half");
    });
  }
  return sideByKey;
}

function analysisView(factors, capability) {
  const key = [
    factors.dataset,
    capability,
    factors.fieldPair.measureIndex,
    factors.fieldPair.dimensionIndex
  ].join("\0");
  const cached = cachedView(key);
  if (cached !== undefined) return cached;
  const distribution = ["distribution", "histogram"].includes(capability);
  const base = realisticRecordView(factors.dataset, {
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    includeSecondaryMeasure: false,
    includeSecondaryDimension: false,
    deriveSubgroup: true,
    rowLimit: 80,
    groupLimit: 5,
    minimumPerGroup: distribution ? 5 : 1,
    minimumRetainedGroupRows: distribution ? 5 : 1,
    requireRetainedGroupVariation: distribution
  });
  const splitByKey = withinGroupSplit(base.rows);
  const minimum = Math.min(...base.rows.map(row => row.value));
  const positiveOffset = Math.max(0, 1 - minimum);
  const rows = base.rows.map((row, index) => ({
    ...row,
    positiveValue: row.value + positiveOffset,
    sourcePosition: index + 1,
    distributionHalf: splitByKey.get(row.key)
  }));
  const view = freeze({
    rows,
    sample: base.sample,
    provenance: {
      ...base.provenance,
      transformations: [
        ...base.provenance.transformations,
        {
          op: "positive-domain-shift",
          sourceField: base.provenance.fieldBindings.measure,
          offset: positiveOffset,
          as: "positiveValue",
          purpose: "retain the observed distribution while supporting logarithmic and square-root scale comparisons"
        },
        {
          op: "source-selection-order-rank",
          as: "sourcePosition",
          minimum: 1,
          maximum: rows.length
        },
        {
          op: "within-group-rank-split",
          groupBy: "category",
          orderBy: ["value", "sourceRowIndex"],
          as: "distributionHalf",
          values: ["lower-half", "upper-half"]
        }
      ]
    }
  });
  return cacheView(key, view);
}

function contextFor(dataset, view, family) {
  const fields = realisticSourceFields(dataset, view.provenance.fieldBindings);
  const byName = new Map(fields.map(field => [field.field, field]));
  const measure = byName.get(view.provenance.fieldBindings.measure);
  const dimension = byName.get(view.provenance.fieldBindings.dimension);
  const measureText = measure?.label ?? view.provenance.fieldBindings.measure;
  const dimensionText = dimension?.label ?? view.provenance.fieldBindings.dimension;
  const unit = measure?.unit === undefined ? "" : ` (${measure.unit})`;
  return freeze({
    fields,
    measureText,
    dimensionText,
    title: `${measureText}${unit} by ${dimensionText} — ${family}`
  });
}

function endpointValues(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return minimum === maximum ? [minimum] : [minimum, maximum];
}

function guideResources(view, context, orientation) {
  const categories = [...new Set(view.rows.map(row => row.category))];
  const values = endpointValues(view.rows.map(row => row.positiveValue));
  const positions = endpointValues(view.rows.map(row => row.sourcePosition));
  const vertical = orientation !== "horizontal";
  return freeze({
    x: vertical
      ? { scale: "mainCategory", values: categories, numeric: false, title: context.dimensionText }
      : { scale: "mainValue", values, numeric: true, title: context.measureText },
    y: vertical
      ? { scale: "mainValue", values, numeric: true, title: context.measureText }
      : { scale: "mainCategory", values: categories, numeric: false, title: context.dimensionText },
    theta: {
      scale: "thetaScale",
      values: positions,
      numeric: true,
      title: "Source selection order"
    },
    radius: {
      scale: "radiusScale",
      values,
      numeric: true,
      title: context.measureText
    }
  });
}

function tickSelection(resource, mode) {
  return mode === "count" && resource.numeric && resource.forceValues !== true
    ? { count: 3 }
    : { values: resource.values.slice(0, 6) };
}

function axisStyle(resource, channel, profile, ordinal) {
  const position = channel === "x"
    ? ordinal % 2 === 0 ? "bottom" : "top"
    : ordinal % 2 === 0 ? "left" : "right";
  return {
    scale: resource.scale,
    coordinate: "main",
    position,
    line: { color: "#334155", lineWidth: 1.1 },
    ticksAndLabels: {
      ...tickSelection(resource, profile.tickMode),
      ticks: { color: "#475569", lineWidth: 1, length: 6 },
      labels: {
        offset: 8,
        format: resource.numeric ? profile.format ?? ".1f" : "auto",
        color: "#334155",
        fontSize: 11,
        fontFamily: "Arial",
        fontWeight: 500
      }
    },
    title: {
      text: resource.title,
      at: ["start", "center", "end"][ordinal % 3],
      offset: channel === "y" ? 280 : 64,
      rotation: channel === "y" ? -90 : 0,
      color: "#0f172a",
      fontSize: 13,
      fontFamily: "Arial",
      fontWeight: 650
    }
  };
}

function polarAxisStyle(resource, channel, profile) {
  const title = profile.polarTitles === false
    ? false
    : {
        text: resource.title,
        offset: 28,
        color: "#0f172a",
        fontSize: 12,
        fontFamily: "Arial",
        fontWeight: 650,
        ...(channel === "radius"
          ? { position: profile.radialTitlePosition ?? "outside" }
          : {})
      };
  return {
    scale: resource.scale,
    coordinate: "polarContext",
    angle: channel === "radius" ? Math.PI / 5 : 0,
    line: { color: "#64748b", lineWidth: 1 },
    ticksAndLabels: {
      ...tickSelection(resource, profile.tickMode),
      ticks: { color: "#64748b", lineWidth: 0.8, length: 5 },
      labels: {
        offset: 7,
        format: profile.format ?? ".1f",
        color: "#475569",
        fontSize: 10,
        fontFamily: "Arial",
        fontWeight: 450
      }
    },
    title
  };
}

function gridStyle(resource, coordinate, profile) {
  return {
    scale: resource.scale,
    coordinate,
    ...tickSelection(resource, profile.tickMode),
    color: "#cbd5e1",
    lineWidth: 0.75,
    strokeDash: [3, 3]
  };
}

function legendSymbol(profile) {
  switch (profile % 4) {
    case 0:
      return "auto";
    case 1:
      return { length: 28, lineWidth: 2 };
    case 2:
      return { width: 18, height: 12, stroke: "#334155", strokeWidth: 1 };
    default:
      return {
        layers: [
          {
            type: "point",
            shape: "circle",
            size: 64,
            fill: "#ffffff",
            stroke: "#334155",
            strokeWidth: 1
          }
        ]
      };
  }
}

function legendBorder(profile) {
  if (profile % 4 === 0) return false;
  if (profile % 4 === 1) return true;
  return {
    color: "#cbd5e1",
    lineWidth: 1,
    padding: 8,
    background: "#ffffff"
  };
}

function legendOptions(profile, context, action) {
  const ordinal = profile.legendProfile ?? 0;
  if (action === "createGradientPlot") {
    return {
      title: profile.legendKind === "continuous"
        ? context.measureText
        : "Relative density",
      position: "right"
    };
  }
  if (profile.legendKind === "continuous") {
    return {
      target: "continuousContextPoints",
      channels: ["color"],
      position: "right",
      align: "center",
      offset: 18 + ordinal,
      title: context.measureText,
      count: 6,
      gradient: { length: 120, thickness: 14 },
      labels: {
        offset: 5,
        color: "#334155",
        fontSize: 11,
        fontFamily: "Arial",
        fontWeight: 450
      },
      titleStyle: {
        color: "#0f172a",
        fontSize: 12,
        fontFamily: "Arial",
        fontWeight: 650
      },
      border: legendBorder(ordinal)
    };
  }
  return {
    target: ordinal % 4 === 1 ? "seriesContextLines" : "contextPoints",
    channels: ["color"],
    position: ["right", "left", "bottom", "top"][ordinal % 4],
    align: ["center", "center", "left", "right"][ordinal % 4],
    direction: ordinal < 2 ? "vertical" : "horizontal",
    ...(ordinal < 2 ? {} : { columns: 2 }),
    offset: 18 + ordinal,
    titlePosition: ordinal % 2 === 0 ? "top" : "left",
    title: ordinal % 4 === 1 ? "Within-category rank half" : context.dimensionText,
    symbol: legendSymbol(ordinal),
    labels: {
      offset: 5,
      color: "#334155",
      fontSize: 11,
      fontFamily: "Arial",
      fontWeight: 450
    },
    titleStyle: {
      color: "#0f172a",
      fontSize: 12,
      fontFamily: "Arial",
      fontWeight: 650
    },
    itemGap: 7,
    border: legendBorder(ordinal)
  };
}

function cartesianGrid(profile, resources) {
  if (profile.grid === false) return false;
  if (profile.gridBoolean === "horizontal") {
    return { horizontal: true, vertical: false, theta: false, radial: false };
  }
  if (profile.gridBoolean === "vertical") {
    return { horizontal: false, vertical: true, theta: false, radial: false };
  }
  const vertical = profile.orientation !== "horizontal";
  return {
    horizontal: vertical
      ? gridStyle(resources.y, "main", profile)
      : false,
    vertical: vertical
      ? false
      : gridStyle(resources.x, "main", profile),
    theta: false,
    radial: false
  };
}

function polarGrid(profile, resources) {
  if (profile.gridBoolean === "theta") {
    return { horizontal: false, vertical: false, theta: true, radial: false };
  }
  if (profile.gridBoolean === "radial") {
    return { horizontal: false, vertical: false, theta: false, radial: true };
  }
  return {
    horizontal: false,
    vertical: false,
    theta: gridStyle(resources.theta, "polarContext", profile),
    radial: gridStyle(resources.radius, "polarContext", profile)
  };
}

function guideOptions(profile, resources, context, ordinal, action) {
  if (["polar", "parallel"].includes(profile.guideMode)) {
    profile = { ...profile, guideMode: "cartesian", axisType: "cartesian", gridBoolean: undefined };
  }
  if (profile.guideMode === "none") {
    return false;
  }
  if (profile.guideMode === "parallel") {
    return {
      axes: { coordinate: { id: "parallelContext", type: "parallel" } },
      grid: false,
      legend: false
    };
  }
  if (profile.guideMode === "polar" && action !== "createHistogram") {
    return {
      axes: {
        coordinate: { id: "polarContext", type: "polar" },
        theta: polarAxisStyle(resources.theta, "theta", profile),
        radius: polarAxisStyle(resources.radius, "radius", profile)
      },
      grid: polarGrid(profile, resources),
      legend: profile.legend === false
        ? false
        : legendOptions(profile, context, action)
    };
  }
  return {
    axes: profile.axes === false
      ? false
      : {
          coordinate: { id: "main", type: profile.axisType },
          x: profile.axisFalse === "x"
            ? false
            : axisStyle(resources.x, "x", profile, ordinal),
          y: profile.axisFalse === "y"
            ? false
            : axisStyle(resources.y, "y", profile, ordinal),
          theta: false,
          radius: false
        },
    grid: cartesianGrid(profile, resources),
    legend: profile.legend === false
      ? false
      : legendOptions(profile, context, action)
  };
}

function createOwnedFacade(base, action, args) {
  const candidate = base[action]({ ...args, guides: false });
  if (args.guides === false) return candidate;
  const layer = candidate.semanticSpec.layers.find(layer => layer.id === args.id);
  const requested = args.guides ?? {};
  const axes = { coordinate: { id: layer.coordinate,
    type: requested.axes?.coordinate?.type === "auto" ? "auto" : "cartesian" } };
  const grid = {};
  for (const [channel, direction] of [["x", "vertical"], ["y", "horizontal"]]) {
    const scaleId = layer.encoding[channel].scale;
    const scale = candidate.resolvedScales[scaleId];
    const categorical = ["band", "point"].includes(scale.type);
    const previous = requested.axes?.[channel] ?? {};
    const values = [...new Set([scale.domain[0], scale.domain.at(-1)])];
    const tickOptions = previous.ticksAndLabels ?? {};
    const mode = categorical || tickOptions.values !== undefined ? { values } : { count: tickOptions.count ?? 4 };
    axes[channel] = previous === false ? false : {
      ...previous, scale: scaleId, coordinate: layer.coordinate,
      ticksAndLabels: { ...tickOptions, ...mode,
        labels: { ...tickOptions.labels, ...(categorical || scale.type === "time" ? { format: "auto" } : {}) } }
    };
    if (Object.hasOwn(mode, "values")) delete axes[channel]?.ticksAndLabels?.count;
    const directionOptions = requested.grid?.[direction];
    grid[direction] = categorical || directionOptions === false ? false
      : directionOptions === true ? true
      : { ...directionOptions, scale: scaleId, coordinate: layer.coordinate,
          ...(directionOptions?.values === undefined ? {} : { values }) };
  }
  let legend = false;
  if (action === "createGradientPlot") legend = requested.legend ?? false;
  else if (layer.encoding.color && requested.legend !== false &&
    !["quantize", "quantile", "threshold"].includes(candidate.resolvedScales[layer.encoding.color.scale].type)) {
    legend = { ...requested.legend, target: layer.id, channels: ["color"] };
    if (["quantitative", "temporal"].includes(layer.encoding.color.fieldType)) {
      const continuous = candidate.resolvedScales[layer.encoding.color.scale].type === "sequential";
      const allowed = ["target", "channels", "title", "labels", "titleStyle", "border", "offset"];
      legend = { ...Object.fromEntries(Object.entries(legend).filter(([key]) => allowed.includes(key))),
        position: "right", ...(continuous ? { count: 6, gradient: { length: 120, thickness: 14 } } : { symbol: { width: 18, height: 14, stroke: "white", strokeWidth: 0.8 }, itemGap: 28, direction: "vertical" }) };
    } else {
      delete legend.gradient; delete legend.count;
      if (typeof legend.symbol === "object" && legend.symbol?.length !== undefined) legend.symbol = { layers: [{ type: "line", ...legend.symbol }] };
    }
    if (axes.x && ["top", "bottom"].includes(legend.position)) {
      axes.x.position = legend.position === "bottom" ? "top" : "bottom";
    }
    if (axes.y && ["left", "right"].includes(legend.position)) {
      axes.y.position = legend.position === "left" ? "right" : "left";
    }
  }
  return base[action]({ ...args, guides: {
    axes: requested.axes === false ? false : axes,
    grid: requested.grid === false || Object.values(grid).every(value => value === false) ? false : grid,
    legend
  } });
}

function sourceProgram(view, profile, action) {
  const manualProxyGeometry = ["createHeatmap", "createHistogram"].includes(action);
  let program = chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createCoordinate({ id: "main", type: "cartesian" })
    .createPointMark({
      id: "contextPoints",
      data: "analysisRows",
      shape: "circle",
      opacity: 0.07,
      stroke: "#ffffff",
      strokeWidth: 0.4
    });
  if (!manualProxyGeometry) {
    program = program
      .encodeX({
        target: "contextPoints",
        coordinate: "main",
        ...contextPosition(action, profile, "x")
      })
      .encodeY({
        target: "contextPoints",
        coordinate: "main",
        ...contextPosition(action, profile, "y")
      })
      .encodePointRadius({ target: "contextPoints", value: 2.4 });
  }
  program = program.encodeColor({
      target: "contextPoints",
      field: "category",
      fieldType: "nominal",
      scale: { id: "contextColor", type: "ordinal", palette: "tableau10" }
    });
  if (profile.legendKind === "continuous") {
    program = program
      .createPointMark({
        id: "continuousContextPoints",
        data: "analysisRows",
        shape: "circle",
        opacity: 0.05,
        stroke: "#ffffff",
        strokeWidth: 0.4
      });
    if (!manualProxyGeometry) {
      program = program
        .encodeX({
          target: "continuousContextPoints",
          coordinate: "main",
          ...contextPosition(action, profile, "x")
        })
        .encodeY({
          target: "continuousContextPoints",
          coordinate: "main",
          ...contextPosition(action, profile, "y")
        })
        .encodePointRadius({ target: "continuousContextPoints", value: 2.1 });
    }
    program = program.encodeColor({
        target: "continuousContextPoints",
        field: "value",
        fieldType: "quantitative",
        scale: {
          id: "continuousContextColor",
          type: "sequential",
          palette: "viridis"
        }
      });
  }
  if (profile.legendKind !== "continuous" && (profile.legendProfile ?? 0) % 4 === 1) {
    program = program
      .createLineMark({
        id: "seriesContextLines",
        data: "analysisRows",
        opacity: 0.04,
        strokeWidth: 0.6
      })
      .encodeX({
        target: "seriesContextLines",
        coordinate: "main",
        field: "sourcePosition",
        fieldType: "quantitative",
        scale: { id: "seriesPosition", type: "linear" }
      })
      .encodeY({
        target: "seriesContextLines",
        coordinate: "main",
        field: "positiveValue",
        fieldType: "quantitative",
        scale: { id: "seriesValue", type: "linear" }
      })
      .encodeColor({
        target: "seriesContextLines",
        field: "distributionHalf",
        fieldType: "nominal",
        scale: { id: "seriesContextColor", type: "ordinal", palette: "tableau10" }
      });
  }
  if (profile.guideMode === "polar" && action !== "createHistogram") {
    program = program
      .createCoordinate({ id: "polarContext", type: "polar" })
      .createPointMark({
        id: "polarContextPoints",
        data: "analysisRows",
        shape: "circle",
        opacity: 0.09
      })
      .encodeTheta({
        target: "polarContextPoints",
        coordinate: "polarContext",
        field: "sourcePosition",
        fieldType: "quantitative",
        scale: { id: "thetaScale", type: "linear", nice: true, zero: false }
      })
      .encodeR({
        target: "polarContextPoints",
        coordinate: "polarContext",
        field: "positiveValue",
        fieldType: "quantitative",
        scale: { id: "radiusScale", type: "linear", nice: true, zero: false }
      })
      .encodePointRadius({ target: "polarContextPoints", value: 2.5 });
  }
  if (profile.guideMode === "parallel") {
    program = program
      .createCoordinate({ id: "parallelContext", type: "parallel" })
      .createLineMark({
        id: "parallelContextLines",
        data: "analysisRows",
        stroke: "#94a3b8",
        strokeWidth: 0.5,
        opacity: 0.08
      })
      .encodeParallelCoordinates({
        target: "parallelContextLines",
        coordinate: "parallelContext",
        dimensions: [
          { field: "value", fieldType: "quantitative", title: "Observed value" },
          { field: "sourcePosition", fieldType: "quantitative", title: "Source order" }
        ],
        key: "key",
        missing: "drop-row"
      });
  }
  return program;
}

function proxyPosition(value, minimum, maximum, start, end) {
  if (minimum === maximum) return (start + end) / 2;
  return start + (value - minimum) / (maximum - minimum) * (end - start);
}

function materializeGuideProxyGeometry(program, view) {
  const values = view.rows.map(row => row.positiveValue);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const x = view.rows.map((row, index) => proxyPosition(
    index,
    0,
    Math.max(1, view.rows.length - 1),
    CANVAS.margin.left,
    CANVAS.width - CANVAS.margin.right
  ));
  const y = values.map(value => proxyPosition(
    value,
    minimum,
    maximum,
    CANVAS.height - CANVAS.margin.bottom,
    CANVAS.margin.top
  ));
  let next = program;
  for (const [id, radius] of [
    ["contextPoints", 2.4],
    ["continuousContextPoints", 2.1]
  ]) {
    if (next.graphicSpec.objects[id] === undefined) continue;
    next = next
      .editGraphics({ target: id, property: "x", value: x })
      .editGraphics({ target: id, property: "y", value: y })
      .editGraphics({ target: id, property: "radius", value: radius });
  }
  return next;
}

function quantitativeScale(id, type, profileIndex) {
  const booleans = SCALE_BOOLEAN_PROFILES[
    profileIndex % SCALE_BOOLEAN_PROFILES.length
  ];
  return {
    id,
    type,
    domain: "auto",
    range: "auto",
    // Nice log domains can round a small positive boundary to zero.
    nice: type === "log" ? false : booleans.nice,
    clamp: booleans.clamp,
    reverse: booleans.reverse,
    ...(type === "log" ? { base: 2 } : { zero: booleans.zero }),
    ...(type === "pow" ? { exponent: 2 } : {}),
    ...(type === "symlog" ? { constant: 1 } : {})
  };
}

function bandScale(id, profileIndex, reverse) {
  return {
    id,
    type: "band",
    domain: "auto",
    range: "auto",
    reverse,
    paddingInner: 0.1 + (profileIndex % 3) * 0.04,
    paddingOuter: 0.05 + (profileIndex % 2) * 0.03,
    align: [0, 0.5, 1][profileIndex % 3]
  };
}

function distributionScaleProfile(action, profile) {
  const profiles = profilesForAction(action);
  const index = profiles.findIndex(candidate => candidate.id === profile.id);
  if (index < 0) throw new Error(`${action} has no profile "${profile.id}".`);
  const orientationIndex = profiles.slice(0, index + 1).filter(candidate =>
    candidate.orientation === profile.orientation
  ).length - 1;
  return {
    index: orientationIndex,
    type: QUANTITATIVE_SCALE_TYPES[
      orientationIndex % QUANTITATIVE_SCALE_TYPES.length
    ]
  };
}

function categoryPosition(action, profile, channel) {
  const categoryChannel = profile.orientation === "vertical" ? "x" : "y";
  const scaleProfile = distributionScaleProfile(action, profile);
  return channel === categoryChannel
    ? {
        field: "category",
        fieldType: ["createGradientPlot", "createViolinPlot"].includes(action) &&
          channel === "y" && profile.ordinal % 2 === 0
          ? "nominal"
          : "ordinal",
        scale: bandScale(
          "mainCategory",
          scaleProfile.index,
          scaleProfile.index % 2 === 1
        )
      }
    : {
        field: "positiveValue",
        fieldType: "quantitative",
        scale: quantitativeScale("mainValue", scaleProfile.type, scaleProfile.index)
      };
}

function contextPosition(action, profile, channel) {
  return categoryPosition(action, profile, channel);
}

function analysisQuestion(context, profile, family) {
  const presentation = profile.guideMode === "polar"
    ? `after exercising the ${profile.id} guide options, with a cartesian final presentation`
    : `with the ${profile.id} display profile`;
  return `How does ${context.measureText} vary across ${context.dimensionText} when the ${family} is shown ${presentation}?`;
}

function titleProgram(program, context, profile, family) {
  const question = analysisQuestion(context, profile, family);
  return program.createTitle({
    text: context.title,
    subtitle: question,
    align: "left",
    maxWidth: CANVAS.width - CANVAS.margin.left - CANVAS.margin.right,
    wrap: "word",
    lineHeight: 26
  });
}

function palette(ordinal) {
  return {
    name: ordinal % 2 === 0 ? "viridis" : "magma",
    count: 6,
    extent: [0.08, 0.92]
  };
}

function categoricalColor(action, field, ordinal, layout) {
  const id = `${slug(action)}-color-${ordinal}`;
  const base = {
    field,
    fieldType: "ordinal",
    ...(layout === undefined ? {} : { layout }),
    scale: { id, type: "ordinal", domain: "auto" }
  };
  switch (ordinal % 9) {
    case 0: return { ...base, palette: "tableau10" };
    case 1: return { ...base, palette: "set2" };
    case 2: return { ...base, palette: { name: "tableau20", count: 6 } };
    case 3: return { ...base, palette: { name: "viridis", extent: [0.08, 0.92] } };
    case 4: return { ...base, scale: { ...base.scale, palette: "dark2" } };
    case 5: return { ...base, scale: { ...base.scale, palette: "paired" } };
    case 6:
      return {
        ...base,
        scale: { ...base.scale, palette: { name: "set3", count: 6 } }
      };
    case 7:
      return {
        ...base,
        scale: {
          ...base.scale,
          palette: { name: "plasma", extent: [0.12, 0.88] }
        }
      };
    default: return { ...base, scale: { ...base.scale, range: "auto" } };
  }
}

function gradientPalette(ordinal) {
  switch (ordinal % 4) {
    case 0: return "blues";
    case 1: return "reds";
    case 2: return { name: "viridis", count: 7, extent: [0.08, 0.92] };
    default: return { name: "magma", count: 7, extent: [0.12, 0.88] };
  }
}

function buildBox(factors) {
  const view = analysisView(factors, "distribution");
  const context = contextFor(factors.dataset, view, "distribution box plot");
  const ordinal = factors.variant.ordinal;
  const profile = factors.variant;
  const feature = profile.featureIndex;
  const resources = guideResources(view, context, profile.orientation);
  let program = createOwnedFacade(sourceProgram(view, profile, "createBoxPlot"), "createBoxPlot", {
    id: "facadeBoxes",
    target: "contextPoints",
    data: "analysisRows",
    coordinate: "main",
    x: categoryPosition("createBoxPlot", profile, "x"),
    y: categoryPosition("createBoxPlot", profile, "y"),
    whisker: feature === 0
      ? { type: "minmax" }
      : { type: "tukey", factor: feature === undefined ? 1.5 : 1.1 + feature * 0.18 },
    width: {
      band: feature === 1 ? 0.86 : feature === 2 ? 0.46 : 0.7
    },
    outliers: true,
    box: {
      fill: feature === 3 ? "#fde68a" : "#dbeafe",
      opacity: feature === 4 ? 0.58 : 0.78,
      stroke: feature === 3 ? "#78350f" : "#1e3a8a",
      strokeWidth: feature === 3 ? 1.8 : 1.1
    },
    median: {
      stroke: feature === 3 ? "#7c2d12" : "#0f172a",
      strokeWidth: feature === 3 ? 2.4 : 1.8
    },
    outlier: {
      shape: ordinal % 2 === 0 ? "star" : "triangle-left",
      radius: feature === 4 ? 5 : 3.2,
      opacity: feature === 4 ? 0.45 : 0.72
    },
    guides: guideOptions(profile, resources, context, ordinal, "createBoxPlot")
  });
  program = program.editBoxPlot({
    target: "facadeBoxes",
    outlier: {
      shape: ordinal % 2 === 0 ? "triangle-left" : "star",
      radius: feature === 4 ? 5 : 3.2,
      opacity: feature === 4 ? 0.45 : 0.72
    }
  });
  return titleProgram(program, context, profile, "distribution box plot");
}

function densityOptions(profile, ordinal, action) {
  const kernels = action === "createViolinPlot"
    ? ["gaussian", "triangular", "uniform", "epanechnikov"]
    : ["epanechnikov", "triangular", "uniform", "gaussian"];
  return {
    bandwidth: "auto",
    extent: "auto",
    steps: profile.featureIndex === undefined ? 48 : 32 + profile.featureIndex * 4,
    kernel: kernels[ordinal % kernels.length],
    normalization: ordinal % 2 === 0 ? "unit" : "count"
  };
}

function buildGradient(factors) {
  const view = analysisView(factors, "distribution");
  const context = contextFor(factors.dataset, view, "gradient density plot");
  const ordinal = factors.variant.ordinal;
  const profile = factors.variant;
  const feature = profile.featureIndex;
  const resources = guideResources(view, context, profile.orientation);
  const center = feature === 0 || ordinal % 4 === 0
    ? false
    : {
        type: ordinal % 4 === 1 ? "mean" : "median",
        stroke: "#0f172a",
        strokeWidth: 1.4
      };
  let program = createOwnedFacade(sourceProgram(view, profile, "createGradientPlot"), "createGradientPlot", {
    id: "facadeGradients",
    target: "contextPoints",
    data: "analysisRows",
    coordinate: "main",
    x: categoryPosition("createGradientPlot", profile, "x"),
    y: categoryPosition("createGradientPlot", profile, "y"),
    density: densityOptions(profile, ordinal, "createGradientPlot"),
    width: { band: feature === 3 ? 0.9 : feature === 1 ? 0.56 : 0.72 },
    gradient: {
      palette: gradientPalette(ordinal),
      opacity: feature === 4 ? [0.03, 0.66] : [0.12, 0.9]
    },
    center,
    guides: guideOptions(profile, resources, context, ordinal, "createGradientPlot")
  });
  const editedPalette = [
    "reds",
    "blues",
    { name: "magma", count: 6, extent: [0.1, 0.9] },
    { name: "viridis", count: 6, extent: [0.06, 0.94] }
  ][ordinal % 4];
  program = program.editGradientPlot({
    target: "facadeGradients",
    gradient: { palette: editedPalette }
  });
  return titleProgram(program, context, profile, "gradient density plot");
}

function violinColor(profile, layout) {
  return {
    ...categoricalColor(
      "createViolinPlot",
      "distributionHalf",
      profile.ordinal,
      layout
    ),
    fieldType: profile.ordinal % 2 === 0 ? "nominal" : "ordinal"
  };
}

function buildViolin(factors) {
  const view = analysisView(factors, "distribution");
  const context = contextFor(factors.dataset, view, "split violin plot");
  const ordinal = factors.variant.ordinal;
  const profile = factors.variant;
  const feature = profile.featureIndex;
  const resources = guideResources(view, context, profile.orientation);
  const fillOnly = profile.fillOnly === true;
  const curves = [
    "basis", "cardinal", "linear", "monotone", "natural",
    "step", "step-after", "step-before"
  ];
  const program = createOwnedFacade(sourceProgram(view, profile, "createViolinPlot"), "createViolinPlot", {
    id: "facadeViolins",
    data: "analysisRows",
    coordinate: "main",
    x: categoryPosition("createViolinPlot", profile, "x"),
    y: categoryPosition("createViolinPlot", profile, "y"),
    split: {
      field: "distributionHalf",
      domain: feature === 5
        ? ["upper-half", "lower-half"]
        : ["lower-half", "upper-half"]
    },
    ...(fillOnly ? {} : {
      color: violinColor(profile, profile.violinLayout ?? "overlay")
    }),
    density: {
      ...densityOptions(profile, ordinal, "createViolinPlot"),
      width: {
        band: feature === 3 ? 0.56 : feature === 4 ? 0.94 : 0.82,
        resolve: feature === 3
          ? "shared"
          : feature === 4
            ? "independent"
            : ordinal % 2 === 0 ? "shared" : "independent"
      }
    },
    area: {
      ...(fillOnly ? { fill: "#7c3aed" } : {}),
      opacity: feature === 6 ? 0.48 : feature === 7 ? 0.94 : 0.72,
      stroke: "#334155",
      strokeWidth: 0.7,
      curve: feature === 8
        ? "linear"
        : feature === 9
          ? "natural"
          : curves[ordinal % curves.length]
    },
    guides: guideOptions(profile, resources, context, ordinal, "createViolinPlot")
  });
  return titleProgram(program, context, profile, "split violin plot");
}

function heatmapColor(profile, ordinal) {
  if (!profile.temporalColor) {
    return {
      ...categoricalColor("createHeatmap", "category", ordinal),
      fieldType: ordinal % 2 === 0 ? "nominal" : "ordinal"
    };
  }
  return {
    field: "time",
    fieldType: "temporal",
    palette: palette(ordinal),
    scale: {
      id: `createheatmap-color-${ordinal}`,
      type: "sequential",
      domain: "auto",
      interpolate: COLOR_INTERPOLATIONS[ordinal % COLOR_INTERPOLATIONS.length],
      clamp: ordinal % 2 === 0,
      reverse: ordinal % 3 === 0
    }
  };
}

function heatmapBinnedColor(ordinal) {
  const index = ordinal % 12;
  const id = `createheatmap-color-${ordinal}`;
  if (index < COLOR_INTERPOLATIONS.length) {
    const scale = {
      id,
      type: "sequential",
      domain: "auto",
      interpolate: COLOR_INTERPOLATIONS[index],
      clamp: index % 2 === 0,
      reverse: index % 3 === 0
    };
    switch (index) {
      case 0: return { palette: "viridis", scale };
      case 1: return { palette: "magma", scale };
      case 2: return { palette: { name: "plasma", count: 7 }, scale };
      case 3:
        return { palette: { name: "cividis", extent: [0.08, 0.92] }, scale };
      case 4: return { scale: { ...scale, palette: "turbo" } };
      case 5: return { scale: { ...scale, palette: "viridis" } };
      case 6:
        return { scale: { ...scale, palette: { name: "magma", count: 7 } } };
      case 7:
        return {
          scale: {
            ...scale,
            palette: { name: "plasma", extent: [0.12, 0.88] }
          }
        };
      default: throw new Error(`Unknown sequential heatmap color index ${index}.`);
    }
  }
  if (index === 8) {
    return {
      scale: {
        id, type: "quantize", domain: "auto",
        palette: { name: "blues", count: 5 }, clamp: true, reverse: true
      }
    };
  }
  if (index === 9) {
    return {
      scale: {
        id, type: "quantile", domain: "auto",
        palette: { name: "magma", extent: [0.1, 0.9] }, reverse: false
      }
    };
  }
  if (index === 10) {
    return {
      scale: {
        id, type: "threshold", domain: [0.5, 1.5, 2.5],
        palette: { name: "greens", count: 4 }, reverse: true
      }
    };
  }
  return {
    scale: {
      id, type: "sequential", domain: "auto", range: "auto",
      interpolate: "rgb", clamp: false, reverse: false
    }
  };
}

function expandedExtent(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return minimum === maximum
    ? [minimum - 0.5, maximum + 0.5]
    : [minimum, maximum];
}

function buildHeatmap(factors) {
  const view = analysisView(factors, "record");
  const context = contextFor(factors.dataset, view, "observational heatmap");
  const ordinal = factors.variant.ordinal;
  const profile = factors.variant;
  const common = {
    id: "facadeHeatmap",
    data: "analysisRows",
    coordinate: "main",
    rect: {
      opacity: profile.rectOpacity ?? 0.84,
      stroke: profile.rectStroke === false || ordinal % 4 === 0
        ? false
        : "#ffffff",
      ...(profile.rectStroke === false || ordinal % 4 === 0
        ? {}
        : { strokeWidth: profile.rectStrokeWidth ?? 0.7 })
    }
  };
  let program;
  if (profile.pregridded) {
    const resources = freeze({
      ...guideResources(view, context, "vertical"),
      x: {
        scale: "mainCategory",
        values: [...new Set(view.rows.map(row => row.category))],
        numeric: false,
        title: context.dimensionText
      },
      y: {
        scale: "mainSubgroup",
        values: [...new Set(view.rows.map(row => row.subgroup))],
        numeric: false,
        title: "Observed subgroup"
      }
    });
    program = createOwnedFacade(sourceProgram(view, profile, "createHeatmap"), "createHeatmap", {
      ...common,
      x: {
        field: "category",
        fieldType: "ordinal",
        scale: bandScale(
          "mainCategory",
          ordinal,
          profile.reverseX ?? ordinal % 2 === 1
        )
      },
      y: {
        field: "subgroup",
        fieldType: "ordinal",
        scale: bandScale(
          "mainSubgroup",
          ordinal + 1,
          profile.reverseY === true ? false : ordinal % 2 === 0
        )
      },
      color: heatmapColor(profile, ordinal),
      guides: guideOptions(profile, resources, context, ordinal, "createHeatmap")
    });
  } else {
    const xTypeIndex = ordinal % QUANTITATIVE_SCALE_TYPES.length;
    const yTypeIndex = (ordinal + 2) % QUANTITATIVE_SCALE_TYPES.length;
    const xType = QUANTITATIVE_SCALE_TYPES[xTypeIndex];
    const yType = QUANTITATIVE_SCALE_TYPES[yTypeIndex];
    const resources = freeze({
      ...guideResources(view, context, "horizontal"),
      x: {
        scale: "mainValue",
        values: endpointValues(view.rows.map(row => row.positiveValue)),
        numeric: true,
        forceValues: xType === "log",
        title: context.measureText
      },
      y: {
        scale: "mainSourcePosition",
        values: endpointValues(view.rows.map(row => row.sourcePosition)),
        numeric: true,
        forceValues: yType === "log",
        title: "Source selection order"
      }
    });
    program = createOwnedFacade(sourceProgram(view, profile, "createHeatmap"), "createHeatmap", {
      ...common,
      x: {
        field: "positiveValue",
        fieldType: "quantitative",
        scale: {
          ...quantitativeScale("mainValue", xType, xTypeIndex),
          ...(profile.reverseX === undefined ? {} : { reverse: profile.reverseX })
        }
      },
      y: {
        field: "sourcePosition",
        fieldType: "quantitative",
        scale: {
          ...quantitativeScale("mainSourcePosition", yType, yTypeIndex),
          ...(profile.reverseY === undefined ? {} : { reverse: profile.reverseY })
        }
      },
      bin: {
        bins: profile.bins ?? { x: 10, y: 8 },
        includeEmpty: profile.includeEmpty ?? true,
        ...(profile.explicitExtent
          ? {
              extent: {
                x: expandedExtent(view.rows.map(row => row.positiveValue)),
                y: expandedExtent(view.rows.map(row => row.sourcePosition))
              }
            }
          : {})
      },
      color: heatmapBinnedColor(ordinal + (profile.paletteOffset ?? 0)),
      guides: guideOptions(profile, resources, context, ordinal, "createHeatmap")
    });
  }
  return titleProgram(
    materializeGuideProxyGeometry(program, view),
    context,
    profile,
    "observational heatmap"
  );
}

function buildHistogram(factors) {
  const view = analysisView(factors, "distribution");
  const context = contextFor(factors.dataset, view, "grouped histogram");
  const ordinal = factors.variant.ordinal;
  const profile = factors.variant;
  const feature = profile.featureIndex;
  const fillOnly = profile.fillOnly === true;
  const xTypeIndex = ordinal % QUANTITATIVE_SCALE_TYPES.length;
  const yTypeIndex = ordinal % HISTOGRAM_COUNT_SCALE_TYPES.length;
  const values = endpointValues(view.rows.map(row => row.positiveValue));
  const histogramResources = freeze({
    ...guideResources(view, context, "horizontal"),
    x: {
      scale: "mainValue",
      values: [(values[0] + values.at(-1)) / 2],
      numeric: true,
      forceValues: QUANTITATIVE_SCALE_TYPES[xTypeIndex] === "log",
      title: context.measureText
    },
    y: {
      scale: "mainCount",
      values: [0],
      numeric: true,
      title: "Observation count"
    }
  });
  const span = values.at(-1) - values[0];
  const boundaries = Array.from(
    { length: 9 },
    (_, index) => values[0] + span * index / 8
  );
  const binning = feature === 1
    ? { maxBins: 8 }
    : feature === 2
      ? { maxBins: 24 }
      : feature === 3
        ? { binStep: span / 12 }
      : feature === 4
          ? { binBoundaries: boundaries }
          : { maxBins: 14 };
  let program = createOwnedFacade(sourceProgram(view, profile, "createHistogram"), "createHistogram", {
    id: "facadeHistogram",
    data: "analysisRows",
    coordinate: "main",
    field: "positiveValue",
    ...binning,
    stack: feature === 5 ? "normalize" : feature === 6 ? null : "zero",
    xScale: quantitativeScale(
      "mainValue",
      QUANTITATIVE_SCALE_TYPES[xTypeIndex],
      xTypeIndex
    ),
    yScale: quantitativeScale(
      "mainCount",
      HISTOGRAM_COUNT_SCALE_TYPES[yTypeIndex],
      yTypeIndex
    ),
    ...(fillOnly ? {} : {
      color: categoricalColor(
        "createHistogram",
        "category",
        ordinal,
        profile.histogramLayout ?? ["diverging", "group", "overlay"][ordinal % 3]
      )
    }),
    bar: {
      ...(fillOnly ? { fill: "#60a5fa" } : {}),
      opacity: feature === 5 ? 0.66 : feature === 6 ? 0.92 : 0.82,
      stroke: "#ffffff",
      strokeWidth: 0.6
    },
    guides: guideOptions(
      profile,
      histogramResources,
      context,
      ordinal,
      "createHistogram"
    )
  });
  return titleProgram(
    materializeGuideProxyGeometry(program, view),
    context,
    profile,
    "grouped histogram"
  );
}

function coverageSchedule(variants) {
  const selectionVariantIds = Array.from({ length: 5 }, () => variants)
    .flat()
    .map(variant => variant.id);
  return freeze({
    factor: "variant",
    selectionVariantIds,
    minimumSelections: selectionVariantIds.length,
    assignment: "round-robin-datasets-per-variant",
    variantRequirements: variants.map(variant => ({
      variantId: variant.id,
      minimumOccurrences: 5,
      minimumDatasets: 3
    })),
    minimumDatasetsPerRequirement: 3
  });
}

function eligibleVariants(dataset, action) {
  const supportsTemporal = realisticDatasetRoles(dataset).temporal.length > 0;
  return freeze(profilesForAction(action).flatMap((profile, ordinal) =>
    profile.requiresTemporal && !supportsTemporal
      ? []
      : [{
          ...profile,
          ordinal,
          supportsTemporal
        }]
  ));
}

function factorContract(dataset, capability, action) {
  const fieldPair = verifiedFieldPairDomain(dataset, capability);
  if (fieldPair.length === 0) return undefined;
  const variant = eligibleVariants(dataset, action);
  if (variant.length === 0) return undefined;
  return freeze({ fieldPair: [...fieldPair], variant });
}

function directEntries(program, action) {
  return (program.trace.children ?? []).filter(entry => entry.op === action);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function makeRecipe({ id, family, capability, action, complexity, build }) {
  const datasets = freeze(realisticDatasetIds());
  let cachedDefaultFactors;
  const defaultFactors = () => {
    if (cachedDefaultFactors === undefined) {
      cachedDefaultFactors = factorContract(INITIAL_DATASET, capability, action);
      if (cachedDefaultFactors === undefined) {
        throw new Error(`${INITIAL_DATASET} must remain eligible for ${id}.`);
      }
    }
    return cachedDefaultFactors;
  };
  const schedule = coverageSchedule(profilesForAction(action));
  return freeze({
    id,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity,
    enforceFactorEffects: true,
    datasets,
    get factors() {
      return defaultFactors();
    },
    expectedDirectActions: freeze([action]),
    coverageSchedule: schedule,
    minimumSelections: schedule.minimumSelections,
    factorsForDataset(dataset) {
      return factorContract(dataset, capability, action);
    },
    build,
    observe() {
      return freeze([]);
    },
    observeFactors(program, values) {
      const view = analysisView(values, capability);
      const context = contextFor(values.dataset, view, family);
      const direct = directEntries(program, action).at(-1);
      const data = program.semanticSpec.datasets.find(candidate => candidate.id === "analysisRows");
      const fieldPairObserved = directEntries(program, "createData").some(({ args }) =>
        args.id === "analysisRows" && args.valuesCount === view.rows.length
      ) && data !== undefined && sameValue(data.values, view.rows) &&
        program.semanticSpec.title?.text === context.title;
      const variantObserved = direct !== undefined &&
        direct.args.guides !== undefined &&
        program.semanticSpec.title?.subtitle?.includes(values.variant.id);
      return freeze([
        ...(fieldPairObserved ? [{
          factor: "fieldPair",
          value: values.fieldPair,
          evidence: "direct:createData;final:authentic-analysisRows+visible-title"
        }] : []),
        ...(variantObserved ? [{
          factor: "variant",
          value: values.variant,
          evidence: `direct:${action}.maximal-options;final:materialized-guides+visible-policy`
        }] : [])
      ]);
    },
    describe(values) {
      const view = analysisView(values, capability);
      const context = contextFor(values.dataset, view, family);
      return freeze({
        corpus: "tidytuesday",
        chartFamily: family,
        complexity,
        sourceDatasetIds: [values.dataset],
        title: context.title,
        analysisQuestion: analysisQuestion(context, values.variant, family),
        sourceFields: context.fields,
        sample: view.sample,
        provenance: view.provenance,
        dataOperations: view.provenance.transformations.map(transformation => transformation.op),
        activeFeatures: []
      });
    }
  });
}

const RECIPE_DEFINITIONS = freeze([
  {
    id: "realistic-statistical-facade-coverage-violin",
    family: "split violin plot",
    capability: "distribution",
    action: "createViolinPlot",
    complexity: "advanced",
    build: buildViolin
  },
  {
    id: "realistic-statistical-facade-coverage-box",
    family: "distribution box plot",
    capability: "distribution",
    action: "createBoxPlot",
    complexity: "intermediate",
    build: buildBox
  },
  {
    id: "realistic-statistical-facade-coverage-gradient",
    family: "gradient density plot",
    capability: "distribution",
    action: "createGradientPlot",
    complexity: "advanced",
    build: buildGradient
  },
  {
    id: "realistic-statistical-facade-coverage-heatmap",
    family: "observational heatmap",
    capability: "record",
    action: "createHeatmap",
    complexity: "intermediate",
    build: buildHeatmap
  },
  {
    id: "realistic-statistical-facade-coverage-histogram",
    family: "grouped histogram",
    capability: "distribution",
    action: "createHistogram",
    complexity: "intermediate",
    build: buildHistogram
  }
]);

export const REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES = freeze(
  RECIPE_DEFINITIONS.map(makeRecipe)
);

export const REALISTIC_STATISTICAL_FACADE_COVERAGE_EXPECTED_ACTIONS = TARGET_ACTIONS;
export const REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_COUNTS = TARGET_REQUIREMENT_COUNTS;
export const REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_SHA256 =
  TARGET_REQUIREMENT_SHA256;
export const REALISTIC_STATISTICAL_FACADE_COVERAGE_SHAPE_VALUE_KEYS =
  SHAPE_FAMILY_LITERAL_VALUE_KEYS;

export const REALISTIC_STATISTICAL_FACADE_COVERAGE_SCHEDULES = freeze(
  Object.fromEntries(REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.map(recipe => [
    recipe.id,
    recipe.coverageSchedule
  ]))
);

export const REALISTIC_STATISTICAL_FACADE_COVERAGE_COUNTS = freeze({
  recipes: REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.length,
  minimumVariantsPerRecipe: Math.min(
    ...REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.map(recipe =>
      recipe.coverageSchedule.variantRequirements.length
    )
  ),
  maximumVariantsPerRecipe: Math.max(
    ...REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.map(recipe =>
      recipe.coverageSchedule.variantRequirements.length
    )
  ),
  minimumSelections: REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.reduce(
    (sum, recipe) => sum + recipe.minimumSelections,
    0
  ),
  maximumRecipeSelections: Math.max(
    ...REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.map(recipe => recipe.minimumSelections)
  ),
  maximumFamilySelections: REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.reduce(
    (sum, recipe) => sum + recipe.minimumSelections,
    0
  ),
  intermediateSelections: REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES
    .filter(recipe => recipe.complexity === "intermediate")
    .reduce((sum, recipe) => sum + recipe.minimumSelections, 0),
  advancedSelections: REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES
    .filter(recipe => recipe.complexity === "advanced")
    .reduce((sum, recipe) => sum + recipe.minimumSelections, 0),
  targetRequirements: Object.values(TARGET_REQUIREMENT_COUNTS).reduce(
    (sum, count) => sum + count,
    0
  ) + SHAPE_FAMILY_LITERAL_VALUE_KEYS.length
});

export function realisticStatisticalFacadeWitnessFactors(recipe, dataset) {
  if (!REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.includes(recipe)) {
    throw new Error(`Unknown statistical facade coverage recipe "${recipe?.id}".`);
  }
  const domains = recipe.factorsForDataset(dataset);
  if (domains === undefined) return freeze([]);
  return freeze(domains.variant.map((variant, index) => ({
    dataset,
    fieldPair: domains.fieldPair[index % domains.fieldPair.length],
    variant
  })));
}

export function realisticStatisticalFacadeCoverageFactors(
  recipe,
  datasets = recipe.datasets
) {
  if (!REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.includes(recipe)) {
    throw new Error(`Unknown statistical facade coverage recipe "${recipe?.id}".`);
  }
  const variants = new Map(recipe.factors.variant.map(variant => [variant.id, variant]));
  const indexes = new Map(recipe.factors.variant.map((variant, index) => [variant.id, index]));
  const domainsByDataset = new Map(datasets.map(dataset => [
    dataset,
    recipe.factorsForDataset(dataset)
  ]));
  const eligibleByVariant = new Map(recipe.factors.variant.map(variant => [
    variant.id,
    datasets.flatMap(dataset => {
      const domains = domainsByDataset.get(dataset);
      const eligible = domains?.variant.find(candidate => candidate.id === variant.id);
      return eligible === undefined ? [] : [{ dataset, domains, variant: eligible }];
    })
  ]));
  const occurrences = new Map();
  return freeze(recipe.coverageSchedule.selectionVariantIds.map(variantId => {
    const initial = variants.get(variantId);
    if (initial === undefined) throw new Error(`${recipe.id} has no variant "${variantId}".`);
    const occurrence = occurrences.get(variantId) ?? 0;
    occurrences.set(variantId, occurrence + 1);
    const eligible = eligibleByVariant.get(variantId);
    if (eligible.length === 0) {
      throw new Error(`${recipe.id} has no eligible dataset for variant "${variantId}".`);
    }
    const selected = eligible[
      (indexes.get(variantId) * 5 + occurrence) % eligible.length
    ];
    const fieldPairIndex = recipe.expectedDirectActions[0] === "createViolinPlot"
      ? Math.min(1, selected.domains.fieldPair.length - 1)
      : 0;
    return {
      dataset: selected.dataset,
      fieldPair: selected.domains.fieldPair[fieldPairIndex],
      variant: selected.variant
    };
  }));
}

export function statisticalFacadeRequirementTargets(publicInventory, baselineRequirements) {
  if (!Array.isArray(publicInventory?.optionPaths) || !Array.isArray(baselineRequirements)) {
    throw new TypeError("Statistical facade targets require an inventory and coverage requirements.");
  }
  const actions = new Set(TARGET_ACTIONS);
  const inventoryIds = new Set([
    ...publicInventory.optionPaths.filter(option =>
      option.required && actions.has(option.action)
    ).map(option => option.id),
    ...publicInventory.pathLiteralRequirements.filter(requirement => {
      const option = publicInventory.optionPaths.find(candidate =>
        candidate.id === requirement.optionPath
      );
      return option?.required && actions.has(option.action);
    }).map(requirement => requirement.id)
  ]);
  return freeze(baselineRequirements
    .filter(requirement => inventoryIds.has(requirement.id) && !requirement.meetsMinimum)
    .map(requirement => requirement.id)
    .sort());
}
