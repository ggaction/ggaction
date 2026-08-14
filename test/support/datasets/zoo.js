import { datasetDefinition } from "./catalog.js";

const SHAPES = Object.freeze([
  "circle", "square", "diamond", "triangle-up", "triangle-down",
  "triangle-left", "triangle-right", "plus", "cross", "star", "hexagon", "wye"
]);

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function quantitativeExtremes() {
  const values = [
    -1e308, -1e15, -1, -1e-12, -Number.MIN_VALUE, -0,
    0, Number.MIN_VALUE, 1e-12, 1, 1e15, 1e308
  ];
  return values.map((value, index) => ({
    id: `q-${index}`,
    group: ["negative", "zero", "positive"][Math.sign(value) + 1],
    value,
    secondary: index % 4 - 1.5,
    positive: Math.abs(value) + Number.MIN_VALUE
  }));
}

function positiveLogDecades() {
  return Array.from({ length: 25 }, (_, index) => ({
    id: `log-${index}`,
    group: index % 2 === 0 ? "even" : "odd",
    exponent: index - 12,
    value: 10 ** (index - 12),
    reciprocal: 10 ** (12 - index)
  }));
}

function constantDomain() {
  return Array.from({ length: 9 }, (_, index) => ({
    id: `constant-${index}`,
    category: "only",
    value: 7,
    zero: 0,
    time: "2024-01-01T00:00:00Z"
  }));
}

function categoricalCardinality() {
  return Array.from({ length: 257 }, (_, index) => ({
    id: `category-${index.toString().padStart(3, "0")}`,
    category: `Category ${index.toString().padStart(3, "0")} — deterministic long label`,
    group: `Group ${index % 7}`,
    value: (index % 31) - 15,
    order: index
  }));
}

function numericLookingCategories() {
  return ["001", "01", "1", "1.0", "1e3", "-0", "NaN", "Infinity", "null", "", "  "]
    .map((category, index) => ({ id: `numeric-label-${index}`, category, value: index - 5 }));
}

function unicodeLabels() {
  const labels = [
    "한글 범례 항목",
    "日本語のカテゴリ",
    "中文分类标签",
    "العربية من اليمين إلى اليسار",
    "עברית",
    "e\u0301 combining accent",
    "👨‍👩‍👧‍👦 family emoji",
    "🏳️‍🌈 variation selector",
    "Ångström",
    "Dvořák",
    "नमस्ते",
    "A very long category label designed to press against chart margins"
  ];
  return labels.map((label, index) => ({
    id: `unicode-${index}`,
    label,
    group: `그룹 ${index % 3}`,
    value: index + 1,
    weight: (index + 1) ** 2
  }));
}

function temporalBoundaries() {
  const times = [
    "1999-12-31T23:59:59Z",
    "2000-02-28T23:59:59Z",
    "2000-02-29T00:00:00Z",
    "2000-03-01T00:00:00Z",
    "2023-12-31T23:59:59-05:00",
    "2024-01-01T04:59:59Z",
    "2024-02-29T12:00:00+09:00",
    "2024-02-29T03:00:00Z",
    "2024-12-31T23:59:59Z",
    "2025-01-01T00:00:00Z"
  ];
  return times.map((time, index) => ({ id: `time-${index}`, time, group: `g${index % 2}`, value: index - 4 }));
}

function temporalIrregular() {
  const offsets = [0, 1, 2, 3, 4, 3600, 86400, 86401, 31_536_000, 31_536_001];
  return offsets.map((seconds, index) => ({
    id: `irregular-${index}`,
    time: new Date(Date.UTC(2020, 0, 1) + seconds * 1000).toISOString(),
    series: index % 3 === 0 ? "burst" : "gap",
    value: Math.sin(index) * 10
  })).reverse();
}

function histogramBoundaries() {
  const values = [
    0, 0, 0.1, 0.2, 0.3, 0.5, 1,
    1e15, 1e15 + 1, 1e15 + 2, 1e15 + 5, 1e15 + 10,
    Number.MIN_VALUE, Number.MIN_VALUE * 2
  ];
  return values.map((value, index) => ({ id: `bin-${index}`, group: `g${index % 2}`, value }));
}

function multimodalDensity() {
  const rows = [];
  for (let index = 0; index < 40; index += 1) {
    rows.push({ id: `left-${index}`, group: "bimodal", value: -4 + (index % 10) * 0.08 });
    rows.push({ id: `right-${index}`, group: "bimodal", value: 4 + (index % 10) * 0.08 });
  }
  rows.push({ id: "singleton", group: "singleton", value: 0 });
  return rows;
}

function boxplotThresholds() {
  const values = [-1e-13, -5e-14, 0, 5e-14, 1e-13, 1, 2, 3, 4, 5, 8, 8.5, 9];
  return values.map((value, index) => ({ id: `box-${index}`, group: index < 5 ? "tiny" : "regular", value }));
}

function divergingStacks() {
  return ["A", "B", "C", "D"].flatMap((category, categoryIndex) =>
    ["positive", "negative", "zero"].map((series, seriesIndex) => ({
      id: `${category}-${series}`,
      category,
      series,
      value: seriesIndex === 0 ? categoryIndex + 1 : seriesIndex === 1 ? -(categoryIndex + 1) : 0
    }))
  );
}

function asymmetricIntervals() {
  const centers = [-1e-13, 0, 1e-13, 1, 10];
  return centers.map((center, index) => ({
    id: `interval-${index}`,
    category: `I${index}`,
    center,
    lower: index === 1 ? center : center - (index + 1) * Math.max(Math.abs(center), 1e-13) * 0.2,
    upper: index === 1 ? center : center + (index + 2) * Math.max(Math.abs(center), 1e-13) * 0.35
  }));
}

function sparseGrid() {
  const rows = [];
  for (let x = 0; x < 7; x += 1) {
    for (let y = 0; y < 5; y += 1) {
      if ((x + y) % 4 === 0) continue;
      const copies = (x * 3 + y) % 3 + 1;
      for (let copy = 0; copy < copies; copy += 1) {
        rows.push({ id: `cell-${x}-${y}-${copy}`, x: `x${x}`, y: `y${y}`, value: x * y - copy });
      }
    }
  }
  return rows;
}

function facetImbalance() {
  const counts = [1, 2, 3, 5, 8, 13, 21];
  return counts.flatMap((count, facet) => Array.from({ length: count }, (_, index) => ({
    id: `facet-${facet}-${index}`,
    facet: facet === 0 ? "" : `Panel ${facet + 1} with a long header`,
    category: `C${index % 4}`,
    x: index,
    y: (facet + 1) * (index + 1)
  })));
}

function pathOrder() {
  const times = [5, 4, 4, 3, 2, 1, 0];
  return ["alpha", "beta"].flatMap((series, seriesIndex) => times.map((position, index) => ({
    id: `${series}-${index}`,
    series,
    position,
    value: index === 3 && seriesIndex === 1 ? null : position * (seriesIndex + 1)
  })));
}

function polarWrap() {
  return Array.from({ length: 64 }, (_, index) => ({
    id: `sector-${index}`,
    sector: `Sector ${index.toString().padStart(2, "0")}`,
    angle: index === 63 ? 360 : index * 360 / 64,
    radius: index % 11,
    weight: index % 13 === 0 ? 0 : index + 1,
    group: `g${index % 5}`
  }));
}

function labelCollisionCloud() {
  return Array.from({ length: 48 }, (_, index) => ({
    id: `label-${index}`,
    x: index < 24 ? index * 0.002 : 1 - (index - 24) * 0.002,
    y: 0.5 + Math.sin(index) * 0.01,
    label: `Dense annotation ${index} — long text near the ${index < 24 ? "left" : "right"} edge`,
    priority: 48 - index
  }));
}

function multiEncodingStyles() {
  return SHAPES.map((shape, index) => ({
    id: `style-${index}`,
    x: index,
    y: (index % 4) ** 2,
    color: `color-${index % 4}`,
    shape,
    size: index === 0 ? 0 : (index + 1) ** 2,
    opacity: index / (SHAPES.length - 1),
    dash: `dash-${index % 6}`
  }));
}

const GENERATORS = Object.freeze({
  quantitativeExtremes,
  positiveLogDecades,
  constantDomain,
  categoricalCardinality,
  numericLookingCategories,
  unicodeLabels,
  temporalBoundaries,
  temporalIrregular,
  histogramBoundaries,
  multimodalDensity,
  boxplotThresholds,
  divergingStacks,
  asymmetricIntervals,
  sparseGrid,
  facetImbalance,
  pathOrder,
  polarWrap,
  labelCollisionCloud,
  multiEncodingStyles
});

const cache = new Map();

export function zooGeneratorNames() {
  return Object.freeze(Object.keys(GENERATORS));
}

export function zooFixtureRows(id) {
  const definition = datasetDefinition(id);
  if (definition.corpus !== "zoo") {
    throw new Error(`Dataset "${id}" is not part of the ggaction zoo.`);
  }
  const generate = GENERATORS[definition.generator];
  if (generate === undefined) {
    throw new Error(`Unknown zoo generator "${definition.generator}".`);
  }
  if (!cache.has(id)) cache.set(id, deepFreeze(generate()));
  return cache.get(id);
}

export function loadZooDataset(id) {
  return structuredClone(zooFixtureRows(id));
}
