import { measureTextWidth } from "../../core/textMetrics.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { layoutTableCells } from "../../grammar/cells.js";
import { resolveScaleDomain, mapContinuousScaleValues } from "../../grammar/scales/index.js";
import { buildCurvePathCommands } from "../../grammar/curveCommands.js";
import { tableTextProperties } from "./text.js";

const range = (values, domain, output, clamp = false) => mapContinuousScaleValues(values, { type: "linear", domain, range: output, clamp });
function textStyle(config, role) {
  const band = role === "header" ? config.headerStyle : role === "footer" ? config.footerStyle : undefined;
  return band ? { ...config.labels, fill: band.color, fontWeight: band.fontWeight } : config.labels;
}

export function layoutTableContent(data, rowKeys, binding, config, frame, profile) {
  let work = 0;
  const measured = (text, style) => {
    // Wrapping can query growing prefixes. Bound the total before measurement.
    validateWorkLimit(work += text.length * text.length + 1, "Table text preparation work");
    return measureTextWidth(text, style, profile);
  };
  const columns = binding.columns.map((column, index) => {
    const appearance = config.columns[index];
    let intrinsicWidth = config.header ? measured(column.label, textStyle(config, "header")) : 0;
    for (const value of data.columns[index].values) intrinsicWidth = Math.max(intrinsicWidth, measured(value.text, config.labels));
    if (data.columns[index].aggregate) intrinsicWidth = Math.max(intrinsicWidth, measured(data.columns[index].aggregate.text, textStyle(config, "footer")));
    // A sparkline has no text advance; use its explicitly measured header or
    // missing-value text, with padding. It shares the same auto width policy.
    return { key: column.key, width: appearance.width, ...(appearance.width === "auto" ? { intrinsicWidth: intrinsicWidth + 2 * config.padding } : {}) };
  });
  const layout = layoutTableCells(data.indices.map(index => ({ key: rowKeys[index] })), columns, {
    width: frame.width, rowHeight: config.rowHeight, header: config.header,
    footer: binding.columns.some(column => column.footer !== false), ...(config.rowLimit === undefined ? {} : { rowLimit: config.rowLimit })
  });
  const notice = layout.omittedRowCount ? `${layout.visibleRowCount} of ${layout.sourceRowCount} rows shown` : undefined;
  if (layout.height + (notice ? config.rowHeight : 0) > frame.height) throw new RangeError("Table rows exceed the viewport height; increase Canvas height or set a smaller rowLimit.");
  const cells = layout.cells.map(cell => {
    const column = binding.columns[cell.columnIndex], source = data.columns[cell.columnIndex];
    const sourceIndex = cell.rowIndex === null ? undefined : data.indices[cell.rowIndex];
    const value = cell.role === "header" ? { text: column.label, value: column.label }
      : cell.role === "footer" ? source.aggregate ?? { text: "", value: null } : source.values[sourceIndex];
    const bounds = { left: frame.x + cell.bounds.left, right: frame.x + cell.bounds.right,
      top: frame.y + cell.bounds.top, bottom: frame.y + cell.bounds.bottom };
    const clip = { x: bounds.left, y: bounds.top, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
    const graphics = [{ type: "rect", role: "body", properties: { ...clip, ...config.cells,
      ...(cell.role === "header" ? { fill: config.headerStyle.fill } : cell.role === "footer" ? { fill: config.footerStyle.fill } : {}) }, clip }];
    if (cell.role === "body" && column.cell.type === "bar" && value.value !== null) {
      const x = range([0, value.value], source.domains.value, [bounds.left + config.padding, bounds.right - config.padding], true);
      graphics.push({ type: "rect", role: "bar", clip, properties: { x: Math.min(...x), y: bounds.top + config.padding,
        width: Math.abs(x[1] - x[0]), height: bounds.bottom - bounds.top - 2 * config.padding, ...config.bars } });
    }
    if (cell.role === "body" && column.cell.type === "sparkline" && value.series.length) {
      const xDomain = source.domains.x, yDomain = column.cell.resolveY === "independent" ? resolveScaleDomain("auto", value.yValues) : source.domains.y;
      const inner = { left: bounds.left + config.padding, right: bounds.right - config.padding, top: bounds.top + config.padding, bottom: bounds.bottom - config.padding };
      if (inner.left >= inner.right || inner.top >= inner.bottom) throw new RangeError("Table sparkline requires a positive content rectangle.");
      for (const [index, series] of value.series.entries()) {
        const x = range(series.values.map(point => point.x), xDomain, [inner.left, inner.right]);
        const y = range(series.values.map(point => point.y), yDomain, [inner.bottom, inner.top]);
        const points = x.map((x, index) => ({ x, y: y[index] }));
        if (points.length === 1) graphics.push({ type: "circle", role: `sparkline:${index}`, clip,
          properties: { ...config.sparklines, ...points[0], radius: config.sparklines.strokeWidth / 2, fill: config.sparklines.stroke, stroke: "none", strokeWidth: 0 } });
        else graphics.push({ type: "path", role: `sparkline:${index}`, clip, properties: { commands: buildCurvePathCommands(points, column.cell.curve, column.cell.tension),
          fill: "none", ...config.sparklines } });
      }
    }
    const label = tableTextProperties(value.text, bounds, config.columns[cell.columnIndex], textStyle(config, cell.role), config.padding, profile);
    if (label.properties) graphics.push({ type: "text", role: "label", properties: label.properties, clip });
    return { ...cell, rowKey: sourceIndex === undefined ? undefined : rowKeys[sourceIndex], columnKey: column.key,
      sourceIndex, value: value.value, text: value.text, truncated: label.truncated, bounds, graphics,
      ...(cell.role === "footer" && source.aggregate ? { aggregate: source.aggregate.report } : {}) };
  });
  const note = notice === undefined ? undefined : tableTextProperties(notice, {
    left: frame.x, right: frame.x + frame.width, top: frame.y + layout.height, bottom: frame.y + layout.height + config.rowHeight
  }, { align: "left", wrap: false }, config.labels, config.padding, profile).properties;
  validateGeneratedItemLimit(cells.reduce((sum, cell) => sum + cell.graphics.length, Number(note !== undefined)), "Table graphic count");
  return { cells, note, layout };
}
