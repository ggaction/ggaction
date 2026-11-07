import { ownArray, ownRecord } from "../core/ownData.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";
import { deriveSortedRows, normalizeSortTransform } from "./sort.js";
import { deriveSummaryRows, normalizeSummaryTransform } from "./summary.js";
import { formatTextValue } from "./text.js";
import { deriveLineSeries } from "./lineSeries.js";
import { resolveScaleDomain } from "./scales/continuous.js";

function scalar(value, column) {
  if (value === null || value === undefined || Number.isNaN(value)) return { value: null, text: column.missingText };
  if (!["string", "number", "boolean", "bigint"].includes(typeof value) || typeof value === "number" && !Number.isFinite(value)) throw new TypeError(`Table field "${column.field}" requires scalar values.`);
  if (column.cell.type === "bar" && !Number.isFinite(value)) throw new TypeError(`Table bar field "${column.field}" requires finite numeric values.`);
  return { value, text: formatTextValue(value, column.format) ?? "" };
}
function sparkline(value, column, state) {
  if (value === undefined || value === null) return { value: null, text: column.missingText, series: [], xValues: [], yValues: [] };
  ownArray(value, "Table sparkline values");
  validateGeneratedItemLimit(state.samples += value.length, "Table sparkline sample count");
  for (const row of value) ownRecord(row, "Table sparkline row");
  if (value.length === 0) return { value: [], text: column.missingText, series: [], xValues: [], yValues: [] };
  const cell = column.cell;
  const layer = { id: "table-sparkline", mark: { type: "line", missing: cell.missing }, encoding: {
    x: { field: cell.x, fieldType: cell.xType, ...(cell.temporalUnit === undefined ? {} : { temporalUnit: cell.temporalUnit }) },
    y: { field: cell.y, fieldType: "quantitative" }
  } };
  const derived = deriveLineSeries(value, layer);
  return { value, text: "", ...derived };
}
export function deriveTableData(rows, rowKeys, binding) {
  ownArray(rows, "Table rows"); ownArray(rowKeys, "Table row keys");
  validateGeneratedItemLimit(rows.length, "Table row count");
  if (rows.length !== rowKeys.length) throw new TypeError("Table row keys must match source rows.");
  const state = { samples: 0, work: rows.length * binding.columns.length };
  validateWorkLimit(state.work, "Table data work");
  for (const row of rows) ownRecord(row, "Table row");
  // Reuse the sort owner with one unique projection per source row, including
  // repeated references to an otherwise identical row object.
  let indices = rows.map((_row, index) => index);
  if (binding.sortBy.length) {
    const transform = normalizeSortTransform({ sortBy: binding.sortBy });
    const projections = rows.map(row => Object.fromEntries(transform.sortBy.map(sort => [sort.field, row[sort.field]])));
    const indexByProjection = new Map(projections.map((row, index) => [row, index]));
    indices = deriveSortedRows(projections, transform).map(row => indexByProjection.get(row));
  }
  const columns = binding.columns.map(column => {
    if (rows.length && !rows.some(row => Object.hasOwn(row, column.field))) throw new TypeError(`Table source does not contain field "${column.field}".`);
    const values = rows.map(row => column.cell.type === "sparkline" ? sparkline(row[column.field], column, state) : scalar(row[column.field], column));
    for (const item of values) validateWorkLimit(state.work += item.text.length, "Table data work");
    let aggregate;
    if (column.footer !== false) {
      const { op, missing, empty, format } = column.footer;
      // Normalize NaN to the same missing scalar displayed in body cells.
      const input = op === "count" ? rows : values.map(item => ({ value: item.value }));
      const result = deriveSummaryRows(input, normalizeSummaryTransform({ aggregates: [{ op, ...(op === "count" ? {} : { field: "value" }), as: "value" }], missing, empty }));
      const value = result.values[0]?.value ?? null;
      if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Table footer must remain finite.");
      aggregate = { value, text: value === null ? column.missingText : formatTextValue(value, format) ?? "", report: result.report.units[0] };
    }
    const finiteValues = values.flatMap(item => Number.isFinite(item.value) ? [item.value] : []);
    const extent = values => values.length ? resolveScaleDomain("auto", values) : undefined;
    const domains = column.cell.type === "bar" ? { value: column.cell.domain ?? extent([0, ...finiteValues]) }
      : column.cell.type === "sparkline" ? { x: column.cell.xDomain ?? extent(values.flatMap(item => item.xValues)),
        y: column.cell.yDomain ?? extent(values.flatMap(item => item.yValues)) } : {};
    return { values, aggregate, domains };
  });
  return { indices, columns, sourceRowCount: rows.length };
}
