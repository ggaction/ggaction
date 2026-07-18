import { chart } from "../../../src/index.js";
import {
  mapSequentialColors,
  resolveSequentialColorStops
} from "../../../src/grammar/scales.js";
import { attachSnapshotObject } from
  "../../../src/materialization/composition.js";
import { namespaceGraphicSnapshot } from
  "../../../src/materialization/compositionSnapshot.js";
import { linearPathCommands } from "../../support/path.js";

import {
  CELL_SIZE,
  createGapminderRegressionFacetValues
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

function cellProgram(cell, values) {
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
  program = graphic(program, "axisLines", "line", {
    x1: [plot.x, plot.x],
    y1: [plot.y + plot.height, plot.y],
    x2: [plot.x + plot.width, plot.x],
    y2: [plot.y + plot.height, plot.y + plot.height],
    stroke: "#64748b",
    strokeWidth: 1.2,
    opacity: 1
  }, { length: 2 });
  program = graphic(program, "xTicks", "line", {
    x1: xTicks.map(tick => tick.position),
    y1: xTicks.map(() => plot.y + plot.height),
    x2: xTicks.map(tick => tick.position),
    y2: xTicks.map(() => plot.y + plot.height + 4),
    stroke: "#64748b",
    strokeWidth: 1,
    opacity: 1
  });
  program = graphic(program, "yTicks", "line", {
    x1: yTicks.map(() => plot.x - 4),
    y1: yTicks.map(tick => tick.position),
    x2: yTicks.map(() => plot.x),
    y2: yTicks.map(tick => tick.position),
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
  return graphic(program, "yTitle", "text", {
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
      `Cluster ${cell.cluster}`,
      cell.x + cell.width / 2,
      cell.y + 10,
      { fontSize: 12.5, fontWeight: 700, textBaseline: "top" }
    ))
  });
  program = graphic(program, "chartTitle", "text", {
    x: values.width / 2,
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
    x: values.width / 2,
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
