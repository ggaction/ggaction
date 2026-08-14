import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  validateGeneratedItemLimit,
  validateNonEmptyString as requireField
} from "../core/validation.js";
import { normalizePalette } from "./palettes.js";
import { interpolateNumber, inverseLerp } from "./numeric.js";
import { requireFiniteResult } from "./numeric.js";
import {
  isNominalValue,
  normalizeTemporalValue
} from "./scales/index.js";

export const HORIZON_RESOLUTIONS = Object.freeze(["shared", "independent"]);
export const HORIZON_MISSING_POLICIES = Object.freeze(["break", "error"]);
export const HORIZON_OVERFLOW_POLICIES = Object.freeze(["clip", "error"]);

const ENCODING_PROPERTIES = Object.freeze(["field", "fieldType"]);
const OUTPUT_PROPERTIES = Object.freeze([
  "x", "lower", "upper", "group", "color", "sign", "band", "segment"
]);

function validateEncoding(value, role) {
  if (!isPlainObject(value)) {
    throw new TypeError(`Horizon ${role} encoding must be a plain object.`);
  }
  const unknown = Object.keys(value).find(
    property => !ENCODING_PROPERTIES.includes(property)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown Horizon ${role} encoding property "${unknown}".`);
  }
  const field = requireField(value.field, `Horizon ${role} field`);
  const fieldType = value.fieldType ?? "quantitative";
  const supportsTemporal = role === "x";
  if (
    fieldType !== "quantitative" &&
    (!supportsTemporal || fieldType !== "temporal")
  ) {
    throw new Error(
      `Horizon ${role} fieldType must be quantitative${supportsTemporal ? " or temporal" : ""}.`
    );
  }
  return { field, fieldType };
}

function validateOutputFields(value) {
  if (!isPlainObject(value)) {
    throw new TypeError("Horizon as must be a plain object.");
  }
  const unknown = Object.keys(value).find(
    property => !OUTPUT_PROPERTIES.includes(property)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown Horizon output field "${unknown}".`);
  }
  const output = Object.fromEntries(OUTPUT_PROPERTIES.map(property => [
    property,
    requireField(value[property], `Horizon ${property} output field`)
  ]));
  if (new Set(Object.values(output)).size !== OUTPUT_PROPERTIES.length) {
    throw new Error("Horizon output fields must be distinct.");
  }
  return output;
}

function validatePalette(value = {}) {
  if (!isPlainObject(value)) {
    throw new TypeError("Horizon palette must be a plain object.");
  }
  const unknown = Object.keys(value).find(
    property => !["positive", "negative"].includes(property)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown Horizon palette property "${unknown}".`);
  }
  return {
    positive: normalizePalette(value.positive ?? "blues"),
    negative: normalizePalette(value.negative ?? "reds")
  };
}

function validateResolved(value) {
  if (!isPlainObject(value) || Object.keys(value).some(key => key !== "extents")) {
    throw new TypeError("Horizon resolved provenance must contain only extents.");
  }
  if (!Array.isArray(value.extents) || value.extents.length === 0) {
    throw new TypeError("Horizon resolved extents must be a non-empty array.");
  }
  for (const [index, entry] of value.extents.entries()) {
    if (
      !isPlainObject(entry) ||
      Object.keys(entry).some(key => !["group", "extent", "bandHeight"].includes(key)) ||
      !Number.isFinite(entry.extent) ||
      entry.extent < 0 ||
      !Number.isFinite(entry.bandHeight) ||
      entry.bandHeight < 0
    ) {
      throw new TypeError(`Horizon resolved extent ${index} is invalid.`);
    }
    if (Object.hasOwn(entry, "group") && !isNominalValue(entry.group)) {
      throw new TypeError(`Horizon resolved group ${index} must be nominal.`);
    }
  }
  return value;
}

export function requestedHorizonTransform(transform) {
  const { resolved: _resolved, ...requested } = transform;
  void _resolved;
  return requested;
}

export function validateHorizonTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Horizon transform must be a plain object.");
  }
  const supported = [
    "type", "x", "y", "groupBy", "bands", "baseline", "extent",
    "resolve", "missing", "overflow", "palette", "as", "resolved"
  ];
  const unknown = Object.keys(transform).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown Horizon transform property "${unknown}".`);
  }
  if (transform.type !== "horizon") {
    throw new Error(`Unsupported Horizon transform "${transform.type}".`);
  }
  const x = validateEncoding(transform.x, "x");
  const y = validateEncoding(transform.y, "y");
  if (x.field === y.field) {
    throw new Error("Horizon x and y fields must differ.");
  }
  if (transform.groupBy !== undefined) {
    requireField(transform.groupBy, "Horizon groupBy");
    if ([x.field, y.field].includes(transform.groupBy)) {
      throw new Error("Horizon groupBy must differ from x and y fields.");
    }
  }
  if (!Number.isInteger(transform.bands) || transform.bands <= 0) {
    throw new RangeError("Horizon bands must be a positive integer.");
  }
  validateGeneratedItemLimit(transform.bands, "Horizon bands");
  if (!Number.isFinite(transform.baseline)) {
    throw new TypeError("Horizon baseline must be finite.");
  }
  if (
    transform.extent !== "auto" &&
    (!Number.isFinite(transform.extent) || transform.extent <= 0)
  ) {
    throw new RangeError('Horizon extent must be "auto" or a positive number.');
  }
  if (!HORIZON_RESOLUTIONS.includes(transform.resolve)) {
    throw new Error(`Unknown Horizon resolve "${transform.resolve}".`);
  }
  if (!HORIZON_MISSING_POLICIES.includes(transform.missing)) {
    throw new Error(`Unknown Horizon missing policy "${transform.missing}".`);
  }
  if (!HORIZON_OVERFLOW_POLICIES.includes(transform.overflow)) {
    throw new Error(`Unknown Horizon overflow policy "${transform.overflow}".`);
  }
  const palette = validatePalette(transform.palette);
  for (const [sign, value] of Object.entries(palette)) {
    if (value.count !== undefined && value.count !== transform.bands) {
      throw new Error(
        `Horizon ${sign} palette count must equal bands (${transform.bands}).`
      );
    }
  }
  const as = validateOutputFields(transform.as);
  if (transform.groupBy !== undefined && Object.values(as).includes(transform.groupBy)) {
    throw new Error("Horizon output fields must not collide with groupBy.");
  }
  if (transform.resolved !== undefined) validateResolved(transform.resolved);
  return cloneAndFreeze({
    ...transform,
    x,
    y,
    palette,
    as
  });
}

function orderedX(value, encoding, rowIndex) {
  if (encoding.fieldType === "temporal") {
    return normalizeTemporalValue(value, encoding.field, rowIndex);
  }
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `Horizon x field "${encoding.field}" must contain finite numbers at row ${rowIndex}.`
    );
  }
  return value;
}

function groupRows(rows, transform) {
  const groups = [];
  const indexed = new Map();
  for (const [sourceRowIndex, row] of rows.entries()) {
    if (!isPlainObject(row)) {
      throw new TypeError(`Horizon row ${sourceRowIndex} must be a plain object.`);
    }
    const group = transform.groupBy === undefined ? undefined : row[transform.groupBy];
    if (transform.groupBy !== undefined && !isNominalValue(group)) {
      throw new TypeError(
        `Horizon groupBy field "${transform.groupBy}" must contain nominal values at row ${sourceRowIndex}.`
      );
    }
    const key = transform.groupBy === undefined
      ? "__horizon_ungrouped__"
      : `${typeof group}:${String(group)}`;
    if (!indexed.has(key)) {
      const entry = { group, groupIndex: groups.length, rows: [] };
      indexed.set(key, entry);
      groups.push(entry);
    }
    const y = row[transform.y.field];
    const missing = !Number.isFinite(y);
    if (missing && transform.missing === "error") {
      throw new Error(
        `Horizon y field "${transform.y.field}" is missing at source row ${sourceRowIndex}.`
      );
    }
    indexed.get(key).rows.push({
      sourceRowIndex,
      x: orderedX(row[transform.x.field], transform.x, sourceRowIndex),
      y,
      missing
    });
  }
  for (const entry of groups) {
    entry.rows.sort((left, right) =>
      left.x - right.x || left.sourceRowIndex - right.sourceRowIndex
    );
    for (let index = 1; index < entry.rows.length; index += 1) {
      if (entry.rows[index - 1].x === entry.rows[index].x) {
        throw new Error(
          `Horizon group ${JSON.stringify(entry.group ?? null)} has duplicate x value ${entry.rows[index].x}.`
        );
      }
    }
  }
  return groups;
}

function splitSegments(rows, baseline) {
  const segments = [];
  let current = [];
  const flush = () => {
    if (current.length > 0) segments.push(current);
    current = [];
  };
  for (const row of rows) {
    if (row.missing) {
      flush();
      continue;
    }
    current.push({
      ...row,
      signed: requireFiniteResult(
        row.y - baseline,
        "Horizon signed deviation"
      ),
      interpolated: false
    });
  }
  flush();
  return segments;
}

function insertCrossings(points, baseline) {
  if (points.length < 2) return points.map(point => ({ ...point }));
  const output = [{ ...points[0] }];
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    if (left.signed * right.signed < 0) {
      const fraction = inverseLerp(baseline, left.y, right.y);
      output.push({
        sourceRowIndex: undefined,
        x: interpolateNumber(left.x, right.x, fraction),
        y: baseline,
        missing: false,
        signed: 0,
        interpolated: true,
        leftSourceRowIndex: left.sourceRowIndex,
        rightSourceRowIndex: right.sourceRowIndex,
        fraction
      });
    }
    output.push({ ...right });
  }
  return output;
}

function pointSign(value) {
  return value > 0 ? "positive" : value < 0 ? "negative" : "zero";
}

function runsForSign(points, desired) {
  const runs = [];
  let current = [];
  let pendingZeros = [];
  const flush = () => {
    if (current.some(point => pointSign(point.signed) === desired)) {
      runs.push(current);
    }
    current = [];
  };
  for (const point of points) {
    const sign = pointSign(point.signed);
    if (sign === desired) {
      if (current.length === 0 && pendingZeros.length > 0) {
        current.push(...pendingZeros);
      }
      current.push(point);
      pendingZeros = [];
    } else if (sign === "zero") {
      if (current.length > 0) {
        current.push(point);
        flush();
      }
      pendingZeros = [point];
    } else {
      flush();
      pendingZeros = [];
    }
  }
  flush();
  return runs;
}

function maximumMagnitude(group) {
  let maximum = 0;
  for (const segment of group.segments ?? [group]) {
    for (const point of segment) {
      maximum = Math.max(maximum, Math.abs(point.signed));
    }
  }
  return maximum;
}

function resolvedExtents(groups, transform) {
  if (transform.extent !== "auto") return groups.map(() => transform.extent);
  if (transform.resolve === "shared") {
    let shared = 0;
    for (const group of groups) shared = Math.max(shared, maximumMagnitude(group));
    return groups.map(() => shared);
  }
  return groups.map(maximumMagnitude);
}

function validateOutputBudget(groups, extents, transform) {
  let count = 0;
  for (const [groupIndex, group] of groups.entries()) {
    const extent = extents[groupIndex];
    if (extent === 0) continue;
    const bandHeight = extent / transform.bands;
    if (!(bandHeight > 0) || !Number.isFinite(bandHeight)) {
      throw new RangeError(
        "Horizon band height is outside the positive finite numeric range."
      );
    }
    for (const sign of ["negative", "positive"]) {
      for (const segment of group.segments) {
        for (const run of runsForSign(segment, sign)) {
          const magnitude = maximumMagnitude(run);
          count += Math.min(
            transform.bands,
            Math.ceil(Math.min(magnitude, extent) / bandHeight)
          ) * run.length;
          validateGeneratedItemLimit(count, "Horizon generated row count");
        }
      }
    }
  }
}

function seriesForGroup(group, extent, transform) {
  if (extent === 0) return [];
  const bandHeight = extent / transform.bands;
  const output = [];
  for (const sign of ["negative", "positive"]) {
    const runs = [];
    let segmentIndex = 0;
    for (const source of group.segments) {
      for (const points of runsForSign(source, sign)) {
        runs.push({ points, segmentIndex });
        segmentIndex += 1;
      }
    }
    for (let bandIndex = 0; bandIndex < transform.bands; bandIndex += 1) {
      for (const run of runs) {
        const points = run.points.map(point => {
          const rawMagnitude = Math.abs(point.signed);
          if (rawMagnitude > extent && transform.overflow === "error") {
            throw new RangeError(
              `Horizon magnitude ${rawMagnitude} exceeds extent ${extent}.`
            );
          }
          const magnitude = Math.min(rawMagnitude, extent);
          const amplitude = Math.min(
            bandHeight,
            Math.max(0, magnitude - bandIndex * bandHeight)
          );
          return {
            ...point,
            magnitude,
            rawMagnitude,
            amplitude,
            fraction: amplitude / bandHeight,
            overflowed: rawMagnitude > extent
          };
        });
        if (points.some(point => point.amplitude > 0)) {
          const groupIdentity = transform.groupBy === undefined
            ? null
            : group.group;
          output.push({
            group: group.group,
            groupIndex: group.groupIndex,
            sign,
            bandIndex,
            segmentIndex: run.segmentIndex,
            seriesKey: JSON.stringify([
              groupIdentity,
              sign,
              bandIndex,
              run.segmentIndex
            ]),
            colorKey: `${sign}:${bandIndex}`,
            bandHeight,
            points
          });
        }
      }
    }
  }
  return output;
}

function generatedRows(series, transform) {
  return series.flatMap(item => item.points.map(point => ({
    ...(transform.groupBy === undefined
      ? {}
      : { [transform.groupBy]: item.group }),
    [transform.as.x]: point.x,
    [transform.as.lower]: 0,
    [transform.as.upper]: point.fraction,
    [transform.as.group]: item.seriesKey,
    [transform.as.color]: item.colorKey,
    [transform.as.sign]: item.sign,
    [transform.as.band]: item.bandIndex,
    [transform.as.segment]: item.segmentIndex
  })));
}

export function deriveHorizon(rows, requested) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Horizon values must be an array.");
  }
  if (rows.length === 0) {
    throw new Error("Horizon requires at least one source row.");
  }
  const transform = validateHorizonTransform(requested);
  const grouped = groupRows(rows, transform).map(group => ({
    ...group,
    segments: splitSegments(group.rows, transform.baseline).map(segment =>
      insertCrossings(segment, transform.baseline)
    )
  }));
  if (!grouped.some(group => group.rows.some(row => !row.missing))) {
    throw new Error("Horizon requires at least one finite y value.");
  }
  const extents = resolvedExtents(grouped, transform);
  validateOutputBudget(grouped, extents, transform);
  const groups = grouped.map((group, index) => ({
    ...(transform.groupBy === undefined ? {} : { group: group.group }),
    extent: extents[index],
    bandHeight: extents[index] / transform.bands
  }));
  const series = grouped.flatMap((group, index) =>
    seriesForGroup(group, extents[index], transform)
  );
  return cloneAndFreeze({
    transform: requestedHorizonTransform(transform),
    resolved: { extents: groups },
    groups,
    series,
    values: generatedRows(series, transform)
  });
}
