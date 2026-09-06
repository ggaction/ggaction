import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateNonEmptyString, validateOptionObject } from
  "../../core/validation.js";
import { normalizeGroupFields } from "../../grammar/pathSeries.js";
import { readNominalField, readQuantitativeField } from
  "../../grammar/scales/fields.js";
import { findDataset } from "../../selectors/datasets.js";
import {
  normalizeAppearance,
  normalizeEncoding,
  normalizeFieldEncoding,
  normalizeGuides,
  normalizeStrokeDashEncoding,
  omitUndefinedOptions,
  resolveFacadeData,
  resolveFacadeId,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "category", "value", "wide", "groupBy",
  "order", "color", "strokeDash", "line", "guides"
]);
const CATEGORY_OPTIONS = Object.freeze(["field", "fieldType", "scale"]);
const VALUE_OPTIONS = Object.freeze(["field", "fieldType", "scale"]);
const CATEGORY_SCALE_OPTIONS = Object.freeze([
  "id", "type", "domain", "range", "reverse", "paddingInner", "paddingOuter",
  "padding", "align"
]);
const WIDE_OPTIONS = Object.freeze(["fields", "as"]);
const WIDE_AS_OPTIONS = Object.freeze(["key", "value"]);
const LINE_OPTIONS = Object.freeze([
  "strokeWidth", "curve", "stroke", "opacity", "closed"
]);

function normalizeCategory(value, operation) {
  const category = normalizeFieldEncoding(value, `${operation} category`);
  validateOptionObject(category, CATEGORY_OPTIONS, `${operation} category`);
  validateNonEmptyString(category.field, `${operation} category field`);
  const fieldType = category.fieldType ?? "nominal";
  if (!["nominal", "ordinal"].includes(fieldType)) {
    throw new TypeError(`${operation} category must be nominal or ordinal.`);
  }
  if (category.scale !== undefined) {
    validateOptionObject(
      category.scale,
      CATEGORY_SCALE_OPTIONS,
      `${operation} category.scale`
    );
    if (
      category.scale.type !== undefined &&
      !["band", "point"].includes(category.scale.type)
    ) {
      throw new TypeError(`${operation} category.scale.type must be band or point.`);
    }
  }
  return {
    ...omitUndefinedOptions(category),
    fieldType,
    ...(category.scale === undefined
      ? {}
      : { scale: omitUndefinedOptions(category.scale) })
  };
}

function normalizeValue(value, operation) {
  const result = normalizeFieldEncoding(value, `${operation} value`);
  validateOptionObject(result, VALUE_OPTIONS, `${operation} value`);
  validateNonEmptyString(result.field, `${operation} value field`);
  if (result.fieldType !== undefined && result.fieldType !== "quantitative") {
    throw new TypeError(`${operation} value must be quantitative.`);
  }
  return { ...omitUndefinedOptions(result), fieldType: "quantitative" };
}

function normalizeWide(value, id, operation) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} wide must be a plain object.`);
  }
  validateOptionObject(value, WIDE_OPTIONS, `${operation} wide`);
  if (!Array.isArray(value.fields) || value.fields.length < 3) {
    throw new Error(`${operation} wide.fields must contain at least three fields.`);
  }
  const fields = [...value.fields];
  for (const field of fields) validateNonEmptyString(field, `${operation} wide field`);
  if (new Set(fields).size !== fields.length) {
    throw new Error(`${operation} wide.fields must be unique.`);
  }
  const aliases = value.as === undefined ? {} : value.as;
  if (!isPlainObject(aliases)) {
    throw new TypeError(`${operation} wide.as must be a plain object.`);
  }
  validateOptionObject(aliases, WIDE_AS_OPTIONS, `${operation} wide.as`);
  const key = aliases.key ?? `${id}Dimension`;
  const foldedValue = aliases.value ?? `${id}Value`;
  validateNonEmptyString(key, `${operation} wide.as.key`);
  validateNonEmptyString(foldedValue, `${operation} wide.as.value`);
  if (key === foldedValue || fields.includes(key) || fields.includes(foldedValue)) {
    throw new Error(`${operation} wide aliases must be distinct from selected fields.`);
  }
  return { fields, as: { key, value: foldedValue } };
}

function orderedCategories(rows, field, requested, operation) {
  const observed = [...new Set(readNominalField(rows, field))];
  if (!Array.isArray(requested) && requested !== undefined) {
    throw new TypeError(`${operation} order must be an array.`);
  }
  const order = requested === undefined ? observed : [...requested];
  if (order.length < 3 || new Set(order).size !== order.length) {
    throw new Error(`${operation} order must contain at least three distinct categories.`);
  }
  const observedSet = new Set(observed);
  if (
    order.length !== observed.length ||
    order.some(value => !observedSet.has(value))
  ) {
    throw new Error(`${operation} order must contain every category exactly once.`);
  }
  return order;
}

function seriesKey(row, fields) {
  return JSON.stringify(fields.map(field => row[field]));
}

function radarSeriesFields(groupBy, color, strokeDash, operation) {
  if (groupBy.length > 0) return groupBy;
  const colorField = color?.field;
  const dashField = strokeDash?.field;
  if (
    colorField !== undefined && dashField !== undefined &&
    colorField !== dashField
  ) {
    throw new Error(
      `${operation} color and strokeDash fields must match unless groupBy defines the series.`
    );
  }
  const field = colorField ?? dashField;
  return field === undefined ? [] : [field];
}

function validateRadarRows(rows, { category, value, groupBy, order }, operation) {
  readQuantitativeField(rows, value);
  for (const field of groupBy) readNominalField(rows, field);
  const expected = new Set(order);
  const series = new Map();
  for (const row of rows) {
    const key = seriesKey(row, groupBy);
    const categories = series.get(key) ?? new Set();
    const current = row[category];
    if (!expected.has(current)) {
      throw new Error(`${operation} found a category outside order.`);
    }
    if (categories.has(current)) {
      throw new Error(`${operation} requires one row per series and category.`);
    }
    categories.add(current);
    series.set(key, categories);
  }
  if (series.size === 0) throw new Error(`${operation} requires radar rows.`);
  for (const categories of series.values()) {
    if (
      categories.size !== order.length ||
      order.some(value => !categories.has(value))
    ) {
      throw new Error(`${operation} requires every category in every series.`);
    }
  }
}

function scaleWithOrder(category, order, operation) {
  const scale = category.scale ?? {};
  if (
    scale.domain !== undefined && scale.domain !== "auto" &&
    (!Array.isArray(scale.domain) ||
      scale.domain.length !== order.length ||
      scale.domain.some((value, index) => value !== order[index]))
  ) {
    throw new Error(`${operation} category.scale.domain conflicts with order.`);
  }
  return { ...category, scale: { ...scale, domain: order } };
}

export const createRadarPlot = action(
  {
    op: "createRadarPlot",
    description: "Create a closed Radar plot from long rows or an explicit wide fold."
  },
  function (args = {}) {
    const operation = "createRadarPlot";
    validateFacadeOptions(args, OPTIONS, operation);
    const hasWide = args.wide !== undefined;
    const hasCategory = args.category !== undefined;
    const hasValue = args.value !== undefined;
    if (
      (hasWide && (hasCategory || hasValue)) ||
      (!hasWide && (!hasCategory || !hasValue))
    ) {
      throw new Error(
        `${operation} requires category and value, or wide, but not both.`
      );
    }
    const longForm = !hasWide;
    const id = resolveFacadeId(this, args.id, {
      defaultId: "radarPlot",
      operation
    });
    const source = resolveFacadeData(this, args.data, operation);
    const sourceRows = findDataset(this, source).values;
    const groupBy = args.groupBy === undefined
      ? []
      : normalizeGroupFields(args.groupBy);
    const color = normalizeEncoding(args.color, `${operation} color`);
    const strokeDash = normalizeStrokeDashEncoding(
      args.strokeDash,
      `${operation} strokeDash`
    );
    const seriesFields = radarSeriesFields(
      groupBy,
      color,
      strokeDash,
      operation
    );
    const line = normalizeAppearance(args.line, LINE_OPTIONS, `${operation} line`);
    if (line.closed === false) {
      throw new Error(`${operation} requires a closed line.`);
    }
    const guides = normalizeGuides(args.guides, operation);

    let next = this;
    let data = source;
    let category;
    let radarValue;
    let order;
    if (longForm) {
      category = normalizeCategory(args.category, operation);
      radarValue = normalizeValue(args.value, operation);
      order = orderedCategories(sourceRows, category.field, args.order, operation);
      validateRadarRows(sourceRows, {
        category: category.field,
        value: radarValue.field,
        groupBy: seriesFields,
        order
      }, operation);
    } else {
      const wide = normalizeWide(args.wide, id, operation);
      if (sourceRows.length > 1 && groupBy.length === 0) {
        throw new Error(`${operation} wide rows require groupBy as series identity.`);
      }
      for (const field of wide.fields) readQuantitativeField(sourceRows, field);
      for (const field of groupBy) readNominalField(sourceRows, field);
      if (!Array.isArray(args.order) && args.order !== undefined) {
        throw new TypeError(`${operation} order must be an array.`);
      }
      order = args.order === undefined ? wide.fields : [...args.order];
      if (
        order.length !== wide.fields.length ||
        new Set(order).size !== order.length ||
        order.some(field => !wide.fields.includes(field))
      ) {
        throw new Error(
          `${operation} order must contain every wide field exactly once.`
        );
      }
      data = `${id}FoldData`;
      next = next.createFoldData({
        id: data,
        source,
        fields: wide.fields,
        as: wide.as
      });
      const foldedRows = findDataset(next, data).values;
      category = { field: wide.as.key, fieldType: "nominal" };
      radarValue = { field: wide.as.value, fieldType: "quantitative" };
      validateRadarRows(foldedRows, {
        category: category.field,
        value: radarValue.field,
        groupBy: seriesFields,
        order
      }, operation);
    }

    category = scaleWithOrder(category, order, operation);
    return next.createPolarLinePlot({
      id,
      data,
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      theta: category,
      radius: radarValue,
      ...(groupBy.length === 0 ? {} : { groupBy }),
      ...(color === undefined ? {} : { color }),
      ...(strokeDash === undefined ? {} : { strokeDash }),
      line: { ...line, closed: true },
      guides
    });
  }
);
