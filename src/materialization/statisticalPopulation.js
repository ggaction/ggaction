import { validateUserId } from "../core/identifiers.js";
import { isPlainObject } from "../core/immutable.js";
import { findLayer } from "../selectors/layers.js";
import { findCoordinate } from "../selectors/coordinates.js";
import { findSemanticScale } from "../selectors/scales.js";
import { findSelectionPolicy } from "./selection/policies/index.js";
import { deriveStatisticalReferenceValues, normalizeReferenceStatistics, normalizeReferencePopulation, normalizeReferenceGroupBy } from "../grammar/statisticalReference.js";
import { scalarKey } from "../grammar/transformKeys.js";
import { isAggregate } from "../grammar/aggregate.js";
import { deriveLineSeries, resolveLineBins } from "../grammar/lineSeries.js";
import { resolveConsumerValuesForDataset } from "./scales/consumers/index.js";
const SERIES_MARKS = new Set(["line", "area"]);

import { findDataset, requireDataset } from "../selectors/datasets.js";
import { requireLayer } from "../selectors/layers.js";
import { GRADIENT_PROFILE_FIELDS } from "../grammar/gradientProfile.js";
import { partitionReferenceRows } from "../grammar/statisticalReference.js";
import { resolveMarkItems } from "./selection/policies/index.js";
import { inputRowReference } from "../grammar/rowLineage.js";
import { groupingIdentity } from "../grammar/rowLineage.js";

export function resolveBoundPopulation(program, source, config, referenceId) {
  let dataset = findDataset(program, source.data);
  if (dataset === undefined || !Array.isArray(dataset.values)) {
    throw new Error(
      `Statistical reference "${referenceId}" source requires materialized data.`
    );
  }
  if (config.population === "visibleItems") return { dataset };
  while (
    dataset.transform?.length === 1 &&
    dataset.transform[0].type === "markFilter" &&
    dataset.transform[0].target === source.id
  ) {
    const parent = findDataset(program, dataset.source);
    if (parent === undefined || !Array.isArray(parent.values)) {
      throw new Error(
        `Statistical reference "${referenceId}" bound data is unavailable.`
      );
    }
    dataset = parent;
  }
  const transform = dataset.transform?.length === 1 ? dataset.transform[0] : undefined;
  const axisField = source.encoding[config.axis].field;
  let field;
  if (transform?.type === "density" && axisField === transform.as[0]) {
    field = transform.field;
  } else if (transform?.type === "ecdf" && axisField === transform.as.value) {
    field = transform.field;
  } else if (transform?.type === "boxSummary" && transform.method !== "precomputed" &&
      Object.values(transform.as).includes(axisField)) {
    field = transform.field;
  } else if (transform?.type === "gradientProfile" &&
      [GRADIENT_PROFILE_FIELDS.lower, GRADIENT_PROFILE_FIELDS.upper,
        GRADIENT_PROFILE_FIELDS.center].includes(axisField)) {
    field = transform.field;
  } else if (transform?.type === "summary") {
    const endpointOwner = Object.entries(program.markConfigs).some(([id, config]) =>
      config.endpointPlot && (id === source.id ||
        Object.values(config.endpointPlot.roles).includes(source.id)));
    if (endpointOwner) field = transform.aggregates.find(aggregate => aggregate.as === axisField)?.field;
  } else if (transform?.type === "horizon" && axisField === transform.as.x) {
    field = transform.x.field;
  }
  if (field !== undefined) {
    const observationField = field;
    const parent = findDataset(program, dataset.source);
    if (parent === undefined || !Array.isArray(parent.values)) {
      throw new Error(`Statistical reference "${referenceId}" bound data is unavailable.`);
    }
    if (config.field.kind === "explicit") {
      // Explicit output fields remain available; original observation fields
      // resolve against the statistical owner's input rather than sampled rows.
      if (!parent.values.every(row => Object.hasOwn(row, config.field.field))) return { dataset };
      field = config.field.field;
    }
    const groupFields = transform.category === undefined
      ? [...(Array.isArray(transform.groupBy) ? transform.groupBy
        : transform.groupBy === undefined ? [] : [transform.groupBy]),
        ...(transform.placement?.split?.field === undefined ? [] : [transform.placement.split.field])]
      : [transform.category];
    const groupKey = row => JSON.stringify(groupFields.map(key => row?.[key]));
    const observedGroups = new Set(dataset.values.map(row =>
      transform.type === "horizon" && groupFields.length
        ? JSON.stringify([row[transform.as.group]]) : groupKey(row)));
    return {
      dataset: { ...parent, values: parent.values.filter(row =>
        Number.isFinite(row?.[transform.field ?? observationField]) &&
        (transform.type !== "horizon" || Number.isFinite(row?.[transform.y.field])) &&
        observedGroups.has(groupKey(row))) },
      field
    };
  }
  return { dataset };
}

// Uses the same population boundary as the statistical value calculation.
export function statisticalReferenceContributions(program, referenceId) {
  const config = program.markConfigs[referenceId].statisticalReference;
  const source = requireLayer(program, config.source);
  const { dataset } = resolveBoundPopulation(program, source, config, referenceId);
  const canonical = requireDataset(program, dataset.id);
  const positions = new Map();
  canonical.values.forEach((row, index) => positions.set(row, [...(positions.get(row) ?? []), index]));
  const visible = config.population === "visibleItems" ? resolveMarkItems(program, source.id) : undefined;
  return partitionReferenceRows(dataset.values, config.groupBy).flatMap(group => {
    const selected = visible?.filter(item => config.groupBy === undefined ||
      groupingIdentity([item.fields[config.groupBy]]) === groupingIdentity([group.group]));
    if (selected?.length === 0) return [];
    const indices = selected === undefined
      ? [...new Set(group.rows.flatMap(row => positions.get(row) ?? []))]
      : [...new Set(selected.flatMap(item => item.rows.filter(ref => ref.data === dataset.id).map(ref => ref.index)))];
    return [indices.sort((a, b) => a - b).map(index => inputRowReference(canonical, index))];
  });
}

export function requireStatisticalSource(program, config, referenceId) {
  if (!isPlainObject(config)) {
    throw new TypeError(
      `Statistical reference "${referenceId}" requires materialization config.`
    );
  }
  const sourceId = validateUserId(
    config.source,
    `Statistical reference "${referenceId}" source`
  );
  const source = findLayer(program, sourceId);
  if (source === undefined) {
    throw new Error(
      `Statistical reference "${referenceId}" source "${sourceId}" does not exist.`
    );
  }
  if (
    sourceId === referenceId ||
    program.markConfigs[sourceId]?.referenceAuthoring !== undefined ||
    program.markConfigs[sourceId]?.statisticalReference !== undefined
  ) {
    throw new Error(
      `Statistical reference "${referenceId}" source must be a non-reference mark.`
    );
  }
  if (findCoordinate(program, source.coordinate)?.type !== "cartesian") {
    throw new Error(
      `Statistical reference "${referenceId}" source must use Cartesian coordinates.`
    );
  }
  if (!["x", "y"].includes(config.axis)) {
    throw new Error(
      `Statistical reference "${referenceId}" axis must be x or y.`
    );
  }
  const encoding = source.encoding?.[config.axis];
  const sourceTransform = findDataset(program, source.data)?.transform?.[0];
  if (sourceTransform?.type === "horizon" && config.axis === "y") {
    throw new Error(
      `Statistical reference "${referenceId}" cannot summarize Horizon folded Y coordinates. Use a quantitative X axis.`
    );
  }
  if (
    encoding?.fieldType !== "quantitative" ||
    typeof encoding.scale !== "string" ||
    encoding.scale.length === 0
  ) {
    throw new Error(
      `Statistical reference "${referenceId}" source axis must have a quantitative scaled encoding.`
    );
  }
  if (
    !isPlainObject(config.field) ||
    !["axis", "explicit"].includes(config.field.kind) ||
    (config.field.kind === "explicit" &&
      (typeof config.field.field !== "string" || config.field.field.length === 0))
  ) {
    throw new Error(
      `Statistical reference "${referenceId}" has an invalid field binding.`
    );
  }
  return { source, encoding };
}


function strictFieldValues(rows, field, label) {
  return rows.map((row, index) => {
    if (!isPlainObject(row) || !Object.hasOwn(row, field)) {
      throw new Error(`${label} field "${field}" is missing at item ${index}.`);
    }
    const value = row[field];
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `${label} field "${field}" must contain finite numbers; item ${index} is invalid.`
      );
    }
    return value;
  });
}

function visibleExplicitValues(program, source, dataset, field, referenceId) {
  if (SERIES_MARKS.has(source.mark?.type) || source.encoding?.parallel !== undefined) {
    throw new Error(
      `Statistical reference "${referenceId}" visibleItems population is ambiguous for series marks.`
    );
  }
  const items = resolveMarkItems(program, source.id);
  return items.map((item, index) => {
    if (!Object.hasOwn(item.fields, field)) {
      throw new Error(
        `Statistical reference "${referenceId}" field "${field}" is not scalar at visible item ${index}.`
      );
    }
    const value = item.fields[field];
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Statistical reference "${referenceId}" field "${field}" must be finite at visible item ${index}.`
      );
    }
    return value;
  });
}

function resolvePopulationValues(
  program,
  source,
  encoding,
  config,
  dataset,
  referenceId
) {
  if (
    config.population === "visibleItems" &&
    (SERIES_MARKS.has(source.mark?.type) || source.encoding?.parallel !== undefined)
  ) {
    throw new Error(
      `Statistical reference "${referenceId}" visibleItems population is ambiguous for series marks.`
    );
  }
  if (config.field.kind === "explicit") {
    return config.population === "visibleItems"
      ? visibleExplicitValues(
          program,
          source,
          dataset,
          config.field.field,
          referenceId
        )
      : strictFieldValues(
          dataset.values,
          config.field.field,
          `Statistical reference "${referenceId}" boundData`
        );
  }
  const gradient = program.markConfigs[source.id]?.gradientPlot;
  if (config.population === "boundData") {
    const { field } = resolveBoundPopulation(program, source, config, referenceId);
    if (field !== undefined) return strictFieldValues(dataset.values, field,
      `Statistical reference "${referenceId}" boundData`);
    if (source.mark.type === "line" && (isAggregate(source.encoding?.y?.aggregate) || isAggregate(source.encoding?.x?.aggregate))) {
      const x = source.encoding.x;
      const bins = x.bin === undefined ? undefined : resolveLineBins(
        dataset.values, source, findSemanticScale(program, x.scale)
      );
      const derived = deriveLineSeries(dataset.values, source, {
        ...(bins === undefined ? {} : { xBinBoundaries: bins.boundaries }),
        allowSingleton: true,
        xDomain: program.resolvedScales[source.encoding.x.scale]?.domain,
        yDomain: program.resolvedScales[source.encoding.y.scale]?.domain
      });
      return config.axis === "x" ? derived.xValues : derived.yValues;
    }
  }
  if (gradient?.materialized &&
      config.axis === (gradient.orientation === "vertical" ? "y" : "x")) {
    return strictFieldValues(dataset.values, config.population === "boundData"
      ? gradient.measure : GRADIENT_PROFILE_FIELDS.center,
    `Statistical reference "${referenceId}" ${config.population}`);
  }
  return resolveConsumerValuesForDataset(program, {
    layer: source,
    channel: config.axis,
    encoding
  }, dataset);
}

export function statisticalRows(program, referenceId) {
  const config = program.markConfigs[referenceId]?.statisticalReference;
  const { source, encoding } = requireStatisticalSource(
    program,
    config,
    referenceId
  );
  if (!Array.isArray(config.statistics) || ![1, 2].includes(config.statistics.length)) {
    throw new Error(
      `Statistical reference "${referenceId}" requires one or two statistics.`
    );
  }
  const statistics = normalizeReferenceStatistics(
    config.statistics,
    config.statistics.length,
    `Statistical reference "${referenceId}"`
  );
  const population = normalizeReferencePopulation(
    config.population,
    `Statistical reference "${referenceId}" population`
  );
  const { dataset } = resolveBoundPopulation(program, source, { ...config, population }, referenceId);
  const groupBy = normalizeReferenceGroupBy(config.groupBy);
  if (population === "visibleItems" && (source.mark?.type === "text" || findSelectionPolicy(source.mark?.type) === undefined)) {
    throw new Error(
      `Statistical reference "${referenceId}" visibleItems population is unavailable for ${source.mark?.type} marks. Use boundData.`
    );
  }
  let visibleGroups;
  if (groupBy !== undefined && population === "visibleItems") {
    if (SERIES_MARKS.has(source.mark?.type) || source.encoding?.parallel !== undefined) {
      throw new Error(`Statistical reference "${referenceId}" visibleItems population is ambiguous for series marks.`);
    }
    visibleGroups = new Map();
    for (const item of resolveMarkItems(program, source.id)) {
      if (!Object.hasOwn(item.fields, groupBy)) {
        throw new Error(`Statistical reference "${referenceId}" groupBy field "${groupBy}" is not scalar at a visible item. Use boundData.`);
      }
      const key = scalarKey(item.fields[groupBy], "Statistical reference groupBy");
      if (!visibleGroups.has(key)) visibleGroups.set(key, []);
      visibleGroups.get(key).push(item.fields);
    }
  }
  const groups = partitionReferenceRows(dataset.values, groupBy)
    .filter(group => !visibleGroups || visibleGroups.has(group.key));
  if (!groups.length) throw new Error(`Statistical reference "${referenceId}" population must contain at least one value.`);
  return groups.map(group => {
    const values = visibleGroups && config.field.kind === "explicit"
      ? strictFieldValues(visibleGroups.get(group.key), config.field.field, `Statistical reference "${referenceId}" visibleItems`)
      : resolvePopulationValues(program, source, encoding,
          { ...config, population, statistics }, { ...dataset, values: group.rows }, referenceId);
    const resolved = deriveStatisticalReferenceValues(values, statistics, `Statistical reference "${referenceId}"`);
    if (resolved.length === 2 && resolved[0] > resolved[1]) {
      throw new Error(`Statistical reference band "${referenceId}" lower statistic exceeds its upper statistic.`);
    }
    return { ...(groupBy === undefined ? {} : { group: group.group }),
      ...(resolved.length === 1 ? { value: resolved[0] } : { lower: resolved[0], upper: resolved[1] }) };
  });
}

