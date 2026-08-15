import { chart } from "../../../src/index.js";

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
  "encodeColor", "encodeOpacity", "encodeSize", "encodeShape",
  "encodeStrokeWidth", "encodeStrokeDash", "encodeAngle", "encodeText"
]);
const POLAR_ACTIONS = Object.freeze(["encodeTheta", "encodeR"]);

function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function canvas() {
  return {
    width: 2_200,
    height: 1_300,
    background: "#ffffff",
    margin: { top: 180, right: 180, bottom: 180, left: 180 }
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

function programFor(view) {
  return chart()
    .createCanvas(canvas())
    .createData({ id: "analysisRows", values: view.rows });
}

function finish(program, factors, family) {
  return program.createTitle({
    text: `${family}: ${factors.dataset} authentic observations`,
    subtitle: "Every option is executed directly against pinned TidyTuesday source rows.",
    align: "left",
    maxWidth: 1_700,
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
    nice: type === "log" ? false : ordinal % 2 === 0,
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

function pointPair(program, id, x, y) {
  const coordinate = x.coordinate ?? y.coordinate ?? `${id}-coordinate`;
  return program.createPointMark({ id, data: "analysisRows" })
    .encodeX({ target: id, coordinate, ...x })
    .encodeY({ target: id, coordinate, ...y });
}

function aggregateVariants() {
  return [
    { aggregate: { op: "first", orderBy: "order", order: "ascending" }, stack: "zero" },
    { aggregate: { op: "last", orderBy: "order", order: "descending" }, stack: "normalize" },
    { aggregate: { op: "quantile", probability: 0.5 }, stack: null },
    { aggregate: "mean", stack: "zero" },
    { aggregate: "sum", stack: null }
  ];
}

function addHorizontalAggregateBars(program) {
  let next = program;
  for (const [index, variant] of aggregateVariants().entries()) {
    const id = `x-aggregate-${index}`;
    next = next.createBarMark({ id, data: "analysisRows" })
      .encodeY({
        target: id, coordinate: `${id}-coordinate`,
        field: "category", fieldType: index === 1 ? "ordinal" : "nominal",
        scale: bandScale(
          `${id}-y`, "band", index % 2 === 1,
          { unknown: false }
        )
      })
      .encodeX({
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

function addVerticalAggregateBars(program) {
  let next = program;
  for (const [index, variant] of aggregateVariants().entries()) {
    const id = `y-aggregate-${index}`;
    next = next.createBarMark({ id, data: "analysisRows" })
      .encodeX({
        target: id, coordinate: `${id}-coordinate`,
        field: "category", fieldType: index === 1 ? "ordinal" : "nominal",
        scale: bandScale(
          `${id}-x`, "band", index % 2 === 1,
          { unknown: false }
        )
      })
      .encodeY({
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

function addBinnedX(program) {
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
    next = next.createBarMark({ id, data: "analysisRows" })
      .encodeX({
        target: id, coordinate: `${id}-coordinate`, field: "x",
        fieldType: "quantitative", bin,
        scale: quantitativeScale("linear", `${id}-x`, index, { point: false })
      })
      .encodeY({
        target: id, coordinate: `${id}-coordinate`, field: "x", fieldType: "quantitative",
        aggregate: "count", stack: index === 1 ? "normalize" : "zero",
        scale: quantitativeScale("linear", `${id}-y`, index + 1, { point: false })
      });
  }
  return next;
}

function addRangesAndSecondary(program) {
  let next = program;
  for (const [index, type] of QUANTITATIVE_TYPES.entries()) {
    const xId = `x-range-${type}`;
    next = next.createRuleMark({ id: xId, data: "analysisRows" })
      .encodeXRange({
        target: xId, coordinate: `${xId}-coordinate`, lower: "lowerX", upper: "upperX",
        fieldType: "quantitative",
        scale: quantitativeScale(type, `${xId}-scale`, index, { point: false })
      })
      .encodeY({
        target: xId,
        coordinate: `${xId}-coordinate`,
        field: "y",
        fieldType: "quantitative",
        scale: { id: `${xId}-orthogonal`, zero: false }
      });
    const yId = `y-range-${type}`;
    next = next.createRuleMark({ id: yId, data: "analysisRows" })
      .encodeYRange({
        target: yId, coordinate: `${yId}-coordinate`, lower: "lowerY", upper: "upperY",
        fieldType: "quantitative",
        scale: quantitativeScale(type, `${yId}-scale`, index + 1, { point: false })
      })
      .encodeX({
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
    next = next.createRuleMark({ id: xId, data: "analysisRows" })
      .encodeX({
        target: xId, coordinate: `${xId}-coordinate`, field: variant.first,
        fieldType: variant.type,
        scale: variant.type === "temporal"
          ? timeScale(`${xId}-scale`, false, { unknown: false })
          : bandScale(`${xId}-scale`, index === 0 ? "band" : "point", false, {
              unknown: false
            })
      })
      .encodeX2({
        target: xId, coordinate: `${xId}-coordinate`, field: variant.second,
        fieldType: variant.type, scale: { id: `${xId}-scale` }
      })
      .encodeY({
        target: xId,
        coordinate: `${xId}-coordinate`,
        field: "y",
        fieldType: "quantitative",
        scale: { id: `${xId}-orthogonal`, zero: false }
      });
    const yId = `y-secondary-${variant.type}`;
    next = next.createRuleMark({ id: yId, data: "analysisRows" })
      .encodeY({
        target: yId, coordinate: `${yId}-coordinate`, field: variant.first,
        fieldType: variant.type,
        scale: variant.type === "temporal"
          ? timeScale(`${yId}-scale`, true, { unknown: false })
          : bandScale(`${yId}-scale`, index === 0 ? "band" : "point", true, {
              unknown: false
            })
      })
      .encodeY2({
        target: yId, coordinate: `${yId}-coordinate`, field: variant.second,
        fieldType: variant.type, scale: { id: `${yId}-scale` }
      })
      .encodeX({
        target: yId,
        coordinate: `${yId}-coordinate`,
        field: "x",
        fieldType: "quantitative",
        scale: { id: `${yId}-orthogonal`, zero: false }
      });
  }
  return next.createRuleMark({ id: "x-datum", data: "analysisRows" })
    .encodeX({
      target: "x-datum", coordinate: "x-datum-coordinate", datum: 2,
      fieldType: "quantitative",
      scale: quantitativeScale("linear", "x-datum-scale", 0, { point: false })
    })
    .createRuleMark({ id: "y-datum", data: "analysisRows" })
    .encodeY({
      target: "y-datum", coordinate: "y-datum-coordinate", datum: 2,
      fieldType: "quantitative",
      scale: quantitativeScale("linear", "y-datum-scale", 1, { point: false })
    })
    .createRuleMark({ id: "x2-datum", data: "analysisRows" })
    .encodeX({
      target: "x2-datum", coordinate: "x2-datum-coordinate",
      field: "lowerX", fieldType: "quantitative", scale: { id: "x2-datum-scale" }
    })
    .encodeX2({
      target: "x2-datum", coordinate: "x2-datum-coordinate", datum: 2,
      fieldType: "quantitative", scale: { id: "x2-datum-scale" }
    })
    .encodeY({
      target: "x2-datum", coordinate: "x2-datum-coordinate",
      field: "y", fieldType: "quantitative", scale: { id: "x2-datum-y", zero: false }
    })
    .createRuleMark({ id: "y2-datum", data: "analysisRows" })
    .encodeY({
      target: "y2-datum", coordinate: "y2-datum-coordinate",
      field: "lowerY", fieldType: "quantitative", scale: { id: "y2-datum-scale" }
    })
    .encodeY2({
      target: "y2-datum", coordinate: "y2-datum-coordinate", datum: 2,
      fieldType: "quantitative", scale: { id: "y2-datum-scale" }
    })
    .encodeX({
      target: "y2-datum", coordinate: "y2-datum-coordinate",
      field: "x", fieldType: "quantitative", scale: { id: "y2-datum-x", zero: false }
    });
}

function addOffsets(program) {
  const vertical = "x-offset-bars";
  let next = program.createBarMark({ id: vertical, data: "analysisRows" })
    .encodeX({
      target: vertical, coordinate: `${vertical}-coordinate`,
      field: "category", fieldType: "nominal",
      scale: bandScale(`${vertical}-x`, "band", false, { unknown: false })
    })
    .encodeY({
      target: vertical, coordinate: `${vertical}-coordinate`,
      field: "y", aggregate: "mean", stack: null,
      scale: quantitativeScale("linear", `${vertical}-y`, 0, { point: false })
    })
    .encodeXOffset({
      target: vertical, field: "group", fieldType: "nominal",
      scale: {
        id: "x-offset-nominal-scale", type: "ordinal", domain: "auto", range: "auto"
      },
      paddingInner: 0.08, paddingOuter: 0.04
    })
    .encodeXOffset({
      target: vertical, field: "group", fieldType: "ordinal",
      scale: { id: "x-offset-scale", type: "ordinal", domain: "auto", range: "auto" },
      paddingInner: 0.12, paddingOuter: 0.06
    })
    .encodeColor({ target: vertical, field: "group", layout: "group" });
  const horizontal = "y-offset-bars";
  next = next.createBarMark({ id: horizontal, data: "analysisRows" })
    .encodeY({
      target: horizontal, coordinate: `${horizontal}-coordinate`,
      field: "category", fieldType: "nominal",
      scale: bandScale(`${horizontal}-y`, "band", false, { unknown: false })
    })
    .encodeX({
      target: horizontal, coordinate: `${horizontal}-coordinate`,
      field: "x", aggregate: "mean", stack: null,
      scale: quantitativeScale("linear", `${horizontal}-x`, 0, { point: false })
    })
    .encodeYOffset({
      target: horizontal, field: "group", fieldType: "nominal",
      scale: {
        id: "y-offset-nominal-scale", type: "ordinal", domain: "auto", range: "auto"
      },
      paddingInner: 0.08, paddingOuter: 0.04
    })
    .encodeYOffset({
      target: horizontal, field: "group", fieldType: "ordinal",
      scale: { id: "y-offset-scale", type: "ordinal", domain: "auto", range: "auto" },
      paddingInner: 0.12, paddingOuter: 0.06
    })
    .encodeColor({ target: horizontal, field: "group", layout: "group" });
  return next;
}

function addPositionScales(program) {
  let next = program;
  for (const [index, type] of QUANTITATIVE_TYPES.entries()) {
    next = pointPair(next, `quantitative-${type}`, {
      field: "x", fieldType: "quantitative",
      coordinate: `quantitative-${type}-coordinate`,
      scale: quantitativeScale(type, `quantitative-${type}-x`, index)
    }, {
      field: "y", fieldType: "quantitative",
      coordinate: `quantitative-${type}-coordinate`,
      scale: quantitativeScale(type, `quantitative-${type}-y`, index + 1)
    });
  }
  next = pointPair(next, "temporal-x", {
    field: "time", fieldType: "temporal", scale: timeScale("temporal-x-scale")
  }, {
    field: "y", fieldType: "quantitative", scale: quantitativeScale("linear", "temporal-x-y", 0)
  });
  next = pointPair(next, "temporal-y", {
    field: "x", fieldType: "quantitative", scale: quantitativeScale("linear", "temporal-y-x", 1)
  }, {
    field: "time", fieldType: "temporal", scale: timeScale("temporal-y-scale", true)
  });
  next = pointPair(next, "categorical-band", {
    field: "category", fieldType: "nominal", scale: bandScale("categorical-band-x", "band")
  }, {
    field: "group", fieldType: "ordinal", scale: bandScale("categorical-band-y", "band", true)
  });
  return pointPair(next, "categorical-point", {
    field: "group", fieldType: "ordinal", scale: bandScale("categorical-point-x", "point", true)
  }, {
    field: "category", fieldType: "nominal", scale: bandScale("categorical-point-y", "point")
  });
}

function buildPositionCoverage(factors) {
  const view = encodingView(factors.dataset, [{
    op: "direct-position-encoding-exercise",
    actions: POSITION_ACTIONS
  }]);
  let program = addPositionScales(programFor(view));
  program = addHorizontalAggregateBars(program);
  program = addVerticalAggregateBars(program);
  program = addBinnedX(program);
  program = addRangesAndSecondary(program);
  program = addOffsets(program);
  const density = "center-density";
  program = program.createAreaMark({ id: density, data: "analysisRows", opacity: 0.45 })
    .encodeDensity({
      target: density, source: "analysisRows", field: "x", groupBy: "group",
      bandwidth: "auto", steps: 32, coordinate: "center-density-coordinate"
    })
    .encodeColor({ target: density, field: "group", layout: "center" })
    .encodeY({
      target: density, coordinate: "center-density-coordinate",
      field: "x_density", fieldType: "quantitative", stack: "center",
      scale: quantitativeScale("linear", "center-density-y", 0, { point: false })
    });
  return finish(program, factors, "direct-position-encoding-options");
}

function positionedPoint(program, id, shape = "circle") {
  return program.createPointMark({ id, data: "analysisRows", shape })
    .encodeX({
      target: id, coordinate: `${id}-coordinate`,
      field: "x", scale: { id: `${id}-x`, zero: false }
    })
    .encodeY({
      target: id, coordinate: `${id}-coordinate`,
      field: "y", scale: { id: `${id}-y`, zero: false }
    });
}

function addColorScales(program) {
  let next = program;
  for (const [index, interpolate] of INTERPOLATIONS.entries()) {
    const id = `sequential-${slug(interpolate)}`;
    next = positionedPoint(next, id).encodeColor({
      target: id,
      field: "y",
      fieldType: "quantitative",
      scale: {
        id: `${id}-color`, type: "sequential", domain: "auto",
        ...(index < 2
          ? { palette: index === 0 ? "viridis" : "magma" }
          : index === 7
          ? { range: "auto" }
          : { palette: { name: index % 2 === 0 ? "viridis" : "magma", extent: [0.08, 0.92] } }),
        interpolate,
        clamp: index % 2 === 0,
        reverse: index % 3 === 0,
        unknown: "#94a3b8"
      }
    });
  }
  const discrete = [
    { type: "quantize", domain: "auto", palette: { name: "blues", count: 5 } },
    { type: "quantile", domain: "auto", palette: { name: "reds", count: 5 } },
    { type: "threshold", domain: [2, 4, 8], palette: { name: "greens", count: 4 } }
  ];
  for (const [index, scale] of discrete.entries()) {
    const id = `discretized-${scale.type}`;
    next = positionedPoint(next, id).encodeColor({
      target: id, field: "y", fieldType: "quantitative",
      scale: {
        id: `${id}-color`, ...scale,
        ...(scale.type === "quantize" ? { clamp: true } : {}),
        reverse: index % 2 === 0,
        unknown: "#94a3b8"
      }
    });
  }
  next = positionedPoint(next, "categorical-color").encodeColor({
    target: "categorical-color", field: "category", fieldType: "nominal",
    palette: { name: "tableau20", count: 8 }
  });
  next = positionedPoint(next, "top-level-sequential-palette").encodeColor({
    target: "top-level-sequential-palette", field: "y", fieldType: "quantitative",
    palette: { name: "viridis", extent: [0.1, 0.9] },
    scale: {
      id: "top-level-sequential-palette-scale", type: "sequential",
      domain: "auto", interpolate: "rgb", clamp: false, reverse: false,
      unknown: "#94a3b8"
    }
  });
  next = positionedPoint(next, "ordinal-color").encodeColor({
    target: "ordinal-color", field: "group", fieldType: "ordinal",
    palette: "accent",
    scale: {
      id: "ordinal-color-scale", type: "ordinal", domain: "auto",
      unknown: "#94a3b8"
    }
  });
  return positionedPoint(next, "temporal-color").encodeColor({
    target: "temporal-color", field: "time", fieldType: "temporal",
    palette: "cividis",
    scale: {
      id: "temporal-color-scale", type: "sequential", domain: "auto",
      interpolate: "lab", clamp: false, reverse: true, unknown: "#94a3b8"
    }
  });
}

function completeBar(program, id, field = "y") {
  return program.createBarMark({ id, data: "analysisRows" })
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

function positionedLine(program, id) {
  return program.createLineMark({ id, data: "analysisRows" })
    .encodeX({
      target: id,
      coordinate: `${id}-coordinate`,
      field: "x",
      scale: { id: `${id}-x`, zero: false }
    })
    .encodeY({
      target: id,
      coordinate: `${id}-coordinate`,
      field: "y",
      scale: { id: `${id}-y`, zero: false }
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
  let next = program;
  const groupDomain = [
    ...new Set(
      program.semanticSpec.datasets
        .find(dataset => dataset.id === "analysisRows")
        .values
        .map(row => row.group)
    )
  ];
  for (const [index, variant] of aggregateVariants().entries()) {
    const id = `color-aggregate-${index}`;
    next = completeBar(next, id).encodeColor({
      target: id, field: "x", fieldType: "quantitative",
      aggregate: variant.aggregate,
      scale: {
        id: `${id}-scale`, type: "sequential", domain: "auto", range: "auto",
        interpolate: index % 2 === 0 ? "rgb" : "hcl", clamp: index % 2 === 0,
        reverse: index % 2 === 1
      }
    });
  }
  for (const layout of ["group", "stack", "fill", "overlay", "diverging"]) {
    const id = `color-layout-${layout}`;
    let bar = completeBar(next, id, layout === "diverging" ? "signed" : "y");
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
    next = bar.encodeColor({
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
  }
  const density = "appearance-center-density";
  return next.createAreaMark({ id: density, data: "analysisRows", opacity: 0.45 })
    .encodeDensity({
      target: density, source: "analysisRows", field: "x", groupBy: "group",
      bandwidth: "auto", steps: 32, coordinate: `${density}-coordinate`
    })
    .encodeColor({
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
}

function addAppearanceEncodings(program) {
  let next = positionedPoint(program, "opacity-false").encodeOpacity({
    target: "opacity-false", field: "opacity", fieldType: "quantitative",
    scale: {
      id: "opacity-false-scale", type: "linear", domain: "auto", range: "auto",
      nice: false, zero: false, clamp: false, reverse: false, unknown: 0.25
    }
  });
  next = positionedPoint(next, "opacity-true").encodeOpacity({
    target: "opacity-true", field: "opacity", fieldType: "quantitative",
    scale: {
      id: "opacity-true-scale", type: "linear", domain: "auto", range: "auto",
      nice: true, zero: true, clamp: true, reverse: true, unknown: 0.3
    }
  });
  next = positionedPoint(next, "size").encodeSize({
    target: "size", field: "size", fieldType: "quantitative",
    scale: { id: "size-scale", type: "linear", domain: "auto", range: "auto", unknown: 4 }
  });
  next = positionedPoint(next, "shape-circle").encodeShape({
    target: "shape-circle", field: "group", fieldType: "nominal",
    scale: {
      id: "shape-scale", type: "ordinal", domain: "auto", range: "auto", unknown: "circle"
    }
  });
  next = positionedPoint(next, "shape-diamond", "diamond").encodeShape({
    target: "shape-diamond", field: "group", fieldType: "nominal",
    scale: {
      id: "shape-diamond-scale", type: "ordinal", domain: "auto", range: "auto",
      unknown: "diamond"
    }
  });
  next = positionedPoint(next, "opacity-value").encodeOpacity({
    target: "opacity-value", value: 0.55
  });
  for (const [index, type] of QUANTITATIVE_TYPES.entries()) {
    const id = `stroke-width-${type}`;
    next = positionedLine(next, id).encodeStrokeWidth({
      target: id, field: "seriesWidth", fieldType: "quantitative",
      scale: quantitativeScale(type, `${id}-scale`, index, { point: false })
    });
  }
  next = next.createRuleMark({ id: "stroke-width-value", data: "analysisRows" })
    .encodeX({
      target: "stroke-width-value",
      coordinate: "stroke-width-value-coordinate",
      field: "lowerX",
      fieldType: "quantitative",
      scale: { id: "stroke-width-value-x", zero: false }
    })
    .encodeX2({
      target: "stroke-width-value",
      field: "upperX",
      fieldType: "quantitative"
    })
    .encodeY({
      target: "stroke-width-value",
      coordinate: "stroke-width-value-coordinate",
      field: "y",
      fieldType: "quantitative",
      scale: { id: "stroke-width-value-y", zero: false }
    })
    .encodeStrokeWidth({ target: "stroke-width-value", value: 2.5 });
  const dashField = "stroke-dash-field";
  next = next.createLineMark({ id: dashField, data: "analysisRows" })
    .encodeX({
      target: dashField, coordinate: `${dashField}-coordinate`,
      field: "x", scale: { id: `${dashField}-x`, zero: false }
    })
    .encodeY({
      target: dashField, coordinate: `${dashField}-coordinate`,
      field: "y", scale: { id: `${dashField}-y`, zero: false }
    })
    .encodeStrokeDash({
      target: dashField, field: "group", fieldType: "nominal",
      scale: { id: "stroke-dash-scale", type: "ordinal", domain: "auto", range: "auto" }
    });
  for (const value of ["solid", "dashed", "dotted", "dashdot"]) {
    const id = `stroke-dash-${value}`;
    next = next.createLineMark({ id, data: "analysisRows" })
      .encodeX({
        target: id, coordinate: `${id}-coordinate`,
        field: "x", scale: { id: `${id}-x`, zero: false }
      })
      .encodeY({
        target: id, coordinate: `${id}-coordinate`,
        field: "y", scale: { id: `${id}-y`, zero: false }
      })
      .encodeStrokeDash({ target: id, value });
  }
  next = positionedPoint(next, "angle-field", "square")
    .encodeAngle({ target: "angle-field", field: "angle", fieldType: "quantitative" });
  next = positionedPoint(next, "angle-value", "diamond")
    .encodeAngle({ target: "angle-value", value: 35 });
  next = next.createTextMark({ id: "text-field", data: "analysisRows", fontSize: 10 })
    .encodeX({
      target: "text-field", coordinate: "text-field-coordinate",
      field: "x", scale: { id: "text-field-x", zero: false }
    })
    .encodeY({
      target: "text-field", coordinate: "text-field-coordinate",
      field: "y", scale: { id: "text-field-y", zero: false }
    })
    .encodeText({ target: "text-field", field: "label", format: "auto" });
  return next.createTextMark({ id: "text-value", data: "analysisRows", fontSize: 10 })
    .encodeX({
      target: "text-value", coordinate: "text-value-coordinate",
      field: "x", scale: { id: "text-value-x", zero: false }
    })
    .encodeY({
      target: "text-value", coordinate: "text-value-coordinate",
      field: "y", scale: { id: "text-value-y", zero: false }
    })
    .encodeText({ target: "text-value", value: "Authentic observation", format: "auto" });
}

function buildAppearanceCoverage(factors) {
  const view = encodingView(factors.dataset, [
    { op: "direct-appearance-encoding-exercise", actions: APPEARANCE_ACTIONS },
    { op: "kernel-density-estimate", field: "x", groupBy: "group", steps: 32 }
  ]);
  let program = addColorScales(programFor(view));
  program = addColorAggregatesAndLayouts(program);
  program = addAppearanceEncodings(program);
  return finish(program, factors, "direct-appearance-encoding-options");
}

function polarPoint(program, id, theta, radius) {
  return program.createPointMark({ id, data: "analysisRows" })
    .encodeTheta({ target: id, coordinate: `${id}-coordinate`, ...theta })
    .encodeR({ target: id, coordinate: `${id}-coordinate`, ...radius });
}

function buildPolarCoverage(factors) {
  const view = encodingView(factors.dataset, [{
    op: "direct-polar-encoding-exercise",
    actions: POLAR_ACTIONS
  }]);
  let program = programFor(view);
  const thetaVariants = [
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
  for (const aggregate of ["count", "sum"]) {
    const id = `theta-aggregate-${aggregate}`;
    program = program.createArcMark({ id, data: "analysisRows", innerRadius: 0.3 })
      .encodeTheta({
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
  return new Set((program.trace.children ?? []).map(entry => entry.op));
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
    expectedDirectActions: actions,
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
  ...POLAR_ACTIONS
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
