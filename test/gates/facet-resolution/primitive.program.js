import { chart } from "../../../src/index.js";
import {
  mapSequentialColors,
  resolveSequentialColorStops
} from "../../../src/grammar/scales/index.js";
import { attachSnapshotObject } from
  "../../../src/materialization/composition.js";
import { namespaceGraphicSnapshot } from
  "../../../src/materialization/compositionSnapshot.js";
import { linearPathCommands } from "../../support/path.js";

import {
  CELL_SIZE,
  createGapminderRegressionFacetValues,
  OUTER_GUIDE_CLUSTERS,
  OUTER_GUIDE_LAYOUT
} from "./reference-values.js";

const FONT = "sans-serif";

function setProperties(program, id, properties) {
  let next = program;
  for (const [property, value] of Object.entries(properties)) {
    next = next.editGraphics({ target: id, property, value });
  }
  return next;
}

function graphic(program, id, type, properties, options = {}) {
  const length = options.length ?? (["path", "collection", "canvas"].includes(type)
    ? undefined
    : (
    Array.isArray(Object.values(properties)[0])
      ? Object.values(properties)[0].length
      : undefined
    ));
  const placement = Object.hasOwn(options, "parent")
    ? options.parent === undefined ? {} : { parent: options.parent }
    : { parent: "canvas" };
  const next = program.createGraphics({
    id,
    type,
    ...(length === undefined || length === 1 ? {} : { length }),
    ...placement
  });
  return setProperties(next, id, properties);
}

function cellProgram(cell, values, { xAxis = true, yAxis = true } = {}) {
  const stops = resolveSequentialColorStops({ palette: "viridis" });
  const fills = mapSequentialColors(
    cell.points.map(point => point.pop),
    values.shared.color,
    stops
  );
  const xTicks = cell.ticks.x;
  const yTicks = cell.ticks.y;
  const plot = values.bounds;
  let program = graphic(chart(), "canvas", "canvas", {
    width: CELL_SIZE.width,
    height: CELL_SIZE.height,
    background: "white"
  }, { parent: undefined });
  program = graphic(program, "horizontalGrid", "line", {
    x1: yTicks.map(() => plot.x),
    y1: yTicks.map(tick => tick.position),
    x2: yTicks.map(() => plot.x + plot.width),
    y2: yTicks.map(tick => tick.position),
    stroke: "#e2e8f0",
    strokeWidth: 1,
    opacity: 1
  });
  program = graphic(program, "regressionBand", "path", {
    commands: linearPathCommands(cell.band, { close: true }),
    fill: "#111111",
    opacity: 0.14
  });
  program = graphic(program, "points", "circle", {
    x: cell.points.map(point => point.x),
    y: cell.points.map(point => point.y),
    radius: 2.5,
    fill: fills,
    opacity: 0.35
  }, { length: cell.points.length });
  program = graphic(program, "regressionLine", "path", {
    commands: linearPathCommands(cell.line),
    stroke: "#111827",
    strokeWidth: 2.5,
    strokeDash: [],
    opacity: 1
  });
  const axisLines = [
    ...(xAxis ? [{
      x1: plot.x,
      y1: plot.y + plot.height,
      x2: plot.x + plot.width,
      y2: plot.y + plot.height
    }] : []),
    ...(yAxis ? [{
      x1: plot.x,
      y1: plot.y,
      x2: plot.x,
      y2: plot.y + plot.height
    }] : [])
  ];
  if (axisLines.length > 0) {
    const lineProperties = axisLines.length === 1
      ? axisLines[0]
      : Object.fromEntries(["x1", "y1", "x2", "y2"].map(property => [
          property,
          axisLines.map(line => line[property])
        ]));
    program = graphic(program, "axisLines", "line", {
      ...lineProperties,
      stroke: "#64748b",
      strokeWidth: 1.2,
      opacity: 1
    }, { length: axisLines.length });
  }
  if (xAxis) {
    program = graphic(program, "xTicks", "line", {
      x1: xTicks.map(tick => tick.position),
      y1: xTicks.map(() => plot.y + plot.height),
      x2: xTicks.map(tick => tick.position),
      y2: xTicks.map(() => plot.y + plot.height + 4),
      stroke: "#64748b",
      strokeWidth: 1,
      opacity: 1
    });
    program = graphic(program, "xLabels", "text", {
      x: xTicks.map(tick => tick.position),
      y: xTicks.map(() => plot.y + plot.height + 9),
      text: xTicks.map(tick => String(tick.value)),
      fill: "#334155",
      fontSize: 9.5,
      fontFamily: FONT,
      fontWeight: "normal",
      textAlign: "center",
      textBaseline: "top",
      rotation: 0,
      opacity: 1
    });
    program = graphic(program, "xTitle", "text", {
      x: plot.x + plot.width / 2,
      y: CELL_SIZE.height - 10,
      text: "Fertility",
      fill: "#0f172a",
      fontSize: 11,
      fontFamily: FONT,
      fontWeight: 500,
      textAlign: "center",
      textBaseline: "middle"
    });
  }
  if (yAxis) {
    program = graphic(program, "yTicks", "line", {
      x1: yTicks.map(() => plot.x - 4),
      y1: yTicks.map(tick => tick.position),
      x2: yTicks.map(() => plot.x),
      y2: yTicks.map(tick => tick.position),
      stroke: "#64748b",
      strokeWidth: 1,
      opacity: 1
    });
    program = graphic(program, "yLabels", "text", {
      x: yTicks.map(() => plot.x - 8),
      y: yTicks.map(tick => tick.position),
      text: yTicks.map(tick => String(tick.value)),
      fill: "#334155",
      fontSize: 9.5,
      fontFamily: FONT,
      fontWeight: "normal",
      textAlign: "right",
      textBaseline: "middle",
      rotation: 0,
      opacity: 1
    });
    program = graphic(program, "yTitle", "text", {
      x: 13,
      y: plot.y + plot.height / 2,
      text: "Life expectancy",
      fill: "#0f172a",
      fontSize: 11,
      fontFamily: FONT,
      fontWeight: 500,
      textAlign: "center",
      textBaseline: "middle",
      rotation: -Math.PI / 2
    });
  }
  return program;
}

function attachCell(program, child, cell) {
  const snapshot = namespaceGraphicSnapshot(child.graphicSpec, {
    namespace: `cluster-facet-${cell.id}`,
    x: cell.x,
    y: cell.y
  });
  return attachSnapshotObject(program, snapshot, snapshot.order[0], "canvas");
}

function textItem(text, x, y, options = {}) {
  return {
    type: "text",
    properties: {
      x,
      y,
      text,
      fill: options.fill ?? "#0f172a",
      fontSize: options.fontSize ?? 12,
      fontFamily: FONT,
      fontWeight: options.fontWeight ?? "normal",
      textAlign: options.textAlign ?? "center",
      textBaseline: options.textBaseline ?? "middle"
    }
  };
}

function outerAxisOwners(cells) {
  const xByColumn = new Map();
  const yByRow = new Map();
  for (const cell of cells) {
    if (!xByColumn.has(cell.column) || cell.row > xByColumn.get(cell.column).row) {
      xByColumn.set(cell.column, cell);
    }
    if (!yByRow.has(cell.row) || cell.column < yByRow.get(cell.row).column) {
      yByRow.set(cell.row, cell);
    }
  }
  return {
    x: new Set([...xByColumn.values()].map(cell => cell.id)),
    y: new Set([...yByRow.values()].map(cell => cell.id))
  };
}

function compactPopulation(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

function addPopulationLegend(program, values) {
  const layout = OUTER_GUIDE_LAYOUT;
  const x = values.width + layout.legendGap;
  const y = values.plot.y + (values.plot.height - layout.gradientHeight) / 2;
  const ratios = Array.from(
    { length: layout.gradientSteps },
    (_, index) => 1 - (index + 0.5) / layout.gradientSteps
  );
  const fills = mapSequentialColors(
    ratios,
    [0, 1],
    resolveSequentialColorStops({ palette: "viridis" })
  );
  const stripHeight = layout.gradientHeight / layout.gradientSteps;
  let next = graphic(program, "populationGradientStrips", "rect", {
    x: ratios.map(() => x),
    y: ratios.map((_, index) => y + index * stripHeight),
    width: layout.gradientWidth,
    height: stripHeight,
    fill: fills,
    stroke: fills,
    strokeWidth: 0,
    opacity: 1
  }, { length: layout.gradientSteps });
  const [minimum, maximum] = values.shared.color;
  const tickValues = Array.from(
    { length: 5 },
    (_, index) => minimum + index / 4 * (maximum - minimum)
  );
  const tickY = tickValues.map(
    (_, index) => y + layout.gradientHeight * (1 - index / 4)
  );
  next = graphic(next, "populationGradientTicks", "line", {
    x1: tickValues.map(() => x + layout.gradientWidth),
    y1: tickY,
    x2: tickValues.map(() => x + layout.gradientWidth + 6),
    y2: tickY,
    stroke: "#64748b",
    strokeWidth: 1,
    opacity: 1
  }, { length: tickValues.length });
  next = graphic(next, "populationGradientLabels", "text", {
    x: tickValues.map(() => x + layout.gradientWidth + 9),
    y: tickY,
    text: tickValues.map(compactPopulation),
    fill: "#334155",
    fontSize: 10,
    fontFamily: FONT,
    fontWeight: "normal",
    textAlign: "left",
    textBaseline: "middle",
    rotation: 0,
    opacity: 1
  }, { length: tickValues.length });
  return graphic(next, "populationGradientTitle", "text", {
    x,
    y: y - 18,
    text: "pop",
    fill: "#0f172a",
    fontSize: 11,
    fontFamily: FONT,
    fontWeight: 600,
    textAlign: "left",
    textBaseline: "middle"
  });
}

export function createGapminderRegressionFacetPrimitives(rows, options = {}) {
  const values = createGapminderRegressionFacetValues(rows, options);
  let program = graphic(chart(), "canvas", "canvas", {
    width: values.width,
    height: values.height,
    background: "white"
  }, { parent: undefined });
  for (const cell of values.cells) {
    program = attachCell(program, cellProgram(cell, values), cell);
  }
  program = graphic(program, "facetHeaders", "collection", {
    items: values.cells.map(cell => textItem(
      String(cell.cluster),
      cell.x + values.bounds.x + values.bounds.width / 2,
      cell.y + 10,
      { fontSize: 12.5, fontWeight: 700, textBaseline: "top" }
    ))
  });
  program = graphic(program, "chartTitle", "text", {
    x: values.plot.x + values.plot.width / 2,
    y: 19,
    text: "Fertility and Life Expectancy",
    fill: "#0f172a",
    fontSize: 19,
    fontFamily: FONT,
    fontWeight: 600,
    textAlign: "center",
    textBaseline: "middle"
  });
  return graphic(program, "chartSubtitle", "text", {
    x: values.plot.x + values.plot.width / 2,
    y: 43,
    text: options.xResolution === "independent"
      ? "Regression recomputed by cluster · independent fertility scales"
      : "Regression recomputed by cluster · shared scales",
    fill: "#64748b",
    fontSize: 12,
    fontFamily: FONT,
    fontWeight: "normal",
    textAlign: "center",
    textBaseline: "middle"
  });
}

export function createGapminderOuterGuideFacetPrimitives(rows) {
  const values = createGapminderRegressionFacetValues(rows, {
    xResolution: "independent",
    clusters: OUTER_GUIDE_CLUSTERS
  });
  const owners = outerAxisOwners(values.cells);
  const width = values.width + OUTER_GUIDE_LAYOUT.legendGap +
    OUTER_GUIDE_LAYOUT.legendWidth;
  let program = graphic(chart(), "canvas", "canvas", {
    width,
    height: values.height,
    background: "white"
  }, { parent: undefined });
  for (const cell of values.cells) {
    program = attachCell(program, cellProgram(cell, values, {
      xAxis: owners.x.has(cell.id),
      yAxis: owners.y.has(cell.id)
    }), cell);
  }
  program = graphic(program, "facetHeaders", "collection", {
    items: values.cells.map(cell => textItem(
      String(cell.cluster),
      cell.x + values.bounds.x + values.bounds.width / 2,
      cell.y + 10,
      { fontSize: 12.5, fontWeight: 700, textBaseline: "top" }
    ))
  });
  program = addPopulationLegend(program, values);
  program = graphic(program, "chartTitle", "text", {
    x: values.plot.x + values.plot.width / 2,
    y: 19,
    text: "Fertility and Life Expectancy",
    fill: "#0f172a",
    fontSize: 19,
    fontFamily: FONT,
    fontWeight: 600,
    textAlign: "center",
    textBaseline: "middle"
  });
  return graphic(program, "chartSubtitle", "text", {
    x: values.plot.x + values.plot.width / 2,
    y: 43,
    text: "Regression by cluster · outer axes · shared population legend",
    fill: "#64748b",
    fontSize: 12,
    fontFamily: FONT,
    fontWeight: "normal",
    textAlign: "center",
    textBaseline: "middle"
  });
}
