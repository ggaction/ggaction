import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  validateGeneratedItemLimit,
  validateWorkLimit
} from "../../core/validation.js";
import { BAR_GRAINS, resolveBarGrain } from "../bars/policy.js";
import { planFacetDependencies } from "./dependencies.js";
import { readNominalField } from "../scales/index.js";

const SUPPORTED_MARKS = new Set([
  "point", "line", "area", "bar", "rule", "tick", "rect"
]);
const SUPPORTED_BAR_GRAINS = new Set([
  BAR_GRAINS.histogram,
  BAR_GRAINS.aggregate,
  BAR_GRAINS.ranged
]);
const MAX_FACET_CHILDREN = 100;

function requireFacetField(field, label = "facet") {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`${label} requires a non-empty field.`);
  }
  return field;
}

function requireSupportedLayer(layer) {
  if (!SUPPORTED_MARKS.has(layer.mark?.type)) {
    throw new Error(
      `facet does not support mark "${layer.id}" of type ${layer.mark?.type ?? "incomplete"}.`
    );
  }
  if (
    layer.mark.type === "bar" &&
    !SUPPORTED_BAR_GRAINS.has(resolveBarGrain(layer))
  ) {
    throw new Error(
      `facet requires bar mark "${layer.id}" to be a complete histogram, aggregate, or ranged bar.`
    );
  }
  if (
    layer.encoding?.x?.scale === undefined ||
    layer.encoding?.y?.scale === undefined
  ) {
    throw new Error(
      `Facet layer "${layer.id}" must be a complete materializable Cartesian mark.`
    );
  }
  if (typeof layer.data !== "string" || layer.data.length === 0) {
    throw new Error(`Facet layer "${layer.id}" requires a dataset.`);
  }
}

function requireSupportedLayers(semanticSpec) {
  if (!Array.isArray(semanticSpec.layers) || semanticSpec.layers.length === 0) {
    throw new Error("facet requires at least one materializable layer.");
  }
  for (const layer of semanticSpec.layers) requireSupportedLayer(layer);
}

function requirePartitionDataset(semanticSpec, id) {
  const dataset = semanticSpec.datasets?.find(candidate => candidate.id === id);
  if (dataset === undefined) {
    throw new Error(`Facet dataset "${id}" does not exist.`);
  }
  if (!Array.isArray(dataset.values)) {
    throw new TypeError(`Facet dataset "${id}" requires array values.`);
  }
  return dataset;
}

function uniqueInOrder(values) {
  return [...new Set(values)];
}

function resolveValues(observed, requested, label = "facet values") {
  if (requested === undefined) return observed;
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new TypeError(`${label} must be a non-empty array when provided.`);
  }
  const normalized = readNominalField(
    requested.map(value => ({ value })),
    "value"
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${label} must be unique.`);
  }
  const missing = normalized.find(value => !observed.includes(value));
  if (missing !== undefined) {
    throw new Error(
      `${label} value ${JSON.stringify(missing)} is not present in the source field.`
    );
  }
  return normalized;
}

function requireGridRole(value, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`facetGrid ${label} must be a plain object.`);
  }
  const unknown = Object.keys(value).find(key => !["field", "values"].includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown facetGrid ${label} option "${unknown}".`);
  }
  return {
    field: requireFacetField(value.field, `facetGrid ${label}`),
    ...(value.values === undefined ? {} : { values: value.values })
  };
}

function pairKey(row, column) {
  return JSON.stringify([
    [typeof row, row],
    [typeof column, column]
  ]);
}

function displayValue(value) {
  return value === "" ? "(empty)" : String(value);
}

export function resolveFacetDefinition(semanticSpec, options = {}) {
  if (!isPlainObject(semanticSpec)) {
    throw new TypeError("resolveFacetDefinition requires a semantic spec.");
  }
  if (!isPlainObject(options)) {
    throw new TypeError("Facet options must be a plain object.");
  }
  const field = requireFacetField(options.field);
  const id = validateUserId(options.id ?? "facet", "Facet id");
  requireSupportedLayers(semanticSpec);
  const dependencies = planFacetDependencies(semanticSpec, {
    field,
    ...(options.data === undefined ? {} : { data: options.data })
  });
  const data = dependencies.anchor;
  const dataset = requirePartitionDataset(semanticSpec, data);
  const observed = uniqueInOrder(readNominalField(dataset.values, field));
  if (observed.length === 0) {
    throw new Error(`facet field "${field}" has no values.`);
  }
  const values = resolveValues(observed, options.values);
  validateGeneratedItemLimit(
    values.length,
    "Facet child count",
    MAX_FACET_CHILDREN
  );
  validateWorkLimit(
    dataset.values.length * values.length,
    "Facet partition work"
  );
  return cloneAndFreeze({
    id,
    data,
    field,
    values,
    dependencies,
    cells: values.map((value, index) => ({
      id: `${id}-cell-${index + 1}`,
      data: `${id}-cell-${index + 1}-data`,
      value
    }))
  });
}

export function resolveFacetGridDefinition(semanticSpec, options = {}) {
  if (!isPlainObject(semanticSpec)) {
    throw new TypeError("resolveFacetGridDefinition requires a semantic spec.");
  }
  if (!isPlainObject(options)) {
    throw new TypeError("facetGrid options must be a plain object.");
  }
  const rows = requireGridRole(options.rows, "rows");
  const columns = requireGridRole(options.columns, "columns");
  if (rows.field === columns.field) {
    throw new Error("facetGrid rows.field and columns.field must be different.");
  }
  const combinations = options.combinations ?? "observed";
  if (!["observed", "full"].includes(combinations)) {
    throw new Error('facetGrid combinations must be "observed" or "full".');
  }
  const id = validateUserId(options.id ?? "facetGrid", "Facet grid id");
  requireSupportedLayers(semanticSpec);
  const dependencies = planFacetDependencies(semanticSpec, {
    field: rows.field,
    ...(options.data === undefined ? {} : { data: options.data })
  });
  const data = dependencies.anchor;
  const dataset = requirePartitionDataset(semanticSpec, data);
  const observedRows = readNominalField(dataset.values, rows.field);
  const observedColumns = readNominalField(dataset.values, columns.field);
  const rowValues = resolveValues(
    uniqueInOrder(observedRows), rows.values, "facetGrid rows.values"
  );
  const columnValues = resolveValues(
    uniqueInOrder(observedColumns), columns.values, "facetGrid columns.values"
  );
  const observedPairs = new Set(dataset.values.map((_, index) =>
    pairKey(observedRows[index], observedColumns[index])
  ));
  const candidates = rowValues.flatMap((rowValue, row) =>
    columnValues.map((columnValue, column) => ({
      row,
      column,
      rowValue,
      columnValue,
      empty: !observedPairs.has(pairKey(rowValue, columnValue))
    }))
  );
  const selected = combinations === "full"
    ? candidates
    : candidates.filter(cell => !cell.empty);
  if (selected.length === 0) {
    throw new Error("facetGrid has no observed row and column combinations.");
  }
  validateGeneratedItemLimit(
    selected.length,
    "Facet grid child count",
    MAX_FACET_CHILDREN
  );
  validateWorkLimit(
    dataset.values.length * selected.length,
    "Facet grid partition work"
  );
  return cloneAndFreeze({
    id,
    data,
    dependencies,
    grid: {
      rows: { field: rows.field, values: rowValues },
      columns: { field: columns.field, values: columnValues },
      combinations
    },
    cells: selected.map(cell => {
      const cellId = `${id}-row-${cell.row + 1}-column-${cell.column + 1}`;
      return {
        ...cell,
        id: cellId,
        data: `${cellId}-data`,
        value: `${displayValue(cell.rowValue)} · ${displayValue(cell.columnValue)}`,
        filters: [
          { field: rows.field, value: cell.rowValue },
          { field: columns.field, value: cell.columnValue }
        ]
      };
    })
  });
}
