import { chart } from "../../../src/index.js";
import { attachSnapshotObject } from
  "../../../src/materialization/composition.js";
import { namespaceGraphicSnapshot } from
  "../../../src/materialization/compositionSnapshot.js";

import { createDirectFacetGateValues } from "./reference-values.js";

const STRONG_TEXT = "#0f172a";
const SUBTLE_TEXT = "#64748b";
const FONT_FAMILY = "sans-serif";

function completeParent(width, height) {
  return chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: width })
    .editGraphics({ target: "canvas", property: "height", value: height })
    .editGraphics({ target: "canvas", property: "background", value: "white" });
}

function attachChild(program, child, cell) {
  const index = Number(cell.id.slice("cell-".length));
  const snapshot = namespaceGraphicSnapshot(child.graphicSpec, {
    namespace: `facet-facet-cell-${index + 1}`,
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
      text: String(text),
      fill: options.fill ?? STRONG_TEXT,
      fontSize: options.fontSize ?? 12,
      fontFamily: FONT_FAMILY,
      fontWeight: options.fontWeight ?? "normal",
      textAlign: options.textAlign ?? "left",
      textBaseline: options.textBaseline ?? "middle"
    }
  };
}

function addHeaders(program, cells, options = {}) {
  return program
    .createGraphics({ id: "facet-headers", type: "collection", parent: "canvas" })
    .editGraphics({
      target: "facet-headers",
      property: "items",
      value: cells.map(cell => textItem(
        cell.value,
        cell.x + cell.width / 2,
        cell.y + (options.offset ?? 10),
        {
          fontSize: options.fontSize ?? 12,
          fontWeight: options.fontWeight ?? 600,
          textAlign: "center",
          textBaseline: "top"
        }
      ))
    });
}

function symbolItem(type, x, y, fill) {
  return type === "circle"
    ? {
        type: "circle",
        properties: {
          x: x + 7,
          y,
          radius: 5.5,
          fill,
          stroke: "#ffffff",
          strokeWidth: 0.35,
          opacity: 1
        }
      }
    : {
        type: "rect",
        properties: {
          x: x + 1,
          y: y - 6,
          width: 12,
          height: 12,
          fill,
          stroke: "#ffffff",
          strokeWidth: 0.6,
          opacity: 1
        }
      };
}

function addLegend(program, { x, y, domain, colors, symbol }) {
  const items = [textItem("Cylinders", x, y, {
    fontSize: 12,
    fontWeight: 700,
    textBaseline: "top"
  })];
  domain.forEach((value, index) => {
    const itemY = y + 29 + index * 26;
    items.push(symbolItem(symbol, x, itemY, colors[index]));
    items.push(textItem(value, x + 22, itemY, { fontSize: 10.5 }));
  });
  return program
    .createGraphics({ id: "facet-legend", type: "collection", parent: "canvas" })
    .editGraphics({ target: "facet-legend", property: "items", value: items });
}

function setTextGraphic(program, id, properties) {
  let next = program.createGraphics({ id, type: "text", parent: "canvas" });
  for (const [property, value] of Object.entries(properties)) {
    next = next.editGraphics({ target: id, property, value });
  }
  return next;
}

function addTitle(program, x, text) {
  const common = {
    x,
    fontFamily: FONT_FAMILY,
    textAlign: "center",
    textBaseline: "middle"
  };
  return setTextGraphic(program, "chartTitle", {
    ...common,
    y: 19,
    text,
    fill: STRONG_TEXT,
    fontSize: 22,
    fontWeight: 600
  });
}

function addSubtitle(program, x) {
  return setTextGraphic(program, "chartSubtitle", {
    x,
    y: 45,
    text: "Faceted by Origin",
    fill: SUBTLE_TEXT,
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: "normal",
    textAlign: "center",
    textBaseline: "middle"
  });
}

function scatterCell(rows, values) {
  return chart()
    .createCanvas({
      width: 250,
      height: 230,
      margin: { top: 34, right: 16, bottom: 48, left: 52 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({
      field: "Horsepower",
      scale: { domain: [40, 250], nice: true, zero: false }
    })
    .encodeY({
      field: "Miles_per_Gallon",
      scale: { domain: [0, 50], nice: true, zero: false }
    })
    .encodeRadius({ value: 2.5 })
    .encodeColor({
      field: "Cylinders",
      fieldType: "ordinal",
      scale: { domain: values.cylinders, range: values.colorRange }
    })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon", offset: 39 } }
      },
      legend: false
    });
}

function histogramCell(rows, values) {
  return chart()
    .createCanvas({
      width: 280,
      height: 240,
      margin: { top: 34, right: 18, bottom: 50, left: 52 }
    })
    .createData({ values: rows })
    .createBarMark()
    .encodeHistogram({
      field: "Displacement",
      binBoundaries: values.histogram.boundaries,
      xScale: { domain: [50, 500], nice: true, zero: false },
      yScale: { domain: [0, 60] }
    })
    .encodeColor({
      field: "Cylinders",
      fieldType: "ordinal",
      scale: { domain: values.cylinders, range: values.colorRange }
    })
    .createGuides({
      axes: {
        x: { title: { text: "Displacement" } },
        y: { title: { text: "Count", offset: 39 } }
      },
      legend: false,
      grid: { horizontal: true, vertical: false }
    });
}

export function createCarsOriginScatterplotFacetPrimitives(cars) {
  const values = createDirectFacetGateValues(cars);
  let program = completeParent(values.scatter.width, values.scatter.height);
  for (const cell of values.scatter.cells) {
    program = attachChild(program, scatterCell(cell.rows, values), cell);
  }
  program = addHeaders(program, values.scatter.cells, {
    fontSize: 13,
    fontWeight: 700,
    offset: 10
  });
  program = addLegend(program, {
    x: values.scatter.width - 132,
    y: 82,
    domain: values.cylinders,
    colors: values.colorRange,
    symbol: "circle"
  });
  program = addTitle(
    program,
    values.scatter.plot.x + values.scatter.plot.width / 2,
    "Horsepower and Fuel Economy"
  );
  return addSubtitle(program, values.scatter.plot.x + values.scatter.plot.width / 2);
}

export function createCarsOriginHistogramFacetPrimitives(cars) {
  const values = createDirectFacetGateValues(cars);
  let program = completeParent(values.histogram.width, values.histogram.height);
  for (const cell of values.histogram.cells) {
    program = attachChild(program, histogramCell(cell.rows, values), cell);
  }
  program = addHeaders(program, values.histogram.cells);
  program = addLegend(program, {
    x: values.histogram.width - 132,
    y: 96,
    domain: values.cylinders,
    colors: values.colorRange,
    symbol: "rect"
  });
  program = addTitle(
    program,
    values.histogram.plot.x + values.histogram.plot.width / 2,
    "Displacement Distribution"
  );
  return addSubtitle(
    program,
    values.histogram.plot.x + values.histogram.plot.width / 2
  );
}
