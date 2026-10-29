import {createHash} from "node:crypto";
import {chart} from "../../../src/index.js";
import {realisticRecordView} from "./realistic-data.js";
import {realisticPaletteRange} from "./realistic-color-controls.js";

function provenanceFor(view, rows, transformations) {
  const indexes = [...new Set(rows.map(row => row.sourceRowIndex))].sort((a, b) => a - b);
  return {
    ...view.provenance,
    sourceRowCount: indexes.length,
    minimumSourceRow: indexes[0],
    maximumSourceRow: indexes.at(-1),
    sourceRowIndexes: indexes,
    sourceSelectionSha256: createHash("sha256").update(indexes.join(",")).digest("hex"),
    transformations: [...view.provenance.transformations, ...transformations]
  };
}

// These witnesses cover palette API paths, not financial or additive analyses.
// Every source measurement and row key is retained alongside explicitly derived
// positive values, interval roles and affine grid positions.
export function* realisticResourcePalettePrograms(dataset, ordinal) {
  const view = realisticRecordView(dataset, {rowLimit: 40, groupLimit: 4});
  const minIndex = Math.min(...view.rows.map(row => row.sourceRowIndex));
  const maxIndex = Math.max(...view.rows.map(row => row.sourceRowIndex));
  const minValue = Math.min(...view.rows.map(row => row.value));
  const maxValue = Math.max(...view.rows.map(row => row.value));
  const rows = view.rows.map(row => {
    const paletteValue = Math.abs(row.value) + 1;
    return {...row, paletteValue, paletteLower: paletteValue * .88,
      paletteUpper: paletteValue * 1.12,
      paletteX: (row.sourceRowIndex - minIndex) / (maxIndex - minIndex || 1),
      paletteY: (row.value - minValue) / (maxValue - minValue || 1),
      paletteStage: String(row.sourceRowIndex), paletteRole: "delta"};
  });
  const provenance = provenanceFor(view, rows, [{
    op: "project-palette-api-fields",
    positiveValue: "abs(value)+1",
    intervalRoles: {low: "0.88*positiveValue", open: "low", high: "1.12*positiveValue", close: "high"},
    contourX: {field: "sourceRowIndex", min: minIndex, max: maxIndex},
    contourY: {field: "value", min: minValue, max: maxValue},
    trail: {x: "paletteX", y: "paletteY", groupBy: "category", width: 8},
    waterfall: {stage: "sourceRowIndex", role: "delta", value: "positiveValue"},
    purpose: "generic palette API coverage; not financial-source evidence"
  }]);
  const range = realisticPaletteRange(ordinal);
  const base = (values = rows) => chart().createCanvas({width: 960, height: 1100, margin: 30})
    .createData({id: "analysisRows", values, keyField: "key"});

  // Bound the calendar by its most observed actual year, with chronological
  // tie-breaking. Recalculate lineage for that explicit selection.
  const years = new Map();
  for (const row of view.rows) {
    const year = row.time.slice(0, 4);
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(row);
  }
  const [year, calendarRows] = [...years].sort((a, b) =>
    b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
  yield {
    kind: "calendar", provenance: provenanceFor(view, calendarRows, [{
      op: "retain-most-observed-year", field: "time", year,
      tieBreak: "chronological", aggregate: "mean"
    }]),
    program: base(calendarRows)
      .createCalendarLayout({id: "days", data: "analysisRows", date: "time", value: "value",
        start: `${year}-01-01`, end: `${year}-12-31`, timeZone: "UTC",
        weekStartsOn: 0, aggregate: "mean", missing: "omit"})
      .createCalendarPlot({id: "calendar", layout: "days", labels: false,
        monthBoundary: false, color: {range}})
      .editCalendarPlot({target: "calendar", color: {range}})
  };

  yield {
    kind: "contour", provenance,
    program: base().createDensityContourData({id: "density", data: "analysisRows",
      x: "paletteX", y: "paletteY", grid: {origin: [0, 0], dx: .2, dy: .2, width: 6, height: 6},
      estimator: "kde", bandwidth: [.2, .2], kernel: "gaussian", normalization: "count",
      thresholds: [.1, 1, 4]})
      .createContourMark({id: "contours", geometry: "density", mode: "filled", color: {range}})
      .editContourMark({target: "contours", color: {range}})
  };

  const categorical = {field: "category", fieldType: "nominal", scale: {range}};
  yield {
    kind: "pyramid", provenance,
    program: base().createPyramidPlot({id: "stages", data: "analysisRows", stage: "category",
      value: "paletteValue", labels: false, color: categorical})
      .editPyramidPlot({target: "stages", color: categorical})
  };

  const continuous = {field: "paletteValue", fieldType: "quantitative", scale: {range}};
  yield {
    kind: "interval-roles", provenance,
    program: base().createOHLCPlot({id: "intervalRoles", data: "analysisRows",
      x: {field: "sourceRowIndex", fieldType: "quantitative"}, low: "paletteLower",
      open: "paletteLower", high: "paletteUpper", close: "paletteUpper",
      guides: false, color: continuous})
      .editOHLCPlot({target: "intervalRoles", color: continuous})
  };

  yield {
    kind: "contribution-roles", provenance,
    program: base().createWaterfallPlot({id: "steps", data: "analysisRows",
      x: "paletteStage", role: "paletteRole", value: "paletteValue", guides: false, color: continuous})
      .editWaterfallPlot({target: "steps", color: continuous})
  };

  yield {
    kind: "trail", provenance,
    program: base().createTrailPlot({id: "ribbons", data: "analysisRows",
      x: "paletteX", y: "paletteY", width: 8, groupBy: "category", guides: false,
      color: categorical})
      .editTrailPlot({target: "ribbons", color: categorical})
  };

  yield {
    kind: "table", provenance,
    program: base().createTablePlot({id: "records", data: "analysisRows", rowHeight: 20,
      columns: [{field: "category", width: 300}, {field: "value", width: 300, cell: "bar"}],
      color: categorical})
      .editTablePlot({target: "records", color: categorical})
  };

  const conditional = {
    conditions: [{when: {version: 2, registry: "standard@1",
      root: {type: "literal", value: false}}, value: {value: "#525252"}}],
    otherwise: continuous
  };
  yield {
    kind: "conditional-fallback", provenance,
    program: base().createScatterPlot({id: "fallback", data: "analysisRows",
      x: "paletteX", y: "paletteY", guides: false})
      .encodeColor({target: "fallback", ...conditional})
      .encodeStroke({target: "fallback", ...conditional})
  };
}
