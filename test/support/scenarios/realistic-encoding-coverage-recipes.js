import { directProgramTrace } from "../program-traces.js";
import assert from "node:assert/strict";
import { realisticColorControls, realisticPaletteRange } from "./realistic-color-controls.js";
import { chart, hconcat, vconcat } from "../../../src/index.js";

import {
  realisticRecordView,
  realisticSourceFields
} from "./realistic-data.js";

const DATASETS = Object.freeze([
  "tt-penguins",
  "tt-london-marathon-winners",
  "tt-astronauts",
  "tt-us-births",
  "tt-chocolate-ratings"
]);
const PROFILE = Object.freeze({ id: "complete-direct-encoding-contract" });
const PROFILES = Object.freeze([PROFILE]);
const REPETITIONS = 5;
const QUANTITATIVE_TYPES = Object.freeze(["linear", "log", "pow", "sqrt", "symlog"]);
const INTERPOLATIONS = Object.freeze([
  "rgb", "hsl", "hsl-long", "lab", "hcl", "hcl-long", "cubehelix", "cubehelix-long"
]);
const POSITION_ACTIONS = Object.freeze([
  "encodeX", "encodeY", "encodeX2", "encodeY2",
  "encodeXRange", "encodeYRange", "encodeXOffset", "encodeYOffset"
]);
const APPEARANCE_ACTIONS = Object.freeze([
  "encodeColor", "encodeStroke", "encodeOpacity", "encodeSize", "encodeShape",
  "encodeStrokeWidth", "encodeStrokeDash", "encodeAngle", "encodeText",
  "encodeDx", "encodeDy", "encodeRadius", "encodePointRadius"
]);
const POLAR_ACTIONS = Object.freeze(["encodeTheta", "encodeR"]);

function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function canvas() {
  return {
    width: 1_600,
    height: 1_000,
    background: "#ffffff",
    margin: { top: 140, right: 140, bottom: 140, left: 140 }
  };
}

function slug(value) {
  return String(value)
    .replace(/[^a-z0-9]+/giu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();
}

function encodingView(dataset, extraOperations = []) {
  const source = realisticRecordView(dataset, {
    includeSecondaryMeasure: true,
    includeSecondaryDimension: true,
    deriveSubgroup: true,
    rowLimit: 96,
    groupLimit: 8
  });
  if (source.rows.some(row =>
    !Number.isFinite(row.value) ||
    !Number.isFinite(row.orderNumeric) ||
    !Number.isFinite(Date.parse(row.time))
  )) {
    throw new Error(`Dataset "${dataset}" lacks complete encoding witness rows.`);
  }
  const sourceX = source.rows.map(row =>
    Number.isFinite(row.secondary) ? row.secondary : row.orderNumeric
  );
  const minimumY = Math.min(...source.rows.map(row => row.value));
  const maximumY = Math.max(...source.rows.map(row => row.value));
  const midpointY = minimumY + (maximumY - minimumY) / 2;
  const spanY = maximumY - minimumY || 1;
  const categories = [...new Set(source.rows.map(row => String(row.category)))];
  const groups = [...new Set(source.rows.map(row => String(row.subgroup)))];
  if (categories.length < 2 || groups.length < 2) {
    throw new Error(`Dataset "${dataset}" needs two categories and groups for encoding coverage.`);
  }
  const rows = source.rows.map((row, index) => {
    const x = Math.abs(sourceX[index]) + 1;
    const y = Math.abs(row.value) + 1;
    const xSpan = Math.max(0.5, x * 0.04);
    const ySpan = Math.max(0.5, y * 0.04);
    return {
      id: row.key,
      sourceRowIndex: row.sourceRowIndex,
      x,
      y,
      signed: row.value - midpointY,
      lowerX: Math.max(Number.MIN_VALUE, x - xSpan),
      upperX: x + xSpan,
      lowerY: Math.max(Number.MIN_VALUE, y - ySpan),
      upperY: y + ySpan,
      category: String(row.category),
      group: String(row.subgroup),
      categoryEnd: categories[(categories.indexOf(String(row.category)) + 1) % categories.length],
      groupEnd: groups[(groups.indexOf(String(row.subgroup)) + 1) % groups.length],
      time: row.time,
      timeYear: new Date(row.time).getUTCFullYear(),
      timeTimestamp: new Date(row.time).getTime(),
      timeYearEnd: new Date(source.rows[(index + 1) % source.rows.length].time).getUTCFullYear(),
      timeTimestampEnd: new Date(source.rows[(index + 1) % source.rows.length].time).getTime(),
      timeEnd: source.rows[(index + 1) % source.rows.length].time,
      order: index + 1,
      angle: index * 360 / source.rows.length,
      radius: y,
      opacity: 0.15 + 0.8 * ((row.value - minimumY) / spanY),
      size: Math.max(1, Math.sqrt(x)),
      seriesWidth: groups.indexOf(String(row.subgroup)) + 1,
      label: String(row.label ?? row.category)
    };
  });
  return freeze({
    rows,
    sample: source.sample,
    provenance: {
      ...source.provenance,
      transformations: [
        ...source.provenance.transformations,
        {
          op: "direct-encoding-field-projection",
          purpose: "derive positive, ranged, normalized, and paired authentic-row witnesses",
          sourceRowCount: rows.length
        },
        ...extraOperations
      ]
    }
  });
}

function programFor(view, compact = false) {
  return chart()
    .createCanvas(compact ? { ...canvas(), width: 600, height: 400,
      margin: { top: 60, right: 60, bottom: 60, left: 60 } } : canvas())
    .createData({ id: "analysisRows", values: view.rows });
}

function finish(program, factors, family) {
  return program.createTitle({
    text: `${family}: ${factors.dataset} authentic observations`,
    subtitle: "Every option is executed directly against pinned TidyTuesday source rows.",
    align: "left",
    maxWidth: 1_250,
    wrap: "word",
    lineHeight: 28
  });
}

function quantitativeScale(type, id, ordinal, { point = true } = {}) {
  const reverse = ordinal % 2 === 1;
  const scale = {
    id,
    type,
    domain: "auto",
    range: "auto",
    nice: type === "linear" ? { count: 5 + ordinal % 3 } : type === "log" ? false : ordinal % 2 === 0,
    clamp: ordinal % 3 === 0,
    reverse,
    ...(point ? { unknown: 0 } : {}),
    ...(type === "log" ? { base: 2 } : { zero: ordinal % 2 === 0 }),
    ...(type === "pow" ? { exponent: 2 } : {}),
    ...(type === "symlog" ? { constant: 1 } : {})
  };
  return scale;
}

function bandScale(id, type, reverse = false, { unknown = true } = {}) {
  if (type === "point") {
    return {
      id, type, domain: "auto", range: "auto", reverse,
      padding: 0.22, align: 0.4, ...(unknown ? { unknown: 0 } : {})
    };
  }
  return {
    id, type, domain: "auto", range: "auto", reverse,
    paddingInner: 0.16, paddingOuter: 0.08, align: 0.4,
    ...(unknown ? { unknown: 0 } : {})
  };
}

function timeScale(id, reverse = false, { unknown = true } = {}) {
  return {
    id, type: "time", domain: "auto", range: "auto",
    nice: !reverse, clamp: reverse, reverse,
    ...(unknown ? { unknown: 0 } : {})
  };
}

function encodingPanelGrid(id, programs) {
  const rows = [];
  for (let start = 0; start < programs.length; start += 4) {
    rows.push({ id: `row-${start / 4}`, program: hconcat({
      programs: programs.slice(start, start + 4), gap: 24
    }) });
  }
  return vconcat({ id, programs: rows, gap: 24 });
}

function positionPanelCollection(base) {
  const programs = new Map();
  let active;
  function save(program) {
    if (active !== undefined) programs.set(active, program);
  }
  return {
    start(program, id) {
      save(program);
      active = id;
      return programs.get(id) ?? base;
    },
    finish(program, { id = "positionPanels", extra = [] } = {}) {
      save(program);
      return encodingPanelGrid(id, [...[...programs].map(([id, value]) =>
        ({ id, program: value })), ...extra]);
    }
  };
}

function pointPair(program, id, x, y, panels) {
  const coordinate = x.coordinate ?? y.coordinate ?? `${id}-coordinate`;
  const xArgs = { target: id, coordinate, ...x };
  const yArgs = { target: id, coordinate, ...y };
  let next = panels.start(program, id).createPointMark({ id, data: "analysisRows" })
    .encodeX(xArgs).encodeY(yArgs);
  next = conditionalWitness(next, "encodeX", xArgs);
  return conditionalWitness(next, "encodeY", yArgs);
}

function aggregateVariants() {
  return [
    { aggregate: { op: "ciLower", method: "normal", level: 0.9 }, stack: null },
    { aggregate: { op: "ciUpper", method: "student-t", level: 0.95 }, stack: null },
    { aggregate: { op: "first", orderBy: "order", order: "ascending" }, stack: "zero" },
    { aggregate: { op: "last", orderBy: "order", order: "descending" }, stack: "normalize" },
    { aggregate: { op: "quantile", probability: 0.5 }, stack: null },
    { aggregate: "mean", stack: "zero" },
    { aggregate: "sum", stack: null }
  ];
}

function addHorizontalAggregateBars(program, panels) {
  let next = program;
  for (const [index, variant] of aggregateVariants().entries()) {
    const id = `x-aggregate-${index}`;
    next = conditionalWitness(conditionalWitness(panels.start(next, id).createBarMark({ id, data: "analysisRows" }), "encodeY", {
        target: id, coordinate: `${id}-coordinate`,
        field: "category", fieldType: index === 1 ? "ordinal" : "nominal",
        scale: bandScale(
          `${id}-y`, "band", index % 2 === 1,
          { unknown: false }
        )
      }), "encodeX", {
        target: id, coordinate: `${id}-coordinate`, field: "x",
        fieldType: "quantitative", aggregate: variant.aggregate, stack: variant.stack,
        scale: quantitativeScale("linear", `${id}-x`, index, { point: false })
      })
      .encodeColor({
        target: id, field: "group",
        layout: variant.stack === "normalize" ? "fill" : variant.stack === "zero" ? "stack" : "overlay"
      })
      .encodeBarWidth({ target: id, band: 0.72 });
  }
  return next;
}

function addVerticalAggregateBars(program, panels) {
  let next = program;
  for (const [index, variant] of aggregateVariants().entries()) {
    const id = `y-aggregate-${index}`;
    next = conditionalWitness(conditionalWitness(panels.start(next, id).createBarMark({ id, data: "analysisRows" }), "encodeX", {
        target: id, coordinate: `${id}-coordinate`,
        field: "category", fieldType: index === 1 ? "ordinal" : "nominal",
        scale: bandScale(
          `${id}-x`, "band", index % 2 === 1,
          { unknown: false }
        )
      }), "encodeY", {
        target: id, coordinate: `${id}-coordinate`, field: "y",
        fieldType: "quantitative", aggregate: variant.aggregate, stack: variant.stack,
        scale: quantitativeScale("linear", `${id}-y`, index + 1, { point: false })
      })
      .encodeColor({
        target: id, field: "group",
        layout: variant.stack === "normalize" ? "fill" : variant.stack === "zero" ? "stack" : "overlay"
      })
      .encodeBarWidth({ target: id, band: 0.72 });
  }
  return next;
}

function addBinnedX(program, panels) {
  const values = program.semanticSpec.datasets
    .find(dataset => dataset.id === "analysisRows")
    .values
    .map(row => row.x);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum || 1;
  const bins = [
    { maxBins: 12 },
    { step: span / 12 },
    { boundaries: [minimum, minimum + span / 2, maximum] }
  ];
  let next = program;
  for (const [index, bin] of bins.entries()) {
    const id = `x-bin-${index}`;
    const x = {
      target: id, coordinate: `${id}-coordinate`, field: "x",
      fieldType: "quantitative", bin,
      scale: quantitativeScale("linear", `${id}-x`, index, { point: false })
    };
    next = conditionalWitness(conditionalWitness(panels.start(next, id).createBarMark({ id, data: "analysisRows" }), "encodeX", x), "encodeY", {
      target: id, coordinate: `${id}-coordinate`, field: "x", fieldType: "quantitative",
      aggregate: "count", stack: index === 1 ? "normalize" : "zero",
      scale: quantitativeScale("linear", `${id}-y`, index + 1, { point: false })
    });
    // Atomic assignment commits complete geometry, so replay bin options after Y.
    next = conditionalWitness(next, "encodeX", x);
  }
  return next;
}

function addRangesAndSecondary(program, panels) {
  let next = program;
  for (const [index, type] of QUANTITATIVE_TYPES.entries()) {
    const xId = `x-range-${type}`;
    next = conditionalWitness(panels.start(next, xId).createRuleMark({ id: xId, data: "analysisRows" })
      .encodeXRange({
        target: xId, coordinate: `${xId}-coordinate`, lower: "lowerX", upper: "upperX",
        fieldType: "quantitative",
        scale: quantitativeScale(type, `${xId}-scale`, index, { point: false })
      }), "encodeY", {
        target: xId,
        coordinate: `${xId}-coordinate`,
        field: "y",
        fieldType: "quantitative",
        scale: { id: `${xId}-orthogonal`, zero: false }
      });
    const yId = `y-range-${type}`;
    next = conditionalWitness(panels.start(next, yId).createRuleMark({ id: yId, data: "analysisRows" })
      .encodeYRange({
        target: yId, coordinate: `${yId}-coordinate`, lower: "lowerY", upper: "upperY",
        fieldType: "quantitative",
        scale: quantitativeScale(type, `${yId}-scale`, index + 1, { point: false })
      }), "encodeX", {
        target: yId,
        coordinate: `${yId}-coordinate`,
        field: "x",
        fieldType: "quantitative",
        scale: { id: `${yId}-orthogonal`, zero: false }
      });
  }
  const secondary = [
    { type: "nominal", first: "category", second: "categoryEnd" },
    { type: "ordinal", first: "group", second: "groupEnd" },
    { type: "temporal", first: "time", second: "timeEnd" }
  ];
  for (const [index, variant] of secondary.entries()) {
    const xId = `x-secondary-${variant.type}`;
    next = conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, xId).createRuleMark({ id: xId, data: "analysisRows" }), "encodeX", {
        target: xId, coordinate: `${xId}-coordinate`, field: variant.first,
        fieldType: variant.type,
        scale: variant.type === "temporal"
          ? timeScale(`${xId}-scale`, false, { unknown: false })
          : bandScale(`${xId}-scale`, index === 0 ? "band" : "point", false, {
              unknown: false
            })
      }), "encodeX2", {
        target: xId, coordinate: `${xId}-coordinate`, field: variant.second,
        fieldType: variant.type, scale: { id: `${xId}-scale` }
      }), "encodeY", {
        target: xId,
        coordinate: `${xId}-coordinate`,
        field: "y",
        fieldType: "quantitative",
        scale: { id: `${xId}-orthogonal`, zero: false }
      });
    const yId = `y-secondary-${variant.type}`;
    next = conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, yId).createRuleMark({ id: yId, data: "analysisRows" }), "encodeY", {
        target: yId, coordinate: `${yId}-coordinate`, field: variant.first,
        fieldType: variant.type,
        scale: variant.type === "temporal"
          ? timeScale(`${yId}-scale`, true, { unknown: false })
          : bandScale(`${yId}-scale`, index === 0 ? "band" : "point", true, {
              unknown: false
            })
      }), "encodeY2", {
        target: yId, coordinate: `${yId}-coordinate`, field: variant.second,
        fieldType: variant.type, scale: { id: `${yId}-scale` }
      }), "encodeX", {
        target: yId,
        coordinate: `${yId}-coordinate`,
        field: "x",
        fieldType: "quantitative",
        scale: { id: `${yId}-orthogonal`, zero: false }
      });
  }
  next = conditionalWitness(panels.start(next, "x-datum")
    .createRuleMark({ id: "x-datum", data: "analysisRows" }), "encodeX", {
      target: "x-datum", coordinate: "x-datum-coordinate", datum: 2,
      fieldType: "quantitative",
      scale: quantitativeScale("linear", "x-datum-scale", 0, { point: false })
    });
  next = conditionalWitness(panels.start(next, "y-datum")
    .createRuleMark({ id: "y-datum", data: "analysisRows" }), "encodeY", {
      target: "y-datum", coordinate: "y-datum-coordinate", datum: 2,
      fieldType: "quantitative",
      scale: quantitativeScale("linear", "y-datum-scale", 1, { point: false })
    });
  next = conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, "x2-datum")
    .createRuleMark({ id: "x2-datum", data: "analysisRows" }), "encodeX", {
      target: "x2-datum", coordinate: "x2-datum-coordinate",
      field: "lowerX", fieldType: "quantitative", scale: { id: "x2-datum-scale" }
    }), "encodeX2", {
      target: "x2-datum", coordinate: "x2-datum-coordinate", datum: 2,
      fieldType: "quantitative", scale: { id: "x2-datum-scale" }
    }), "encodeY", {
      target: "x2-datum", coordinate: "x2-datum-coordinate",
      field: "y", fieldType: "quantitative", scale: { id: "x2-datum-y", zero: false }
    });
  return conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, "y2-datum")
    .createRuleMark({ id: "y2-datum", data: "analysisRows" }), "encodeY", {
      target: "y2-datum", coordinate: "y2-datum-coordinate",
      field: "lowerY", fieldType: "quantitative", scale: { id: "y2-datum-scale" }
    }), "encodeY2", {
      target: "y2-datum", coordinate: "y2-datum-coordinate", datum: 2,
      fieldType: "quantitative", scale: { id: "y2-datum-scale" }
    }), "encodeX", {
      target: "y2-datum", coordinate: "y2-datum-coordinate",
      field: "x", fieldType: "quantitative", scale: { id: "y2-datum-x", zero: false }
    });
}

function addOffsets(program, panels) {
  const vertical = "x-offset-bars";
  let next = conditionalWitness(conditionalWitness(conditionalWitness(conditionalWitness(panels.start(program, vertical).createBarMark({ id: vertical, data: "analysisRows" }), "encodeX", {
      target: vertical, coordinate: `${vertical}-coordinate`,
      field: "category", fieldType: "nominal",
      scale: bandScale(`${vertical}-x`, "band", false, { unknown: false })
    }), "encodeY", {
      target: vertical, coordinate: `${vertical}-coordinate`,
      field: "y", aggregate: "mean", stack: null,
      scale: quantitativeScale("linear", `${vertical}-y`, 0, { point: false })
    }), "encodeXOffset", {
      target: vertical, field: "group", fieldType: "nominal",
      scale: {
        id: "x-offset-nominal-scale", type: "ordinal", domain: "auto", range: "auto",
        padding: 0.08, align: 0, reverse: false
      }
    }), "encodeXOffset", {
      target: vertical, field: "group", fieldType: "ordinal",
      scale: {
        id: "x-offset-scale", type: "ordinal", domain: "auto", range: "auto",
        paddingInner: 0.12, paddingOuter: 0.06, align: 1, reverse: true
      },
      paddingInner: 0.12, paddingOuter: 0.06
    })
    .encodeColor({ target: vertical, field: "group", layout: "group" });
  const horizontal = "y-offset-bars";
  next = conditionalWitness(conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, horizontal).createBarMark({ id: horizontal, data: "analysisRows" }), "encodeY", {
      target: horizontal, coordinate: `${horizontal}-coordinate`,
      field: "category", fieldType: "nominal",
      scale: bandScale(`${horizontal}-y`, "band", false, { unknown: false })
    }), "encodeX", {
      target: horizontal, coordinate: `${horizontal}-coordinate`,
      field: "x", aggregate: "mean", stack: null,
      scale: quantitativeScale("linear", `${horizontal}-x`, 0, { point: false })
    }), "encodeYOffset", {
      target: horizontal, field: "group", fieldType: "nominal",
      scale: {
        id: "y-offset-nominal-scale", type: "ordinal", domain: "auto", range: "auto",
        padding: 0.08, align: 0, reverse: false
      }
    }), "encodeYOffset", {
      target: horizontal, field: "group", fieldType: "ordinal",
      scale: {
        id: "y-offset-scale", type: "ordinal", domain: "auto", range: "auto",
        paddingInner: 0.12, paddingOuter: 0.06, align: 1, reverse: true
      },
      paddingInner: 0.12, paddingOuter: 0.06
    })
    .encodeColor({ target: horizontal, field: "group", layout: "group" });
  return next;
}

function addPositionScales(program, panels) {
  const pair = (...args) => pointPair(...args, panels);
  let next = program;
  for (const [index, type] of QUANTITATIVE_TYPES.entries()) {
    next = pair(next, `quantitative-${type}`, {
      field: "x", fieldType: "quantitative",
      coordinate: `quantitative-${type}-coordinate`,
      scale: quantitativeScale(type, `quantitative-${type}-x`, index)
    }, {
      field: "y", fieldType: "quantitative",
      coordinate: `quantitative-${type}-coordinate`,
      scale: quantitativeScale(type, `quantitative-${type}-y`, index + 1)
    });
  }
  next = pair(next, "temporal-x", {
    field: "time", fieldType: "temporal", scale: timeScale("temporal-x-scale")
  }, {
    field: "y", fieldType: "quantitative", scale: quantitativeScale("linear", "temporal-x-y", 0)
  });
  next = pair(next, "temporal-y", {
    field: "x", fieldType: "quantitative", scale: quantitativeScale("linear", "temporal-y-x", 1)
  }, {
    field: "time", fieldType: "temporal", scale: timeScale("temporal-y-scale", true)
  });
  next = pair(next, "categorical-band", {
    field: "category", fieldType: "nominal", scale: bandScale("categorical-band-x", "band")
  }, {
    field: "group", fieldType: "ordinal", scale: bandScale("categorical-band-y", "band", true)
  });
  return pair(next, "categorical-point", {
    field: "group", fieldType: "ordinal", scale: bandScale("categorical-point-x", "point", true)
  }, {
    field: "category", fieldType: "nominal", scale: bandScale("categorical-point-y", "point")
  });
}

const TEMPORAL_MODES = Object.freeze([
  { temporalUnit: "auto", field: "time", end: "timeEnd" },
  { temporalUnit: "year", field: "timeYear", end: "timeYearEnd" },
  { temporalUnit: "timestamp", field: "timeTimestamp", end: "timeTimestampEnd" }
]);

function addAreaDatumRanges(program, panels) {
  let next = program;
  for (const axis of ["x", "y"]) for (const baseline of [0, 1, 2]) {
    const id = `area-${axis}-datum-${baseline}`;
    const independent = axis === "x" ? "encodeY" : "encodeX";
    const range = axis === "x" ? "encodeXRange" : "encodeYRange";
    next = panels.start(next, id).createAreaMark({ id, data: "analysisRows", opacity: 0.15 })
      [independent]({ target: id, field: "order", coordinate: `${id}-coordinate`, scale: { id: `${id}-independent` } })
      [range]({ target: id, lower: { datum: baseline }, upper: axis, scale: { id: `${id}-measure` } })
      [range]({ target: id, lower: axis, upper: { datum: baseline } });
  }
  return next;
}

function addTemporalRanges(program, panels) {
  let next = program;
  for (const mode of TEMPORAL_MODES) {
    const id = `temporal-ranges-${mode.temporalUnit}`;
    const options = { target: id, fieldType: "temporal", temporalUnit: mode.temporalUnit };
    next = conditionalWitness(conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, id).createRuleMark({ id, data: "analysisRows" })
      .encodeXRange({ ...options, coordinate: `${id}-coordinate`, lower: mode.field, upper: mode.end, scale: timeScale(`${id}-x`, false, { unknown: false }) })
      .encodeYRange({ ...options, lower: mode.field, upper: mode.end, scale: timeScale(`${id}-y`, false, { unknown: false }) }), "encodeX", { ...options, field: mode.field }), "encodeY", { ...options, field: mode.field }), "encodeX2", { ...options, field: mode.end }), "encodeY2", { ...options, field: mode.end });
  }
  return next;
}

function buildPositionCoverage(factors) {
  const view = encodingView(factors.dataset, [{
    op: "direct-position-encoding-exercise",
    actions: POSITION_ACTIONS
  }]);
  const base = programFor(view, true);
  const panels = positionPanelCollection(base);
  let program = addPositionScales(base, panels);
  program = addTemporalRanges(program, panels);
  program = addAreaDatumRanges(program, panels);
  program = addHorizontalAggregateBars(program, panels);
  program = addVerticalAggregateBars(program, panels);
  program = addBinnedX(program, panels);
  program = addRangesAndSecondary(program, panels);
  for (const [fieldType, field] of [["nominal", "categoryEnd"], ["ordinal", "groupEnd"], ["temporal", "timeEnd"]]) {
    for (const [axis, action] of [["x", "encodeX2"], ["y", "encodeY2"]]) {
      const target = `${axis}-secondary-${fieldType}`;
      program = conditionalWitness(panels.start(program, target), action, { target, field, fieldType, scale: { id: `${target}-scale` } });
    }
  }
  // The secondary-datum atomic witnesses run after their orthogonal anchor.
  program = conditionalWitness(panels.start(program, "x2-datum"), "encodeX2", {
    target: "x2-datum", datum: 2, fieldType: "quantitative", scale: { id: "x2-datum-scale" }
  });
  program = conditionalWitness(panels.start(program, "y2-datum"), "encodeY2", {
    target: "y2-datum", datum: 2, fieldType: "quantitative", scale: { id: "y2-datum-scale" }
  });
  program = addOffsets(program, panels);
  const density = "center-density";
  program = conditionalWitness(panels.start(program, density).createAreaMark({ id: density, data: "analysisRows", opacity: 0.45 })
    .encodeDensity({
      target: density, source: "analysisRows", field: "x", groupBy: "group",
      bandwidth: "auto", steps: 32, coordinate: "center-density-coordinate"
    })
    .encodeColor({ target: density, field: "group", layout: "center" }), "encodeY", {
      target: density, coordinate: "center-density-coordinate",
      field: "x_density", fieldType: "quantitative", stack: "center",
      scale: quantitativeScale("linear", "center-density-y", 0, { point: false })
    });
  return finish(panels.finish(program), factors, "direct-position-encoding-options");
}

function positionedPoint(program, id, shape = "circle", panels) {
  program = panels.start(program, id);
  return program.createPointMark({ id, data: "analysisRows", shape })
    .encodeX({
      target: id, coordinate: "appearance",
      field: "x", scale: { id: "appearance-x", zero: false }
    })
    .encodeY({
      target: id, coordinate: "appearance",
      field: "y", scale: { id: "appearance-y", zero: false }
    });
}

function addColorScales(program, panels) {
  let next = program;
  for (const [index, interpolate] of INTERPOLATIONS.entries()) {
    const id = `sequential-${slug(interpolate)}`;
    const type = index === 0 ? "log" : index === 1 ? "symlog" : index === 2 ? "sqrt" : "sequential";
    next = conditionalEncoding(positionedPoint(next, id, "circle", panels), "encodeColor", {
      target: id,
      field: "y",
      fieldType: "quantitative",
      scale: {
        id: `${id}-color`, type, domain: "auto",
        ...(type === "sequential" ? { midpoint: "auto" } : {}),
        ...(type === "log" ? { base: 10 } : {}),
        ...(type === "symlog" ? { constant: 1 } : {}),
        ...(index < 2
          ? { palette: index === 0 ? "viridis" : "magma" }
          : index === 7
          ? { range: "auto" }
          : { palette: { name: index % 2 === 0 ? "viridis" : "magma", extent: [0.08, 0.92] } }),
        interpolate,
        ...realisticColorControls(interpolate, index),
        clamp: index % 2 === 0,
        reverse: index % 3 === 0,
        unknown: "#94a3b8"
      }
    });
  }
  next = conditionalEncoding(positionedPoint(next, "powered-color", "circle", panels), "encodeColor", {
    target:"powered-color",field:"y",fieldType:"quantitative",
    scale:{id:"powered-color-scale",type:"pow",exponent:2,interpolate:"lab",whitePoint:"d50",range:realisticPaletteRange(0)}
  }).editColorScale({target:"powered-color",whitePoint:"d50",range:realisticPaletteRange(1)})
    .editColorScale({target:"powered-color",type:"pow",interpolate:"hcl",whitePoint:"d65",exponent:.5})
    .editColorScale({target:"powered-color",whitePoint:"auto"})
    .editColorScale({target:"powered-color",interpolate:"cubehelix",gamma:2.2})
    .editColorScale({target:"powered-color",gamma:"auto"});
  // Exercise both string and object branches of the public range palette union.
  // The object branch keeps count and extent visible in the direct action trace.
  const rangePalettes = [
    { palette: "viridis" },
    { palette: "magma" },
    realisticPaletteRange(1)
  ];
  for (const [index, range] of rangePalettes.entries()) {
    const id = `range-palette-color-${index}`;
    next = conditionalEncoding(positionedPoint(next, id, "circle", panels), "encodeColor", {
      target: id, field: "y", fieldType: "quantitative",
      scale: { id: `${id}-scale`, type: "sequential", range }
    });
  }
  const discrete = [
    { type: "quantize", domain: "auto", palette: { name: "blues", count: 5 } },
    { type: "quantile", domain: "auto", palette: { name: "reds", count: 5 } },
    { type: "threshold", domain: [2, 4, 8], palette: { name: "greens", count: 4 } }
  ];
  for (const [index, scale] of discrete.entries()) {
    const id = `discretized-${scale.type}`;
    next = conditionalEncoding(positionedPoint(next, id, "circle", panels), "encodeColor", {
      target: id, field: "y", fieldType: "quantitative",
      scale: {
        id: `${id}-color`, ...scale,
        ...(scale.type === "quantize" ? { clamp: true } : {}),
        reverse: index % 2 === 0,
        unknown: "#94a3b8"
      }
    });
  }
  next = conditionalEncoding(positionedPoint(next, "categorical-color", "circle", panels), "encodeColor", {
    target: "categorical-color", field: "category", fieldType: "nominal",
    palette: { name: "tableau20", count: 8 }
  });
  next = conditionalEncoding(positionedPoint(next, "top-level-sequential-palette", "circle", panels), "encodeColor", {
    target: "top-level-sequential-palette", field: "y", fieldType: "quantitative",
    palette: { name: "viridis", extent: [0.1, 0.9] },
    scale: {
      id: "top-level-sequential-palette-scale", type: "sequential",
      domain: "auto", interpolate: "rgb", clamp: false, reverse: false,
      unknown: "#94a3b8"
    }
  });
  next = conditionalEncoding(positionedPoint(next, "ordinal-color", "circle", panels), "encodeColor", {
    target: "ordinal-color", field: "group", fieldType: "ordinal",
    palette: "accent",
    scale: {
      id: "ordinal-color-scale", type: "ordinal", domain: "auto",
      unknown: "#94a3b8"
    }
  });
  return conditionalEncoding(positionedPoint(next, "temporal-color", "circle", panels), "encodeColor", {
    target: "temporal-color", field: "time", fieldType: "temporal",
    palette: "cividis",
    scale: {
      id: "temporal-color-scale", type: "sequential", domain: "auto",
      interpolate: "lab", clamp: false, reverse: true, unknown: "#94a3b8"
    }
  });
}

function completeBar(program, id, field = "y", data = "analysisRows") {
  return program.createBarMark({ id, data })
    .encodeX({
      target: id, coordinate: `${id}-coordinate`, field: "category", fieldType: "nominal",
      scale: bandScale(`${id}-x`, "band", false, { unknown: false })
    })
    .encodeY({
      target: id, coordinate: `${id}-coordinate`,
      field, fieldType: "quantitative", aggregate: "mean", stack: null,
      scale: quantitativeScale("linear", `${id}-y`, 0, { point: false })
    })
    .encodeBarWidth({ target: id, band: 0.72 });
}

function positionedLine(program, id, panels) {
  program = panels.start(program, id);
  return program.createLineMark({ id, data: "analysisRows" })
    .encodeX({
      target: id,
      coordinate: "appearance",
      field: "x",
      scale: { id: "appearance-x", zero: false }
    })
    .encodeY({
      target: id,
      coordinate: "appearance",
      field: "y",
      scale: { id: "appearance-y", zero: false }
    })
    .encodeColor({
      target: id,
      field: "group",
      fieldType: "nominal",
      scale: {
        id: `${id}-color`,
        type: "ordinal",
        domain: "auto",
        range: "auto"
      }
    });
}

function addColorAggregatesAndLayouts(program) {
  const panels = [];
  let next = program;
  const groupDomain = [
    ...new Set(
      program.semanticSpec.datasets
        .find(dataset => dataset.id === "analysisRows")
        .values
        .map(row => row.group)
    )
  ];
  // Confidence bounds need at least two observations per cell. Retain authentic
  // rows and lineage; a conditional branch may not remove an undefined-CI cell.
  const counts = new Map();
  for (const row of program.semanticSpec.datasets.find(dataset => dataset.id === "analysisRows").values) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }
  next = next.filterData({ id: "confidenceRows", source: "analysisRows", field: "category",
    oneOf: [...counts].filter(([, count]) => count >= 2).map(([category]) => category) });
  const base = next;
  for (const [index, variant] of aggregateVariants().entries()) {
    const id = `color-aggregate-${index}`;
    next = conditionalEncoding(completeBar(base, id, "y", index < 2 ? "confidenceRows" : "analysisRows"), "encodeColor", {
      target: id, field: "x", fieldType: "quantitative",
      aggregate: variant.aggregate,
      scale: {
        id: `${id}-scale`, type: "sequential", domain: "auto", range: "auto",
        interpolate: index % 2 === 0 ? "rgb" : "hcl", clamp: index % 2 === 0,
        reverse: index % 2 === 1
      }
    });
    panels.push({ id, program: next });
  }
  for (const layout of ["group", "stack", "fill", "overlay", "diverging"]) {
    const id = `color-layout-${layout}`;
    let bar = completeBar(base, id, layout === "diverging" ? "signed" : "y");
    if (layout === "group") {
      bar = bar.encodeXOffset({
        target: id,
        field: "group",
        fieldType: "nominal",
        scale: {
          id: `${id}-offset`,
          type: "ordinal",
          domain: groupDomain,
          range: "auto"
        },
        paddingInner: 0.1,
        paddingOuter: 0.05
      });
    }
    next = conditionalEncoding(bar, "encodeColor", {
      target: id,
      field: "group",
      layout,
      scale: {
        id: `${id}-color`,
        type: "ordinal",
        domain: groupDomain,
        range: "auto"
      }
    });
    panels.push({ id, program: next });
  }
  const density = "appearance-center-density";
  next = conditionalEncoding(base.createAreaMark({ id: density, data: "analysisRows", opacity: 0.45 })
    .encodeDensity({
      target: density, source: "analysisRows", field: "x", groupBy: "group",
      bandwidth: "auto", steps: 32, coordinate: `${density}-coordinate`
    }), "encodeColor", {
      target: density,
      field: "group",
      layout: "center",
      scale: {
        id: `${density}-color`,
        type: "ordinal",
        domain: groupDomain,
        range: "auto"
      }
    });
  panels.push({ id: density, program: next });
  return panels;
}

function addAppearanceEncodings(program, panels) {
  let next = conditionalEncoding(positionedPoint(program, "opacity-false", "circle", panels), "encodeOpacity", {
    target: "opacity-false", field: "opacity", fieldType: "quantitative",
    scale: {
      id: "opacity-false-scale", type: "linear", domain: "auto", range: "auto",
      nice: false, zero: false, clamp: false, reverse: false, unknown: 0.25
    }
  });
  next = conditionalEncoding(positionedPoint(next, "opacity-true", "circle", panels), "encodeOpacity", {
    target: "opacity-true", field: "opacity", fieldType: "quantitative",
    scale: {
      id: "opacity-true-scale", type: "linear", domain: "auto", range: "auto",
      nice: true, zero: true, clamp: true, reverse: true, unknown: 0.3
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size", "circle", panels), "encodeSize", {
    target: "size", field: "size", fieldType: "quantitative",
    scale: {
      id: "size-scale", type: "linear", domain: "auto", range: "auto",
      clamp: false, reverse: false, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size-log", "circle", panels), "encodeSize", {
    target: "size-log", field: "size", fieldType: "quantitative",
    scale: {
      id: "size-log-scale", type: "log", domain: "auto", range: "auto",
      base: 2, clamp: false, reverse: true, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size-pow", "circle", panels), "encodeSize", {
    target: "size-pow", field: "size", fieldType: "quantitative",
    scale: {
      id: "size-pow-scale", type: "pow", domain: "auto", range: "auto",
      exponent: 2, clamp: true, reverse: false, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size-sqrt", "circle", panels), "encodeSize", {
    target: "size-sqrt", field: "size", fieldType: "quantitative",
    scale: {
      id: "size-sqrt-scale", type: "sqrt", domain: "auto", range: "auto",
      clamp: true, reverse: true, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size-quantize", "circle", panels), "encodeSize", {
    target: "size-quantize", field: "size", fieldType: "quantitative",
    scale: {
      id: "size-quantize-scale", type: "quantize", domain: "auto",
      range: [4, 9, 16], reverse: false, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size-quantile", "circle", panels), "encodeSize", {
    target: "size-quantile", field: "size", fieldType: "quantitative",
    scale: {
      id: "size-quantile-scale", type: "quantile", domain: "auto",
      range: [4, 9, 16], reverse: true, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size-threshold", "circle", panels), "encodeSize", {
    target: "size-threshold", field: "size", fieldType: "quantitative",
    scale: {
      id: "size-threshold-scale", type: "threshold", domain: [2, 4],
      range: [4, 9, 16], reverse: false, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size-nominal", "circle", panels), "encodeSize", {
    target: "size-nominal", field: "group", fieldType: "nominal",
    scale: {
      id: "size-nominal-scale", type: "ordinal", domain: "auto",
      range: [4, 9, 16], reverse: false, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "size-ordinal", "circle", panels), "encodeSize", {
    target: "size-ordinal", field: "category", fieldType: "ordinal",
    scale: {
      id: "size-ordinal-scale", type: "ordinal", domain: "auto",
      range: [4, 9, 16], reverse: true, unknown: 4
    }
  });
  next = conditionalEncoding(positionedPoint(next, "shape-circle", "circle", panels), "encodeShape", {
    target: "shape-circle", field: "group", fieldType: "nominal",
    scale: {
      id: "shape-scale", type: "ordinal", domain: "auto", range: "auto", unknown: "circle"
    }
  });
  next = conditionalEncoding(positionedPoint(next, "shape-diamond", "diamond", panels), "encodeShape", {
    target: "shape-diamond", field: "group", fieldType: "nominal",
    scale: {
      id: "shape-diamond-scale", type: "ordinal", domain: "auto", range: "auto",
      unknown: "diamond"
    }
  });
  next = conditionalEncoding(positionedPoint(next, "opacity-value", "circle", panels), "encodeOpacity", {
    target: "opacity-value", value: 0.55
  });
  for (const [index, type] of QUANTITATIVE_TYPES.entries()) {
    const id = `stroke-width-${type}`;
    next = conditionalEncoding(positionedLine(next, id, panels), "encodeStrokeWidth", {
      target: id, field: "seriesWidth", fieldType: "quantitative",
      scale: { ...quantitativeScale(type, `${id}-scale`, index, { point: false }), nice: type === "log" ? false : index % 2 === 0 }
    });
  }
  next = conditionalEncoding(conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, "stroke-width-value").createRuleMark({ id: "stroke-width-value", data: "analysisRows" }), "encodeX", {
      target: "stroke-width-value",
      coordinate: "appearance",
      field: "lowerX",
      fieldType: "quantitative",
      scale: { id: "stroke-width-value-x", zero: false }
    }), "encodeX2", {
      target: "stroke-width-value",
      field: "upperX",
      fieldType: "quantitative"
    }), "encodeY", {
      target: "stroke-width-value",
      coordinate: "appearance",
      field: "y",
      fieldType: "quantitative",
      scale: { id: "appearance-y", zero: false }
    }), "encodeStrokeWidth", { target: "stroke-width-value", value: 2.5 });
  const dashField = "stroke-dash-field";
  next = conditionalEncoding(conditionalWitness(conditionalWitness(panels.start(next, dashField).createLineMark({ id: dashField, data: "analysisRows" }), "encodeX", {
      target: dashField, coordinate: "appearance",
      field: "x", scale: { id: `${dashField}-x`, zero: false }
    }), "encodeY", {
      target: dashField, coordinate: "appearance",
      field: "y", scale: { id: "appearance-y", zero: false }
    }), "encodeStrokeDash", {
      target: dashField, field: "group", fieldType: "nominal",
      scale: { id: "stroke-dash-scale", type: "ordinal", domain: "auto", range: "auto" }
    });
  for (const value of ["solid", "dashed", "dotted", "dashdot"]) {
    const id = `stroke-dash-${value}`;
    next = conditionalEncoding(conditionalWitness(conditionalWitness(panels.start(next, id).createLineMark({ id, data: "analysisRows" }), "encodeX", {
        target: id, coordinate: "appearance",
        field: "x", scale: { id: `${id}-x`, zero: false }
      }), "encodeY", {
        target: id, coordinate: "appearance",
        field: "y", scale: { id: "appearance-y", zero: false }
      }), "encodeStrokeDash", { target: id, value });
  }
  next = conditionalEncoding(positionedPoint(next, "angle-field", "square", panels), "encodeAngle", { target: "angle-field", field: "angle", fieldType: "quantitative" });
  next = conditionalEncoding(positionedPoint(next, "angle-value", "diamond", panels), "encodeAngle", { target: "angle-value", value: 35 });
  next = conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, "text-field").createTextMark({ id: "text-field", data: "analysisRows", fontSize: 10 }), "encodeX", {
      target: "text-field", coordinate: "appearance",
      field: "x", scale: { id: "text-field-x", zero: false }
    }), "encodeY", {
      target: "text-field", coordinate: "appearance",
      field: "y", scale: { id: "appearance-y", zero: false }
    }), "encodeText", { target: "text-field", field: "label", format: "auto" });
  next = conditionalWitness(conditionalWitness(conditionalWitness(panels.start(next, "text-value").createTextMark({ id: "text-value", data: "analysisRows", fontSize: 10 }), "encodeX", {
      target: "text-value", coordinate: "appearance",
      field: "x", scale: { id: "text-value-x", zero: false }
    }), "encodeY", {
      target: "text-value", coordinate: "appearance",
      field: "y", scale: { id: "appearance-y", zero: false }
    }), "encodeText", { target: "text-value", value: 42.25, format: ".2f" });
  for (const action of ["encodeDx", "encodeDy"]) {
    next = panels.start(next, "text-field");
    next = conditionalWitness(next, action, { target: "text-field", field: "seriesWidth" });
    next = conditionalWitness(next, action, { target: "text-field", value: 4 });
  }
  for (const action of ["encodeRadius", "encodePointRadius"]) {
    const id = action === "encodeRadius" ? "radius-alias" : "point-radius";
    next = conditionalWitness(positionedPoint(next, id, "circle", panels), action, { target: id, value: 4 });
  }
  return next;
}

function textContentPanel(program) {
  let next = program;
  const source = "text-content-source";
  next = conditionalEncoding(completeBar(next, source), "encodeColor", { target: source, field: "group", layout: "stack" });
  for (const [id, options] of [
    ["text-content-category", { content: "category", format: "auto" }],
    ["text-content-value", { content: "value", format: ".1f" }],
    ["text-content-share-source", {
      content: "share", normalizeBy: "source", format: ".1%"
    }],
    ["text-content-share-category", {
      content: "share", normalizeBy: "category", format: ".1%"
    }]
  ]) {
    next = conditionalWitness(next.createTextMark({ id, source, fontSize: 9 }), "encodeText", { target: id, ...options });
  }
  return next;
}


function assertConcreteEquivalent(actual, expected, label) {
  if (actual === undefined || expected === undefined) return assert.deepEqual(actual, expected, label);
  assert.equal(actual.length, expected.length, `${label} item count`);
  for (const [index, item] of actual.entries()) {
    const reference = expected[index];
    assert.deepEqual(item.identity, reference.identity, `${label} row identity`);
    assert.deepEqual(Object.keys(item.properties).sort(), Object.keys(reference.properties).sort(), `${label} property ownership`);
    for (const [property, value] of Object.entries(item.properties)) {
      const expectedValue = reference.properties[property];
      if (typeof value === "number" && typeof expectedValue === "number") {
        const tolerance = 64 * Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(expectedValue));
        assert.ok(Math.abs(value - expectedValue) <= tolerance,
          `${label}[${index}].${property}: ${value} differs from ${expectedValue}`);
      } else assert.deepEqual(value, expectedValue, `${label}[${index}].${property}`);
    }
  }
}

// Execute each existing authored payload through both ordinary and conditional
// authoring. The fallback uses the exact original options, so every nested option
// remains a real direct-action witness rather than fabricated trace metadata.
function conditionalEncoding(program, action, args, { restore = false } = {}) {
  let next = program[action](args);
  const { target, coordinate: _coordinate, ...authored } = args;
  const layer = next.semanticSpec.layers.find(layer => layer.id === target);
  if (layer.mark.type === "line" && layer.encoding?.group === undefined) {
    const field = layer.encoding?.color?.field ?? layer.encoding?.strokeDash?.field;
    if (field !== undefined) next = next.encodeGroup({ target, field });
  }
  const channel = action.slice("encode".length);
  const encoding = layer.encoding?.[channel[0].toLowerCase() + channel.slice(1)];
  const value = encoding?.scale === undefined ? authored : {
    ...authored, scale: { ...authored.scale, id: encoding.scale }
  };
  const concrete = program => program.graphicSpec.objects[target]?.items.map(item => ({
    identity: item.identity, properties: item.properties
  }));
  let result = next;
  for (const predicate of [false, true]) {
    result = result[action]({
      target,
      conditions: [{ when: { version: 2, registry: "standard@1",
        root: { type: "literal", value: predicate } }, value }],
      otherwise: value
    });
    assertConcreteEquivalent(concrete(result), concrete(next),
      `${action}(${target}): identical ${predicate ? "matched branch" : "fallback"}`);
  }
  if (!["encodeRadius", "encodePointRadius"].includes(action) && concrete(result)?.length > 0) {
    const { coordinate: _coordinate, ...atomicValue } = value;
    const nativeChannel = channel[0].toLowerCase() + channel.slice(1);
    const ordinaryBatch = { target, channels: { [nativeChannel]: atomicValue } };
    result = result.encodeChannels(ordinaryBatch);
    assertConcreteEquivalent(concrete(result), concrete(next), `${action}(${target}): atomic ordinary`);
    for (const predicate of [false, true]) {
      result = result.encodeChannels({ target, channels: { [nativeChannel]: {
        conditions: [{ when: { version: 2, registry: "standard@1",
          root: { type: "literal", value: predicate } }, value: atomicValue }],
        otherwise: atomicValue
      } } });
      assertConcreteEquivalent(concrete(result), concrete(next),
        `${action}(${target}): atomic ${predicate ? "matched branch" : "fallback"}`);
    }
  }
  if (action === "encodeColor" && layer.mark.type === "point") {
    // Stroke shares color scale semantics, but has its own scale and excludes
    // color's aggregate/layout options. Execute real native calls for both.
    const stroke = Object.fromEntries(["field", "value", "fieldType", "temporalUnit"]
      .filter(key => Object.hasOwn(authored, key)).map(key => [key, authored[key]]));
    if (stroke.field !== undefined) stroke.scale = {
      ...authored.scale,
      ...(authored.palette === undefined ? {} : { palette: authored.palette }),
      id: `${target}-stroke-scale`
    };
    return conditionalEncoding(result, "encodeStroke", { target, ...stroke });
  }
  // Position fixtures continue ordinary grouping/layout authoring after this
  // verified transition; lifecycle fixtures retain live conditional bindings.
  return restore ? result[action]({ target, ...value }) : result;
}

function conditionalWitness(program, action, args) {
  return conditionalEncoding(program, action, args, { restore: true });
}

function buildAppearanceCoverage(factors) {
  const view = encodingView(factors.dataset, [
    { op: "direct-appearance-encoding-exercise", actions: APPEARANCE_ACTIONS },
    { op: "kernel-density-estimate", field: "x", groupBy: "group", steps: 32 }
  ]);
  const base = programFor(view, true);
  const panels = positionPanelCollection(base);
  let program = addColorScales(base, panels);
  const aggregatePanels = addColorAggregatesAndLayouts(base);
  program = addAppearanceEncodings(program, panels);
  for (const mode of TEMPORAL_MODES) {
    const id = `color-input-${mode.temporalUnit}`;
    program = conditionalEncoding(positionedPoint(program, id, "circle", panels), "encodeColor", {
      target: id, field: mode.field, fieldType: "temporal", temporalUnit: mode.temporalUnit,
      scale: { id: `${id}-scale`, type: "sequential", palette: "viridis" }
    });
  }
  program = conditionalEncoding(conditionalEncoding(positionedPoint(program, "constant-color-size", "circle", panels), "encodeColor", { target: "constant-color-size", value: "#2563eb" }), "encodeSize", { target: "constant-color-size", value: 25 });
  for (const value of ["circle", "diamond"]) {
    const id = `constant-shape-${value}`;
    program = conditionalEncoding(positionedPoint(program, id, "circle", panels), "encodeShape", { target: id, value });
  }
  for (const normalization of ["area", "radius"]) {
    const constantId = `constant-polygon-${normalization}`;
    program = conditionalEncoding(positionedPoint(program, constantId, "circle", panels), "encodeShape", {
      target: constantId,
      value: {
        polygon: [{x: 0, y: -1}, {x: 1, y: 1}, {x: -1, y: 1}], normalization
      }
    });
    const id = `polygon-unknown-${normalization}`;
    program = conditionalEncoding(positionedPoint(program, id, "circle", panels), "encodeShape", {
      target: id, field: "group", fieldType: "nominal",
      scale: {id: `${id}-scale`, type: "ordinal", domain: "auto", unknown: {
        polygon: [{x: 0, y: -1}, {x: 1, y: 1}, {x: -1, y: 1}], normalization
      }}
    });
  }
  const dashDomain = [...new Set(view.rows.map(row => row.group))];
  for (const unknown of ["solid", "dashed", "dotted", "dashdot"]) {
    const id = `dash-unknown-${unknown}`;
    program = conditionalEncoding(positionedLine(program, id, panels), "encodeStrokeDash", {
      target: id, field: "group", fieldType: unknown === "solid" ? "nominal" : "ordinal",
      scale: { id: `${id}-scale`, type: "ordinal", domain: dashDomain, range: "auto", unknown }
    });
  }
  program = positionedLine(program, "atomic-order", panels)
    .encodeChannels({ target: "atomic-order", channels: {
      group: { fields: ["category", "group"], fieldType: "nominal" },
      pathOrder: { field: "order", fieldType: "quantitative", order: "ascending" }
    } })
    .encodeChannels({ target: "atomic-order", channels: {
      group: { field: "group", fieldType: "nominal" },
      pathOrder: { field: "order", fieldType: "quantitative", order: "descending" }
    } });
  return finish(panels.finish(program, { id: "appearancePanels", extra: [
    ...aggregatePanels, { id: "labels", program: textContentPanel(base) }
  ] }), factors, "direct-appearance-encoding-options");
}

function polarPoint(program, id, theta, radius) {
  const thetaArgs = { target: id, coordinate: `${id}-coordinate`, ...theta };
  const radiusArgs = { target: id, coordinate: `${id}-coordinate`, ...radius };
  let next = program.createPointMark({ id, data: "analysisRows" })
    .encodeTheta(thetaArgs).encodeR(radiusArgs);
  next = conditionalWitness(next, "encodeTheta", thetaArgs);
  return conditionalWitness(next, "encodeR", radiusArgs);
}

function buildPolarCoverage(factors) {
  const view = encodingView(factors.dataset, [{
    op: "direct-polar-encoding-exercise",
    actions: POLAR_ACTIONS
  }]);
  let program = programFor(view);
  const thetaVariants = [
    ...TEMPORAL_MODES.map(mode => ({ id: `input-${mode.temporalUnit}`, theta: {
      field: mode.field, fieldType: "temporal", temporalUnit: mode.temporalUnit,
      scale: timeScale(`theta-input-${mode.temporalUnit}`, false, { unknown: false })
    } })),
    {
      id: "linear",
      theta: {
        field: "angle", fieldType: "quantitative",
        scale: {
          id: "theta-linear", type: "linear", domain: "auto", range: "auto",
          nice: true, zero: true, clamp: false, reverse: false
        }
      }
    },
    {
      id: "time",
      theta: {
        field: "time", fieldType: "temporal",
        scale: {
          id: "theta-time", type: "time", domain: "auto", range: "auto",
          nice: false, clamp: true, reverse: true
        }
      }
    },
    {
      id: "band",
      theta: {
        field: "category", fieldType: "nominal",
        scale: {
          id: "theta-band", type: "band", domain: "auto", range: "auto",
          paddingInner: 0.12, paddingOuter: 0.06, align: 0.4, reverse: false
        }
      }
    },
    {
      id: "point",
      theta: {
        field: "group", fieldType: "ordinal",
        scale: {
          id: "theta-point", type: "point", domain: "auto", range: "auto",
          padding: 0.2, align: 0.6, reverse: true
        }
      }
    }
  ];
  for (const [index, variant] of thetaVariants.entries()) {
    program = polarPoint(program, `theta-${variant.id}`, variant.theta, {
      field: "radius", fieldType: "quantitative",
      scale: quantitativeScale("linear", `theta-${variant.id}-radius`, index, { point: false })
    });
  }
  for (const [index, type] of QUANTITATIVE_TYPES.entries()) {
    program = polarPoint(program, `radius-${type}`, {
      field: "angle", fieldType: "quantitative",
      scale: {
        id: `radius-${type}-theta`, type: "linear", domain: "auto", range: "auto",
        nice: false, zero: false, clamp: index % 2 === 0, reverse: index % 2 === 1
      }
    }, {
      field: "radius", fieldType: "quantitative",
      scale: quantitativeScale(type, `radius-${type}-scale`, index, { point: false })
    });
  }
  program = conditionalWitness(program, "encodeTheta", {
    target: "theta-linear", datum: 180, fieldType: "quantitative",
    scale: { id: "theta-linear", type: "linear", domain: [0, 360], range: "auto" }
  });
  program = conditionalWitness(program, "encodeR", {
    target: "theta-linear", datum: 10, fieldType: "quantitative",
    scale: { id: "theta-linear-radius", type: "linear", domain: [0, 100], range: "auto" }
  });
  for (const aggregate of ["count", "sum"]) {
    const id = `theta-aggregate-${aggregate}`;
    program = conditionalWitness(program.createArcMark({ id, data: "analysisRows", innerRadius: 0.3 }), "encodeTheta", {
        target: id, coordinate: `${id}-coordinate`, field: "category",
        fieldType: "nominal", aggregate,
        ...(aggregate === "sum" ? { weight: "radius" } : {}),
        scale: {
          id: `${id}-scale`, domain: "auto", range: "auto",
          reverse: aggregate === "sum"
        }
      })
      .encodeColor({ target: id, field: "category", layout: "overlay" });
  }
  for (const id of [
    ...thetaVariants.map(variant => `theta-${variant.id}`),
    ...QUANTITATIVE_TYPES.map(type => `radius-${type}`)
  ]) {
    program = program.removeMark({ target: id });
  }
  for (const mapping of ["area", "radius-length"]) {
    for (const aggregate of ["count", "sum"]) {
      const id = `measured-${mapping}-${aggregate}`;
      program = conditionalWitness(conditionalWitness(program.createArcMark({ id, data: "analysisRows", innerRadius: 0.3 }), "encodeTheta", { target: id, coordinate: `${id}-coordinate`, field: "category", fieldType: "nominal" }), "encodeR", { target: id, mapping, aggregate,
          ...(aggregate === "sum" ? { field: "radius" } : {}),
          scale: { id: `${id}-scale` } })
        .encodeColor({ target: id, field: "category" });
    }
  }
  program = conditionalWitness(program, "encodeR", {
    target: "measured-area-sum",
    field: "radius",
    mapping: false
  });
  return finish(program, factors, "direct-polar-encoding-options");
}

function schedule() {
  const selectionVariantIds = Array.from({ length: REPETITIONS }, () => PROFILE.id);
  return freeze({
    factor: "profile",
    selectionVariantIds,
    minimumSelections: REPETITIONS,
    assignment: "round-robin-datasets-per-variant",
    variantRequirements: [{
      variantId: PROFILE.id,
      minimumOccurrences: REPETITIONS,
      minimumDatasets: 3
    }],
    minimumDatasetsPerRequirement: 3
  });
}

function directActions(program) {
  return new Set(directProgramTrace(program).map(entry => entry.op));
}

function makeRecipe({ id, family, actions, build, operations }) {
  const coverageSchedule = schedule();
  return freeze({
    id,
    suite: "realistic",
    generation: "balanced-per-dataset",
    complexity: "composite",
    enforceFactorEffects: true,
    datasets: DATASETS,
    factors: { profile: PROFILES },
    expectedDirectActions: [...actions, "encodeChannels"],
    coverageSchedule,
    minimumSelections: coverageSchedule.minimumSelections,
    factorsForDataset(dataset) {
      return DATASETS.includes(dataset) ? { profile: PROFILES } : undefined;
    },
    build,
    observe() {
      return freeze([]);
    },
    observeFactors(program, factors) {
      const observed = directActions(program);
      const title = `${family}: ${factors.dataset} authentic observations`;
      return actions.every(action => observed.has(action)) &&
        program.semanticSpec.title?.text === title
        ? freeze([{
            factor: "profile",
            value: factors.profile,
            evidence: `direct:${actions.join("+")};final:authentic-multilayer-graphic+visible-title`
          }])
        : freeze([]);
    },
    describe(factors) {
      const view = encodingView(factors.dataset, operations);
      return freeze({
        corpus: "tidytuesday",
        chartFamily: family,
        complexity: "composite",
        sourceDatasetIds: [factors.dataset],
        title: `${family}: ${factors.dataset} authentic observations`,
        analysisQuestion: "Every option is executed directly against pinned TidyTuesday source rows.",
        sourceFields: realisticSourceFields(
          factors.dataset,
          view.provenance.fieldBindings
        ),
        sample: view.sample,
        provenance: view.provenance,
        dataOperations: view.provenance.transformations.map(transformation => transformation.op),
        activeFeatures: []
      });
    }
  });
}

const POSITION_RECIPE = makeRecipe({
  id: "realistic-direct-position-encoding-options",
  family: "direct-position-encoding-options",
  actions: POSITION_ACTIONS,
  build: buildPositionCoverage,
  operations: [{ op: "direct-position-encoding-exercise", actions: POSITION_ACTIONS }]
});

const APPEARANCE_RECIPE = makeRecipe({
  id: "realistic-direct-appearance-encoding-options",
  family: "direct-appearance-encoding-options",
  actions: APPEARANCE_ACTIONS,
  build: buildAppearanceCoverage,
  operations: [
    { op: "direct-appearance-encoding-exercise", actions: APPEARANCE_ACTIONS },
    { op: "kernel-density-estimate", field: "x", groupBy: "group", steps: 32 }
  ]
});

const POLAR_RECIPE = makeRecipe({
  id: "realistic-direct-polar-encoding-options",
  family: "direct-polar-encoding-options",
  actions: POLAR_ACTIONS,
  build: buildPolarCoverage,
  operations: [{ op: "direct-polar-encoding-exercise", actions: POLAR_ACTIONS }]
});

export const REALISTIC_ENCODING_COVERAGE_RECIPES = freeze([
  POSITION_RECIPE,
  APPEARANCE_RECIPE,
  POLAR_RECIPE
]);

export const REALISTIC_ENCODING_COVERAGE_EXPECTED_ACTIONS = freeze([
  ...POSITION_ACTIONS,
  ...APPEARANCE_ACTIONS,
  ...POLAR_ACTIONS,
  "encodeChannels"
]);

export const REALISTIC_ENCODING_COVERAGE_COUNTS = freeze({
  recipes: REALISTIC_ENCODING_COVERAGE_RECIPES.length,
  composite: REALISTIC_ENCODING_COVERAGE_RECIPES.length,
  minimumSelections: REALISTIC_ENCODING_COVERAGE_RECIPES.reduce(
    (sum, recipe) => sum + recipe.minimumSelections,
    0
  )
});

export function realisticEncodingCoverageFactors(recipe) {
  if (!REALISTIC_ENCODING_COVERAGE_RECIPES.includes(recipe)) {
    throw new Error(`Unknown realistic encoding-coverage recipe "${recipe?.id}".`);
  }
  return freeze(recipe.coverageSchedule.selectionVariantIds.map((variantId, index) => ({
    dataset: DATASETS[index % DATASETS.length],
    profile: recipe.factors.profile.find(profile => profile.id === variantId)
  })));
}
