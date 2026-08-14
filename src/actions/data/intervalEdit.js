import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { normalizeIntervalParameters } from "../../grammar/interval.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";
import { findDataset } from "../../selectors/datasets.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";

const STATISTICS_OPTIONS = Object.freeze(["center", "extent", "level"]);

export function ownOptions(value, options) {
  return Object.fromEntries(
    options.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]])
  );
}

export function resolveIntervalOwner(program, requested, {
  idLabel,
  label,
  mark,
  config
}) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, idLabel);
  return resolveEligibleLayer(program, {
    target,
    label,
    predicate: layer =>
      layer.mark?.type === mark &&
      program.markConfigs[layer.id]?.[config] !== undefined
  });
}

export function createResolvedIntervalData(program, resolved) {
  if (resolved.interval.mode !== "statistical") return program;
  return program.createIntervalData({
    id: resolved.dataId,
    source: resolved.source,
    field: resolved.interval.field,
    groupBy: resolved.groupBy,
    center: resolved.interval.center,
    extent: resolved.interval.extent,
    level: resolved.interval.level,
    as: resolved.fields
  });
}

export function applyIntervalRevision(program, interval) {
  if (!interval.changed) return program;
  let next = program.createIntervalData(interval.dataArgs);
  for (const rebind of interval.revision.rebinds) {
    next = next.rebindLayerData(rebind);
  }
  return next;
}

export function releaseIntervalRevision(program, interval) {
  return interval.changed
    ? program.releaseDerivedData(interval.revision.release)
    : program;
}

export function planIntervalEdit(program, {
  owner,
  data,
  consumers,
  statistics,
  operation
}) {
  if (!isPlainObject(statistics)) {
    throw new TypeError(`${operation} statistics must be a plain object.`);
  }
  validateKeys(statistics, STATISTICS_OPTIONS, `${operation} statistics`);
  if (!STATISTICS_OPTIONS.some(key => Object.hasOwn(statistics, key))) {
    throw new Error(
      `${operation} statistics requires center, extent, or level.`
    );
  }
  const previous = findDataset(program, data);
  const transform = previous?.transform?.length === 1
    ? previous.transform[0]
    : undefined;
  if (transform?.type !== "interval") {
    throw new Error(
      `${operation} statistics requires a statistical interval owner; ` +
      "explicit interval fields cannot be converted by edit."
    );
  }
  const center = Object.hasOwn(statistics, "center")
    ? statistics.center
    : transform.center;
  const extent = Object.hasOwn(statistics, "extent")
    ? statistics.extent
    : transform.extent;
  const raw = { center, extent };
  if (Object.hasOwn(statistics, "level")) {
    raw.level = statistics.level;
  } else if (extent === "ci" && transform.extent === "ci") {
    raw.level = transform.level;
  }
  const parameters = normalizeIntervalParameters(raw);
  const current = {
    center: transform.center,
    extent: transform.extent,
    ...(transform.level === undefined ? {} : { level: transform.level })
  };
  const changed = JSON.stringify(parameters) !== JSON.stringify(current);
  if (!changed) return { changed, parameters };

  const revision = planDerivedDataRevision(program, {
    owner,
    role: "IntervalData",
    previous: previous.id,
    consumers
  });
  return {
    changed,
    parameters,
    revision,
    dataArgs: {
      id: revision.id,
      source: previous.source,
      field: transform.field,
      groupBy: transform.groupBy,
      ...parameters,
      as: transform.as
    }
  };
}
