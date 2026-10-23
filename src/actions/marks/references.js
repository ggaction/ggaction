import { isSourceOwnedText } from "../../grammar/text.js";
import { GRADIENT_PROFILE_FIELDS } from "../../grammar/gradientProfile.js";
import { action, closedAction } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";

import { findCoordinate } from "../../selectors/coordinates.js";
import {
  findDataset,
  hasDataset,
  hasDatasetOwner
} from "../../selectors/datasets.js";
import { findLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveConsumerValuesForDataset } from
  "../scales/consumers/index.js";
import { findSelectionPolicy, resolveMarkItems } from
  "../../materialization/selection/policies/index.js";
import { getMarkMaterializationPolicy } from
  "../../materialization/marks/policies.js";
import { requireDerivedDataset } from "../data/shared.js";
import { withRematerializedDerivedDataset } from
  "../primitives/semanticAction.js";
import {
  deriveStatisticalReferenceValues,
  normalizeReferenceField,
  normalizeReferenceGroupBy,
  normalizeReferencePopulation,
  normalizeReferenceStatistics,
  normalizeStatisticalReferenceTransform,
  validateStatisticalReferenceTransform,
  partitionReferenceRows
} from "../../grammar/statisticalReference.js";
import { scalarKey } from "../../grammar/transformKeys.js";
import { deriveLineSeries, resolveLineBins } from "../../grammar/lineSeries.js";
import { isAggregate } from "../../grammar/aggregate.js";
import { findSemanticScale } from "../../selectors/scales.js";
import {
  resolveFacadeData,
  resolveFacadeId,
  validateFacadeOptions
} from "../charts/shared.js";
import { RECT_STYLE_PROPERTIES } from "../../grammar/roundedRect.js";
import { STROKE_STYLE_PROPERTIES } from "../../grammar/strokeStyle.js";

const COMMON_OPTIONS = Object.freeze([
  "id", "x", "y", "space", "source", "data", "coordinate", "temporalUnit"
]);
const DYNAMIC_OPTIONS = Object.freeze([
  "id", "source", "axis", "population", "field", "groupBy", "statistic", "statistics"
]);
const LINE_STYLE = Object.freeze([
  "stroke", "strokeWidth", "strokeDash", "opacity", ...STROKE_STYLE_PROPERTIES
]);
const BAND_STYLE = Object.freeze([
  "fill", "opacity", "stroke", "strokeWidth", ...RECT_STYLE_PROPERTIES
]);
const MATERIALIZE_OPTIONS = Object.freeze(["id"]);
const SERIES_MARKS = new Set(["line", "area"]);

function resolveLiteralBinding(program, args, axis, operation, band) {
  const space = args.space === undefined ? "data" : args.space;
  if (space !== "data" && space !== "plot") {
    throw new Error(`${operation} space must be data or plot.`);
  }
  if (space === "plot") {
    if (Object.hasOwn(args, "source") || Object.hasOwn(args, "temporalUnit")) {
      throw new Error(`${operation} plot space does not accept source or temporalUnit.`);
    }
    return {
      data: resolveFacadeData(program, args.data, operation),
      fieldType: "quantitative",
      coordinate: args.coordinate,
      plot: true
    };
  }
  if (Object.hasOwn(args, "data") || Object.hasOwn(args, "coordinate")) {
    throw new Error(`${operation} data space uses source data and coordinate.`);
  }
  const source = resolveEligibleLayer(program, {
    target: args.source === undefined
      ? undefined
      : validateUserId(args.source, `${operation} source`),
    predicate: layer =>
      !isSourceOwnedText(layer) &&
      layer.data !== undefined &&
      layer.encoding?.[axis]?.scale !== undefined &&
      findCoordinate(program, layer.coordinate)?.type === "cartesian" &&
      (!band || ["quantitative", "temporal"].includes(
        layer.encoding[axis].fieldType
      )),
    label: `${operation} Cartesian layer`,
    targetOption: "source"
  });
  const encoding = source.encoding[axis];
  return {
    data: source.data,
    coordinate: source.coordinate,
    scale: encoding.scale,
    fieldType: encoding.fieldType,
    temporalUnit: args.temporalUnit === undefined
      ? encoding.temporalUnit
      : args.temporalUnit
  };
}

function createLiteralReference(program, args, band) {
  const operation = band ? "createReferenceBand" : "createReferenceLine";
  const styleOptions = band ? BAND_STYLE : LINE_STYLE;
  validateFacadeOptions(args, [...COMMON_OPTIONS, ...styleOptions], operation);
  const axes = ["x", "y"].filter(axis => Object.hasOwn(args, axis));
  if (axes.length !== 1) {
    throw new Error(`${operation} requires exactly one of x or y.`);
  }
  const axis = axes[0];
  const values = band ? args[axis] : [args[axis]];
  if (!Array.isArray(values) || values.length !== (band ? 2 : 1)) {
    throw new Error(`${operation} ${axis} requires a two-value interval.`);
  }
  const id = resolveFacadeId(program, args.id, {
    defaultId: band ? "referenceBand" : "referenceLine",
    operation
  });
  const binding = resolveLiteralBinding(program, args, axis, operation, band);
  if (
    binding.plot &&
    !values.every(value =>
      Number.isFinite(value) && value >= 0 && value <= 1
    )
  ) {
    throw new Error(
      `${operation} plot coordinates must be finite numbers in [0, 1].`
    );
  }
  const scale = binding.plot ? `${id}-${axis}` : binding.scale;
  const style = Object.fromEntries(
    styleOptions
      .filter(key => args[key] !== undefined)
      .map(key => [key, args[key]])
  );
  const encode = axis === "x" ? "encodeX" : "encodeY";
  const options = {
    target: id,
    fieldType: binding.fieldType,
    scale: { id: scale },
    ...(binding.coordinate === undefined
      ? {}
      : { coordinate: binding.coordinate }),
    ...(binding.temporalUnit === undefined
      ? {}
      : { temporalUnit: binding.temporalUnit })
  };
  const apply = initial => {
    let next = binding.plot
      ? initial.createScale({ id: scale, type: "linear", domain: [0, 1] })
      : initial;
    next = band
      ? next.createRectMark({
          id,
          data: binding.data,
          fill: "#94a3b8",
          opacity: 0.15,
          stroke: false,
          ...style
        })
      : next.createRuleMark({
          id,
          data: binding.data,
          stroke: "#64748b",
          strokeWidth: 1,
          strokeDash: "dashed",
          ...style
        });
    next = next[encode]({ ...options, datum: values[0] });
    if (band) next = next[`${encode}2`]({ ...options, datum: values[1] });
    return next._withMarkConfig(id, {
      ...next.markConfigs[id],
      referenceAuthoring: { kind: "literal" }
    });
  };
  // Validate the complete lower-action chain on a discarded immutable branch.
  apply(program);
  return apply(program);
}

function requireStatisticalSource(program, config, referenceId) {
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

function resolveBoundPopulation(program, source, config, referenceId) {
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
  let resolvedProgram = program;
  if (source.data !== dataset.id) {
    const policy = getMarkMaterializationPolicy(source);
    if (typeof policy?.op !== "string") {
      throw new Error(
        `Statistical reference "${referenceId}" cannot resolve visible items for its source mark.`
      );
    }
    resolvedProgram = program
      .editSemantic({
        property: `layer[${source.id}].data`,
        value: dataset.id
      })
      [policy.op]({ id: source.id });
  }
  const items = resolveMarkItems(resolvedProgram, source.id);
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
    if (source.mark.type === "line" && isAggregate(source.encoding?.y?.aggregate)) {
      const x = source.encoding.x;
      const bins = x.bin === undefined ? undefined : resolveLineBins(
        dataset.values, source, findSemanticScale(program, x.scale)
      );
      const derived = deriveLineSeries(dataset.values, source, {
        ...(bins === undefined ? {} : { xBinBoundaries: bins.boundaries }),
        allowSingleton: true
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

function statisticalRows(program, referenceId) {
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
  if (population === "visibleItems" && findSelectionPolicy(source.mark?.type) === undefined) {
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

function replaceStatisticalDataset(program, id, source, transform, values) {
  const dataset = findDataset(program, id);
  if (dataset === undefined || dataset.source === undefined) {
    throw new Error(`Unknown statistical reference dataset "${id}".`);
  }
  validateStatisticalReferenceTransform(transform);
  return withRematerializedDerivedDataset(program, {
    id,
    source,
    transform,
    values
  });
}

function syncReferenceEncoding(program, id, source, config) {
  const layer = findLayer(program, id);
  if (layer === undefined) {
    throw new Error(`Unknown statistical reference mark "${id}".`);
  }
  const axis = config.axis;
  const secondary = `${axis}2`;
  const retained = new Set(
    config.statistics.length === 1 ? [axis] : [axis, secondary]
  );
  let next = program;
  for (const channel of ["x", "y", "x2", "y2"]) {
    if (!retained.has(channel) && layer.encoding?.[channel] !== undefined) {
      next = next.editSemantic({
        property: `layer[${id}].encoding.${channel}`,
        remove: true
      });
    }
  }
  const scale = source.encoding[axis].scale;
  const fields = config.statistics.length === 1
    ? [[axis, "value"]]
    : [[axis, "lower"], [secondary, "upper"]];
  for (const [channel, field] of fields) {
    const current = findLayer(next, id).encoding?.[channel];
    if (current?.datum !== undefined) {
      next = next.editSemantic({
        property: `layer[${id}].encoding.${channel}.datum`,
        remove: true
      });
    }
    for (const [property, value] of Object.entries({
      field,
      fieldType: "quantitative",
      scale
    })) {
      if (findLayer(next, id).encoding?.[channel]?.[property] !== value) {
        next = next.editSemantic({
          property: `layer[${id}].encoding.${channel}.${property}`,
          value
        });
      }
    }
  }
  const currentCoordinate = findLayer(next, id).coordinate;
  if (source.coordinate === undefined && currentCoordinate !== undefined) {
    next = next.editSemantic({
      property: `layer[${id}].coordinate`,
      remove: true
    });
  } else if (source.coordinate !== undefined && source.coordinate !== currentCoordinate) {
    next = next.editSemantic({
      property: `layer[${id}].coordinate`,
      value: source.coordinate
    });
  }
  return next;
}

export const materializeStatisticalReferenceData = /* @__PURE__ */ closedAction(
  {
    op: "materializeStatisticalReferenceData",
    description: "Materialize one owned statistical reference value dataset."
  }, MATERIALIZE_OPTIONS,
  function (args = {}) {
    const { id, transform } = requireDerivedDataset(
      this,
      args.id,
      "statisticalReference"
    );
    const values = statisticalRows(this, transform.target);
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: values
    });
  }
);

export const rematerializeStatisticalReference = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeStatisticalReference",
    description: "Recompute one source-dependent statistical reference."
  }, MATERIALIZE_OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Statistical reference mark id");
    const config = this.markConfigs[id]?.statisticalReference;
    const { source } = requireStatisticalSource(this, config, id);
    const population = normalizeReferencePopulation(config.population);
    const { dataset } = resolveBoundPopulation(this, source, { ...config, population }, id);
    const values = statisticalRows(this, id);
    const transform = normalizeStatisticalReferenceTransform({ target: id });
    let next = replaceStatisticalDataset(
      this,
      config.dataId,
      dataset.id,
      transform,
      values
    );
    if (findLayer(next, id)?.data !== config.dataId) {
      next = next.editSemantic({
        property: `layer[${id}].data`,
        value: config.dataId
      });
    }
    next = syncReferenceEncoding(next, id, source, config);
    const appearanceScales = new Set(["stroke", "strokeWidth", "strokeDash", "opacity", "color"]
      .map(channel => findLayer(next, id).encoding?.[channel]?.scale).filter(Boolean));
    for (const scale of appearanceScales) {
      next = next.rematerializeScale({ id: scale, marks: false, guides: false });
    }
    // References do not contribute to their source's positional scale domain.
    // Re-entering that scale's mark plan here would rematerialize the source
    // and its dependent reference recursively (notably gradient strips).
    next = config.statistics.length === 1
      ? next.rematerializeRuleMark({ id, scales: false })
      : next.rematerializeRectMark({ id, scales: false });
    return next._withContext(this.context);
  }
);

function isDynamicReference(args) {
  return ["axis", "population", "field", "groupBy", "statistic", "statistics"]
    .some(key => Object.hasOwn(args, key));
}

function normalizeDynamicReference(program, args, band) {
  const operation = band ? "createReferenceBand" : "createReferenceLine";
  const styleOptions = band ? BAND_STYLE : LINE_STYLE;
  validateFacadeOptions(
    args,
    [...DYNAMIC_OPTIONS, ...styleOptions],
    operation
  );
  if (typeof args.source !== "string") {
    throw new TypeError(`${operation} statistical source must be a mark id.`);
  }
  const sourceId = validateUserId(args.source, `${operation} source`);
  if (!["x", "y"].includes(args.axis)) {
    throw new Error(`${operation} statistical axis must be x or y.`);
  }
  if (band && Object.hasOwn(args, "statistic")) {
    throw new Error(`${operation} uses statistics, not statistic.`);
  }
  if (!band && Object.hasOwn(args, "statistics")) {
    throw new Error(`${operation} uses statistic, not statistics.`);
  }
  const statistics = normalizeReferenceStatistics(
    band ? args.statistics : [args.statistic],
    band ? 2 : 1,
    operation
  );
  const id = resolveFacadeId(program, args.id, {
    defaultId: band ? "referenceBand" : "referenceLine",
    operation
  });
  const config = {
    source: sourceId,
    axis: args.axis,
    population: normalizeReferencePopulation(args.population, `${operation} population`),
    field: normalizeReferenceField(args.field, `${operation} field`),
    ...(args.groupBy === undefined ? {} : { groupBy: normalizeReferenceGroupBy(args.groupBy) }),
    statistics,
    dataId: `${id}-statistical-reference-data`
  };
  const preview = program._withMarkConfig(id, { statisticalReference: config });
  const { source } = requireStatisticalSource(preview, config, id);
  const { dataset } = resolveBoundPopulation(
    program,
    source,
    config,
    id
  );
  statisticalRows(preview, id);
  if (hasDataset(program, config.dataId) || hasDatasetOwner(program, config.dataId)) {
    throw new Error(`Dataset "${config.dataId}" already exists.`);
  }
  return { id, config, dataset, styleOptions };
}

function createDynamicReference(program, args, band) {
  const { id, config, dataset, styleOptions } = normalizeDynamicReference(
    program,
    args,
    band
  );
  const style = Object.fromEntries(
    styleOptions
      .filter(key => args[key] !== undefined)
      .map(key => [key, args[key]])
  );
  const transform = normalizeStatisticalReferenceTransform({ target: id });
  const apply = initial => {
    const originalContext = initial.context;
    let next = initial
      .createDerivedData({
        id: config.dataId,
        source: dataset.id,
        transform: [transform]
      })
      ._withMarkConfig(id, { statisticalReference: config })
      .materializeStatisticalReferenceData({ id: config.dataId });
    next = band
      ? next.createRectMark({
          id,
          data: config.dataId,
          fill: "#94a3b8",
          opacity: 0.15,
          stroke: false,
          ...style
        })
      : next.createRuleMark({
          id,
          data: config.dataId,
          stroke: "#64748b",
          strokeWidth: 1,
          strokeDash: "dashed",
          ...style
        });
    next = next._withMarkConfig(id, {
      ...next.markConfigs[id],
      itemFilterable: false,
      statisticalReference: config
    });
    return next
      .rematerializeStatisticalReference({ id })
      ._withContext({ ...originalContext, currentMark: id });
  };
  // Validate every owned data, semantic, scale, and renderer step atomically.
  apply(program);
  return apply(program);
}

function createReference(program, args, band) {
  return isDynamicReference(args)
    ? createDynamicReference(program, args, band)
    : createLiteralReference(program, args, band);
}

export const createReferenceLine = /* @__PURE__ */ action(
  {
    op: "createReferenceLine",
    description: "Create a constant or statistical reference line."
  },
  function (args = {}) {
    return createReference(this, args, false);
  }
);

export const createReferenceBand = /* @__PURE__ */ action(
  {
    op: "createReferenceBand",
    description: "Create a constant or statistical reference interval."
  },
  function (args = {}) {
    return createReference(this, args, true);
  }
);


export const createStatisticalReference = /* @__PURE__ */ action(
  {
    op: "createStatisticalReference",
    description: "Create a statistical reference line or central interval through one public action."
  },
  function (args = {}) {
    const band = Object.hasOwn(args, "statistics");
    validateFacadeOptions(args, ["id", "source", "axis", "population", "field", "groupBy",
      ...(band ? ["statistics", ...BAND_STYLE] : ["statistic", ...LINE_STYLE])], "createStatisticalReference");
    const id = resolveFacadeId(this, args.id, {
      defaultId: "statisticalReference", operation: "createStatisticalReference"
    });
    // The existing owners retain statistical population, scale exclusion,
    // source replay, persistence and removal semantics, with wrapped trace steps.
    if (band) {
      return this.createReferenceBand({ fill: "#6b7280", opacity: 0.18, ...args, id });
    }
    const next = this.createReferenceLine({ statistic: { op: "mean" }, stroke: "#222222",
      strokeWidth: 2.5, strokeDash: "solid", ...args, id });
    const color = findLayer(this, args.source)?.encoding?.color;
    // Reuse the source scale: a fresh palette would assign different colors
    // after filtering, domain sorting, or a custom range.
    if (args.stroke === undefined && args.groupBy !== undefined &&
        color?.field === args.groupBy && color.scale !== undefined &&
        color.aggregate === undefined) {
      return next.encodeStroke({
        target: id, field: "group", fieldType: color.fieldType,
        ...(color.temporalUnit === undefined ? {} : { temporalUnit: color.temporalUnit }),
        scale: { id: color.scale }
      });
    }
    return next;
  }
);
