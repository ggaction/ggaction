import { chart } from "../../../src/index.js";
import { summarizeArgs } from "../../../src/core/action.js";
import { releaseTidyTuesdaySourceCache } from "../datasets/tidytuesday.js";

import {
  realisticDatasetIds,
  realisticFieldPairDomain,
  realisticRecordView,
  realisticSourceFields
} from "./realistic-data.js";

const INITIAL_DATASET = "tt-penguins";
const ACTIONS = Object.freeze([
  "createScatterPlot",
  "createBarPlot",
  "createLinePlot",
  "createParallelCoordinates"
]);
const AGGREGATE_OPERATIONS = Object.freeze([
  "ciLower", "ciUpper", "distinct", "max", "median", "min", "missing",
  "q1", "q3", "stderr", "stdev", "stdevP", "valid", "variance", "varianceP"
]);
const AXIS_FORMATS = Object.freeze([
  "auto", ".0f", ".1f", ".2f"
]);
const INTERPOLATIONS = Object.freeze([
  "rgb", "hsl", "hsl-long", "lab", "hcl", "hcl-long", "cubehelix",
  "cubehelix-long"
]);
const COLOR_LAYOUTS = Object.freeze([
  "stack", "fill", "group", "overlay", "diverging", "center"
]);
const CURVES = Object.freeze([
  "linear", "basis", "cardinal", "monotone", "natural", "step",
  "step-after", "step-before"
]);
const DASH_VALUES = Object.freeze(["solid", "dashed", "dotted", "dashdot"]);
const PROFILE_COUNT = 36;
const CANVAS = Object.freeze({
  width: 2_300,
  height: 1_220,
  background: "#ffffff",
  margin: Object.freeze({ top: 250, right: 420, bottom: 150, left: 620 })
});

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
  return String(value)
    .replace(/[^a-z0-9]+/giu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();
}

function extent(rows, field) {
  const values = rows.map(row => row[field]).filter(Number.isFinite);
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high ? [low, low + 1] : [low, high];
}

function numericSamples(rows, field) {
  const [low, high] = extent(rows, field);
  return [low, low + (high - low) / 2, high];
}

function viewFor(factors) {
  const base = realisticRecordView(factors.dataset, {
    measureIndex: factors.fieldPair.measureIndex,
    dimensionIndex: factors.fieldPair.dimensionIndex,
    includeSecondaryMeasure: true,
    includeSecondaryDimension: true,
    deriveSubgroup: true,
    rowLimit: 96,
    groupLimit: 6,
    minimumPerGroup: 3,
    minimumRetainedGroupRows: 3,
    requireRetainedGroupVariation: true
  });
  const valueMinimum = Math.min(...base.rows.map(row => row.value));
  const rows = base.rows.map((row, index) => ({
    ...row,
    category: String(row.category ?? "observed"),
    subgroup: String(row.subgroup ?? row.category ?? "observed"),
    positiveValue: row.value - valueMinimum + 1,
    positiveSecondary: Math.abs(row.value - valueMinimum) * 0.5 + index + 1,
    sourcePosition: index + 1,
    observedYear: 2000 + (index % 20),
    observedYearSecondary: 2024 - (index % 20),
    observedTimestamp: Date.UTC(2000 + (index % 20), index % 12, 1),
    observedTimestampSecondary: Date.UTC(2024 - (index % 20), 11 - (index % 12), 1),
    observedAt: new Date(Date.UTC(2000 + (index % 20), index % 12, 1)).toISOString(),
    observedAtSecondary: new Date(
      Date.UTC(2024 - (index % 20), 11 - (index % 12), 1)
    ).toISOString()
  }));
  return freeze({
    rows,
    sample: base.sample,
    provenance: {
      ...base.provenance,
      transformations: [
        ...base.provenance.transformations,
        {
          op: "source-selection-order-rank",
          as: "sourcePosition",
          minimum: 1,
          maximum: rows.length
        },
        {
          op: "positive-domain-and-secondary-projection",
          sourceField: base.provenance.fieldBindings.measure,
          rankField: "sourcePosition",
          valueOffset: 1 - valueMinimum,
          formulas: {
            positiveValue: "value - minimum(value) + 1",
            positiveSecondary: "abs(value - minimum(value)) * 0.5 + sourcePosition"
          },
          as: ["positiveValue", "positiveSecondary"]
        },
        {
          op: "deterministic-temporal-witness",
          source: "source-selection-order-rank",
          as: ["observedAt", "observedAtSecondary", "observedYear", "observedYearSecondary", "observedTimestamp", "observedTimestampSecondary"],
          calendar: "UTC"
        }
      ]
    }
  });
}

function contextFor(dataset, view, action) {
  const fields = realisticSourceFields(dataset, view.provenance.fieldBindings);
  const byName = new Map(fields.map(field => [field.field, field]));
  const measure = byName.get(view.provenance.fieldBindings.measure);
  const dimension = byName.get(view.provenance.fieldBindings.dimension);
  return freeze({
    fields,
    title: `${measure?.label ?? view.provenance.fieldBindings.measure} by ${
      dimension?.label ?? view.provenance.fieldBindings.dimension
    } — ${action} option ledger`,
    measureText: measure?.label ?? view.provenance.fieldBindings.measure,
    dimensionText: dimension?.label ?? view.provenance.fieldBindings.dimension
  });
}

function guideModes() {
  return freeze([
    { id: "guides-off", kind: "off" },
    { id: "cartesian-x-disabled", kind: "cartesian-disabled", disabled: "x" },
    { id: "cartesian-y-disabled", kind: "cartesian-disabled", disabled: "y" },
    ...AXIS_FORMATS.map((format, index) => ({
      id: `cartesian-format-${slug(format)}`,
      kind: "cartesian-count",
      format,
      index
    })),
    { id: "cartesian-explicit-values", kind: "cartesian-values" },
    { id: "cartesian-count", kind: "cartesian-count" },
    { id: "cartesian-values", kind: "cartesian-values" },
    { id: "cartesian-title-disabled", kind: "cartesian-title-disabled" },
    { id: "cartesian-grid-booleans", kind: "cartesian-grid-booleans" },
    { id: "cartesian-axes", kind: "cartesian-axes" },
    { id: "gradient-legend", kind: "gradient-legend" },
    { id: "line-symbol-legend", kind: "line-legend" },
    { id: "layer-symbol-legend", kind: "layer-legend" }
  ]);
}

const GUIDE_MODES = guideModes();

function variantsFor(action) {
  return freeze(Array.from({ length: PROFILE_COUNT }, (_, index) => ({
    id: `${slug(action)}-orthogonal-${String(index + 1).padStart(2, "0")}`,
    ordinal: index,
    guide: GUIDE_MODES[index % GUIDE_MODES.length]
  })));
}

const VARIANTS = freeze(Object.fromEntries(ACTIONS.map(action => [
  action,
  variantsFor(action)
])));

function quantitativeScale(id, type, { point = false, index = 0 } = {}) {
  const common = {
    id,
    type,
    domain: "auto",
    range: "auto",
    nice: index % 2 === 0,
    clamp: index % 3 === 0,
    reverse: index % 4 === 0
  };
  if (type !== "time") common.zero = type === "log" ? undefined : index % 2 === 1;
  if (type === "log") common.base = 2;
  if (type === "pow") common.exponent = 2;
  if (type === "symlog") common.constant = 1;
  if (point) common.unknown = 0;
  return Object.fromEntries(Object.entries(common).filter(([, value]) => value !== undefined));
}

function categoricalScale(id, type, index, { point = false } = {}) {
  const scale = type === "band"
    ? {
        id, type, domain: "auto", range: "auto",
        reverse: index % 2 === 1,
        paddingInner: 0.16,
        paddingOuter: 0.08,
        align: [0, 0.5, 1][index % 3]
      }
    : {
        id, type, domain: "auto", range: "auto",
        reverse: index % 2 === 1,
        padding: 0.24,
        align: [0, 0.5, 1][index % 3]
      };
  if (point) scale.unknown = 0;
  return scale;
}

function binnedChannel(field, id, index, mode, rows) {
  const [low, high] = extent(rows, field);
  const span = high - low;
  const bin = mode === "max"
    ? { maxBins: 12 }
    : mode === "step"
      ? { step: span / 10 }
      : { boundaries: [low, low + span / 3, low + 2 * span / 3, high] };
  return {
    field,
    fieldType: "quantitative",
    bin,
    scale: quantitativeScale(id, "linear", { index })
  };
}

function aggregateValue(index) {
  switch (index % 3) {
    case 0: return { op: "quantile", probability: 0.25 };
    case 1: return { op: "first", orderBy: "sourcePosition", order: "ascending" };
    default: return { op: "last", orderBy: "sourcePosition", order: "descending" };
  }
}

function aggregateChannel(field, id, index) {
  return {
    field,
    fieldType: "quantitative",
    aggregate: aggregateValue(index),
    scale: quantitativeScale(id, "linear", { index })
  };
}

function paletteEncoding(index, field = "category") {
  const base = {
    field,
    fieldType: index % 2 === 0 ? "nominal" : "ordinal",
    scale: { id: "mainColor", type: "ordinal", domain: "auto", unknown: "#94a3b8" }
  };
  switch (index % 8) {
    case 0: return { ...base, palette: "tableau10" };
    case 1: return { ...base, palette: "set2" };
    case 2: return { ...base, palette: { name: "tableau20", count: 6 } };
    case 3: return { ...base, palette: { name: "viridis", extent: [0.08, 0.92] } };
    case 4: return { ...base, scale: { ...base.scale, palette: "dark2" } };
    case 5: return { ...base, scale: { ...base.scale, palette: "paired" } };
    case 6:
      return { ...base, scale: { ...base.scale, palette: { name: "set3", count: 6 } } };
    default:
      return {
        ...base,
        scale: { ...base.scale, palette: { name: "plasma", extent: [0.12, 0.88] } }
      };
  }
}

function continuousColor(index, aggregate) {
  const interpolate = INTERPOLATIONS[index % INTERPOLATIONS.length];
  return {
    field: "positiveValue",
    fieldType: "quantitative",
    ...(aggregate === undefined ? {} : { aggregate }),
    scale: {
      id: "mainColor",
      type: "sequential",
      domain: "auto",
      palette: index % 2 === 0 ? "viridis" : { name: "magma", extent: [0.1, 0.9] },
      interpolate,
      clamp: index % 2 === 0,
      reverse: index % 3 === 0,
      unknown: "#94a3b8"
    }
  };
}

function discretizedColor(index) {
  const kind = ["quantize", "quantile", "threshold"][index % 3];
  return {
    field: "positiveValue",
    fieldType: "quantitative",
    scale: {
      id: "mainColor",
      type: kind,
      domain: kind === "threshold" ? [10, 30, 60] : "auto",
      palette: {
        name: ["blues", "reds", "greens"][index % 3],
        count: kind === "threshold" ? 4 : 5
      },
      ...(kind === "quantize" ? { clamp: true } : {}),
      reverse: index % 2 === 0,
      unknown: "#94a3b8"
    }
  };
}

function categoricalColor(index) {
  const encoding = paletteEncoding(index);
  return {
    ...encoding,
    fieldType: index % 2 === 0 ? "nominal" : "ordinal",
    layout: COLOR_LAYOUTS[index % COLOR_LAYOUTS.length]
  };
}

function temporalBinding(index, secondary = false) {
  const temporalUnit = ["auto", "year", "timestamp"][index % 3];
  const field = { auto: "observedAt", year: "observedYear", timestamp: "observedTimestamp" }[temporalUnit];
  return { field: field + (secondary ? "Secondary" : ""), fieldType: "temporal", temporalUnit };
}

function scatterPosition(variant, rows) {
  const index = variant.ordinal;
  const type = ["linear", "log", "pow", "sqrt", "symlog", "time", "band", "point"][
    index % 8
  ];
  if (type === "time") {
    return {
      x: { ...temporalBinding(Math.floor(index / 8)), scale: quantitativeScale("mainX", type, { point: true, index }) },
      y: { ...temporalBinding(Math.floor(index / 8), true), scale: quantitativeScale("mainY", type, { point: true, index: index + 1 }) }
    };
  }
  if (["band", "point"].includes(type)) {
    return {
      x: { field: "category", fieldType: index % 2 === 0 ? "nominal" : "ordinal", scale: categoricalScale("mainX", type, index, { point: true }) },
      y: { field: "subgroup", fieldType: index % 2 === 0 ? "ordinal" : "nominal", scale: categoricalScale("mainY", type, index + 1, { point: true }) }
    };
  }
  return {
    x: { field: "positiveValue", fieldType: "quantitative", scale: quantitativeScale("mainX", type, { point: true, index }) },
    y: { field: "positiveSecondary", fieldType: "quantitative", scale: quantitativeScale("mainY", type, { point: true, index: index + 1 }) }
  };
}

function scatterColor(index) {
  if (index < 8) return paletteEncoding(index);
  if (index < 16) return continuousColor(index - 8);
  if (index < 19) return discretizedColor(index - 16);
  if (index < 25) return paletteEncoding(index - 19);
  if (index >= 25 && index <= 27) {
    return {
      ...temporalBinding(index - 25),
      scale: {
        ...(index === 26 ? { range: "auto" } : { palette: "viridis" }),
        id: "mainColor", type: "sequential", domain: "auto",
        interpolate: "rgb", clamp: true, reverse: false,
        unknown: "#94a3b8"
      }
    };
  }
  if (index === 26) {
    return {
      field: "positiveValue", fieldType: "quantitative",
      scale: {
        id: "mainColor", type: "sequential", domain: "auto", range: "auto",
        interpolate: "rgb", clamp: false, reverse: false, unknown: "#94a3b8"
      }
    };
  }
  return paletteEncoding(index);
}

function barPosition(variant, rows) {
  const index = variant.ordinal;
  const orientation = index % 2 === 0 ? "vertical" : "horizontal";
  const category = {
    field: "category",
    fieldType: index % 4 < 2 ? "nominal" : "ordinal",
    scale: categoricalScale(orientation === "vertical" ? "mainX" : "mainY", "band", index)
  };
  let measure;
  if (index < 8) {
    const type = ["linear", "pow", "sqrt", "symlog"][Math.floor(index / 2)];
    measure = {
      field: "positiveValue", fieldType: "quantitative", aggregate: "mean",
      scale: quantitativeScale(orientation === "vertical" ? "mainY" : "mainX", type, { index })
    };
  } else if (index < 12) {
    const stack = index < 10 ? "zero" : "normalize";
    measure = {
      field: "positiveValue", fieldType: "quantitative", aggregate: "mean", stack,
      scale: quantitativeScale(orientation === "vertical" ? "mainY" : "mainX", "linear", { index })
    };
  } else if (index < 18) {
    measure = aggregateChannel(
      "positiveValue", orientation === "vertical" ? "mainY" : "mainX", index
    );
  } else if (index < 21) {
    const x = binnedChannel(
      "positiveValue", "mainX", index,
      ["max", "step", "boundaries"][index - 18], rows
    );
    const y = {
      field: "positiveValue", fieldType: "quantitative", aggregate: "count",
      scale: quantitativeScale("mainY", "linear", { index })
    };
    return { x, y };
  } else if (index >= 24 && index <= 29) {
    const temporal = {
      ...temporalBinding(Math.floor((index - 24) / 2)),
      scale: quantitativeScale(orientation === "vertical" ? "mainX" : "mainY", "time", { index })
    };
    const aggregate = {
      field: "positiveValue", fieldType: "quantitative", aggregate: "mean",
      scale: quantitativeScale(orientation === "vertical" ? "mainY" : "mainX", "linear", { index })
    };
    return orientation === "vertical" ? { x: temporal, y: aggregate } : { x: aggregate, y: temporal };
  } else {
    measure = {
      field: "positiveValue", fieldType: "quantitative",
      aggregate: index % 4 < 2 ? "sum" : "mean",
      scale: quantitativeScale(orientation === "vertical" ? "mainY" : "mainX", "linear", { index })
    };
  }
  return orientation === "vertical" ? { x: category, y: measure } : { x: measure, y: category };
}

function barColor(index) {
  let encoding;
  if (index < 15) encoding = continuousColor(index, AGGREGATE_OPERATIONS[index]);
  else if (index < 18) encoding = continuousColor(index, aggregateValue(index));
  else if (index < 24) {
    encoding = {
      ...paletteEncoding(index - 18),
      layout: COLOR_LAYOUTS[(index - 18) % 5]
    };
  }
  else if (index < 32) encoding = paletteEncoding(index - 24);
  else if (index < 35) {
    encoding = { ...discretizedColor(index - 32), aggregate: "mean" };
    if (index === 32) {
      encoding = {
        ...encoding,
        scale: {
          id: "mainColor", type: "quantize", domain: "auto", range: "auto",
          clamp: true, reverse: false
        }
      };
    }
  } else return undefined;
  const { unknown: _unknown, ...scale } = encoding.scale;
  return { ...encoding, scale };
}

function linePosition(variant, rows) {
  const index = variant.ordinal;
  if (index >= 30 && index <= 32) return {
    x: { field: "sourcePosition", fieldType: "quantitative", scale: quantitativeScale("mainX", "linear", { index }) },
    y: { ...temporalBinding(index - 30), scale: quantitativeScale("mainY", "time", { index }) }
  };
  if (index < 6) {
    const type = ["linear", "log", "pow", "sqrt", "symlog", "time"][index];
    return type === "time"
      ? {
          x: { ...temporalBinding(index), scale: quantitativeScale("mainX", type, { index }) },
          y: {
            field: "positiveValue", fieldType: "quantitative", aggregate: "mean",
            scale: quantitativeScale("mainY", "linear", { index: index + 1 })
          }
        }
      : {
          x: { field: "sourcePosition", fieldType: "quantitative", scale: quantitativeScale("mainX", type, { index }) },
          y: { field: "positiveValue", fieldType: "quantitative", scale: quantitativeScale("mainY", type, { index: index + 1 }) }
        };
  }
  if (index < 9) {
    const mode = ["max", "step", "boundaries"][index - 6];
    return {
      x: binnedChannel("sourcePosition", "mainX", index, mode, rows),
      y: {
        field: "positiveValue", fieldType: "quantitative", aggregate: "mean",
        scale: quantitativeScale("mainY", "linear", { index: index + 1 })
      }
    };
  }
  if (index < 15) {
    return {
      x: {
        ...temporalBinding(index),
        scale: quantitativeScale("mainX", "time", { index })
      },
      y: aggregateChannel("positiveValue", "mainY", index)
    };
  }
  if (index === 15) {
    return {
      x: { field: "sourcePosition", fieldType: "quantitative", scale: quantitativeScale("mainX", "linear", { index }) },
      y: { field: "observedAt", fieldType: "temporal", scale: quantitativeScale("mainY", "time", { index }) }
    };
  }
  if (index === 16 || index === 17) {
    return {
      x: { field: "observedAt", fieldType: "temporal", scale: quantitativeScale("mainX", "time", { index }) },
      y: {
        field: "positiveValue", fieldType: "quantitative",
        aggregate: index === 16 ? "mean" : "median",
        scale: quantitativeScale("mainY", "linear", { index })
      }
    };
  }
  return {
    x: { field: "sourcePosition", fieldType: "quantitative", scale: quantitativeScale("mainX", "linear", { index }) },
    y: { field: "positiveValue", fieldType: "quantitative", scale: quantitativeScale("mainY", "linear", { index: index + 1 }) }
  };
}

function categoricalFacadeColor(index) {
  if (index === 35) return undefined;
  if (index === 30) {
    return {
      field: "category",
      fieldType: "ordinal",
      scale: { id: "mainColor", type: "ordinal", domain: "auto", range: "auto" }
    };
  }
  const encoding = paletteEncoding(index);
  const { unknown: _unknown, ...scale } = encoding.scale;
  return { ...encoding, scale };
}

function strokeDash(index) {
  if (index % 5 === 4) {
    return {
      field: "category",
      fieldType: "nominal",
      scale: {
        id: "mainDash", type: "ordinal", domain: "auto", range: "auto"
      }
    };
  }
  return { value: DASH_VALUES[index % DASH_VALUES.length] };
}

function programForGuide(view) {
  return chart().createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows })
    .createCoordinate({ id: "main", type: "cartesian" });
}

function lineStyle() {
  return { color: "#475569", lineWidth: 1.2 };
}

function tickStyle() {
  return { color: "#64748b", lineWidth: 1, length: 7 };
}

function labelStyle(format) {
  return {
    offset: 11,
    format,
    color: "#334155",
    fontSize: 11,
    fontFamily: "sans-serif",
    fontWeight: 500
  };
}

function titleStyle(text, at) {
  return {
    text,
    ...(at === undefined ? {} : { at }),
    offset: text.includes("secondary") ? 170 : 82,
    rotation: text.includes("secondary") ? -Math.PI / 2 : 0,
    color: "#0f172a",
    fontSize: 13,
    fontFamily: "sans-serif",
    fontWeight: 700
  };
}

function cartesianAxis(channel, format, policy, index) {
  const values = policy === "values" ? undefined : undefined;
  return {
    scale: channel === "x" ? "guideX" : "guideY",
    coordinate: "main",
    position: channel === "x"
      ? (index % 2 === 0 ? "bottom" : "top")
      : (index % 2 === 0 ? "left" : "right"),
    line: lineStyle(),
    ticksAndLabels: {
      ...(policy === "count" ? { count: 4 } : { values }),
      ticks: tickStyle(),
      labels: labelStyle(format)
    },
    title: titleStyle(
      channel === "x" ? "Positive source value" : "Positive secondary value",
      ["start", "center", "end"][index % 3]
    )
  };
}

function categoricalLegend(index, symbol, target = "guideColorPoints") {
  const position = ["right", "left", "top", "bottom"][index % 4];
  const side = position === "right" || position === "left";
  return {
    target,
    channels: ["color"],
    position,
    align: side ? "center" : ["left", "center", "right"][index % 3],
    direction: side ? "vertical" : (index % 2 === 0 ? "horizontal" : "vertical"),
    ...(position === "left" ? {} : { columns: 3 }),
    offset: 32,
    titlePosition: index % 2 === 0 ? "top" : "left",
    title: "Authentic source category",
    symbol,
    labels: {
      offset: 8, color: "#334155", fontSize: 11,
      fontFamily: "sans-serif", fontWeight: 500
    },
    titleStyle: {
      color: "#0f172a", fontSize: 12,
      fontFamily: "sans-serif", fontWeight: 700
    },
    itemGap: 22,
    border: index % 3 === 0
      ? true
      : index % 3 === 1
        ? false
        : { color: "#cbd5e1", lineWidth: 1, padding: 9, background: "#ffffff" }
  };
}

function categoricalLegendSymbol(index) {
  return index % 3 === 0
    ? "auto"
    : index % 3 === 1
      ? { width: 18, height: 12, stroke: "#ffffff", strokeWidth: 0.8 }
      : { layers: [
          { type: "line", length: 24, lineWidth: 2 },
          {
            type: "point", shape: "circle", size: 5,
            fill: "#2563eb", stroke: "#ffffff", strokeWidth: 0.7
          },
          {
            type: "swatch", width: 16, height: 11,
            stroke: "#ffffff", strokeWidth: 0.7
          }
        ] };
}

function guideOptions(variant, program, options, action) {
  const guide = variant.guide;
  if (guide.kind === "off") return false;
  const layer = program.semanticSpec.layers.find(layer => layer.id === options.id);
  const parallel = action === "createParallelCoordinates";
  const explicitValues = guide.kind.includes("values");
  const disabled = guide.kind === "cartesian-disabled" ? guide.disabled : undefined;
  const index = variant.ordinal;
  const axes = { coordinate: { id: layer.coordinate, type: index % 2 ? "auto" : parallel ? "parallel" : "cartesian" } };
  const grid = {};
  if (!parallel) {
    for (const [channel, direction] of [["x", "vertical"], ["y", "horizontal"]]) {
      const scaleId = layer.encoding[channel].scale;
      const scale = program.resolvedScales[scaleId];
      const categorical = ["band", "point"].includes(scale.type);
      const values = [...new Set([scale.domain[0], scale.domain.at(-1)])];
      const ticks = explicitValues || categorical || !["linear", "time"].includes(scale.type) ? { values } : { count: 4 };
      const format = categorical || scale.type === "time" ? "auto" : guide.format ?? AXIS_FORMATS[index % 4];
      axes[channel] = disabled === channel ? false : {
        ...cartesianAxis(channel, format, "count", index + (channel === "y" ? 1 : 0)),
        coordinate: layer.coordinate, scale: scaleId,
        ticksAndLabels: { ...ticks, ticks: tickStyle(), labels: labelStyle(format) }
      };
      grid[direction] = categorical || disabled === channel ? false : guide.kind.includes("booleans") ? true : {
        scale: scaleId, coordinate: layer.coordinate, ...ticks,
        color: channel === "x" ? "#dbeafe" : "#e2e8f0", lineWidth: 0.8, strokeDash: [2, 3]
      };
    }
  }
  const color = layer.encoding.color;
  let legend = false;
  if (color !== undefined && ["nominal", "ordinal"].includes(color.fieldType)) {
    const symbol = layer.mark.type === "line" && index % 3 === 1
      ? { length: 28, lineWidth: 2.4 } : categoricalLegendSymbol(index);
    legend = categoricalLegend(index, symbol, options.id);
    if (legend.position === "left") legend.offset = 260;
    // A line sample remains a useful legend recipe for an explicitly grouped path.
    if (guide.kind === "line-legend" && layer.mark.type === "line") legend.symbol = { length: 28, lineWidth: 2.4 };
  }
  if (color !== undefined && program.resolvedScales[color.scale].type === "sequential") {
    legend = { target: options.id, channels: ["color"], position: "right", title: color.field,
      count: 4, gradient: { length: 150, thickness: 14 },
      labels: { offset: 8, color: "#334155", fontSize: 11, fontFamily: "sans-serif", fontWeight: 500 },
      titleStyle: { color: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 700 },
      border: { color: "#cbd5e1", lineWidth: 1, padding: 9, background: "#ffffff" } };
  }
  if (!parallel && axes.y && ["left", "right"].includes(legend.position)) {
    axes.y.position = legend.position === "right" ? "left" : "right";
  }
  const legendOnly = guide.kind.endsWith("legend");
  return { axes: legendOnly ? false : axes,
    grid: legendOnly || parallel || Object.values(grid).every(value => value === false) ? false : grid, legend };
}

function buildFacade(factors, action, optionsFactory) {
  const view = viewFor(factors);
  const options = optionsFactory(factors, view);
  const base = programForGuide(view);
  const positioned = base[action]({ ...options, guides: false });
  const program = base[action]({ ...options,
    guides: guideOptions(factors.variant, positioned, options, action) });
  return finish(program, contextFor(factors.dataset, view, action), action, factors.variant);
}

function finish(program, context, action, variant) {
  const question = `Which ${action} option branches remain visible for authentic ${
    context.measureText
  } records under orthogonal profile ${variant.ordinal + 1}?`;
  return program.createTitle({
    text: context.title,
    subtitle: question,
    align: "left",
    maxWidth: CANVAS.width - CANVAS.margin.left - CANVAS.margin.right,
    wrap: "word",
    lineHeight: 26
  });
}

function scatterOptions(factors, view) {
  const position = scatterPosition(factors.variant, view.rows);
  const index = factors.variant.ordinal;
  return {
    id: "mainScatter",
    data: "analysisRows",
    coordinate: "main",
    ...position,
    ...(index === 35 ? {} : { color: scatterColor(index) }),
    ...(index % 4 >= 2 || index === 35 ? {} : { size: {
      field: "positiveSecondary", fieldType: "quantitative",
      scale: { id: "mainSize", type: "linear", domain: "auto", range: "auto", unknown: 4 }
    } }),
    shape: {
      field: "subgroup", fieldType: "nominal",
      scale: {
        id: "mainShape", type: "ordinal", domain: "auto", range: "auto",
        unknown: index % 2 === 0 ? "circle" : "square"
      }
    },
    point: {
      shape: index % 2 === 0 ? "circle" : "square",
      ...(index === 35 ? { fill: "#2563eb", radius: 4 } : {}),
      opacity: 0.6 + index / 100,
      ...(index === 0 ? { stroke: false } : { stroke: "#ffffff", strokeWidth: 0.8 })
    },
  };
}

function buildScatter(factors) {
  return buildFacade(factors, "createScatterPlot", scatterOptions);
}

function barOptions(factors, view) {
  const index = factors.variant.ordinal;
  const color = barColor(index);
  return {
    id: "mainBars",
    data: "analysisRows",
    coordinate: "main",
    ...barPosition(factors.variant, view.rows),
    ...(color === undefined ? {} : { color }),
    ...(index >= 18 && index <= 20 || index >= 24 && index <= 29
      ? {}
      : { width: index % 2 === 0 ? { band: 0.72 } : { pixels: 18 } }),
    bar: {
      ...(index === 35 ? { fill: "#2563eb" } : {}),
      opacity: 0.55 + index / 100,
      ...(index === 0 ? { stroke: false } : { stroke: "#ffffff", strokeWidth: 0.7 })
    },
  };
}

function buildBar(factors) {
  return buildFacade(factors, "createBarPlot", barOptions);
}

function lineOptions(factors, view) {
  const index = factors.variant.ordinal;
  const aggregateLine = index === 5 || (index >= 6 && index <= 14) ||
    index === 16 || index === 17;
  const color = categoricalFacadeColor(index);
  return {
    id: "mainLines",
    data: "analysisRows",
    coordinate: "main",
    ...linePosition(factors.variant, view.rows),
    ...(aggregateLine || color === undefined
      ? {}
      : { color }),
    ...(aggregateLine ? {} : { groupBy: index === 33 ? ["category", "subgroup"] : "category" }),
    strokeDash: aggregateLine ? { value: DASH_VALUES[index % DASH_VALUES.length] } : strokeDash(index),
    line: {
      strokeWidth: 1.8,
      curve: CURVES[index % CURVES.length],
      ...(index === 35 ? { stroke: "#2563eb" } : {}),
      opacity: 0.5 + index / 100,
      closed: false
    },
  };
}

function buildLine(factors) {
  return buildFacade(factors, "createLinePlot", lineOptions);
}

function parallelDimensions(index) {
  const types = ["linear", "log", "pow", "sqrt", "symlog"];
  const type = types[index % types.length];
  return [
    {
      field: "positiveValue", title: "Positive value", fieldType: "quantitative",
      scale: quantitativeScale(undefined, type, { index })
    },
    {
      field: "positiveSecondary", title: "Positive secondary", fieldType: "quantitative",
      scale: quantitativeScale(undefined, types[(index + 1) % types.length], { index: index + 1 })
    },
    {
      field: "category", title: "Source category", fieldType: "ordinal",
      scale: categoricalScale(undefined, index % 2 === 0 ? "band" : "point", index)
    }
  ].map(dimension => ({
    ...dimension,
    scale: Object.fromEntries(Object.entries(dimension.scale).filter(([key]) => key !== "id"))
  }));
}

function parallelOptions(factors, view) {
  const index = factors.variant.ordinal;
  const color = categoricalFacadeColor(index);
  return {
    id: "mainParallel",
    data: "analysisRows",
    coordinate: "mainParallelCoordinate",
    dimensions: parallelDimensions(index),
    key: "key",
    missing: ["break", "drop-row", "error"][index % 3],
    ...(color === undefined
      ? {}
      : { color }),
    strokeDash: strokeDash(index),
    line: {
      strokeWidth: 1.35,
      ...(index === 35 ? { stroke: "#2563eb" } : {}),
      opacity: 0.48,
      curve: "linear",
      closed: false
    },
  };
}

function buildParallel(factors) {
  return buildFacade(factors, "createParallelCoordinates", parallelOptions);
}

function expectedFacadeArgs(action, factors, view, program) {
  const options = action === "createScatterPlot"
    ? scatterOptions(factors, view)
    : action === "createBarPlot"
      ? barOptions(factors, view)
      : action === "createLinePlot"
        ? lineOptions(factors, view)
        : parallelOptions(factors, view);
  return summarizeArgs({ ...options, guides: guideOptions(factors.variant, program, options, action) });
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

function fieldPairs(dataset) {
  return freeze([...realisticFieldPairDomain(dataset, "distribution")]);
}

function factorContract(dataset, variants) {
  const fieldPair = fieldPairs(dataset);
  return fieldPair.length === 0 ? undefined : freeze({ fieldPair, variant: variants });
}

function directEntries(program, action) {
  return (program.trace.children ?? []).filter(entry => entry.op === action);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function makeRecipe({ id, action, complexity, build }) {
  const datasets = freeze(realisticDatasetIds());
  const variants = VARIANTS[action];
  let cachedDefaultFactors;
  const defaultFactors = () => {
    if (cachedDefaultFactors === undefined) {
      cachedDefaultFactors = factorContract(INITIAL_DATASET, variants);
      if (cachedDefaultFactors === undefined) {
        throw new Error(`${INITIAL_DATASET} must remain eligible for ${id}.`);
      }
    }
    return cachedDefaultFactors;
  };
  const schedule = coverageSchedule(variants);
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
      return factorContract(dataset, variants);
    },
    build,
    observe() {
      return freeze([]);
    },
    observeFactors(program, values) {
      const view = viewFor(values);
      const direct = directEntries(program, action).at(-1);
      const createData = directEntries(program, "createData").find(entry =>
        entry.args.id === "analysisRows"
      );
      const data = program.semanticSpec.datasets.find(candidate => candidate.id === "analysisRows");
      const title = contextFor(values.dataset, view, action).title;
      const question = `Which ${action} option branches remain visible for authentic ${
        contextFor(values.dataset, view, action).measureText
      } records under orthogonal profile ${values.variant.ordinal + 1}?`;
      const fieldPairObserved = createData?.args.valuesCount === view.rows.length &&
        data !== undefined && sameValue(data.values, view.rows) &&
        program.semanticSpec.title?.text === title;
      const variantObserved = direct !== undefined &&
        sameValue(direct.args, expectedFacadeArgs(action, values, view, program)) &&
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
          evidence: `direct:${action}.maximal-option-profile;final:resolved-chart+visible-question`
        }] : [])
      ]);
    },
    describe(values) {
      const view = viewFor(values);
      const context = contextFor(values.dataset, view, action);
      return freeze({
        corpus: "tidytuesday",
        chartFamily: `cartesian-facade-${slug(action)}`,
        complexity,
        sourceDatasetIds: [values.dataset],
        title: context.title,
        analysisQuestion: `Which ${action} option branches remain visible for authentic ${
          context.measureText
        } records under orthogonal profile ${values.variant.ordinal + 1}?`,
        sourceFields: context.fields,
        sample: view.sample,
        provenance: view.provenance,
        dataOperations: view.provenance.transformations.map(transformation => transformation.op),
        activeFeatures: []
      });
    }
  });
}

const SCATTER_RECIPE = makeRecipe({
  id: "realistic-cartesian-facade-coverage-scatter",
  action: "createScatterPlot",
  complexity: "advanced",
  build: buildScatter
});
const BAR_RECIPE = makeRecipe({
  id: "realistic-cartesian-facade-coverage-bar",
  action: "createBarPlot",
  complexity: "advanced",
  build: buildBar
});
const LINE_RECIPE = makeRecipe({
  id: "realistic-cartesian-facade-coverage-line",
  action: "createLinePlot",
  complexity: "advanced",
  build: buildLine
});
const PARALLEL_RECIPE = makeRecipe({
  id: "realistic-cartesian-facade-coverage-parallel",
  action: "createParallelCoordinates",
  complexity: "advanced",
  build: buildParallel
});

releaseTidyTuesdaySourceCache(INITIAL_DATASET);

export const REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES = freeze([
  SCATTER_RECIPE,
  BAR_RECIPE,
  LINE_RECIPE,
  PARALLEL_RECIPE
]);
export const REALISTIC_CARTESIAN_FACADE_COVERAGE_EXPECTED_ACTIONS = ACTIONS;
export const REALISTIC_CARTESIAN_FACADE_COVERAGE_AGGREGATES = AGGREGATE_OPERATIONS;
export const REALISTIC_CARTESIAN_FACADE_COVERAGE_COUNTS = freeze({
  recipes: REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.length,
  advanced: REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.length,
  variantsPerRecipe: PROFILE_COUNT,
  minimumSelectionsPerRecipe: PROFILE_COUNT * 5,
  minimumSelections: REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.reduce(
    (sum, recipe) => sum + recipe.minimumSelections,
    0
  )
});

export function realisticCartesianFacadeCoverageWitnessFactors(recipe, dataset) {
  if (!REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.includes(recipe)) {
    throw new Error(`Unknown cartesian-facade coverage recipe "${recipe?.id}".`);
  }
  const domains = recipe.factorsForDataset(dataset);
  if (domains === undefined) return freeze([]);
  return freeze(domains.variant.map((variant, index) => ({
    dataset,
    fieldPair: domains.fieldPair[index % domains.fieldPair.length],
    variant
  })));
}

export function realisticCartesianFacadeCoverageFactors(
  recipe,
  datasets = recipe.datasets
) {
  if (!REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.includes(recipe)) {
    throw new Error(`Unknown cartesian-facade coverage recipe "${recipe?.id}".`);
  }
  const variants = new Map(recipe.factors.variant.map(variant => [variant.id, variant]));
  const variantIndexes = new Map(
    recipe.factors.variant.map((variant, index) => [variant.id, index])
  );
  const domainsByDataset = new Map();
  for (const dataset of datasets) {
    try {
      domainsByDataset.set(dataset, recipe.factorsForDataset(dataset));
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  const occurrences = new Map();
  return freeze(recipe.coverageSchedule.selectionVariantIds.map(variantId => {
    const variant = variants.get(variantId);
    if (variant === undefined) throw new Error(`${recipe.id} has no variant "${variantId}".`);
    const occurrence = occurrences.get(variantId) ?? 0;
    occurrences.set(variantId, occurrence + 1);
    const start = (variantIndexes.get(variantId) + occurrence) % datasets.length;
    for (let offset = 0; offset < datasets.length; offset += 1) {
      const dataset = datasets[(start + offset) % datasets.length];
      const domains = domainsByDataset.get(dataset);
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
