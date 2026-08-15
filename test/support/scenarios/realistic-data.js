import { createHash } from "node:crypto";

import { corpusDatasetIds, datasetDefinition } from "../datasets/catalog.js";
import { tidyTuesdaySourceEntries } from "../datasets/tidytuesday.js";
import {
  MAX_EXPLICIT_SOURCE_ROW_INDEXES,
  SOURCE_INDEX_ENCODING
} from "./coverage-ledger.js";

const DEFAULT_ROW_LIMIT = 160;
const DEFAULT_GROUP_LIMIT = 8;
const DEFAULT_SUBGROUP_LIMIT = 8;
const fieldPairCache = new Map();

function freezeRecord(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeRecord(child);
  return Object.freeze(value);
}

function stringValues(value) {
  if (!Array.isArray(value)) return [];
  return value.flat(Infinity)
    .filter(item => typeof item === "string" && item.length > 0);
}

function unique(values) {
  return [...new Set(values)];
}

function inferredRoles(definition) {
  const entries = Object.entries(definition.fields);
  const identifiers = entries
    .filter(([name]) => /(?:^id$|_id$)/iu.test(name))
    .map(([name]) => name);
  const labels = entries
    .filter(([name, field]) =>
      ["nominal", "ordinal"].includes(field.type) && /(?:name|title|label)/iu.test(name)
    )
    .map(([name]) => name);
  const measures = entries
    .filter(([, field]) => ["quantitative", "duration-hms"].includes(field.type))
    .map(([name]) => name);
  const temporal = entries
    .filter(([, field]) => field.type.startsWith("temporal-"))
    .map(([name]) => name);
  const categoricalDimensions = entries
    .filter(([name, field]) =>
      ["nominal", "ordinal", "boolean"].includes(field.type) && !identifiers.includes(name)
    )
    .map(([name]) => name);
  const dimensions = categoricalDimensions.length > 0
    ? categoricalDimensions
    : temporal;
  return {
    measures,
    dimensions,
    temporal,
    identifiers,
    labels,
    order: [],
    weight: [],
    geography: []
  };
}

function declaredRoles(definition) {
  const value = definition.fieldRoles ?? definition.roles ?? definition.semanticRoles;
  if (value === undefined) return inferredRoles(definition);
  const measures = stringValues(value.measures ?? value.measure);
  const dimensions = stringValues(value.dimensions ?? value.dimension);
  const temporal = stringValues(value.temporal ?? value.time);
  const identifiers = stringValues(value.identifiers ?? value.identifier ?? value.id);
  const labels = stringValues(value.labels ?? value.label);
  const order = stringValues(value.order);
  const weight = stringValues(value.weight);
  const geography = stringValues(value.geography);
  const knownFields = new Set(Object.keys(definition.fields));
  for (const [role, fields] of Object.entries({
    measures, dimensions, temporal, identifiers, labels, order, weight, geography
  })) {
    for (const field of fields) {
      if (!knownFields.has(field)) {
        throw new Error(
          `Dataset "${definition.id}" ${role} role references unknown field "${field}".`
        );
      }
    }
  }
  return { measures, dimensions, temporal, identifiers, labels, order, weight, geography };
}

function mappingFields(definition, key) {
  const mappings = definition.chartMappings ?? definition.analysisMappings;
  if (Array.isArray(mappings)) {
    return stringValues(mappings.map(mapping => mapping?.[key]));
  }
  const value = mappings?.[key];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return stringValues(value);
  if (value !== null && typeof value === "object") {
    return stringValues(Object.values(value));
  }
  return [];
}

export function realisticDatasetIds() {
  return corpusDatasetIds("tidytuesday");
}

export function realisticDatasetRoles(id) {
  const definition = datasetDefinition(id);
  if (definition.corpus !== "tidytuesday") {
    throw new Error(`Realistic scenarios require a TidyTuesday dataset, received "${id}".`);
  }
  const roles = declaredRoles(definition);
  if (roles.measures.length === 0 || roles.dimensions.length === 0) {
    throw new Error(
      `Dataset "${id}" requires at least one declared measure and dimension for realistic charts.`
    );
  }
  const prefer = (role, mappingKeys) => unique([
    ...mappingKeys.flatMap(key => mappingFields(definition, key)),
    ...roles[role]
  ]).filter(field =>
    roles[role].includes(field) && (definition.fields[field].profile?.distinct ?? 2) >= 2
  );
  return freezeRecord({
    measures: prefer("measures", ["y", "x", "size", "weight", "measure"]),
    dimensions: prefer("dimensions", ["color", "facet", "label", "dimension", "group", "x"]),
    temporal: prefer("temporal", ["time", "temporal", "date"]),
    identifiers: roles.identifiers,
    labels: prefer("labels", ["label"]),
    order: roles.order,
    weight: prefer("weight", ["weight", "size"]),
    geography: roles.geography
  });
}

export function realisticDatasetSupports(id, capability) {
  const roles = realisticDatasetRoles(id);
  if (capability === "temporal") return roles.temporal.length > 0;
  if (["regression", "path"].includes(capability)) {
    return roles.measures.length > 1 || roles.order.length > 0 || roles.temporal.length > 0;
  }
  return roles.measures.length > 0 && roles.dimensions.length > 0;
}

export function realisticFieldPairDomain(id, capability = "record") {
  const cacheKey = `${id}\0${capability}`;
  if (fieldPairCache.has(cacheKey)) return fieldPairCache.get(cacheKey);
  const roles = realisticDatasetRoles(id);
  const definition = datasetDefinition(id);
  const curatedBindings = new Map();
  for (const mapping of definition.chartMappings ?? []) {
    const measureField = stringValues([
      mapping.y, mapping.x, mapping.size, mapping.weight
    ])
      .find(field => roles.measures.includes(field));
    const dimensionField = stringValues([
      mapping.color, mapping.facet, mapping.label, mapping.x
    ])
      .find(field => roles.dimensions.includes(field));
    if (measureField === undefined || dimensionField === undefined) continue;
    curatedBindings.set(
      `${roles.measures.indexOf(measureField)}:${roles.dimensions.indexOf(dimensionField)}`,
      mapping.id
    );
  }
  const pairs = [];
  for (let measureIndex = 0; measureIndex < roles.measures.length; measureIndex += 1) {
    const measure = roles.measures[measureIndex];
    for (let dimensionIndex = 0; dimensionIndex < roles.dimensions.length; dimensionIndex += 1) {
      const dimension = roles.dimensions[dimensionIndex];
      const secondaryDimension = roles.dimensions.find(field => field !== dimension);
      const sequenceField = capability === "temporal"
        ? roles.temporal.find(field => field !== measure)
        : capability === "ordered"
          ? roles.temporal.find(field => field !== measure) ??
            roles.order.find(field => field !== measure)
          : undefined;
      const rows = tidyTuesdaySourceEntries(id).flatMap(({ row }) => {
        const value = finite(row[measure]);
        const category = scalarCategory(row[dimension]);
        if (value === undefined || category === undefined) return [];
        const sequenceValue = sequenceField === undefined
          ? undefined
          : roles.temporal.includes(sequenceField)
            ? Date.parse(row[sequenceField])
            : Number.isFinite(row[sequenceField])
              ? row[sequenceField]
              : scalarCategory(row[sequenceField]);
        return [{
          value,
          category: String(category),
          ...(sequenceValue === undefined || Number.isNaN(sequenceValue)
            ? {}
            : { sequence: sequenceValue }),
          ...(secondaryDimension === undefined || scalarCategory(row[secondaryDimension]) === undefined
            ? {}
            : { subgroup: String(row[secondaryDimension]) })
        }];
      });
      const groupCounts = new Map();
      for (const row of rows) {
        groupCounts.set(row.category, (groupCounts.get(row.category) ?? 0) + 1);
      }
      const retained = [...groupCounts]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, DEFAULT_GROUP_LIMIT);
      let eligible = rows.length >= 2 && retained.length >= 2;
      if (["ordered", "temporal"].includes(capability)) {
        const sequenceGroups = new Map();
        for (const row of rows) {
          if (row.sequence === undefined) continue;
          if (!sequenceGroups.has(row.category)) sequenceGroups.set(row.category, new Set());
          sequenceGroups.get(row.category).add(row.sequence);
        }
        const usableGroups = [...sequenceGroups.values()].filter(values => values.size >= 2);
        const sequenceCount = new Set(rows.flatMap(row =>
          row.sequence === undefined ? [] : [row.sequence]
        )).size;
        eligible = sequenceCount >= 3 &&
          (dimension === sequenceField || usableGroups.length > 0);
      }
      if (["distribution", "interval"].includes(capability)) {
        const valuesByGroup = new Map();
        for (const row of rows) {
          if (!valuesByGroup.has(row.category)) valuesByGroup.set(row.category, []);
          valuesByGroup.get(row.category).push(row.value);
        }
        eligible = retained.length >= 2 && retained.every(([category, count]) => {
          const values = valuesByGroup.get(category);
          return count >= 5 && Math.min(...values) < Math.max(...values) &&
            (capability !== "interval" || quantile(values, 0.25) < quantile(values, 0.75));
        });
      }
      if (["histogram", "segmented-histogram"].includes(capability)) {
        eligible = rows.length >= 20 && new Set(rows.map(row => row.value)).size >= 5;
      }
      if (["grouped", "matrix", "facet"].includes(capability)) {
        const retainedCategories = new Set(retained.map(([category]) => category));
        const crossedAll = rows.filter(row =>
          retainedCategories.has(row.category) && row.subgroup !== undefined
        );
        const subgroupCounts = new Map();
        for (const row of crossedAll) {
          subgroupCounts.set(row.subgroup, (subgroupCounts.get(row.subgroup) ?? 0) + 1);
        }
        const retainedSubgroups = new Set([...subgroupCounts]
          .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
          .slice(0, DEFAULT_SUBGROUP_LIMIT)
          .map(([subgroup]) => subgroup));
        const crossed = crossedAll.filter(row => retainedSubgroups.has(row.subgroup));
        const categories = new Set(crossed.map(row => row.category));
        const subgroups = new Set(crossed.map(row => row.subgroup));
        const cells = new Set(crossed.map(row => `${row.category}\0${row.subgroup}`));
        eligible = secondaryDimension !== undefined && categories.size >= 2 && subgroups.size >= 2;
        if (capability === "matrix") {
          eligible = eligible && cells.size >= 4 &&
            cells.size / (categories.size * subgroups.size) >= 0.25;
        }
        if (capability === "facet") {
          const facetCounts = new Map();
          for (const row of crossed) {
            facetCounts.set(row.subgroup, (facetCounts.get(row.subgroup) ?? 0) + 1);
          }
          eligible = eligible && [...facetCounts.values()].every(count => count >= 3);
        }
      }
      if (eligible && actualCapabilityEligible(id, {
        measureIndex,
        dimensionIndex
      }, capability)) {
        const key = `${measureIndex}:${dimensionIndex}`;
        pairs.push(freezeRecord({
          measureIndex,
          dimensionIndex,
          bindingId: curatedBindings.has(key)
            ? `curated:${curatedBindings.get(key)}`
            : `eligible:${roles.measures[measureIndex]}-by-${roles.dimensions[dimensionIndex]}`
        }));
      }
    }
  }
  if (pairs.length === 0) {
    fieldPairCache.set(cacheKey, Object.freeze([]));
    return fieldPairCache.get(cacheKey);
  }
  pairs.sort((left, right) =>
    Number(right.bindingId.startsWith("curated:")) -
      Number(left.bindingId.startsWith("curated:")) ||
    left.measureIndex - right.measureIndex || left.dimensionIndex - right.dimensionIndex
  );
  fieldPairCache.set(cacheKey, Object.freeze(pairs));
  return fieldPairCache.get(cacheKey);
}

export function realisticSourceFields(id, bindings) {
  const definition = datasetDefinition(id);
  const names = unique(Object.values(bindings).filter(value => typeof value === "string"));
  return freezeRecord(names.map(field => {
    const contract = definition.fields[field];
    if (contract === undefined) {
      throw new Error(`Dataset "${id}" provenance references unknown field "${field}".`);
    }
    return {
      field,
      label: contract.label ?? field,
      type: contract.type,
      ...(contract.unit === undefined ? {} : { unit: contract.unit })
    };
  }));
}

function stableSelection(entries, limit, { measures, dimensions, strata }) {
  if (entries.length <= limit) return entries;
  const selected = new Set([entries[0], entries.at(-1)]);
  for (const measure of measures) {
    const finite = entries.filter(entry => Number.isFinite(entry.row[measure]));
    if (finite.length === 0) continue;
    finite.sort((left, right) =>
      left.row[measure] - right.row[measure] || left.sourceRowIndex - right.sourceRowIndex
    );
    selected.add(finite[0]);
    selected.add(finite.at(-1));
  }
  for (const dimension of dimensions) {
    const witnessedDimensions = new Set();
    for (const entry of entries) {
      const value = scalarCategory(entry.row[dimension]);
      if (value === undefined || witnessedDimensions.has(String(value))) continue;
      witnessedDimensions.add(String(value));
      selected.add(entry);
    }
  }
  for (const { fields, minimum } of strata) {
    const counts = new Map();
    for (const entry of entries) {
      const values = fields.map(field => scalarCategory(entry.row[field]));
      if (values.some(value => value === undefined)) continue;
      const key = values.map(String).join("\0");
      const count = counts.get(key) ?? 0;
      if (count >= minimum) continue;
      counts.set(key, count + 1);
      selected.add(entry);
    }
  }
  const indexes = new Set();
  for (let index = 0; index < limit; index += 1) {
    indexes.add(Math.round(index * (entries.length - 1) / (limit - 1)));
  }
  for (const index of indexes) {
    if (selected.size >= limit) break;
    selected.add(entries[index]);
  }
  if (selected.size > limit) {
    throw new RangeError("Realistic row limit cannot retain all required witness rows.");
  }
  return [...selected].sort((left, right) => left.sourceRowIndex - right.sourceRowIndex);
}

function scalarCategory(value) {
  return value === null || value === undefined || value === "" ? undefined : value;
}

function finite(value) {
  return Number.isFinite(value) ? value : undefined;
}

function rowKey(row, sourceRowIndex, identifier) {
  const value = identifier === undefined ? undefined : row[identifier];
  return value === null || value === undefined || value === ""
    ? `source-row-${sourceRowIndex}`
    : `${value}-${sourceRowIndex}`;
}

function provenance(id, bindings, sourceRowIndexes, transformations, {
  explicitIndexes = false
} = {}) {
  const indexes = unique(sourceRowIndexes).sort((left, right) => left - right);
  if (indexes.length === 0) {
    throw new Error(`Dataset "${id}" realistic lineage cannot be empty.`);
  }
  if (explicitIndexes && indexes.length > MAX_EXPLICIT_SOURCE_ROW_INDEXES) {
    throw new RangeError(
      `Dataset "${id}" explicit lineage exceeds ${MAX_EXPLICIT_SOURCE_ROW_INDEXES} rows.`
    );
  }
  return freezeRecord({
    sourceDataset: id,
    sourceRowIndexBasis: "zero-based-data-row-in-pinned-csv",
    sourceRowCount: indexes.length,
    minimumSourceRow: indexes[0],
    maximumSourceRow: indexes.at(-1),
    sourceSelectionSha256: createHash("sha256")
      .update(indexes.join(","))
      .digest("hex"),
    indexEncoding: SOURCE_INDEX_ENCODING,
    ...(explicitIndexes ? { sourceRowIndexes: indexes } : {}),
    fieldBindings: bindings,
    transformations
  });
}

function extendProvenance(value, transformations) {
  return freezeRecord({
    ...value,
    transformations
  });
}

function assertView(id, kind, rows) {
  if (rows.length < 2) {
    throw new Error(
      `Dataset "${id}" has fewer than two valid rows for realistic ${kind} analysis.`
    );
  }
  return rows;
}

export function realisticRecordView(id, {
  measureIndex = 0,
  secondaryMeasureIndex = 0,
  includeSecondaryMeasure = true,
  dimensionIndex = 0,
  secondaryDimensionIndex = 0,
  includeSecondaryDimension = true,
  deriveSubgroup = true,
  rowLimit = DEFAULT_ROW_LIMIT,
  groupLimit = DEFAULT_GROUP_LIMIT,
  retainedCategoryValues,
  subgroupLimit = DEFAULT_SUBGROUP_LIMIT,
  minimumPerGroup = 1,
  minimumPerSubgroup = 1,
  witnessCross = false
} = {}) {
  const roles = realisticDatasetRoles(id);
  const measure = roles.measures[measureIndex % roles.measures.length];
  const secondaryMeasures = roles.measures.filter(field => field !== measure);
  const secondaryMeasure = includeSecondaryMeasure && secondaryMeasures.length > 0
    ? secondaryMeasures[secondaryMeasureIndex % secondaryMeasures.length]
    : undefined;
  const dimension = roles.dimensions[dimensionIndex % roles.dimensions.length];
  const secondaryDimensions = roles.dimensions.filter(field => field !== dimension);
  const needsSecondaryDimension = includeSecondaryDimension ||
    minimumPerSubgroup > 1 || witnessCross;
  const secondaryDimension = needsSecondaryDimension && secondaryDimensions.length > 0
    ? secondaryDimensions[secondaryDimensionIndex % secondaryDimensions.length]
    : undefined;
  const temporal = roles.temporal[0];
  const order = roles.order[0];
  const identifier = roles.identifiers[0];
  const label = roles.labels[0] ?? dimension;
  const entries = tidyTuesdaySourceEntries(id);
  const groupStats = new Map();
  for (const { row, sourceRowIndex } of entries) {
    const value = finite(row[measure]);
    const category = scalarCategory(row[dimension]);
    if (value === undefined || category === undefined) continue;
    const key = String(category);
    const current = groupStats.get(key) ?? { count: 0, first: sourceRowIndex };
    current.count += 1;
    current.first = Math.min(current.first, sourceRowIndex);
    groupStats.set(key, current);
  }
  const retainedGroups = new Set(retainedCategoryValues === undefined
    ? [...groupStats]
      .sort((left, right) =>
        right[1].count - left[1].count || left[1].first - right[1].first ||
        left[0].localeCompare(right[0])
      )
      .slice(0, groupLimit)
      .map(([category]) => category)
    : retainedCategoryValues.map(String).filter(category => groupStats.has(category)));
  if (retainedGroups.size === 0) {
    throw new Error(`Dataset "${id}" has no rows for the requested retained categories.`);
  }
  let eligible = entries.filter(({ row }) =>
    finite(row[measure]) !== undefined &&
    retainedGroups.has(String(scalarCategory(row[dimension])))
  );
  let retainedSubgroups;
  if (secondaryDimension !== undefined) {
    const subgroupCounts = new Map();
    for (const { row } of eligible) {
      const subgroup = scalarCategory(row[secondaryDimension]);
      if (subgroup === undefined) continue;
      const key = String(subgroup);
      subgroupCounts.set(key, (subgroupCounts.get(key) ?? 0) + 1);
    }
    retainedSubgroups = new Set([...subgroupCounts]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, subgroupLimit)
      .map(([subgroup]) => subgroup));
    eligible = eligible.filter(({ row }) =>
      retainedSubgroups.has(String(scalarCategory(row[secondaryDimension])))
    );
  }
  const selected = stableSelection(eligible, rowLimit, {
    measures: unique([measure, secondaryMeasure].filter(Boolean)),
    dimensions: unique([dimension, secondaryDimension].filter(Boolean)),
    strata: [
      { fields: [dimension], minimum: minimumPerGroup },
      ...(secondaryDimension === undefined
        ? []
        : [{ fields: [secondaryDimension], minimum: minimumPerSubgroup }]),
      ...(!witnessCross || secondaryDimension === undefined
        ? []
        : [{ fields: [dimension, secondaryDimension], minimum: 1 }])
    ]
  });
  const projected = selected.flatMap(({ row, sourceRowIndex }) => {
    const value = finite(row[measure]);
    const category = scalarCategory(row[dimension]);
    if (value === undefined || category === undefined) return [];
    return [{
      key: rowKey(row, sourceRowIndex, identifier),
      sourceRowIndex,
      value,
      ...(secondaryMeasure === undefined || finite(row[secondaryMeasure]) === undefined
        ? {}
        : { secondary: row[secondaryMeasure] }),
      category,
      ...(secondaryDimension === undefined
        ? {}
        : { subgroup: scalarCategory(row[secondaryDimension]) }),
      label: scalarCategory(row[label]) ?? category,
      ...(temporal === undefined || row[temporal] === null
        ? {}
        : { time: row[temporal] }),
      ...(order === undefined || row[order] === null
        ? {}
        : { orderValue: row[order] })
    }];
  });
  const projectedValues = projected.map(row => row.value);
  const midpoint = median(projectedValues);
  const orderValues = unique(projected
    .map(row => row.orderValue)
    .filter(value => value !== undefined));
  orderValues.sort((left, right) => {
    if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
    const leftTime = Date.parse(left);
    const rightTime = Date.parse(right);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime;
    return String(left).localeCompare(String(right));
  });
  const orderRanks = new Map(orderValues.map((value, index) => [value, index + 1]));
  const values = assertView(id, "record", projected.map(row => ({
    ...row,
    ...(row.subgroup !== undefined
      ? { subgroup: row.subgroup }
      : deriveSubgroup
        ? { subgroup: row.value < midpoint ? "below-median" : "at-or-above-median" }
        : {}),
    ...(row.orderValue === undefined
      ? {}
      : { orderNumeric: Number.isFinite(row.orderValue)
          ? row.orderValue
          : Number.isFinite(Date.parse(row.orderValue))
            ? Date.parse(row.orderValue)
            : orderRanks.get(row.orderValue) })
  })));
  const bindings = freezeRecord({
    measure,
    ...(secondaryMeasure === undefined ? {} : { secondaryMeasure }),
    dimension,
    ...(secondaryDimension === undefined ? {} : { secondaryDimension }),
    ...(temporal === undefined ? {} : { temporal }),
    ...(order === undefined ? {} : { order }),
    ...(identifier === undefined ? {} : { identifier }),
    label
  });
  return freezeRecord({
    rows: values,
    sample: freezeRecord({
      method: "deterministic-stratified-witness-sample",
      eligibleRowCount: eligible.length,
      displayedRowCount: values.length,
      limit: rowLimit,
      strata: freezeRecord([
        dimension,
        ...(secondaryDimension === undefined ? [] : [secondaryDimension])
      ])
    }),
    provenance: provenance(
      id,
      bindings,
      values.map(row => row.sourceRowIndex),
      [
        freezeRecord({ op: "filter-valid", fields: [measure, dimension] }),
        freezeRecord(retainedCategoryValues === undefined
          ? { op: "top-groups", field: dimension, limit: groupLimit }
          : {
              op: "retain-groups",
              field: dimension,
              values: [...retainedGroups],
              purpose: "align record observations with full-source summary groups"
            }),
        ...(secondaryDimension === undefined
          ? []
          : [freezeRecord({
              op: "top-subgroups",
              field: secondaryDimension,
              limit: subgroupLimit
            })]),
        freezeRecord({
          op: "witness-preserving-even-sample",
          limit: rowLimit,
          eligibleRowCount: eligible.length,
          displayedRowCount: values.length,
          strata: [
            dimension,
            ...(secondaryDimension === undefined ? [] : [secondaryDimension])
          ],
          witnesses: ["first", "last", "measure-min", "measure-max", "retained-dimension"]
        }),
        ...(!deriveSubgroup || secondaryDimension !== undefined
          ? []
          : [freezeRecord({
              op: "median-split",
              field: measure,
              as: "subgroup",
              purpose: "compare below-median and at-or-above-median observations"
            })]),
        ...(order === undefined
          ? []
          : [freezeRecord({ op: "source-order-numeric-projection", field: order })]),
        freezeRecord({ op: "project", bindings })
      ],
      { explicitIndexes: true }
    )
  });
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function quantile(values, probability) {
  const ordered = [...values].sort((left, right) => left - right);
  const index = (ordered.length - 1) * probability;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return ordered[lower] + (ordered[Math.min(lower + 1, ordered.length - 1)] - ordered[lower]) * fraction;
}

function aggregate(values, operation) {
  if (operation === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (operation === "median") return median(values);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function realisticSummaryView(id, {
  aggregate: operation = "mean",
  measureIndex = 0,
  dimensionIndex = 0,
  includeSecondaryDimension = false,
  groupLimit = DEFAULT_GROUP_LIMIT
} = {}) {
  if (!['mean', 'median', 'sum'].includes(operation)) {
    throw new Error(`Unknown realistic summary aggregate "${operation}".`);
  }
  const roles = realisticDatasetRoles(id);
  const measure = roles.measures[measureIndex % roles.measures.length];
  const dimension = roles.dimensions[dimensionIndex % roles.dimensions.length];
  const secondaryDimension = includeSecondaryDimension
    ? roles.dimensions.find(field => field !== dimension)
    : undefined;
  const grouped = new Map();
  for (const { row, sourceRowIndex } of tidyTuesdaySourceEntries(id)) {
    const value = finite(row[measure]);
    const categoryValue = scalarCategory(row[dimension]);
    if (value === undefined || categoryValue === undefined) continue;
    const key = String(categoryValue);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({
      value,
      sourceRowIndex,
      ...(secondaryDimension === undefined || scalarCategory(row[secondaryDimension]) === undefined
        ? {}
        : { subgroup: String(row[secondaryDimension]) })
    });
  }
  const summaries = [...grouped.entries()].map(([category, rows]) => {
    const values = rows.map(row => row.value);
    const subgroupCounts = new Map();
    for (const row of rows) {
      if (row.subgroup === undefined) continue;
      subgroupCounts.set(row.subgroup, (subgroupCounts.get(row.subgroup) ?? 0) + 1);
    }
    const modalSubgroup = [...subgroupCounts]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
    return {
      key: `summary-${category}`,
      category,
      ...(modalSubgroup === undefined ? {} : { group: modalSubgroup }),
      value: aggregate(values, operation),
      center: median(values),
      count: values.length,
      lower: quantile(values, 0.25),
      upper: quantile(values, 0.75),
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      sourceRowIndexes: rows.map(row => row.sourceRowIndex)
    };
  }).sort((left, right) =>
    right.count - left.count || right.value - left.value || left.category.localeCompare(right.category)
  ).slice(0, groupLimit);
  const totalMagnitude = summaries.reduce((sum, row) => sum + Math.abs(row.value), 0);
  const sourceRowIndexes = summaries.flatMap(row => row.sourceRowIndexes);
  const rows = assertView(id, "summary", summaries.map(({
    sourceRowIndexes: _sourceRowIndexes,
    ...row
  }, index) => ({
    ...row,
    rank: index + 1,
    share: totalMagnitude === 0 ? 0 : Math.abs(row.value) / totalMagnitude,
    magnitude: Math.abs(row.value)
  })));
  const bindings = freezeRecord({
    measure,
    dimension,
    ...(secondaryDimension === undefined ? {} : { secondaryDimension })
  });
  return freezeRecord({
    rows,
    aggregate: operation,
    provenance: provenance(
      id,
      bindings,
      sourceRowIndexes,
      [
        freezeRecord({ op: "filter-valid", fields: [measure, dimension] }),
        freezeRecord({
          op: "group-aggregate",
          groupBy: dimension,
          field: measure,
          aggregate: operation,
          statistics: ["count", "q25", "q75", "min", "max"]
        }),
        ...(secondaryDimension === undefined
          ? []
          : [freezeRecord({
              op: "modal-subgroup",
              field: secondaryDimension,
              groupBy: dimension
            })]),
        freezeRecord({ op: "top-groups", limit: groupLimit, orderBy: ["count", "value"] }),
        freezeRecord({ op: "rank-and-share" })
      ]
    )
  });
}

export function realisticOrderedView(id, {
  aggregate: operation = "mean",
  measureIndex = 0,
  dimensionIndex = 0,
  temporalOnly = false,
  groupLimit = 4,
  binLimit = 24
} = {}) {
  if (!["mean", "median", "sum"].includes(operation)) {
    throw new Error(`Unknown realistic ordered aggregate "${operation}".`);
  }
  const roles = realisticDatasetRoles(id);
  const measure = roles.measures[measureIndex % roles.measures.length];
  const dimension = roles.dimensions[dimensionIndex % roles.dimensions.length];
  const sequence = temporalOnly
    ? roles.temporal.find(field => field !== measure)
    : roles.temporal.find(field => field !== measure) ??
      roles.order.find(field => field !== measure);
  if (sequence === undefined) {
    throw new Error(
      `Dataset "${id}" requires a real ${temporalOnly ? "temporal" : "order or temporal"} field.`
    );
  }
  const temporal = roles.temporal.includes(sequence);
  const singleSeries = dimension === sequence;
  const entries = tidyTuesdaySourceEntries(id).flatMap(({ row, sourceRowIndex }) => {
    const value = finite(row[measure]);
    const category = scalarCategory(row[dimension]);
    const rawSequence = row[sequence];
    const ordered = temporal
      ? Date.parse(rawSequence)
      : Number.isFinite(rawSequence) ? rawSequence : scalarCategory(rawSequence);
    if (
      value === undefined || category === undefined || ordered === undefined ||
      Number.isNaN(ordered)
    ) return [];
    return [{
      value,
      category: singleSeries ? "all-observations" : String(category),
      ordered,
      sourceRowIndex
    }];
  });
  const groupCounts = new Map();
  for (const row of entries) {
    groupCounts.set(row.category, (groupCounts.get(row.category) ?? 0) + 1);
  }
  const groups = new Set([...groupCounts]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, groupLimit)
    .map(([category]) => category));
  const retained = entries.filter(row => groups.has(row.category));
  const distinctOrder = unique(retained.map(row => row.ordered)).sort((left, right) => {
    if (typeof left === "number" && typeof right === "number") return left - right;
    return String(left).localeCompare(String(right));
  });
  if (distinctOrder.length < 3) {
    throw new Error(`Dataset "${id}" requires at least three real ordered values.`);
  }
  const rankByValue = new Map(distinctOrder.map((value, index) => [value, index]));
  const bucketCount = Math.min(binLimit, distinctOrder.length);
  const grouped = new Map();
  for (const row of retained) {
    const rank = rankByValue.get(row.ordered);
    const bucket = Math.min(
      bucketCount - 1,
      Math.floor(rank * bucketCount / distinctOrder.length)
    );
    const key = `${row.category}\0${bucket}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const aggregates = [...grouped.values()].map(values => {
    const positions = values.map(row => row.ordered);
    const numericPositions = positions.every(value => typeof value === "number");
    const midpoint = numericPositions
      ? positions.reduce((sum, value) => sum + value, 0) / positions.length
      : rankByValue.get(positions[Math.floor(positions.length / 2)]);
    return {
      key: `ordered-${values[0].category}-${midpoint}`,
      group: values[0].category,
      position: temporal ? new Date(midpoint).toISOString() : midpoint,
      value: aggregate(values.map(row => row.value), operation),
      count: values.length,
      sourceRowIndexes: values.map(row => row.sourceRowIndex)
    };
  });
  const pointCounts = new Map();
  for (const row of aggregates) {
    pointCounts.set(row.group, (pointCounts.get(row.group) ?? 0) + 1);
  }
  const usableGroups = new Set([...pointCounts]
    .filter(([, count]) => count >= 2)
    .map(([group]) => group));
  const selected = aggregates
    .filter(row => usableGroups.has(row.group))
    .sort((left, right) =>
      left.group.localeCompare(right.group) ||
      (temporal
        ? Date.parse(left.position) - Date.parse(right.position)
        : left.position - right.position)
    );
  const sourceRowIndexes = selected.flatMap(row => row.sourceRowIndexes);
  const baseline = Math.min(0, ...selected.map(row => row.value));
  const rows = assertView(id, "ordered", selected.map(({
    sourceRowIndexes: _sourceRowIndexes,
    ...row
  }) => ({ ...row, baseline })));
  const bindings = freezeRecord({
    measure,
    dimension,
    ...(temporal ? { temporal: sequence } : { order: sequence })
  });
  return freezeRecord({
    rows,
    aggregate: operation,
    positionType: temporal ? "temporal" : "quantitative",
    ...(temporal
      ? {
          positionFormat:
            Math.max(...rows.map(row => Date.parse(row.position))) -
              Math.min(...rows.map(row => Date.parse(row.position))) > 730 * 86_400_000
              ? "%Y"
              : "%Y-%m"
        }
      : {}),
    provenance: provenance(id, bindings, sourceRowIndexes, [
      freezeRecord({ op: "filter-valid", fields: [measure, dimension, sequence] }),
      freezeRecord({ op: "top-groups", field: dimension, limit: groupLimit }),
      ...(singleSeries
        ? [freezeRecord({
            op: "single-series-projection",
            source: dimension,
            purpose: "avoid grouping an ordered field by itself"
          })]
        : []),
      freezeRecord({
        op: temporal ? "temporal-bin-aggregate" : "ordered-bin-aggregate",
        field: measure,
        orderBy: sequence,
        groupBy: dimension,
        bins: bucketCount,
        aggregate: operation
      }),
      freezeRecord({
        op: "range-baseline",
        field: measure,
        value: baseline,
        purpose: "materialize an area range from a truthful common baseline"
      })
    ])
  });
}

export function realisticGroupedView(id, {
  aggregate: operation = "mean",
  measureIndex = 0,
  dimensionIndex = 0,
  secondaryDimensionIndex = 0,
  groupLimit = DEFAULT_GROUP_LIMIT,
  subgroupLimit = DEFAULT_SUBGROUP_LIMIT
} = {}) {
  if (!["count", "mean", "median", "sum"].includes(operation)) {
    throw new Error(`Unknown realistic grouped aggregate "${operation}".`);
  }
  const record = realisticRecordView(id, {
    measureIndex,
    dimensionIndex,
    secondaryDimensionIndex,
    includeSecondaryMeasure: false,
    includeSecondaryDimension: true,
    deriveSubgroup: false,
    groupLimit,
    subgroupLimit,
    witnessCross: true
  });
  const { measure, dimension, secondaryDimension } = record.provenance.fieldBindings;
  if (secondaryDimension === undefined) {
    throw new Error(
      `Dataset "${id}" requires a second source dimension for realistic grouped analysis.`
    );
  }
  const retainedCategories = new Set(record.rows.map(row => String(row.category)));
  const retainedSubgroups = new Set(record.rows.map(row => String(row.subgroup)));
  const grouped = new Map();
  for (const { row, sourceRowIndex } of tidyTuesdaySourceEntries(id)) {
    const value = finite(row[measure]);
    const category = scalarCategory(row[dimension]);
    const subgroup = scalarCategory(row[secondaryDimension]);
    if (
      value === undefined || category === undefined || subgroup === undefined ||
      !retainedCategories.has(String(category)) ||
      !retainedSubgroups.has(String(subgroup))
    ) continue;
    const key = `${String(category)}\0${String(subgroup)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ value, sourceRowIndex, category, subgroup });
  }
  const aggregates = [...grouped.values()].map(groupRows => ({
    key: `grouped-${groupRows[0].category}-${groupRows[0].subgroup}`,
    category: groupRows[0].category,
    subgroup: groupRows[0].subgroup,
    value: operation === "count"
      ? groupRows.length
      : aggregate(groupRows.map(row => row.value), operation),
    count: groupRows.length,
    sourceRowIndexes: groupRows.map(row => row.sourceRowIndex)
  }));
  const sourceRowIndexes = aggregates.flatMap(row => row.sourceRowIndexes);
  const rows = aggregates.map(({ sourceRowIndexes: _sourceRowIndexes, ...row }) => row);
  return freezeRecord({
    rows: assertView(id, "grouped", rows),
    aggregate: operation,
    provenance: provenance(
      id,
      record.provenance.fieldBindings,
      sourceRowIndexes,
      [
        freezeRecord({ op: "filter-valid", fields: [measure, dimension, secondaryDimension] }),
        freezeRecord({ op: "top-groups", field: dimension, limit: groupLimit }),
        freezeRecord({
          op: "top-subgroups",
          field: secondaryDimension,
          limit: subgroupLimit
        }),
        freezeRecord({
          op: "category-subgroup-aggregate",
          field: measure,
          groupBy: [dimension, secondaryDimension],
          aggregate: operation,
          purpose: operation === "count"
            ? "compare authentic observation counts within source category pairs"
            : `compare full-source ${operation} values within source category pairs`
        })
      ]
    )
  });
}

export function realisticMatrixView(id, options = {}) {
  const grouped = realisticGroupedView(id, { ...options, aggregate: "mean" });
  const rows = grouped.rows.map(row => ({
    ...row,
    x: row.category,
    y: row.subgroup
  }));
  return freezeRecord({
    rows,
    aggregate: grouped.aggregate,
    provenance: extendProvenance(grouped.provenance, [
      ...grouped.provenance.transformations,
      freezeRecord({
        op: "matrix-projection",
        x: grouped.provenance.fieldBindings.dimension,
        y: grouped.provenance.fieldBindings.secondaryDimension,
        color: grouped.provenance.fieldBindings.measure
      })
    ])
  });
}

export function realisticCompositionView(id, {
  aggregate: operation = "mean",
  measureIndex = 0,
  dimensionIndex = 0,
  groupLimit = DEFAULT_GROUP_LIMIT,
  rowLimit = DEFAULT_ROW_LIMIT
} = {}) {
  const summary = realisticSummaryView(id, {
    aggregate: operation,
    measureIndex,
    dimensionIndex,
    groupLimit
  });
  const sample = realisticRecordView(id, {
    measureIndex,
    dimensionIndex,
    includeSecondaryMeasure: false,
    includeSecondaryDimension: false,
    deriveSubgroup: false,
    groupLimit,
    retainedCategoryValues: summary.rows.map(row => row.category),
    rowLimit
  });
  const summaryCategories = new Set(summary.rows.map(row => String(row.category)));
  const recordRows = sample.rows.filter(row => summaryCategories.has(String(row.category)));
  assertView(id, "composition sample", recordRows);
  return freezeRecord({
    rows: summary.rows,
    summaryRows: summary.rows,
    recordRows,
    aggregate: operation,
    sample: freezeRecord({
      ...sample.sample,
      displayedRowCount: recordRows.length
    }),
    provenance: extendProvenance(summary.provenance, [
      ...summary.provenance.transformations,
      freezeRecord({
        op: "paired-stratified-display-sample",
        method: sample.sample.method,
        displayedRowCount: recordRows.length,
        eligibleRowCount: sample.sample.eligibleRowCount,
        sourceSelectionSha256: sample.provenance.sourceSelectionSha256,
        purpose: "pair full-source group summaries with authentic record-level observations"
      })
    ])
  });
}

function actualCapabilityEligible(id, pair, capability) {
  try {
    if (capability === "grouped") {
      const view = realisticGroupedView(id, { ...pair, aggregate: "mean" });
      return new Set(view.rows.map(row => row.category)).size >= 2 &&
        new Set(view.rows.map(row => row.subgroup)).size >= 2;
    }
    if (capability === "matrix") {
      const view = realisticMatrixView(id, pair);
      const x = new Set(view.rows.map(row => row.x));
      const y = new Set(view.rows.map(row => row.y));
      return x.size >= 2 && y.size >= 2 &&
        view.rows.length / (x.size * y.size) >= 0.25;
    }
    if (capability === "facet") {
      const view = realisticRecordView(id, {
        ...pair,
        includeSecondaryMeasure: false,
        includeSecondaryDimension: true,
        deriveSubgroup: false,
        minimumPerSubgroup: 3,
        witnessCross: true
      });
      const counts = new Map();
      for (const row of view.rows) {
        counts.set(row.subgroup, (counts.get(row.subgroup) ?? 0) + 1);
      }
      return counts.size >= 2 && counts.size <= DEFAULT_SUBGROUP_LIMIT &&
        [...counts.values()].every(count => count >= 3);
    }
    if (["ordered", "temporal"].includes(capability)) {
      const view = realisticOrderedView(id, {
        ...pair,
        aggregate: "mean",
        temporalOnly: capability === "temporal"
      });
      const groups = new Map();
      for (const row of view.rows) {
        groups.set(row.group, (groups.get(row.group) ?? 0) + 1);
      }
      return [...groups.values()].some(count => count >= 2);
    }
    if (capability === "interval") {
      const view = realisticSummaryView(id, { ...pair, aggregate: "median" });
      return view.rows.length >= 2 && view.rows.every(row => row.lower < row.upper);
    }
    const view = realisticRecordView(id, {
      ...pair,
      includeSecondaryMeasure: false,
      includeSecondaryDimension: false,
      deriveSubgroup: false,
      ...(["histogram", "segmented-histogram"].includes(capability)
        ? { groupLimit: capability === "histogram" ? 24 : DEFAULT_GROUP_LIMIT }
        : {}),
      ...(capability === "distribution" ? { minimumPerGroup: 5 } : {})
    });
    if (["histogram", "segmented-histogram"].includes(capability)) {
      return view.rows.length >= 20 && new Set(view.rows.map(row => row.value)).size >= 5 &&
        (capability !== "segmented-histogram" ||
          new Set(view.rows.map(row => row.category)).size <= DEFAULT_GROUP_LIMIT);
    }
    if (capability === "distribution") {
      const values = new Map();
      for (const row of view.rows) {
        if (!values.has(row.category)) values.set(row.category, []);
        values.get(row.category).push(row.value);
      }
      return values.size >= 2 && [...values.values()].every(group =>
        group.length >= 5 && Math.min(...group) < Math.max(...group)
      );
    }
    return view.rows.length >= 2 && new Set(view.rows.map(row => row.category)).size >= 2;
  } catch (error) {
    const expected = error instanceof Error && (
      error.message.startsWith(`Dataset "${id}"`) ||
      error.message === "Realistic row limit cannot retain all required witness rows."
    );
    if (!expected) throw error;
    return false;
  }
}

export function realisticLifecycleRows(id, kind) {
  const records = realisticRecordView(id, {
    includeSecondaryDimension: true,
    deriveSubgroup: true
  });
  const summary = realisticSummaryView(id);
  const recordRows = records.rows;
  const summaryRows = summary.rows;
  const transformations = [...records.provenance.transformations];
  let rows;
  if (["style", "parallel"].includes(kind)) {
    const minimum = Math.min(...recordRows.map(row => row.value));
    const maximum = Math.max(...recordRows.map(row => row.value));
    const span = maximum - minimum || 1;
    const usable = recordRows.filter(row =>
      Number.isFinite(row.secondary) || Number.isFinite(row.orderNumeric)
    );
    if (usable.length < 2) {
      throw new Error(
        `Dataset "${id}" requires a second measure or source order for ${kind} analysis.`
      );
    }
    rows = usable.map((row, index) => ({
      id: row.key,
      x: row.secondary ?? row.orderNumeric,
      y: row.value,
      positive: Math.abs(row.value),
      size: Math.abs(row.secondary ?? row.value),
      opacity: (row.value - minimum) / span,
      color: row.category,
      shape: row.subgroup,
      angle: index * 360 / recordRows.length,
      category: row.category,
      group: row.subgroup,
      sourceRowIndex: row.sourceRowIndex
    }));
    transformations.push(
      freezeRecord({ op: "absolute-magnitude", source: "value", as: "positive" }),
      freezeRecord({ op: "min-max-normalize", source: "value", as: "opacity" }),
      freezeRecord({ op: "stable-angle-rank", source: "sourceRowIndex", as: "angle" })
    );
  } else if (kind === "temporal") {
    const temporalRows = recordRows.filter(row => row.time !== undefined);
    if (temporalRows.length < 2) {
      throw new Error(`Dataset "${id}" requires a source temporal field for lifecycle time analysis.`);
    }
    const ordered = [...temporalRows].sort((left, right) =>
      Date.parse(left.time) - Date.parse(right.time) ||
      left.sourceRowIndex - right.sourceRowIndex
    );
    rows = ordered.map((row, index) => ({
      id: row.key,
      time: row.time,
      order: index,
      value: row.value,
      group: row.subgroup,
      sourceRowIndex: row.sourceRowIndex
    }));
    transformations.push(freezeRecord({
      op: "stable-order-rank",
      source: records.provenance.fieldBindings.temporal,
      as: "order"
    }));
  } else if (["regression", "path"].includes(kind)) {
    const xValue = row => {
      if (Number.isFinite(row.secondary)) return row.secondary;
      if (Number.isFinite(row.orderNumeric)) return row.orderNumeric;
      if (row.time !== undefined) {
        const timestamp = Date.parse(row.time);
        if (Number.isFinite(timestamp)) return timestamp;
      }
      return undefined;
    };
    const pairedRows = recordRows.filter(row => xValue(row) !== undefined);
    if (pairedRows.length < 2) {
      throw new Error(
        `Dataset "${id}" requires a second measure or source order/time field for ${kind} analysis.`
      );
    }
    const projected = pairedRows.map(row => ({
      id: row.key,
      x: xValue(row),
      y: row.value,
      position: xValue(row),
      value: row.value,
      series: row.subgroup,
      group: row.subgroup,
      sourceRowIndex: row.sourceRowIndex
    }));
    if (kind === "path") {
      const grouped = new Map();
      for (const row of projected) {
        const key = `${row.group}\0${row.x}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(row);
      }
      rows = [...grouped.values()].map(groupRows => ({
        ...groupRows[0],
        y: groupRows.reduce((sum, row) => sum + row.y, 0) / groupRows.length,
        value: groupRows.reduce((sum, row) => sum + row.value, 0) / groupRows.length
      })).sort((left, right) =>
        String(left.group).localeCompare(String(right.group)) || left.x - right.x
      );
    } else {
      rows = projected;
    }
    transformations.push(freezeRecord({
      op: "project-real-analysis-pair",
      x: records.provenance.fieldBindings.secondaryMeasure ??
        records.provenance.fieldBindings.order ??
        records.provenance.fieldBindings.temporal,
      y: records.provenance.fieldBindings.measure
    }));
  } else if (["bar", "facet"].includes(kind)) {
    rows = recordRows.map(row => ({
      id: row.key,
      category: row.category,
      group: row.subgroup,
      series: row.subgroup,
      facet: row.subgroup,
      x: row.secondary ?? row.orderNumeric ?? row.value,
      y: row.value,
      value: row.value,
      sourceRowIndex: row.sourceRowIndex
    }));
  } else if (["interval", "box", "histogram"].includes(kind)) {
    rows = kind === "interval"
      ? summaryRows.map((row, index) => ({
          id: row.key,
          category: row.category,
          position: index + 1,
          center: row.center,
          lower: row.lower,
          upper: row.upper,
          group: "all-summary-groups"
        }))
      : recordRows.map(row => ({
          id: row.key,
          category: row.category,
          group: row.category,
          value: row.value,
          sourceRowIndex: row.sourceRowIndex
        }));
    if (kind === "interval") {
      transformations.push(freezeRecord({
        op: "median-iqr-projection",
        center: "median",
        lower: "q25",
        upper: "q75"
      }));
    }
  } else if (kind === "polar") {
    rows = summaryRows.map((row, index) => ({
      id: row.key,
      angle: index * 360 / summaryRows.length,
      radius: Math.abs(row.value),
      weight: Math.abs(row.value),
      group: row.category,
      sector: row.category
    }));
    transformations.push(
      freezeRecord({ op: "absolute-magnitude", source: "value", as: "radius" }),
      freezeRecord({ op: "stable-category-angle", source: "category", as: "angle" })
    );
  } else {
    throw new Error(`Unknown realistic lifecycle row kind "${kind}".`);
  }
  const source = ["interval", "polar"].includes(kind)
    ? summary.provenance
    : records.provenance;
  const additionalTransformations = ["interval", "polar"].includes(kind)
    ? transformations.slice(records.provenance.transformations.length)
    : transformations.slice(source.transformations.length);
  return freezeRecord({
    rows,
    provenance: extendProvenance(source, [
      ...source.transformations,
      ...additionalTransformations,
      freezeRecord({ op: "lifecycle-projection", kind })
    ])
  });
}
