import { action } from "../../core/action.js";
import { validateCoordinateType } from "../../grammar/coordinates.js";
import { validateUserId } from "../../core/identifiers.js";
import { cloneAndFreeze, freezeOwned, isPlainObject } from "../../core/immutable.js";
import { parseSemanticPath } from "../../grammar/schemas/semanticPath.js";
import {
  validateSemanticFieldType,
  validateSemanticScaleDomain,
  validateSemanticScaleRange,
  validateSemanticScaleType
} from "../../grammar/scales.js";

const CONTEXT_KEYS = Object.freeze({
  dataset: "currentData",
  layer: "currentMark",
  scale: "currentScale",
  coordinate: "currentCoordinate",
  guide: "currentGuide"
});

const MARK_TYPES = new Set(["point", "line", "bar", "area"]);
const GRAPHIC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function setNestedProperty(source, path, value) {
  const [key, ...rest] = path;

  if (rest.length === 0) {
    return freezeOwned({ ...source, [key]: cloneAndFreeze(value) });
  }

  const child = isPlainObject(source[key]) ? source[key] : {};
  return freezeOwned({
    ...source,
    [key]: setNestedProperty(child, rest, value)
  });
}

function updateEntity(spec, parsed, value) {
  const collection = spec[parsed.collection];
  const index = collection.findIndex(item => item.id === parsed.id);

  if (
    parsed.kind === "dataset" &&
    index !== -1 &&
    Object.hasOwn(collection[index], "values")
  ) {
    throw new Error(`Dataset "${parsed.id}" is immutable after creation.`);
  }

  const current = index === -1 ? { id: parsed.id } : collection[index];
  const updated = setNestedProperty(current, parsed.path, value);
  const nextCollection = [...collection];

  if (index === -1) {
    nextCollection.push(updated);
  } else {
    nextCollection[index] = updated;
  }

  return freezeOwned({
    ...spec,
    [parsed.collection]: freezeOwned(nextCollection)
  });
}

function updateGuides(spec, parsed, value) {
  return freezeOwned({
    ...spec,
    guides: setNestedProperty(spec.guides, parsed.path, value)
  });
}

function updateTitle(spec, parsed, value) {
  return freezeOwned({
    ...spec,
    title: setNestedProperty(spec.title, parsed.path, value)
  });
}

function validateNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function validateSeriesLegendValue(property, value) {
  if (property === "title") {
    validateNonEmptyString(value, "Legend title");
    return;
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`Legend ${property} must be a non-empty array.`);
  }

  if (new Set(value).size !== value.length) {
    throw new Error(`Legend ${property} must not contain duplicates.`);
  }

  if (property === "channels") {
    const supported = new Set(["color", "strokeDash"]);
    if (!value.every(channel => supported.has(channel))) {
      throw new Error("Legend channels support only color and strokeDash.");
    }
    return;
  }

  for (const id of value) validateUserId(id, "Legend scale id");
}

function validateSemanticValue(program, parsed, value) {
  if (parsed.kind === "dataset" && parsed.path[0] === "values") {
    if (!Array.isArray(value) || !value.every(isPlainObject)) {
      throw new TypeError("Dataset values must be an array of plain row objects.");
    }
  }

  if (
    parsed.kind === "layer" &&
    parsed.path.join(".") === "mark.type" &&
    !MARK_TYPES.has(value)
  ) {
    throw new Error(`Unknown mark type "${value}".`);
  }

  if (parsed.kind === "layer") {
    const property = parsed.path.join(".");

    if (property.endsWith(".fieldType")) {
      validateSemanticFieldType(value);
    }

    if (
      property.endsWith(".aggregate") &&
      !["mean", "count"].includes(value)
    ) {
      throw new Error(`Unsupported aggregate "${value}".`);
    }

    if (
      property.endsWith(".bin.maxBins") &&
      (!Number.isInteger(value) || value <= 0)
    ) {
      throw new TypeError("Histogram bin maxBins must be a positive integer.");
    }

    if (property.endsWith(".stack") && value !== "zero" && value !== null) {
      throw new Error(`Unsupported stack "${value}".`);
    }
  }

  if (parsed.kind === "scale") {
    const property = parsed.path.join(".");
    const existing = program.semanticSpec.scales.find(
      scale => scale.id === parsed.id
    );

    if (property === "type") {
      validateSemanticScaleType(value);
      if (value !== "linear" && existing?.zero !== undefined) {
        throw new Error(`Scale type "${value}" does not support zero.`);
      }
      if (value === "ordinal" && existing?.nice !== undefined) {
        throw new Error('Scale type "ordinal" does not support nice.');
      }
    } else if (property === "domain") {
      validateSemanticScaleDomain(value);
    } else if (property === "range") {
      validateSemanticScaleRange(value);
    } else if (property === "nice") {
      if (typeof value !== "boolean") {
        throw new TypeError("Scale nice must be a boolean.");
      }
      if (existing?.type === "ordinal") {
        throw new Error('Scale type "ordinal" does not support nice.');
      }
    } else if (property === "zero") {
      if (typeof value !== "boolean") {
        throw new TypeError("Scale zero must be a boolean.");
      }
      if (existing?.type !== undefined && existing.type !== "linear") {
        throw new Error(`Scale type "${existing.type}" does not support zero.`);
      }
    }
  }

  if (parsed.kind === "coordinate" && parsed.path[0] === "type") {
    validateCoordinateType(value);
  }

  if (parsed.kind === "guide" && parsed.id === "legend.series") {
    validateSeriesLegendValue(parsed.path.at(-1), value);
  }

  if (parsed.kind === "guide" && parsed.id.startsWith("grid.")) {
    const property = parsed.path.at(-1);
    validateUserId(value, `Grid ${property} id`);
  }

  if (parsed.kind === "title") {
    validateNonEmptyString(value, `Chart title ${parsed.path[0]}`);
  }
}

const editSemantic = action(
  {
    op: "editSemantic",
    description: "Create or replace one semantic property."
  },
  function ({ property, value } = {}) {
    if (value === undefined) {
      throw new TypeError("editSemantic requires a value.");
    }

    const parsed = parseSemanticPath(property);
    validateSemanticValue(this, parsed, value);

    const semanticSpec = parsed.kind === "guide"
      ? updateGuides(this.semanticSpec, parsed, value)
      : parsed.kind === "title"
        ? updateTitle(this.semanticSpec, parsed, value)
        : updateEntity(this.semanticSpec, parsed, value);
    const contextKey = CONTEXT_KEYS[parsed.kind];
    const context = contextKey === undefined
      ? this.context
      : freezeOwned({ ...this.context, [contextKey]: parsed.id });

    return this._clone({ semanticSpec, context });
  }
);

export function registerSemanticPrimitiveAction(ProgramClass) {
  ProgramClass.prototype.editSemantic = editSemantic;
}
