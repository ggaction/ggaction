import { action } from "../../core/action.js";
import { STROKE_STYLE_PROPERTIES } from "../../grammar/strokeStyle.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateNonEmptyString, validateOptionObject } from
  "../../core/validation.js";
import { normalizeGroupFields } from "../../grammar/pathSeries.js";
import { readNominalField, readQuantitativeField } from
  "../../grammar/scales/fields.js";
import { findDataset } from "../../selectors/datasets.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { planDerivedDataRevision } from "../../materialization/dataProvenance.js";
import { applyLayerDataRematerialization } from "../../materialization/dependencies.js";
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
const WIDE_OPTIONS = Object.freeze(["fields", "as", "summary", "normalize"]);
const WIDE_AS_OPTIONS = Object.freeze(["key", "value"]);
const LINE_OPTIONS = Object.freeze([
  "strokeWidth", "curve", "stroke", "opacity", "closed",
  ...STROKE_STYLE_PROPERTIES
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

function normalizeWide(value, id, operation, minimum = 3) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} wide must be a plain object.`);
  }
  validateOptionObject(value, WIDE_OPTIONS, `${operation} wide`);
  if (!Array.isArray(value.fields) || value.fields.length < minimum) {
    throw new Error(`${operation} wide.fields must contain at least ${minimum === 3 ? "three" : "two"} fields.`);
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
  const summary = value.summary ?? false;
  const normalize = value.normalize ?? false;
  if (![false, "mean", "median"].includes(summary)) {
    throw new TypeError(`${operation} wide.summary must be false, mean, or median.`);
  }
  if (![false, "minmax"].includes(normalize)) {
    throw new TypeError(`${operation} wide.normalize must be false or minmax.`);
  }
  return { fields, as: { key, value: foldedValue }, summary, normalize };
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

// Keep summaries and normalization in the public data grammar. Original values
// remain available, and each derived dataset has ordinary trace/provenance.
function prepareWideData(program, { source, wide, groupBy, color, strokeDash, data, operation }) {
  let next = program, input = source;
  const ownedData = [];
  if (wide.summary) {
    input = `${data}Summary`;
    const groups = [...new Set([...groupBy, color?.field, strokeDash?.field].filter(Boolean))];
    next = next.createSummaryData({ id: input, source,
      ...(groups.length ? { groupBy: groups } : {}),
      aggregates: wide.fields.filter(field => !groups.includes(field)).map(field => ({ op: wide.summary, field, as: field })), missing: "error" });
    ownedData.push(input);
  }
  const folded = wide.normalize ? `${data}Fold` : data;
  next = next.createFoldData({ id: folded, source: input, fields: wide.fields, as: wide.as });
  ownedData.push(folded);
  const value = wide.normalize ? `${wide.as.value}Normalized` : wide.as.value;
  if (wide.normalize) {
    next = next.createNormalizedData({ id: data, source: folded, field: wide.as.value,
      as: value, groupBy: wide.as.key, method: "minmax", zeroDenominator: "zero" });
    ownedData.push(data);
  }
  validateRadarRows(findDataset(next, data).values, { category: wide.as.key,
    value, groupBy, order: wide.fields }, operation);
  return { next, data, value, ownedData };
}

export const createRadarPlot = /* @__PURE__ */ action(
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
    let radarPlot;
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
      if (sourceRows.length > 1 && groupBy.length === 0 && !wide.summary) {
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
      const prepared = prepareWideData(next, { source, wide, groupBy: seriesFields,
        color, strokeDash, data, operation });
      next = prepared.next;
      category = { field: wide.as.key, fieldType: "nominal" };
      radarValue = { field: prepared.value, fieldType: "quantitative",
        ...(wide.normalize ? { scale: { domain: [0, 1], nice: false } } : {}) };
      radarPlot = { source, wide, ownedData: prepared.ownedData };

    }

    category = scaleWithOrder(category, order, operation);
    next = next.createPolarLinePlot({
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
    return next._withMarkConfig(id, {
      ...next.markConfigs[id],
      compositionRole: "radar",
      ...(radarPlot ? { radarPlot } : {})
    });
  }
);

export const editRadarPlot = /* @__PURE__ */ action(
  {
    op: "editRadarPlot",
    description: "Revise a wide Radar plot's dimensions and order while preserving its series and appearance."
  },
  function (args = {}) {
    const operation = "editRadarPlot";
    validateFacadeOptions(args, ["target", "wide"], operation);
    validateOptionObject(args.wide, ["fields", "summary", "normalize"], `${operation} wide`);
    const owner = resolveEligibleLayer(this, {
      target: args.target,
      label: "wide Radar plot",
      predicate: layer => this.markConfigs[layer.id]?.compositionRole === "radar" &&
        (this.markConfigs[layer.id]?.radarPlot !== undefined ||
          findDataset(this, layer.data)?.transform?.[0]?.type === "fold")
    });
    const previous = findDataset(this, owner.data);
    const stored = this.markConfigs[owner.id].radarPlot;
    const prior = stored?.wide ?? previous.transform[0];
    const source = findDataset(this, stored?.source ?? previous.source);
    const wide = normalizeWide({ summary: prior.summary, normalize: prior.normalize, ...args.wide, as: prior.as,
      fields: args.wide.fields }, owner.id, operation, 2);
    for (const field of wide.fields) readQuantitativeField(source.values, field);
    const group = owner.encoding.group;
    const groupBy = group?.fields ?? (group?.field ? [group.field] : []);
    const revision = planDerivedDataRevision(this, {
      owner: owner.id, role: "RadarData", previous: previous.id, consumers: [owner.id]
    });
    const prepared = prepareWideData(this, { source: source.id, wide, groupBy,
      color: owner.encoding.color, strokeDash: owner.encoding.strokeDash,
      data: revision.id, operation });
    let next = prepared.next.rebindLayerData(revision.rebinds[0]);
    if (Boolean(prior.normalize) !== Boolean(wide.normalize)) {
      next = next.encodeR({ target: owner.id, field: prepared.value,
        fieldType: "quantitative", scale: { domain: wide.normalize ? [0, 1] : "auto", nice: false } });
    }
    const theta = owner.encoding.theta.scale;
    const revisedValues = config => {
      const full = config.inferredValues || !Array.isArray(config.values) ||
        config.values.length === prior.fields.length && prior.fields.every(field => config.values.includes(field));
      const retained = full ? wide.fields : config.values.filter(field => wide.fields.includes(field));
      return { ...config, mode: "values", values: retained.length ? retained : wide.fields };
    };
    for (const [id, axis] of Object.entries(next.semanticSpec.guides.axis ?? {})) {
      if (axis.scale !== theta) continue;
      for (const role of ["ticks", "labels"]) {
        const config = next.guideConfigs.axis?.[id]?.[role];
        if (config) next = next._withGuideConfig(id, role, revisedValues(config));
      }
    }
    const thetaGrid = next.guideConfigs.grid?.theta;
    if (thetaGrid?.scale === theta) next = next._withGridConfig("theta", revisedValues(thetaGrid));
    next = next.editThetaScale({ target: owner.id, domain: wide.fields });
    next = applyLayerDataRematerialization(next, owner.id);
    if (next.markConfigs[owner.id]?.closed !== true) next = next.editLineMark({ target: owner.id, closed: true });
    next = next._withMarkConfig(owner.id, { ...next.markConfigs[owner.id],
      radarPlot: { source: source.id, wide, ownedData: prepared.ownedData } });
    for (const id of [...(stored?.ownedData ?? [previous.id])].reverse()) {
      next = next.releaseDerivedData({ id });
    }
    return next._withContext({ currentMark: owner.id, currentData: source.id });
  }
);
