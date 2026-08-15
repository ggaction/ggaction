import { chart } from "../../../src/index.js";

import {
  realisticDatasetIds,
  realisticFieldPairDomain,
  realisticRecordView,
  realisticSourceFields
} from "./realistic-data.js";

const INITIAL_DATASET = "tt-penguins";
const QUANTITATIVE_TYPES = Object.freeze(["linear", "log", "pow", "sqrt", "symlog"]);
const ZERO_SUPPORTING_TYPES = Object.freeze(["linear", "pow", "sqrt", "symlog"]);
const INTERPOLATIONS = Object.freeze([
  "rgb", "hsl", "hsl-long", "lab", "hcl", "hcl-long", "cubehelix", "cubehelix-long"
]);
const DISCRETIZED_COLOR_TYPES = Object.freeze(["quantize", "quantile", "threshold"]);
const TARGET_ACTIONS = Object.freeze([
  "createBoxPlot",
  "createGradientPlot",
  "createViolinPlot",
  "createHeatmap",
  "createHistogram"
]);
const FAMILY_LABELS = Object.freeze({
  "facade-scale-box-plot": "distribution box plot",
  "facade-scale-gradient-plot": "distribution gradient plot",
  "facade-scale-violin-plot": "distribution violin plot",
  "facade-scale-heatmap": "bivariate heatmap",
  "facade-scale-histogram": "grouped histogram"
});
const CANVAS = Object.freeze({
  width: 1_200,
  height: 760,
  background: "#ffffff",
  margin: Object.freeze({ top: 110, right: 180, bottom: 115, left: 140 })
});

function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function canvas() {
  return { ...CANVAS, margin: { ...CANVAS.margin } };
}

function slug(value) {
  return value.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLowerCase();
}

const BOOL_PROFILES = Object.freeze([
  Object.freeze({ nice: false, zero: false, clamp: false, reverse: false }),
  Object.freeze({ nice: true, zero: false, clamp: true, reverse: true }),
  Object.freeze({ nice: true, zero: true, clamp: false, reverse: true }),
  Object.freeze({ nice: false, zero: true, clamp: true, reverse: false }),
  Object.freeze({ nice: true, zero: false, clamp: false, reverse: true })
]);

function quantitativeScale(action, channel, variant, type, profileIndex) {
  const profile = BOOL_PROFILES[profileIndex % BOOL_PROFILES.length];
  return {
    id: `${slug(action)}-${channel}-${slug(variant)}-${type}`,
    type,
    domain: "auto",
    range: "auto",
    // Nice log domains can round a small positive histogram boundary to zero.
    // Keeping log exact preserves the valid strictly-positive role witness.
    nice: type === "log" ? false : profile.nice,
    clamp: profile.clamp,
    reverse: profile.reverse,
    ...(type === "log" ? { base: 2 } : { zero: profile.zero }),
    ...(type === "pow" ? { exponent: 2 } : {}),
    ...(type === "symlog" ? { constant: 1 } : {})
  };
}

function bandScale(action, channel, variant, reverse) {
  return {
    id: `${slug(action)}-${channel}-${slug(variant)}-band`,
    type: "band",
    domain: "auto",
    range: "auto",
    reverse,
    paddingInner: 0.16,
    paddingOuter: 0.08,
    align: 0.5
  };
}

function categoricalColorScale(action, variant, ordinal) {
  const id = `${slug(action)}-color-${slug(variant)}`;
  switch (ordinal % 5) {
    case 0:
      return { id, type: "ordinal", domain: "auto", palette: "tableau10" };
    case 1:
      return { id, type: "ordinal", domain: "auto", palette: "set2" };
    case 2:
      return {
        id, type: "ordinal", domain: "auto",
        palette: { name: "tableau20", count: 6 }
      };
    case 3:
      return {
        id, type: "ordinal", domain: "auto",
        palette: { name: "viridis", extent: [0.1, 0.9] }
      };
    default:
      return { id, type: "ordinal", domain: "auto", range: "auto" };
  }
}

function distributionVariants() {
  return freeze(["vertical", "horizontal"].flatMap(orientation =>
    QUANTITATIVE_TYPES.map((type, typeIndex) => ({
      id: `${orientation}-${type}`,
      orientation,
      type,
      typeIndex
    }))
  ));
}

const DISTRIBUTION_VARIANTS = distributionVariants();

const HEATMAP_VARIANTS = freeze([
  ...INTERPOLATIONS.map((interpolate, index) => ({
    id: `sequential-${interpolate}`,
    colorType: "sequential",
    interpolate,
    positionType: ["linear", "log", "pow", "sqrt", "symlog", "linear", "pow", "band"][index],
    profileIndex: index
  })),
  {
    id: "quantize-bins",
    colorType: "quantize",
    positionType: "log",
    profileIndex: 1
  },
  {
    id: "quantile-ranks",
    colorType: "quantile",
    positionType: "sqrt",
    profileIndex: 3
  },
  {
    id: "threshold-levels",
    colorType: "threshold",
    positionType: "symlog",
    profileIndex: 4
  },
  {
    id: "ordinal-grid",
    colorType: "ordinal",
    positionType: "band",
    profileIndex: 0
  }
]);

const HISTOGRAM_VARIANTS = freeze(QUANTITATIVE_TYPES.map((xType, index) => ({
  id: `${xType}-${ZERO_SUPPORTING_TYPES[index % ZERO_SUPPORTING_TYPES.length]}`,
  xType,
  yType: ZERO_SUPPORTING_TYPES[index % ZERO_SUPPORTING_TYPES.length],
  profileIndex: index
})));

const TRANSFORMED_VIEW_CACHE_LIMIT = 16;
const ELIGIBLE_FIELD_PAIR_CACHE_LIMIT = 6;
const viewCache = new Map();
const eligibleFieldPairCache = new Map();
const cacheActivity = {
  transformedViewEvictions: 0,
  eligibleFieldPairDomainEvictions: 0
};

function cachedValue(cache, key) {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cacheValue(cache, key, value, limit, evictionCounter) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > limit) {
    cache.delete(cache.keys().next().value);
    cacheActivity[evictionCounter] += 1;
  }
  return value;
}

function viewKey(factors, capability) {
  return [
    factors.dataset,
    capability,
    factors.fieldPair.measureIndex,
    factors.fieldPair.dimensionIndex
  ].join("\0");
}

function transformedView(factors, capability) {
  const key = viewKey(factors, capability);
  const cached = cachedValue(viewCache, key);
  if (cached !== undefined) return cached;
  const base = realisticRecordView(factors.dataset, {
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    includeSecondaryMeasure: false,
    includeSecondaryDimension: false,
    deriveSubgroup: true,
    rowLimit: 120,
    groupLimit: 6,
    minimumPerGroup: capability === "distribution" ? 5 : 1,
    minimumRetainedGroupRows: capability === "distribution" ? 5 : 1,
    requireRetainedGroupVariation: capability === "distribution"
  });
  const minimum = Math.min(...base.rows.map(row => row.value));
  const offset = 1 - minimum;
  const rows = base.rows.map((row, rowIndex) => ({
    ...row,
    value: row.value + offset,
    sourcePosition: rowIndex + 1
  }));
  const transformations = [
    ...base.provenance.transformations,
    {
      op: "positive-domain-shift",
      sourceField: base.provenance.fieldBindings.measure,
      offset,
      as: "value",
      purpose: "make every observed value valid for logarithmic facade-scale witnesses"
    },
    {
      op: "source-selection-order-rank",
      as: "sourcePosition",
      minimum: 1,
      maximum: rows.length
    }
  ];
  const view = freeze({
    rows,
    sample: base.sample,
    provenance: {
      ...base.provenance,
      transformations
    }
  });
  return cacheValue(
    viewCache,
    key,
    view,
    TRANSFORMED_VIEW_CACHE_LIMIT,
    "transformedViewEvictions"
  );
}

function gridRows(view) {
  const cells = new Map();
  for (const row of view.rows) {
    const key = `${row.category}\0${row.subgroup}`;
    const cell = cells.get(key) ?? {
      category: row.category,
      subgroup: row.subgroup,
      total: 0,
      count: 0
    };
    cell.total += row.value;
    cell.count += 1;
    cells.set(key, cell);
  }
  return freeze([...cells.values()].map(cell => ({
    category: cell.category,
    subgroup: cell.subgroup,
    value: cell.total / cell.count
  })));
}

function pregriddedView(view) {
  const rows = gridRows(view);
  return freeze({
    ...view,
    rows,
    provenance: {
      ...view.provenance,
      transformations: [
        ...view.provenance.transformations,
        {
          op: "aggregate-cell-mean",
          groupBy: ["category", "subgroup"],
          field: "value",
          outputRows: rows.length
        }
      ]
    }
  });
}

function contextFor(dataset, view, family) {
  const fields = realisticSourceFields(dataset, view.provenance.fieldBindings);
  const byName = new Map(fields.map(field => [field.field, field]));
  const bindings = view.provenance.fieldBindings;
  const measure = byName.get(bindings.measure);
  const dimension = byName.get(bindings.dimension);
  const measureText = measure?.label ?? bindings.measure;
  const dimensionText = dimension?.label ?? bindings.dimension;
  const unit = measure?.unit === undefined ? "" : ` (${measure.unit})`;
  const familyLabel = FAMILY_LABELS[family] ?? family;
  return freeze({
    fields,
    title: `${measureText}${unit} by ${dimensionText} — ${familyLabel}`,
    measureText,
    dimensionText,
    familyLabel
  });
}

function questionFor(context, variant, family) {
  const policy = variant.positionType !== undefined
    ? `${variant.positionType} position and ${variant.colorType} color`
    : variant.type !== undefined
      ? `${variant.orientation} layout with a ${variant.type} measure axis`
      : `${variant.xType} value and ${variant.yType} count axes`;
  return `How does the positive-shifted ${context.measureText} distribution across ${context.dimensionText} read with ${policy} in this ${FAMILY_LABELS[family] ?? context.familyLabel}?`;
}

function sourceProgram(view) {
  return chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows });
}

function distributionChannels(action, variant) {
  const quantitative = {
    field: "value",
    fieldType: "quantitative",
    scale: quantitativeScale(action, variant.orientation === "vertical" ? "y" : "x", variant.id, variant.type, variant.typeIndex)
  };
  const category = {
    field: "category",
    fieldType: "nominal",
    scale: bandScale(action, variant.orientation === "vertical" ? "x" : "y", variant.id, variant.typeIndex % 2 === 1)
  };
  return variant.orientation === "vertical"
    ? { x: category, y: quantitative }
    : { x: quantitative, y: category };
}

function finish(program, context, variant, family) {
  return program.createTitle({
    text: context.title,
    subtitle: questionFor(context, variant, family),
    align: "left",
    maxWidth: CANVAS.width - CANVAS.margin.left - CANVAS.margin.right,
    wrap: "word",
    lineHeight: 26
  });
}

function buildBox(factors) {
  const view = transformedView(factors, "distribution");
  const family = "facade-scale-box-plot";
  const context = contextFor(factors.dataset, view, family);
  return finish(sourceProgram(view).createBoxPlot({
    id: "facadeBoxes",
    data: "analysisRows",
    ...distributionChannels("createBoxPlot", factors.variant),
    whisker: { type: "tukey", factor: 1.5 },
    width: { band: 0.7 },
    outliers: true,
    guides: false
  }), context, factors.variant, family);
}

function bandwidth(view) {
  const values = view.rows.map(row => row.value).sort((left, right) => left - right);
  const spread = values.at(-1) - values[0];
  return Math.max(Number.MIN_VALUE, spread / Math.max(8, Math.sqrt(values.length)));
}

function buildGradient(factors) {
  const view = transformedView(factors, "distribution");
  const family = "facade-scale-gradient-plot";
  const context = contextFor(factors.dataset, view, family);
  return finish(sourceProgram(view).createGradientPlot({
    id: "facadeGradients",
    data: "analysisRows",
    ...distributionChannels("createGradientPlot", factors.variant),
    density: { bandwidth: bandwidth(view), steps: 40, kernel: "gaussian" },
    width: { band: 0.72 },
    gradient: { palette: "blues", opacity: [0.12, 0.9] },
    center: { type: "median", stroke: "#0f172a", strokeWidth: 1.25 },
    guides: false
  }), context, factors.variant, family);
}

function buildViolin(factors) {
  const view = transformedView(factors, "distribution");
  const family = "facade-scale-violin-plot";
  const context = contextFor(factors.dataset, view, family);
  const variantOrdinal = DISTRIBUTION_VARIANTS.findIndex(variant =>
    variant.id === factors.variant.id
  );
  if (variantOrdinal < 0) {
    throw new Error(`Unknown violin facade variant "${factors.variant.id}".`);
  }
  return finish(sourceProgram(view).createViolinPlot({
    id: "facadeViolins",
    data: "analysisRows",
    ...distributionChannels("createViolinPlot", factors.variant),
    color: {
      field: "category",
      fieldType: "nominal",
      scale: categoricalColorScale(
        "createViolinPlot",
        factors.variant.id,
        variantOrdinal
      )
    },
    density: {
      bandwidth: bandwidth(view), steps: 40, kernel: "epanechnikov",
      width: { band: 0.82, resolve: "shared" }
    },
    area: { opacity: 0.78, stroke: "#334155", strokeWidth: 0.7, curve: "basis" },
    guides: false
  }), context, factors.variant, family);
}

function heatmapColorScale(variant) {
  const id = `createheatmap-color-${slug(variant.id)}`;
  if (variant.colorType === "ordinal") {
    return { id, type: "ordinal", domain: "auto", palette: { name: "set2", count: 6 } };
  }
  if (variant.colorType === "quantize") {
    return {
      id, type: "quantize", domain: "auto", palette: { name: "blues", count: 5 },
      clamp: true, reverse: true
    };
  }
  if (variant.colorType === "quantile") {
    return {
      id, type: "quantile", domain: "auto", palette: { name: "reds", count: 5 },
      reverse: false
    };
  }
  if (variant.colorType === "threshold") {
    return {
      id, type: "threshold", domain: [0.5, 1.5, 2.5],
      palette: { name: "greens", count: 4 },
      reverse: true
    };
  }
  const index = INTERPOLATIONS.indexOf(variant.interpolate);
  const common = {
    id,
    type: "sequential",
    domain: "auto",
    interpolate: variant.interpolate,
    clamp: index % 2 === 0,
    reverse: index % 3 === 0
  };
  if (index === 0) return { ...common, palette: "viridis" };
  if (index === 1) return { ...common, palette: "magma" };
  if (index === 2) return { ...common, palette: { name: "plasma", extent: [0.08, 0.92] } };
  if (index === 3) return { ...common, palette: { name: "cividis", extent: [0.15, 0.85] } };
  if (index === 7) return { ...common, range: "auto" };
  return { ...common, palette: "turbo" };
}

function buildHeatmap(factors) {
  const view = transformedView(factors, "record");
  const family = "facade-scale-heatmap";
  const context = contextFor(factors.dataset, view, family);
  const variant = factors.variant;
  const colorScale = heatmapColorScale(variant);
  if (variant.positionType === "band") {
    const grid = pregriddedView(view);
    const color = variant.colorType === "ordinal"
      ? { field: "category", fieldType: "nominal", scale: colorScale }
      : { field: "value", fieldType: "quantitative", scale: colorScale };
    return finish(sourceProgram(grid).createHeatmap({
      id: "facadeHeatmap",
      data: "analysisRows",
      x: {
        field: "category",
        fieldType: "nominal",
        scale: bandScale("createHeatmap", "x", variant.id, false)
      },
      y: {
        field: "subgroup",
        fieldType: "nominal",
        scale: bandScale("createHeatmap", "y", variant.id, true)
      },
      color,
      rect: { opacity: 0.9, stroke: "#ffffff", strokeWidth: 0.7 },
      guides: false
    }), context, variant, family);
  }
  const discretizedColor = DISCRETIZED_COLOR_TYPES.includes(variant.colorType);
  return finish(sourceProgram(view).createHeatmap({
    id: "facadeHeatmap",
    data: "analysisRows",
    x: {
      field: "value",
      fieldType: "quantitative",
      scale: quantitativeScale(
        "createHeatmap", "x", variant.id, variant.positionType, variant.profileIndex
      )
    },
    y: {
      field: "sourcePosition",
      fieldType: "quantitative",
      scale: quantitativeScale(
        "createHeatmap", "y", variant.id, variant.positionType, variant.profileIndex + 2
      )
    },
    bin: discretizedColor
      ? { bins: { x: 12, y: 12 }, includeEmpty: true }
      : { bins: { x: 10, y: 8 }, includeEmpty: false },
    color: { scale: colorScale },
    rect: { opacity: 0.9, stroke: "#ffffff", strokeWidth: 0.7 },
    guides: false
  }), context, variant, family);
}

function buildHistogram(factors) {
  const view = transformedView(factors, "histogram");
  const family = "facade-scale-histogram";
  const context = contextFor(factors.dataset, view, family);
  const variant = factors.variant;
  return finish(sourceProgram(view).createHistogram({
    id: "facadeHistogram",
    data: "analysisRows",
    field: "value",
    maxBins: 14,
    stack: "zero",
    xScale: quantitativeScale(
      "createHistogram", "x", variant.id, variant.xType, variant.profileIndex
    ),
    yScale: quantitativeScale(
      "createHistogram", "y", variant.id, variant.yType, variant.profileIndex + 2
    ),
    color: {
      field: "category",
      fieldType: "nominal",
      layout: "stack",
      scale: categoricalColorScale("createHistogram", variant.id, variant.profileIndex)
    },
    bar: { opacity: 0.86, stroke: "#ffffff", strokeWidth: 0.6 },
    guides: false
  }), context, variant, family);
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

function eligibleFieldPairs(dataset, capability) {
  const key = `${dataset}\0${capability}`;
  const cached = cachedValue(eligibleFieldPairCache, key);
  if (cached !== undefined) return cached;
  const fieldPairs = freeze([...realisticFieldPairDomain(dataset, capability)]);
  return cacheValue(
    eligibleFieldPairCache,
    key,
    fieldPairs,
    ELIGIBLE_FIELD_PAIR_CACHE_LIMIT,
    "eligibleFieldPairDomainEvictions"
  );
}

function factorContract(dataset, capability, variants) {
  const fieldPair = eligibleFieldPairs(dataset, capability);
  if (fieldPair.length === 0) return undefined;
  return freeze({ fieldPair, variant: variants });
}

function directEntries(program, action) {
  return (program.trace.children ?? []).filter(entry => entry.op === action);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function scaleTypeSignature(args) {
  return JSON.stringify({
    x: args.x?.scale?.type,
    y: args.y?.scale?.type,
    xScale: args.xScale?.type,
    yScale: args.yScale?.type,
    color: args.color?.scale?.type,
    interpolate: args.color?.scale?.interpolate
  });
}

function makeRecipe({ id, complexity, family, capability, variants, action, build }) {
  const datasets = freeze(realisticDatasetIds());
  const factors = factorContract(INITIAL_DATASET, capability, variants);
  if (factors === undefined) {
    throw new Error(`${INITIAL_DATASET} must remain eligible for ${id}.`);
  }
  const schedule = coverageSchedule(variants);
  return freeze({
    id,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity,
    enforceFactorEffects: true,
    datasets,
    factors,
    expectedDirectActions: freeze([action]),
    coverageSchedule: schedule,
    minimumSelections: schedule.minimumSelections,
    factorsForDataset(dataset) {
      return factorContract(dataset, capability, variants);
    },
    build,
    observe() {
      return freeze([]);
    },
    observeFactors(program, values) {
      const view = transformedView(values, capability);
      const selectedRows = action === "createHeatmap" && values.variant.positionType === "band"
        ? pregriddedView(view).rows
        : view.rows;
      const context = contextFor(values.dataset, view, family);
      const title = context.title;
      const question = questionFor(context, values.variant, family);
      const direct = directEntries(program, action).at(-1);
      const data = program.semanticSpec.datasets.find(dataset => dataset.id === "analysisRows");
      const fieldPairObserved = directEntries(program, "createData").some(({ args }) =>
        args.id === "analysisRows" && args.valuesCount === selectedRows.length
      ) && data !== undefined && sameValue(data.values, selectedRows) &&
        program.semanticSpec.title?.text === title;
      const variantObserved = direct !== undefined &&
        scaleTypeSignature(direct.args).includes(values.variant.positionType ?? values.variant.type ?? values.variant.xType) &&
        program.semanticSpec.title?.subtitle === question;
      return freeze([
        ...(fieldPairObserved ? [{
          factor: "fieldPair",
          value: values.fieldPair,
          evidence: "direct:createData;final:authentic-analysisRows+visible-title"
        }] : []),
        ...(variantObserved ? [{
          factor: "variant",
          value: values.variant,
          evidence: `direct:${action}.nested-scale-args;final:resolved-geometry+visible-question`
        }] : [])
      ]);
    },
    describe(values) {
      const sourceView = transformedView(values, capability);
      const view = action === "createHeatmap" && values.variant.positionType === "band"
        ? pregriddedView(sourceView)
        : sourceView;
      const context = contextFor(values.dataset, view, family);
      return freeze({
        corpus: "tidytuesday",
        chartFamily: family,
        complexity,
        sourceDatasetIds: [values.dataset],
        title: context.title,
        analysisQuestion: questionFor(context, values.variant, family),
        sourceFields: context.fields,
        sample: view.sample,
        provenance: view.provenance,
        dataOperations: view.provenance.transformations.map(transformation => transformation.op),
        activeFeatures: []
      });
    }
  });
}

const BOX_RECIPE = makeRecipe({
  id: "realistic-facade-options-box-plot",
  complexity: "advanced",
  family: "facade-scale-box-plot",
  capability: "distribution",
  variants: DISTRIBUTION_VARIANTS,
  action: "createBoxPlot",
  build: buildBox
});

const GRADIENT_RECIPE = makeRecipe({
  id: "realistic-facade-options-gradient-plot",
  complexity: "advanced",
  family: "facade-scale-gradient-plot",
  capability: "distribution",
  variants: DISTRIBUTION_VARIANTS,
  action: "createGradientPlot",
  build: buildGradient
});

const VIOLIN_RECIPE = makeRecipe({
  id: "realistic-facade-options-violin-plot",
  complexity: "advanced",
  family: "facade-scale-violin-plot",
  capability: "distribution",
  variants: DISTRIBUTION_VARIANTS,
  action: "createViolinPlot",
  build: buildViolin
});

const HEATMAP_RECIPE = makeRecipe({
  id: "realistic-facade-options-heatmap",
  complexity: "advanced",
  family: "facade-scale-heatmap",
  capability: "record",
  variants: HEATMAP_VARIANTS,
  action: "createHeatmap",
  build: buildHeatmap
});

const HISTOGRAM_RECIPE = makeRecipe({
  id: "realistic-facade-options-histogram",
  complexity: "intermediate",
  family: "facade-scale-histogram",
  capability: "histogram",
  variants: HISTOGRAM_VARIANTS,
  action: "createHistogram",
  build: buildHistogram
});

export const REALISTIC_FACADE_OPTION_RECIPES = freeze([
  BOX_RECIPE,
  GRADIENT_RECIPE,
  VIOLIN_RECIPE,
  HEATMAP_RECIPE,
  HISTOGRAM_RECIPE
]);

export const REALISTIC_FACADE_OPTION_EXPECTED_ACTIONS = TARGET_ACTIONS;

export function realisticFacadeOptionCacheSnapshot() {
  return freeze({
    transformedViews: viewCache.size,
    transformedViewLimit: TRANSFORMED_VIEW_CACHE_LIMIT,
    transformedViewEvictions: cacheActivity.transformedViewEvictions,
    eligibleFieldPairDomains: eligibleFieldPairCache.size,
    eligibleFieldPairDomainLimit: ELIGIBLE_FIELD_PAIR_CACHE_LIMIT,
    eligibleFieldPairDomainEvictions: cacheActivity.eligibleFieldPairDomainEvictions
  });
}

export const REALISTIC_FACADE_OPTION_COUNTS = freeze({
  recipes: REALISTIC_FACADE_OPTION_RECIPES.length,
  advanced: REALISTIC_FACADE_OPTION_RECIPES.filter(recipe =>
    recipe.complexity === "advanced"
  ).length,
  intermediate: REALISTIC_FACADE_OPTION_RECIPES.filter(recipe =>
    recipe.complexity === "intermediate"
  ).length,
  minimumSelections: REALISTIC_FACADE_OPTION_RECIPES.reduce((sum, recipe) =>
    sum + recipe.coverageSchedule.minimumSelections, 0
  ),
  advancedSelections: REALISTIC_FACADE_OPTION_RECIPES
    .filter(recipe => recipe.complexity === "advanced")
    .reduce((sum, recipe) => sum + recipe.coverageSchedule.minimumSelections, 0),
  intermediateSelections: HISTOGRAM_RECIPE.coverageSchedule.minimumSelections
});

export function realisticFacadeOptionWitnessFactors(recipe, dataset) {
  if (!REALISTIC_FACADE_OPTION_RECIPES.includes(recipe)) {
    throw new Error(`Unknown realistic facade-option recipe "${recipe?.id}".`);
  }
  const domains = recipe.factorsForDataset(dataset);
  if (domains === undefined) return freeze([]);
  return freeze(domains.variant.map((variant, index) => ({
    dataset,
    fieldPair: domains.fieldPair[index % domains.fieldPair.length],
    variant
  })));
}

export function realisticFacadeOptionCoverageFactors(recipe, datasets = recipe.datasets) {
  if (!REALISTIC_FACADE_OPTION_RECIPES.includes(recipe)) {
    throw new Error(`Unknown realistic facade-option recipe "${recipe?.id}".`);
  }
  const variants = new Map(recipe.factors.variant.map(variant => [variant.id, variant]));
  const variantIndexes = new Map(recipe.factors.variant.map((variant, index) => [variant.id, index]));
  const occurrences = new Map();
  return freeze(recipe.coverageSchedule.selectionVariantIds.map(variantId => {
    const variant = variants.get(variantId);
    if (variant === undefined) throw new Error(`${recipe.id} has no variant "${variantId}".`);
    const occurrence = occurrences.get(variantId) ?? 0;
    occurrences.set(variantId, occurrence + 1);
    const start = (variantIndexes.get(variantId) + occurrence) % datasets.length;
    for (let offset = 0; offset < datasets.length; offset += 1) {
      const dataset = datasets[(start + offset) % datasets.length];
      const domains = recipe.factorsForDataset(dataset);
      if (domains === undefined) continue;
      return {
        dataset,
        fieldPair: domains.fieldPair[occurrence % domains.fieldPair.length],
        variant
      };
    }
    throw new Error(`${recipe.id} has no eligible dataset for variant "${variantId}".`);
  }));
}
