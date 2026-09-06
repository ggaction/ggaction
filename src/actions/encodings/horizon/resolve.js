import { validateUserId } from "../../../core/identifiers.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateOptionObject } from "../../../core/validation.js";
import { resolvePalette } from "../../../grammar/palettes.js";
import {
  normalizeTemporalValue,
  resolveTemporalUnit,
  readNominalField
} from "../../../grammar/scales/index.js";
import {
  findDataset,
  findSemanticScale,
  hasDataset,
  resolveEligibleLayer
} from "../../../selectors/index.js";

export function findHorizonArea(program, requested) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, "Horizon target id");
  return resolveEligibleLayer(program, {
    target,
    label: "Horizon area",
    predicate: layer => layer.mark?.type === "area"
  });
}

export function resolveHorizonSource(program, layer, requested) {
  const id = validateUserId(
    requested ?? layer.data ?? program.context.currentData,
    "Horizon source dataset id"
  );
  if (!hasDataset(program, id)) {
    throw new Error(`Unknown Horizon source dataset "${id}".`);
  }
  return findDataset(program, id);
}

function fieldOption(value, role) {
  if (typeof value === "string") return { field: value };
  if (!isPlainObject(value)) {
    throw new TypeError(`Horizon ${role} must be a field string or plain object.`);
  }
  validateOptionObject(
    value,
    ["field", "fieldType", "scale", "temporalUnit"],
    `Horizon ${role}`
  );
  return value;
}

function inferredFieldType(rows, field, role) {
  if (role === "y") {
    const valid = rows.filter(row => Number.isFinite(row?.[field]));
    if (valid.length === 0) {
      throw new TypeError(`Horizon y field "${field}" requires a finite value.`);
    }
    return "quantitative";
  }
  if (rows.every(row => Number.isFinite(row?.[field]))) return "quantitative";
  for (const [index, row] of rows.entries()) {
    normalizeTemporalValue(row?.[field], field, index);
  }
  return "temporal";
}

function compatibleEncoding(encoding, role) {
  return encoding?.field !== undefined && (
    role === "x"
      ? ["quantitative", "temporal"].includes(encoding.fieldType)
      : encoding.fieldType === "quantitative"
  );
}

function uniqueStoredEncoding(program, dataset, role) {
  const candidates = program.semanticSpec.layers
    .filter(layer => layer.data === dataset.id)
    .map(layer => layer.encoding?.[role])
    .filter(encoding => compatibleEncoding(encoding, role));
  const unique = new Map(candidates.map(encoding => [
    JSON.stringify([
      encoding.field,
      encoding.fieldType,
      encoding.temporalUnit,
      encoding.scale,
      encoding.title
    ]),
    encoding
  ]));
  if (unique.size > 1) {
    throw new Error(`Horizon ${role} inference is ambiguous; provide ${role}.`);
  }
  return [...unique.values()][0];
}

export function resolveHorizonField(program, layer, dataset, requested, role) {
  const existing = compatibleEncoding(layer.encoding?.[role], role)
    ? layer.encoding[role]
    : undefined;
  if (requested === undefined) {
    const inferred = existing ?? uniqueStoredEncoding(program, dataset, role);
    if (inferred === undefined) {
      throw new Error(`encodeHorizon requires ${role} or one inferable ${role} encoding.`);
    }
    return {
      field: inferred.field,
      fieldType: inferred.fieldType,
      ...(inferred.temporalUnit === undefined ? {} : { temporalUnit: inferred.temporalUnit }),
      ...(role === "x" && inferred.scale !== undefined
        ? { scale: { id: inferred.scale } }
        : {}),
      ...(inferred.title === undefined ? {} : { title: inferred.title })
    };
  }
  const option = fieldOption(requested, role);
  if (typeof option.field !== "string" || option.field.length === 0) {
    throw new TypeError(`Horizon ${role} field must be a non-empty string.`);
  }
  const matching = existing?.field === option.field ? existing : undefined;
  if (option.scale !== undefined && !isPlainObject(option.scale)) {
    throw new TypeError(`Horizon ${role} scale must be a plain object.`);
  }
  const fieldType = option.fieldType ?? matching?.fieldType ??
    inferredFieldType(dataset.values, option.field, role);
  if (
    (role === "x" && !["quantitative", "temporal"].includes(fieldType)) ||
    (role === "y" && fieldType !== "quantitative")
  ) {
    throw new Error(
      `Horizon ${role} fieldType must be ${role === "x" ? "quantitative or temporal" : "quantitative"}.`
    );
  }
  const temporalUnit = resolveTemporalUnit(option, fieldType, matching);
  return {
    ...(temporalUnit === undefined ? {} : { temporalUnit }),
    field: option.field,
    fieldType,
    ...(option.scale !== undefined
      ? { scale: option.scale }
      : role === "x" && matching?.scale !== undefined
        ? { scale: { id: matching.scale } }
        : {}),
    ...(matching?.title === undefined ? {} : { title: matching.title })
  };
}

export function resolveHorizonGroupBy(layer, dataset, requested) {
  if (requested === false) return undefined;
  const value = requested ?? layer.encoding?.group?.field;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Horizon groupBy must be a non-empty string.");
  }
  readNominalField(dataset.values, value);
  return value;
}

export function horizonOutputFields(target) {
  const prefix = `${target}Horizon`;
  return {
    x: `${prefix}X`, lower: `${prefix}Lower`, upper: `${prefix}Upper`,
    group: `${prefix}Group`, color: `${prefix}Color`, sign: `${prefix}Sign`,
    band: `${prefix}Band`, segment: `${prefix}Segment`
  };
}

export function resolveHorizonPaletteColors(transform) {
  const domain = [];
  const range = [];
  for (const sign of ["negative", "positive"]) {
    const palette = transform.palette[sign];
    const dense = palette.count === undefined && transform.bands > 1
      ? resolvePalette(
          { ...palette, count: transform.bands * 2 },
          transform.bands * 2,
          transform.bands * 2
        )
      : resolvePalette(palette, transform.bands);
    const colors = palette.count === undefined && transform.bands > 1
      ? Array.from({ length: transform.bands }, (_, index) =>
          index === transform.bands - 1 ? dense.at(-1) : dense[index * 2])
      : dense;
    for (let band = 0; band < transform.bands; band += 1) {
      domain.push(`${sign}:${band}`);
      range.push(colors[band]);
    }
  }
  return { domain, range };
}

export function resolveFoldedHorizonScaleOptions(target, requested, existing = {}) {
  if (requested !== undefined && !isPlainObject(requested)) {
    throw new TypeError("Horizon y scale must be a plain object.");
  }
  const patch = requested ?? {};
  validateOptionObject(
    patch,
    ["id", "type", "domain", "range", "clamp", "reverse"],
    "Horizon y scale"
  );
  const options = { ...existing, ...patch };
  if (
    options.domain !== undefined &&
    (!Array.isArray(options.domain) ||
      options.domain.length !== 2 ||
      options.domain[0] !== 0 ||
      options.domain[1] !== 1)
  ) {
    throw new Error("Horizon y scale domain must be [0, 1].");
  }
  if (options.type !== undefined && options.type !== "linear") {
    throw new Error('Horizon y scale type must be "linear".');
  }
  return {
    ...options,
    id: options.id ?? `${target}HorizonAmplitude`,
    type: "linear",
    domain: [0, 1],
    nice: false,
    zero: true
  };
}

export function inferHorizonTitle(field) {
  const words = field.replaceAll("_", " ");
  return words.length === 0 ? field : words[0].toUpperCase() + words.slice(1);
}

export function validateUnusedHorizonEncodings(layer) {
  const conflicts = ["x2", "y2", "color", "pathOrder"].filter(
    channel => layer.encoding?.[channel] !== undefined
  );
  if (conflicts.length > 0) {
    throw new Error(
      `Horizon area target "${layer.id}" already has unsupported ${conflicts.join(", ")} encoding.`
    );
  }
}

export function findExistingHorizonScale(program, id, label) {
  const scale = findSemanticScale(program, id);
  if (scale === undefined) throw new Error(`${label} scale "${id}" is missing.`);
  return scale;
}

export function resolveEditedHorizonField(
  program,
  layer,
  source,
  transform,
  requested,
  role
) {
  if (requested === undefined) {
    return {
      ...transform[role],
      ...(role === "x" ? { title: layer.encoding.x.title } : {})
    };
  }
  const prior = transform[role];
  return resolveHorizonField(program, {
    ...layer,
    encoding: {
      ...layer.encoding,
      [role]: {
        field: prior.field,
        fieldType: prior.fieldType,
        ...(prior.temporalUnit === undefined ? {} : { temporalUnit: prior.temporalUnit }),
        scale: layer.encoding[role].scale,
        ...(role === "x" && layer.encoding.x.title !== undefined
          ? { title: layer.encoding.x.title }
          : {})
      }
    }
  }, source, requested, role);
}

export function resolveEditedHorizonGroupBy(source, previous, requested) {
  if (requested === undefined) return previous;
  if (requested === false) return undefined;
  if (typeof requested !== "string" || requested.length === 0) {
    throw new TypeError("Horizon groupBy must be a field string or false.");
  }
  readNominalField(source.values, requested);
  return requested;
}

export function mergeHorizonPalette(previous, requested) {
  if (requested === undefined) return previous;
  if (!isPlainObject(requested)) {
    throw new TypeError("Horizon palette must be a plain object.");
  }
  return {
    positive: requested.positive ?? previous.positive,
    negative: requested.negative ?? previous.negative
  };
}
