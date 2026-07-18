import { action, ChartProgram } from "ggaction/extension";

const ORIGIN_FILTER = Object.freeze({
  field: "Origin",
  op: "oneOf",
  values: Object.freeze(["Japan", "USA"])
});

const JAPAN_HIGHLIGHT = "#c65d00";
const REGRESSION_HIGHLIGHT = "#111827";

export const README_ACTION_LINES = Object.freeze([
  Object.freeze({ id: "canvas", code: ".createCanvas(...)" }),
  Object.freeze({ id: "data", code: ".createData(...)" }),
  Object.freeze({ id: "point", code: ".createPointMark(...)" }),
  Object.freeze({ id: "x", code: ".encodeX(...)" }),
  Object.freeze({ id: "y", code: ".encodeY(...)" }),
  Object.freeze({ id: "size", code: ".encodeSize(...)" }),
  Object.freeze({
    id: "guides",
    code: ".createGuides(...)"
  }),
  Object.freeze({ id: "color", code: ".encodeColor(...)" }),
  Object.freeze({ id: "shape", code: ".encodeShape(...)" }),
  Object.freeze({ id: "opacity", code: ".encodeOpacity(...)" }),
  Object.freeze({ id: "legend", code: ".createLegend()" }),
  Object.freeze({ id: "filter", code: ".filterMarks(...)" }),
  Object.freeze({ id: "regression", code: ".createRegression(...)" }),
  Object.freeze({ id: "highlight", code: ".highlightMarks(...)" }),
  Object.freeze({
    id: "annotation",
    code: ".annotateRegressionFit(...);"
  })
]);

export const README_STAGE_IDS = Object.freeze(
  README_ACTION_LINES.map(actionLine => actionLine.id)
);

const STAGE_DELAYS = Object.freeze([
  300,
  300,
  300,
  300,
  300,
  500,
  800,
  800,
  700,
  600,
  900,
  800,
  1800,
  1900,
  4700
]);

function finiteRows(rows, x, y) {
  return rows.filter(row => Number.isFinite(row[x]) && Number.isFinite(row[y]));
}

export function computeRegressionRSquared(rows, { x, y } = {}) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("R-squared requires at least two rows.");
  }
  if (typeof x !== "string" || typeof y !== "string") {
    throw new Error("R-squared requires x and y field names.");
  }
  const values = finiteRows(rows, x, y);
  if (values.length < 2) {
    throw new Error("R-squared requires at least two finite observations.");
  }

  const xMean = values.reduce((sum, row) => sum + row[x], 0) / values.length;
  const yMean = values.reduce((sum, row) => sum + row[y], 0) / values.length;
  const xVariance = values.reduce(
    (sum, row) => sum + ((row[x] - xMean) ** 2),
    0
  );
  const totalSumOfSquares = values.reduce(
    (sum, row) => sum + ((row[y] - yMean) ** 2),
    0
  );
  if (xVariance === 0 || totalSumOfSquares === 0) {
    return undefined;
  }

  const covariance = values.reduce(
    (sum, row) => sum + ((row[x] - xMean) * (row[y] - yMean)),
    0
  );
  const slope = covariance / xVariance;
  const intercept = yMean - (slope * xMean);
  const residualSumOfSquares = values.reduce((sum, row) => {
    const residual = row[y] - (intercept + (slope * row[x]));
    return sum + (residual ** 2);
  }, 0);
  return 1 - (residualSumOfSquares / totalSumOfSquares);
}

export function formatRegressionRSquared(value) {
  return value === undefined ? "R² = n/a" : `R² = ${value.toFixed(2)}`;
}

function requireRegressionConfig(program, target) {
  const config = program.materializationConfigs.marks?.[target]?.regression;
  if (config === undefined) {
    throw new Error(`No regression is owned by mark "${target}".`);
  }
  return config;
}

function requireDataset(program, id) {
  const dataset = program.semanticSpec.datasets.find(candidate => candidate.id === id);
  if (dataset === undefined) {
    throw new Error(`Unknown annotation dataset "${id}".`);
  }
  return dataset;
}

function highlightedLineAnchor(program, id) {
  const line = program.graphicSpec.objects[id];
  const matches = line?.items?.filter(
    item => item.properties.stroke === REGRESSION_HIGHLIGHT
  ) ?? [];
  if (matches.length !== 1) {
    throw new Error("Regression annotation requires one highlighted line.");
  }
  const commands = matches[0].properties.commands;
  const anchor = commands[Math.floor(commands.length * 0.6)];
  if (!Number.isFinite(anchor?.x) || !Number.isFinite(anchor?.y)) {
    throw new Error("Regression annotation requires a concrete line anchor.");
  }
  return anchor;
}

export class ReadmeDemoProgram extends ChartProgram {}

ReadmeDemoProgram.prototype.annotateRegressionFit = action(
  {
    op: "annotateRegressionFit",
    description: "Annotate one regression group with its R-squared value."
  },
  function ({ target = "points", group = "Japan" } = {}) {
    const regression = requireRegressionConfig(this, target);
    if (typeof regression.groupBy !== "string") {
      throw new Error("Regression annotation requires a grouped regression.");
    }
    const dataset = requireDataset(this, regression.source);
    const rows = dataset.values.filter(
      row => row[regression.groupBy] === group
    );
    const rSquared = computeRegressionRSquared(rows, {
      x: regression.x,
      y: regression.y
    });
    if (rSquared === undefined) {
      throw new Error("Regression annotation requires non-zero x and y variance.");
    }

    const anchor = highlightedLineAnchor(this, regression.lineId);
    const textId = "readmeFitAnnotationText";
    return this
      .createGraphics({
        id: textId,
        type: "text",
        length: 1,
        parent: "canvas"
      })
      .editGraphics({ target: textId, property: "x", value: anchor.x + 12 })
      .editGraphics({ target: textId, property: "y", value: anchor.y - 12 })
      .editGraphics({
        target: textId,
        property: "text",
        value: formatRegressionRSquared(rSquared)
      })
      .editGraphics({ target: textId, property: "fill", value: "#111827" })
      .editGraphics({ target: textId, property: "fontSize", value: 13 })
      .editGraphics({ target: textId, property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: textId, property: "fontWeight", value: 700 })
      .editGraphics({ target: textId, property: "textAlign", value: "left" })
      .editGraphics({ target: textId, property: "textBaseline", value: "bottom" });
  }
);

export function createReadmeDemoProgram() {
  return new ReadmeDemoProgram();
}

function addStage(stages, definition, apply) {
  const previous = stages.at(-1)?.program ?? createReadmeDemoProgram();
  const previousSnapshot = JSON.stringify(previous);
  const program = apply(previous);
  if (JSON.stringify(previous) !== previousSnapshot) {
    throw new Error(`Stage "${definition.id}" mutated the earlier program.`);
  }
  if (program === previous || !Object.isFrozen(program)) {
    throw new Error(`Stage "${definition.id}" must return a new frozen program.`);
  }
  stages.push(Object.freeze({
    ...definition,
    actionIndex: stages.length,
    delayMs: STAGE_DELAYS[stages.length],
    program
  }));
}

export function createReadmeAuthoringStages(cars) {
  if (!Array.isArray(cars)) {
    throw new TypeError("README authoring stages require cars rows.");
  }
  const stages = [];
  addStage(stages, {
    id: "canvas",
    label: "createCanvas",
    renderable: true
  }, program => program.createCanvas({
    width: 540,
    height: 430,
    margin: { top: 44, right: 124, bottom: 62, left: 62 }
  }));
  addStage(stages, {
    id: "data",
    label: "createData",
    renderable: true,
    rowCount: cars.length
  }, program => program.createData({ id: "cars", values: cars }));
  addStage(stages, {
    id: "point",
    label: "createPointMark",
    renderable: false
  }, program => program.createPointMark({ id: "points" }));
  addStage(stages, {
    id: "x",
    label: "encodeX",
    renderable: false
  }, program => program.encodeX({
    field: "Displacement",
    scale: { nice: true, zero: false }
  }));
  addStage(stages, {
    id: "y",
    label: "encodeY",
    renderable: false
  }, program => program.encodeY({
    field: "Acceleration",
    scale: { nice: true, zero: false }
  }));
  addStage(stages, {
    id: "size",
    label: "encodeSize",
    renderable: true
  }, program => program.encodeSize({ field: "Acceleration" }));
  addStage(stages, {
    id: "guides",
    label: "createGuides",
    renderable: true
  }, program => program.createGuides({
    axes: {
      x: { title: { text: "Displacement" } },
      y: { title: { text: "Acceleration" } }
    },
    legend: false
  }));
  addStage(stages, {
    id: "color",
    label: "encodeColor",
    renderable: true
  }, program => program.encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  }));
  addStage(stages, {
    id: "shape",
    label: "encodeShape",
    renderable: true
  }, program => program.encodeShape({ field: "Origin" }));
  addStage(stages, {
    id: "opacity",
    label: "encodeOpacity",
    renderable: true
  }, program => program.encodeOpacity({ value: 0.27 }));
  addStage(stages, {
    id: "legend",
    label: "createLegend",
    renderable: true
  }, program => program.createLegend());
  addStage(stages, {
    id: "filter",
    label: "filterMarks",
    renderable: true
  }, program => program.filterMarks(ORIGIN_FILTER));
  addStage(stages, {
    id: "regression",
    label: "createRegression",
    renderable: true,
    traceChildren: Object.freeze([
      "createRegressionData",
      "createRegressionBand",
      "createRegressionLine"
    ])
  }, program => program.createRegression({
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.16 },
    line: { strokeWidth: 3 }
  }));
  addStage(stages, {
    id: "highlight",
    label: "highlightMarks",
    renderable: true
  }, program => {
    const regression = requireRegressionConfig(program, "points");
    const select = { field: "Origin", op: "eq", value: "Japan" };
    return program
      .highlightMarks({
        target: "points",
        select,
        color: JAPAN_HIGHLIGHT,
        opacity: 1,
        size: 1.7,
        dimOthers: { opacity: 0.1 },
        bringToFront: true
      })
      .highlightMarks({
        target: regression.lineId,
        select,
        stroke: REGRESSION_HIGHLIGHT,
        strokeWidth: 5,
        opacity: 1,
        dimOthers: { opacity: 0.14 },
        bringToFront: true
      })
      .highlightMarks({
        target: regression.bandId,
        select,
        fill: JAPAN_HIGHLIGHT,
        opacity: 0.22,
        stroke: JAPAN_HIGHLIGHT,
        strokeWidth: 1,
        dimOthers: { opacity: 0.05 },
        bringToFront: true
      });
  });
  addStage(stages, {
    id: "annotation",
    label: "annotateRegressionFit",
    renderable: true
  }, program => program.annotateRegressionFit({ group: "Japan" }));

  return Object.freeze(stages);
}

export function createReadmeAuthoringDemo(cars) {
  const stages = createReadmeAuthoringStages(cars);
  return Object.freeze({ stages, finalProgram: stages.at(-1).program });
}
