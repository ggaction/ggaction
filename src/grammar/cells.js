import { cloneAndFreeze } from "../core/immutable.js";
import { encodeRowKey } from "../core/itemIdentity.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";

function positive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`Table ${name} must be positive and finite.`);
  return value;
}

export function normalizeTableLayoutOptions(input) {
  ownRecord(input, "Table layout options");
  rejectUnknownProperties(input, ["width", "rowHeight", "header", "footer", "rowLimit"], "table layout");
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError("Table layout options cannot contain null or undefined.");
  const result = { rowHeight: 24, header: true, footer: false, ...input };
  positive(result.width, "width");
  positive(result.rowHeight, "rowHeight");
  for (const key of ["header", "footer"]) {
    if (typeof result[key] !== "boolean") throw new TypeError(`Table ${key} must be boolean.`);
  }
  if (Object.hasOwn(result, "rowLimit") && (!Number.isSafeInteger(result.rowLimit) || result.rowLimit < 0)) {
    throw new RangeError("Table rowLimit must be a nonnegative safe integer.");
  }
  return cloneAndFreeze(result);
}

function array(input, label) {
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, label);
  return ownArray(input, label);
}

function keyed(input, fields, label, state) {
  const seen = new Set();
  return input.map(item => {
    ownRecord(item, label);
    rejectUnknownProperties(item, fields, label);
    const token = encodeRowKey(item.key);
    validateWorkLimit(state.work += token.length, "Table layout work");
    if (seen.has(token)) throw new TypeError(`${label} keys must be unique.`);
    seen.add(token);
    return token;
  });
}

// Intrinsic widths are already measured by the caller's exact text owner.
// This numeric kernel never estimates text metrics or chooses a data field.
function columnWidths(columns, available) {
  let remainder = available, maximum = 0;
  const auto = [], widths = columns.map((column, index) => {
    if (column.width === "auto") {
      if (!Number.isFinite(column.intrinsicWidth) || column.intrinsicWidth < 0) {
        throw new RangeError("Table auto columns require a nonnegative finite intrinsicWidth.");
      }
      maximum = Math.max(maximum, column.intrinsicWidth);
      auto.push(index);
      return 0;
    }
    if (Object.hasOwn(column, "intrinsicWidth")) throw new TypeError("Table fixed columns cannot specify intrinsicWidth.");
    const width = positive(column.width, "column width");
    remainder -= width;
    if (remainder < 0) throw new RangeError("Table fixed column widths exceed the available width.");
    return width;
  });
  const weight = index => maximum === 0 ? 1 : columns[index].intrinsicWidth / maximum;
  const totalWeight = auto.reduce((sum, index) => sum + weight(index), 0);
  let used = 0;
  auto.forEach((index, offset) => {
    const end = offset === auto.length - 1 ? remainder :
      Math.min(remainder, used + remainder * (weight(index) / totalWeight));
    widths[index] = end - used;
    used = end;
  });
  return widths;
}

export function layoutTableCells(rowsInput, columnsInput, intent) {
  const options = normalizeTableLayoutOptions(intent);
  const rows = array(rowsInput, "Table row count"), columns = array(columnsInput, "Table column count");
  if (columns.length === 0) throw new RangeError("Table requires at least one column.");
  const visibleRowCount = Math.min(rows.length, options.rowLimit ?? rows.length);
  const bands = visibleRowCount + Number(options.header) + Number(options.footer);
  validateGeneratedItemLimit(bands * columns.length, "Table cell count");
  const state = { work: (rows.length + columns.length + bands * columns.length) * 16 };
  validateWorkLimit(state.work, "Table layout work");
  const rowTokens = keyed(rows, ["key"], "Table row", state);
  const columnTokens = keyed(columns, ["key", "width", "intrinsicWidth"], "Table column", state);
  const widths = columnWidths(columns, options.width);
  const height = bands * options.rowHeight;
  if (!Number.isFinite(height)) throw new RangeError("Table height must remain finite.");
  const cells = [];
  const append = (role, rowIndex, band) => {
    let left = 0;
    columns.forEach((column, columnIndex) => {
      const right = Math.min(options.width, left + widths[columnIndex]);
      const key = JSON.stringify([role, rowIndex === null ? null : rowTokens[rowIndex], columnTokens[columnIndex]]);
      validateWorkLimit(state.work += key.length, "Table layout work");
      cells.push({
        key, role, rowIndex, columnIndex, columnKey: columnTokens[columnIndex],
        ...(rowIndex === null ? {} : { rowKey: rowTokens[rowIndex] }),
        bounds: { left, top: band * options.rowHeight, right, bottom: (band + 1) * options.rowHeight }
      });
      left = right;
    });
  };
  let band = 0;
  if (options.header) append("header", null, band++);
  for (let index = 0; index < visibleRowCount; index++) append("body", index, band++);
  if (options.footer) append("footer", null, band);
  return cloneAndFreeze({
    algorithm: "keyed-table-cells@1", options, columnWidths: widths, height,
    sourceRowCount: rows.length, visibleRowCount, omittedRowCount: rows.length - visibleRowCount, cells
  });
}
